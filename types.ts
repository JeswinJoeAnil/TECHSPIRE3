
export enum ChaosMode {
  MEMORY_LEAK = 'memory_leak',
  LATENCY = 'latency',
  DISK_EXHAUSTION = 'disk_exhaustion',
  CPU_SPIKE = 'cpu_spike',
  TRAFFIC_FLOOD = 'traffic_flood',
  ERROR_INJECTION = 'error_injection',
}

export type HealthStatus = 'healthy' | 'degraded' | 'critical' | 'down';
export type Severity = 'low' | 'medium' | 'high' | 'critical';
export type IncidentType = 'memory_leak' | 'api_timeout' | 'disk_full' | 'cpu_overload' | 'traffic_flood' | 'error_spike' | 'none';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
  message: string;
  source: string;
}

export interface ServerMetrics {
  cpuPercent: number;
  memoryUsageMB: number;
  memoryTotalMB: number;
  diskUsagePercent: number;
  latencyMs: number;
  requestsPerSecond: number;
  activeConnections: number;
  errorRate: number;
  activeChaos: string[];
  health: HealthStatus;
  uptime: number;
}

export interface ShadowAnalysis {
  id: string;
  predictedIncident: IncidentType;
  rootCause: string;
  recommendedFix: string;
  remediationAction: string;
  confidence: number;
  reasoningSteps: string[];
  severity: Severity;
  timestamp: number;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  action: string;
  actor: 'AI_AGENT' | 'HUMAN_OPERATOR';
  incident: string;
  details: string;
  confidenceAtTime: number;
}

export interface TelemetrySnapshot {
  metrics: ServerMetrics;
  activeChaos: string[];
  logs: LogEntry[];
}
