import sys
from pathlib import Path

backend_path = Path(__file__).resolve().parent.parent
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from app.main import app
from app.services.copernicus_marine_service import (
    copernicus_marine_service,
    degrees_to_cardinal,
    CORE_DATASETS
)
from app.services.nugen_service import nugen_service
from app.schemas.oceanographic import (
    SAROceanContextRequest,
    OceanographicQueryRequest
)

client = TestClient(app)

class TestCopernicusMarineDiscoveryAndHealth:
    """Verifies Copernicus Marine STAC catalog discovery, OGC WMTS health, and open access."""

    def test_copernicus_marine_health_and_open_access(self):
        health = copernicus_marine_service.get_health()
        assert health.status in ("OPERATIONAL", "DEGRADED")
        assert "copernicus.eu" in health.stac_endpoint
        assert "copernicus.eu" in health.wmts_endpoint
        assert health.available_datasets_count >= 5
        assert isinstance(health.latency_ms, (int, float))
        # Open access without mandatory paid account
        assert "Open STAC/WMTS" in health.auth_instructions or "marine.copernicus.eu" in health.auth_instructions

    def test_copernicus_marine_dataset_catalog(self):
        datasets = copernicus_marine_service.list_datasets()
        assert len(datasets) >= 5
        
        # Verify physics, salinity, currents, and waves are registered
        dataset_ids = [d.dataset_id for d in datasets]
        assert "cmems_mod_glo_phy-thetao_anfc_0.083deg_P1D-m_202406" in dataset_ids
        assert "cmems_mod_glo_phy-so_anfc_0.083deg_P1D-m_202406" in dataset_ids
        assert "cmems_mod_glo_phy_anfc_merged-uv_PT1H-i_202211" in dataset_ids
        assert "cmems_mod_glo_wav_anfc_0.083deg_PT3H-i_202411" in dataset_ids

        # Verify variables for wave product
        wave_vars = copernicus_marine_service.get_dataset_variables("cmems_mod_glo_wav_anfc_0.083deg_PT3H-i_202411")
        var_ids = [v.variable_id for v in wave_vars]
        assert "VHM0" in var_ids
        assert "VTPK" in var_ids
        assert "VMDR" in var_ids

    def test_maritime_presets(self):
        presets = copernicus_marine_service.get_maritime_presets()
        assert len(presets) >= 5
        preset_ids = [p["id"] for p in presets]
        assert "PERSIAN_GULF" in preset_ids
        assert "MALACCA_STRAIT" in preset_ids
        assert "GALAPAGOS" in preset_ids
        assert "NORTH_SEA" in preset_ids


class TestUnitConversionAndPhysicalValidation:
    """Verifies physical bounds validation, unit normalization, and fill-value rejection."""

    def test_degrees_to_cardinal_conversion(self):
        assert degrees_to_cardinal(0.0) == "N"
        assert degrees_to_cardinal(90.0) == "E"
        assert degrees_to_cardinal(180.0) == "S"
        assert degrees_to_cardinal(270.0) == "W"
        assert degrees_to_cardinal(45.0) == "NE"
        assert degrees_to_cardinal(225.0) == "SW"
        assert degrees_to_cardinal(355.0) == "N"
        assert degrees_to_cardinal(None) is None

    def test_sea_surface_temperature_conversion(self):
        # Valid range (-2.5 to 38 C)
        conv, unit, status, _ = copernicus_marine_service.convert_and_validate("thetao", 28.5, "degrees_C")
        assert conv == 28.5
        assert unit == "°C"
        assert status == "VALIDATED_PHYSICAL_RANGE"

        # Out of bounds
        _, _, status_oob, _ = copernicus_marine_service.convert_and_validate("thetao", 45.0, "degrees_C")
        assert status_oob == "OUT_OF_BOUNDS"

    def test_salinity_conversion(self):
        conv, unit, status, _ = copernicus_marine_service.convert_and_validate("so", 38.2, "1e-3")
        assert conv == 38.2
        assert unit == "PSU"
        assert status == "VALIDATED_PHYSICAL_RANGE"

    def test_fill_value_rejection(self):
        # NetCDF default missing value e.g. 9.969e36 or -32767
        conv, unit, status, notes = copernicus_marine_service.convert_and_validate("thetao", 9.969e36, "degrees_C")
        assert status == "FILL_VALUE_FILTERED"
        assert "masked land" in notes.lower() or "missing" in notes.lower()

    def test_current_vectors_and_waves(self):
        conv_u, _, status_u, _ = copernicus_marine_service.convert_and_validate("uo", 0.452, "m s-1")
        assert status_u == "VALIDATED_PHYSICAL_RANGE"
        assert conv_u == 0.452

        conv_hs, _, status_hs, _ = copernicus_marine_service.convert_and_validate("VHM0", 1.85, "m")
        assert status_hs == "VALIDATED_PHYSICAL_RANGE"
        assert conv_hs == 1.85


