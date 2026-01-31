
import { ChaosMode, ChaosState, HealthStatus } from '../types';

export const INITIAL_STATE: ChaosState = {
  activeModes: [],
  memoryUsage: 124, // baseline MB
  latencyMs: 15,    // baseline ms
  diskUsagePercent: 42, // baseline %
  health: 'healthy'
};

export const calculateHealth = (state: ChaosState): HealthStatus => {
  if (state.memoryUsage > 1800 || state.diskUsagePercent > 98) return 'down';
  if (state.memoryUsage > 1200 || state.diskUsagePercent > 90 || state.latencyMs > 5000) return 'critical';
  if (state.activeModes.length > 0 || state.latencyMs > 800 || state.memoryUsage > 600) return 'degraded';
  return 'healthy';
};

export const generateLogMessage = (state: ChaosState): string | null => {
  const { activeModes, memoryUsage, diskUsagePercent, latencyMs } = state;
  
  if (activeModes.includes(ChaosMode.MEMORY_LEAK)) {
    if (memoryUsage > 1200) return `[FATAL] OOMKiller: Process 'app_worker' signaled with SIGKILL. Heap exhausted at ${Math.round(memoryUsage)}MB.`;
    if (memoryUsage > 800) return `[ERROR] java.lang.OutOfMemoryError: GC overhead limit exceeded. Attempting forced collection.`;
    return `[WARN] Memory consumption leak detected in BufferPool. Current: ${Math.round(memoryUsage)}MB.`;
  }
  
  if (activeModes.includes(ChaosMode.DISK_EXHAUSTION)) {
    if (diskUsagePercent > 95) return `[FATAL] IO Error: Failed to write to /var/log/syslog. No space left on device.`;
    if (diskUsagePercent > 85) return `[ERROR] Disk quota nearing limit. Current usage: ${Math.round(diskUsagePercent)}%. Cleaning /tmp...`;
    return `[INFO] Disk monitoring: anomalous write pattern detected in partition /dev/nvme0n1p2.`;
  }

  if (activeModes.includes(ChaosMode.LATENCY)) {
    if (latencyMs > 5000) return `[ERROR] HTTP 504 Gateway Timeout. Upstream 'payment-gateway' failed to respond in 5s.`;
    return `[WARN] Latency spike: Average response time increased to ${Math.round(latencyMs)}ms. Checking downstream health.`;
  }

  // False positive simulator: Occasionally log a "warn" that isn't an incident
  if (Math.random() > 0.95 && activeModes.length === 0) {
    return `[WARN] Transient spike in network jitter detected. Automatically resolved by TCP retry.`;
  }

  return null;
};
