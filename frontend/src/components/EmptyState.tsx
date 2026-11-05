import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Database } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon: Icon = Database,
  actionText,
  onAction
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center space-y-3 bg-surface-card/60 rounded-2xl border border-surface-border">
      <div className="w-12 h-12 rounded-xl bg-navy-800 border border-ocean-800 flex items-center justify-center text-ocean-400">
        <Icon className="w-6 h-6" />
      </div>
      <h4 className="text-sm font-bold text-white">{title}</h4>
      <p className="text-xs text-slate-400 max-w-md leading-relaxed">{description}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="mt-2 text-xs font-semibold px-4 py-2 rounded-lg bg-ocean-600 hover:bg-ocean-500 text-white transition-all shadow-md shadow-ocean-500/20"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
