
import React from 'react';
import { ChaosMode } from '../types';

interface ChaosControlsProps {
  activeModes: ChaosMode[];
  onToggle: (mode: ChaosMode) => void;
}

const ChaosControls: React.FC<ChaosControlsProps> = ({ activeModes, onToggle }) => {
  const modes = [
    { id: ChaosMode.MEMORY_LEAK, label: 'Simulate Memory Leak', icon: 'fa-microchip', color: 'red' },
    { id: ChaosMode.LATENCY, label: 'Inject Network Latency', icon: 'fa-network-wired', color: 'orange' },
    { id: ChaosMode.DISK_EXHAUSTION, label: 'Induce Disk Pressure', icon: 'fa-hard-drive', color: 'yellow' },
  ];

  return (
    <div className="bg-slate-800/40 border border-slate-700/50 rounded-[2rem] p-8 shadow-2xl backdrop-blur-md">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] flex items-center gap-3">
          <i className="fas fa-flask text-indigo-400"></i> Fault Injection Unit
        </h2>
        <i className="fas fa-bolt text-slate-700 text-xs"></i>
      </div>
      
      <div className="space-y-4">
        {modes.map(mode => {
          const isActive = activeModes.includes(mode.id);
          return (
            <button
              key={mode.id}
              onClick={() => onToggle(mode.id)}
              className={`w-full p-5 rounded-2xl border flex items-center justify-between transition-all group relative overflow-hidden ${
                isActive 
                  ? 'bg-red-500/10 border-red-500/40 text-red-100 shadow-xl' 
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-600 hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center gap-5 z-10">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                  isActive ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' : 'bg-slate-800 text-slate-600 group-hover:bg-slate-700'
                }`}>
                  <i className={`fas ${mode.icon} text-lg`}></i>
                </div>
                <div className="text-left">
                  <span className="font-black text-xs tracking-tight block">{mode.label}</span>
                  <span className="text-[9px] uppercase font-bold text-slate-600 group-hover:text-slate-500">{isActive ? 'Fault active' : 'Ready to inject'}</span>
                </div>
              </div>
              
              {isActive ? (
                <div className="flex items-center gap-2 z-10">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></div>
                  <span className="text-[9px] font-black uppercase text-red-400">Live</span>
                </div>
              ) : (
                <div className="opacity-0 group-hover:opacity-100 transition-opacity z-10">
                   <i className="fas fa-plus text-[10px] text-slate-500"></i>
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-8 p-5 bg-slate-950/50 border border-slate-800 rounded-2xl">
        <p className="text-[9px] text-slate-500 font-bold uppercase leading-relaxed tracking-wider">
          <i className="fas fa-info-circle mr-2 text-indigo-500"></i> 
          Note: Failures propagate through the telemetry pipeline immediately. The AI Twin will observe metrics and logs to determine remediation strategy.
        </p>
      </div>
    </div>
  );
};

export default ChaosControls;
