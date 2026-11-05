import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import type { 
  FinalMarineIntelligenceAssessment, 
  MultiAgentInvestigationRequest, 
  UnifiedEvidenceRecord, 
  MarineZone,
  OrchestrationAgentStatus,
  IncidentCategoryType
} from '../../types';
import { DataTierBadge } from '../DataTierBadge';
import { 
  Brain, 
  Radar, 
  Eye, 
  Waves, 
  Navigation, 
  Radio, 
  Activity, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  MapPin, 
  Download, 
  Layers, 
  ArrowRight, 
  Search, 
  Info,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Play
} from 'lucide-react';

interface Props {
  initialZoneId?: string;
  onSelectCoordinates?: (lat: number, lon: number) => void;
}

export const CentralLeadOrchestratorPanel: React.FC<Props> = ({ 
  initialZoneId = 'zone-01' 
}) => {
  const [zones, setZones] = useState<MarineZone[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string>(initialZoneId);
  const [incidentHint, setIncidentHint] = useState<string>('Possible surface anomaly');
  const [timeRangeHours, setTimeRangeHours] = useState<number>(48);
  const [enabledAgents, setEnabledAgents] = useState<{ [key: string]: boolean }>({
    SAR: true,
    OPTICAL: true,
    OCEANOGRAPHIC: true,
    AIS: true,
    IOT: true
  });
  
  const [isInvestigating, setIsInvestigating] = useState<boolean>(false);
  const [assessment, setAssessment] = useState<FinalMarineIntelligenceAssessment | null>(null);
  const [activeTab, setActiveTab] = useState<'evidence' | 'correlations' | 'reasoning' | 'uncertainty'>('reasoning');
  const [selectedEvidence, setSelectedEvidence] = useState<UnifiedEvidenceRecord | null>(null);
  const [historyList, setHistoryList] = useState<FinalMarineIntelligenceAssessment[]>([]);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [exporting, setExporting] = useState<boolean>(false);

  // Load initial data and latest assessment
  useEffect(() => {
    const init = async () => {
      try {
        const [zList, histRes] = await Promise.all([
          api.getZones().catch(() => []),
          api.getOrchestrationHistory(10).catch(() => ({ total_assessments: 0, assessments: [] }))
        ]);
        setZones(zList);
        if (histRes && histRes.assessments && histRes.assessments.length > 0) {
          setAssessment(histRes.assessments[0]);
          setHistoryList(histRes.assessments);
        }
      } catch (e) {
        console.error('Failed to load initial orchestration data:', e);
      }
    };
    init();
  }, []);

  const handleLaunchInvestigation = async () => {
    try {
      setIsInvestigating(true);
      const activeAgentList = Object.keys(enabledAgents).filter(k => enabledAgents[k]);
      const req: MultiAgentInvestigationRequest = {
        zone_id: selectedZoneId,
        incident_hint: incidentHint,
        time_range_hours: timeRangeHours,
        enabled_agents: activeAgentList,
        correlation_radius_km: 30.0,
        temporal_window_hours: 24.0
      };

      const result = await api.startInvestigation(req);
      setAssessment(result);
      setHistoryList(prev => [result, ...prev.filter(a => a.assessment_id !== result.assessment_id)]);
    } catch (e) {
      console.error('Investigation error:', e);
    } finally {
      setIsInvestigating(false);
    }
  };

  const handleExportReport = async (format: 'markdown' | 'json' = 'markdown') => {
    if (!assessment) return;
    try {
      setExporting(true);
      const content = await api.exportOrchestrationReport(assessment.assessment_id, format);
      const blob = new Blob([content], { type: format === 'markdown' ? 'text/markdown' : 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ORCA-REPORT-${assessment.assessment_id}.${format === 'markdown' ? 'md' : 'json'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export error:', e);
    } finally {
      setExporting(false);
    }
  };

  const toggleAgent = (key: string) => {
    setEnabledAgents(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getAgentBadgeColor = (status?: OrchestrationAgentStatus) => {
    switch (status) {
      case 'SUCCESS': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
      case 'PARTIAL': return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'FAILED': return 'bg-rose-500/20 text-rose-400 border-rose-500/40';
      case 'NOT_CONNECTED': return 'bg-slate-800 text-slate-400 border-slate-700';
      case 'SKIPPED': return 'bg-navy-950 text-slate-500 border-surface-border';
      default: return 'bg-ocean-500/20 text-ocean-300 border-ocean-500/30';
    }
  };

  const getCategoryColor = (cat?: IncidentCategoryType) => {
    switch (cat) {
      case 'POSSIBLE_OIL_SPILL_SURFACE_ANOMALY': return 'text-amber-400 bg-amber-950/60 border-amber-500/50';
      case 'POSSIBLE_WATER_QUALITY_ANOMALY': return 'text-biolum-cyan bg-cyan-950/60 border-cyan-500/50';
      case 'POSSIBLE_UNUSUAL_VESSEL_ACTIVITY': return 'text-indigo-400 bg-indigo-950/60 border-indigo-500/50';
      case 'POSSIBLE_MARINE_ENVIRONMENTAL_STRESS': return 'text-rose-400 bg-rose-950/60 border-rose-500/50';
      default: return 'text-emerald-400 bg-emerald-950/60 border-emerald-500/50';
    }
  };

  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-surface-card border border-surface-border shadow-2xl space-y-6">
      {/* ------------------------------------------------------------------- */}
      {/* 1. Orchestrator Header & Quick Actions                              */}
      {/* ------------------------------------------------------------------- */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-surface-border pb-5">
        <div>
          <div className="flex items-center space-x-2 text-biolum-cyan text-xs font-mono font-bold tracking-widest uppercase mb-1">
            <Brain className="w-4 h-4 animate-pulse text-biolum-cyan" />
            <span>Phase 6 • Central Multi-Agent Lead Orchestration</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-3">
            <span>ORCA Marine Swarm Lead Orchestrator</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-bold bg-ocean-500/20 text-ocean-300 border border-ocean-500/30">
              NUGEN-ALIGNED CORE
            </span>
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Cross-modal intelligence synthesizing SAR Radar, Optical MSI, Mercator Oceanography, AIS Kinematics & In-Situ IoT.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {assessment && (
            <button
              onClick={() => handleExportReport('markdown')}
              disabled={exporting}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-navy-950 border border-surface-border text-xs text-slate-300 hover:text-white font-mono hover:border-slate-500 transition-all"
              title="Download verified intelligence report as Markdown"
            >
              <Download className={`w-3.5 h-3.5 ${exporting ? 'animate-bounce text-biolum-cyan' : ''}`} />
              <span>{exporting ? 'Exporting...' : 'Export Report'}</span>
            </button>
          )}

          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-navy-950 border border-surface-border text-xs text-slate-300 hover:text-white font-mono transition-all"
          >
            <Clock className="w-3.5 h-3.5 text-biolum-teal" />
            <span>History ({historyList.length})</span>
            {showHistory ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* 2. Interactive Multi-Agent Flow Visualization                       */}
      {/* ------------------------------------------------------------------- */}
      <div className="p-4 sm:p-5 rounded-2xl bg-navy-950 border border-surface-border space-y-4">
        <div className="flex items-center justify-between text-xs font-mono border-b border-surface-border/60 pb-2">
          <span className="text-slate-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-ocean-400" />
            <span>Multi-Agent Swarm Orchestration Dataflow</span>
          </span>
          <span className="text-slate-500">Autonomous Evidence Harmonization</span>
        </div>

        {/* Dynamic Nodes Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs font-mono">
          {/* Agent 1: SAR */}
          <div className="p-3 rounded-xl bg-navy-900 border border-surface-border space-y-1.5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-ocean-300 font-bold">
                <Radar className="w-4 h-4 text-biolum-cyan" />
                <span>SAR Agent</span>
              </div>
            </div>
            <div className="text-[10px] text-slate-400">Sentinel-1 C-Band Backscatter</div>
            <div className="pt-1 border-t border-surface-border/40 flex items-center justify-between">
              <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${getAgentBadgeColor(assessment?.agent_statuses?.SAR)}`}>
                {assessment?.agent_statuses?.SAR || 'READY'}
              </span>
              <span className="text-[9px] text-slate-500">{assessment?.agent_execution_times_ms?.SAR ? `${assessment.agent_execution_times_ms.SAR}ms` : ''}</span>
            </div>
          </div>

          {/* Agent 2: Optical */}
          <div className="p-3 rounded-xl bg-navy-900 border border-surface-border space-y-1.5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-ocean-300 font-bold">
                <Eye className="w-4 h-4 text-emerald-400" />
                <span>Optical Agent</span>
              </div>
            </div>
            <div className="text-[10px] text-slate-400">Sentinel-2 Multispectral NDCI</div>
            <div className="pt-1 border-t border-surface-border/40 flex items-center justify-between">
              <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${getAgentBadgeColor(assessment?.agent_statuses?.OPTICAL)}`}>
                {assessment?.agent_statuses?.OPTICAL || 'READY'}
              </span>
              <span className="text-[9px] text-slate-500">{assessment?.agent_execution_times_ms?.OPTICAL ? `${assessment.agent_execution_times_ms.OPTICAL}ms` : ''}</span>
            </div>
          </div>

          {/* Agent 3: Oceanography */}
          <div className="p-3 rounded-xl bg-navy-900 border border-surface-border space-y-1.5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-ocean-300 font-bold">
                <Waves className="w-4 h-4 text-biolum-teal" />
                <span>Ocean Agent</span>
              </div>
            </div>
            <div className="text-[10px] text-slate-400">Copernicus Marine Currents & SST</div>
            <div className="pt-1 border-t border-surface-border/40 flex items-center justify-between">
              <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${getAgentBadgeColor(assessment?.agent_statuses?.OCEANOGRAPHIC)}`}>
                {assessment?.agent_statuses?.OCEANOGRAPHIC || 'READY'}
              </span>
              <span className="text-[9px] text-slate-500">{assessment?.agent_execution_times_ms?.OCEANOGRAPHIC ? `${assessment.agent_execution_times_ms.OCEANOGRAPHIC}ms` : ''}</span>
            </div>
          </div>

          {/* Agent 4: AIS */}
          <div className="p-3 rounded-xl bg-navy-900 border border-surface-border space-y-1.5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-ocean-300 font-bold">
                <Navigation className="w-4 h-4 text-indigo-400" />
                <span>AIS Agent</span>
              </div>
            </div>
            <div className="text-[10px] text-slate-400">VHF Transponders & Kinematics</div>
            <div className="pt-1 border-t border-surface-border/40 flex items-center justify-between">
              <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${getAgentBadgeColor(assessment?.agent_statuses?.AIS)}`}>
                {assessment?.agent_statuses?.AIS || 'READY'}
              </span>
              <span className="text-[9px] text-slate-500">{assessment?.agent_execution_times_ms?.AIS ? `${assessment.agent_execution_times_ms.AIS}ms` : ''}</span>
            </div>
          </div>

          {/* Agent 5: IoT */}
          <div className="p-3 rounded-xl bg-navy-900 border border-surface-border space-y-1.5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-ocean-300 font-bold">
                <Radio className="w-4 h-4 text-amber-400" />
                <span>IoT Agent</span>
              </div>
            </div>
            <div className="text-[10px] text-slate-400">Virtual ESP32 Marine Buoy</div>
            <div className="pt-1 border-t border-surface-border/40 flex items-center justify-between">
              <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${getAgentBadgeColor(assessment?.agent_statuses?.IOT)}`}>
                {assessment?.agent_statuses?.IOT || 'READY'}
              </span>
              <span className="text-[9px] text-slate-500">{assessment?.agent_execution_times_ms?.IOT ? `${assessment.agent_execution_times_ms.IOT}ms` : ''}</span>
            </div>
          </div>

          {/* Core Synthesis Hub: Nugen */}
          <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-950/80 to-navy-900 border border-biolum-cyan/50 space-y-1.5 flex flex-col justify-between shadow-lg shadow-cyan-950/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-biolum-cyan font-bold">
                <Brain className="w-4 h-4 animate-pulse" />
                <span>Nugen Engine</span>
              </div>
            </div>
            <div className="text-[10px] text-slate-300 font-sans">Neural Consensus Synthesizer</div>
            <div className="pt-1 border-t border-biolum-cyan/30 flex items-center justify-between">
              <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-biolum-cyan/20 text-biolum-cyan border border-biolum-cyan/40">
                {assessment?.nugen_reasoning?.inference_mode ? 'ACTIVE' : 'READY'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* 3. Investigation Controls Form                                      */}
      {/* ------------------------------------------------------------------- */}
      <div className="p-4 sm:p-5 rounded-2xl bg-navy-950/80 border border-surface-border space-y-4">
        <div className="flex items-center space-x-2 text-xs font-mono font-bold text-slate-300">
          <Search className="w-4 h-4 text-biolum-cyan" />
          <span>MULTI-AGENT INVESTIGATION CONTROLS:</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs font-mono">
          {/* Target Zone */}
          <div className="space-y-1">
            <label className="text-slate-400 block text-[11px]">Target Marine Biome:</label>
            <select
              value={selectedZoneId}
              onChange={(e) => setSelectedZoneId(e.target.value)}
              disabled={isInvestigating}
              className="w-full bg-navy-900 border border-surface-border text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-biolum-cyan"
            >
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>
          </div>

          {/* Incident Hint / Scenario Focus */}
          <div className="space-y-1">
            <label className="text-slate-400 block text-[11px]">Investigation Focus / Hint:</label>
            <input
              type="text"
              value={incidentHint}
              onChange={(e) => setIncidentHint(e.target.value)}
              disabled={isInvestigating}
              placeholder="e.g. Surface oil slick, algal bloom..."
              className="w-full bg-navy-900 border border-surface-border text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-biolum-cyan"
            />
          </div>

          {/* Time Window */}
          <div className="space-y-1">
            <label className="text-slate-400 block text-[11px]">Observation Window:</label>
            <select
              value={timeRangeHours}
              onChange={(e) => setTimeRangeHours(Number(e.target.value))}
              disabled={isInvestigating}
              className="w-full bg-navy-900 border border-surface-border text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-biolum-cyan"
            >
              <option value={12}>Past 12 Hours</option>
              <option value={24}>Past 24 Hours</option>
              <option value={48}>Past 48 Hours</option>
              <option value={72}>Past 72 Hours</option>
            </select>
          </div>

          {/* Launch Button */}
          <div className="flex items-end">
            <button
              onClick={handleLaunchInvestigation}
              disabled={isInvestigating}
              className={`w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-xl font-mono font-bold text-xs transition-all shadow-lg ${
                isInvestigating
                  ? 'bg-ocean-800 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-biolum-cyan to-biolum-teal text-navy-950 hover:brightness-110 shadow-cyan-950/50'
              }`}
            >
              {isInvestigating ? (
                <>
                  <Activity className="w-4 h-4 animate-spin" />
                  <span>Deliberating...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Launch Swarm Investigation</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Enabled Sub-Agents Toggle Strip */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-surface-border/60 text-xs font-mono">
          <span className="text-[11px] text-slate-400 mr-1">Engaged Sub-Agents:</span>
          {Object.keys(enabledAgents).map((key) => (
            <button
              key={key}
              onClick={() => toggleAgent(key)}
              disabled={isInvestigating}
              className={`px-2.5 py-1 rounded-lg border transition-all text-[11px] ${
                enabledAgents[key]
                  ? 'bg-ocean-500/20 text-ocean-300 border-ocean-500/40 font-bold'
                  : 'bg-navy-950 text-slate-500 border-surface-border line-through'
              }`}
            >
              {key} Agent
            </button>
          ))}
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* 4. Synthesized Assessment Display Banner                            */}
      {/* ------------------------------------------------------------------- */}
      {assessment ? (
        <div className="space-y-5">
          {/* Top Classification Card */}
          <div className="p-5 rounded-2xl bg-surface-card border border-surface-border shadow-xl space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-surface-border pb-3">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-xs px-3 py-1 rounded-full font-mono font-bold border ${getCategoryColor(assessment.incident_category)}`}>
                    {assessment.incident_category}
                  </span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-semibold bg-navy-950 border border-surface-border text-slate-300">
                    ID: {assessment.assessment_id}
                  </span>
                  <DataTierBadge tier={assessment.confidence.confidence_tier === 'DEMONSTRATION_ONLY' ? 'SIMULATED' : 'LIVE'} />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white mt-1">
                  {assessment.assessment_label}
                </h3>
              </div>

              {/* Quality & Confidence Meters */}
              <div className="flex items-center space-x-3 text-xs font-mono">
                <div className="p-2.5 rounded-xl bg-navy-950 border border-surface-border text-center">
                  <span className="text-[10px] text-slate-400 block uppercase">Quality Score</span>
                  <span className="text-base font-bold text-biolum-cyan">
                    {(assessment.data_quality.overall_quality_score * 100).toFixed(0)}%
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-navy-950 border border-surface-border text-center">
                  <span className="text-[10px] text-slate-400 block uppercase">Confidence</span>
                  <span className={`text-base font-bold ${
                    assessment.confidence.confidence_tier === 'HIGH' ? 'text-emerald-400' :
                    assessment.confidence.confidence_tier === 'MODERATE' ? 'text-amber-300' : 'text-slate-300'
                  }`}>
                    {(assessment.confidence.confidence_score * 100).toFixed(0)}% ({assessment.confidence.confidence_tier})
                  </span>
                </div>
              </div>
            </div>

            {/* Assessment Geographic & Observation Context */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono text-slate-400">
              <div className="flex items-center space-x-2">
                <MapPin className="w-3.5 h-3.5 text-biolum-teal" />
                <span>Zone: <strong className="text-slate-200">{assessment.geographic_area.zone_name}</strong></span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>Generated: <strong className="text-slate-200">{new Date(assessment.generated_at).toLocaleTimeString()} UTC</strong></span>
              </div>
              <div className="flex items-center space-x-2">
                <Layers className="w-3.5 h-3.5 text-ocean-400" />
                <span>Corroboration: <strong className="text-emerald-400">{assessment.confidence.corroboration_level}</strong></span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs for In-Depth Synthesis */}
          <div className="flex flex-wrap items-center gap-2 border-b border-surface-border pb-2 text-xs font-mono">
            <button
              onClick={() => setActiveTab('reasoning')}
              className={`px-3.5 py-1.5 rounded-xl border transition-all ${
                activeTab === 'reasoning'
                  ? 'bg-biolum-cyan/20 text-biolum-cyan border-biolum-cyan/50 font-bold'
                  : 'bg-navy-950 text-slate-400 border-surface-border hover:text-white'
              }`}
            >
              Nugen Neural Deliberation
            </button>

            <button
              onClick={() => setActiveTab('evidence')}
              className={`px-3.5 py-1.5 rounded-xl border transition-all ${
                activeTab === 'evidence'
                  ? 'bg-ocean-500/20 text-ocean-300 border-ocean-500/50 font-bold'
                  : 'bg-navy-950 text-slate-400 border-surface-border hover:text-white'
              }`}
            >
              Harmonized Evidence ({assessment.evidence_summary.length})
            </button>

            <button
              onClick={() => setActiveTab('correlations')}
              className={`px-3.5 py-1.5 rounded-xl border transition-all ${
                activeTab === 'correlations'
                  ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50 font-bold'
                  : 'bg-navy-950 text-slate-400 border-surface-border hover:text-white'
              }`}
            >
              Spatial & Temporal Correlations ({assessment.spatial_correlations.length + assessment.temporal_correlations.length})
            </button>

            <button
              onClick={() => setActiveTab('uncertainty')}
              className={`px-3.5 py-1.5 rounded-xl border transition-all ${
                activeTab === 'uncertainty'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold'
                  : 'bg-navy-950 text-slate-400 border-surface-border hover:text-white'
              }`}
            >
              Caveats & Alternatives ({assessment.uncertainty.length + assessment.alternative_explanations.length})
            </button>
          </div>

          {/* --------------------------------------------------------------- */}
          {/* TAB 1: NUGEN REASONING                                          */}
          {/* --------------------------------------------------------------- */}
          {activeTab === 'reasoning' && (
            <div className="p-5 rounded-2xl bg-surface-card border border-surface-border shadow-xl space-y-4 animate-in fade-in-50 duration-200">
              <div className="flex items-center justify-between border-b border-surface-border pb-3">
                <div className="flex items-center space-x-2">
                  <Brain className="w-4 h-4 text-biolum-cyan" />
                  <h4 className="text-sm font-bold text-white font-mono uppercase">
                    Nugen Neural Inference & Deliberative Logic
                  </h4>
                </div>
                <span className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded border ${
                  assessment.nugen_reasoning?.inference_mode === 'NUGEN_NEURAL_REASONING'
                    ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-400'
                    : 'bg-amber-950/80 border-amber-500/50 text-amber-300'
                }`}>
                  {assessment.nugen_reasoning?.inference_mode || 'NUGEN_NEURAL_REASONING'}
                </span>
              </div>

              {/* Observation & Hypothesis */}
              <div className="space-y-3 text-xs leading-relaxed">
                <div className="p-4 rounded-xl bg-navy-950 border border-surface-border space-y-1">
                  <span className="text-[10px] uppercase font-mono font-bold text-biolum-cyan block">
                    1. Neural Observation Synthesis
                  </span>
                  <p className="text-slate-200">
                    {assessment.nugen_reasoning?.observation || 'Synthesized multimodal observations across operational sensors.'}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-navy-950 border border-surface-border space-y-1">
                  <span className="text-[10px] uppercase font-mono font-bold text-amber-400 block">
                    2. Scientific Hypothesis Formulation
                  </span>
                  <p className="text-slate-200">
                    {assessment.nugen_reasoning?.hypothesis || 'Scientific evaluation of physical indicators against ecological baseline.'}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-navy-950 border border-surface-border space-y-1">
                  <span className="text-[10px] uppercase font-mono font-bold text-emerald-400 block">
                    3. Swarm Consensus & Operational Recommendation
                  </span>
                  <p className="text-slate-200 font-semibold">
                    {assessment.nugen_reasoning?.consensus_action || 'Continue standard multi-agent monitoring.'}
                  </p>
                </div>
              </div>

              {/* Actionable Follow-up List */}
              <div className="pt-2 space-y-2">
                <span className="text-xs font-mono font-bold text-slate-300 block">
                  Recommended Operational Next Steps:
                </span>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {assessment.recommended_follow_up.map((rec, idx) => (
                    <li key={idx} className="flex items-start space-x-2">
                      <ArrowRight className="w-3.5 h-3.5 text-biolum-teal shrink-0 mt-0.5" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* TAB 2: HARMONIZED EVIDENCE EXPLORER                             */}
          {/* --------------------------------------------------------------- */}
          {activeTab === 'evidence' && (
            <div className="space-y-4 animate-in fade-in-50 duration-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {assessment.evidence_summary.map((ev) => (
                  <div
                    key={ev.evidence_id}
                    onClick={() => setSelectedEvidence(ev)}
                    className="p-4 rounded-xl bg-surface-card border border-surface-border hover:border-biolum-cyan/50 cursor-pointer transition-all space-y-2.5 shadow-md flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 border-b border-surface-border pb-2">
                        <div>
                          <span className="text-[10px] font-mono text-ocean-400 font-bold block">{ev.evidence_id}</span>
                          <h5 className="text-xs font-bold text-white mt-0.5">{ev.measurement_or_indicator}</h5>
                          <span className="text-[10px] text-slate-400 font-mono">{ev.agent_name} • {ev.source_name}</span>
                        </div>
                        <DataTierBadge tier={ev.data_mode} />
                      </div>

                      <div className="pt-2 flex items-baseline justify-between font-mono">
                        <span className="text-lg font-black text-white">
                          {typeof ev.value === 'object' ? JSON.stringify(ev.value).slice(0, 30) + '...' : String(ev.value)}
                        </span>
                        <span className="text-xs text-slate-400">{ev.unit}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-surface-border/60 flex items-center justify-between text-[10px] font-mono text-slate-400">
                      <span>Conf: <strong className="text-emerald-400">{(ev.confidence * 100).toFixed(0)}%</strong></span>
                      <span>Quality: <strong className="text-biolum-cyan">{ev.quality_status}</strong></span>
                      <span className="text-ocean-400 hover:underline">Inspect Details →</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Selected Evidence Detail Modal / Card */}
              {selectedEvidence && (
                <div className="p-5 rounded-2xl bg-navy-950 border border-ocean-500/40 shadow-2xl space-y-3">
                  <div className="flex items-center justify-between border-b border-surface-border pb-2.5">
                    <div className="flex items-center space-x-2">
                      <Info className="w-4 h-4 text-biolum-cyan" />
                      <h4 className="text-xs font-bold text-white font-mono uppercase">
                        Evidence Provenance & Limitations: {selectedEvidence.evidence_id}
                      </h4>
                    </div>
                    <button
                      onClick={() => setSelectedEvidence(null)}
                      className="text-slate-400 hover:text-white font-mono text-xs"
                    >
                      ✕ Close
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                    <div className="p-3 rounded-lg bg-navy-900 border border-surface-border">
                      <span className="text-[10px] text-slate-400 uppercase block">Processing Method</span>
                      <span className="text-white font-bold">{selectedEvidence.processing_method}</span>
                    </div>
                    <div className="p-3 rounded-lg bg-navy-900 border border-surface-border">
                      <span className="text-[10px] text-slate-400 uppercase block">Source Identifier</span>
                      <span className="text-white font-bold">{selectedEvidence.source_identifier}</span>
                    </div>
                    <div className="p-3 rounded-lg bg-navy-900 border border-surface-border">
                      <span className="text-[10px] text-slate-400 uppercase block">Observation Timestamp</span>
                      <span className="text-white font-bold">{new Date(selectedEvidence.observation_timestamp).toLocaleString()} UTC</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-navy-900/60 border border-surface-border space-y-1 text-xs">
                    <span className="font-bold text-amber-300 font-mono block">Known Scientific Limitations:</span>
                    <ul className="list-disc list-inside space-y-1 text-slate-300">
                      {selectedEvidence.limitations.map((lim, idx) => (
                        <li key={idx}>{lim}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* TAB 3: SPATIAL & TEMPORAL CORRELATIONS                          */}
          {/* --------------------------------------------------------------- */}
          {activeTab === 'correlations' && (
            <div className="space-y-4 animate-in fade-in-50 duration-200">
              {/* Spatial Correlations */}
              <div className="p-5 rounded-2xl bg-surface-card border border-surface-border shadow-xl space-y-3">
                <div className="flex items-center space-x-2 border-b border-surface-border pb-2.5">
                  <MapPin className="w-4 h-4 text-biolum-cyan" />
                  <h4 className="text-xs font-bold text-white font-mono uppercase">
                    Cross-Agent Geospatial Proximity Correlations ({assessment.spatial_correlations.length})
                  </h4>
                </div>

                {assessment.spatial_correlations.length > 0 ? (
                  <div className="space-y-2">
                    {assessment.spatial_correlations.map((sc) => (
                      <div key={sc.correlation_id} className="p-3 rounded-xl bg-navy-950 border border-surface-border text-xs font-mono space-y-1">
                        <div className="flex items-center justify-between text-slate-200">
                          <span className="font-bold text-biolum-cyan">{sc.agent_a} ↔ {sc.agent_b}</span>
                          <span className="text-amber-300 font-bold">{sc.distance_km.toFixed(2)} km separation</span>
                        </div>
                        <p className="text-slate-400 text-[11px] font-sans">{sc.proximity_summary}</p>
                        <div className="text-[10px] text-slate-500 italic pt-1">{sc.causation_disclaimer}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 text-xs text-slate-500 font-mono">No cross-agent observations within correlation radius.</div>
                )}
              </div>

              {/* Temporal Correlations */}
              <div className="p-5 rounded-2xl bg-surface-card border border-surface-border shadow-xl space-y-3">
                <div className="flex items-center space-x-2 border-b border-surface-border pb-2.5">
                  <Clock className="w-4 h-4 text-biolum-teal" />
                  <h4 className="text-xs font-bold text-white font-mono uppercase">
                    Temporal Synchronization & Passive Drift Plausibility ({assessment.temporal_correlations.length})
                  </h4>
                </div>

                {assessment.temporal_correlations.length > 0 ? (
                  <div className="space-y-2">
                    {assessment.temporal_correlations.map((tc) => (
                      <div key={tc.correlation_id} className="p-3 rounded-xl bg-navy-950 border border-surface-border text-xs font-mono space-y-1">
                        <div className="flex items-center justify-between text-slate-200">
                          <span className="font-bold text-ocean-300">{tc.agent_a} ↔ {tc.agent_b}</span>
                          <span className="text-biolum-teal font-bold">Δt = {tc.time_difference_hours.toFixed(1)} hrs ({tc.temporal_compatibility})</span>
                        </div>
                        {tc.drift_analysis && (
                          <div className="p-2 rounded bg-navy-900 border border-surface-border/60 text-[11px] text-slate-300 space-y-0.5">
                            <span className="font-bold text-amber-300 block">Hydrodynamic Drift Plausibility:</span>
                            <p>{tc.drift_analysis.hydrodynamic_plausibility_note}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 text-xs text-slate-500 font-mono">No temporal correlations recorded within 24-hour window.</div>
                )}
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* TAB 4: UNCERTAINTIES & ALTERNATIVE EXPLANATIONS                 */}
          {/* --------------------------------------------------------------- */}
          {activeTab === 'uncertainty' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in-50 duration-200">
              {/* Scientific Caveats */}
              <div className="p-5 rounded-2xl bg-surface-card border border-surface-border shadow-xl space-y-3">
                <div className="flex items-center space-x-2 border-b border-surface-border pb-2.5">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  <h4 className="text-xs font-bold text-white font-mono uppercase">
                    Transparent Scientific Caveats & Penalties
                  </h4>
                </div>
                <ul className="space-y-2 text-xs text-slate-300 leading-relaxed font-sans">
                  {assessment.uncertainty.map((u, idx) => (
                    <li key={idx} className="p-2.5 rounded-lg bg-navy-950 border border-amber-500/20 flex items-start space-x-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span>{u}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Plausible Alternative Explanations */}
              <div className="p-5 rounded-2xl bg-surface-card border border-surface-border shadow-xl space-y-3">
                <div className="flex items-center space-x-2 border-b border-surface-border pb-2.5">
                  <HelpCircle className="w-4 h-4 text-biolum-cyan" />
                  <h4 className="text-xs font-bold text-white font-mono uppercase">
                    Plausible Non-Polluting Alternative Explanations
                  </h4>
                </div>
                <ul className="space-y-2 text-xs text-slate-300 leading-relaxed font-sans">
                  {assessment.alternative_explanations.map((alt, idx) => (
                    <li key={idx} className="p-2.5 rounded-lg bg-navy-950 border border-surface-border flex items-start space-x-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-biolum-teal shrink-0 mt-0.5" />
                      <span>{alt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-8 rounded-2xl bg-navy-950/60 border border-surface-border text-center text-xs text-slate-400 font-mono">
          Select a marine zone and click "Launch Swarm Investigation" to initiate a multi-agent orchestration cycle.
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* 5. Investigation History Drawer                                     */}
      {/* ------------------------------------------------------------------- */}
      {showHistory && (
        <div className="p-5 rounded-2xl bg-navy-950 border border-surface-border space-y-3 animate-in fade-in-50 duration-200">
          <div className="flex items-center justify-between border-b border-surface-border pb-2">
            <span className="text-xs font-bold font-mono text-white uppercase">Historical Multi-Agent Syntheses</span>
            <span className="text-[10px] text-slate-500 font-mono">Persisted assessments</span>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {historyList.map((h) => (
              <div
                key={h.assessment_id}
                onClick={() => setAssessment(h)}
                className={`p-3 rounded-xl border text-xs font-mono cursor-pointer transition-all flex items-center justify-between ${
                  assessment?.assessment_id === h.assessment_id
                    ? 'bg-ocean-500/20 border-ocean-500 text-white'
                    : 'bg-navy-900 border-surface-border text-slate-400 hover:text-white'
                }`}
              >
                <div>
                  <span className="font-bold text-white block">{h.assessment_label}</span>
                  <span className="text-[10px] text-slate-400">{h.geographic_area.zone_name} • {new Date(h.generated_at).toLocaleString()}</span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${getCategoryColor(h.incident_category)}`}>
                  {h.incident_category}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
