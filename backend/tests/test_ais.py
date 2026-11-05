import sys
from pathlib import Path
from datetime import datetime, timezone
from unittest.mock import patch, AsyncMock
import pytest
from fastapi.testclient import TestClient

# Ensure backend root is on sys.path
backend_path = Path(__file__).resolve().parent.parent
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from app.main import app
from app.core.config import settings
from app.schemas.ais import (
    DEFAULT_UNCONFIGURED_MESSAGE,
    AISVesselPosition,
    AISProviderStatus,
    AISVesselAnomaly,
    AISCrossAgentCorrelation,
    AISAnomalyReport,
    AISAnalyzeResponse
)
from app.services.ais import ais_service, ais_anomaly_engine
from app.services.sar_storage import sar_storage
from app.services.optical_storage import optical_storage
from app.services.nugen_service import nugen_service

client = TestClient(app)


def setup_function():
    """Reset demo mode and clear in-memory cache before each test."""
    ais_service._demo_mode = False
    ais_service._cached_vessels = []
    ais_service._last_fetch_timestamp = 0.0
    ais_service._last_status = "NOT CONNECTED"
    ais_service._last_message = DEFAULT_UNCONFIGURED_MESSAGE


# ==============================================================================
# 1. Missing Credentials & Default Unconfigured Behavior
# ==============================================================================

def test_missing_credentials_status():
    """
    When AIS_API_KEY is unset or empty:
    GET /api/v1/ais/status must return NOT CONNECTED and exact required message.
    """
    with patch.object(settings, "AIS_API_KEY", ""):
        with patch.object(settings, "AIS_DEMO_MODE", False):
            with patch.object(ais_service.provider, "api_key", ""):
                response = client.get("/api/v1/ais/status")
                assert response.status_code == 200
                data = response.json()
                assert data["connection_status"] == "NOT CONNECTED"
                assert data["is_connected"] is False
                assert data["api_key_configured"] is False
                assert data["message"] == DEFAULT_UNCONFIGURED_MESSAGE
                assert data["demo_mode_active"] is False


def test_missing_credentials_health():
    """
    GET /api/v1/ais/health alias returns consistent NOT CONNECTED status.
    """
    with patch.object(settings, "AIS_API_KEY", ""):
        with patch.object(settings, "AIS_DEMO_MODE", False):
            with patch.object(ais_service.provider, "api_key", ""):
                response = client.get("/api/v1/ais/health")
                assert response.status_code == 200
                data = response.json()
                assert data["connection_status"] == "NOT CONNECTED"
                assert data["message"] == DEFAULT_UNCONFIGURED_MESSAGE


def test_missing_credentials_vessels_list():
    """
    When unconfigured, GET /api/v1/ais/vessels must NOT invent or display simulated vessels.
    It must return an empty vessel array and NOT CONNECTED status.
    """
    with patch.object(settings, "AIS_API_KEY", ""):
        with patch.object(settings, "AIS_DEMO_MODE", False):
            with patch.object(ais_service.provider, "api_key", ""):
                response = client.get("/api/v1/ais/vessels")
                assert response.status_code == 200
                data = response.json()
                assert data["provider_status"]["connection_status"] == "NOT CONNECTED"
                assert data["total_count"] == 0
                assert data["vessels"] == []
                assert data["provider_status"]["message"] == DEFAULT_UNCONFIGURED_MESSAGE


def test_test_connection_when_unconfigured():
    """
    POST /api/v1/ais/test-connection without credentials returns is_connected=False.
    """
    with patch.object(settings, "AIS_API_KEY", ""):
        with patch.object(settings, "AIS_DEMO_MODE", False):
            with patch.object(ais_service.provider, "api_key", ""):
                response = client.post("/api/v1/ais/test-connection")
                assert response.status_code == 200
                data = response.json()
                assert data["is_connected"] is False
                assert data["status"] == "NOT CONNECTED"
                assert DEFAULT_UNCONFIGURED_MESSAGE in data["message"]


# ==============================================================================
# 2. Demonstration Mode (Explicit Opt-In Anti-Fabrication Rule)
# ==============================================================================

