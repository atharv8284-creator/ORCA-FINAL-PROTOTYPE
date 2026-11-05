import React, { useState, useEffect } from 'react';
import { Waves, Cpu, Satellite, Brain, Clock, Menu } from 'lucide-react';
import type { SystemHealth } from '../types';

interface NavbarProps {
  health: SystemHealth | null;
  onToggleMobileSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ health, onToggleMobileSidebar }) => {
  const [utcTime, setUtcTime] = useState<string>('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setUtcTime(now.toUTCString().replace('GMT', 'UTC'));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="bg-navy-950/95 border-b border-surface-border sticky top-0 z-50 px-4 md:px-6 py-3 backdrop-blur-md">
      <div className="flex items-center justify-between">
        {/* Brand & Identity */}
        <div className="flex items-center space-x-3">
          {onToggleMobileSidebar && (
            <button
              onClick={onToggleMobileSidebar}
              className="md:hidden p-2 rounded-lg bg-surface-card border border-surface-border text-slate-300"
              title="Toggle Menu"
            >
              <Menu className="w-4 h-4" />
            </button>
          )}

          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-ocean-600 via-ocean-400 to-biolum-cyan flex items-center justify-center shadow-lg shadow-ocean-500/20">
            <Waves className="w-5 h-5 text-navy-950" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-lg font-black tracking-wider bg-gradient-to-r from-white via-slate-100 to-biolum-cyan bg-clip-text text-transparent">
                ORCA
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-navy-900 text-biolum-cyan border border-ocean-800">
                Marine AI 2026
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono hidden sm:block">
              Marine Ecosystem Reasoning with Collaborative Autonomous Agents
            </p>
          </div>
        </div>

        {/* Scientific Platform Status Pills */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* UTC Clock */}
          <div className="hidden xl:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-surface-card border border-surface-border text-[11px] font-mono text-slate-300">
            <Clock className="w-3.5 h-3.5 text-biolum-teal" />
            <span>{utcTime || 'UTC 2026-10-31'}</span>
          </div>

          {/* Satellites Online */}
          <div className="hidden md:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-surface-card border border-surface-border text-[11px] text-slate-300">
            <Satellite className="w-3.5 h-3.5 text-ocean-400" />
            <span className="text-slate-400">Satellites:</span>
            <span className="text-biolum-cyan font-bold">5 Linked</span>
          </div>

          {/* Nugen AI Core */}
          <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-surface-card border border-surface-border text-[11px] text-slate-300">
            <Brain className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
            <span className="text-slate-400">Nugen AI:</span>
            <span className="text-purple-300 font-bold">v3.4 MoOE</span>
          </div>

          {/* Swarm Agents Badge */}
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-surface-card border border-surface-border text-[11px] text-slate-300">
            <Cpu className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-400 hidden sm:inline">Swarm:</span>
            <span className="text-emerald-400 font-bold">
              {health?.active_agents ?? 5} AUVs
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
