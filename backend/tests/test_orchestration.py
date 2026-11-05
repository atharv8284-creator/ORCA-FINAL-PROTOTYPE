import sys
import asyncio
from pathlib import Path
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, MagicMock
import pytest
from fastapi.testclient import TestClient

backend_path = Path(__file__).resolve().parent.parent
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from app.main import app
from app.schemas.orchestration import (
    UnifiedEvidenceRecord,
    MultiAgentInvestigationRequest,
    FinalMarineIntelligenceAssessment,
    SpatialCorrelationRecord,
    TemporalCorrelationRecord,
    EvidenceQualityAssessment,
)
from app.services.orchestration.spatial_correlation import (
    haversine_distance_km,
    point_in_bbox,
    SpatialCorrelationEngine,
)
from app.services.orchestration.temporal_correlation import (
    parse_to_utc,
    calculate_freshness,
    TemporalCorrelationEngine,
)
from app.services.orchestration.quality_uncertainty import QualityUncertaintyEngine
from app.services.orchestration.cross_agent_anomaly_engine import CrossAgentAnomalyEngine
from app.services.orchestration.storage import orchestration_storage
from app.services.orchestration.orchestrator import lead_orchestrator

client = TestClient(app)


# ==============================================================================
# Helper to construct valid UnifiedEvidenceRecord fixtures
# ==============================================================================

def make_evidence(
    agent_name: str = "SAR Agent",
    evidence_type: str = "RADAR_DARK_PATCH",
    source_name: str = "Sentinel-1 C-SAR",
    source_identifier: str = "S1A_TEST_001",
    observation_timestamp: str = None,
    latitude: float = 15.420,
    longitude: float = 73.780,
    data_mode: str = "LIVE",
    is_simulated: bool = False,
    measurement_or_indicator: str = "Backscatter Deviation",
    value: any = -4.5,
    unit: str = "dB",
    confidence: float = 0.85,
    uncertainty: float = 0.15,
    quality_status: str = "VERIFIED",
    processing_method: str = "Adaptive CFAR Thresholding",
    limitations: list = None,
) -> UnifiedEvidenceRecord:
    if observation_timestamp is None:
        observation_timestamp = datetime.now(timezone.utc).isoformat()
    return UnifiedEvidenceRecord(
        agent_name=agent_name,
        evidence_type=evidence_type,
        source_name=source_name,
        source_identifier=source_identifier,
        observation_timestamp=observation_timestamp,
        latitude=latitude,
        longitude=longitude,
        data_mode=data_mode,
        is_simulated=is_simulated,
        measurement_or_indicator=measurement_or_indicator,
        value=value,
        unit=unit,
        confidence=confidence,
        uncertainty=uncertainty,
        quality_status=quality_status,
        processing_method=processing_method,
        limitations=limitations or ["Calibration threshold uncertainty ±0.5 dB"],
    )


# ==============================================================================
# 1. SPATIAL CORRELATION ENGINE TESTS
# ==============================================================================

def test_haversine_distance_accuracy():
    """Verify geodesic distance calculation between coordinates."""
    # Distance between identical points must be 0
    d0 = haversine_distance_km(15.0, 73.0, 15.0, 73.0)
    assert d0 == 0.0

    # Distance Mumbai (18.9220, 72.8347) to Goa (15.2993, 74.1240) is ~420-450 km
    d_mumbai_goa = haversine_distance_km(18.9220, 72.8347, 15.2993, 74.1240)
    assert 400.0 < d_mumbai_goa < 460.0

    # 1 degree of latitude is roughly 111 km
    d_1deg_lat = haversine_distance_km(0.0, 0.0, 1.0, 0.0)
    assert 110.0 < d_1deg_lat < 112.0


def test_point_in_bbox():
    """Verify point-in-bounding-box logic: [min_lon, min_lat, max_lon, max_lat]."""
    bbox = [72.0, 14.0, 74.0, 16.0]
    assert point_in_bbox(15.0, 73.0, bbox) is True
    assert point_in_bbox(13.9, 73.0, bbox) is False
    assert point_in_bbox(15.0, 74.1, bbox) is False
    assert point_in_bbox(14.0, 72.0, bbox) is True  # corner point


