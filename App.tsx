
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChaosMode, ServerMetrics, LogEntry, ShadowAnalysis, AuditEntry } from './types';
import { WebSocketClient } from './services/websocketClient';
import { injectChaos, clearChaos, requestAnalysis, executeRemediation } from './services/apiClient';

import HealthDashboard from './components/HealthDashboard';
import ChaosControls from './components/ChaosControls';
import LogConsole from './components/LogConsole';
import ShadowAgentPanel from './components/ShadowAgentPanel';
import IncidentTimeline from './components/IncidentTimeline';

const DEFAULT_METRICS: ServerMetrics = {
  cpuPercent: 0, memoryUsageMB: 0, memoryTotalMB: 0, diskUsagePercent: 0,
  latencyMs: 0, requestsPerSecond: 0, activeConnections: 0, errorRate: 0,
  activeChaos: [], health: 'healthy', uptime: 0,
};

const App: React.FC = () => {
  const [metrics, setMetrics] = useState<ServerMetrics>(DEFAULT_METRICS);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [currentAnalysis, setCurrentAnalysis] = useState<ShadowAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isThrottled, setIsThrottled] = useState(false);
  const [autoFixThreshold, setAutoFixThreshold] = useState(85);
  const [auditTrail, setAuditTrail] = useState<AuditEntry[]>([]);
  const [resolutionAlert, setResolutionAlert] = useState<{message: string, type: 'AI' | 'HUMAN'} | null>(null);
  const [connected, setConnected] = useState(false);

  const wsRef = useRef<WebSocketClient | null>(null);
  const lastAnalysisTime = useRef<number>(0);

  // Inject global styles
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes loading { 0% { transform: translateX(-100%); } 100% { transform: translateX(300%); } }
      .animate-spin-slow { animation: spin 8s linear infinite; }
      @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      .custom-scrollbar::-webkit-scrollbar { width: 4px; }
      .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
      .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
      .glass-card { background: rgba(15, 23, 42, 0.7); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.05); }
    `;
    document.head.appendChild(style);
  }, []);

  const addLog = useCallback((message: string, level: LogEntry['level'] = 'INFO', source = 'kernel-core') => {
    const newLog: LogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      level, message, source,
    };
    setLogs(prev => [newLog, ...prev].slice(0, 80));
  }, []);

  // WebSocket connection
  useEffect(() => {
    const ws = new WebSocketClient('ws://localhost:4000/ws');
    wsRef.current = ws;

    ws.on('connected', () => {
      setConnected(true);
      addLog('Backend connection established. Live telemetry active.', 'INFO', 'ws-client');
    });

    ws.on('disconnected', () => {
      setConnected(false);
    });

    ws.on('metrics', (data: ServerMetrics) => {
      setMetrics(data);
    });

    ws.on('log', (data: LogEntry) => {
      setLogs(prev => [data, ...prev].slice(0, 80));
    });

    ws.connect();

    return () => {
      ws.disconnect();
    };
  }, [addLog]);

  // Auto-analysis loop
  useEffect(() => {
    const interval = setInterval(async () => {
      const now = Date.now();
      const isCritical = metrics.health !== 'healthy';
      const cooldown = isCritical ? 12000 : 30000;

      if (now - lastAnalysisTime.current < cooldown || isAnalyzing || !connected) return;

      if (metrics.activeChaos.length > 0 || metrics.health !== 'healthy') {
        setIsAnalyzing(true);
        setIsThrottled(false);

        const analysis = await requestAnalysis(logs.slice(0, 10));
        lastAnalysisTime.current = Date.now();

        if (analysis) {
          const typed = analysis as ShadowAnalysis;
          setCurrentAnalysis(typed);

          if (typed.predictedIncident !== 'none') {
            if (typed.confidence >= autoFixThreshold) {
              addLog(`AI ENGINE: High confidence (${typed.confidence}%). Auto-remediating [${typed.id}]...`, 'WARN');
              setTimeout(() => applyRemediation(typed, 'AI_AGENT'), 1500);
            } else {
              addLog(`AI ENGINE: Low confidence (${typed.confidence}%) for [${typed.id}]. Awaiting operator decision.`, 'WARN');
              // Browser notification for user attention
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('⚠️ ChaosSim Alert', {
                  body: `${typed.predictedIncident}: ${typed.rootCause}. Confidence: ${typed.confidence}%`,
                });
              }
            }
          }
        } else {
          setIsThrottled(true);
          addLog('AI ENGINE: Analysis unavailable (API key missing or rate limited).', 'ERROR');
        }
        setIsAnalyzing(false);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [metrics.health, metrics.activeChaos, isAnalyzing, connected, autoFixThreshold, logs, addLog]);

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const applyRemediation = async (analysis: ShadowAnalysis, actor: AuditEntry['actor']) => {
    const action = analysis.remediationAction || 'clear_all';
    addLog(`REMEDIATION: Executing "${action}" by ${actor}...`, 'WARN');

    try {
      await executeRemediation(action, analysis.id, actor);

      const audit: AuditEntry = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toLocaleTimeString(),
        action: 'RESOLVE_INCIDENT',
        actor,
        incident: analysis.predictedIncident,
        details: analysis.recommendedFix,
        confidenceAtTime: analysis.confidence,
      };

      setAuditTrail(prev => [audit, ...prev].slice(0, 20));
      setResolutionAlert({
        message: `${analysis.predictedIncident.replace(/_/g, ' ').toUpperCase()} resolved by ${actor === 'AI_AGENT' ? 'AI SRE' : 'OPERATOR'}. Root Cause: ${analysis.rootCause}`,
        type: actor === 'AI_AGENT' ? 'AI' : 'HUMAN',
      });
      addLog(`REMEDIATION: ${actor} action confirmed. System stabilizing.`, 'INFO');
      setCurrentAnalysis(null);
      setTimeout(() => setResolutionAlert(null), 10000);
    } catch {
      addLog('REMEDIATION: Failed to execute fix. Manual intervention required.', 'ERROR');
    }
  };

  const toggleChaos = async (mode: ChaosMode) => {
    const isActive = metrics.activeChaos.includes(mode);
    try {
      if (isActive) {
        await clearChaos(mode);
        addLog(`CLEARED ${mode.toUpperCase()} fault injection.`, 'INFO');
      } else {
        await injectChaos(mode);
        addLog(`TRIGGERED ${mode.toUpperCase()} failure injection.`, 'WARN');
      }
    } catch {
      addLog(`Failed to ${isActive ? 'clear' : 'inject'} ${mode}. Is the backend running?`, 'ERROR');
    }
  };

  const handleReset = async () => {
    try {
      await clearChaos();
      setLogs([]);
      setAuditTrail([]);
      setCurrentAnalysis(null);
      setResolutionAlert(null);
      setIsThrottled(false);
      addLog('System Hard Reset initiated. All chaos cleared.', 'INFO');
    } catch {
      addLog('Reset failed. Backend may be offline.', 'ERROR');
    }
  };

  const triggerManualScan = async () => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    setIsThrottled(false);
    addLog('Manual scan triggered by operator.', 'INFO');

    const analysis = await requestAnalysis(logs.slice(0, 10));
    lastAnalysisTime.current = Date.now();

    if (analysis) {
      setCurrentAnalysis(analysis as ShadowAnalysis);
    } else {
      setIsThrottled(true);
      addLog('AI ENGINE: Analysis unavailable.', 'ERROR');
    }
    setIsAnalyzing(false);
  };

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-10 min-h-screen flex flex-col font-sans text-slate-200">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6 pb-10 border-b border-slate-800/60">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-800 rounded-[2rem] flex items-center justify-center shadow-[0_0_40px_rgba(99,102,241,0.2)] border border-white/5">
            <i className="fas fa-microchip text-4xl text-white"></i>
          </div>
          <div>
            <h1 className="text-5xl font-black tracking-tighter text-white flex items-center gap-4">
              ChaosSim <span className="text-indigo-500 font-medium italic text-3xl">PROFESSIONAL</span>
            </h1>
            <p className="text-slate-500 mt-2 uppercase tracking-[0.6em] text-[11px] font-black flex items-center gap-3">
              <span className={`w-3 h-3 rounded-full ${connected ? (metrics.health === 'healthy' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-red-500 animate-pulse') : 'bg-slate-600'}`}></span>
              {connected ? 'Live Telemetry • AI SRE Active' : 'Connecting to backend...'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-8 items-center bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-800/50 backdrop-blur-xl shadow-2xl">
           <div className="flex flex-col items-end">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Auto-Fix Threshold:</span>
                <span className="text-sm font-black text-indigo-400">{autoFixThreshold}%</span>
              </div>
              <input
                type="range" min="50" max="100"
                value={autoFixThreshold}
                onChange={(e) => setAutoFixThreshold(parseInt(e.target.value))}
                className="w-64 h-2 bg-slate-800 rounded-full appearance-none cursor-pointer accent-indigo-500"
              />
              <p className="text-[9px] text-slate-600 mt-2 max-w-[250px] text-right">
                AI auto-fixes above this confidence. Below it, YOU decide.
              </p>
           </div>
           <div className="h-14 w-px bg-slate-800 hidden md:block"></div>
           <button onClick={handleReset} className="px-10 py-5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-3 transition-all active:scale-95 shadow-lg">
            <i className="fas fa-rotate-left"></i> Force Reset
          </button>
        </div>
      </header>

      {!connected && (
        <div className="mb-10 p-10 rounded-[2.5rem] border-2 border-amber-500/30 bg-amber-500/5 shadow-2xl">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/20 flex items-center justify-center">
              <i className="fas fa-plug text-amber-500 text-2xl animate-pulse"></i>
            </div>
            <div>
              <p className="text-lg font-black text-white">Backend Not Connected</p>
              <p className="text-sm text-slate-400 mt-1">
                Run <code className="bg-slate-800 px-2 py-1 rounded text-indigo-400 text-xs">npm run server</code> in another terminal, then refresh. Or run <code className="bg-slate-800 px-2 py-1 rounded text-indigo-400 text-xs">npm run dev:full</code> to start both.
              </p>
            </div>
          </div>
        </div>
      )}

      {resolutionAlert && (
        <div className={`mb-10 p-10 rounded-[2.5rem] border-2 shadow-2xl ${
          resolutionAlert.type === 'AI' ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-amber-500/10 border-amber-500/30'
        }`}>
          <div className="flex items-center justify-between gap-10">
            <div className="flex items-center gap-8">
               <div className={`w-20 h-20 rounded-3xl flex items-center justify-center text-3xl shadow-2xl ${
                 resolutionAlert.type === 'AI' ? 'bg-indigo-600 text-white' : 'bg-amber-500 text-slate-900'
               }`}>
                  <i className={`fas ${resolutionAlert.type === 'AI' ? 'fa-robot' : 'fa-user-shield'}`}></i>
               </div>
               <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.5em] opacity-50 text-slate-400 mb-2">Stability Protocol Executed</p>
                  <p className="text-2xl font-black text-white tracking-tight">{resolutionAlert.message}</p>
               </div>
            </div>
            <button onClick={() => setResolutionAlert(null)} className="p-4 text-slate-500 hover:text-white transition-colors bg-white/5 rounded-full"><i className="fas fa-times text-2xl"></i></button>
          </div>
        </div>
      )}

      <main className="grid grid-cols-1 lg:grid-cols-12 gap-12 flex-1">
        <div className="lg:col-span-4 space-y-12">
          <HealthDashboard metrics={metrics} />
          <ChaosControls activeModes={metrics.activeChaos} onToggle={toggleChaos} />

          <div className="bg-slate-900/40 border border-slate-800/50 rounded-[2.5rem] p-10 shadow-2xl backdrop-blur-xl">
             <h2 className="text-[12px] font-black text-slate-500 uppercase tracking-[0.5em] mb-10 flex items-center gap-4">
                <div className="w-1.5 h-8 bg-indigo-500 rounded-full shadow-[0_0_10px_#6366f1]"></div>
                Deployment Audit
             </h2>
             <div className="space-y-6 max-h-[420px] overflow-y-auto pr-4 custom-scrollbar">
                {auditTrail.length === 0 && (
                  <div className="py-24 flex flex-col items-center justify-center opacity-10">
                     <i className="fas fa-fingerprint text-7xl mb-6"></i>
                     <p className="text-[12px] uppercase font-black tracking-[0.8em]">No Activity</p>
                  </div>
                )}
                {auditTrail.map(entry => (
                  <div key={entry.id} className="p-6 bg-slate-950/80 border border-slate-800/40 rounded-3xl text-[12px] group transition-all hover:border-indigo-500/40">
                    <div className="flex justify-between font-black mb-4">
                      <span className={`flex items-center gap-3 py-1.5 px-4 rounded-xl text-[10px] ${entry.actor === 'AI_AGENT' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                        <i className={`fas ${entry.actor === 'AI_AGENT' ? 'fa-brain' : 'fa-user-cog'}`}></i>
                        {entry.actor === 'AI_AGENT' ? 'AI SRE' : 'OPERATOR'}
                      </span>
                      <span className="text-slate-600 font-mono self-center">{entry.timestamp}</span>
                    </div>
                    <p className="text-white font-black mb-3 text-[14px] tracking-tight uppercase">{entry.incident.replace(/_/g, ' ')} RECOVERY</p>
                    <p className="text-slate-500 text-[12px] leading-relaxed italic pl-4 border-l-2 border-slate-800">"{entry.details}"</p>
                  </div>
                ))}
             </div>
          </div>
        </div>

        <div className="lg:col-span-8 flex flex-col gap-12">
          <ShadowAgentPanel
            analysis={currentAnalysis}
            isAnalyzing={isAnalyzing}
            isThrottled={isThrottled}
            threshold={autoFixThreshold}
            onApplyFix={(analysis) => applyRemediation(analysis, 'HUMAN_OPERATOR')}
            onReject={() => setCurrentAnalysis(null)}
            onManualScan={triggerManualScan}
          />
          <LogConsole logs={logs} />
          <IncidentTimeline auditTrail={auditTrail} />
        </div>
      </main>
    </div>
  );
};

export default App;
