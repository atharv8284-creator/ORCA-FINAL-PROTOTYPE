import React from 'react';
import { Waves } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  subtext?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = "Acquiring Geospatial Stream...",
  subtext = "Calibrating satellite telemetry & PostGIS spatial nodes"
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center space-y-4">
      <div className="relative w-16 h-16 flex items-center justify-center">
        {/* Radar sweep rings */}
        <div className="absolute inset-0 rounded-full border-2 border-ocean-500/20 animate-ping"></div>
        <div className="absolute inset-1 rounded-full border border-biolum-cyan/40 animate-pulse"></div>
        <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-ocean-900 to-navy-800 border border-biolum-cyan flex items-center justify-center shadow-lg shadow-biolum-cyan/20">
          <Waves className="w-6 h-6 text-biolum-cyan animate-pulse" />
        </div>
      </div>
      <div className="space-y-1">
        <h4 className="text-sm font-semibold text-white tracking-wide">{message}</h4>
        <p className="text-xs text-slate-400 font-mono">{subtext}</p>
      </div>
    </div>
  );
};