def test_spatial_proximity_tiers_and_disclaimer():
    """Verify spatial proximity tiering across multi-agent evidence and disclaimer."""
    # 1. Immediate proximity (<= 5 km)
    ev_sar = make_evidence(agent_name="SAR Agent", latitude=15.200, longitude=73.500)
    ev_ais_close = make_evidence(agent_name="AIS Agent", latitude=15.220, longitude=73.510) # ~2.4 km

    correlations = SpatialCorrelationEngine.correlate_evidence([ev_sar, ev_ais_close], max_radius_km=25.0)
    assert len(correlations) == 1
    corr = correlations[0]
    assert corr.spatial_relationship == "WITHIN_IMMEDIATE_PROXIMITY"
    assert corr.distance_km <= 5.0
    assert "Spatial proximity is supporting contextual evidence, NOT empirical proof of causation" in corr.causation_disclaimer

    # 2. Local area (5 km - 25 km)
    ev_ais_local = make_evidence(agent_name="AIS Agent", latitude=15.350, longitude=73.500)
    correlations_local = SpatialCorrelationEngine.correlate_evidence([ev_sar, ev_ais_local], max_radius_km=25.0)
    assert len(correlations_local) == 1
    assert correlations_local[0].spatial_relationship == "WITHIN_LOCAL_AREA"

    # 3. Distant (25 km - 50 km)
    ev_ais_distant = make_evidence(agent_name="AIS Agent", latitude=15.550, longitude=73.500)
    correlations_distant = SpatialCorrelationEngine.correlate_evidence([ev_sar, ev_ais_distant], max_radius_km=25.0)
    assert len(correlations_distant) == 1
    assert correlations_distant[0].spatial_relationship == "DISTANT"

    # 4. Disjoint (> 50 km)
    ev_ais_disjoint = make_evidence(agent_name="AIS Agent", latitude=16.500, longitude=73.500)
    correlations_disjoint = SpatialCorrelationEngine.correlate_evidence([ev_sar, ev_ais_disjoint], max_radius_km=25.0)
    assert len(correlations_disjoint) == 1
    assert correlations_disjoint[0].spatial_relationship == "DISJOINT"


# ==============================================================================
# 2. TEMPORAL CORRELATION & DRIFT PLAUSIBILITY TESTS
# ==============================================================================

def test_temporal_normalization_and_freshness():
    """Verify UTC normalization and freshness tiers."""
    now_utc = datetime.now(timezone.utc)
    t_fresh = (now_utc - timedelta(minutes=15)).isoformat()
    t_current = (now_utc - timedelta(hours=3)).isoformat()
    t_stale = (now_utc - timedelta(hours=80)).isoformat()

    dt_fresh = parse_to_utc(t_fresh)
    assert dt_fresh is not None
    assert dt_fresh.tzinfo == timezone.utc

    f1 = calculate_freshness(dt_fresh, now_utc)
    assert "REAL_TIME" in f1

    f2 = calculate_freshness(parse_to_utc(t_current), now_utc)
    assert "CURRENT" in f2

    f3 = calculate_freshness(parse_to_utc(t_stale), now_utc)
    assert "STALE" in f3


def test_temporal_compatibility_tiers():
    """Verify delta-hour based temporal tiers."""
    now_utc = datetime.now(timezone.utc)
    t0 = now_utc.isoformat()
    
    # 1. Coincident (<= 1 hr)
    ev_a = make_evidence(agent_name="SAR Agent", observation_timestamp=t0)
    ev_b_coincident = make_evidence(agent_name="Optical Agent", observation_timestamp=(now_utc + timedelta(minutes=25)).isoformat())
    corrs = TemporalCorrelationEngine.correlate_evidence([ev_a, ev_b_coincident], window_hours=24.0)
    assert len(corrs) == 1
    assert corrs[0].temporal_compatibility == "COINCIDENT"
    assert corrs[0].time_difference_hours < 1.0

    # 2. High (1 - 6 hrs)
    ev_b_high = make_evidence(agent_name="Optical Agent", observation_timestamp=(now_utc + timedelta(hours=4)).isoformat())
    corrs_high = TemporalCorrelationEngine.correlate_evidence([ev_a, ev_b_high], window_hours=24.0)
    assert corrs_high[0].temporal_compatibility == "HIGH"

    # 3. Moderate (6 - 24 hrs)
    ev_b_mod = make_evidence(agent_name="Optical Agent", observation_timestamp=(now_utc + timedelta(hours=14)).isoformat())
    corrs_mod = TemporalCorrelationEngine.correlate_evidence([ev_a, ev_b_mod], window_hours=24.0)
    assert corrs_mod[0].temporal_compatibility == "MODERATE"

    # 4. Low (24 - 48 hrs)
    ev_b_low = make_evidence(agent_name="Optical Agent", observation_timestamp=(now_utc + timedelta(hours=36)).isoformat())
    corrs_low = TemporalCorrelationEngine.correlate_evidence([ev_a, ev_b_low], window_hours=24.0)
    assert corrs_low[0].temporal_compatibility == "LOW"

    # 5. Incompatible (> 48 hrs)
    ev_b_incomp = make_evidence(agent_name="Optical Agent", observation_timestamp=(now_utc + timedelta(hours=72)).isoformat())
    corrs_incomp = TemporalCorrelationEngine.correlate_evidence([ev_a, ev_b_incomp], window_hours=24.0)
    assert corrs_incomp[0].temporal_compatibility == "INCOMPATIBLE"


