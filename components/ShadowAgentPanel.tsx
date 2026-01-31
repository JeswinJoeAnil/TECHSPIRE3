
import React from 'react';
import { ShadowAnalysis } from '../types';

interface ShadowAgentPanelProps {
  analysis: ShadowAnalysis | null;
  isAnalyzing: boolean;
  isThrottled: boolean;
  threshold: number;
  onApplyFix: (analysis: ShadowAnalysis) => void;
  onReject: () => void;
  onManualScan: () => void;
}

const ShadowAgentPanel: React.FC<ShadowAgentPanelProps> = ({ 
  analysis, 
  isAnalyzing, 
  isThrottled,
  threshold, 
  onApplyFix, 
  onReject,
  onManualScan 
}) => {
  const isHealthy = !analysis || analysis.predictedIncident === 'none';
  const isAutoFixing = analysis && analysis.predictedIncident !== 'none' && analysis.confidence >= threshold;
  const needsHuman = analysis && analysis.predictedIncident !== 'none' && analysis.confidence < threshold;

  return (
    <div className={`relative min-h-[560px] transition-all duration-700 rounded-[3rem] overflow-hidden border bg-slate-900/60 backdrop-blur-2xl shadow-[0_40px_100px_rgba(0,0,0,0.6)] ${
      isThrottled ? 'border-amber-500/40 shadow-amber-500/10' :
      isAnalyzing ? 'border-indigo-500/40 shadow-indigo-500/10' : 
      needsHuman ? 'border-amber-500/50 shadow-amber-500/20' : 
      !isHealthy ? 'border-red-500/40 shadow-red-500/20' : 'border-slate-800/40'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between px-10 py-7 border-b border-slate-800/50 bg-slate-950/40">
        <div className="flex items-center gap-5">
          <div className={`w-3 h-3 rounded-full ${isThrottled ? 'bg-amber-500 shadow-[0_0_10px_#f59e0b]' : isAnalyzing ? 'bg-indigo-400 animate-pulse' : isHealthy ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`}></div>
          <span className="text-[11px] font-black uppercase tracking-[0.5em] text-slate-400">
            {isThrottled ? 'API Quota Exhausted' : 'SRE Intelligence Core'}
          </span>
        </div>
        <div className="flex items-center gap-6">
          <button 
            disabled={isAnalyzing}
            onClick={onManualScan}
            className="text-[10px] font-black uppercase tracking-widest bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 px-6 py-3 rounded-2xl border border-indigo-500/20 transition-all hover:-translate-y-1 disabled:opacity-30 disabled:translate-y-0"
          >
            Trigger Manual Scan
          </button>
          <div className="h-6 w-px bg-slate-800"></div>
          <span className="text-[10px] font-mono text-slate-600">SHADOW-V2.5</span>
        </div>
      </div>

      <div className="p-12 h-full flex flex-col">
        {isThrottled && (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8 animate-in zoom-in-95 duration-500">
            <div className="w-24 h-24 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shadow-2xl">
              <i className="fas fa-hourglass-half text-amber-500 text-4xl animate-pulse"></i>
            </div>
            <div className="space-y-4">
              <h3 className="text-2xl font-black text-white tracking-tight">Intelligence Throttled</h3>
              <p className="text-sm text-slate-400 max-w-sm mx-auto font-medium leading-relaxed uppercase tracking-widest">
                AI SRE Engine has exceeded API rate limits. Background monitoring paused to recover quota.
              </p>
              <button onClick={onManualScan} className="mt-4 px-8 py-3 bg-amber-500 text-slate-950 text-[10px] font-black uppercase rounded-xl tracking-widest hover:bg-amber-400 transition-colors">Force Snapshot Retry</button>
            </div>
          </div>
        )}

        {!isThrottled && !analysis && !isAnalyzing && (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-10 opacity-30">
            <div className="w-24 h-24 rounded-full bg-slate-800/30 flex items-center justify-center mb-8 border border-slate-800">
              <i className="fas fa-radar text-slate-500 text-4xl animate-pulse"></i>
            </div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-[0.6em]">Observing Baseline Telemetry...</p>
          </div>
        )}

        {isAnalyzing && (
          <div className="flex-1 flex flex-col items-center justify-center py-10 space-y-10 animate-in fade-in duration-300">
            <div className="relative">
              <div className="w-32 h-32 rounded-full border-4 border-indigo-500/10 animate-[spin_4s_linear_infinite]"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <i className="fas fa-brain-circuit text-indigo-500 text-5xl animate-pulse"></i>
              </div>
            </div>
            <div className="text-center space-y-4">
              <p className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.5em]">Correlating Metrics & Logs</p>
              <div className="flex gap-2 justify-center">
                {[1,2,3,4].map(i => <div key={i} className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{animationDelay: `${i*0.15}s`}}></div>)}
              </div>
            </div>
          </div>
        )}

        {!isThrottled && analysis && analysis.predictedIncident !== 'none' && (
          <div className="flex-1 flex flex-col animate-in slide-in-from-bottom-6 duration-700">
            <div className="flex justify-between items-center mb-10">
              <div className="flex gap-4">
                <span className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg ${
                  analysis.severity === 'critical' ? 'bg-red-500 text-white' : 'bg-orange-500 text-white'
                }`}>
                  {analysis.severity} PRIORITY
                </span>
                <span className={`px-4 py-2 border text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-lg ${
                  analysis.confidence >= threshold ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-500' : 'bg-amber-500/20 border-amber-500/40 text-amber-500'
                }`}>
                  {analysis.confidence}% Confidence Score
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-600 font-bold tracking-widest">{analysis.id}</span>
            </div>

            <div className="mb-12">
              <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] mb-4">Crystal Root Cause</p>
              <h2 className="text-3xl font-black text-white tracking-tighter leading-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                {analysis.rootCause}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 flex-1">
              <div className="space-y-8">
                <div>
                  <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] mb-6 flex items-center gap-3">
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div> Correlation Logic
                  </h4>
                  <div className="space-y-4">
                    {analysis.reasoningSteps.map((step, i) => (
                      <div key={i} className="flex gap-5 items-start group">
                        <span className="text-[11px] font-black text-slate-800 mt-0.5">{i+1}</span>
                        <p className="text-[12px] text-slate-400 group-hover:text-slate-100 transition-colors leading-relaxed font-bold">
                          {step}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-indigo-500/10 to-transparent rounded-[2.5rem] p-10 border border-indigo-500/10 shadow-inner group overflow-hidden relative">
                <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none transition-transform group-hover:scale-110 duration-700">
                  <i className="fas fa-screwdriver-wrench text-8xl"></i>
                </div>
                <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em] mb-8 flex items-center gap-3">
                  <i className="fas fa-wand-magic-sparkles"></i> Remediation Guide
                </h4>
                <div className="space-y-6">
                  {analysis.recommendedFix.split('. ').filter(s => s).map((step, idx) => (
                    <div key={idx} className="flex gap-5 items-start">
                      <div className="w-7 h-7 rounded-xl bg-indigo-500/20 flex items-center justify-center shrink-0 shadow-lg">
                        <i className="fas fa-check text-[10px] text-indigo-400"></i>
                      </div>
                      <p className="text-sm text-indigo-50/90 font-black leading-relaxed">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className={`mt-12 p-8 -mx-12 -mb-12 border-t flex flex-col md:flex-row items-center justify-between gap-8 ${
              needsHuman ? 'bg-amber-500/5 border-amber-500/30' : 'bg-slate-950/40 border-slate-800'
            }`}>
              <div className="flex items-center gap-7">
                <div className={`w-16 h-16 rounded-3xl flex items-center justify-center shadow-2xl transition-all ${
                  needsHuman ? 'bg-amber-500 text-slate-950 animate-pulse' : 'bg-indigo-600 text-white'
                }`}>
                  <i className={`fas ${needsHuman ? 'fa-user-lock' : 'fa-robot-astromech'} text-3xl`}></i>
                </div>
                <div>
                  <p className={`text-[10px] font-black uppercase tracking-[0.5em] mb-2 ${needsHuman ? 'text-amber-500' : 'text-emerald-500'}`}>
                    {needsHuman ? 'Human Verification Required' : 'Autonomous Action Window Open'}
                  </p>
                  <p className="text-sm text-slate-200 font-black uppercase tracking-tighter">
                    {isAutoFixing ? 'Deploying autonomous fix guide...' : 'Awaiting operator review of strategy'}
                  </p>
                </div>
              </div>

              <div className="flex gap-5">
                <button onClick={onReject} className="px-8 py-4 text-[11px] font-black text-slate-500 uppercase hover:text-white transition-all tracking-widest">Reject Fix</button>
                <button 
                  onClick={() => onApplyFix(analysis)}
                  className={`px-14 py-5 text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl transition-all hover:-translate-y-1 active:scale-95 shadow-[0_20px_40px_rgba(0,0,0,0.3)] ${
                    needsHuman ? 'bg-amber-500 text-slate-950 shadow-amber-500/20' : 'bg-indigo-600 text-white shadow-indigo-600/20'
                  }`}
                >
                  {needsHuman ? 'Review & Resolve' : 'Execute Remediation'}
                </button>
              </div>
            </div>
          </div>
        )}

        {!isThrottled && analysis && analysis.predictedIncident === 'none' && (
           <div className="flex-1 flex flex-col items-center justify-center space-y-8 py-10 animate-in zoom-in-95 duration-700">
              <div className="w-24 h-24 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-2xl">
                 <i className="fas fa-shield-halved text-emerald-500 text-4xl animate-pulse"></i>
              </div>
              <div className="text-center space-y-3">
                <h3 className="text-emerald-500 font-black uppercase tracking-[0.8em]">Systems Nominal</h3>
                <p className="text-[11px] text-slate-500 font-mono font-bold italic">Observability window correlates with baseline safety profile.</p>
              </div>
           </div>
        )}
      </div>
    </div>
  );
};

export default ShadowAgentPanel;
