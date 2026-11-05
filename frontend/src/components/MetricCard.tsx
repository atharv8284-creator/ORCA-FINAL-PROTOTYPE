import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: string;
  isPositive?: boolean;
  icon: LucideIcon;
  colorScheme?: 'cyan' | 'teal' | 'emerald' | 'amber' | 'rose';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  change,
  isPositive,
  icon: Icon,
  colorScheme = 'cyan',
}) => {
  const colorMap = {
    cyan: {
      bg: 'bg-ocean-950/40',
      border: 'border-ocean-800/60 hover:border-ocean-500/50',
      iconBg: 'bg-ocean-500/10 text-biolum-cyan',
      glow: 'group-hover:shadow-ocean-500/10',
    },
    teal: {
      bg: 'bg-emerald-950/20',
      border: 'border-emerald-900/60 hover:border-biolum-teal/50',
      iconBg: 'bg-emerald-500/10 text-biolum-teal',
      glow: 'group-hover:shadow-emerald-500/10',
    },
    emerald: {
      bg: 'bg-emerald-950/30',
      border: 'border-emerald-800/60 hover:border-emerald-400/50',
      iconBg: 'bg-emerald-500/10 text-emerald-400',
      glow: 'group-hover:shadow-emerald-500/10',
    },
    amber: {
      bg: 'bg-amber-950/20',
      border: 'border-amber-900/60 hover:border-amber-400/50',
      iconBg: 'bg-amber-500/10 text-amber-400',
      glow: 'group-hover:shadow-amber-500/10',
    },
    rose: {
      bg: 'bg-rose-950/20',
      border: 'border-rose-900/60 hover:border-rose-400/50',
      iconBg: 'bg-rose-500/10 text-rose-400',
      glow: 'group-hover:shadow-rose-500/10',
    },
  };

  const scheme = colorMap[colorScheme];

  return (
    <div
      className={`group relative p-5 rounded-xl border backdrop-blur-sm transition-all duration-300 shadow-md ${scheme.bg} ${scheme.border} ${scheme.glow}`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-slate-400 tracking-wide uppercase">
          {title}
        </span>
        <div className={`p-2 rounded-lg ${scheme.iconBg}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      <div className="flex items-baseline space-x-2">
        <div className="text-2xl font-bold tracking-tight text-white">
          {value}
        </div>
        {change && (
          <span
            className={`text-xs font-semibold ${
              isPositive ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {change}
          </span>
        )}
      </div>

      {subtitle && (
        <p className="mt-1 text-xs text-slate-400/90 leading-normal">
          {subtitle}
        </p>
      )}
    </div>
  );
};