def test_passive_ocean_drift_plausibility():
    """Verify passive hydrodynamic transport calculations when ocean currents are provided."""
    now_utc = datetime.now(timezone.utc)
    t0 = now_utc.isoformat()
    t1 = (now_utc + timedelta(hours=4)).isoformat()

    ev_a = make_evidence(agent_name="SAR Agent", observation_timestamp=t0)
    ev_b = make_evidence(agent_name="AIS Agent", observation_timestamp=t1)

    # 0.50 m/s current speed = 1.8 km/h. Over 4 hours = ~7.2 km drift
    corrs = TemporalCorrelationEngine.correlate_evidence(
        [ev_a, ev_b],
        window_hours=24.0,
        current_velocity_m_s=0.50,
        current_direction_deg=90.0,
    )
    assert len(corrs) == 1
    drift = corrs[0].drift_analysis
    assert drift is not None
    assert drift["ocean_current_speed_m_s"] == 0.50
    assert 7.0 < drift["estimated_passive_drift_distance_km"] < 7.4
    assert "hydrodynamic" in drift["hydrodynamic_plausibility_note"].lower()


# ==============================================================================
# 3. EVIDENCE QUALITY & UNCERTAINTY ENGINE TESTS
# ==============================================================================

def test_simulated_iot_marked_synthetic_and_isolated():
    """Verify simulated evidence receives SYNTHETIC tier and never inflates confidence."""
    simulated_evidence = make_evidence(
        agent_name="IoT Buoy Agent",
        evidence_type="IN_SITU_TURBIDITY",
        source_name="Virtual ESP32 Mooring Buoy",
        source_identifier="ORCA-BUOY-001",
        data_mode="SIMULATED",
        is_simulated=True,
        measurement_or_indicator="Turbidity",
        value=24.5,
        unit="NTU",
        quality_status="SYNTHETIC",
        processing_method="Synthetic Sensor Simulation Engine",
        limitations=["Synthetically generated virtual buoy telemetry"],
    )

    quality = QualityUncertaintyEngine.evaluate_quality([simulated_evidence], [], [])
    assert quality.simulated_evidence_count == 1
    assert any("SIMULATION_ISOLATION_APPLIED" in r for r in quality.quality_rules_applied)

    # Incident confidence calculation with ONLY simulated evidence must yield DEMONSTRATION_ONLY
    conf_dict, uncertainties = QualityUncertaintyEngine.evaluate_assessment_confidence(
        [simulated_evidence], [], [], "POSSIBLE_WATER_QUALITY_ANOMALY"
    )
    assert conf_dict["confidence_tier"] == "DEMONSTRATION_ONLY"
    assert conf_dict["confidence_score"] <= 0.35
    assert any("simulated IoT evidence" in u for u in uncertainties)
    assert any("demonstration data" in u for u in uncertainties)


def test_corroboration_boost_and_single_source_penalty():
    """Verify multi-sensor agreement boosts confidence, while single source is flagged and penalized."""
    now_str = datetime.now(timezone.utc).isoformat()
    
    # 1. Single real SAR observation
    sar_ev = make_evidence(
        agent_name="SAR Agent",
        evidence_type="DARK_PATCH",
        data_mode="LIVE",
        is_simulated=False,
    )
    conf_single, unc_single = QualityUncertaintyEngine.evaluate_assessment_confidence(
        [sar_ev], [], [], "POSSIBLE_OIL_SPILL_SURFACE_ANOMALY"
    )
    assert conf_single["confidence_tier"] in ("LOW", "MODERATE")
    assert any("Single-agent observation" in u for u in unc_single)

    # 2. Add corroborating Optical, Oceanographic, and AIS real evidence
    opt_ev = make_evidence(agent_name="Optical Agent", evidence_type="NDCI_PROXY", data_mode="LIVE", is_simulated=False)
    ocean_ev = make_evidence(agent_name="Oceanographic Agent", evidence_type="SST_CMEMS", data_mode="MODEL_OUTPUT", is_simulated=False)
    ais_ev = make_evidence(agent_name="AIS Agent", evidence_type="VESSEL_TRACK", data_mode="LIVE", is_simulated=False)

    conf_multi, unc_multi = QualityUncertaintyEngine.evaluate_assessment_confidence(
        [sar_ev, opt_ev, ocean_ev, ais_ev], [], [], "POSSIBLE_OIL_SPILL_SURFACE_ANOMALY"
    )
    assert conf_multi["confidence_score"] > conf_single["confidence_score"]
    assert conf_multi["corroboration_level"] == "4_AGENTS_CORROBORATING"
    assert any("Triangulated by" in f for f in conf_multi["positive_factors"])


