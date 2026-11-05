import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { MarineIntelligenceMap } from './pages/MarineIntelligenceMap';
import { SatelliteIntelligence } from './pages/SatelliteIntelligence';
import { SARMonitoring } from './pages/SARMonitoring';
import { OpticalSatelliteMonitoring } from './pages/OpticalSatelliteMonitoring';
import { AISVesselTracking } from './pages/AISVesselTracking';
import { OceanographicMonitoring } from './pages/OceanographicMonitoring';
import { ThermalMonitoring } from './pages/ThermalMonitoring';
import { AgentSwarm } from './pages/AgentSwarm';
import { IncidentDetection } from './pages/IncidentDetection';
import { IncidentReports } from './pages/IncidentReports';
import { IoTBuoyMonitoring } from './pages/IoTBuoyMonitoring';
import { NugenAI } from './pages/NugenAI';
import { DataSources } from './pages/DataSources';
import { Settings } from './pages/Settings';
import { MarineIntelligenceOrchestration } from './pages/MarineIntelligenceOrchestration';
import type { SystemHealth } from './types';
import { api } from './services/api';

export const App: React.FC = () => {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);

  useEffect(() => {
    api.getHealth().then((h) => setHealth(h));
  }, []);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-navy-950 text-slate-100 flex flex-col selection:bg-biolum-cyan selection:text-navy-950">
        {/* Navigation Bar with Clock, Satellites, Swarm status */}
        <Navbar 
          health={health} 
          onToggleMobileSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)} 
        />

        {/* Workspace Layout: Collapsible Sidebar + Dynamic View Container */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Desktop & Collapsible Sidebar */}
          <div className="hidden md:flex">
            <Sidebar
              collapsed={sidebarCollapsed}
              onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
            />
          </div>

          {/* Mobile Sidebar Overlay */}
          {mobileSidebarOpen && (
            <div className="fixed inset-0 z-50 md:hidden flex">
              <div 
                className="fixed inset-0 bg-navy-950/80 backdrop-blur-sm"
                onClick={() => setMobileSidebarOpen(false)}
              ></div>
              <div className="relative z-10 w-64 bg-navy-950 h-full shadow-2xl">
                <Sidebar
                  collapsed={false}
                  onToggleCollapse={() => setMobileSidebarOpen(false)}
                />
              </div>
            </div>
          )}

          {/* Main Scientific Viewport */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-gradient-radial from-navy-900/60 to-navy-950">
            <div className="max-w-[1600px] mx-auto">
              <Routes>
                {/* 15 Dedicated Functional Views */}
                <Route path="/" element={<Dashboard />} />
                <Route path="/orchestration" element={<MarineIntelligenceOrchestration />} />
                <Route path="/map" element={<MarineIntelligenceMap />} />
                <Route path="/satellite" element={<SatelliteIntelligence />} />
                <Route path="/sar" element={<SARMonitoring />} />
                <Route path="/optical" element={<OpticalSatelliteMonitoring />} />
                <Route path="/ais" element={<AISVesselTracking />} />
                <Route path="/oceanography" element={<OceanographicMonitoring />} />
                <Route path="/thermal" element={<ThermalMonitoring />} />
                <Route path="/agents" element={<AgentSwarm />} />
                <Route path="/incidents" element={<IncidentDetection />} />
                <Route path="/reports" element={<IncidentReports />} />
                <Route path="/iot-buoys" element={<IoTBuoyMonitoring />} />
                <Route path="/nugen-ai" element={<NugenAI />} />
                <Route path="/data-sources" element={<DataSources />} />
                <Route path="/settings" element={<Settings />} />

                {/* Fallback route */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
};

export default App;