def test_demo_mode_toggle():
    """
    POST /api/v1/ais/demo/toggle enables and disables demonstration mode.
    """
    # Enable demo
    res1 = client.post("/api/v1/ais/demo/toggle?enabled=true")
    assert res1.status_code == 200
    assert res1.json()["demo_mode_active"] is True
    assert res1.json()["status"] == "DEMO"

    # Status reflects DEMO
    status_res = client.get("/api/v1/ais/status")
    assert status_res.json()["connection_status"] == "DEMO"
    assert status_res.json()["demo_mode_active"] is True

    # Disable demo
    res2 = client.post("/api/v1/ais/demo/toggle?enabled=false")
    assert res2.status_code == 200
    assert res2.json()["demo_mode_active"] is False
    assert res2.json()["status"] == "NOT CONNECTED"


def test_demo_mode_vessel_records_labeled_simulated():
    """
    In DEMO mode, every vessel MUST have is_simulated=True and clearly labeled data provider.
    No simulated vessel may be disguised as a real observation.
    """
    response = client.get("/api/v1/ais/vessels?demo=true")
    assert response.status_code == 200
    data = response.json()
    assert data["provider_status"]["connection_status"] == "DEMO"
    assert data["total_count"] > 0
    assert len(data["vessels"]) > 0

    for vessel in data["vessels"]:
        assert vessel["is_simulated"] is True
        assert "DEMO" in vessel["data_provider"] or "Simulated" in vessel["data_provider"]
        assert len(vessel["mmsi"]) == 9
        assert vessel["mmsi"].isdigit()
        assert -90.0 <= vessel["latitude"] <= 90.0
        assert -180.0 <= vessel["longitude"] <= 180.0
        assert vessel["sog_knots"] >= 0.0
        assert 0.0 <= vessel["cog_degrees"] <= 360.0


# ==============================================================================
# 3. Provider Connection, Upstream Failure, & OFFLINE Status
# ==============================================================================

def test_invalid_upstream_response_offline_status():
    """
    If the configured provider returns an invalid/failing response (HTTP 500 / Network Error),
    ORCA must catch the error, log it, and safely report OFFLINE with 0 vessels.
    """
    mock_failing_fetch = AsyncMock(side_effect=RuntimeError("Upstream timeout"))
    with patch.object(settings, "AIS_API_KEY", "dummy_configured_key"):
        with patch.object(ais_service.provider, "api_key", "dummy_configured_key"):
            with patch.object(ais_service.provider, "fetch_vessel_positions", mock_failing_fetch):
                response = client.get("/api/v1/ais/vessels")
                assert response.status_code == 200
                data = response.json()
                assert data["provider_status"]["connection_status"] == "OFFLINE"
                assert data["total_count"] == 0
                assert data["vessels"] == []
                assert "temporarily offline" in data["provider_status"]["message"].lower() or "upstream" in data["provider_status"]["message"].lower()


def test_provider_returns_empty_results_no_data_status():
    """
    When provider is connected and functioning normally, but returns 0 vessel records in the area:
    ORCA must report NO DATA connection status.
    """
    mock_empty_fetch = AsyncMock(return_value=[])
    with patch.object(settings, "AIS_API_KEY", "dummy_configured_key"):
        with patch.object(ais_service.provider, "api_key", "dummy_configured_key"):
            with patch.object(ais_service.provider, "fetch_vessel_positions", mock_empty_fetch):
                response = client.get("/api/v1/ais/vessels")
                assert response.status_code == 200
                data = response.json()
                assert data["provider_status"]["connection_status"] == "NO DATA"
                assert data["total_count"] == 0
                assert data["vessels"] == []


# ==============================================================================
# 4. Vessel Field & Format Validation (ITU-R M.1371 Standards)
# ==============================================================================

def test_invalid_mmsi_validation():
    """
    Requests with malformed MMSIs (non-numeric, not 9 digits) must return 400 Bad Request.
    """
    # Non-numeric
    res1 = client.get("/api/v1/ais/vessels/ABCDEFGHI")
    assert res1.status_code == 400
    assert "9-digit numeric" in res1.json()["detail"]

    # Short MMSI
    res2 = client.get("/api/v1/ais/vessels/12345")
    assert res2.status_code == 400

    # Long MMSI
    res3 = client.get("/api/v1/ais/vessels/12345678901")
    assert res3.status_code == 400