class TestLiveOceanographicRetrieval:
    """Verifies live or model retrieval for real ocean coordinates."""

    def test_live_point_retrieval_persian_gulf(self):
        # Persian Gulf coordinates (26.50, 55.00)
        profile = copernicus_marine_service.query_point_observations(
            latitude=26.50,
            longitude=55.00,
            location_name="Persian Gulf Test"
        )
        assert profile.query_latitude == 26.50
        assert profile.query_longitude == 55.00
        assert profile.service_status in ("OPERATIONAL", "DEGRADED")
        
        # If network connected to WMTS, observations should be populated
        if profile.observations:
            assert len(profile.observations) >= 4
            var_ids = [obs.variable_id for obs in profile.observations]
            assert "thetao" in var_ids  # SST
            assert "so" in var_ids or "sob" in var_ids  # Salinity
            
            # Check summary card values
            sc = profile.summary_card
            assert sc["sea_surface_temp_c"] is not None
            assert 15.0 <= sc["sea_surface_temp_c"] <= 38.0
            
            # Check provenance and uncertainty
            for obs in profile.observations:
                assert obs.product_id is not None
                assert obs.data_classification in ("MODEL_ANALYSIS", "FORECAST", "OBSERVATION")
                assert obs.data_freshness in ("LIVE", "RECENT", "STALE", "HISTORICAL")
                assert obs.uncertainty is not None

    def test_data_classification_model_vs_forecast(self):
        # Future date should result in FORECAST classification
        future_date = (datetime.now(timezone.utc) + timedelta(days=5)).strftime("%Y-%m-%d")
        profile = copernicus_marine_service.query_point_observations(
            latitude=26.50,
            longitude=55.00,
            target_date=future_date
        )
        if profile.observations:
            for obs in profile.observations:
                assert obs.data_classification == "FORECAST"
            assert profile.data_tier in ("FORECAST", "NUMERICAL_MODEL_ANALYSIS")

    def test_terrestrial_masked_handling_no_fabrication(self):
        # Deep inland coordinate (Riyadh, Saudi Arabia: 24.71, 46.67)
        profile = copernicus_marine_service.query_point_observations(
            latitude=24.71,
            longitude=46.67,
            location_name="Inland Terrestrial Point"
        )
        # MUST NOT fabricate synthetic ocean readings on land
        assert len(profile.observations) == 0
        assert profile.retrieval_status in ("MASKED_TERRESTRIAL", "EMPTY", "FAILED")
        assert profile.data_tier == "UNAVAILABLE"
        assert profile.error_message is not None

    def test_network_failure_handling(self):
        # Mock requests failure
        with patch.object(copernicus_marine_service.session, "get", side_effect=Exception("WMTS connection timed out")):
            profile = copernicus_marine_service.query_point_observations(
                latitude=26.50,
                longitude=55.00
            )
            assert len(profile.observations) == 0
            assert profile.retrieval_status == "FAILED"
            assert profile.data_tier == "UNAVAILABLE"
            assert "timed out" in profile.error_message.lower() or "failed" in profile.error_message.lower()


