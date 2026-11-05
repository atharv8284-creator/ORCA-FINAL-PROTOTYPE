import React from 'react';

export type DataTier = 
  | 'LIVE'
  | 'MODELLED'
  | 'PREVIEW'
  | 'CALIBRATED_PREVIEW_ANALYSIS'
  | 'METADATA_DISCOVERY'
  | 'METADATA ONLY'
  | 'FULL_RASTER_PROCESSED'
  | 'FULL_MULTISPECTRAL_RASTER'
  | 'SIMULATED'
  | 'NOT CONNECTED'
  | 'NOT_AVAILABLE'
  | string;

interface DataTierBadgeProps {
  tier: DataTier;
  className?: string;
  size?: 'sm' | 'md';
}

export const DataTierBadge: React.FC<DataTierBadgeProps> = ({ 
  tier, 
  className = '',
  size = 'sm' 
}) => {
  const norm = (tier || '').toUpperCase().trim();

  let config = {
    bg: 'bg-slate-900/80',
    border: 'border-slate-700',
    text: 'text-slate-300',
    dot: 'bg-slate-500',
    label: tier || 'UNAVAILABLE'
  };

  if (norm === 'LIVE' || norm === 'REAL' || norm === 'REAL_HARDWARE_INGESTION') {
    config = {
      bg: 'bg-emerald-950/80',
      border: 'border-emerald-700/80',
      text: 'text-emerald-400',
      dot: 'bg-emerald-400 animate-pulse',
      label: 'LIVE'
    };
  } else if (norm === 'LIVE_PROCESSED_IMAGERY' || norm === 'FULL_RASTER_PROCESSED' || norm === 'FULL_MULTISPECTRAL_RASTER') {
    config = {
      bg: 'bg-emerald-950/80',
      border: 'border-emerald-700/80',
      text: 'text-emerald-300',
      dot: 'bg-emerald-400',
      label: norm === 'LIVE_PROCESSED_IMAGERY' ? 'LIVE PROCESSED IMAGERY' : 'FULL RASTER PROCESSED'
    };
  } else if (norm === 'MODELLED' || norm.includes('MODEL')) {
    config = {
      bg: 'bg-purple-950/80',
      border: 'border-purple-700/80',
      text: 'text-purple-300',
      dot: 'bg-purple-400',
      label: 'MODELLED'
    };
  } else if (norm === 'CALIBRATED_PREVIEW_ANALYSIS' || norm === 'PREVIEW') {
    config = {
      bg: 'bg-amber-950/80',
      border: 'border-amber-700/80',
      text: 'text-amber-300',
      dot: 'bg-amber-400',
      label: 'CALIBRATED PREVIEW'
    };
  } else if (norm === 'METADATA_DISCOVERY' || norm === 'METADATA ONLY' || norm === 'METADATA') {
    config = {
      bg: 'bg-sky-950/80',
      border: 'border-sky-700/80',
      text: 'text-sky-300',
      dot: 'bg-sky-400',
      label: 'METADATA ONLY'
    };
  } else if (norm === 'SIMULATED' || norm === 'SIMULATED_BASELINE_MODEL' || norm === 'DEMO') {
    config = {
      bg: 'bg-orange-950/80',
      border: 'border-orange-700/80',
      text: 'text-orange-300',
      dot: 'bg-orange-400',
      label: 'SIMULATED'
    };
  } else if (norm === 'NOT CONNECTED' || norm === 'OFFLINE') {
    config = {
      bg: 'bg-rose-950/80',
      border: 'border-rose-800/80',
      text: 'text-rose-400',
      dot: 'bg-rose-500',
      label: 'NOT CONNECTED'
    };
  }

  const pxClass = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';
  const dotSize = size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2';

  return (
    <span className={`inline-flex items-center space-x-1.5 rounded-full font-mono font-bold border ${pxClass} ${config.bg} ${config.border} ${config.text} ${className}`}>
      <span className={`rounded-full shrink-0 ${dotSize} ${config.dot}`} />
      <span>{config.label}</span>
    </span>
  );
};