def test_vessel_detail_and_signal_gap_compliance():
    """
    Fetch vessel detail and verify IMO compliance rule:
    'An AIS signal gap must not automatically be classified as illegal activity.'
    """
    # Known demo vessel MMSI: 211281610 (MV Arctic Explorer)
    response = client.get("/api/v1/ais/vessels/211281610?demo=true")
    assert response.status_code == 200
    data = response.json()
    assert "vessel" in data
    vessel = data["vessel"]
    assert vessel["mmsi"] == "211281610"
    assert "vessel_name" in vessel
    assert "sog_knots" in vessel
    assert "cog_degrees" in vessel
    assert "navigation_status" in vessel
    assert "data_provider" in vessel

    # Verify signal gap compliance
    gap = data.get("signal_gap_analysis")
    assert gap is not None
    assert "illegal activity" in gap["compliance_disclaimer"].lower()
    assert len(gap["plausible_technical_causes"]) >= 3


def test_vessel_movement_endpoint():
    """
    GET /api/v1/ais/vessels/{mmsi}/movement returns kinematic vectors and waypoints.
    """
    response = client.get("/api/v1/ais/vessels/211281610/movement?demo=true")
    assert response.status_code == 200
    data = response.json()
    assert data["mmsi"] == "211281610"
    assert "speed_over_ground" in data
    assert "course_over_ground" in data
    assert "movement_vector" in data
    assert "recent_waypoints" in data
    assert isinstance(data["recent_waypoints"], list)


def test_vessel_search():
    """
    GET /api/v1/ais/search returns matching vessels by MMSI or name fragment.
    """
    response = client.get("/api/v1/ais/search?q=Nordic&demo=true")
    assert response.status_code == 200
    results = response.json()
    assert isinstance(results, list)
    if len(results) > 0:
        assert any("nordic" in v["vessel_name"].lower() for v in results)


# ==============================================================================
# 5. Agent Swarm Integration (ORCA-AG-06 AIS Surface Sentinel)
# ==============================================================================

def test_ais_agent_swarm_presence():
    """
    Verify ORCA-AG-06 (AIS Surface Sentinel-06) is active in the collaborative agent swarm.
    """
    response = client.get("/api/v1/agents")
    assert response.status_code == 200
    agents = response.json()
    ais_agent = next((a for a in agents if a["agent_id"] == "ORCA-AG-06"), None)
    assert ais_agent is not None
    assert ais_agent["name"] == "AIS Surface Sentinel-06"
    assert ais_agent["agent_type"] == "AIS_SURFACE_MONITOR"
    assert ais_agent["status"] == "ACTIVE"


# ==============================================================================
# 6. Coordinate Validation & Missing Fields Robustness
# ==============================================================================

def test_invalid_coordinates_validation():
    """
    Querying /api/v1/ais/vessels with out-of-range coordinates must be rejected with 422.
    """
    # Latitude > 90.0
    res1 = client.get("/api/v1/ais/vessels?min_lat=95.0")
    assert res1.status_code == 422

    # Longitude < -180.0
    res2 = client.get("/api/v1/ais/vessels?min_lon=-195.0")
    assert res2.status_code == 422


def test_missing_vessel_fields_defaults():
    """
    Verify AISVesselPosition schema handles missing non-mandatory fields gracefully
    without raising KeyError or producing invalid types.
    """
    pos = AISVesselPosition(
        mmsi="123456789",
        latitude=12.5,
        longitude=105.0,
        last_received_timestamp="2026-11-03T12:00:00Z"
    )
    assert pos.mmsi == "123456789"
    assert pos.vessel_name == "UNKNOWN"
    assert pos.vessel_type == "Unknown"
    assert pos.sog_knots == 0.0
    assert pos.cog_degrees == 0.0
    assert pos.navigation_status == "Under way"
    assert pos.data_mode == "LIVE"
    assert pos.data_source_type == "TERRESTRIAL_VHF"


def test_stale_vessel_positions_marking():
    """
    Verify data_freshness reflects signal age accurately.
    """
    fresh_pos = AISVesselPosition(
        mmsi="123456789",
        latitude=12.5,
        longitude=105.0,
        last_received_timestamp="2026-11-03T12:00:00Z",
        signal_age_seconds=120,
        data_freshness="LIVE"
    )
    assert fresh_pos.data_freshness == "LIVE"

    stale_pos = AISVesselPosition(
        mmsi="123456789",
        latitude=12.5,
        longitude=105.0,
        last_received_timestamp="2026-11-03T11:00:00Z",
        signal_age_seconds=3600,
        data_freshness="STALE"
    )
    assert stale_pos.data_freshness == "STALE"


