
import React, { useState, useEffect, useRef } from 'react';
import { ChaosMode, ChaosState, LogEntry, ShadowAnalysis, TelemetrySnapshot, AuditEntry } from './types';
import { INITIAL_STATE, calculateHealth, generateLogMessage } from './services/chaosService';
import { performShadowAnalysis } from './services/groqService';

import HealthDashboard from './components/HealthDashboard';
import ChaosControls from './components/ChaosControls';
import LogConsole from './components/LogConsole';
import ShadowAgentPanel from './components/ShadowAgentPanel';

const App: React.FC = () => {
  const [state, setState] = useState<ChaosState>(INITIAL_STATE);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [currentAnalysis, setCurrentAnalysis] = useState<ShadowAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isThrottled, setIsThrottled] = useState(false);
  const [autoFixThreshold, setAutoFixThreshold] = useState(80); // Lowered slightly to trust AI more
  const [auditTrail, setAuditTrail] = useState<AuditEntry[]>([]);
  const [resolutionAlert, setResolutionAlert] = useState<{message: string, type: 'AI' | 'HUMAN'} | null>(null);
  const [uptimeSeconds, setUptimeSeconds] = useState(0);
  
  const lastAnalysisTime = useRef<number>(0);

  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes loading { 0% { transform: translateX(-100%); } 100% { transform: translateX(300%); } }
      .animate-spin-slow { animation: spin 8s linear infinite; }
      @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      .custom-scrollbar::-webkit-scrollbar { width: 4px; }
      .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
      .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
      .glass-card { background: rgba(15, 23, 42, 0.7); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.05); }
    `;
    document.head.appendChild(style);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setUptimeSeconds(prev => prev + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setState(prev => {
        let nextState = { ...prev };
        if (prev.activeModes.includes(ChaosMode.MEMORY_LEAK)) nextState.memoryUsage += Math.random() * 100;
        if (prev.activeModes.includes(ChaosMode.LATENCY)) nextState.latencyMs = Math.min(prev.latencyMs + 600, 30000);
        if (prev.activeModes.includes(ChaosMode.DISK_EXHAUSTION)) nextState.diskUsagePercent = Math.min(prev.diskUsagePercent + 4.0, 100);
        nextState.health = calculateHealth(nextState);
        return nextState;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const triggerAnalysis = async () => {
    if (isAnalyzing) return;
    
    setIsAnalyzing(true);
    setIsThrottled(false);
    
    const snapshot: TelemetrySnapshot = {
      metrics: {
        memoryUsageMB: state.memoryUsage,
        latencyMs: state.latencyMs,
        diskUsagePercent: state.diskUsagePercent,
        health: state.health
      },
      activeChaos: state.activeModes,
      logs: logs.slice(0, 10)
    };

    const analysis = await performShadowAnalysis(snapshot);
    if (analysis) {
      setCurrentAnalysis(analysis);
      if (analysis.predictedIncident !== 'none') {
        if (analysis.confidence >= autoFixThreshold) {
          addLog(`AI ENGINE: Remediating incident [${analysis.id}] autonomously...`, 'WARN');
          setTimeout(() => applyRemediation(analysis, 'AI_AGENT'), 1500);
        } else {
          addLog(`AI ENGINE: Low confidence in resolution for [${analysis.id}]. Manual verification required.`, 'WARN');
        }
      }
    } else {
      setIsThrottled(true);
      addLog('AI ENGINE: API Rate limit hit. SRE Shadow Core paused to prevent overload.', 'ERROR');
    }
    
    lastAnalysisTime.current = Date.now();
    setIsAnalyzing(false);
  };

  useEffect(() => {
    const monitor = async () => {
      const now = Date.now();
      const isCritical = state.health !== 'healthy';
      // Slow down the loop significantly to protect quota
      // 10s if critical, 30s if healthy
      const cooldown = isCritical ? 10000 : 30000;

      if (now - lastAnalysisTime.current < cooldown || isAnalyzing) return;
      triggerAnalysis();
    };

    const interval = setInterval(monitor, 1000);
    return () => clearInterval(interval);
  }, [state.health, isAnalyzing]);

  useEffect(() => {
    const logInterval = setInterval(() => {
      const msg = generateLogMessage(state);
      if (msg) addLog(msg, msg.includes('FATAL') || msg.includes('ERROR') ? 'ERROR' : 'WARN');
    }, 4000);
    return () => clearInterval(logInterval);
  }, [state]);

  const addLog = (message: string, level: LogEntry['level'] = 'INFO') => {
    const newLog: LogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      level,
      message,
      source: 'kernel-core'
    };
    setLogs(prev => [newLog, ...prev].slice(0, 50));
  };

  const applyRemediation = (analysis: ShadowAnalysis, actor: AuditEntry['actor']) => {
    const incident = analysis.predictedIncident;
    let modeToClear: ChaosMode | null = null;
    if (incident === 'memory_leak') modeToClear = ChaosMode.MEMORY_LEAK;
    if (incident === 'api_timeout') modeToClear = ChaosMode.LATENCY;
    if (incident === 'disk_full') modeToClear = ChaosMode.DISK_EXHAUSTION;

    if (modeToClear) {
      setState(prev => ({
        ...prev,
        activeModes: prev.activeModes.filter(m => m !== modeToClear),
        memoryUsage: modeToClear === ChaosMode.MEMORY_LEAK ? INITIAL_STATE.memoryUsage : prev.memoryUsage,
        latencyMs: modeToClear === ChaosMode.LATENCY ? INITIAL_STATE.latencyMs : prev.latencyMs,
        diskUsagePercent: modeToClear === ChaosMode.DISK_EXHAUSTION ? INITIAL_STATE.diskUsagePercent : prev.diskUsagePercent,
      }));

      const audit: AuditEntry = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toLocaleTimeString(),
        action: 'RESOLVE_INCIDENT',
        actor,
        incident: analysis.predictedIncident,
        details: analysis.recommendedFix,
        confidenceAtTime: analysis.confidence
      };
      
      setAuditTrail(prev => [audit, ...prev].slice(0, 15));
      setResolutionAlert({
        message: `${incident.replace('_', ' ').toUpperCase()} RESOLVED BY ${actor === 'AI_AGENT' ? 'AI SRE' : 'OPERATOR'}. Root Cause: ${analysis.rootCause}`,
        type: actor === 'AI_AGENT' ? 'AI' : 'HUMAN'
      });
      addLog(`REMEDIATION: Action confirmed by ${actor}. Node stabilized.`, 'INFO');
      setCurrentAnalysis(null);
      setTimeout(() => setResolutionAlert(null), 10000);
    }
  };

  const toggleChaos = (mode: ChaosMode) => {
    setState(prev => {
      const active = prev.activeModes.includes(mode);
      const newModes = active ? prev.activeModes.filter(m => m !== mode) : [...prev.activeModes, mode];
      addLog(`${active ? 'CLEARED' : 'TRIGGERED'} ${mode.toUpperCase()} failure injection.`, active ? 'INFO' : 'WARN');
      
      if (active) {
         if (mode === ChaosMode.MEMORY_LEAK) return { ...prev, activeModes: newModes, memoryUsage: INITIAL_STATE.memoryUsage };
         if (mode === ChaosMode.LATENCY) return { ...prev, activeModes: newModes, latencyMs: INITIAL_STATE.latencyMs };
         if (mode === ChaosMode.DISK_EXHAUSTION) return { ...prev, activeModes: newModes, diskUsagePercent: INITIAL_STATE.diskUsagePercent };
      }
      return { ...prev, activeModes: newModes };
    });
  };

  const handleReset = () => {
    setState(INITIAL_STATE);
    setLogs([]);
    setAuditTrail([]);
    setCurrentAnalysis(null);
    setResolutionAlert(null);
    setUptimeSeconds(0);
    setIsThrottled(false);
    addLog('System Hard Reset initiated. All telemetry cleared.', 'INFO');
  };

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-10 min-h-screen flex flex-col font-sans text-slate-200">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6 pb-10 border-b border-slate-800/60">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-800 rounded-[2rem] flex items-center justify-center shadow-[0_0_40px_rgba(99,102,241,0.2)] border border-white/5">
            <i className="fas fa-microchip text-4xl text-white"></i>
          </div>
          <div>
            <h1 className="text-5xl font-black tracking-tighter text-white flex items-center gap-4">
              ChaosSim <span className="text-indigo-500 font-medium italic text-3xl">PREMIUM</span>
            </h1>
            <p className="text-slate-500 mt-2 uppercase tracking-[0.6em] text-[11px] font-black flex items-center gap-3">
              <span className={`w-3 h-3 rounded-full ${state.health === 'healthy' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-red-500 animate-pulse'}`}></span>
              Autonomous SRE Digital Twin Active
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-8 items-center bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-800/50 backdrop-blur-xl shadow-2xl">
           <div className="flex flex-col items-end">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Autonomous Threshold:</span>
                <span className="text-sm font-black text-indigo-400">{autoFixThreshold}%</span>
              </div>
              <input 
                type="range" min="50" max="100" 
                value={autoFixThreshold} 
                onChange={(e) => setAutoFixThreshold(parseInt(e.target.value))}
                className="w-64 h-2 bg-slate-800 rounded-full appearance-none cursor-pointer accent-indigo-500"
              />
           </div>
           <div className="h-14 w-px bg-slate-800 hidden md:block"></div>
           <button onClick={handleReset} className="px-10 py-5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-3 transition-all active:scale-95 shadow-lg">
            <i className="fas fa-rotate-left"></i> Force Reset
          </button>
        </div>
      </header>

      {resolutionAlert && (
        <div className={`mb-10 p-10 rounded-[2.5rem] border-2 animate-in fade-in slide-in-from-top-10 duration-700 shadow-2xl ${
          resolutionAlert.type === 'AI' ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-amber-500/10 border-amber-500/30'
        }`}>
          <div className="flex items-center justify-between gap-10">
            <div className="flex items-center gap-8">
               <div className={`w-20 h-20 rounded-3xl flex items-center justify-center text-3xl shadow-2xl ${
                 resolutionAlert.type === 'AI' ? 'bg-indigo-600 text-white' : 'bg-amber-500 text-slate-900'
               }`}>
                  <i className={`fas ${resolutionAlert.type === 'AI' ? 'fa-robot' : 'fa-user-shield'}`}></i>
               </div>
               <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.5em] opacity-50 text-slate-400 mb-2">Stability Protocol Executed</p>
                  <p className="text-2xl font-black text-white tracking-tight">{resolutionAlert.message}</p>
               </div>
            </div>
            <button onClick={() => setResolutionAlert(null)} className="p-4 text-slate-500 hover:text-white transition-colors bg-white/5 rounded-full"><i className="fas fa-times text-2xl"></i></button>
          </div>
        </div>
      )}

      <main className="grid grid-cols-1 lg:grid-cols-12 gap-12 flex-1">
        <div className="lg:col-span-4 space-y-12">
          <HealthDashboard state={state} uptime={uptimeSeconds} />
          <ChaosControls activeModes={state.activeModes} onToggle={toggleChaos} />
          
          <div className="bg-slate-900/40 border border-slate-800/50 rounded-[2.5rem] p-10 shadow-2xl backdrop-blur-xl">
             <h2 className="text-[12px] font-black text-slate-500 uppercase tracking-[0.5em] mb-10 flex items-center gap-4">
                <div className="w-1.5 h-8 bg-indigo-500 rounded-full shadow-[0_0_10px_#6366f1]"></div>
                Deployment Audit
             </h2>
             <div className="space-y-6 max-h-[420px] overflow-y-auto pr-4 custom-scrollbar">
                {auditTrail.length === 0 && (
                  <div className="py-24 flex flex-col items-center justify-center opacity-10">
                     <i className="fas fa-fingerprint text-7xl mb-6"></i>
                     <p className="text-[12px] uppercase font-black tracking-[0.8em]">No Activity</p>
                  </div>
                )}
                {auditTrail.map(entry => (
                  <div key={entry.id} className="p-6 bg-slate-950/80 border border-slate-800/40 rounded-3xl text-[12px] group transition-all hover:border-indigo-500/40 relative overflow-hidden">
                    <div className="flex justify-between font-black mb-4">
                      <span className={`flex items-center gap-3 py-1.5 px-4 rounded-xl text-[10px] ${entry.actor === 'AI_AGENT' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                        <i className={`fas ${entry.actor === 'AI_AGENT' ? 'fa-brain' : 'fa-user-cog'}`}></i>
                        {entry.actor === 'AI_AGENT' ? 'AI SRE' : 'OPERATOR'}
                      </span>
                      <span className="text-slate-600 font-mono self-center">{entry.timestamp}</span>
                    </div>
                    <p className="text-white font-black mb-3 text-[14px] tracking-tight uppercase">{entry.incident.replace('_', ' ')} RECOVERY</p>
                    <p className="text-slate-500 text-[12px] leading-relaxed italic pl-4 border-l-2 border-slate-800">"{entry.details}"</p>
                  </div>
                ))}
             </div>
          </div>
        </div>

        <div className="lg:col-span-8 flex flex-col gap-12">
          <ShadowAgentPanel 
            analysis={currentAnalysis} 
            isAnalyzing={isAnalyzing} 
            isThrottled={isThrottled}
            threshold={autoFixThreshold}
            onApplyFix={(analysis) => applyRemediation(analysis, 'HUMAN_OPERATOR')}
            onReject={() => setCurrentAnalysis(null)}
            onManualScan={triggerAnalysis}
          />
          <LogConsole logs={logs} />
        </div>
      </main>
    </div>
  );
};

export default App;