# ==============================================================================
# 4. CROSS-AGENT ANOMALY SCENARIOS & CONFLICT DETECTION
# ==============================================================================

def test_anomaly_classification_oil_spill_scenario():
    """Verify classification of POSSIBLE_OIL_SPILL_SURFACE_ANOMALY."""
    now_str = datetime.now(timezone.utc).isoformat()
    sar_ev = make_evidence(
        agent_name="SAR Agent",
        evidence_type="DARK_PATCH",
        measurement_or_indicator="SAR Dark Backscatter Slick Candidate",
        value="DARK_PATCH_DETECTED",
        unit="detection",
    )
    ocean_ev = make_evidence(
        agent_name="Oceanographic Agent",
        measurement_or_indicator="Surface Wind Speed",
        value=6.0,  # Favorable wind range (3 - 12 m/s)
        unit="m/s",
        data_mode="MODEL_OUTPUT",
    )

    category, label, supporting, contradicting, missing, alternatives, recommendations = (
        CrossAgentAnomalyEngine.evaluate_cross_agent_anomalies([sar_ev, ocean_ev], [], [])
    )
    assert category == "POSSIBLE_OIL_SPILL_SURFACE_ANOMALY"
    assert "Slick Candidate" in label
    assert len(supporting) >= 1
    assert len(alternatives) >= 1
    assert len(recommendations) >= 1


def test_conflict_detection_low_wind_look_alike():
    """Verify conflicting evidence detection when SAR dark patch coincides with calm wind < 3 m/s."""
    sar_ev = make_evidence(
        agent_name="SAR Agent",
        evidence_type="DARK_PATCH",
        measurement_or_indicator="SAR Dark Patch Candidate",
        value="DARK_PATCH",
    )
    ocean_calm_ev = make_evidence(
        agent_name="Oceanographic Agent",
        measurement_or_indicator="Surface Wind Speed",
        value=1.8,  # Under 3 m/s calm threshold
        unit="m/s",
        data_mode="MODEL_OUTPUT",
    )

    category, label, supporting, contradicting, missing, alternatives, recommendations = (
        CrossAgentAnomalyEngine.evaluate_cross_agent_anomalies([sar_ev, ocean_calm_ev], [], [])
    )
    assert category == "POSSIBLE_OIL_SPILL_SURFACE_ANOMALY"
    # Low wind must be flagged in contradicting evidence as look-alike mimicry
    assert len(contradicting) >= 1
    wind_conflict = next((c for c in contradicting if "Oceanographic Agent" in c["agent"]), None)
    assert wind_conflict is not None
    assert "< 3.0 m/s" in wind_conflict["finding"]
    assert any("Calm sea conditions" in alt for alt in alternatives)


def test_water_quality_anomaly_scenario():
    """Verify classification of POSSIBLE_WATER_QUALITY_ANOMALY."""
    opt_ev = make_evidence(
        agent_name="Optical Agent",
        measurement_or_indicator="Turbidity SPM Proxy",
        value=4.5,  # > 2.0 triggers turbidity anomaly
        unit="relative_units",
    )
    iot_ev = make_evidence(
        agent_name="IoT Buoy Agent",
        measurement_or_indicator="Dissolved Oxygen",
        value=3.1,
        unit="mg/L",
        data_mode="SIMULATED",
        quality_status="SYNTHETIC",
    )

    category, label, supporting, contradicting, missing, alternatives, recommendations = (
        CrossAgentAnomalyEngine.evaluate_cross_agent_anomalies([opt_ev, iot_ev], [], [])
    )
    assert category == "POSSIBLE_WATER_QUALITY_ANOMALY"
    assert "Sediment Runoff or Chlorophyll/Algal Bloom" in label
    assert len(supporting) >= 1


