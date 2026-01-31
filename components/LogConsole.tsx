
import React from 'react';
import { LogEntry } from '../types';

interface LogConsoleProps {
  logs: LogEntry[];
}

const LogConsole: React.FC<LogConsoleProps> = ({ logs }) => {
  const getLevelColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'FATAL':
      case 'ERROR': return 'text-red-400';
      case 'WARN': return 'text-amber-400';
      default: return 'text-emerald-400';
    }
  };

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-[2rem] overflow-hidden flex flex-col h-[450px] shadow-2xl relative">
      {/* Decorative Blur */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[100px] pointer-events-none"></div>
      
      <div className="bg-slate-900/50 px-8 py-4 border-b border-slate-800 flex justify-between items-center backdrop-blur-md">
        <div className="flex items-center gap-6">
          <div className="flex gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-800 border border-slate-700"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-slate-800 border border-slate-700"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-slate-800 border border-slate-700"></div>
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-500">System Runtime Journal</span>
        </div>
        <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest bg-slate-950 px-3 py-1 rounded-full border border-slate-800">
          Tail -f /var/log/stdout
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-8 font-mono text-[11px] space-y-2 selection:bg-indigo-500/20 custom-scrollbar">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full space-y-4 opacity-20">
             <i className="fas fa-terminal text-4xl"></i>
             <p className="text-[10px] uppercase font-black tracking-[0.2em]">Ready for stream...</p>
          </div>
        ) : (
          logs.map(log => (
            <div key={log.id} className="group hover:bg-white/5 py-1.5 rounded-lg px-3 transition-colors flex gap-4 items-start border border-transparent hover:border-slate-800/50">
              <span className="text-slate-700 shrink-0 font-bold">{log.timestamp}</span>
              <span className={`font-black shrink-0 w-16 ${getLevelColor(log.level)}`}>{log.level}</span>
              <div className="flex-1">
                <span className="text-slate-200 leading-relaxed">{log.message}</span>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="bg-slate-900/50 px-8 py-3 border-t border-slate-800 flex items-center justify-between">
        <div className="flex gap-6 items-center">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Connection: Secure</span>
          </div>
          <span className="text-[9px] text-slate-600 font-bold uppercase tracking-widest hidden md:block">Node: Cluster-Alpha-01</span>
        </div>
        <span className="text-[9px] text-slate-500 font-mono tracking-tighter">Rows: {logs.length}/100</span>
      </div>
    </div>
  );
};

export default LogConsole;