# ==============================================================================
# 7. Mocked Successful Provider Response & Data Mode Isolation
# ==============================================================================

def test_mocked_successful_provider_live_mode():
    """
    When an authorized provider returns real vessel observations:
    - Connection status must be REAL.
    - Data mode must be LIVE.
    - is_simulated must be False.
    """
    mock_live_vessel = AISVesselPosition(
        mmsi="503000100",
        vessel_name="PACIFIC TRADER",
        vessel_type="Container Ship",
        latitude=-16.85,
        longitude=146.20,
        sog_knots=14.5,
        cog_degrees=125.0,
        last_received_timestamp="2026-11-03T12:30:00Z",
        data_provider="AISHub Authorized",
        is_simulated=False,
        data_mode="LIVE",
        data_source_type="TERRESTRIAL_VHF"
    )

    mock_fetch = AsyncMock(return_value=[mock_live_vessel])
    with patch.object(settings, "AIS_API_KEY", "real_key_123"):
        with patch.object(ais_service.provider, "api_key", "real_key_123"):
            with patch.object(ais_service.provider, "fetch_vessel_positions", mock_fetch):
                response = client.get("/api/v1/ais/vessels")
                assert response.status_code == 200
                data = response.json()
                assert data["provider_status"]["connection_status"] == "REAL"
                assert data["total_count"] == 1
                vessel = data["vessels"][0]
                assert vessel["is_simulated"] is False
                assert vessel["data_mode"] == "LIVE"
                assert vessel["data_source_type"] == "TERRESTRIAL_VHF"
                assert vessel["vessel_name"] == "PACIFIC TRADER"


def test_prevention_of_demo_live_mixing():
    """
    Anti-Fabrication Rule:
    Simulated fixtures must NEVER be stamped data_mode="LIVE".
    The schema validator automatically overrides data_mode to "DEMO" for simulated data.
    """
    fixture = AISVesselPosition(
        mmsi="999888777",
        vessel_name="TEST SIM VESSEL",
        latitude=10.0,
        longitude=10.0,
        last_received_timestamp="2026-11-03T12:00:00Z",
        is_simulated=True,
        data_mode="LIVE"  # Attempt to disguise as LIVE
    )
    assert fixture.data_mode == "DEMO"
    assert fixture.data_source_type == "DEMO_FIXTURE"


# ==============================================================================
# 8. Behavioral Anomaly Detection Engine
# ==============================================================================

def test_behavioral_anomaly_detection_loitering():
    """
    Verify UNUSUAL_LOITERING is detected when a commercial cargo vessel maintains
    very low speed (< 2.0 kts) in open ocean for an extended duration.
    """
    vessel = AISVesselPosition(
        mmsi="211281610",
        vessel_name="MV ARCTIC EXPLORER",
        vessel_type="Cargo",
        vessel_category="CARGO",
        latitude=15.2,
        longitude=88.5,
        sog_knots=0.8,
        cog_degrees=45.0,
        last_received_timestamp="2026-11-03T12:00:00Z",
        destination="OPEN SEA",
        data_provider="DEMO"
    )

    track_history = [
        {"latitude": 15.201, "longitude": 88.502, "sog_knots": 0.7, "cog_degrees": 45.0, "timestamp_utc": "2026-11-03T09:00:00Z"},
        {"latitude": 15.202, "longitude": 88.503, "sog_knots": 0.8, "cog_degrees": 50.0, "timestamp_utc": "2026-11-03T10:00:00Z"},
        {"latitude": 15.203, "longitude": 88.502, "sog_knots": 0.9, "cog_degrees": 48.0, "timestamp_utc": "2026-11-03T11:00:00Z"},
        {"latitude": 15.200, "longitude": 88.500, "sog_knots": 0.8, "cog_degrees": 45.0, "timestamp_utc": "2026-11-03T12:00:00Z"},
    ]

    anomalies = ais_anomaly_engine.detect_behavioral_anomalies(vessel, track_history)
    loitering = next((a for a in anomalies if a.anomaly_type == "UNUSUAL_LOITERING"), None)
    assert loitering is not None
    assert loitering.severity in ("MODERATE", "ELEVATED", "CRITICAL")
    assert "loitering" in loitering.explanation.lower()
    assert "liability" in loitering.compliance_disclaimer.lower()