# ==============================================================================
# 5. LEAD ORCHESTRATOR END-TO-END EXECUTION & PARTIAL FAILURES
# ==============================================================================

def test_lead_orchestrator_investigate_all_agents():
    """Verify live lead orchestrator run across all 5 agents synchronously."""
    req = MultiAgentInvestigationRequest(
        zone_id="zone-01",
        time_range_hours=24,
        correlation_radius_km=30.0,
        temporal_window_hours=24.0,
    )
    assessment = asyncio.run(lead_orchestrator.investigate(req))
    assert assessment.assessment_id.startswith("ORCA-ASSESS-")
    assert assessment.status in ("COMPLETED", "PARTIAL")
    assert len(assessment.evidence_summary) >= 5
    assert assessment.agent_statuses["SAR"] in ("SUCCESS", "NOT_CONNECTED", "SKIPPED")
    assert assessment.agent_statuses["OPTICAL"] in ("SUCCESS", "NOT_CONNECTED", "SKIPPED")
    assert assessment.agent_statuses["OCEANOGRAPHIC"] in ("SUCCESS", "NOT_CONNECTED", "SKIPPED")
    assert assessment.agent_statuses["AIS"] in ("SUCCESS", "NOT_CONNECTED", "SKIPPED")
    assert assessment.agent_statuses["IOT"] == "SUCCESS"
    assert assessment.spatial_correlations is not None
    assert assessment.temporal_correlations is not None
    assert assessment.confidence is not None


def test_lead_orchestrator_partial_agent_failure():
    """Verify orchestrator survives when one agent throws an unhandled exception."""
    req = MultiAgentInvestigationRequest(
        zone_id="zone-01",
        time_range_hours=24,
    )

    with patch.object(lead_orchestrator, "_harvest_sar_evidence", side_effect=RuntimeError("SAR Service Down")):
        assessment = asyncio.run(lead_orchestrator.investigate(req))
        assert assessment.status in ("COMPLETED", "PARTIAL")
        assert assessment.agent_statuses["SAR"] == "FAILED"
        # Remaining 4 agents still executed
        assert assessment.agent_statuses["IOT"] == "SUCCESS"
        assert len(assessment.evidence_summary) > 0


def test_lead_orchestrator_all_agents_unavailable():
    """Verify orchestrator survives even if all 5 agent harvesters raise errors."""
    req = MultiAgentInvestigationRequest(
        zone_id="zone-empty",
        time_range_hours=24,
    )

    with patch.object(lead_orchestrator, "_harvest_sar_evidence", side_effect=Exception("Down")), \
         patch.object(lead_orchestrator, "_harvest_optical_evidence", side_effect=Exception("Down")), \
         patch.object(lead_orchestrator, "_harvest_oceanographic_evidence", side_effect=Exception("Down")), \
         patch.object(lead_orchestrator, "_harvest_ais_evidence", side_effect=Exception("Down")), \
         patch.object(lead_orchestrator, "_harvest_iot_evidence", side_effect=Exception("Down")):
        
        assessment = asyncio.run(lead_orchestrator.investigate(req))
        assert assessment.status == "FAILED"
        assert len(assessment.evidence_summary) == 0
        assert assessment.incident_category == "BASELINE_EVALUATION"
        assert all(s == "FAILED" for s in assessment.agent_statuses.values())


# ==============================================================================
# 6. STORAGE & PERSISTENCE TESTS
# ==============================================================================

def test_orchestration_storage_roundtrip():
    """Verify in-memory caching and disk persistence of assessments."""
    # Seed baseline assessment exists
    base = orchestration_storage.get_assessment("ORCA-ASSESS-BASE-001")
    assert base is not None
    assert base.assessment_id == "ORCA-ASSESS-BASE-001"
    assert base.incident_category == "BASELINE_EVALUATION"

    # Save a mock assessment
    test_id = "ORCA-ASSESS-TEST-999"
    mock_assessment = FinalMarineIntelligenceAssessment(
        assessment_id=test_id,
        status="COMPLETED",
        incident_category="BASELINE_EVALUATION",
        assessment_label="Mock Test Assessment",
        geographic_area={"zone_id": "zone-test", "centroid": [-16.0, 146.0]},
        observation_period={"earliest": "2026-11-04T00:00:00Z", "latest": "2026-11-04T01:00:00Z"},
        agent_statuses={"SAR": "SUCCESS"},
        agent_execution_times_ms={"SAR": 45.0},
        evidence_summary=[],
        spatial_correlations=[],
        temporal_correlations=[],
        supporting_evidence=[],
        contradicting_evidence=[],
        missing_evidence=[],
        data_quality=EvidenceQualityAssessment(
            overall_quality_score=0.9,
            data_reliability_score=0.9,
            freshness_score=0.9,
            spatial_relevance_score=0.9,
            temporal_relevance_score=0.9,
        ),
        confidence={"confidence_score": 0.85, "confidence_tier": "HIGH"},
        uncertainty=[],
        alternative_explanations=[],
        nugen_reasoning={},
        recommended_follow_up=[],
        data_mode_summary={},
    )
    orchestration_storage.save_assessment(mock_assessment)

    retrieved = orchestration_storage.get_assessment(test_id)
    assert retrieved is not None
    assert retrieved.assessment_id == test_id
    assert retrieved.geographic_area["zone_id"] == "zone-test"

    history = orchestration_storage.list_assessments(limit=50)
    assert any(h.assessment_id == test_id for h in history)


