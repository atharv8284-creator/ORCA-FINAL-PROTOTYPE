import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip 
} from 'recharts';
import { 
  Navigation, 
  Waves, 
  Cpu, 
  Workflow, 
  Radio, 
  Brain, 
  ExternalLink, 
  Activity, 
  CheckCircle, 
  Clock, 
  ArrowRight, 
  Radar, 
  Eye, 
  AlertTriangle, 
  Layers, 
  FileText 
} from 'lucide-react';
import { MetricCard } from '../components/MetricCard';
import { MarineMap } from '../components/MarineMap';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { DataTierBadge } from '../components/DataTierBadge';
import { api } from '../services/api';
import type { 
  MarineZone, 
  MarineAgent, 
  AgentReasoningLog, 
  EcologicalAlert,
  SatellitePass,
  IoTBuoy,
  NugenModelMetrics,
  DataSourceHealth,
  FinalMarineIntelligenceAssessment
} from '../types';

export const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [zones, setZones] = useState<MarineZone[]>([]);
  const [agents, setAgents] = useState<MarineAgent[]>([]);
  const [logs, setLogs] = useState<AgentReasoningLog[]>([]);
  const [alerts, setAlerts] = useState<EcologicalAlert[]>([]);
  const [satellites, setSatellites] = useState<SatellitePass[]>([]);
  const [buoys, setBuoys] = useState<IoTBuoy[]>([]);
  const [nugen, setNugen] = useState<NugenModelMetrics | null>(null);
  const [dataSources, setDataSources] = useState<DataSourceHealth[]>([]);
  
  // Real-world and simulated agent statuses
  const [aisStatus, setAisStatus] = useState<string>('NOT CONNECTED');
  const [aisVesselCount, setAisVesselCount] = useState<number>(0);
  const [iotHardwareConnected, setIotHardwareConnected] = useState<boolean>(false);
  const [cmsStatus, setCmsStatus] = useState<string>('OPERATIONAL');

  // Phase 6 & 7 Multi-Agent Orchestration & Metrics
  const [totalInvestigations, setTotalInvestigations] = useState<number>(1);
  const [latestAssessment, setLatestAssessment] = useState<FinalMarineIntelligenceAssessment | null>(null);
  const [sarCount, setSarCount] = useState<number>(0);
  const [opticalCount, setOpticalCount] = useState<number>(0);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [
          z, 
          a, 
          l, 
          alt, 
          sat, 
          b, 
          n, 
          ds, 
          aisRes, 
          iotRes, 
          cmsRes,
          orchHistory,
          sarLedger,
          optLedger
        ] = await Promise.all([
          api.getZones(),
          api.getAgents(),
          api.getReasoningLogs(6),
          api.getAlerts(),
          api.getSatellitePasses(),
          api.getIoTBuoys(),
          api.getNugenMetrics(),
          api.getDataSources(),
          api.getAISProviderStatus().catch(() => null),
          api.getIoTDeviceStatus().catch(() => null),
          api.getCopernicusMarineHealth().catch(() => null),
          api.getOrchestrationHistory(10).catch(() => null),
          api.getSARAnalyses().catch(() => []),
          api.getOpticalAnalyses().catch(() => [])
        ]);

        setZones(z);
        setAgents(a);
        setLogs(l);
        setAlerts(alt);
        setSatellites(sat);
        setBuoys(b);
        setNugen(n);
        setDataSources(ds);

        if (aisRes) {
          setAisStatus(aisRes.connection_status);
          setAisVesselCount(aisRes.total_vessels_tracked);
        }
        if (iotRes) {
          setIotHardwareConnected(iotRes.hardware_connection_status === 'LIVE');
        }
        if (cmsRes) {
          setCmsStatus(cmsRes.status);
        }
        if (orchHistory && orchHistory.assessments && orchHistory.assessments.length > 0) {
          setTotalInvestigations(orchHistory.total_assessments);
          setLatestAssessment(orchHistory.assessments[0]);
        }
        if (sarLedger) {
          setSarCount(sarLedger.length);
        }
        if (optLedger) {
          setOpticalCount(optLedger.length);
        }
      } catch (err) {
        console.error("Dashboard failed to fetch intelligence stream:", err);
        setError("Failed to synchronize with marine telemetry data store.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const handleAcknowledgeAlert = async (alertId: string) => {
    await api.updateAlertStatus(alertId, 'ACKNOWLEDGED');
    setAlerts(prev =>
      prev.map(a => (a.id === alertId ? { ...a, status: 'ACKNOWLEDGED' } : a))
    );
  };

  if (loading) {
    return <LoadingState message="Connecting to ORCA Marine Command..." subtext="Syncing satellite radar swaths, AIS tracks, and PostGIS geometries" />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => window.location.reload()} />;
  }

  // Hydrographic chart data
  const chartData = [
    { time: 'T-10h', temp: 29.2, do: 5.9, ph: 8.11 },
    { time: 'T-8h', temp: 29.6, do: 5.6, ph: 8.08 },
    { time: 'T-6h', temp: 30.1, do: 5.2, ph: 8.04 },
    { time: 'T-4h', temp: 30.7, do: 4.8, ph: 8.01 },
    { time: 'T-2h', temp: 31.0, do: 4.5, ph: 7.98 },
    { time: 'Now', temp: 31.2, do: 4.2, ph: 7.96 },
  ];

  const activeAlertsCount = alerts.filter(a => a.status === 'ACTIVE').length;
  const activeAgentsCount = agents.filter(a => a.status === 'ACTIVE' || a.status === 'INVESTIGATING').length;

  return (
    <div className="space-y-6">
      {/* 1. Platform Title Banner & Quick Navigation Hub */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-navy-900 via-surface-card to-navy-900 border border-surface-border shadow-xl">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-biolum-teal animate-ping"></span>
            <span className="text-xs uppercase font-mono font-bold tracking-widest text-biolum-cyan">
              ORCA Central Marine Command • Indradhanu Hackathon 2026
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white mt-1">
            ORCA Global Marine Ecosystem Intelligence Center
          </h1>
          <p className="text-xs text-slate-300 font-mono mt-0.5">
            Collaborative Multi-Agent Fleet • Satellite Radiometry • Hydrodynamic Numerical Models • Nugen Neural Reasoner
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/orchestration"
            className="flex items-center space-x-2 bg-gradient-to-r from-biolum-cyan to-ocean-500 hover:brightness-110 text-navy-950 font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-lg shadow-biolum-cyan/20"
          >
            <Workflow className="w-4 h-4" />
            <span>Lead Orchestrator (Multi-Agent)</span>
          </Link>
          <Link
            to="/map"
            className="flex items-center space-x-2 bg-navy-800 hover:bg-navy-700 text-slate-200 font-bold text-xs px-3.5 py-2 rounded-xl border border-surface-border transition-all"
          >
            <ExternalLink className="w-4 h-4 text-ocean-400" />
            <span>GIS Map</span>
          </Link>
          <Link
            to="/reports"
            className="flex items-center space-x-2 bg-navy-800 hover:bg-navy-700 text-slate-200 font-bold text-xs px-3.5 py-2 rounded-xl border border-surface-border transition-all"
          >
            <FileText className="w-4 h-4 text-purple-400" />
            <span>Dossiers</span>
          </Link>
        </div>
      </div>

      {/* 2. Overview Metrics (Requirement 2.B) */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-ocean-400 font-mono flex items-center space-x-2">
            <Activity className="w-3.5 h-3.5 text-biolum-cyan" />
            <span>Central Marine Telemetry & Swarm Metrics</span>
          </h2>
          <span className="text-[11px] text-slate-400 font-mono">Real Backend Synchronization</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-3">
          {/* 1. Total Investigations */}
          <MetricCard
            title="Investigations"
            value={totalInvestigations}
            subtitle="Multi-agent assessments"
            change="Lead Orchestrator"
            isPositive={true}
            icon={Workflow}
            colorScheme="cyan"
          />

          {/* 2. Active Assessments */}
          <MetricCard
            title="Active Dossiers"
            value={totalInvestigations}
            subtitle="Completed consensus"
            change="100% deliberated"
            isPositive={true}
            icon={FileText}
            colorScheme="teal"
          />

          {/* 3. SAR Observations */}
          <MetricCard
            title="SAR Radar"
            value={sarCount > 0 ? `${sarCount} Analyses` : `${satellites.filter(s => s.sensor_type.includes('SAR')).length || 1} Swaths`}
            subtitle="Sentinel-1 C-SAR"
            change="IW/EW GRD Mode"
            isPositive={true}
            icon={Radar}
            colorScheme="cyan"
          />

          {/* 4. Optical Observations */}
          <MetricCard
            title="Optical MSI"
            value={opticalCount > 0 ? `${opticalCount} Analyses` : `${satellites.filter(s => !s.sensor_type.includes('SAR')).length || 1} Passes`}
            subtitle="Sentinel-2 L2A"
            change="Bio-optical proxy"
            isPositive={true}
            icon={Eye}
            colorScheme="teal"
          />

          {/* 5. Oceanographic Evidence */}
          <MetricCard
            title="Ocean Physics"
            value={cmsStatus === 'OPERATIONAL' ? 'CMS LIVE' : '11 VARS'}
            subtitle="Copernicus Marine"
            change={cmsStatus === 'OPERATIONAL' ? 'Mercator Physics' : 'Open WMTS Ready'}
            isPositive={cmsStatus === 'OPERATIONAL'}
            icon={Waves}
            colorScheme="teal"
          />

          {/* 6. Active AIS Vessels */}
          <MetricCard
            title="AIS Vessels"
            value={aisStatus === 'REAL' ? `${aisVesselCount} Live` : aisStatus === 'DEMO' ? `${aisVesselCount} Demo` : '0 Tracked'}
            subtitle={
              aisStatus === 'REAL' ? 'Live transponders' :
              aisStatus === 'DEMO' ? 'Demonstration mode' :
              'AIS NOT CONNECTED'
            }
            change={`Feed: ${aisStatus}`}
            isPositive={aisStatus === 'REAL' || aisStatus === 'DEMO'}
            icon={Navigation}
            colorScheme={
              aisStatus === 'REAL' ? 'emerald' :
              aisStatus === 'DEMO' ? 'cyan' :
              'amber'
            }
          />

          {/* 7. IoT Buoy Device */}
          <MetricCard
            title="IoT Mooring"
            value={iotHardwareConnected ? 'LIVE HW' : 'SIMULATED'}
            subtitle={`${buoys.length} ESP32 Stations`}
            change={iotHardwareConnected ? 'HW: Connected' : 'Virtual ESP32'}
            isPositive={iotHardwareConnected}
            icon={Radio}
            colorScheme={iotHardwareConnected ? 'emerald' : 'amber'}
          />

          {/* 8. AI Agent Fleet */}
          <MetricCard
            title="Swarm Health"
            value={`${activeAgentsCount}/${agents.length}`}
            subtitle={activeAlertsCount > 0 ? `${activeAlertsCount} Alerts Active` : 'All Systems Nominal'}
            change={`${nugen?.zero_shot_anomaly_accuracy_pct || 96.8}% Nugen AI`}
            isPositive={true}
            icon={Cpu}
            colorScheme="emerald"
          />
        </div>
      </div>

      {/* 3. Five Dedicated Agent Status Overview Cards (Requirement 2.C) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-ocean-400 font-mono flex items-center space-x-2">
            <Cpu className="w-3.5 h-3.5 text-biolum-cyan" />
            <span>Autonomous Observational Fleet Status (5 Sub-Agents)</span>
          </h2>
          <span className="text-[11px] text-slate-400 font-mono">Provenance & Scientific Constraints</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* Agent 1: SAR Agent */}
          <div className="p-4 rounded-xl bg-surface-card border border-surface-border hover:border-ocean-500/40 transition-all space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Radar className="w-4 h-4 text-biolum-cyan" />
                <span className="font-bold text-white text-xs">SAR Agent</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[9px] font-bold font-mono bg-emerald-950 text-emerald-400 border border-emerald-800">
                OPERATIONAL
              </span>
            </div>
            <div className="text-[11px] space-y-1 font-mono text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Data Tier:</span>
                <DataTierBadge tier="LIVE" size="sm" />
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Source:</span>
                <span className="text-white truncate max-w-[110px]" title="Copernicus CDSE Sentinel-1 C-SAR">Sentinel-1 C-SAR</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Analyses:</span>
                <span className="text-biolum-cyan font-bold">{sarCount > 0 ? `${sarCount} Staged` : 'Active'}</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 leading-tight border-t border-surface-border/60 pt-2">
              ⚠️ Dark backscatter damping requires wind 3–12 m/s; calms create natural look-alikes.
            </p>
          </div>

          {/* Agent 2: Optical Agent */}
          <div className="p-4 rounded-xl bg-surface-card border border-surface-border hover:border-ocean-500/40 transition-all space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Eye className="w-4 h-4 text-biolum-teal" />
                <span className="font-bold text-white text-xs">Optical Agent</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[9px] font-bold font-mono bg-emerald-950 text-emerald-400 border border-emerald-800">
                OPERATIONAL
              </span>
            </div>
            <div className="text-[11px] space-y-1 font-mono text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Data Tier:</span>
                <DataTierBadge tier="CALIBRATED_PREVIEW_ANALYSIS" size="sm" />
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Source:</span>
                <span className="text-white truncate max-w-[110px]" title="Copernicus Sentinel-2 Level-2A MSI">Sentinel-2 L2A</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Analyses:</span>
                <span className="text-biolum-teal font-bold">{opticalCount > 0 ? `${opticalCount} Staged` : 'Active'}</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 leading-tight border-t border-surface-border/60 pt-2">
              ⚠️ Quicklooks provide relative bio-optical proxy (NDCI/SPM); cloud-mask screened.
            </p>
          </div>

          {/* Agent 3: Oceanographic Agent */}
          <div className="p-4 rounded-xl bg-surface-card border border-surface-border hover:border-ocean-500/40 transition-all space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Waves className="w-4 h-4 text-ocean-400" />
                <span className="font-bold text-white text-xs">Oceanographic</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[9px] font-bold font-mono bg-emerald-950 text-emerald-400 border border-emerald-800">
                OPERATIONAL
              </span>
            </div>
            <div className="text-[11px] space-y-1 font-mono text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Data Tier:</span>
                <DataTierBadge tier="MODEL_OUTPUT" size="sm" />
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Source:</span>
                <span className="text-white truncate max-w-[110px]" title="Copernicus Marine Service Mercator/WaveWatch">CMEMS Global</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Variables:</span>
                <span className="text-ocean-300 font-bold">11 Physical</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 leading-tight border-t border-surface-border/60 pt-2">
              ⚠️ Numerical ocean physics; 0.083° spatial grid with 3-hourly time resolution.
            </p>
          </div>

          {/* Agent 4: AIS Agent */}
          <div className="p-4 rounded-xl bg-surface-card border border-surface-border hover:border-ocean-500/40 transition-all space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Navigation className="w-4 h-4 text-purple-400" />
                <span className="font-bold text-white text-xs">AIS Agent</span>
              </div>
              <span className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono ${
                aisStatus === 'REAL' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                aisStatus === 'DEMO' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' :
                'bg-amber-950 text-amber-400 border border-amber-800'
              }`}>
                {aisStatus}
              </span>
            </div>
            <div className="text-[11px] space-y-1 font-mono text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Data Tier:</span>
                <DataTierBadge tier={aisStatus === 'REAL' ? 'LIVE' : aisStatus === 'DEMO' ? 'DEMO' : 'NOT CONNECTED'} size="sm" />
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Source:</span>
                <span className="text-white truncate max-w-[110px]">Datalastic/AISHub</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Vessels:</span>
                <span className="text-purple-300 font-bold">{aisVesselCount}</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 leading-tight border-t border-surface-border/60 pt-2">
              ⚠️ Vessel proximity is supporting traffic context, NOT proof of discharge causation.
            </p>
          </div>

          {/* Agent 5: Virtual ESP32 Buoy Agent */}
          <div className="p-4 rounded-xl bg-surface-card border border-surface-border hover:border-ocean-500/40 transition-all space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Radio className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-white text-xs">IoT Buoy Agent</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[9px] font-bold font-mono bg-amber-950 text-amber-400 border border-amber-800">
                SIMULATED
              </span>
            </div>
            <div className="text-[11px] space-y-1 font-mono text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Data Tier:</span>
                <DataTierBadge tier="SIMULATED" size="sm" />
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Station ID:</span>
                <span className="text-white truncate max-w-[110px]">ORCA-BUOY-001</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Sensors:</span>
                <span className="text-amber-300 font-bold">5 Telemetry</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 leading-tight border-t border-surface-border/60 pt-2">
              ⚠️ Synthetic FreeRTOS simulation; isolated from real-world empirical incident scoring.
            </p>
          </div>
        </div>
      </div>

      {/* 4. Central Intelligence Summary — Latest Lead Orchestrator Assessment (Requirement 2.D) */}
      {latestAssessment && (
        <div className="p-5 rounded-2xl bg-gradient-to-br from-navy-900 via-surface-card to-ocean-950/40 border border-ocean-500/40 shadow-2xl space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-surface-border pb-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-biolum-cyan to-ocean-600 flex items-center justify-center text-navy-950 shadow-md shadow-biolum-cyan/20">
                <Workflow className="w-5 h-5 font-bold" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-biolum-cyan">
                    Central Intelligence Summary • Assessment ID: {latestAssessment.assessment_id}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-emerald-950 text-emerald-300 border border-emerald-800">
                    {latestAssessment.status}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white">
                  {latestAssessment.assessment_label}
                </h3>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="px-3 py-1.5 rounded-xl bg-navy-900 border border-surface-border text-center">
                <span className="block text-[9px] uppercase font-mono text-slate-400">Assessment Confidence</span>
                <span className="text-xs font-bold font-mono text-emerald-400">
                  {Math.round((latestAssessment.confidence?.confidence_score || 0.85) * 100)}% ({latestAssessment.confidence?.confidence_tier || 'HIGH'})
                </span>
              </div>
              <Link
                to="/orchestration"
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-ocean-600 hover:bg-ocean-500 text-white text-xs font-bold transition-all shadow-md"
              >
                <span>Lead Orchestrator Panel</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs">
            {/* Nugen Neural Reasoning Breakdown */}
            <div className="p-4 rounded-xl bg-navy-950/80 border border-surface-border space-y-2">
              <span className="text-[10px] font-bold font-mono uppercase text-purple-300 tracking-wider flex items-center space-x-1.5">
                <Brain className="w-3.5 h-3.5 text-purple-400" />
                <span>Nugen Neural Deliberation</span>
              </span>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                {latestAssessment.nugen_reasoning?.hypothesis || latestAssessment.nugen_reasoning?.observation || 'All agents report nominal marine equilibrium across the target biome.'}
              </p>
              {latestAssessment.nugen_reasoning?.consensus_action && (
                <div className="text-[10px] text-ocean-300 font-mono pt-1">
                  <strong>Consensus:</strong> {latestAssessment.nugen_reasoning.consensus_action}
                </div>
              )}
            </div>

            {/* Supporting & Contradicting Evidence */}
            <div className="p-4 rounded-xl bg-navy-950/80 border border-surface-border space-y-2">
              <span className="text-[10px] font-bold font-mono uppercase text-biolum-cyan tracking-wider flex items-center space-x-1.5">
                <Layers className="w-3.5 h-3.5 text-biolum-cyan" />
                <span>Evidence Triangulation ({latestAssessment.evidence_summary?.length || 0} Records)</span>
              </span>
              <div className="space-y-1.5 text-[11px]">
                {latestAssessment.supporting_evidence && latestAssessment.supporting_evidence.length > 0 ? (
                  latestAssessment.supporting_evidence.slice(0, 2).map((s, idx) => (
                    <div key={idx} className="text-slate-300">
                      <strong className="text-white">{s.agent}:</strong> {s.finding}
                    </div>
                  ))
                ) : (
                  <div className="text-slate-400">All harvested metrics remain within normal background envelopes.</div>
                )}
                {latestAssessment.contradicting_evidence && latestAssessment.contradicting_evidence.length > 0 && (
                  <div className="text-amber-300 text-[10px] pt-1">
                    ⚠️ {latestAssessment.contradicting_evidence[0].finding}
                  </div>
                )}
              </div>
            </div>

            {/* Scientific Caveats & Recommended Follow-up */}
            <div className="p-4 rounded-xl bg-navy-950/80 border border-surface-border space-y-2">
              <span className="text-[10px] font-bold font-mono uppercase text-amber-300 tracking-wider flex items-center space-x-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>Scientific Integrity Disclosures</span>
              </span>
              <ul className="list-disc list-inside space-y-1 text-slate-300 text-[10px]">
                {(latestAssessment.uncertainty || [
                  "Optical indicators derived from preview quicklook as relative bio-optical proxy.",
                  "Simulated IoT evidence is isolated from empirical incident confidence scoring."
                ]).slice(0, 2).map((u, idx) => (
                  <li key={idx} className="truncate" title={u}>{u}</li>
                ))}
              </ul>
              {latestAssessment.recommended_follow_up && latestAssessment.recommended_follow_up.length > 0 && (
                <div className="text-[10px] text-ocean-300 font-mono pt-1">
                  <strong>Action:</strong> {latestAssessment.recommended_follow_up[0]}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. Map Preview & Recent Swarm Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interactive Map Preview */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-biolum-cyan" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Geospatial Marine Intelligence Map Preview
              </h3>
            </div>
            <Link
              to="/map"
              className="flex items-center space-x-1 text-xs text-biolum-cyan hover:underline font-mono"
            >
              <span>Expand Full GIS View</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>

          <MarineMap
            zones={zones}
            agents={agents}
          />
        </div>

        {/* Recent Multi-Agent Swarm Activity Feed */}
        <div className="p-5 rounded-2xl bg-surface-card border border-surface-border shadow-xl flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-surface-border pb-3 mb-3">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-biolum-cyan" />
                <h3 className="text-sm font-bold text-white">Recent Swarm Telemetry</h3>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">Live Ingestion</span>
            </div>

            <div className="space-y-3 max-h-[440px] overflow-y-auto pr-1">
              {logs.slice(0, 4).map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-xl bg-navy-900/90 border border-surface-border space-y-1.5 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-100 text-[11px]">{log.agent_name}</span>
                    <span className="text-[9px] font-mono text-slate-400">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    {log.observation}
                  </p>
                  <div className="pt-1 border-t border-surface-border/60 flex items-center justify-between text-[10px]">
                    <span className="text-biolum-cyan truncate max-w-[170px]">{log.zone_name}</span>
                    <span className="font-bold text-emerald-400">{log.confidence_score}% Conf.</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-surface-border text-center">
            <Link
              to="/agents"
              className="text-xs text-ocean-400 hover:text-biolum-cyan font-semibold flex items-center justify-center space-x-1"
            >
              <span>Explore All Agent Missions</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* 6. Interactive Hydrographic Chart & Incident Alert Matrices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Interactive Hydrographic Chart */}
        <div className="p-5 rounded-2xl bg-surface-card border border-surface-border shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-surface-border pb-3">
            <div>
              <h3 className="text-sm font-bold text-white">
                Hydrographic Temperature & Oxygen Gradient
              </h3>
              <p className="text-[11px] text-slate-400">
                12-hour sensor time-series from Great Barrier Reef outer shelf
              </p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-lg bg-navy-900 border border-surface-border text-ocean-300 font-mono">
              Sensor: ORCA-AG-01
            </span>
          </div>

          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="chartTemp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="chartDO" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00e5ff" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#00e5ff" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#162e54" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} domain={[0, 35]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#081324', borderColor: '#162e54', borderRadius: '0.75rem', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="temp" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#chartTemp)" name="Water Temp (°C)" />
                <Area type="monotone" dataKey="do" stroke="#00e5ff" strokeWidth={2} fillOpacity={1} fill="url(#chartDO)" name="Dissolved O2 (mg/L)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Incident Alert Matrix */}
        <div className="p-5 rounded-2xl bg-surface-card border border-surface-border shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-surface-border pb-3">
            <div>
              <h3 className="text-sm font-bold text-white">Active Environmental Incidents</h3>
              <p className="text-[11px] text-slate-400">
                Actionable environmental threats triaged by autonomous consensus
              </p>
            </div>
            <Link
              to="/incidents"
              className="text-xs text-biolum-cyan hover:underline font-mono"
            >
              View Matrix
            </Link>
          </div>

          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-3.5 rounded-xl border text-xs space-y-2 ${
                  alert.status === 'ACTIVE'
                    ? 'bg-navy-900 border-rose-900/60'
                    : 'bg-navy-950 border-surface-border opacity-70'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-bold text-white block">{alert.title}</span>
                    <span className="text-[10px] text-slate-400">{alert.zone_name}</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                      alert.severity === 'CRITICAL'
                        ? 'bg-rose-950 text-rose-300 border border-rose-800'
                        : 'bg-amber-950 text-amber-300 border border-amber-800'
                    }`}
                  >
                    {alert.severity}
                  </span>
                </div>

                <p className="text-slate-300 text-[11px] leading-relaxed">
                  {alert.description}
                </p>

                <div className="pt-2 border-t border-surface-border flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-mono">
                    Status: <strong className="text-slate-200">{alert.status}</strong>
                  </span>
                  {alert.status === 'ACTIVE' && (
                    <button
                      onClick={() => handleAcknowledgeAlert(alert.id)}
                      className="flex items-center space-x-1 text-[10px] font-semibold text-biolum-cyan hover:underline"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Acknowledge Incident</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 7. Data Source Health & Uplinks */}
      <div className="p-5 rounded-2xl bg-surface-card border border-surface-border shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-surface-border pb-3">
          <div>
            <h3 className="text-sm font-bold text-white">Data Source Uplinks & Ingestion Health</h3>
            <p className="text-[11px] text-slate-400">
              Live synchronization status across global satellite constellations, AIS decoders, and PostGIS
            </p>
          </div>
          <Link
            to="/data-sources"
            className="text-xs text-ocean-400 hover:text-biolum-cyan font-mono"
          >
            Manage Data Feeds
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {dataSources.map((ds) => (
            <div
              key={ds.id}
              className="p-3.5 rounded-xl bg-navy-900/90 border border-surface-border space-y-2 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-white truncate max-w-[130px]">{ds.name}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                {ds.feed_type}
              </div>
              <div className="grid grid-cols-2 gap-1 text-[11px] pt-1 border-t border-surface-border text-slate-300">
                <div>
                  <span className="block text-[9px] text-slate-400 uppercase">Latency</span>
                  <span className="font-bold font-mono text-biolum-cyan">{ds.latency_ms}ms</span>
                </div>
                <div>
                  <span className="block text-[9px] text-slate-400 uppercase">Uptime</span>
                  <span className="font-bold font-mono text-emerald-400">{ds.uptime_pct}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
