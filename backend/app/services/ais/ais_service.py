import time
import logging
from typing import List, Optional, Tuple, Dict, Any
from datetime import datetime, timezone

from app.core.config import settings
from app.schemas.ais import (
    AISVesselPosition,
    AISVesselMovement,
    AISProviderStatus,
    AISQueryFilter,
    AISVesselResponse,
    AISSignalGapAnalysis,
    AISVesselAnomaly,
    AISAnomalyReport,
    AISCrossAgentCorrelation,
    AISAnalyzeRequest,
    AISAnalyzeResponse,
    DEFAULT_UNCONFIGURED_MESSAGE
)
from app.services.ais.base import BaseAISProvider
from app.services.ais.aishub_adapter import AISHubAdapter
from app.services.ais.marinetraffic_adapter import MarineTrafficAdapter
from app.services.ais.demo_adapter import DemoAISProvider
from app.services.ais.ais_storage import ais_storage
from app.services.ais.ais_anomaly_engine import ais_anomaly_engine

logger = logging.getLogger(__name__)


class AISService:
    """
    Central orchestrator for the ORCA AIS Integration Module.
    Features:
    - Provider-independent pluggable architecture (AISHub, MarineTraffic, Custom)
    - 5 precise connection statuses: REAL | NOT CONNECTED | OFFLINE | NO DATA | DEMO
    - Mandatory compliance rule: "An AIS signal gap must not automatically be classified as illegal activity."
    - Strict non-fabrication rule: If no provider credentials, safely reports NOT CONNECTED.
    - Demonstrator mode available strictly upon explicit user activation.
    - Automatic 60-second TTL caching adhering to upstream rate limits.
    """

    def __init__(self):
        self._demo_mode: bool = settings.AIS_DEMO_MODE
        self._provider: BaseAISProvider = self._init_provider()
        self._demo_provider: DemoAISProvider = DemoAISProvider()
        self._cached_vessels: List[AISVesselPosition] = []
        self._last_fetch_timestamp: float = 0.0
        self._last_query_iso: Optional[str] = None
        self._last_status: str = "NOT CONNECTED"
        self._last_message: str = DEFAULT_UNCONFIGURED_MESSAGE

    def _init_provider(self) -> BaseAISProvider:
        """Instantiate configured upstream provider adapter."""
        provider_name = (settings.AIS_PROVIDER or "aishub").lower()
        if provider_name == "marinetraffic":
            return MarineTrafficAdapter(
                api_key=settings.MARINETRAFFIC_API_KEY,
                api_endpoint=settings.MARINETRAFFIC_API_ENDPOINT
            )
        elif provider_name == "demo":
            self._demo_mode = True
            return self._demo_provider
        else:
            # Default to AISHub adapter
            return AISHubAdapter(
                api_key=settings.AIS_API_KEY,
                api_endpoint=settings.AIS_API_ENDPOINT
            )

    @property
    def provider(self) -> BaseAISProvider:
        # Re-check settings dynamically
        curr_provider_name = (settings.AIS_PROVIDER or "aishub").lower()
        if curr_provider_name == "marinetraffic" and not isinstance(self._provider, MarineTrafficAdapter):
            self._provider = self._init_provider()
        elif curr_provider_name == "aishub" and not isinstance(self._provider, AISHubAdapter):
            self._provider = self._init_provider()
        return self._provider

    def is_demo_active(self, query_demo: Optional[bool] = None) -> bool:
        """Return True if demo mode is active globally or requested in query."""
        if query_demo is not None:
            return query_demo
        return self._demo_mode

    def toggle_demo_mode(self, enabled: Optional[bool] = None) -> bool:
        """Explicitly enable or disable demonstration mode."""
        if enabled is not None:
            self._demo_mode = enabled
        else:
            self._demo_mode = not self._demo_mode
        # Clear cache when toggling
        self._cached_vessels = []
        self._last_fetch_timestamp = 0.0
        return self._demo_mode

    def get_provider_status(self, demo: Optional[bool] = None) -> AISProviderStatus:
        """
        Return the provider connection status using exact specification:
        REAL | NOT CONNECTED | OFFLINE | NO DATA | DEMO
        """
        now = time.time()
        elapsed = now - self._last_fetch_timestamp
        ttl = max(10, settings.AIS_CACHE_TTL_SECONDS)
        ttl_remaining = max(0, int(ttl - elapsed)) if self._last_fetch_timestamp > 0 else 0

        demo_active = self.is_demo_active(demo)
        if demo_active:
            return AISProviderStatus(
                provider_name="ORCA Demonstration Transponder Feed",
                is_connected=True,
                connection_status="DEMO",
                message="DEMO MODE ACTIVE: Displaying labeled simulated vessel profiles for UI evaluation. NOT real observations.",
                api_endpoint="internal://orca-demo-ais-feed",
                api_key_configured=True,
                total_vessels_tracked=len(self._cached_vessels) if self._cached_vessels else 5,
                last_query_timestamp=self._last_query_iso or datetime.now(timezone.utc).isoformat(),
                cache_ttl_seconds=ttl,
                cache_ttl_remaining_seconds=0,
                demo_mode_active=True,
                rate_limit_notice="Demonstration mode does not consume upstream API quotas.",
                instructions="Demonstration mode is active. Deactivate in UI or settings to resume authorized feed monitoring."
            )

        active_provider = self.provider
        has_key = active_provider.has_credentials

        if not has_key:
            conn_status = "NOT CONNECTED"
            msg = DEFAULT_UNCONFIGURED_MESSAGE
            is_conn = False
        else:
            conn_status = self._last_status
            msg = self._last_message
            is_conn = conn_status in ("REAL", "NO DATA")

        all_stored = ais_storage.get_all_latest()
        active_count = len(self._cached_vessels) if self._cached_vessels else len(all_stored)

        return AISProviderStatus(
            provider_name=active_provider.provider_name,
            is_connected=is_conn,
            connection_status=conn_status,
            message=msg,
            api_endpoint=active_provider.api_endpoint,
            api_key_configured=has_key,
            total_vessels_tracked=active_count,
            last_query_timestamp=self._last_query_iso,
            cache_ttl_seconds=ttl,
            cache_ttl_remaining_seconds=ttl_remaining,
            demo_mode_active=False,
            rate_limit_notice="Adheres strictly to provider rate-limit conditions (e.g. AISHub 1 query/60s).",
            instructions=(
                "To connect live AIS feeds: Set your authorized API key in backend/.env. "
                "Physical receiver ownership is NOT required. If unconfigured, ORCA safely reports NOT CONNECTED."
            )
        )

    async def check_connection(self, demo: Optional[bool] = None) -> Dict[str, Any]:
        """
        Initiate a live connection check with the upstream provider.
        """
        demo_active = self.is_demo_active(demo)
        if demo_active:
            res = await self._demo_provider.check_connection_status()
            self._last_status = "DEMO"
            self._last_message = res["message"]
            return res

        active_provider = self.provider
        health = await active_provider.check_connection_status()
        self._last_status = health.get("status", "NOT CONNECTED")
        self._last_message = health.get("message", DEFAULT_UNCONFIGURED_MESSAGE)
        return health

    async def get_vessels(self, filters: Optional[AISQueryFilter] = None) -> AISVesselResponse:
        """
        Retrieve and filter vessel positions.
        - If DEMO mode active: returns labeled simulated vessels.
        - If NOT CONNECTED: returns empty list with NOT CONNECTED status.
        - If provider active: returns REAL or NO DATA vessels with caching.
        """
        demo_active = self.is_demo_active(filters.demo if filters else None)
        active_provider = self._demo_provider if demo_active else self.provider

        now = time.time()
        ttl = max(10, settings.AIS_CACHE_TTL_SECONDS)
        elapsed = now - self._last_fetch_timestamp

        bbox = None
        if filters and any([filters.min_lat, filters.max_lat, filters.min_lon, filters.max_lon]):
            if all([filters.min_lat is not None, filters.max_lat is not None, 
                    filters.min_lon is not None, filters.max_lon is not None]):
                bbox = (filters.min_lat, filters.max_lat, filters.min_lon, filters.max_lon)

        # 1. Fetch data if credentials exist or in demo mode
        if demo_active:
            live_vessels = await self._demo_provider.fetch_vessel_positions(bbox=bbox)
            self._cached_vessels = live_vessels
            self._last_status = "DEMO"
            self._last_message = "Demonstration Mode Active"
        elif not active_provider.has_credentials:
            self._last_status = "NOT CONNECTED"
            self._last_message = DEFAULT_UNCONFIGURED_MESSAGE
            self._cached_vessels = []
        elif elapsed >= ttl:
            try:
                live_vessels = await active_provider.fetch_vessel_positions(bbox=bbox, limit=filters.limit if filters else 100)
                self._last_fetch_timestamp = now
                self._last_query_iso = datetime.now(timezone.utc).isoformat()

                if live_vessels:
                    self._cached_vessels = live_vessels
                    self._last_status = "REAL"
                    self._last_message = f"Live feed operational ({len(live_vessels)} vessels)"
                    ais_storage.save_vessels(live_vessels)
                else:
                    self._cached_vessels = []
                    self._last_status = "NO DATA"
                    self._last_message = "Connected to AIS provider, but no vessel records were returned for current coordinates"
            except Exception as e:
                logger.error(f"Error fetching live AIS vessels from upstream provider: {e}")
                self._last_status = "OFFLINE"
                self._last_message = f"Configured AIS provider is temporarily OFFLINE: {e}"
                self._cached_vessels = []

        # 2. Filter vessels
        vessels_to_filter = self._cached_vessels
        filtered = self._apply_filters(vessels_to_filter, filters)

        # 3. Response
        provider_status = self.get_provider_status(demo=demo_active)
        bbox_dict = None
        if filters and filters.min_lat is not None and filters.max_lat is not None:
            bbox_dict = {
                "min_lat": filters.min_lat,
                "max_lat": filters.max_lat,
                "min_lon": filters.min_lon or -180.0,
                "max_lon": filters.max_lon or 180.0
            }

        return AISVesselResponse(
            provider_status=provider_status,
            vessels=filtered[:(filters.limit if filters else 100)],
            total_count=len(vessels_to_filter),
            filtered_count=len(filtered),
            query_timestamp=datetime.now(timezone.utc).isoformat(),
            bounding_box=bbox_dict,
            compliance_notice=(
                "ORCA AIS Vessel Intelligence complies with IMO ITU-R M.1371 standards. "
                "An AIS signal gap must not automatically be classified as illegal activity."
            )
        )

    def _apply_filters(
        self, 
        vessels: List[AISVesselPosition], 
        filters: Optional[AISQueryFilter]
    ) -> List[AISVesselPosition]:
        """Apply search, category, speed, and spatial filters."""
        if not filters:
            return vessels

        result: List[AISVesselPosition] = []
        for v in vessels:
            if filters.mmsi and filters.mmsi.strip() not in v.mmsi:
                continue

            if filters.vessel_name:
                name_q = filters.vessel_name.strip().lower()
                if name_q not in v.vessel_name.lower():
                    continue

            if filters.min_lat is not None and v.latitude < filters.min_lat:
                continue
            if filters.max_lat is not None and v.latitude > filters.max_lat:
                continue
            if filters.min_lon is not None and v.longitude < filters.min_lon:
                continue
            if filters.max_lon is not None and v.longitude > filters.max_lon:
                continue

            if filters.vessel_categories:
                cats = [c.upper() for c in filters.vessel_categories]
                if v.vessel_category.upper() not in cats:
                    continue

            if filters.min_speed_knots is not None and v.sog_knots < filters.min_speed_knots:
                continue
            if filters.max_speed_knots is not None and v.sog_knots > filters.max_speed_knots:
                continue

            if filters.nav_status_codes and v.nav_status_code not in filters.nav_status_codes:
                continue

            result.append(v)

        return result

    async def get_vessel_details(self, mmsi: str, demo: Optional[bool] = None) -> Optional[Dict[str, Any]]:
        """
        Fetch vessel details, track history, and signal gap evaluation.
        """
        clean_mmsi = mmsi.strip()
        demo_active = self.is_demo_active(demo)

        # 1. Search in current memory cache
        vessel = next((v for v in self._cached_vessels if v.mmsi == clean_mmsi), None)

        # 2. Search in demo provider if demo active
        if not vessel and demo_active:
            demo_positions = await self._demo_provider.fetch_vessel_positions()
            vessel = next((v for v in demo_positions if v.mmsi == clean_mmsi), None)

        # 3. Search in persistent storage
        if not vessel:
            vessel = ais_storage.get_vessel_by_mmsi(clean_mmsi)

        if not vessel:
            return None

        track = ais_storage.get_vessel_track(clean_mmsi, limit=50)
        gap_analysis = self.analyze_signal_gap(vessel)

        return {
            "vessel": vessel.model_dump(),
            "track_history": track,
            "signal_gap_analysis": gap_analysis.model_dump()
        }

    async def get_vessel_movement(self, mmsi: str, demo: Optional[bool] = None) -> Optional[AISVesselMovement]:
        """
        Fetch dedicated vessel kinematics and movement information.
        """
        clean_mmsi = mmsi.strip()
        demo_active = self.is_demo_active(demo)

        if demo_active:
            return await self._demo_provider.fetch_vessel_movement(clean_mmsi)

        # Look in cache or storage
        vessel = next((v for v in self._cached_vessels if v.mmsi == clean_mmsi), None)
        if not vessel:
            vessel = ais_storage.get_vessel_by_mmsi(clean_mmsi)

        if not vessel:
            return None

        track = ais_storage.get_vessel_track(clean_mmsi, limit=20)
        return AISVesselMovement(
            mmsi=vessel.mmsi,
            vessel_name=vessel.vessel_name,
            latitude=vessel.latitude,
            longitude=vessel.longitude,
            speed_over_ground=vessel.sog_knots,
            course_over_ground=vessel.cog_degrees,
            heading=vessel.heading,
            navigation_status=vessel.navigation_status,
            last_received_timestamp=vessel.last_received_timestamp,
            data_provider=vessel.data_provider,
            is_simulated=vessel.is_simulated,
            movement_vector={
                "speed_knots": vessel.sog_knots,
                "course_degrees": vessel.cog_degrees,
                "status": vessel.navigation_status
            },
            recent_waypoints=track
        )

    def analyze_signal_gap(self, vessel: AISVesselPosition, threshold_seconds: int = 1800) -> AISSignalGapAnalysis:
        """
        Perform scientific AIS signal gap analysis.
        Strict rule: An AIS signal gap must not automatically be classified as illegal activity.
        """
        now_utc = datetime.now(timezone.utc)
        gap_duration: Optional[float] = None
        has_gap = False

        if vessel.last_received_timestamp:
            try:
                ts_clean = vessel.last_received_timestamp.replace("Z", "+00:00")
                dt = datetime.fromisoformat(ts_clean)
                gap_duration = max(0.0, (now_utc - dt).total_seconds())
                if gap_duration > threshold_seconds:
                    has_gap = True
            except Exception as e:
                logger.debug(f"Could not parse timestamp for signal gap analysis: {e}")

        if not has_gap:
            risk = "NORMAL"
        elif gap_duration and gap_duration < 7200:
            risk = "MONITORED_GAP"
        else:
            risk = "EXTENDED_ABSENCE"

        return AISSignalGapAnalysis(
            mmsi=vessel.mmsi,
            vessel_name=vessel.vessel_name,
            last_received_utc=vessel.last_received_timestamp,
            gap_duration_seconds=round(gap_duration, 1) if gap_duration is not None else None,
            has_signal_gap=has_gap,
            threshold_seconds=threshold_seconds,
            risk_assessment=risk
        )

    def search_vessels(self, query: str, limit: int = 20, demo: Optional[bool] = None) -> List[AISVesselPosition]:
        """Search across vessels by MMSI or name."""
        q = query.strip().lower()
        if not q:
            return []

        pool: List[AISVesselPosition] = list(self._cached_vessels)
        seen_mmsi = {v.mmsi for v in pool}

        for v in ais_storage.get_all_latest():
            if v.mmsi not in seen_mmsi:
                seen_mmsi.add(v.mmsi)
                pool.append(v)

        matches: List[AISVesselPosition] = []
        for v in pool:
            if q in v.mmsi or q in v.vessel_name.lower() or (v.callsign and q in v.callsign.lower()):
                matches.append(v)
                if len(matches) >= limit:
                    break

        return matches

    async def get_anomalies(
        self,
        filters: Optional[AISQueryFilter] = None,
        demo: Optional[bool] = None
    ) -> AISAnomalyReport:
        """
        Evaluate and return explainable vessel behavioural anomalies.
        Strictly observes IMO rules: signal gaps and anomalies are technical indicators,
        not proof of unlawful activity.
        """
        vessels_resp = await self.get_vessels(filters)
        vessels = vessels_resp.vessels

        all_anomalies: List[AISVesselAnomaly] = []
        for v in vessels:
            track = ais_storage.get_vessel_track(v.mmsi, limit=20)
            anoms = ais_anomaly_engine.analyze_vessel_anomalies(v, track_history=track)
            all_anomalies.extend(anoms)

        return AISAnomalyReport(
            total_anomalies=len(all_anomalies),
            anomalies=all_anomalies,
            generated_at=datetime.now(timezone.utc).isoformat(),
            data_mode=vessels_resp.provider_status.connection_status
        )

    async def get_correlations(
        self,
        demo: Optional[bool] = None
    ) -> List[AISCrossAgentCorrelation]:
        """
        Retrieve cross-agent correlations between AIS vessels and satellite / oceanographic data.
        """
        vessels_resp = await self.get_vessels(AISQueryFilter(demo=self.is_demo_active(demo)))
        return ais_anomaly_engine.correlate_with_satellite_and_ocean(vessels_resp.vessels)

    async def analyze_vessels(self, req: AISAnalyzeRequest) -> AISAnalyzeResponse:
        """
        Execute comprehensive vessel intelligence analysis and forward structured evidence
        to the Lead Orchestrator.
        """
        demo_active = self.is_demo_active(req.demo)
        filters = AISQueryFilter(
            min_lat=req.min_lat,
            max_lat=req.max_lat,
            min_lon=req.min_lon,
            max_lon=req.max_lon,
            demo=demo_active,
            limit=200
        )
        vessels_resp = await self.get_vessels(filters)
        vessels = vessels_resp.vessels

        # If not in demo mode and provider is unconfigured, report empty analysis with NOT_CONNECTED
        if not demo_active and not self.provider.has_credentials and not vessels:
            now_str = datetime.now(timezone.utc).isoformat()
            return AISAnalyzeResponse(
                analysis_id=f"AIS-INTEL-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}-UNCONF",
                analyzed_at=now_str,
                data_mode="NOT_CONNECTED",
                vessels_analyzed=0,
                anomalies_detected=0,
                anomalies=[],
                correlations=[],
                orchestrator_evidence_payload={
                    "agent_id": "ORCA-AG-06",
                    "agent_name": "AIS Surface Sentinel-06",
                    "data_mode": "NOT_CONNECTED",
                    "vessels_tracked": 0,
                    "anomalies_count": 0,
                    "cross_agent_correlations_count": 0,
                    "missing_data_reason": "AIS provider not configured. Connect an authorized AIS provider to receive vessel data.",
                    "is_available": False
                },
                compliance_statement="AIS provider not configured. Operating in safe unconfigured state."
            )

        return ais_anomaly_engine.run_comprehensive_analysis(
            vessels=vessels,
            zone_id=getattr(req, "zone_id", None),
            correlate_sar=getattr(req, "correlate_with_sar", getattr(req, "correlate_sar", True)),
            correlate_optical=getattr(req, "correlate_with_optical", getattr(req, "correlate_optical", True)),
            correlate_ocean=getattr(req, "correlate_with_ocean", getattr(req, "correlate_ocean", True))
        )


ais_service = AISService()

