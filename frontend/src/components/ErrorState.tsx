import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = "Telemetry Signal Disrupted",
  message = "Unable to synchronize with the marine telemetry feed. Check satellite downlink or try reconnecting.",
  onRetry
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center space-y-3 bg-rose-950/20 rounded-2xl border border-rose-900/60">
      <div className="w-12 h-12 rounded-xl bg-rose-900/40 border border-rose-700/60 flex items-center justify-center text-rose-400">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <h4 className="text-sm font-bold text-white">{title}</h4>
      <p className="text-xs text-slate-300 max-w-md leading-relaxed">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 flex items-center space-x-1.5 text-xs font-semibold px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition-all shadow-md shadow-rose-600/20"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Re-establish Uplink</span>
        </button>
      )}
    </div>
  );
};