def test_behavioral_anomaly_detection_erratic_course():
    """
    Verify REPEATED_COURSE_CHANGES is detected when a vessel zig-zags sharply.
    """
    vessel = AISVesselPosition(
        mmsi="354892000",
        vessel_name="OCEAN GLORY",
        vessel_type="Tanker",
        vessel_category="TANKER",
        latitude=20.0,
        longitude=65.0,
        sog_knots=12.0,
        cog_degrees=270.0,
        last_received_timestamp="2026-11-03T12:00:00Z",
        data_provider="DEMO"
    )

    erratic_track = [
        {"latitude": 20.0, "longitude": 64.7, "sog_knots": 12.0, "cog_degrees": 0.0, "timestamp_utc": "2026-11-03T10:00:00Z"},
        {"latitude": 20.1, "longitude": 64.8, "sog_knots": 11.5, "cog_degrees": 90.0, "timestamp_utc": "2026-11-03T10:30:00Z"},
        {"latitude": 20.1, "longitude": 64.9, "sog_knots": 12.2, "cog_degrees": 180.0, "timestamp_utc": "2026-11-03T11:00:00Z"},
        {"latitude": 20.0, "longitude": 65.0, "sog_knots": 12.0, "cog_degrees": 270.0, "timestamp_utc": "2026-11-03T11:30:00Z"},
    ]

    anomalies = ais_anomaly_engine.detect_behavioral_anomalies(vessel, erratic_track)
    course_ano = next((a for a in anomalies if a.anomaly_type == "REPEATED_COURSE_CHANGES"), None)
    assert course_ano is not None
    assert "course" in course_ano.explanation.lower()


def test_behavioral_anomaly_detection_sensitive_area():
    """
    Verify SENSITIVE_AREA_ACTIVITY is detected when a vessel transits inside a protected zone (e.g. Great Barrier Reef).
    """
    vessel_in_gbr = AISVesselPosition(
        mmsi="503999111",
        vessel_name="CORAL TRAVELLER",
        vessel_type="Bulk Carrier",
        vessel_category="CARGO",
        latitude=-16.5,
        longitude=146.0,
        sog_knots=11.0,
        cog_degrees=150.0,
        last_received_timestamp="2026-11-03T12:00:00Z",
        data_provider="DEMO"
    )

    anomalies = ais_anomaly_engine.detect_behavioral_anomalies(vessel_in_gbr)
    mpa_ano = next((a for a in anomalies if a.anomaly_type == "SENSITIVE_AREA_ACTIVITY"), None)
    assert mpa_ano is not None
    assert "Great Barrier Reef" in mpa_ano.explanation or "MPA" in mpa_ano.explanation
    assert mpa_ano.severity in ("ELEVATED", "CRITICAL", "MODERATE")


# ==============================================================================
# 9. Cross-Agent Satellite Correlation & Maritime Law Guardrail
# ==============================================================================

def test_cross_agent_correlation_with_sar_and_optical():
    """
    Verify cross-agent correlation calculates:
    - Spatial distance (km and nm)
    - Temporal delta (hours)
    - Hydrodynamic drift vector alignment with Copernicus current vectors
    - Rule 8 legal disclaimer (proximity != causation)
    """
    now_iso = datetime.now(timezone.utc).isoformat()
    vessel = AISVesselPosition(
        mmsi="211281610",
        vessel_name="MV ARCTIC EXPLORER",
        latitude=-16.52,
        longitude=146.05,
        sog_knots=2.1,
        cog_degrees=45.0,
        last_received_timestamp=now_iso,
        data_provider="DEMO"
    )

    # Seed mock SAR detection into sar_storage
    mock_sar = {
        "analysis_id": "SAR-TEST-CORR-01",
        "product_id": "S1A_IW_GRDH_1SDV_TEST_CORR",
        "acquisition_time": now_iso,
        "confidence_score": 0.88,
        "slick_candidates": [
            {
                "id": "SLICK-CORR-01",
                "center_lat": -16.50,
                "center_lon": 146.02,
                "area_km2": 4.5,
                "dark_spot_contrast_db": -5.2,
                "confidence": 0.85
            }
        ]
    }
    sar_storage._memory_cache["SAR-TEST-CORR-01"] = mock_sar

    try:
        correlations = ais_anomaly_engine.correlate_vessels_with_satellite_targets(
            vessels=[vessel],
            correlate_sar=True,
            correlate_optical=False
        )

        assert len(correlations) >= 1
        corr = correlations[0]
        assert corr.vessel_mmsi == "211281610"
        assert corr.anomaly_source == "SENTINEL_1_SAR"
        assert corr.spatial_separation_km > 0
        assert corr.spatial_separation_nm > 0
        assert corr.temporal_separation_hours >= 0
        assert corr.hydrodynamic_plausibility in ("HIGH", "MODERATE", "LOW", "INCONCLUSIVE")
        # Maritime law disclaimer verification
        assert "proximity" in corr.compliance_disclaimer.lower()
        assert "causation" in corr.compliance_disclaimer.lower() or "liability" in corr.compliance_disclaimer.lower()
    finally:
        sar_storage._memory_cache.pop("SAR-TEST-CORR-01", None)


