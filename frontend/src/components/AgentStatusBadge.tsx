import React from 'react';

interface AgentStatusBadgeProps {
  status: 'ACTIVE' | 'INVESTIGATING' | 'WARNING' | 'IDLE';
}

export const AgentStatusBadge: React.FC<AgentStatusBadgeProps> = ({ status }) => {
  const configs = {
    ACTIVE: {
      bg: 'bg-emerald-950/60',
      text: 'text-emerald-400',
      border: 'border-emerald-800/80',
      dot: 'bg-emerald-400 animate-pulse',
      label: 'Active Mission'
    },
    INVESTIGATING: {
      bg: 'bg-ocean-950/60',
      text: 'text-biolum-cyan',
      border: 'border-ocean-700/80',
      dot: 'bg-biolum-cyan animate-ping',
      label: 'Investigating'
    },
    WARNING: {
      bg: 'bg-amber-950/60',
      text: 'text-amber-400',
      border: 'border-amber-800/80',
      dot: 'bg-amber-400 animate-pulse',
      label: 'Alert State'
    },
    IDLE: {
      bg: 'bg-slate-900/60',
      text: 'text-slate-400',
      border: 'border-slate-800',
      dot: 'bg-slate-400',
      label: 'Standby'
    }
  };

  const c = configs[status] || configs.IDLE;

  return (
    <span className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${c.bg} ${c.text} ${c.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`}></span>
      <span>{c.label}</span>
    </span>
  );
};
