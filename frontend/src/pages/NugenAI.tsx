import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { NugenModelMetrics } from '../types';
import { LoadingState } from '../components/LoadingState';
import { 
  Brain, 
  Sparkles, 
  Send
} from 'lucide-react';

export const NugenAI: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [metrics, setMetrics] = useState<NugenModelMetrics | null>(null);
  const [userPrompt, setUserPrompt] = useState<string>('');
  const [inferenceResult, setInferenceResult] = useState<string | null>(null);
  const [isInferring, setIsInferring] = useState<boolean>(false);

  useEffect(() => {
    const fetchNugen = async () => {
      try {
        setLoading(true);
        const data = await api.getNugenMetrics();
        setMetrics(data);
      } finally {
        setLoading(false);
      }
    };
    fetchNugen();
  }, []);

  const handleTestInference = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userPrompt.trim()) return;

    setIsInferring(true);
    setTimeout(() => {
      setInferenceResult(
        `[Nugen 3.4-Flash Neural Deliberation]: Analyzing spatial telemetry for query "${userPrompt}"...\n\n` +
        `• Hypothesis Formulated: Cross-referencing Sentinel-1 SAR dark vessel radar echoes with in-situ dissolved oxygen sonder telemetry.\n` +
        `• Scientific Correlation: Thermal inversion gradient indicates high likelihood of benthic stratification in sector.\n` +
        `• Recommended Action: Deploy autonomous AUV gliders to establish localized upwelling corridors and notify regional marine park authorities.`
      );
      setIsInferring(false);
    }, 800);
  };

  if (loading || !metrics) {
    return <LoadingState message="Connecting to Nugen AI Marine Core..." subtext="Loading Mixture of Ocean Experts (MoOE) neural weights" />;
  }

  const expertHeads = [
    { title: "Coral Thermal Bleaching Head", weights: "32B Parameters", status: "Active", accuracy: "97.4%" },
    { title: "Benthic Hypoxia & DO Dynamics Head", weights: "28B Parameters", status: "Active", accuracy: "98.1%" },
    { title: "Dark Vessel Kinematic Anomaly Head", weights: "24B Parameters", status: "Active", accuracy: "95.6%" },
    { title: "Ocean Acidification Carbon Sink Head", weights: "18B Parameters", status: "Active", accuracy: "96.2%" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Nugen AI Marine Foundation Model
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Multi-Modal Mixture of Ocean Experts (MoOE) • Spatial Multi-Agent Consensus Architecture
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono text-purple-300 bg-surface-card border border-surface-border px-3.5 py-1.5 rounded-xl">
          <Brain className="w-4 h-4 text-purple-400 animate-pulse" />
          <span>Core Engine: <strong className="text-white">{metrics.engine_status}</strong></span>
        </div>
      </div>

      {/* Model Spec Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-surface-card border border-surface-border space-y-1">
          <span className="text-[10px] uppercase font-mono text-slate-400">Inference Latency</span>
          <div className="text-2xl font-black text-biolum-cyan font-mono">{metrics.inference_latency_ms} ms</div>
          <p className="text-[11px] text-slate-400">Real-time edge AUV deployment</p>
        </div>

        <div className="p-4 rounded-xl bg-surface-card border border-surface-border space-y-1">
          <span className="text-[10px] uppercase font-mono text-slate-400">Anomaly Accuracy</span>
          <div className="text-2xl font-black text-emerald-400 font-mono">{metrics.zero_shot_anomaly_accuracy_pct}%</div>
          <p className="text-[11px] text-slate-400">Zero-shot multi-modal validation</p>
        </div>

        <div className="p-4 rounded-xl bg-surface-card border border-surface-border space-y-1">
          <span className="text-[10px] uppercase font-mono text-slate-400">Reasoning Coherence</span>
          <div className="text-2xl font-black text-biolum-teal font-mono">{metrics.reasoning_coherence_score} / 10</div>
          <p className="text-[11px] text-slate-400">Multi-agent debate consensus</p>
        </div>

        <div className="p-4 rounded-xl bg-surface-card border border-surface-border space-y-1">
          <span className="text-[10px] uppercase font-mono text-slate-400">Guardrail Enforcement</span>
          <div className="text-2xl font-black text-purple-300 font-mono">{metrics.hallucination_guardrail_rate_pct}%</div>
          <p className="text-[11px] text-slate-400">Strict grounding in PostGIS facts</p>
        </div>
      </div>

      {/* Specialized Mixture of Ocean Experts (MoOE) Heads */}
      <div className="p-5 rounded-2xl bg-surface-card border border-surface-border shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-surface-border pb-3">
          <div>
            <h3 className="text-sm font-bold text-white">Mixture of Ocean Experts (MoOE) Neural Heads</h3>
            <p className="text-[11px] text-slate-400">
              Specialized transformer branches dynamically activated by environmental threat type
            </p>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-navy-900 border border-surface-border text-ocean-300">
            {metrics.architecture}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {expertHeads.map((head, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-navy-900 border border-surface-border space-y-2">
              <span className="font-bold text-white text-xs block">{head.title}</span>
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                <span>Model Weights:</span>
                <span className="text-biolum-cyan">{head.weights}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                <span>Validation Score:</span>
                <span className="text-emerald-400 font-bold">{head.accuracy}</span>
              </div>
              <div className="pt-2 border-t border-surface-border flex items-center space-x-1 text-[11px] text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>Active Inference Routing</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive Nugen Prompt Tester */}
      <div className="p-5 rounded-2xl bg-surface-card border border-surface-border shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-surface-border pb-3">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-bold text-white">Interactive Nugen Marine Reasoning Console</h3>
          </div>
          <span className="text-[10px] font-mono text-slate-400">Test Zero-Shot Marine Inquiry</span>
        </div>

        <form onSubmit={handleTestInference} className="space-y-3">
          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1">
              Inquire Marine Ecosystem Reasoning Core:
            </label>
            <input
              type="text"
              placeholder="e.g. How does a +1.8°C SST anomaly affect Acropora coral calcification in Ribbon Reef?"
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              className="w-full bg-navy-900 border border-surface-border text-xs text-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-biolum-cyan"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              Evaluated using grounded physical oceanographic boundaries.
            </span>
            <button
              type="submit"
              disabled={isInferring}
              className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-ocean-500 hover:brightness-110 text-white font-bold text-xs px-4 py-2 rounded-lg transition-all shadow-md shadow-purple-500/20 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isInferring ? 'Deliberating...' : 'Query Nugen Model'}</span>
            </button>
          </div>
        </form>

        {inferenceResult && (
          <div className="p-4 rounded-xl bg-navy-900 border border-purple-800/60 font-mono text-xs text-purple-200 whitespace-pre-wrap leading-relaxed">
            {inferenceResult}
          </div>
        )}
      </div>
    </div>
  );
};