# ==============================================================================
# 7. DEDICATED API ROUTE ENDPOINTS TESTS
# ==============================================================================

def test_api_investigate_endpoint():
    """POST /api/v1/orchestration/investigate executes investigation and returns assessment."""
    payload = {
        "zone_id": "zone-01",
        "time_range_hours": 24,
        "correlation_radius_km": 25.0,
        "temporal_window_hours": 24.0,
    }
    response = client.post("/api/v1/orchestration/investigate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "assessment_id" in data
    assert data["status"] in ("COMPLETED", "PARTIAL")
    assert "evidence_summary" in data
    assert "spatial_correlations" in data
    assert "temporal_correlations" in data
    assert "nugen_reasoning" in data
    assert "alternative_explanations" in data

    # Verify assessment is queryable via GET
    assess_id = data["assessment_id"]
    get_res = client.get(f"/api/v1/orchestration/assessment/{assess_id}")
    assert get_res.status_code == 200
    assert get_res.json()["assessment_id"] == assess_id


def test_api_status_endpoint():
    """GET /api/v1/orchestration/status/{id} returns investigation status."""
    response = client.get("/api/v1/orchestration/status/ORCA-ASSESS-BASE-001")
    assert response.status_code == 200
    data = response.json()
    assert data["assessment_id"] == "ORCA-ASSESS-BASE-001"
    assert data["status"] == "COMPLETED"
    assert "agent_statuses" in data


def test_api_evidence_endpoint():
    """GET /api/v1/orchestration/evidence/{id} returns unified evidence records."""
    response = client.get("/api/v1/orchestration/evidence/ORCA-ASSESS-BASE-001")
    assert response.status_code == 200
    data = response.json()
    assert "evidence" in data
    assert "total_records" in data
    assert len(data["evidence"]) >= 1
    assert "agent_name" in data["evidence"][0]
    assert "data_mode" in data["evidence"][0]


def test_api_history_endpoint():
    """GET /api/v1/orchestration/history returns history list."""
    response = client.get("/api/v1/orchestration/history?limit=10")
    assert response.status_code == 200
    data = response.json()
    assert "assessments" in data
    assert "total_assessments" in data
    assert data["total_assessments"] >= 1


def test_api_export_markdown_endpoint():
    """GET /api/v1/orchestration/export/{id}?format=markdown returns downloadable markdown."""
    response = client.get("/api/v1/orchestration/export/ORCA-ASSESS-BASE-001?format=markdown")
    assert response.status_code == 200
    assert "text/markdown" in response.headers.get("content-type", "")
    assert "attachment; filename=" in response.headers.get("content-disposition", "")
    text = response.text
    assert "# ORCA Marine Ecosystem Intelligence" in text
    assert "ORCA-ASSESS-BASE-001" in text
    assert "Multi-Agent Swarm Contributions" in text


def test_api_export_json_endpoint():
    """GET /api/v1/orchestration/export/{id}?format=json returns JSON export."""
    response = client.get("/api/v1/orchestration/export/ORCA-ASSESS-BASE-001?format=json")
    assert response.status_code == 200
    assert "application/json" in response.headers.get("content-type", "")
    data = response.json()
    assert data["assessment_id"] == "ORCA-ASSESS-BASE-001"


def test_api_nonexistent_assessment_returns_404():
    """GET /api/v1/orchestration/assessment/nonexistent returns 404."""
    response = client.get("/api/v1/orchestration/assessment/ORCA-NONEXISTENT-XYZ")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()
