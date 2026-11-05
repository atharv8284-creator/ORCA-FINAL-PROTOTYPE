import React, { useState, useEffect, useRef, useMemo } from 'react';
import { api } from '../services/api';
import type { 
  IoTBuoyItem, 
  IoTDeviceStatusResponse,
  VirtualESP32Telemetry,
  IoTAnomalyEvent,
  VirtualESP32DeviceDetail,
  IoTStatusResponse,
  IoTScenarioType
} from '../types';
import { LoadingState } from '../components/LoadingState';
import { DataTierBadge } from '../components/DataTierBadge';
import { 
  Radio, 
  Battery, 
  Sun, 
  MapPin, 
  Clock,
  Cpu,
  AlertTriangle,
  RefreshCw,
  Play,
  Pause,
  Activity,
  Zap,
  Droplets,
  Thermometer,
  Waves,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Sliders,
  ShieldAlert,
  PowerOff
} from 'lucide-react';

export const IoTBuoyMonitoring: React.FC = () => {
  // Page load & general states
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [switchingScenario, setSwitchingScenario] = useState<boolean>(false);
  
  // Phase 5 Virtual ESP32 States
  const [virtualStatus, setVirtualStatus] = useState<IoTStatusResponse | null>(null);
  const [telemetry, setTelemetry] = useState<VirtualESP32Telemetry | null>(null);
  const [anomalies, setAnomalies] = useState<IoTAnomalyEvent[]>([]);
  const [deviceDetail, setDeviceDetail] = useState<VirtualESP32DeviceDetail | null>(null);
  const [history, setHistory] = useState<VirtualESP32Telemetry[]>([]);
  const [selectedChartMetric, setSelectedChartMetric] = useState<'all' | 'turbidity' | 'temperature' | 'dissolved_oxygen' | 'ph'>('all');
  const [showHardwareSpecs, setShowHardwareSpecs] = useState<boolean>(false);
  const [showBaselineStations, setShowBaselineStations] = useState<boolean>(false);
  
  // Baseline stations
  const [baselineBuoys, setBaselineBuoys] = useState<IoTBuoyItem[]>([]);
  const [baselineDeviceStatus, setBaselineDeviceStatus] = useState<IoTDeviceStatusResponse | null>(null);

  const isMountedRef = useRef<boolean>(true);

  // Fetch all virtual buoy data
  const fetchVirtualBuoyData = async (isManual: boolean = false) => {
    try {
      if (isManual) setRefreshing(true);
      const [statusRes, telemetryRes, anomaliesRes, historyRes] = await Promise.all([
        api.getVirtualBuoyStatus().catch(() => null),
        api.getVirtualBuoyTelemetry().catch(() => null),
        api.getVirtualBuoyAnomalies().catch(() => []),
        api.getVirtualBuoyHistory(30).catch(() => ({ history: [] }))
      ]);

      if (!isMountedRef.current) return;

      if (statusRes) setVirtualStatus(statusRes);
      if (telemetryRes) setTelemetry(telemetryRes);
      setAnomalies(anomaliesRes || []);
      if (historyRes && historyRes.history) setHistory(historyRes.history);
    } catch (err) {
      console.error('Failed to poll virtual buoy telemetry:', err);
    } finally {
      if (isMountedRef.current && isManual) setRefreshing(false);
    }
  };

  // Initial load
  useEffect(() => {
    isMountedRef.current = true;

    const initialLoad = async () => {
      try {
        setLoading(true);
        const [statusRes, telemetryRes, anomaliesRes, historyRes, detailRes, baseStatus, baseBuoys] = await Promise.all([
          api.getVirtualBuoyStatus().catch(() => null),
          api.getVirtualBuoyTelemetry().catch(() => null),
          api.getVirtualBuoyAnomalies().catch(() => []),
          api.getVirtualBuoyHistory(30).catch(() => ({ history: [] })),
          api.getVirtualBuoyDeviceDetail('ORCA-BUOY-001').catch(() => null),
          api.getIoTDeviceStatus().catch(() => null),
          api.getIoTBuoysLive().catch(async () => {
            const fallback = await api.getIoTBuoys();
            return fallback.map(b => ({
              ...b,
              data_mode: 'SIMULATED' as const,
              status: 'SIMULATED' as const
            }));
          })
        ]);

        if (!isMountedRef.current) return;

        if (statusRes) setVirtualStatus(statusRes);
        if (telemetryRes) setTelemetry(telemetryRes);
        setAnomalies(anomaliesRes || []);
        if (historyRes && historyRes.history) setHistory(historyRes.history);
        if (detailRes) setDeviceDetail(detailRes);
        if (baseStatus) setBaselineDeviceStatus(baseStatus);
        if (baseBuoys) setBaselineBuoys(baseBuoys);
      } finally {
        if (isMountedRef.current) setLoading(false);
      }
    };

    initialLoad();

    // Auto-polling interval every 4 seconds
    const interval = setInterval(() => {
      if (isMountedRef.current) {
        fetchVirtualBuoyData(false);
      }
    }, 4000);

    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
    };
  }, []);

  // Handle Scenario Switch
  const handleScenarioChange = async (scenario: IoTScenarioType) => {
    try {
      setSwitchingScenario(true);
      await api.switchVirtualBuoyScenario(scenario, `User UI switch to ${scenario}`);
      await fetchVirtualBuoyData(false);
      const updatedDetail = await api.getVirtualBuoyDeviceDetail('ORCA-BUOY-001').catch(() => null);
      if (updatedDetail && isMountedRef.current) setDeviceDetail(updatedDetail);
    } catch (err) {
      console.error('Error switching scenario:', err);
    } finally {
      if (isMountedRef.current) setSwitchingScenario(false);
    }
  };

  // Toggle Simulation Run/Pause
  const handleToggleSimulation = async () => {
    try {
      setSwitchingScenario(true);
      if (virtualStatus?.is_generating_telemetry) {
        await api.stopVirtualBuoySimulation();
      } else {
        await api.startVirtualBuoySimulation();
      }
      await fetchVirtualBuoyData(false);
    } catch (err) {
      console.error('Error toggling simulation:', err);
    } finally {
      if (isMountedRef.current) setSwitchingScenario(false);
    }
  };

  const currentScenario = virtualStatus?.scenario || telemetry?.current_scenario || 'normal';
  const isOnline = virtualStatus?.device_status !== 'OFFLINE' && currentScenario !== 'offline';
  const hasAnomalies = anomalies.length > 0;

  // Chart coordinate calculations
  const chartData = useMemo(() => {
    if (!history || history.length === 0) return [];
    return history.map((pt, idx) => ({
      index: idx,
      timestamp: pt.timestamp ? new Date(pt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : `#${idx}`,
      temp: pt.water_temperature_c,
      ph: pt.ph_level,
      turbidity: pt.turbidity_ntu,
      do: pt.dissolved_oxygen_mg_l,
      salinity: pt.salinity_psu,
      battery: pt.battery_percentage
    }));
  }, [history]);

  if (loading) {
    return (
      <LoadingState 
        message="Connecting to Virtual ESP32 Marine Buoy Operations Center..." 
        subtext="Synchronizing microcontroller telemetry stream, sensor telemetry matrices, and anomaly engine" 
      />
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* =================================================================== */}
      {/* 1. Header & Live Status Banner                                      */}
      {/* =================================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-biolum-cyan text-xs font-mono font-bold tracking-widest uppercase mb-1">
            <Radio className="w-4 h-4 animate-pulse text-biolum-cyan" />
            <span>Phase 5 • Virtual ESP32 Buoy & IoT Intelligence Agent</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <span>Virtual ESP32 Marine Monitoring Buoy</span>
            <span className="text-xs px-2.5 py-1 rounded-full font-mono font-bold bg-ocean-500/20 text-ocean-300 border border-ocean-500/30">
              ORCA-BUOY-001
            </span>
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-1 flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-biolum-teal" />
            <span>Ribbon Reefs Sector, Great Barrier Reef Marine Park (-16.8205°, 146.2150°)</span>
          </p>
        </div>

        {/* Global Controls & Refresh */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => fetchVirtualBuoyData(true)}
            disabled={refreshing || switchingScenario}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-surface-card border border-surface-border text-xs text-slate-200 hover:text-white font-mono hover:border-slate-500 transition-all shadow-sm"
            title="Poll latest telemetry packet"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-biolum-cyan' : ''}`} />
            <span>{refreshing ? 'Polling...' : 'Poll Packet'}</span>
          </button>

          <button
            onClick={handleToggleSimulation}
            disabled={switchingScenario}
            className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl border text-xs font-mono font-semibold transition-all shadow-sm ${
              virtualStatus?.is_generating_telemetry
                ? 'bg-amber-950/40 border-amber-600/50 text-amber-300 hover:bg-amber-900/50'
                : 'bg-emerald-950/40 border-emerald-600/50 text-emerald-300 hover:bg-emerald-900/50'
            }`}
          >
            {virtualStatus?.is_generating_telemetry ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Pause Sim</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Resume Sim</span>
              </>
            )}
          </button>

          <button
            onClick={() => setShowHardwareSpecs(!showHardwareSpecs)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-surface-card border border-surface-border text-xs text-slate-300 hover:text-white font-mono transition-all"
          >
            <Cpu className="w-3.5 h-3.5 text-ocean-400" />
            <span>Hardware Specs</span>
            {showHardwareSpecs ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 2. Scenario Controller & Mode Badges                                */}
      {/* =================================================================== */}
      <div className="p-4 sm:p-5 rounded-2xl bg-surface-card border border-surface-border shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-surface-border pb-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono text-slate-400">Device Mode:</span>
              <DataTierBadge tier="SIMULATED" />
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono text-slate-400">Connection:</span>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-bold border ${
                isOnline 
                  ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-400' 
                  : 'bg-rose-950/60 border-rose-500/50 text-rose-400'
              }`}>
                {isOnline ? 'SIMULATED ONLINE' : 'DEVICE OFFLINE'}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono text-slate-400">Packet Sequence:</span>
              <span className="text-xs font-mono font-bold text-biolum-cyan bg-navy-950 px-2 py-0.5 rounded-md border border-surface-border">
                #{telemetry?.packet_sequence ?? virtualStatus?.total_packets_generated ?? 0}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs font-mono text-slate-400">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>Last Transmission: </span>
            <span className="text-white font-semibold">
              {telemetry?.timestamp ? new Date(telemetry.timestamp).toLocaleTimeString() : 'N/A'} UTC
            </span>
          </div>
        </div>

        {/* Scenario Switcher Buttons */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs font-mono font-bold text-slate-300">
              <Sliders className="w-4 h-4 text-ocean-400" />
              <span>CONTROLLABLE DEMONSTRATION SCENARIOS:</span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Active Scenario: <strong className="text-white uppercase">{currentScenario}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* 1. Normal Scenario */}
            <button
              onClick={() => handleScenarioChange('normal')}
              disabled={switchingScenario}
              className={`p-3.5 rounded-xl border text-left transition-all relative overflow-hidden ${
                currentScenario === 'normal'
                  ? 'bg-emerald-950/50 border-emerald-500/80 shadow-lg shadow-emerald-950/50 text-white'
                  : 'bg-navy-950/60 border-surface-border text-slate-400 hover:text-slate-200 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className={`w-4 h-4 ${currentScenario === 'normal' ? 'text-emerald-400' : 'text-slate-500'}`} />
                  <span className="text-xs font-bold font-mono uppercase">1. Normal Monitoring</span>
                </div>
                {currentScenario === 'normal' && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-semibold">
                    ACTIVE
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                Stable coral reef baseline: 26.5°C, 8.18 pH, 1.2 NTU, 6.8 mg/L DO, 35.2 PSU.
              </p>
            </button>

            {/* 2. Anomaly Scenario */}
            <button
              onClick={() => handleScenarioChange('anomaly')}
              disabled={switchingScenario}
              className={`p-3.5 rounded-xl border text-left transition-all relative overflow-hidden ${
                currentScenario === 'anomaly'
                  ? 'bg-amber-950/50 border-amber-500/80 shadow-lg shadow-amber-950/50 text-white'
                  : 'bg-navy-950/60 border-surface-border text-slate-400 hover:text-slate-200 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className={`w-4 h-4 ${currentScenario === 'anomaly' ? 'text-amber-400 animate-pulse' : 'text-slate-500'}`} />
                  <span className="text-xs font-bold font-mono uppercase">2. Anomaly Demonstration</span>
                </div>
                {currentScenario === 'anomaly' && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono font-semibold">
                    ACTIVE
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                Simulated perturbation: Turbidity spike (~28.5 NTU), thermal pulse (~32.8°C), hypoxic sag (~3.2 mg/L).
              </p>
            </button>

            {/* 3. Offline Scenario */}
            <button
              onClick={() => handleScenarioChange('offline')}
              disabled={switchingScenario}
              className={`p-3.5 rounded-xl border text-left transition-all relative overflow-hidden ${
                currentScenario === 'offline'
                  ? 'bg-rose-950/50 border-rose-500/80 shadow-lg shadow-rose-950/50 text-white'
                  : 'bg-navy-950/60 border-surface-border text-slate-400 hover:text-slate-200 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <PowerOff className={`w-4 h-4 ${currentScenario === 'offline' ? 'text-rose-400' : 'text-slate-500'}`} />
                  <span className="text-xs font-bold font-mono uppercase">3. Device Offline</span>
                </div>
                {currentScenario === 'offline' && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono font-semibold">
                    ACTIVE
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                Freezes last known telemetry, marks status OFFLINE, and pauses packet transmission.
              </p>
            </button>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 3. Hardware Specs Drawer (Collapsible)                             */}
      {/* =================================================================== */}
      {showHardwareSpecs && deviceDetail && (
        <div className="p-5 rounded-2xl bg-surface-card border border-ocean-500/30 shadow-2xl space-y-4 animate-in fade-in-50 duration-200">
          <div className="flex items-center justify-between border-b border-surface-border pb-3">
            <div className="flex items-center space-x-2.5">
              <Cpu className="w-5 h-5 text-biolum-cyan" />
              <h3 className="text-sm font-bold text-white font-mono uppercase">
                Virtual ESP32 Architecture & Transducer Manifest
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-400">
              Firmware: <span className="text-white font-bold">{deviceDetail.firmware_version}</span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-navy-950 border border-surface-border space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Microcontroller Core</span>
              <div className="text-white font-mono font-bold">{deviceDetail.microcontroller}</div>
              <div className="text-[10px] text-slate-500 font-mono">FreeRTOS Dual-Tasking / Dual-Core 240MHz</div>
            </div>

            <div className="p-3 rounded-xl bg-navy-950 border border-surface-border space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Wireless Modem & RF</span>
              <div className="text-white font-mono font-bold">{deviceDetail.antenna_type}</div>
              <div className="text-[10px] text-emerald-400 font-mono">SX1262 LoRa + Quectel BG95 LTE-M</div>
            </div>

            <div className="p-3 rounded-xl bg-navy-950 border border-surface-border space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Power & Energy Harvesting</span>
              <div className="text-white font-mono font-bold">{deviceDetail.battery_capacity_mah} mAh LiFePO4</div>
              <div className="text-[10px] text-amber-400 font-mono">{deviceDetail.solar_panel_spec}</div>
            </div>

            <div className="p-3 rounded-xl bg-navy-950 border border-surface-border space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Cryptographic Security</span>
              <div className="text-white font-mono font-bold">ATECC608A Hardware Element</div>
              <div className="text-[10px] text-biolum-cyan font-mono">HMAC-SHA256 Token Signature</div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-navy-950/80 border border-surface-border space-y-2">
            <span className="text-xs font-mono font-bold text-slate-300">Installed Marine Sensor Transducers:</span>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono text-slate-400">
              {deviceDetail.sensors_installed.map((sensor, idx) => (
                <li key={idx} className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-biolum-teal" />
                  <span>{sensor}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 4. Animated Virtual Buoy Visual + Live Telemetry Cards             */}
      {/* =================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Animated Virtual Buoy Graphic (5 Cols) */}
        <div className="lg:col-span-5 p-5 rounded-2xl bg-surface-card border border-surface-border shadow-xl space-y-4 flex flex-col items-center justify-between min-h-[460px]">
          <div className="w-full flex items-center justify-between border-b border-surface-border pb-2.5">
            <div className="flex items-center space-x-2">
              <Radio className="w-4 h-4 text-biolum-cyan" />
              <span className="text-xs font-bold font-mono text-white uppercase">In-Situ Virtual Buoy Node</span>
            </div>
            <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-md ${
              currentScenario === 'normal'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : currentScenario === 'anomaly'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
            }`}>
              {currentScenario.toUpperCase()}
            </span>
          </div>

          {/* SVG Animated Buoy Model */}
          <div className="relative w-full h-72 flex items-center justify-center overflow-hidden rounded-xl bg-gradient-to-b from-navy-950 via-navy-900 to-ocean-950 border border-surface-border">
            {/* Background Sky & Solar Irradiance */}
            <div className="absolute top-3 left-4 flex items-center space-x-2 text-[11px] font-mono text-amber-300">
              <Sun className={`w-4 h-4 ${isOnline ? 'animate-spin' : ''}`} style={{ animationDuration: '18s' }} />
              <span>Solar: {telemetry ? `${(telemetry.battery_voltage_v * 3.1).toFixed(1)} W` : '0 W'}</span>
            </div>

            {/* Radio Wave Broadcast Animation */}
            {isOnline && (
              <div className="absolute top-12 flex items-center justify-center">
                <div className="w-20 h-20 rounded-full border border-biolum-cyan/40 animate-ping" style={{ animationDuration: '2.5s' }} />
                <div className="absolute w-36 h-36 rounded-full border border-biolum-teal/20 animate-ping" style={{ animationDuration: '3.5s' }} />
              </div>
            )}

            {/* Buoy SVG Body */}
            <svg
              viewBox="0 0 240 220"
              className={`w-64 h-64 drop-shadow-2xl transition-transform duration-1000 ${
                isOnline ? 'animate-bounce' : 'opacity-60'
              }`}
              style={{ animationDuration: '4s' }}
            >
              {/* Mooring Cable down to seabed */}
              <line x1="120" y1="180" x2="120" y2="230" stroke="#38bdf8" strokeWidth="2" strokeDasharray="4,4" opacity="0.6" />

              {/* Underwater Sensors */}
              <circle cx="120" cy="195" r="4" fill="#06b6d4" />
              <circle cx="120" cy="210" r="5" fill="#38bdf8" />

              {/* Ocean Water Surface Waves */}
              <path
                d="M 10 155 Q 60 145, 120 155 T 230 155 L 240 220 L 0 220 Z"
                fill="#0369a1"
                fillOpacity="0.45"
              />
              <path
                d="M 0 162 Q 70 152, 140 162 T 240 162 L 240 220 L 0 220 Z"
                fill="#0284c7"
                fillOpacity="0.3"
              />

              {/* Buoy Hull (Yellow/Marine Orange Marine Grade Float) */}
              <path
                d="M 65 155 L 80 120 L 160 120 L 175 155 Q 120 170 65 155 Z"
                fill="#f59e0b"
                stroke="#d97706"
                strokeWidth="2.5"
              />
              {/* Buoy Hull Stripe */}
              <path
                d="M 72 138 L 168 138 L 164 148 L 76 148 Z"
                fill="#1e293b"
                opacity="0.8"
              />

              {/* Tower Mast Structure */}
              <polygon points="95,120 145,120 125,50 115,50" fill="#475569" stroke="#334155" strokeWidth="1.5" />
              <line x1="95" y1="120" x2="125" y2="50" stroke="#94a3b8" strokeWidth="2" />
              <line x1="145" y1="120" x2="115" y2="50" stroke="#94a3b8" strokeWidth="2" />
              <line x1="102" y1="90" x2="138" y2="90" stroke="#94a3b8" strokeWidth="1.5" />

              {/* Solar Panel on Mast Top */}
              <polygon points="85,55 155,55 145,45 95,45" fill="#1e3a8a" stroke="#3b82f6" strokeWidth="1.5" />
              <line x1="102" y1="50" x2="138" y2="50" stroke="#60a5fa" strokeWidth="1" />

              {/* Antenna Rod */}
              <line x1="120" y1="45" x2="120" y2="12" stroke="#e2e8f0" strokeWidth="2" />
              <circle cx="120" cy="11" r="3.5" fill="#38bdf8" />

              {/* ESP32 Enclosure Box in Center */}
              <rect x="104" y="98" width="32" height="20" rx="3" fill="#0f172a" stroke="#06b6d4" strokeWidth="1" />
              
              {/* Blinking Status LED on ESP32 Box */}
              <circle
                cx="120"
                cy="108"
                r="3"
                className={
                  !isOnline
                    ? 'fill-slate-600'
                    : hasAnomalies
                    ? 'fill-amber-400 animate-ping'
                    : 'fill-emerald-400 animate-pulse'
                }
              />
            </svg>

            {/* Quick Floating Telemetry Indicators */}
            <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-[11px] font-mono px-3 py-1.5 rounded-lg bg-navy-950/80 backdrop-blur border border-surface-border">
              <div className="flex items-center space-x-1.5 text-slate-300">
                <Battery className={`w-3.5 h-3.5 ${
                  (telemetry?.battery_percentage || 0) < 25 ? 'text-rose-400' : 'text-emerald-400'
                }`} />
                <span>{telemetry?.battery_percentage.toFixed(0) ?? 94}% ({telemetry?.battery_voltage_v.toFixed(2) ?? 4.14}V)</span>
              </div>
              <div className="flex items-center space-x-1.5 text-slate-300">
                <Radio className="w-3.5 h-3.5 text-biolum-cyan" />
                <span>{telemetry?.signal_strength_dbm ?? -68} dBm</span>
              </div>
              <div className="flex items-center space-x-1 text-slate-400">
                <Activity className="w-3.5 h-3.5 text-ocean-400" />
                <span>{isOnline ? 'TX ACTIVE' : 'OFFLINE'}</span>
              </div>
            </div>
          </div>

          {/* Marine Deployment Note */}
          <div className="w-full text-xs text-slate-400 font-mono bg-navy-950/60 p-3 rounded-xl border border-surface-border">
            <span className="text-slate-300 font-bold block mb-0.5">Deployment Metadata:</span>
            <span>Fixed reef mooring buoy with 5-depth multiparameter CTD cable, nephelometer probe & dual LoRaWAN/LTE-M gateway.</span>
          </div>
        </div>

        {/* Live Telemetry Sensor Grid (7 Cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-biolum-cyan" />
              <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                Real-Time Transducer Matrix (7 Parameters)
              </h2>
            </div>
            <span className="text-xs font-mono text-slate-400">
              Sensor status: <strong className={hasAnomalies ? 'text-amber-400' : 'text-emerald-400'}>
                {hasAnomalies ? `${anomalies.length} ANOMALOUS` : 'ALL NOMINAL'}
              </strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* 1. Water Temperature */}
            {(() => {
              const val = telemetry?.water_temperature_c ?? 26.5;
              const isAnom = val < 24.0 || val > 30.5;
              return (
                <div className={`p-4 rounded-xl border transition-all ${
                  isAnom ? 'bg-amber-950/40 border-amber-500/70' : 'bg-surface-card border-surface-border'
                }`}>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Thermometer className="w-3.5 h-3.5 text-rose-400" />
                      <span>Water Temperature</span>
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      isAnom ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-400'
                    }`}>
                      {isAnom ? 'ANOMALY' : 'NORMAL'}
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-2xl font-black font-mono text-white">{val.toFixed(2)}</span>
                    <span className="text-xs font-mono text-slate-400">°C</span>
                  </div>
                  <div className="mt-2 text-[10px] text-slate-400 font-mono flex items-center justify-between">
                    <span>Range: 24.0 – 30.5 °C</span>
                    <span className="text-slate-500 truncate">Dallas DS18B20</span>
                  </div>
                </div>
              );
            })()}

            {/* 2. pH Level */}
            {(() => {
              const val = telemetry?.ph_level ?? 8.18;
              const isAnom = val < 7.80 || val > 8.40;
              return (
                <div className={`p-4 rounded-xl border transition-all ${
                  isAnom ? 'bg-amber-950/40 border-amber-500/70' : 'bg-surface-card border-surface-border'
                }`}>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-indigo-400" />
                      <span>pH Acidity</span>
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      isAnom ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-400'
                    }`}>
                      {isAnom ? 'ANOMALY' : 'NORMAL'}
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-2xl font-black font-mono text-white">{val.toFixed(2)}</span>
                    <span className="text-xs font-mono text-slate-400">pH</span>
                  </div>
                  <div className="mt-2 text-[10px] text-slate-400 font-mono flex items-center justify-between">
                    <span>Range: 7.80 – 8.40</span>
                    <span className="text-slate-500 truncate">Atlas EZO pH</span>
                  </div>
                </div>
              );
            })()}

            {/* 3. Turbidity */}
            {(() => {
              const val = telemetry?.turbidity_ntu ?? 1.20;
              const isAnom = val > 5.0;
              return (
                <div className={`p-4 rounded-xl border transition-all ${
                  isAnom ? 'bg-amber-950/40 border-amber-500/70 shadow-lg shadow-amber-950/40' : 'bg-surface-card border-surface-border'
                }`}>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Waves className="w-3.5 h-3.5 text-amber-400" />
                      <span>Turbidity (Clarity)</span>
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      isAnom ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-400'
                    }`}>
                      {isAnom ? 'ANOMALY' : 'NORMAL'}
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className={`text-2xl font-black font-mono ${isAnom ? 'text-amber-300' : 'text-white'}`}>
                      {val.toFixed(2)}
                    </span>
                    <span className="text-xs font-mono text-slate-400">NTU</span>
                  </div>
                  <div className="mt-2 text-[10px] text-slate-400 font-mono flex items-center justify-between">
                    <span>Range: 0.0 – 5.0 NTU</span>
                    <span className="text-slate-500 truncate">DFRobot Nephelometer</span>
                  </div>
                </div>
              );
            })()}

            {/* 4. Dissolved Oxygen */}
            {(() => {
              const val = telemetry?.dissolved_oxygen_mg_l ?? 6.80;
              const isAnom = val < 4.5 || val > 14.0;
              return (
                <div className={`p-4 rounded-xl border transition-all ${
                  isAnom ? 'bg-amber-950/40 border-amber-500/70' : 'bg-surface-card border-surface-border'
                }`}>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Droplets className="w-3.5 h-3.5 text-biolum-cyan" />
                      <span>Dissolved Oxygen</span>
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      isAnom ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-400'
                    }`}>
                      {isAnom ? 'ANOMALY' : 'NORMAL'}
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className={`text-2xl font-black font-mono ${isAnom ? 'text-rose-300' : 'text-white'}`}>
                      {val.toFixed(2)}
                    </span>
                    <span className="text-xs font-mono text-slate-400">mg/L</span>
                  </div>
                  <div className="mt-2 text-[10px] text-slate-400 font-mono flex items-center justify-between">
                    <span>Range: 4.5 – 14.0 mg/L</span>
                    <span className="text-slate-500 truncate">Galvanic DO Cell</span>
                  </div>
                </div>
              );
            })()}

            {/* 5. Practical Salinity */}
            {(() => {
              const val = telemetry?.salinity_psu ?? 35.2;
              const isAnom = val < 32.0 || val > 38.0;
              return (
                <div className={`p-4 rounded-xl border transition-all ${
                  isAnom ? 'bg-amber-950/40 border-amber-500/70' : 'bg-surface-card border-surface-border'
                }`}>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-biolum-teal" />
                      <span>Practical Salinity</span>
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      isAnom ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-400'
                    }`}>
                      {isAnom ? 'ANOMALY' : 'NORMAL'}
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-2xl font-black font-mono text-white">{val.toFixed(2)}</span>
                    <span className="text-xs font-mono text-slate-400">PSU</span>
                  </div>
                  <div className="mt-2 text-[10px] text-slate-400 font-mono flex items-center justify-between">
                    <span>Range: 32.0 – 38.0 PSU</span>
                    <span className="text-slate-500 truncate">Toroidal Induction</span>
                  </div>
                </div>
              );
            })()}

            {/* 6. Battery Level & Voltage */}
            {(() => {
              const pct = telemetry?.battery_percentage ?? 94.0;
              const volt = telemetry?.battery_voltage_v ?? 4.14;
              const isAnom = pct < 20.0;
              return (
                <div className={`p-4 rounded-xl border transition-all ${
                  isAnom ? 'bg-rose-950/40 border-rose-500/70' : 'bg-surface-card border-surface-border'
                }`}>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Battery className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Battery & Power</span>
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      isAnom ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-400'
                    }`}>
                      {isAnom ? 'LOW BATTERY' : 'CHARGED'}
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-2xl font-black font-mono text-white">{pct.toFixed(0)}%</span>
                    <span className="text-xs font-mono text-slate-400">{volt.toFixed(2)} V</span>
                  </div>
                  <div className="mt-2 text-[10px] text-slate-400 font-mono flex items-center justify-between">
                    <span>LiFePO4 12,000 mAh</span>
                    <span className="text-slate-500 truncate">TI INA219 Monitor</span>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* 7. Signal Strength Bar (Spans full width) */}
          <div className="p-3.5 rounded-xl bg-surface-card border border-surface-border flex items-center justify-between text-xs font-mono">
            <div className="flex items-center space-x-2 text-slate-300">
              <Radio className="w-4 h-4 text-biolum-cyan" />
              <span>RF Signal RSSI:</span>
              <strong className="text-white">{telemetry?.signal_strength_dbm ?? -68} dBm</strong>
              <span className="text-slate-500">(-95 dBm threshold)</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="text-emerald-400 font-bold">EXCELLENT</span>
              <span className="text-[10px] text-slate-400">• Semtech SX1262 LoRa</span>
            </div>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 5. Telemetry Time-Series History Chart                              */}
      {/* =================================================================== */}
      <div className="p-5 rounded-2xl bg-surface-card border border-surface-border shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-surface-border pb-3">
          <div className="flex items-center space-x-2.5">
            <Activity className="w-4 h-4 text-biolum-teal" />
            <h3 className="text-sm font-bold text-white font-mono uppercase">
              Telemetry Time-Series Trends (Recent Packets)
            </h3>
          </div>

          {/* Metric Selector Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
            <button
              onClick={() => setSelectedChartMetric('all')}
              className={`px-2.5 py-1 rounded-lg border transition-all ${
                selectedChartMetric === 'all'
                  ? 'bg-ocean-500/20 text-ocean-300 border-ocean-500/40 font-bold'
                  : 'bg-navy-950 text-slate-400 border-surface-border hover:text-white'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setSelectedChartMetric('turbidity')}
              className={`px-2.5 py-1 rounded-lg border transition-all ${
                selectedChartMetric === 'turbidity'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold'
                  : 'bg-navy-950 text-slate-400 border-surface-border hover:text-white'
              }`}
            >
              Turbidity (NTU)
            </button>
            <button
              onClick={() => setSelectedChartMetric('temperature')}
              className={`px-2.5 py-1 rounded-lg border transition-all ${
                selectedChartMetric === 'temperature'
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-bold'
                  : 'bg-navy-950 text-slate-400 border-surface-border hover:text-white'
              }`}
            >
              Temp (°C)
            </button>
            <button
              onClick={() => setSelectedChartMetric('dissolved_oxygen')}
              className={`px-2.5 py-1 rounded-lg border transition-all ${
                selectedChartMetric === 'dissolved_oxygen'
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold'
                  : 'bg-navy-950 text-slate-400 border-surface-border hover:text-white'
              }`}
            >
              DO (mg/L)
            </button>
            <button
              onClick={() => setSelectedChartMetric('ph')}
              className={`px-2.5 py-1 rounded-lg border transition-all ${
                selectedChartMetric === 'ph'
                  ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 font-bold'
                  : 'bg-navy-950 text-slate-400 border-surface-border hover:text-white'
              }`}
            >
              pH
            </button>
          </div>
        </div>

        {/* SVG Multi-Line Chart */}
        {chartData.length > 1 ? (
          <div className="w-full h-56 relative bg-navy-950 rounded-xl p-3 border border-surface-border flex items-end">
            <svg viewBox="0 0 600 180" className="w-full h-full overflow-visible">
              {/* Horizontal Grid lines */}
              <line x1="40" y1="20" x2="580" y2="20" stroke="#1e293b" strokeDasharray="3,3" />
              <line x1="40" y1="65" x2="580" y2="65" stroke="#1e293b" strokeDasharray="3,3" />
              <line x1="40" y1="110" x2="580" y2="110" stroke="#1e293b" strokeDasharray="3,3" />
              <line x1="40" y1="155" x2="580" y2="155" stroke="#334155" />

              {/* Trend lines depending on selected tab */}
              {(() => {
                const count = chartData.length;
                const xStep = count > 1 ? (540 / (count - 1)) : 540;

                // Turbidity Polyline (Scale: 0 to 35 NTU)
                const turbidityPoints = chartData
                  .map((d, i) => `${40 + i * xStep},${155 - Math.min(135, (d.turbidity / 35) * 135)}`)
                  .join(' ');

                // Temperature Polyline (Scale: 20 to 35 °C)
                const tempPoints = chartData
                  .map((d, i) => `${40 + i * xStep},${155 - Math.min(135, Math.max(0, (d.temp - 20) / 15) * 135)}`)
                  .join(' ');

                // DO Polyline (Scale: 0 to 14 mg/L)
                const doPoints = chartData
                  .map((d, i) => `${40 + i * xStep},${155 - Math.min(135, (d.do / 14) * 135)}`)
                  .join(' ');

                // pH Polyline (Scale: 7.0 to 9.0)
                const phPoints = chartData
                  .map((d, i) => `${40 + i * xStep},${155 - Math.min(135, Math.max(0, (d.ph - 7.0) / 2.0) * 135)}`)
                  .join(' ');

                return (
                  <>
                    {(selectedChartMetric === 'all' || selectedChartMetric === 'turbidity') && (
                      <polyline
                        points={turbidityPoints}
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth={selectedChartMetric === 'turbidity' ? '2.5' : '1.5'}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity={selectedChartMetric === 'all' ? 0.85 : 1}
                      />
                    )}

                    {(selectedChartMetric === 'all' || selectedChartMetric === 'temperature') && (
                      <polyline
                        points={tempPoints}
                        fill="none"
                        stroke="#f43f5e"
                        strokeWidth={selectedChartMetric === 'temperature' ? '2.5' : '1.5'}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity={selectedChartMetric === 'all' ? 0.85 : 1}
                      />
                    )}

                    {(selectedChartMetric === 'all' || selectedChartMetric === 'dissolved_oxygen') && (
                      <polyline
                        points={doPoints}
                        fill="none"
                        stroke="#06b6d4"
                        strokeWidth={selectedChartMetric === 'dissolved_oxygen' ? '2.5' : '1.5'}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity={selectedChartMetric === 'all' ? 0.85 : 1}
                      />
                    )}

                    {(selectedChartMetric === 'all' || selectedChartMetric === 'ph') && (
                      <polyline
                        points={phPoints}
                        fill="none"
                        stroke="#818cf8"
                        strokeWidth={selectedChartMetric === 'ph' ? '2.5' : '1.5'}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity={selectedChartMetric === 'all' ? 0.85 : 1}
                      />
                    )}
                  </>
                );
              })()}
            </svg>

            {/* Chart Legend */}
            <div className="absolute top-3 right-4 flex items-center space-x-3 text-[10px] font-mono bg-navy-950/80 px-2 py-1 rounded border border-surface-border">
              <span className="flex items-center space-x-1 text-amber-400">
                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                <span>Turbidity</span>
              </span>
              <span className="flex items-center space-x-1 text-rose-400">
                <span className="w-2 h-2 rounded-full bg-rose-400 inline-block" />
                <span>Temp</span>
              </span>
              <span className="flex items-center space-x-1 text-biolum-cyan">
                <span className="w-2 h-2 rounded-full bg-biolum-cyan inline-block" />
                <span>DO</span>
              </span>
              <span className="flex items-center space-x-1 text-indigo-400">
                <span className="w-2 h-2 rounded-full bg-indigo-400 inline-block" />
                <span>pH</span>
              </span>
            </div>
          </div>
        ) : (
          <div className="w-full h-36 flex items-center justify-center text-xs text-slate-500 font-mono bg-navy-950 rounded-xl border border-surface-border">
            Accumulating packet history buffer... ({chartData.length} packets recorded)
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* 6. Active Explainable Anomaly Events Panel                          */}
      {/* =================================================================== */}
      <div className="p-5 rounded-2xl bg-surface-card border border-surface-border shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-surface-border pb-3">
          <div className="flex items-center space-x-2.5">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-bold text-white font-mono uppercase">
              Explainable IoT Anomaly Detection Engine
            </h3>
          </div>
          <span className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-bold ${
            hasAnomalies 
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
          }`}>
            {hasAnomalies ? `${anomalies.length} ACTIVE ANOMALIES` : '0 ANOMALIES (ALL NOMINAL)'}
          </span>
        </div>

        {hasAnomalies ? (
          <div className="space-y-3">
            {anomalies.map((anom) => (
              <div
                key={anom.anomaly_id}
                className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/40 shadow-sm space-y-2 text-xs font-mono"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-500/20 pb-2">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                      {anom.severity}
                    </span>
                    <span className="font-bold text-white text-sm">{anom.sensor_name}</span>
                    <span className="text-slate-400">({anom.detection_rule})</span>
                  </div>
                  <div className="text-slate-400 text-[11px]">
                    Observed: <strong className="text-amber-300">{anom.observed_value.toFixed(2)} {anom.unit}</strong> (Expected: {anom.expected_range.min} - {anom.expected_range.max} {anom.unit})
                  </div>
                </div>

                <p className="text-slate-300 font-sans text-xs leading-relaxed">
                  {anom.explanation}
                </p>

                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10px] text-slate-400 border-t border-amber-500/10">
                  <div className="flex items-center space-x-3">
                    <span>Confidence: <strong className="text-emerald-400">{(anom.confidence * 100).toFixed(0)}%</strong></span>
                    <span>Uncertainty: <strong className="text-slate-300">±{(anom.uncertainty * 100).toFixed(0)}%</strong></span>
                    <span>Data Mode: <strong className="text-amber-300">{anom.data_mode}</strong></span>
                  </div>
                  <div className="text-slate-500">
                    ID: {anom.anomaly_id}
                  </div>
                </div>

                {/* Compliance Disclaimer */}
                <div className="p-2.5 rounded-lg bg-navy-950/90 border border-amber-500/30 text-[10px] text-amber-200/90 font-sans leading-tight">
                  <span className="font-bold">⚠️ Scientific Disclosure: </span>
                  {anom.compliance_disclaimer}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 flex items-center space-x-3 text-xs text-emerald-300 font-mono">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <div>
              <div className="font-bold text-white">Nominal Baseline Operational</div>
              <p className="text-slate-400 text-[11px] mt-0.5">
                All 7 in-situ physical transducer channels are oscillating smoothly within natural tropical reef ecological thresholds.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* 7. Collapsible Baseline Stations Grid (Preserving Legacy Buoys)     */}
      {/* =================================================================== */}
      <div className="p-5 rounded-2xl bg-surface-card border border-surface-border shadow-xl space-y-4">
        <div 
          onClick={() => setShowBaselineStations(!showBaselineStations)}
          className="flex items-center justify-between cursor-pointer select-none"
        >
          <div className="flex items-center space-x-2.5">
            <Radio className="w-4 h-4 text-ocean-400" />
            <h3 className="text-sm font-bold text-white font-mono uppercase">
              Global Oceanographic Mooring & Argo Float Network ({baselineBuoys.length} Stations)
            </h3>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
              Hardware Gateway: <strong className="text-amber-400">{baselineDeviceStatus?.hardware_connection_status || 'NOT CONNECTED'}</strong>
            </span>
            <button className="text-xs text-slate-400 hover:text-white font-mono flex items-center space-x-1">
              <span>{showBaselineStations ? 'Hide Network' : 'Show Network'}</span>
              {showBaselineStations ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {showBaselineStations && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {baselineBuoys.map((buoy) => (
              <div
                key={buoy.buoy_id}
                className="p-4 rounded-xl bg-navy-950 border border-surface-border space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 border-b border-surface-border pb-2">
                    <div>
                      <span className="text-[10px] font-mono text-ocean-400 font-bold block">{buoy.buoy_id}</span>
                      <h4 className="text-sm font-bold text-white mt-0.5">{buoy.station_name}</h4>
                      <span className="text-[11px] text-slate-400 font-mono">{buoy.deployment_program}</span>
                    </div>
                    <DataTierBadge tier={buoy.data_mode || 'SIMULATED'} />
                  </div>

                  <div className="flex items-center space-x-2 text-[11px] text-slate-300 font-mono mt-2">
                    <MapPin className="w-3.5 h-3.5 text-biolum-cyan" />
                    <span>Coordinates: {buoy.latitude.toFixed(4)}°, {buoy.longitude.toFixed(4)}°</span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 pt-2 text-center font-mono">
                    <div className="p-2 rounded bg-navy-900 border border-surface-border">
                      <span className="text-[9px] text-slate-400 block uppercase">SST</span>
                      <span className="text-xs font-bold text-white">{buoy.sea_surface_temp_c.toFixed(1)}°C</span>
                    </div>
                    <div className="p-2 rounded bg-navy-900 border border-surface-border">
                      <span className="text-[9px] text-slate-400 block uppercase">Wave</span>
                      <span className="text-xs font-bold text-biolum-cyan">{buoy.wave_height_meters.toFixed(1)}m</span>
                    </div>
                    <div className="p-2 rounded bg-navy-900 border border-surface-border">
                      <span className="text-[9px] text-slate-400 block uppercase">Period</span>
                      <span className="text-xs font-bold text-slate-200">{buoy.wave_period_sec.toFixed(1)}s</span>
                    </div>
                    <div className="p-2 rounded bg-navy-900 border border-surface-border">
                      <span className="text-[9px] text-slate-400 block uppercase">Wind</span>
                      <span className="text-xs font-bold text-amber-400">{buoy.wind_speed_knots.toFixed(1)}kt</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-surface-border flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <div className="flex items-center space-x-2">
                    <Battery className="w-3 h-3 text-emerald-400" />
                    <span>{buoy.battery_pct}%</span>
                    <Sun className="w-3 h-3 text-amber-400 ml-1" />
                    <span>{buoy.solar_yield_watts}W</span>
                  </div>
                  <span>{buoy.last_transmission ? new Date(buoy.last_transmission).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Model'} UTC</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
