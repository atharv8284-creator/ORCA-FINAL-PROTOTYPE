import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { EcologicalAlert, MarineZone } from '../types';
import { LoadingState } from '../components/LoadingState';
import { 
  CheckCircle2, 
  Zap, 
  Filter, 
  MapPin
} from 'lucide-react';

export const IncidentDetection: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [alerts, setAlerts] = useState<EcologicalAlert[]>([]);
  const [zones, setZones] = useState<MarineZone[]>([]);
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [simZoneId, setSimZoneId] = useState<string>('');
  const [simType, setSimType] = useState<string>('THERMAL_SPIKE');
  const [simulating, setSimulating] = useState<boolean>(false);

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const [a, z] = await Promise.all([
          api.getAlerts(),
          api.getZones()
        ]);
        setAlerts(a);
        setZones(z);
        if (z.length > 0) setSimZoneId(z[0].id);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const handleAcknowledge = async (alertId: string) => {
    const updated = await api.updateAlertStatus(alertId, 'ACKNOWLEDGED');
    if (updated) {
      setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, status: 'ACKNOWLEDGED' } : a));
    }
  };

  const handleSimulateIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simZoneId) return;
    try {
      setSimulating(true);
      const log = await api.triggerDeliberation(simZoneId, simType);
      if (log) {
        const refreshed = await api.getAlerts();
        setAlerts(refreshed);
      }
    } finally {
      setSimulating(false);
    }
  };

  if (loading) {
    return <LoadingState message="Scanning Geospatial Alert Matrix..." subtext="Querying autonomous swarm detection triggers" />;
  }

  const filtered = alerts.filter(a =>
    selectedSeverity === 'ALL' || a.severity === selectedSeverity
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Autonomous Incident Detection Matrix
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Multi-Agent Threat Triaging • Bleaching Alarms • Hypoxia Dead Zones • Dark Vessel Interception
          </p>
        </div>

        {/* Severity Filter */}
        <div className="flex items-center space-x-1.5 bg-surface-card border border-surface-border p-1 rounded-xl text-xs">
          <Filter className="w-3.5 h-3.5 text-slate-400 ml-2" />
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'].map((sev) => (
            <button
              key={sev}
              onClick={() => setSelectedSeverity(sev)}
              className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                selectedSeverity === sev
                  ? 'bg-ocean-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* Trigger Live Simulation Drawer */}
      <div className="p-5 rounded-2xl bg-surface-card border border-surface-border shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-surface-border pb-3">
          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4 text-biolum-cyan" />
            <h3 className="text-sm font-bold text-white">Simulate Anomaly & Multi-Agent Deliberation</h3>
          </div>
          <span className="text-[10px] font-mono text-ocean-400">
            Triggers Neural Consensus Pipeline
          </span>
        </div>

        <form onSubmit={handleSimulateIncident} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1">Target Biome:</label>
            <select
              value={simZoneId}
              onChange={(e) => setSimZoneId(e.target.value)}
              className="w-full bg-navy-900 border border-surface-border text-xs text-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-biolum-cyan"
            >
              {zones.map((z) => (
                <option key={z.id} value={z.id}>{z.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1">Anomaly Vector:</label>
            <select
              value={simType}
              onChange={(e) => setSimType(e.target.value)}
              className="w-full bg-navy-900 border border-surface-border text-xs text-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-biolum-cyan"
            >
              <option value="THERMAL_SPIKE">Thermal Spike Anomaly (Bleaching)</option>
              <option value="OXYGEN_DROP">Hypoxic Dead Zone Drop (&lt; 2.0 mg/L)</option>
              <option value="UNKNOWN_VESSEL">Unflagged Vessel Acoustic Signal</option>
              <option value="OCEAN_ACIDIFICATION">Acidification Pulse (&lt; 7.80 pH)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={simulating}
            className="flex items-center justify-center space-x-2 bg-gradient-to-r from-ocean-600 to-biolum-teal hover:brightness-110 text-navy-950 font-bold text-xs px-4 py-2 rounded-lg transition-all shadow-md shadow-ocean-500/20 disabled:opacity-50"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>{simulating ? 'Deliberating in Swarm...' : 'Trigger Incident Deliberation'}</span>
          </button>
        </form>
      </div>

      {/* Incident List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
            Active Threat Registry ({filtered.length})
          </h3>
          <span className="text-xs text-slate-400 font-mono">Real-time Triage</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((alert) => (
            <div
              key={alert.id}
              className={`p-5 rounded-2xl border space-y-3.5 flex flex-col justify-between ${
                alert.status === 'ACTIVE'
                  ? 'bg-surface-card border-rose-900/60 shadow-xl'
                  : 'bg-navy-950/80 border-surface-border opacity-70'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-white text-sm">{alert.title}</span>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                      alert.severity === 'CRITICAL'
                        ? 'bg-rose-950 text-rose-300 border border-rose-800'
                        : 'bg-amber-950 text-amber-300 border border-amber-800'
                    }`}
                  >
                    {alert.severity}
                  </span>
                </div>

                <div className="flex items-center space-x-2 text-xs text-slate-400 font-mono">
                  <MapPin className="w-3.5 h-3.5 text-biolum-cyan" />
                  <span>{alert.zone_name}</span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {alert.description}
                </p>

                {alert.recommended_mitigation && (
                  <div className="p-3 rounded-xl bg-navy-900 border border-surface-border text-xs space-y-1">
                    <span className="text-emerald-400 font-bold uppercase font-mono text-[10px] block">
                      Recommended Mitigation Countermeasure:
                    </span>
                    <p className="text-slate-200 text-[11px] leading-relaxed">
                      {alert.recommended_mitigation}
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-surface-border flex items-center justify-between text-xs">
                <span className="text-slate-400 font-mono text-[11px]">
                  Status: <strong className="text-white">{alert.status}</strong>
                </span>

                {alert.status === 'ACTIVE' && (
                  <button
                    onClick={() => handleAcknowledge(alert.id)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-navy-800 hover:bg-ocean-700 text-biolum-cyan text-xs font-semibold border border-ocean-700 transition-all"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Acknowledge</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
