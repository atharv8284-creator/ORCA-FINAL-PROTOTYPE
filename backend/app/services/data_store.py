import math
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any
from app.schemas.marine import (
    MarineZone, MarineAgent, EcosystemTelemetry, 
    AgentReasoningLog, ReasoningChainStep, EcologicalAlert
)

class MarineDataStore:
    """
    Geospatial Data Store for ORCA Marine Ecosystem.
    Provides PostGIS-compatible spatial indexing, query interfaces,
    and realistic hydrographic telemetry.
    """
    def __init__(self):
        self._init_data()

    def _init_data(self):
        now = datetime.now(timezone.utc)
        
        # 1. Marine Protected & Biome Zones
        self.zones: Dict[str, MarineZone] = {
            "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c01": MarineZone(
                id="a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c01",
                code="ZONE-GBR-01",
                name="Great Barrier Reef - Ribbon Reef Sector",
                designation="Coral Reef Sanctuary",
                description="Northern outer shelf coral ecosystem subjected to recurrent thermal anomalies and marine heatwaves.",
                area_sq_km=2840.50,
                health_score=72.4,
                risk_level="MODERATE",
                latitude=-15.4200,
                longitude=145.8500,
                boundary_coordinates=[
                    [-15.30, 145.70],
                    [-15.30, 146.00],
                    [-15.55, 146.00],
                    [-15.55, 145.70],
                    [-15.30, 145.70]
                ],
                created_at=now - timedelta(days=60)
            ),
            "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c02": MarineZone(
                id="a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c02",
                code="ZONE-GAL-02",
                name="Galapagos Marine Reserve - Darwin & Wolf Sanctuary",
                designation="Marine Protected Area",
                description="High-biodiversity pelagic hub for apex predators and hammerhead shark migrations.",
                area_sq_km=4120.00,
                health_score=91.8,
                risk_level="LOW",
                latitude=1.6800,
                longitude=-91.8200,
                boundary_coordinates=[
                    [1.50, -92.00],
                    [1.50, -91.60],
                    [1.85, -91.60],
                    [1.85, -92.00],
                    [1.50, -92.00]
                ],
                created_at=now - timedelta(days=90)
            ),
            "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c03": MarineZone(
                id="a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c03",
                code="ZONE-RAJA-03",
                name="Raja Ampat Coral Triangle - Misool Biome",
                designation="Benthic Coral Hotspot",
                description="World epicenter of marine biodiversity, monitored for ocean acidification and blue carbon sinks.",
                area_sq_km=1950.25,
                health_score=88.5,
                risk_level="LOW",
                latitude=-2.1500,
                longitude=130.2500,
                boundary_coordinates=[
                    [-2.00, 130.10],
                    [-2.00, 130.40],
                    [-2.30, 130.40],
                    [-2.30, 130.10],
                    [-2.00, 130.10]
                ],
                created_at=now - timedelta(days=45)
            ),
            "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c04": MarineZone(
                id="a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c04",
                code="ZONE-SAR-04",
                name="Sargasso Sea Floating Forest Sanctuary",
                designation="Pelagic Gyre Conservation Area",
                description="Open ocean floating sargassum nursery, under heavy stress from plastic convergence and warming SST.",
                area_sq_km=6500.00,
                health_score=58.2,
                risk_level="HIGH",
                latitude=28.3000,
                longitude=-64.5000,
                boundary_coordinates=[
                    [27.80, -65.00],
                    [27.80, -64.00],
                    [28.80, -64.00],
                    [28.80, -65.00],
                    [27.80, -65.00]
                ],
                created_at=now - timedelta(days=30)
            ),
            "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c05": MarineZone(
                id="a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c05",
                code="ZONE-BALT-05",
                name="Baltic Gotland Basin Dead Zone",
                designation="Hypoxic Remediation Area",
                description="Stratified seabed experiencing acute seasonal hypoxia and low dissolved oxygen.",
                area_sq_km=3200.75,
                health_score=44.1,
                risk_level="CRITICAL",
                latitude=57.3000,
                longitude=19.2000,
                boundary_coordinates=[
                    [56.90, 18.80],
                    [56.90, 19.60],
                    [57.70, 19.60],
                    [57.70, 18.80],
                    [56.90, 18.80]
                ],
                created_at=now - timedelta(days=120)
            )
        }

        # 2. Collaborative Marine Autonomous Agents
        self.agents: Dict[str, MarineAgent] = {
            "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d01": MarineAgent(
                id="b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d01",
                agent_id="ORCA-AG-01",
                name="Nautilus Sentinel-Alpha",
                agent_type="REEF_SENTINEL",
                status="ACTIVE",
                battery_percentage=94.5,
                latitude=-15.4150,
                longitude=145.8320,
                depth_meters=12.4,
                assigned_zone_id="a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c01",
                capabilities=[
                    "Multi-spectral coral scanning",
                    "Zooxanthellae density estimation",
                    "Turbidity profiling"
                ],
                last_heartbeat=now - timedelta(minutes=2),
                metadata={"firmware": "v3.2.1-orca", "mission": "Continuous Bleaching Surveillance"}
            ),
            "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d02": MarineAgent(
                id="b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d02",
                agent_id="ORCA-AG-02",
                name="HydroThermal Recon-02",
                agent_type="THERMAL_SCANNER",
                status="INVESTIGATING",
                battery_percentage=82.0,
                latitude=-15.4380,
                longitude=145.8650,
                depth_meters=25.0,
                assigned_zone_id="a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c01",
                capabilities=[
                    "Thermocline inversion tracking",
                    "Degree Heating Week (DHW) calculation",
                    "Internal wave detection"
                ],
                last_heartbeat=now - timedelta(minutes=1),
                metadata={"firmware": "v3.1.8-orca", "mission": "Thermal Plume Mapping"}
            ),
            "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d03": MarineAgent(
                id="b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d03",
                agent_id="ORCA-AG-03",
                name="Apex Acoustic Glider-03",
                agent_type="ACOUSTIC_PROFILER",
                status="ACTIVE",
                battery_percentage=89.2,
                latitude=1.6920,
                longitude=-91.8350,
                depth_meters=45.5,
                assigned_zone_id="a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c02",
                capabilities=[
                    "Passive hydrophone beamforming",
                    "Cetacean vocalization classifier",
                    "Vessel propeller acoustic signature"
                ],
                last_heartbeat=now - timedelta(minutes=4),
                metadata={"firmware": "v3.4.0-orca", "mission": "Dark Vessel and Mega-fauna Guard"}
            ),
            "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d04": MarineAgent(
                id="b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d04",
                agent_id="ORCA-AG-04",
                name="Blue Carbon Observer-04",
                agent_type="CARBON_SINK_OBSERVER",
                status="ACTIVE",
                battery_percentage=96.0,
                latitude=-2.1420,
                longitude=130.2650,
                depth_meters=18.0,
                assigned_zone_id="a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c03",
                capabilities=[
                    "Dissolved inorganic carbon profiling",
                    "Seagrass bed biomass assessment",
                    "pH fluctuation analysis"
                ],
                last_heartbeat=now - timedelta(minutes=3),
                metadata={"firmware": "v3.2.0-orca", "mission": "Blue Carbon Sequestration Rate"}
            ),
            "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d05": MarineAgent(
                id="b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d05",
                agent_id="ORCA-AG-05",
                name="Anoxia Profiler Drone-05",
                agent_type="PATROL_SWARM",
                status="WARNING",
                battery_percentage=68.5,
                latitude=57.3100,
                longitude=19.2150,
                depth_meters=75.0,
                assigned_zone_id="a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c05",
                capabilities=[
                    "Dissolved oxygen gradient probing",
                    "Benthic methane sniff",
                    "Hydrogen sulfide sensor array"
                ],
                last_heartbeat=now - timedelta(minutes=1),
                metadata={"firmware": "v3.3.4-orca", "mission": "Deep Benthic Anoxia Boundary Tracking"}
            ),
            "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d06": MarineAgent(
                id="b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d06",
                agent_id="ORCA-AG-06",
                name="AIS Surface Sentinel-06",
                agent_type="AIS_SURFACE_MONITOR",
                status="ACTIVE",
                battery_percentage=98.0,
                latitude=1.3000,
                longitude=103.8500,
                depth_meters=0.0,
                assigned_zone_id="a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c01",
                capabilities=[
                    "ITU-R M.1371 transponder decoding",
                    "AIS signal gap & dark vessel triage",
                    "Maritime kinematic trajectory tracking",
                    "Sanctuary perimeter intrusion guard"
                ],
                last_heartbeat=now - timedelta(seconds=30),
                metadata={
                    "firmware": "v3.5.0-orca-ais",
                    "mission": "Spaceborne & Coastal AIS Corroboration",
                    "provider": "Provider-Independent AIS Adapter"
                }
            )
        }

        # 3. Time-Series Telemetry
        self.telemetry: List[EcosystemTelemetry] = []
        for i in range(12):
            t_time = now - timedelta(hours=(11 - i))
            self.telemetry.append(EcosystemTelemetry(
                id=f"telem-gbr-{i}",
                zone_id="a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c01",
                recorded_at=t_time,
                water_temperature_c=round(29.0 + (i * 0.18), 2),
                dissolved_oxygen_mg_l=round(6.2 - (i * 0.11), 2),
                ph_level=round(8.12 - (i * 0.012), 2),
                salinity_psu=round(35.0 + (i * 0.04), 2),
                turbidity_ntu=round(1.5 + (i * 0.11), 2),
                chlorophyll_mg_m3=round(0.38 + (i * 0.012), 2),
                microplastics_index=round(12.0 + (i * 0.5), 1),
                acoustic_noise_db=round(41.0 + (i * 0.6), 1)
            ))
            self.telemetry.append(EcosystemTelemetry(
                id=f"telem-balt-{i}",
                zone_id="a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c05",
                recorded_at=t_time,
                water_temperature_c=round(15.5 + (i * 0.08), 2),
                dissolved_oxygen_mg_l=round(2.6 - (i * 0.11), 2),
                ph_level=round(7.68 - (i * 0.018), 2),
                salinity_psu=7.8,
                turbidity_ntu=round(5.8 + (i * 0.14), 2),
                chlorophyll_mg_m3=round(1.8 + (i * 0.04), 2),
                microplastics_index=round(35.0 + (i * 0.6), 1),
                acoustic_noise_db=round(58.0 + (i * 0.4), 1)
            ))

        # 4. Agent Reasoning Logs
        self.reasoning_logs: List[AgentReasoningLog] = [
            AgentReasoningLog(
                id="log-001",
                agent_id="b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d01",
                agent_name="Nautilus Sentinel-Alpha",
                zone_id="a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c01",
                zone_name="Great Barrier Reef - Ribbon Reef Sector",
                timestamp=now - timedelta(minutes=45),
                observation="Continuous water temperature at 31.1°C exceeds localized Climatological MMM by +1.9°C over 72 hours.",
                hypothesis="Early-stage thermal stress induced zooxanthellae photodamage with 70% probability of Acropora coral bleaching onset.",
                reasoning_chain=[
                    ReasoningChainStep(step=1, agent="ORCA-AG-01", claim="Upper coral canopy reflectivity indicates chlorophyll loss."),
                    ReasoningChainStep(step=2, agent="ORCA-AG-02", claim="Confirmed thermocline depth collapsed to 8m, trapping high thermal energy."),
                    ReasoningChainStep(step=3, consensus="Joint assessment computes Degree Heating Weeks index at 4.2 DHW (Level 1 Alert).")
                ],
                consensus_action="Dispatch swarm gliders to create localized shading micro-bubbles and notify Great Barrier Reef Marine Park Authority (GBRMPA).",
                confidence_score=92.5,
                severity="ELEVATED"
            ),
            AgentReasoningLog(
                id="log-002",
                agent_id="b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d05",
                agent_name="Anoxia Profiler Drone-05",
                zone_id="a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c05",
                zone_name="Baltic Gotland Basin Dead Zone",
                timestamp=now - timedelta(minutes=20),
                observation="Dissolved oxygen levels plunged to 1.4 mg/L at 75m benthic layer with elevated H2S plume detection.",
                hypothesis="Severe benthic asphyxiation boundary expanding upwards into demersal cod habitat due to stagnant pycnocline.",
                reasoning_chain=[
                    ReasoningChainStep(step=1, agent="ORCA-AG-05", claim="Sub-surface sonde detected dissolved oxygen < 2.0 mg/L threshold."),
                    ReasoningChainStep(step=2, agent="ORCA-AG-05", claim="Zero demersal fish acoustics detected in a 1.2 nautical mile radius."),
                    ReasoningChainStep(step=3, consensus="Trigger immediate hypoxic dead zone alert to Baltic Marine Environment Commission (HELCOM).")
                ],
                consensus_action="Activate robotic benthic oxygenation bubblers and flag high priority exclusion corridor for commercial trawling.",
                confidence_score=97.0,
                severity="CRITICAL"
            ),
            AgentReasoningLog(
                id="log-003",
                agent_id="b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d03",
                agent_name="Apex Acoustic Glider-03",
                zone_id="a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c02",
                zone_name="Galapagos Marine Reserve - Darwin & Wolf Sanctuary",
                timestamp=now - timedelta(minutes=10),
                observation="Acoustic array detected low-frequency cavitation signature (125 rpm) 3.2 nm inside restricted sanctuary boundary without AIS ping.",
                hypothesis="Suspected unflagged longline vessel operating in protected hammerhead shark migratory corridor.",
                reasoning_chain=[
                    ReasoningChainStep(step=1, agent="ORCA-AG-03", claim="Hydrophone triangulated propulsion signature moving southwest at 8.4 knots."),
                    ReasoningChainStep(step=2, agent="ORCA-AG-03", claim="Absence of AIS broadcast verified via satellite cross-reference.")
                ],
                consensus_action="Transmit coordinate telemetry to Ecuadorian Coast Guard and maneuver autonomous patrol drone for visual snapshot.",
                confidence_score=94.0,
                severity="ELEVATED"
            )
        ]

        # 5. Ecological Alerts
        self.alerts: List[EcologicalAlert] = [
            EcologicalAlert(
                id="alert-001",
                zone_id="a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c01",
                zone_name="Great Barrier Reef - Ribbon Reef Sector",
                alert_type="CORAL_BLEACHING_RISK",
                severity="HIGH",
                title="Thermal Stress Anomaly: Ribbon Reef Sector",
                description="Prolonged marine heatwave (+1.9°C anomaly) with DHW index reaching 4.2 °C-weeks. Severe risk for branching Acropora corals.",
                recommended_mitigation="Deploy artificial upwelling and alert regional conservation management to restrict tourism vessel emissions.",
                status="ACTIVE",
                triggered_by_agent="Nautilus Sentinel-Alpha",
                created_at=now - timedelta(minutes=45)
            ),
            EcologicalAlert(
                id="alert-002",
                zone_id="a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c05",
                zone_name="Baltic Gotland Basin Dead Zone",
                alert_type="HYPOXIC_DEAD_ZONE",
                severity="CRITICAL",
                title="Severe Benthic Anoxia Event (1.4 mg/L DO)",
                description="Critical drop in dissolved oxygen across Gotland Basin seabed below lethal threshold for benthic fauna.",
                recommended_mitigation="Implement emergency acoustic deterrence to guide pelagic fish away from anoxic basin and activate oxygenation diffusers.",
                status="ACTIVE",
                triggered_by_agent="Anoxia Profiler Drone-05",
                created_at=now - timedelta(minutes=20)
            ),
            EcologicalAlert(
                id="alert-003",
                zone_id="a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c04",
                zone_name="Sargasso Sea Floating Forest Sanctuary",
                alert_type="PLASTIC_CONVERGENCE",
                severity="MEDIUM",
                title="High Microplastic Entrainment in Sargassum Mats",
                description="Microplastics index 78.5/100 detected within pelagic sargassum nursery, threatening juvenile sea turtle foraging.",
                recommended_mitigation="Direct autonomous surface skimmer drones to intercept accumulation convergence lines.",
                status="ACTIVE",
                triggered_by_agent=None,
                created_at=now - timedelta(hours=2)
            )
        ]

    # --- Query Methods ---
    def get_all_zones(self, risk_level: Optional[str] = None) -> List[MarineZone]:
        results = list(self.zones.values())
        if risk_level:
            results = [z for z in results if z.risk_level.upper() == risk_level.upper()]
        return results

    def get_zone(self, zone_id: str) -> Optional[MarineZone]:
        return self.zones.get(zone_id)

    def get_all_agents(self) -> List[MarineAgent]:
        return list(self.agents.values())

    def get_agent(self, agent_id: str) -> Optional[MarineAgent]:
        for a in self.agents.values():
            if a.agent_id == agent_id or a.id == agent_id:
                return a
        return None

    def update_agent_status(self, agent_id: str, status: str) -> Optional[MarineAgent]:
        agent = self.get_agent(agent_id)
        if agent:
            agent.status = status
            agent.last_heartbeat = datetime.now(timezone.utc)
        return agent

    def get_telemetry_for_zone(self, zone_id: str) -> List[EcosystemTelemetry]:
        return [t for t in self.telemetry if t.zone_id == zone_id]

    def get_latest_telemetry(self) -> List[EcosystemTelemetry]:
        latest_map: Dict[str, EcosystemTelemetry] = {}
        for t in self.telemetry:
            if t.zone_id not in latest_map or t.recorded_at > latest_map[t.zone_id].recorded_at:
                latest_map[t.zone_id] = t
        return list(latest_map.values())

    def get_reasoning_logs(self, limit: int = 10) -> List[AgentReasoningLog]:
        return sorted(self.reasoning_logs, key=lambda x: x.timestamp, reverse=True)[:limit]

    def add_reasoning_log(self, log: AgentReasoningLog):
        self.reasoning_logs.insert(0, log)

    def get_alerts(self, status: Optional[str] = None) -> List[EcologicalAlert]:
        if status:
            return [a for a in self.alerts if a.status.upper() == status.upper()]
        return self.alerts

    def update_alert_status(self, alert_id: str, new_status: str) -> Optional[EcologicalAlert]:
        for alert in self.alerts:
            if alert.id == alert_id:
                alert.status = new_status
                return alert
        return None

    # PostGIS Haversine Distance helper for spatial proximity
    @staticmethod
    def calculate_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        R = 6371.0 # Earth's radius in km
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c

# Global singleton store
data_store = MarineDataStore()