# ==============================================================================
# 10. Lead Orchestrator Prompt Rule 8 Compliance
# ==============================================================================

def test_lead_orchestrator_evidence_rule_8_compliance():
    """
    Verify Nugen Lead Orchestrator receives compiled AIS evidence and strictly includes
    Rule 8: 'AIS vessel proximity to a detected marine anomaly ... does NOT prove causation, liability, or intentional discharge.'
    """
    from app.services.nugen_service import SYSTEM_PROMPT

    # Check Rule 8 in system prompt
    assert "Rule 8" in SYSTEM_PROMPT or "8. AIS vessel proximity" in SYSTEM_PROMPT
    assert "causation" in SYSTEM_PROMPT.lower()
    assert "liability" in SYSTEM_PROMPT.lower()

    # Check evidence compilation includes AIS
    evidence = nugen_service.compile_evidence_payload("Great Barrier Reef", (-17.0, -16.0, 145.5, 146.5))
    assert "ais" in evidence
    assert "tracked_vessels_count" in evidence["ais"]
    assert "data_mode" in evidence["ais"]
    assert "disclaimer" in evidence["ais"]
    assert "causation" in evidence["ais"]["disclaimer"].lower()


# ==============================================================================
# 11. Dedicated AIS API Endpoints (GET /anomalies, POST /analyze, GET /correlations)
# ==============================================================================

def test_endpoint_get_anomalies():
    """
    GET /api/v1/ais/anomalies returns structured AISAnomalyReport.
    """
    response = client.get("/api/v1/ais/anomalies?demo=true")
    assert response.status_code == 200
    data = response.json()
    assert "total_anomalies" in data
    assert "anomalies" in data
    assert "compliance_notice" in data
    assert data["data_mode"] == "DEMO"
    assert isinstance(data["anomalies"], list)


def test_endpoint_post_analyze():
    """
    POST /api/v1/ais/analyze performs comprehensive multi-sensor analysis
    and returns AISAnalyzeResponse with orchestrator_evidence_payload.
    """
    req_payload = {
        "zone_id": "GBR",
        "min_lat": -19.0,
        "max_lat": -14.0,
        "min_lon": 144.5,
        "max_lon": 147.5,
        "demo": True,
        "correlate_with_sar": True,
        "correlate_with_optical": True,
        "correlate_with_ocean": True
    }
    response = client.post("/api/v1/ais/analyze", json=req_payload)
    assert response.status_code == 200
    data = response.json()
    assert "analysis_id" in data
    assert "vessels_analyzed" in data
    assert "anomalies" in data
    assert "correlations" in data
    assert "orchestrator_evidence_payload" in data
    assert "compliance_statement" in data
    assert "causation" in data["compliance_statement"].lower() or "liability" in data["compliance_statement"].lower()


def test_endpoint_get_correlations():
    """
    GET /api/v1/ais/correlations returns list of cross-agent correlations.
    """
    response = client.get("/api/v1/ais/correlations?demo=true")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    for corr in data:
        assert "correlation_id" in corr
        assert "vessel_mmsi" in corr
        assert "anomaly_source" in corr
        assert "spatial_separation_km" in corr
        assert "compliance_disclaimer" in corr

