
export enum ChaosMode {
  MEMORY_LEAK = 'memory_leak',
  LATENCY = 'latency',
  DISK_EXHAUSTION = 'disk_exhaustion',
  HEALTHY = 'healthy'
}

export type HealthStatus = 'healthy' | 'degraded' | 'critical' | 'down';
export type Severity = 'low' | 'medium' | 'high' | 'critical';
export type IncidentType = 'memory_leak' | 'api_timeout' | 'disk_full' | 'none';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
  message: string;
  source: string;
}

export interface ChaosState {
  activeModes: ChaosMode[];
  memoryUsage: number;
  latencyMs: number;
  diskUsagePercent: number;
  health: HealthStatus;
}

export interface ShadowAnalysis {
  id: string;
  predictedIncident: IncidentType;
  rootCause: string;
  recommendedFix: string;
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
  metrics: {
    memoryUsageMB: number;
    latencyMs: number;
    diskUsagePercent: number;
    health: HealthStatus;
  };
  activeChaos: ChaosMode[];
  logs: LogEntry[];
}