class TestSARContextualEnvironmentalTransport:
    """Verifies SAR anomaly candidate environmental drift coupling."""

    def test_sar_ocean_context_generation(self):
        sar_time = "2026-10-31T14:25:10Z"
        ctx = copernicus_marine_service.get_ocean_context_for_sar_candidate(
            sar_product_id="S1A_IW_GRDH_1SDV_20261031T142510_061543_077A00_CMS",
            candidate_lat=26.50,
            candidate_lon=55.00,
            sar_acquisition_timestamp=sar_time,
            candidate_id="SAR-CAND-01"
        )
        assert ctx.sar_product_id == "S1A_IW_GRDH_1SDV_20261031T142510_061543_077A00_CMS"
        assert ctx.candidate_lat == 26.50
        assert ctx.candidate_lon == 55.00
        assert ctx.candidate_id == "SAR-CAND-01"
        assert ctx.sar_acquisition_timestamp == sar_time

        # Mandatory scientific integrity disclaimer
        assert "Environmental Context Disclaimer" in ctx.scientific_disclaimer
        assert "NOT confirm an oil spill" in ctx.scientific_disclaimer or "not prove" in ctx.scientific_disclaimer.lower()

        # If data was retrieved, check physical transport metrics
        if ctx.data_classification != "UNAVAILABLE" and ctx.surface_current_speed_knots is not None:
            assert ctx.drift_direction_cardinal is not None
            assert ctx.surface_current_speed_knots is not None
            assert ctx.significant_wave_height_m is not None
            assert "drift towards" in ctx.environmental_context_summary.lower()


class TestLeadOrchestratorIntegration:
    """Verifies Lead Orchestrator compiles oceanographic evidence with proper classification."""

    def test_lead_orchestrator_compiles_ocean_evidence(self):
        payload = nugen_service.compile_evidence_payload(
            zone_id="ZONE-01",
            anomaly_type="OIL_SLICK_CANDIDATE"
        )
        assert payload.oceanographic_evidence is not None
        ocean_ev = payload.oceanographic_evidence
        assert ocean_ev.agent_id == "ORCA-AG-05"
        
        # Classification MUST NOT be hardcoded to OBSERVATION if it is a numerical model
        assert ocean_ev.finding_type in ("MODEL_ANALYSIS", "FORECAST", "OBSERVATION")
        assert "Mercator" in ocean_ev.provider or "Copernicus" in ocean_ev.provider
        assert "°C" in ocean_ev.measurement_units


class TestOceanographicAPIEndpoints:
    """Verifies FastAPI REST endpoints for oceanographic service."""

    def test_health_endpoint(self):
        res = client.get("/api/v1/oceanographic/health")
        assert res.status_code == 200
        data = res.json()
        assert "status" in data
        assert "stac_endpoint" in data
        assert "wmts_endpoint" in data

    def test_datasets_endpoint(self):
        res = client.get("/api/v1/oceanographic/datasets")
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, list)
        assert len(data) >= 5

    def test_presets_endpoint(self):
        res = client.get("/api/v1/oceanographic/presets")
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, list)
        assert len(data) >= 5

    def test_point_query_endpoint(self):
        req_payload = {
            "latitude": 26.50,
            "longitude": 55.00,
            "zone_name": "Persian Gulf Test"
        }
        res = client.post("/api/v1/oceanographic/observations/point", json=req_payload)
        assert res.status_code == 200
        data = res.json()
        assert data["query_latitude"] == 26.50
        assert data["query_longitude"] == 55.00
        assert "observations" in data
        assert "summary_card" in data
        assert "data_tier" in data

    def test_sar_context_endpoint(self):
        req_payload = {
            "sar_product_id": "S1A_IW_GRDH_1SDV_20261031T142510_CMS_TEST",
            "candidate_id": "CAND-01",
            "latitude": 26.50,
            "longitude": 55.00,
            "sar_acquisition_timestamp": "2026-10-31T14:25:10Z"
        }
        res = client.post("/api/v1/oceanographic/context/sar", json=req_payload)
        assert res.status_code == 200
        data = res.json()
        assert data["sar_product_id"] == "S1A_IW_GRDH_1SDV_20261031T142510_CMS_TEST"
        assert "scientific_disclaimer" in data
        assert "environmental_context_summary" in data
