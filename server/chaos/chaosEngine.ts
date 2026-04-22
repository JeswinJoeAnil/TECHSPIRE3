export type ChaosType = 'memory_leak' | 'latency' | 'disk_exhaustion' | 'cpu_spike' | 'traffic_flood' | 'error_injection';

export interface ChaosLog {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
  message: string;
  source: string;
}

type LogCallback = (log: ChaosLog) => void;

export class ChaosEngine {
  private activeModes: Set<ChaosType> = new Set();
  private leakedBuffers: Buffer[] = [];
  private memoryLeakTimer: ReturnType<typeof setInterval> | null = null;
  private cpuSpikeTimer: ReturnType<typeof setInterval> | null = null;
  private trafficCount = 0;
  private trafficTimer: ReturnType<typeof setInterval> | null = null;
  private errorInjectionTimer: ReturnType<typeof setInterval> | null = null;
  private injectedErrors = 0;
  private latencyDelay = 0;
  private latencyGrowTimer: ReturnType<typeof setInterval> | null = null;
  private diskWritten = 0;
  private logCallbacks: LogCallback[] = [];

  onLog(cb: LogCallback): void {
    this.logCallbacks.push(cb);
  }

  private emitLog(level: ChaosLog['level'], message: string, source = 'chaos-engine'): void {
    const log: ChaosLog = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      level, message, source
    };
    this.logCallbacks.forEach(cb => cb(log));
  }

  getActiveModes(): string[] {
    return Array.from(this.activeModes);
  }

  isActive(mode: ChaosType): boolean {
    return this.activeModes.has(mode);
  }

  getLatencyDelay(): number {
    return this.latencyDelay;
  }

  getExtraMemoryMB(): number {
    return this.leakedBuffers.length; // Each buffer is ~1MB
  }

  getTrafficCount(): number {
    return this.trafficCount;
  }

  getInjectedErrors(): number {
    return this.injectedErrors;
  }

  getDiskWrittenMB(): number {
    return this.diskWritten;
  }

  inject(mode: ChaosType): void {
    if (this.activeModes.has(mode)) return;
    this.activeModes.add(mode);
    this.emitLog('WARN', `CHAOS INJECTED: ${mode.toUpperCase()} failure mode activated.`);

    switch (mode) {
      case 'memory_leak':
        this.memoryLeakTimer = setInterval(() => {
          this.leakedBuffers.push(Buffer.alloc(1024 * 1024)); // 1MB
          const totalMB = this.leakedBuffers.length;
          if (totalMB > 500) {
            this.emitLog('FATAL', `OOMKiller imminent: Leaked ${totalMB}MB. Process at risk of SIGKILL.`, 'kernel');
          } else if (totalMB > 200) {
            this.emitLog('ERROR', `Memory leak critical: ${totalMB}MB leaked. GC cannot reclaim.`, 'gc-monitor');
          } else if (totalMB % 10 === 0) {
            this.emitLog('WARN', `Memory consumption growing: ${totalMB}MB leaked in BufferPool.`, 'heap-analyzer');
          }
        }, 500);
        break;

      case 'cpu_spike':
        this.cpuSpikeTimer = setInterval(() => {
          const start = Date.now();
          while (Date.now() - start < 150) {
            Math.sqrt(Math.random() * 999999);
          }
          this.emitLog('WARN', `CPU spike: Compute-intensive loop detected. Core utilization exceeding threshold.`, 'cpu-monitor');
        }, 300);
        break;

      case 'latency':
        this.latencyDelay = 1000;
        this.latencyGrowTimer = setInterval(() => {
          this.latencyDelay = Math.min(this.latencyDelay + 300, 15000);
          if (this.latencyDelay > 5000) {
            this.emitLog('ERROR', `HTTP 504 Gateway Timeout: Upstream response exceeded ${this.latencyDelay}ms.`, 'proxy');
          } else {
            this.emitLog('WARN', `Latency spike: Response time increased to ${this.latencyDelay}ms.`, 'loadbalancer');
          }
        }, 3000);
        break;

      case 'disk_exhaustion':
        this.diskWritten = 42; // Start from baseline
        const diskTimer = setInterval(() => {
          this.diskWritten = Math.min(this.diskWritten + 3, 100);
          if (this.diskWritten > 95) {
            this.emitLog('FATAL', `IO Error: No space left on device. Disk at ${this.diskWritten}%.`, 'fs-monitor');
          } else if (this.diskWritten > 80) {
            this.emitLog('ERROR', `Disk pressure critical: ${this.diskWritten}% used. Cleaning /tmp...`, 'disk-manager');
          }
          if (this.diskWritten >= 100) clearInterval(diskTimer);
        }, 2000);
        break;

      case 'traffic_flood':
        this.trafficCount = 50;
        this.trafficTimer = setInterval(() => {
          this.trafficCount = Math.min(this.trafficCount + 30, 2000);
          this.emitLog('WARN', `Traffic surge: ${this.trafficCount} concurrent connections. Rate limiting engaged.`, 'ingress');
        }, 2000);
        break;

      case 'error_injection':
        this.injectedErrors = 0;
        this.errorInjectionTimer = setInterval(() => {
          this.injectedErrors += Math.floor(Math.random() * 5) + 1;
          const errors = ['TypeError: Cannot read property of undefined', 'RangeError: Maximum call stack exceeded', 'DatabaseError: Connection pool exhausted', 'TimeoutError: Redis operation timed out'];
          const err = errors[Math.floor(Math.random() * errors.length)];
          this.emitLog('ERROR', `Unhandled exception: ${err}. Error count: ${this.injectedErrors}`, 'app-runtime');
        }, 1500);
        break;
    }
  }

  clear(mode: ChaosType): void {
    if (!this.activeModes.has(mode)) return;
    this.activeModes.delete(mode);
    this.emitLog('INFO', `CHAOS CLEARED: ${mode.toUpperCase()} fault injection stopped. System recovering.`);

    switch (mode) {
      case 'memory_leak':
        if (this.memoryLeakTimer) clearInterval(this.memoryLeakTimer);
        this.memoryLeakTimer = null;
        this.leakedBuffers = [];
        if (global.gc) global.gc();
        break;
      case 'cpu_spike':
        if (this.cpuSpikeTimer) clearInterval(this.cpuSpikeTimer);
        this.cpuSpikeTimer = null;
        break;
      case 'latency':
        if (this.latencyGrowTimer) clearInterval(this.latencyGrowTimer);
        this.latencyGrowTimer = null;
        this.latencyDelay = 0;
        break;
      case 'disk_exhaustion':
        this.diskWritten = 42;
        break;
      case 'traffic_flood':
        if (this.trafficTimer) clearInterval(this.trafficTimer);
        this.trafficTimer = null;
        this.trafficCount = 0;
        break;
      case 'error_injection':
        if (this.errorInjectionTimer) clearInterval(this.errorInjectionTimer);
        this.errorInjectionTimer = null;
        this.injectedErrors = 0;
        break;
    }
  }

  clearAll(): void {
    for (const mode of Array.from(this.activeModes)) {
      this.clear(mode);
    }
  }
}
