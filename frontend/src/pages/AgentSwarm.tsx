import React, { useState, useEffect } from 'react';
import type { MarineAgent } from '../types';
import { api } from '../services/api';
import { AgentStatusBadge } from '../components/AgentStatusBadge';
import { 
  Battery, 
  Waves, 
  MapPin, 
  Send, 
  CheckCircle2, 
  Radio
} from 'lucide-react';

export const AgentSwarm: React.FC = () => {
  const [agents, setAgents] = useState<MarineAgent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<MarineAgent | null>(null);
  const [dispatchMission, setDispatchMission] = useState<string>('');
  const [dispatchSuccess, setDispatchSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchAgents = async () => {
      const data = await api.getAgents();
      setAgents(data);
    };
    fetchAgents();
  }, []);

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgent || !dispatchMission.trim()) return;

    const updated = await api.dispatchAgent(selectedAgent.agent_id, dispatchMission);
    if (updated) {
      setAgents(prev =>
        prev.map(a => (a.agent_id === updated.agent_id ? updated : a))
      );
      setDispatchSuccess(`Agent ${selectedAgent.name} successfully deployed on: "${dispatchMission}"`);
      setDispatchMission('');
      setTimeout(() => setDispatchSuccess(null), 4000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Collaborative Autonomous Marine Swarm
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Specialized AUVs, autonomous acoustic gliders, and benthic profiling drones operating in decentralized consensus.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs text-slate-300 bg-abyss-900 border border-ocean-900 px-3.5 py-2 rounded-xl">
          <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span>Swarm Link: <strong>100% Signal Integrity</strong></span>
        </div>
      </div>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {agents.map((agent) => (
          <div
            key={agent.id}
            className={`p-5 rounded-2xl bg-abyss-900/80 border transition-all duration-300 shadow-xl flex flex-col justify-between space-y-4 ${
              selectedAgent?.id === agent.id
                ? 'border-biolum-cyan/80 ring-1 ring-biolum-cyan/30'
                : 'border-ocean-900/80 hover:border-ocean-700/80'
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-mono text-ocean-400 font-bold block">
                    {agent.agent_id}
                  </span>
                  <h3 className="text-base font-bold text-white mt-0.5">
                    {agent.name}
                  </h3>
                  <span className="text-[11px] text-biolum-teal font-medium block mt-0.5">
                    {agent.agent_type.replace(/_/g, ' ')}
                  </span>
                </div>
                <AgentStatusBadge status={agent.status} />
              </div>

              {/* Telemetry Metrics */}
              <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-abyss-950/70 border border-ocean-950 text-xs">
                <div className="flex items-center space-x-2 text-slate-300">
                  <Battery className="w-4 h-4 text-emerald-400" />
                  <span>
                    Power: <strong className="text-white">{agent.battery_percentage}%</strong>
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-slate-300">
                  <Waves className="w-4 h-4 text-ocean-400" />
                  <span>
                    Depth: <strong className="text-white">{agent.depth_meters}m</strong>
                  </span>
                </div>
              </div>

              {/* Coordinates */}
              <div className="flex items-center space-x-2 text-xs text-slate-400">
                <MapPin className="w-3.5 h-3.5 text-biolum-cyan" />
                <span>
                  Coordinates: {agent.latitude.toFixed(4)}°, {agent.longitude.toFixed(4)}°
                </span>
              </div>

              {/* Capabilities */}
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1.5">
                  Payload Sensors & ML Models
                </span>
                <div className="flex flex-wrap gap-1">
                  {agent.capabilities.map((cap, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-md bg-ocean-950/80 border border-ocean-800/80 text-ocean-300 text-[10px]"
                    >
                      {cap}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Action dispatch button */}
            <div className="pt-3 border-t border-ocean-900/80">
              <button
                onClick={() => setSelectedAgent(agent)}
                className={`w-full py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                  selectedAgent?.id === agent.id
                    ? 'bg-ocean-600 text-white'
                    : 'bg-abyss-950 hover:bg-ocean-900/40 text-slate-300 border border-ocean-900'
                }`}
              >
                {selectedAgent?.id === agent.id ? 'Selected for Dispatch' : 'Select Agent'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Dispatch Swarm Mission Drawer */}
      {selectedAgent && (
        <div className="p-5 rounded-2xl bg-abyss-900/90 border border-ocean-700/80 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-ocean-900 pb-3">
            <div className="flex items-center space-x-2">
              <Send className="w-4 h-4 text-biolum-cyan" />
              <h3 className="font-bold text-white text-sm">
                Dispatch / Retask: {selectedAgent.name} ({selectedAgent.agent_id})
              </h3>
            </div>
            <button
              onClick={() => setSelectedAgent(null)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleDispatch} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Autonomous Mission Objective & Waypoint Directives
              </label>
              <input
                type="text"
                placeholder="e.g., Investigate sudden thermal inversion at north reef barrier or survey benthic DO layer"
                value={dispatchMission}
                onChange={(e) => setDispatchMission(e.target.value)}
                required
                className="w-full bg-abyss-950 border border-ocean-800 text-xs text-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-biolum-cyan"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Agent will recalculate spatial consensus before navigating to waypoint.
              </span>
              <button
                type="submit"
                className="flex items-center space-x-1.5 bg-gradient-to-r from-ocean-600 to-biolum-teal text-abyss-950 font-bold text-xs px-4 py-2 rounded-lg hover:brightness-110 shadow-lg shadow-ocean-500/10"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Transmit Mission</span>
              </button>
            </div>
          </form>

          {dispatchSuccess && (
            <div className="flex items-center space-x-2 p-3 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{dispatchSuccess}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
