import React, { useState } from 'react';
import type { AgentReasoningLog } from '../types';
import { Brain, CheckCircle2, Zap, Cpu, AlertCircle, Info } from 'lucide-react';

interface ReasoningFeedProps {
  logs: AgentReasoningLog[];
  onTriggerDeliberation?: (anomalyType: string) => void;
  isLoading?: boolean;
}

export const ReasoningFeed: React.FC<ReasoningFeedProps> = ({
  logs,
  onTriggerDeliberation,
  isLoading
}) => {
  const [selectedAnomaly, setSelectedAnomaly] = useState<string>('THERMAL_SPIKE');

  const getSeverityStyle = (severity: string) => {
    switch (severity.toUpperCase()) {
      case 'CRITICAL':
        return 'bg-rose-950/60 text-rose-400 border-rose-800';
      case 'ELEVATED':
        return 'bg-amber-950/60 text-amber-400 border-amber-800';
      case 'ADVISORY':
        return 'bg-ocean-950/60 text-biolum-cyan border-ocean-800';
      default:
        return 'bg-slate-900/60 text-slate-400 border-slate-800';
    }
  };

  const getInferenceModeBadge = (mode?: string, nugenStatus?: string) => {
    if (mode === 'NUGEN_NEURAL_REASONING') {
      return (
        <span className="flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-cyan-950/80 border border-biolum-cyan text-biolum-cyan shadow-sm shadow-cyan-500/20">
          <Cpu className="w-3 h-3" />
          <span>Nugen Neural Deliberation</span>
        </span>
      );
    }
    // Heuristic Rule Based
    return (
      <div className="flex items-center space-x-1.5">
        <span className="flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-900/90 border border-slate-700 text-slate-300">
          <Zap className="w-2.5 h-2.5 text-amber-400" />
          <span>Rule-Based Heuristic</span>
        </span>
        {nugenStatus && nugenStatus !== 'INFERENCE_SUCCESS' && (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono border bg-amber-950/50 border-amber-800/60 text-amber-300">
            Nugen: {nugenStatus}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="bg-abyss-900/80 rounded-2xl border border-ocean-900/80 p-5 shadow-xl space-y-4">
      {/* Header and Live Deliberation Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-ocean-900/80 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <Brain className="w-5 h-5 text-biolum-cyan" />
            <h3 className="font-bold text-white text-base">
              Autonomous Collaborative Reasoning
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Transparent multi-agent hypotheses, consensus deliberation, and mitigation actions
          </p>
        </div>

        {/* Trigger Deliberation Control */}
        {onTriggerDeliberation && (
          <div className="flex items-center space-x-2">
            <select
              value={selectedAnomaly}
              onChange={(e) => setSelectedAnomaly(e.target.value)}
              className="bg-abyss-950 border border-ocean-800 text-xs text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-biolum-cyan"
            >
              <option value="THERMAL_SPIKE">Thermal Spike Anomaly</option>
              <option value="OXYGEN_DROP">Hypoxic Dead Zone Drop</option>
              <option value="UNKNOWN_VESSEL">Dark Vessel Acoustic Intrusion</option>
              <option value="OCEAN_ACIDIFICATION">Acidification Pulse</option>
            </select>
            <button
              onClick={() => onTriggerDeliberation(selectedAnomaly)}
              disabled={isLoading}
              className="flex items-center space-x-1.5 bg-gradient-to-r from-ocean-600 to-biolum-teal hover:from-ocean-500 hover:to-biolum-cyan text-abyss-950 font-semibold text-xs px-3 py-1.5 rounded-lg transition-all shadow-md shadow-ocean-500/10 disabled:opacity-50"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>{isLoading ? 'Deliberating...' : 'Deliberate'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Logs Feed */}
      <div className="space-y-3.5 max-h-[500px] overflow-y-auto pr-1">
        {logs.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs">
            No autonomous deliberation cycles logged yet.
          </div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className="p-4 rounded-xl bg-abyss-950/70 border border-ocean-900/60 hover:border-ocean-700/60 transition-all space-y-3"
            >
              {/* Top metadata */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-ocean-900/40 pb-2.5">
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-white text-xs">
                      {log.agent_name}
                    </span>
                    {log.zone_name && (
                      <span className="text-[11px] text-ocean-400">
                        • {log.zone_name}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 block">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {getInferenceModeBadge(log.inference_mode, log.nugen_status)}
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950/60 border border-emerald-800 text-emerald-400">
                    {log.confidence_score}% Confidence
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${getSeverityStyle(log.severity)}`}>
                    {log.severity}
                  </span>
                </div>
              </div>

              {/* Informative fallback / Nugen status notice */}
              {log.nugen_error && (
                <div className="flex items-center space-x-1.5 text-[10px] text-amber-300/90 bg-amber-950/30 px-2.5 py-1.5 rounded-lg border border-amber-900/40">
                  <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>{log.nugen_error}</span>
                </div>
              )}

              {/* Missing or unavailable evidence notice */}
              {log.missing_evidence && log.missing_evidence.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400 bg-abyss-900/50 p-2 rounded-lg border border-ocean-950">
                  <AlertCircle className="w-3 h-3 text-amber-400 shrink-0" />
                  <span className="text-slate-400 font-medium">Missing / In-Situ Offline:</span>
                  {log.missing_evidence.map((src, i) => (
                    <span key={i} className="px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-300 font-mono text-[9px] border border-slate-700/50">
                      {src}
                    </span>
                  ))}
                </div>
              )}

              {/* Observation & Hypothesis */}
              <div className="text-xs space-y-1.5">
                <div>
                  <span className="text-slate-400 font-medium">Observation: </span>
                  <span className="text-slate-200">{log.observation}</span>
                </div>
                <div>
                  <span className="text-biolum-cyan font-medium">Hypothesis: </span>
                  <span className="text-slate-300 italic">{log.hypothesis}</span>
                </div>
              </div>

              {/* Multi-Agent Reasoning Chain Steps */}
              {log.reasoning_chain && log.reasoning_chain.length > 0 && (
                <div className="p-2.5 rounded-lg bg-abyss-900/90 border border-ocean-950 space-y-1.5">
                  <span className="text-[10px] font-bold text-ocean-400 uppercase tracking-wider block">
                    Swarm Deliberation Chain
                  </span>
                  {log.reasoning_chain.map((step) => (
                    <div key={step.step} className="flex items-start space-x-2 text-[11px]">
                      <span className="w-4 h-4 rounded-full bg-ocean-950 border border-ocean-800 text-ocean-300 flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5">
                        {step.step}
                      </span>
                      {step.claim ? (
                        <p className="text-slate-300">
                          <strong className="text-ocean-200">{step.agent}:</strong> {step.claim}
                        </p>
                      ) : (
                        <p className="text-emerald-300 font-medium">
                          <strong>Consensus:</strong> {step.consensus}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Consensus Action */}
              <div className="flex items-start space-x-2 pt-1 border-t border-ocean-950 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-emerald-400 text-[11px] uppercase tracking-wide">
                    Consensus Intervention:
                  </span>
                  <p className="text-slate-200 text-xs mt-0.5">{log.consensus_action}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
