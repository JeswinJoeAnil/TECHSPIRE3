
import React from 'react';
import { ChaosState } from '../types';

interface HealthDashboardProps {
  state: ChaosState;
  uptime: number;
}

const HealthDashboard: React.FC<HealthDashboardProps> = ({ state, uptime }) => {
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

    return [hours, minutes, seconds]
      .map(v => v < 10 ? "0" + v : v)
      .join(":");
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-2xl">
      <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
        <i className="fas fa-chart-line text-blue-400"></i> SYSTEM TELEMETRY
      </h2>
      
      <div className="space-y-6">
        {/* Memory Gauge */}
        <div>
          <div className="flex justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase">Heap Usage</span>
            <span className="text-xs font-mono text-slate-200">{Math.round(state.memoryUsage)}MB / 2048MB</span>
          </div>
          <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${getProgressColor(state.memoryUsage, 2048)}`} 
              style={{ width: `${Math.min((state.memoryUsage / 2048) * 100, 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Latency Gauge */}
        <div>
          <div className="flex justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase">Response Latency</span>
            <span className="text-xs font-mono text-slate-200">{Math.round(state.latencyMs)}ms</span>
          </div>
          <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${getProgressColor(state.latencyMs, 5000)}`} 
              style={{ width: `${Math.min((state.latencyMs / 5000) * 100, 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Disk Gauge */}
        <div>
          <div className="flex justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase">Disk Saturation</span>
            <span className="text-xs font-mono text-slate-200">{Math.round(state.diskUsagePercent)}%</span>
          </div>
          <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${getProgressColor(state.diskUsagePercent, 100)}`} 
              style={{ width: `${state.diskUsagePercent}%` }}
            ></div>
          </div>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-slate-700 grid grid-cols-2 gap-4">
        <div className="text-center p-3 bg-slate-900 rounded-lg">
          <div className="text-xs text-slate-500 mb-1 uppercase font-bold">Uptime</div>
          <div className="text-sm font-mono text-slate-200">{formatUptime(uptime)}</div>
        </div>
        <div className="text-center p-3 bg-slate-900 rounded-lg">
          <div className="text-xs text-slate-500 mb-1 uppercase font-bold">Active Chaos</div>
          <div className="text-sm font-mono text-slate-200">{state.activeModes.length}</div>
        </div>
      </div>
    </div>
  );
};

export default HealthDashboard;
