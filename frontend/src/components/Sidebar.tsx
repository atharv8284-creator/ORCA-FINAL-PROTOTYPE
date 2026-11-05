import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Map, 
  Satellite, 
  Radar, 
  Eye, 
  Navigation, 
  Waves, 
  Thermometer, 
  Cpu, 
  Workflow,
  AlertOctagon, 
  FileText, 
  Radio, 
  Brain, 
  Database, 
  Settings,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggleCollapse }) => {
  const navItems = [
    { to: '/', label: 'Overview', icon: LayoutDashboard },
    { to: '/orchestration', label: 'Lead Orchestrator', icon: Workflow },
    { to: '/map', label: 'Marine Intelligence Map', icon: Map },
    { to: '/satellite', label: 'Satellite Intelligence', icon: Satellite },
    { to: '/sar', label: 'SAR Monitoring', icon: Radar },
    { to: '/optical', label: 'Optical Satellite Monitoring', icon: Eye },
    { to: '/ais', label: 'AIS Vessel Tracking', icon: Navigation },
    { to: '/oceanography', label: 'Oceanographic Monitoring', icon: Waves },
    { to: '/thermal', label: 'Thermal Monitoring', icon: Thermometer },
    { to: '/agents', label: 'AI Agents', icon: Cpu },
    { to: '/incidents', label: 'Incident Detection', icon: AlertOctagon },
    { to: '/reports', label: 'Incident Reports', icon: FileText },
    { to: '/iot-buoys', label: 'IoT Buoy Monitoring', icon: Radio },
    { to: '/nugen-ai', label: 'Nugen AI', icon: Brain },
    { to: '/data-sources', label: 'Data Sources', icon: Database },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside
      className={`bg-navy-950 border-r border-surface-border transition-all duration-300 flex flex-col justify-between shrink-0 z-40 select-none ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {!collapsed && (
          <div className="px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider text-ocean-400/80">
            Navigation Feed
          </div>
        )}

        <nav className="space-y-0.5">
          {navItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                title={collapsed ? `${idx + 1}. ${item.label}` : undefined}
                className={({ isActive }) =>
                  `flex items-center rounded-xl transition-all ${
                    collapsed
                      ? 'justify-center p-2.5 my-1'
                      : 'space-x-3 px-3 py-2 text-xs font-medium'
                  } ${
                    isActive
                      ? 'bg-gradient-to-r from-ocean-600/30 to-ocean-500/10 text-biolum-cyan border border-ocean-500/40 shadow-sm shadow-biolum-cyan/10'
                      : 'text-slate-400 hover:text-white hover:bg-surface-elevated/60'
                  }`
                }
              >
                <Icon className={`shrink-0 ${collapsed ? 'w-5 h-5' : 'w-4 h-4'}`} />
                {!collapsed && (
                  <span className="truncate tracking-wide">{item.label}</span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Collapse Toggle Footer */}
      <div className="p-2 border-t border-surface-border/80 bg-navy-950/80">
        <button
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-center p-2 rounded-xl text-slate-400 hover:text-white hover:bg-surface-elevated transition-all text-xs"
          title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4 text-biolum-cyan" />
          ) : (
            <div className="flex items-center justify-between w-full px-2">
              <span className="text-[11px] text-slate-400 font-mono">Collapse Feed</span>
              <ChevronLeft className="w-4 h-4 text-biolum-cyan" />
            </div>
          )}
        </button>
      </div>
    </aside>
  );
};
