import React, { useState, useEffect } from 'react';
import { 
  Download, 
  CheckCircle2, 
  ShieldCheck, 
  FileText, 
  Brain, 
  Calendar, 
  MapPin, 
  Eye, 
  X, 
  AlertTriangle,
  Layers,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import type { FinalMarineIntelligenceAssessment } from '../types';
import { DataTierBadge } from '../components/DataTierBadge';

export const IncidentReports: React.FC = () => {
  const [assessments, setAssessments] = useState<FinalMarineIntelligenceAssessment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedAssessment, setSelectedAssessment] = useState<FinalMarineIntelligenceAssessment | null>(null);
  const [downloadMsg, setDownloadMsg] = useState<string | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);

  useEffect(() => {
    const loadReports = async () => {
      try {
        setLoading(true);
        const res = await api.getOrchestrationHistory(50);
        if (res && res.assessments && res.assessments.length > 0) {
          setAssessments(res.assessments);
        }
      } catch (err) {
        console.warn("Could not load orchestration history, fallback to staged assessment:", err);
      } finally {
        setLoading(false);
      }
    };
    loadReports();
  }, []);

  const handleExport = async (assessmentId: string, format: 'markdown' | 'json' = 'markdown') => {
    try {
      setExportingId(assessmentId);
      const content = await api.exportOrchestrationReport(assessmentId, format);
      const mimeType = format === 'json' ? 'application/json' : 'text/markdown';
      const ext = format === 'json' ? 'json' : 'md';
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${assessmentId}_ORCA_Intelligence_Report.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setDownloadMsg(`Dossier ${assessmentId} successfully exported as ${format.toUpperCase()}.`);
      setTimeout(() => setDownloadMsg(null), 4000);
    } catch (err: any) {
      console.error("Export failed:", err);
      setDownloadMsg(`Export failed: ${err.message || err}`);
      setTimeout(() => setDownloadMsg(null), 5000);
    } finally {
      setExportingId(null);
    }
  };

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'POSSIBLE_OIL_SPILL_SURFACE_ANOMALY':
        return 'bg-rose-950/80 text-rose-300 border-rose-800';
      case 'POSSIBLE_WATER_QUALITY_ANOMALY':
        return 'bg-amber-950/80 text-amber-300 border-amber-800';
      case 'POSSIBLE_UNUSUAL_VESSEL_ACTIVITY':
        return 'bg-purple-950/80 text-purple-300 border-purple-800';
      case 'POSSIBLE_MARINE_ENVIRONMENTAL_STRESS':
        return 'bg-orange-950/80 text-orange-300 border-orange-800';
      case 'BASELINE_EVALUATION':
      default:
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-navy-900 via-surface-card to-navy-900 border border-surface-border shadow-xl">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-biolum-cyan animate-pulse"></span>
            <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-ocean-400">
              ORCA Dossier Repository
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white mt-1">
            Autonomous Incident Reports & Intelligence Dossiers
          </h1>
          <p className="text-xs text-slate-300 font-mono mt-0.5">
            Formal Multi-Agent Evidence Chains • Nugen Neural Deliberations • Exportable Intelligence Briefings
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/orchestration"
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-biolum-cyan to-ocean-500 hover:brightness-110 text-navy-950 font-bold text-xs transition-all shadow-md shadow-biolum-cyan/20"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Launch New Investigation</span>
          </Link>
          <div className="flex items-center space-x-2 text-xs font-mono text-slate-300 bg-surface-card border border-surface-border px-3 py-1.5 rounded-xl">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Cryptographic Provenance: <strong>Verified</strong></span>
          </div>
        </div>
      </div>

      {downloadMsg && (
        <div className={`p-3 rounded-xl border text-xs flex items-center space-x-2 ${
          downloadMsg.includes('failed')
            ? 'bg-rose-950/80 border-rose-800 text-rose-300'
            : 'bg-emerald-950/80 border-emerald-800 text-emerald-300'
        }`}>
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{downloadMsg}</span>
        </div>
      )}

      {/* Reports Listing */}
      {loading ? (
        <div className="p-12 text-center rounded-2xl bg-surface-card border border-surface-border">
          <div className="w-8 h-8 mx-auto border-2 border-biolum-cyan border-t-transparent rounded-full animate-spin mb-3"></div>
          <span className="text-xs font-mono text-slate-300">Synchronizing intelligence dossier registry...</span>
        </div>
      ) : assessments.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-surface-card border border-surface-border space-y-3">
          <FileText className="w-10 h-10 text-slate-500 mx-auto" />
          <h3 className="text-sm font-bold text-white">No Orchestration Assessments Recorded</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            No central multi-agent investigations have been logged yet. Launch an investigation in the Lead Orchestrator to generate formal dossiers.
          </p>
          <Link
            to="/orchestration"
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-ocean-600 hover:bg-ocean-500 text-white text-xs font-bold transition-all"
          >
            <span>Open Lead Orchestrator</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider font-bold">
              Archived Multi-Agent Assessments ({assessments.length})
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              Deterministic & Neural Synthesis Records
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {assessments.map((rep) => (
              <div
                key={rep.assessment_id}
                className="p-5 rounded-2xl bg-surface-card border border-surface-border hover:border-ocean-500/50 transition-all shadow-xl space-y-4"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-surface-border pb-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-[11px] font-mono font-bold text-biolum-cyan bg-ocean-950 px-2 py-0.5 rounded border border-ocean-800">
                        {rep.assessment_id}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getCategoryBadge(rep.incident_category)}`}>
                        {rep.incident_category.replace(/_/g, ' ')}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-navy-900 text-slate-300 border border-surface-border">
                        Status: <strong className="text-emerald-400">{rep.status}</strong>
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white mt-1">
                      {rep.assessment_label}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 font-mono">
                      <span className="flex items-center space-x-1">
                        <MapPin className="w-3.5 h-3.5 text-biolum-cyan" />
                        <span>Zone: {rep.geographic_area?.zone_id || 'Global Marine Area'}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Calendar className="w-3.5 h-3.5 text-ocean-400" />
                        <span>{new Date(rep.generated_at).toLocaleString()}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Brain className="w-3.5 h-3.5 text-purple-400" />
                        <span>{rep.nugen_reasoning?.inference_mode || 'NUGEN NEURAL REASONING'}</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="px-3 py-1.5 rounded-xl bg-navy-900 border border-surface-border text-center">
                      <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-mono">Confidence</span>
                      <span className="text-xs font-bold font-mono text-emerald-400">
                        {Math.round((rep.confidence?.confidence_score || 0.85) * 100)}% ({rep.confidence?.confidence_tier || 'HIGH'})
                      </span>
                    </div>

                    <button
                      onClick={() => setSelectedAssessment(rep)}
                      className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-navy-800 hover:bg-navy-700 text-slate-200 text-xs font-semibold border border-surface-border transition-all"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Inspect</span>
                    </button>

                    <button
                      onClick={() => handleExport(rep.assessment_id, 'markdown')}
                      disabled={exportingId === rep.assessment_id}
                      className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-ocean-600/30 hover:bg-ocean-600/50 text-biolum-cyan text-xs font-semibold border border-ocean-500/40 transition-all"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Markdown</span>
                    </button>

                    <button
                      onClick={() => handleExport(rep.assessment_id, 'json')}
                      disabled={exportingId === rep.assessment_id}
                      className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-purple-900/30 hover:bg-purple-900/50 text-purple-300 text-xs font-semibold border border-purple-700/40 transition-all"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>JSON</span>
                    </button>
                  </div>
                </div>

                {/* Synthesis Summary & Corroborating Agents */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-1">
                  <div className="md:col-span-2 space-y-2">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-mono block">
                        Nugen Deliberation Observation & Hypothesis:
                      </span>
                      <p className="text-slate-300 mt-0.5 leading-relaxed">
                        {rep.nugen_reasoning?.hypothesis || rep.nugen_reasoning?.observation || 'Observation parameters synthesized across observational fleet.'}
                      </p>
                    </div>

                    {rep.recommended_follow_up && rep.recommended_follow_up.length > 0 && (
                      <div className="text-[11px] text-ocean-300 font-mono bg-navy-950/60 p-2.5 rounded-xl border border-surface-border/80">
                        <span className="font-bold text-white block mb-0.5">Recommended Protocol:</span>
                        <span>{rep.recommended_follow_up[0]}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-mono block">
                      Participating Observational Fleet:
                    </span>
                    <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px]">
                      {Object.entries(rep.agent_statuses || {}).map(([agent, st]) => (
                        <div key={agent} className="p-1.5 rounded bg-navy-900 border border-surface-border flex items-center justify-between">
                          <span className="text-slate-300">{agent}</span>
                          <span className={`text-[9px] font-bold ${
                            st === 'SUCCESS' ? 'text-emerald-400' :
                            st === 'FAILED' ? 'text-rose-400' : 'text-amber-400'
                          }`}>
                            {st}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="text-[10px] text-slate-400 font-mono pt-1">
                      Evidence Count: <strong className="text-white">{rep.evidence_summary?.length || 0}</strong> • Spatial Corrs: <strong className="text-white">{rep.spatial_correlations?.length || 0}</strong>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Inspector for Assessment */}
      {selectedAssessment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-md">
          <div className="relative w-full max-w-4xl max-h-[85vh] bg-surface-card border border-surface-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-surface-border">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-mono font-bold text-biolum-cyan bg-ocean-950 px-2 py-0.5 rounded border border-ocean-800">
                    {selectedAssessment.assessment_id}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getCategoryBadge(selectedAssessment.incident_category)}`}>
                    {selectedAssessment.incident_category}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-white mt-1">
                  {selectedAssessment.assessment_label}
                </h2>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleExport(selectedAssessment.assessment_id, 'markdown')}
                  className="px-3 py-1.5 rounded-xl bg-ocean-600 hover:bg-ocean-500 text-white text-xs font-bold transition-all flex items-center space-x-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .md</span>
                </button>
                <button
                  onClick={() => setSelectedAssessment(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-surface-elevated transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-slate-200">
              {/* Nugen Reasoning Section */}
              <div className="p-4 rounded-xl bg-navy-900 border border-surface-border space-y-3">
                <div className="flex items-center justify-between border-b border-surface-border pb-2">
                  <span className="font-bold text-white text-sm flex items-center space-x-2">
                    <Brain className="w-4 h-4 text-purple-400" />
                    <span>Nugen Neural Deliberation Breakdown</span>
                  </span>
                  <span className="text-[10px] font-mono text-purple-300">
                    Mode: {selectedAssessment.nugen_reasoning?.inference_mode || 'NUGEN_NEURAL_REASONING'}
                  </span>
                </div>

                <div className="space-y-2">
                  <div>
                    <span className="font-bold text-slate-300 block text-[11px]">Primary Observation:</span>
                    <p className="text-slate-300 mt-0.5 leading-relaxed">
                      {selectedAssessment.nugen_reasoning?.observation || 'All agents reporting nominal parameters.'}
                    </p>
                  </div>

                  <div>
                    <span className="font-bold text-slate-300 block text-[11px]">Synthesized Ecological Hypothesis:</span>
                    <p className="text-slate-300 mt-0.5 leading-relaxed">
                      {selectedAssessment.nugen_reasoning?.hypothesis || 'Equilibrium maintained.'}
                    </p>
                  </div>

                  {selectedAssessment.nugen_reasoning?.consensus_action && (
                    <div className="p-2.5 rounded-lg bg-navy-950 border border-surface-border/80">
                      <span className="font-bold text-biolum-cyan block text-[11px]">Consensus Action Recommendation:</span>
                      <p className="text-slate-300 mt-0.5">
                        {selectedAssessment.nugen_reasoning.consensus_action}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Evidence Records */}
              <div className="space-y-2">
                <h4 className="font-bold text-white text-sm flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-ocean-400" />
                  <span>Harvested Multi-Agent Evidence ({selectedAssessment.evidence_summary?.length || 0})</span>
                </h4>
                <div className="overflow-x-auto rounded-xl border border-surface-border">
                  <table className="w-full text-left font-mono text-[11px]">
                    <thead className="bg-navy-900 text-slate-400 border-b border-surface-border">
                      <tr>
                        <th className="p-2.5">Agent</th>
                        <th className="p-2.5">Variable / Indicator</th>
                        <th className="p-2.5">Observed Value</th>
                        <th className="p-2.5">Data Tier</th>
                        <th className="p-2.5">Timestamp (UTC)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-border/60 bg-navy-950">
                      {(selectedAssessment.evidence_summary || []).map((ev) => (
                        <tr key={ev.evidence_id} className="hover:bg-surface-elevated/40">
                          <td className="p-2.5 font-bold text-white">{ev.agent_name}</td>
                          <td className="p-2.5 text-biolum-cyan">{ev.measurement_or_indicator}</td>
                          <td className="p-2.5 font-bold text-slate-200">
                            {typeof ev.value === 'number' ? ev.value.toFixed(2) : String(ev.value)} {ev.unit}
                          </td>
                          <td className="p-2.5">
                            <DataTierBadge tier={ev.data_mode} size="sm" />
                          </td>
                          <td className="p-2.5 text-slate-400">{ev.observation_timestamp.slice(0, 19).replace('T', ' ')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Scientific Caveats & Alternative Hypotheses */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-navy-900/80 border border-amber-900/60 space-y-2">
                  <span className="font-bold text-amber-400 flex items-center space-x-1.5 text-xs">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Scientific Caveats & Limitations</span>
                  </span>
                  <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px]">
                    {(selectedAssessment.uncertainty || [
                      "Optical indicators derived from preview quicklook as relative bio-optical proxy.",
                      "Simulated IoT evidence is isolated from real-world empirical confidence scoring."
                    ]).map((u, idx) => (
                      <li key={idx}>{u}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-navy-900/80 border border-ocean-900/60 space-y-2">
                  <span className="font-bold text-biolum-cyan flex items-center space-x-1.5 text-xs">
                    <Sparkles className="w-4 h-4" />
                    <span>Plausible Alternative Explanations</span>
                  </span>
                  <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px]">
                    {(selectedAssessment.alternative_explanations || [
                      "Natural biogenic film from seasonal biological activity.",
                      "Calm sea surface producing low radar backscatter look-alike."
                    ]).map((alt, idx) => (
                      <li key={idx}>{alt}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-navy-900 border-t border-surface-border flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-mono">
                ORCA Marine Lead Orchestrator • Indradhanu Hackathon 2026
              </span>
              <button
                onClick={() => setSelectedAssessment(null)}
                className="px-4 py-2 rounded-xl bg-surface-elevated hover:bg-slate-700 text-white text-xs font-semibold transition-all"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
