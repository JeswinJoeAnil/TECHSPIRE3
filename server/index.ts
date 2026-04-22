import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { SystemMonitor, ServerMetrics } from './monitors/systemMonitor.js';
import { ChaosEngine, ChaosType } from './chaos/chaosEngine.js';
import { AutoFixer } from './remediation/autoFixer.js';
import { IncidentStore } from './storage/incidentStore.js';

dotenv.config({ path: '.env.local' });
dotenv.config();

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

app.use(cors());
app.use(express.json());

const monitor = new SystemMonitor();
const chaos = new ChaosEngine();
const fixer = new AutoFixer(chaos);
const incidents = new IncidentStore();

// -- Gemini AI setup --
const GEMINI_KEY = process.env.GEMINI_API_KEY || '';
let genai: GoogleGenAI | null = null;
if (GEMINI_KEY) {
  genai = new GoogleGenAI({ apiKey: GEMINI_KEY });
  console.log('✅ Gemini AI connected');
} else {
  console.warn('⚠️  GEMINI_API_KEY not set. AI analysis will be unavailable. Create a .env.local file with GEMINI_API_KEY=your_key');
}

// -- Latency injection middleware --
app.use((req, res, next) => {
  if (chaos.isActive('latency') && !req.path.startsWith('/ws')) {
    const delay = Math.min(chaos.getLatencyDelay(), 3000); // Cap at 3s for API responses
    setTimeout(next, delay);
  } else {
    next();
  }
});

// -- Request tracking middleware --
app.use((req, res, next) => {
  const start = Date.now();
  monitor.recordRequest();
  res.on('finish', () => {
    monitor.recordLatency(Date.now() - start);
  });
  next();
});

// -- Helper to build metrics --
function buildMetrics(): ServerMetrics {
  const baseDisk = chaos.isActive('disk_exhaustion') ? chaos.getDiskWrittenMB() : 42;
  const metrics: ServerMetrics = {
    cpuPercent: monitor.getCpuPercent(),
    memoryUsageMB: monitor.getMemoryUsageMB() + chaos.getExtraMemoryMB(),
    memoryTotalMB: monitor.getMemoryTotalMB(),
    diskUsagePercent: baseDisk,
    latencyMs: chaos.isActive('latency') ? chaos.getLatencyDelay() : monitor.getAverageLatency(),
    requestsPerSecond: monitor.getRequestsPerSecond(),
    activeConnections: chaos.getTrafficCount() || wss.clients.size,
    errorRate: chaos.getInjectedErrors() + monitor.getErrorRate(),
    activeChaos: chaos.getActiveModes(),
    health: 'healthy',
    uptime: monitor.getUptime(),
  };
  metrics.health = monitor.calculateHealth(metrics);
  return metrics;
}

// -- REST API --
app.get('/api/metrics', (_req, res) => {
  res.json(buildMetrics());
});

app.get('/api/health', (_req, res) => {
  const metrics = buildMetrics();
  res.json({ health: metrics.health, uptime: metrics.uptime });
});

app.post('/api/chaos/inject', (req, res) => {
  const { mode } = req.body as { mode: ChaosType };
  chaos.inject(mode);
  res.json({ status: 'injected', mode, activeModes: chaos.getActiveModes() });
});

app.post('/api/chaos/clear', (req, res) => {
  const { mode } = req.body as { mode?: ChaosType };
  if (mode) {
    chaos.clear(mode);
  } else {
    chaos.clearAll();
  }
  res.json({ status: 'cleared', activeModes: chaos.getActiveModes() });
});

app.get('/api/incidents', (_req, res) => {
  res.json(incidents.getAll());
});

app.post('/api/incidents', (req, res) => {
  const incident = incidents.add(req.body);
  res.json(incident);
});

app.post('/api/remediate', (req, res) => {
  const { action, incidentId } = req.body;
  const result = fixer.execute(action);
  if (incidentId) {
    incidents.resolve(incidentId, { ...result, actor: req.body.actor || 'AI_AGENT' });
  }
  res.json(result);
});

