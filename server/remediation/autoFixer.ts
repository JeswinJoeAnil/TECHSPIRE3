import { ChaosEngine, ChaosType } from '../chaos/chaosEngine.js';

export interface RemediationResult {
  success: boolean;
  action: string;
  detail: string;
  timestamp: string;
}

export class AutoFixer {
  private chaos: ChaosEngine;

  constructor(chaos: ChaosEngine) {
    this.chaos = chaos;
  }

  execute(action: string): RemediationResult {
    const timestamp = new Date().toISOString();

    switch (action) {
      case 'clear_memory':
      case 'fix_memory_leak':
        this.chaos.clear('memory_leak');
        if (global.gc) global.gc();
        return { success: true, action, detail: 'Freed leaked buffers and triggered garbage collection.', timestamp };

      case 'reduce_latency':
      case 'fix_api_timeout':
        this.chaos.clear('latency');
        return { success: true, action, detail: 'Removed latency injection middleware. Response times normalized.', timestamp };

      case 'free_disk':
      case 'fix_disk_full':
        this.chaos.clear('disk_exhaustion');
        return { success: true, action, detail: 'Cleared disk pressure simulation. Usage reset to baseline.', timestamp };

      case 'fix_cpu_spike':
      case 'reduce_cpu':
        this.chaos.clear('cpu_spike');
        return { success: true, action, detail: 'Terminated CPU-intensive loops. Processor load normalizing.', timestamp };

      case 'fix_traffic_flood':
      case 'rate_limit':
        this.chaos.clear('traffic_flood');
        return { success: true, action, detail: 'Engaged rate limiting. Connection flood mitigated.', timestamp };

      case 'fix_error_injection':
      case 'fix_errors':
        this.chaos.clear('error_injection');
        return { success: true, action, detail: 'Patched error injection. Exception rate returning to zero.', timestamp };

      case 'clear_all':
      case 'full_reset':
        this.chaos.clearAll();
        return { success: true, action, detail: 'Full system reset. All chaos cleared.', timestamp };

      default:
        // Try to match by chaos type name directly
        const chaosTypes: ChaosType[] = ['memory_leak', 'latency', 'disk_exhaustion', 'cpu_spike', 'traffic_flood', 'error_injection'];
        const matchedType = chaosTypes.find(t => action.includes(t));
        if (matchedType) {
          this.chaos.clear(matchedType);
          return { success: true, action, detail: `Cleared ${matchedType} chaos mode.`, timestamp };
        }
        return { success: false, action, detail: `Unknown remediation action: ${action}`, timestamp };
    }
  }
}
