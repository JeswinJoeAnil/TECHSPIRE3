import os from 'os';

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
  health: 'healthy' | 'degraded' | 'critical' | 'down';
  uptime: number;
}

export class SystemMonitor {
  private lastCpuTimes: { idle: number; total: number } | null = null;
  private requestTimestamps: number[] = [];
  private errorTimestamps: number[] = [];
  private latencySamples: number[] = [];
  private startTime = Date.now();

  getCpuPercent(): number {
    const cpus = os.cpus();
    let idle = 0, total = 0;
    for (const cpu of cpus) {
      idle += cpu.times.idle;
      total += cpu.times.user + cpu.times.nice + cpu.times.sys + cpu.times.irq + cpu.times.idle;
    }

    if (this.lastCpuTimes) {
      const idleDiff = idle - this.lastCpuTimes.idle;
      const totalDiff = total - this.lastCpuTimes.total;
      this.lastCpuTimes = { idle, total };
      return totalDiff === 0 ? 0 : Math.round((1 - idleDiff / totalDiff) * 100);
    }

    this.lastCpuTimes = { idle, total };
    return 0;
  }

  getMemoryUsageMB(): number {
    return Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
  }

  getMemoryTotalMB(): number {
    return Math.round(os.totalmem() / 1024 / 1024);
  }

  recordRequest(): void {
    this.requestTimestamps.push(Date.now());
  }

  recordError(): void {
    this.errorTimestamps.push(Date.now());
  }

  recordLatency(ms: number): void {
    this.latencySamples.push(ms);
    if (this.latencySamples.length > 100) this.latencySamples.shift();
  }

  getRequestsPerSecond(): number {
    const now = Date.now();
    this.requestTimestamps = this.requestTimestamps.filter(t => now - t < 10000);
    return Math.round((this.requestTimestamps.length / 10) * 10) / 10;
  }

  getErrorRate(): number {
    const now = Date.now();
    this.errorTimestamps = this.errorTimestamps.filter(t => now - t < 60000);
    return this.errorTimestamps.length;
  }

  getAverageLatency(): number {
    if (this.latencySamples.length === 0) return 5;
    const sum = this.latencySamples.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.latencySamples.length);
  }

  calculateHealth(metrics: ServerMetrics): ServerMetrics['health'] {
    if (metrics.memoryUsageMB > 1800 || metrics.diskUsagePercent > 98 || metrics.cpuPercent > 98) return 'down';
    if (metrics.memoryUsageMB > 1000 || metrics.diskUsagePercent > 90 || metrics.cpuPercent > 90 || metrics.latencyMs > 5000) return 'critical';
    if (metrics.activeChaos.length > 0 || metrics.latencyMs > 500 || metrics.memoryUsageMB > 500 || metrics.cpuPercent > 70 || metrics.errorRate > 5) return 'degraded';
    return 'healthy';
  }

  getUptime(): number {
    return Math.floor((Date.now() - this.startTime) / 1000);
  }
}
