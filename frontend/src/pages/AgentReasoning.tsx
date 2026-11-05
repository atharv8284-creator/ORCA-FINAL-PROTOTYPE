import React, { useState, useEffect } from 'react';
import type { AgentReasoningLog, MarineZone, NugenIntegrationStatus } from '../types';
import { api } from '../services/api';
import { ReasoningFeed } from '../components/ReasoningFeed';
import { Cpu, ShieldCheck } from 'lucide-react';

export const AgentReasoning: React.FC = () => {
  const [logs, setLogs] = useState<AgentReasoningLog[]>([]);
  const [zones, setZones] = useState<MarineZone[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string>('');
  const [isDeliberating, setIsDeliberating] = useState<boolean>(false);
  const [nugenStatus, setNugenStatus] = useState<NugenIntegrationStatus | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const [l, z, n] = await Promise.all([
        api.getReasoningLogs(20),
        api.getZones(),
        api.getNugenStatus()
      ]);
      setLogs(l);
      setZones(z);
      setNugenStatus(n);
      if (z.length > 0) setSelectedZoneId(z[0].id);
    };
    fetchData();
  }, []);

  const handleTriggerDeliberation = async (anomalyType: string) => {
    if (!selectedZoneId) return;
    setIsDeliberating(true);
    try {
      const newLog = await api.triggerDeliberation(selectedZoneId, anomalyType);
      if (newLog) {
        setLogs(prev => [newLog, ...prev]);
      }
      // Refresh status after deliberation
      const n = await api.getNugenStatus();
      setNugenStatus(n);
    } finally {
      setIsDeliberating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Decentralized Autonomous Reasoning Hub
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Explainable AI logic chains, peer-to-peer scientific debate, and consensus intervention triggers.
          </p>
        </div>

        {/* Zone Selector for Deliberation */}
        <div className="flex items-center space-x-2 text-xs">
          <label className="text-slate-400">Target Biome for Deliberation:</label>
          <select
            value={selectedZoneId}
            onChange={(e) => setSelectedZoneId(e.target.value)}
            className="bg-abyss-900 border border-ocean-900 text-xs text-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-biolum-cyan"
          >
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Nugen Integration Transparency Banner */}
      <div className="p-3.5 rounded-xl bg-abyss-900/80 border border-ocean-900/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-lg bg-cyan-950/60 border border-cyan-800/40 text-biolum-cyan shrink-0">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-white">Nugen Inference Service:</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${
                nugenStatus?.status === 'INFERENCE_SUCCESS'
                  ? 'bg-emerald-950/80 border-emerald-800 text-emerald-400'
                  : nugenStatus?.status === 'UNCONFIGURED'
                  ? 'bg-amber-950/80 border-amber-800 text-amber-300'
                  : 'bg-slate-900 border-slate-700 text-slate-400'
              }`}>
                {nugenStatus?.status || 'CHECKING...'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {nugenStatus?.detail || 'Operational deliberation pipeline active with automatic heuristic fallback.'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-[11px] text-slate-400 shrink-0">
          <div className="flex items-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Credentials Kept Server-Side</span>
          </div>
        </div>
      </div>

      {/* Architecture Explanation Card */}
      <div className="p-4 rounded-xl bg-abyss-900/60 border border-ocean-800/40 text-xs text-slate-300 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1">
          <span className="font-bold text-biolum-cyan block uppercase tracking-wide text-[10px]">
            1. Anomaly Perception
          </span>
          <p className="text-slate-400 leading-relaxed text-[11px]">
            AUV sensors register abrupt changes in Sea Surface Temp, Dissolved Oxygen gradients, or acoustic propulsion sounds.
          </p>
        </div>
        <div className="space-y-1">
          <span className="font-bold text-biolum-teal block uppercase tracking-wide text-[10px]">
            2. Multi-Agent Peer Debate
          </span>
          <p className="text-slate-400 leading-relaxed text-[11px]">
            Agents query adjacent nodes, cross-validate hypotheses (e.g. thermocline collapse vs upwelling), and exchange confidence ratings.
          </p>
        </div>
        <div className="space-y-1">
          <span className="font-bold text-amber-400 block uppercase tracking-wide text-[10px]">
            3. Consensus Action & Alert
          </span>
          <p className="text-slate-400 leading-relaxed text-[11px]">
            When agreement surpasses 85% confidence, autonomous countermeasures (shading, aeration, coast guard ping) are dispatched.
          </p>
        </div>
      </div>

      {/* Main Reasoning Feed */}
      <ReasoningFeed
        logs={logs}
        onTriggerDeliberation={handleTriggerDeliberation}
        isLoading={isDeliberating}
      />
    </div>
  );
};
