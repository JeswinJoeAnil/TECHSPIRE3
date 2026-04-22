
import React from 'react';
import { AuditEntry } from '../types';

interface IncidentTimelineProps {
  auditTrail: AuditEntry[];
}

const IncidentTimeline: React.FC<IncidentTimelineProps> = ({ auditTrail }) => {
  if (auditTrail.length === 0) return null;

  return (
    <div className="bg-slate-900/40 border border-slate-800/50 rounded-[2.5rem] p-10 shadow-2xl backdrop-blur-xl">
      <h2 className="text-[12px] font-black text-slate-500 uppercase tracking-[0.5em] mb-8 flex items-center gap-4">
        <div className="w-1.5 h-8 bg-emerald-500 rounded-full shadow-[0_0_10px_#10b981]"></div>
        Resolution Timeline
      </h2>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-6 top-0 bottom-0 w-px bg-slate-800"></div>

        <div className="space-y-6">
          {auditTrail.map((entry, idx) => (
            <div key={entry.id} className="relative flex gap-6 group">
              {/* Timeline dot */}
              <div className={`relative z-10 w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg border ${
                entry.actor === 'AI_AGENT'
                  ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-400'
                  : 'bg-amber-500/20 border-amber-500/30 text-amber-400'
              }`}>
                <i className={`fas ${entry.actor === 'AI_AGENT' ? 'fa-robot' : 'fa-user-shield'} text-sm`}></i>
              </div>

              {/* Content */}
              <div className="flex-1 p-5 bg-slate-950/60 border border-slate-800/40 rounded-2xl group-hover:border-slate-700/60 transition-colors">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-white font-black text-sm uppercase tracking-tight">
                      {entry.incident.replace(/_/g, ' ')}
                    </span>
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-lg ${
                      entry.actor === 'AI_AGENT'
                        ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {entry.actor === 'AI_AGENT' ? 'Auto-Fixed' : 'Manual'}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-600">{entry.timestamp}</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Confidence: <span className="text-white font-bold">{entry.confidenceAtTime}%</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default IncidentTimeline;
