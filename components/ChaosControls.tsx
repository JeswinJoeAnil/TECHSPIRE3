
import React from 'react';
import { ChaosMode } from '../types';

interface ChaosControlsProps {
  activeModes: string[];
  onToggle: (mode: ChaosMode) => void;
}

const ChaosControls: React.FC<ChaosControlsProps> = ({ activeModes, onToggle }) => {
  const modes = [
    { id: ChaosMode.MEMORY_LEAK, label: 'Memory Leak', desc: 'Allocate unreclaimable buffers', icon: 'fa-microchip', category: 'resource' },
    { id: ChaosMode.CPU_SPIKE, label: 'CPU Spike', desc: 'Saturate compute threads', icon: 'fa-fire', category: 'resource' },
    { id: ChaosMode.DISK_EXHAUSTION, label: 'Disk Pressure', desc: 'Fill storage partitions', icon: 'fa-hard-drive', category: 'resource' },
    { id: ChaosMode.LATENCY, label: 'Network Latency', desc: 'Inject response delays', icon: 'fa-network-wired', category: 'network' },
    { id: ChaosMode.TRAFFIC_FLOOD, label: 'Traffic Flood', desc: 'Surge connection count', icon: 'fa-water', category: 'network' },
    { id: ChaosMode.ERROR_INJECTION, label: 'Error Injection', desc: 'Throw runtime exceptions', icon: 'fa-bug', category: 'app' },
  ];

  return (
    <div className="bg-slate-900/40 border border-slate-800/50 rounded-[2.5rem] p-8 shadow-2xl backdrop-blur-xl">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] flex items-center gap-3">
          <div className="w-1.5 h-8 bg-red-500 rounded-full shadow-[0_0_10px_#ef4444]"></div>
          Fault Injection
        </h2>
        <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${
          activeModes.length > 0 ? 'text-red-400 bg-red-500/10 border-red-500/20' : 'text-slate-600 bg-slate-800/50 border-slate-700/50'
        }`}>
          {activeModes.length} Active
        </span>
      </div>

      <div className="space-y-3">
        {modes.map(mode => {
          const isActive = activeModes.includes(mode.id);
          return (
            <button
              key={mode.id}
              onClick={() => onToggle(mode.id)}
              className={`w-full p-4 rounded-2xl border flex items-center justify-between transition-all group ${
                isActive
                  ? 'bg-red-500/10 border-red-500/40 text-red-100 shadow-xl'
                  : 'bg-slate-950/60 border-slate-800/50 text-slate-400 hover:border-slate-600 hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center gap-4 z-10">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                  isActive ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' : 'bg-slate-800 text-slate-600 group-hover:bg-slate-700'
                }`}>
                  <i className={`fas ${mode.icon} text-sm`}></i>
                </div>
                <div className="text-left">
                  <span className="font-black text-xs tracking-tight block">{mode.label}</span>
                  <span className="text-[9px] font-bold text-slate-600">{isActive ? 'Fault active' : mode.desc}</span>
                </div>
              </div>

              {isActive ? (
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></div>
                  <span className="text-[9px] font-black uppercase text-red-400">Live</span>
                </div>
              ) : (
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                   <i className="fas fa-plus text-[10px] text-slate-500"></i>
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-slate-950/50 border border-slate-800 rounded-2xl">
        <p className="text-[9px] text-slate-500 font-bold uppercase leading-relaxed tracking-wider">
          <i className="fas fa-info-circle mr-2 text-indigo-500"></i>
          Faults are injected on the real backend server. The AI analyzes live metrics to diagnose and fix.
        </p>
      </div>
    </div>
  );
};

export default ChaosControls;
