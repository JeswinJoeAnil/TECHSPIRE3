
import React from 'react';
import { ServerMetrics } from '../types';

interface HealthDashboardProps {
  metrics: ServerMetrics;
}

const HealthDashboard: React.FC<HealthDashboardProps> = ({ metrics }) => {
  const getProgressColor = (val: number, max: number) => {
    const ratio = val / max;
    if (ratio > 0.8) return 'bg-red-500';
    if (ratio > 0.5) return 'bg-yellow-500';
    return 'bg-emerald-500';
  };

  const formatUptime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return [hours, minutes, seconds].map(v => v < 10 ? "0" + v : v).join(":");
  };

  const healthColors: Record<string, string> = {
    healthy: 'text-emerald-400',
    degraded: 'text-yellow-400',
    critical: 'text-red-400',
    down: 'text-red-600',
  };

  const gauges = [
    { label: 'CPU Usage', value: metrics.cpuPercent, max: 100, unit: '%', icon: 'fa-microchip' },
    { label: 'Heap Usage', value: metrics.memoryUsageMB, max: 2048, unit: `MB / ${metrics.memoryTotalMB}MB`, icon: 'fa-memory' },
    { label: 'Response Latency', value: metrics.latencyMs, max: 5000, unit: 'ms', icon: 'fa-gauge-high' },
    { label: 'Disk Saturation', value: metrics.diskUsagePercent, max: 100, unit: '%', icon: 'fa-hard-drive' },
  ];

  return (
    <div className="bg-slate-900/40 border border-slate-800/50 rounded-[2.5rem] p-10 shadow-2xl backdrop-blur-xl">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-[12px] font-black text-slate-500 uppercase tracking-[0.5em] flex items-center gap-4">
          <div className="w-1.5 h-8 bg-emerald-500 rounded-full shadow-[0_0_10px_#10b981]"></div>
          System Telemetry
        </h2>
        <span className={`text-[11px] font-black uppercase tracking-widest ${healthColors[metrics.health] || 'text-slate-500'}`}>
          {metrics.health}
        </span>
      </div>

      <div className="space-y-6">
        {gauges.map(gauge => (
          <div key={gauge.label}>
            <div className="flex justify-between mb-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <i className={`fas ${gauge.icon} text-slate-600`}></i> {gauge.label}
              </span>
              <span className="text-xs font-mono text-slate-200">
                {Math.round(gauge.value)}{gauge.unit}
              </span>
            </div>
            <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${getProgressColor(gauge.value, gauge.max)}`}
                style={{ width: `${Math.min((gauge.value / gauge.max) * 100, 100)}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 pt-6 border-t border-slate-800 grid grid-cols-3 gap-3">
        <div className="text-center p-3 bg-slate-950/60 rounded-2xl border border-slate-800/50">
          <div className="text-[9px] text-slate-600 mb-1 uppercase font-black tracking-widest">Uptime</div>
          <div className="text-sm font-mono text-slate-200 font-bold">{formatUptime(metrics.uptime)}</div>
        </div>
        <div className="text-center p-3 bg-slate-950/60 rounded-2xl border border-slate-800/50">
          <div className="text-[9px] text-slate-600 mb-1 uppercase font-black tracking-widest">Errors</div>
          <div className={`text-sm font-mono font-bold ${metrics.errorRate > 0 ? 'text-red-400' : 'text-slate-200'}`}>{metrics.errorRate}</div>
        </div>
        <div className="text-center p-3 bg-slate-950/60 rounded-2xl border border-slate-800/50">
          <div className="text-[9px] text-slate-600 mb-1 uppercase font-black tracking-widest">Conn</div>
          <div className="text-sm font-mono text-slate-200 font-bold">{metrics.activeConnections}</div>
        </div>
      </div>
    </div>
  );
};

export default HealthDashboard;