// -- AI Analysis Endpoint --
app.post('/api/analyze', async (req, res) => {
  if (!genai) {
    return res.status(503).json({ error: 'GEMINI_API_KEY not configured. Add it to .env.local' });
  }

  const metrics = buildMetrics();
  const recentLogs = req.body.logs || [];

  const prompt = `ROLE: Senior SRE Autonomous Agent (Level 5).
STATUS: Direct Telemetry Access.

CURRENT NODE METRICS:
- CPU: ${metrics.cpuPercent}%
- RAM: ${metrics.memoryUsageMB}MB / ${metrics.memoryTotalMB}MB
- LATENCY: ${metrics.latencyMs}ms
- DISK: ${metrics.diskUsagePercent}%
- ERROR RATE: ${metrics.errorRate} errors/min
- ACTIVE CONNECTIONS: ${metrics.activeConnections}
- ACTIVE FAULTS: ${metrics.activeChaos.join(', ') || 'NONE'}
- HEALTH STATUS: ${metrics.health}

LOG STREAM (LAST 10):
${recentLogs.slice(0, 10).map((l: any) => l.message || l).join('\n')}

TASK:
1. Identify 'predictedIncident': must be one of: 'memory_leak', 'api_timeout', 'disk_full', 'cpu_overload', 'traffic_flood', 'error_spike', or 'none'
2. 'rootCause': Short technical summary (max 15 words)
3. 'recommendedFix': Clear 3-step numbered fix guide
4. 'remediationAction': The programmatic action to take. Must be one of: 'fix_memory_leak', 'fix_api_timeout', 'fix_disk_full', 'fix_cpu_spike', 'fix_traffic_flood', 'fix_errors', 'clear_all', or 'none'
5. 'confidence': 0-100. Use 90+ for obvious matches. Below 75 if ambiguous.
6. 'severity': one of 'low', 'medium', 'high', 'critical'
7. 'reasoningSteps': Array of strings explaining your analysis

RESPOND ONLY WITH VALID JSON. No markdown.`;

  try {
    const response = await genai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: {
        temperature: 0.3,
        maxOutputTokens: 2000,
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '';
    let result;
    try {
      result = JSON.parse(text);
    } catch {
      const match = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
      result = match ? JSON.parse(match[1]) : JSON.parse(text.replace(/^[^{]*/, '').replace(/[^}]*$/, ''));
    }

    const analysis = {
      id: `INC-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
      timestamp: Date.now(),
      predictedIncident: result.predictedIncident || 'none',
      rootCause: result.rootCause || 'Unknown',
      recommendedFix: result.recommendedFix || 'Manual investigation required',
      remediationAction: result.remediationAction || 'none',
      confidence: result.confidence || 50,
      reasoningSteps: result.reasoningSteps || ['Analysis performed'],
      severity: result.severity || 'medium',
    };

    res.json(analysis);
  } catch (error: any) {
    console.error('AI Analysis error:', error.message);
    if (error.message?.includes('429') || error.message?.includes('rate')) {
      return res.status(429).json({ error: 'Rate limited. Try again in a few seconds.' });
    }
    res.status(500).json({ error: 'AI analysis failed: ' + error.message });
  }
});

// -- WebSocket --
const broadcast = (data: any) => {
  const msg = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
};

// Broadcast metrics every second
setInterval(() => {
  broadcast({ type: 'metrics', data: buildMetrics() });
}, 1000);

// Forward chaos logs to all WS clients
chaos.onLog((log) => {
  broadcast({ type: 'log', data: log });
});

// Heartbeat logs when healthy
setInterval(() => {
  if (chaos.getActiveModes().length === 0 && Math.random() > 0.9) {
    broadcast({
      type: 'log',
      data: {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toLocaleTimeString(),
        level: 'INFO',
        message: 'System heartbeat: All services nominal. No anomalies detected.',
        source: 'health-check',
      }
    });
  }
}, 8000);

wss.on('connection', (ws) => {
  console.log('📡 Client connected');
  ws.send(JSON.stringify({ type: 'metrics', data: buildMetrics() }));
  ws.on('close', () => console.log('📡 Client disconnected'));
});

// -- Start --
const PORT = parseInt(process.env.PORT || '4000');
server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════╗
║   🔥 ChaosSim Backend v2.0                  ║
║   📡 REST API:  http://localhost:${PORT}        ║
║   🔌 WebSocket: ws://localhost:${PORT}/ws       ║
║   ${GEMINI_KEY ? '🤖 AI Engine: ONLINE' : '⚠️  AI Engine: OFFLINE (set GEMINI_API_KEY)'}             ║
╚══════════════════════════════════════════════╝
  `);
});
