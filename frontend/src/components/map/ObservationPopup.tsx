import React from 'react';
import { ExternalLink, Clock, Database, MapPin } from 'lucide-react';

export interface PopupField {
  label: string;
  value: string | number;
  unit?: string;
  highlight?: 'cyan' | 'emerald' | 'amber' | 'rose' | 'slate';
}

interface ObservationPopupProps {
  category: 'SATELLITE' | 'VESSEL' | 'OCEANOGRAPHIC' | 'BUOY' | 'INCIDENT';
  title: string;
  subtitle?: string;
  badgeText?: string;
  badgeColor?: 'cyan' | 'emerald' | 'amber' | 'rose' | 'purple';
  coordinates: [number, number];
  fields: PopupField[];
  source: string;
  timestamp?: string;
  onInspect?: () => void;
}

export const ObservationPopup: React.FC<ObservationPopupProps> = ({
  category,
  title,
  subtitle,
  badgeText,
  badgeColor = 'cyan',
  coordinates,
  fields,
  source,
  timestamp,
  onInspect,
}) => {
  const badgeClasses = {
    cyan: 'bg-cyan-950/80 text-cyan-300 border-cyan-800/80',
    emerald: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80',
    amber: 'bg-amber-950/80 text-amber-300 border-amber-800/80',
    rose: 'bg-rose-950/80 text-rose-300 border-rose-800/80',
    purple: 'bg-purple-950/80 text-purple-300 border-purple-800/80',
  }[badgeColor];

  const highlightClasses = {
    cyan: 'text-biolum-cyan font-bold',
    emerald: 'text-emerald-400 font-bold',
    amber: 'text-amber-400 font-bold',
    rose: 'text-rose-400 font-bold',
    slate: 'text-slate-300 font-normal',
  };

  const categoryLabels = {
    SATELLITE: 'Satellite Swath Observation',
    VESSEL: 'AIS Automated Vessel Tracking',
    OCEANOGRAPHIC: 'In-Situ Oceanographic Station',
    BUOY: 'IoT Marine Mooring Buoy',
    INCIDENT: 'Environmental Anomaly Alert',
  }[category];

  return (
    <div className="p-1 min-w-[260px] max-w-[320px] text-xs font-sans select-text">
      {/* Category header */}
      <div className="flex items-center justify-between gap-1 pb-1.5 border-b border-ocean-900/80">
        <span className="text-[9px] font-mono uppercase tracking-wider text-ocean-400 font-semibold">
          {categoryLabels}
        </span>
        {badgeText && (
          <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase border ${badgeClasses}`}>
            {badgeText}
          </span>
        )}
      </div>

      {/* Main title & subtitle */}
      <div className="mt-2 mb-2.5">
        <h4 className="font-bold text-white text-sm leading-snug tracking-tight">
          {title}
        </h4>
        {subtitle && (
          <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed font-sans">
            {subtitle}
          </p>
        )}
        <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 font-mono mt-1">
          <MapPin className="w-3 h-3 text-biolum-cyan shrink-0" />
          <span>
            {coordinates[0] >= 0 ? `${coordinates[0].toFixed(4)}°N` : `${Math.abs(coordinates[0]).toFixed(4)}°S`},{' '}
            {coordinates[1] >= 0 ? `${coordinates[1].toFixed(4)}°E` : `${Math.abs(coordinates[1]).toFixed(4)}°W`}
          </span>
        </div>
      </div>

      {/* Data metric grid */}
      <div className="grid grid-cols-2 gap-2 p-2 rounded-xl bg-surface-elevated/70 border border-ocean-900/60 my-2">
        {fields.map((field, idx) => (
          <div key={idx} className="space-y-0.5">
            <span className="block text-[9px] font-mono text-slate-400 uppercase tracking-wide">
              {field.label}
            </span>
            <span className={`text-[11px] font-mono block ${highlightClasses[field.highlight || 'slate']}`}>
              {field.value} {field.unit && <span className="text-[10px] text-slate-400 font-normal">{field.unit}</span>}
            </span>
          </div>
        ))}
      </div>

      {/* Footer: Source, Timestamp & Inspect CTA */}
      <div className="pt-2 border-t border-ocean-900/80 flex items-center justify-between text-[10px] text-slate-400">
        <div className="space-y-0.5">
          <div className="flex items-center space-x-1">
            <Database className="w-2.5 h-2.5 text-biolum-cyan" />
            <span className="truncate max-w-[130px]">{source}</span>
          </div>
          {timestamp && (
            <div className="flex items-center space-x-1 text-slate-400 font-mono">
              <Clock className="w-2.5 h-2.5 text-slate-400" />
              <span>{new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} UTC</span>
            </div>
          )}
        </div>

        {onInspect && (
          <button
            type="button"
            onClick={onInspect}
            className="flex items-center space-x-1 px-2 py-1 rounded-lg bg-ocean-600/30 text-ocean-300 hover:bg-ocean-600/50 hover:text-white border border-ocean-500/40 text-[10px] font-semibold transition-all shrink-0"
          >
            <span>Inspect</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </button>
        )}
      </div>
    </div>
  );
};
