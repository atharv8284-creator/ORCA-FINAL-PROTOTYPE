import sys
from pathlib import Path
import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient

backend_path = Path(__file__).resolve().parent.parent
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from app.main import app
from app.core.config import settings
from app.services.optical_engine import optical_engine
from app.services.telemetry_service import iot_telemetry_service
from app.services.nugen_service import nugen_service
from app.services.sar_engine import sar_engine
from app.schemas.telemetry import ESP32TelemetryIngestPayload

client = TestClient(app)

def test_optical_processing_and_spectral_indicators():
    """
    Verify Sentinel-2 optical imagery processing computes genuine bio-optical indices:
    NDCI (Chlorophyll proxy), Turbidity ratio, and water coverage.
    """
    try:
        result = optical_engine.process_optical_product("S2B_TEST_PRODUCT_001")
    except Exception as e:
        if any(err_term in str(e).lower() for err_term in ["timed out", "connection", "aborted", "reset", "refused"]):
            pytest.skip(f"External Copernicus STAC network unavailable: {e}")
        raise
    assert result.analysis_id.startswith("OPT-PROC-")
    assert result.data_tier in ("CALIBRATED_PREVIEW_ANALYSIS", "SIMULATED")
    assert result.spectral_indicators.ndci_chlorophyll_proxy is not None
    assert result.spectral_indicators.turbidity_spm_index is not None
    assert result.spectral_indicators.algal_bloom_risk in ("LOW", "MODERATE", "ELEVATED", "HIGH")
    assert "true_color_rgb_png" in result.visualizations
    assert "chlorophyll_index_map_png" in result.visualizations
    assert "turbidity_mask_png" in result.visualizations

def test_optical_api_endpoints():
    """
    Test Optical API routes: /health, /analyses, and /process.
    """
    r_health = client.get("/api/v1/optical/health")
    assert r_health.status_code == 200
    assert r_health.json()["status"] == "OPERATIONAL"

    r_proc = client.post("/api/v1/optical/process", json={"product_id": "S2B_TEST_PRODUCT_002", "zone_id": "zone-01"})
    if r_proc.status_code == 500 and "timed out" in r_proc.text.lower():
        pytest.skip("External Copernicus STAC timed out during test")
    assert r_proc.status_code == 200
    data = r_proc.json()
    assert data["product_id"] == "S2B_TEST_PRODUCT_002"
    assert "spectral_indicators" in data

    r_list = client.get("/api/v1/optical/analyses")
    assert r_list.status_code == 200
    assert len(r_list.json()) >= 1

def test_iot_device_status_initially_not_connected():
    """
    Verify that when no physical hardware device is connected, the IoT status
    explicitly reports NOT CONNECTED and data_mode SIMULATED.
    """
    # Reset hardware devices for isolation
    iot_telemetry_service._hardware_devices.clear()

    res = client.get("/api/v1/telemetry/device/status")
    assert res.status_code == 200
    data = res.json()
    assert data["hardware_connection_status"] == "NOT CONNECTED"
    assert data["active_hardware_devices_count"] == 0
    assert data["data_mode"] == "SIMULATED"
    assert "NOT CONNECTED" in data["instructions"]

def test_iot_buoys_endpoint_explicit_simulated_mode():
    """
    Verify /api/v1/telemetry/buoys explicitly reports data_mode for each station.
    """
    res = client.get("/api/v1/telemetry/buoys")
    assert res.status_code == 200
    buoys = res.json()
    assert len(buoys) >= 4
    for b in buoys:
        assert b["data_mode"] in ("LIVE", "SIMULATED", "NOT CONNECTED")
        if b["deployment_program"].endswith("(Modelled)"):
            assert b["data_mode"] == "SIMULATED"

def test_esp32_hardware_ingest_unauthorized():
    """
    Verify that sending telemetry without the secret X-ORCA-DEVICE-KEY returns 401.
    """
    payload = {
        "device_id": "ESP32-TEST-01",
        "zone_id": "zone-01",
        "water_temperature_c": 28.4,
        "dissolved_oxygen_mg_l": 6.1,
        "ph_level": 8.1,
        "salinity_psu": 35.0,
        "turbidity_ntu": 1.2
    }
    # No header
    r1 = client.post("/api/v1/telemetry/ingest", json=payload)
    assert r1.status_code == 401

    # Wrong header
    r2 = client.post("/api/v1/telemetry/ingest", json=payload, headers={"X-ORCA-DEVICE-KEY": "wrong-key"})
    assert r2.status_code == 401

def test_esp32_hardware_ingest_authorized():
    """
    Verify that an authorized ESP32 hardware device successfully ingests telemetry
    and flips hardware connection status to LIVE.
    """
    key = settings.IOT_INGESTION_KEY
    payload = {
        "device_id": "ESP32-ORCA-BUOY-REAL-01",
        "hardware_mac": "30:AE:A4:01:23:45",
        "firmware_version": "v1.2.0-esp32-orca",
        "zone_id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c01",
        "water_temperature_c": 29.1,
        "dissolved_oxygen_mg_l": 5.9,
        "ph_level": 8.05,
        "salinity_psu": 35.2,
        "turbidity_ntu": 1.5,
        "battery_percentage": 97.5
    }
    try:
        resp = client.post("/api/v1/telemetry/ingest", json=payload, headers={"X-ORCA-DEVICE-KEY": key})
        assert resp.status_code == 200
        assert resp.json()["status"] == "INGESTED"

        # Status should now be LIVE
        status_resp = client.get("/api/v1/telemetry/device/status")
        assert status_resp.status_code == 200
        assert status_resp.json()["hardware_connection_status"] == "LIVE"
        assert status_resp.json()["active_hardware_devices_count"] >= 1
    finally:
        iot_telemetry_service._hardware_devices.clear()

def test_sar_processing_result_explicit_data_tier():
    """
    Verify SAR processing rejects silent synthetic substitution by default,
    and explicitly marks data_tier as SIMULATED when fallback is enabled.
    """
    # 1. Default allow_synthetic_fallback=False rejects missing product with ValueError
    with pytest.raises(ValueError) as excinfo:
        sar_engine.process_sar_product("S1A_NONEXISTENT_001", asset_key="thumbnail", allow_synthetic_fallback=False)
    assert "Silent synthetic substitution is prohibited" in str(excinfo.value)

    # 2. Explicit allow_synthetic_fallback=True returns SIMULATED tier
    res = sar_engine.process_sar_product("S1A_TEST_001", asset_key="thumbnail", allow_synthetic_fallback=True)
    assert res.data_tier == "SIMULATED"
    assert res.processing_status == "DEGRADED"
    assert res.uncertainty == 0.40
    assert res.is_preview is False
    assert "data_tier" in res.processing_engine_info

def test_evidence_compilation_missing_feeds_transparent():
    """
    Verify that missing feeds (like unconfigured AIS) are explicitly cataloged in missing_sources.
    """
    from app.services.ais.ais_storage import ais_storage
    from app.services.ais import ais_service
    with patch.object(ais_storage, "get_all_latest", return_value=[]):
        with patch.object(ais_service, "_cached_vessels", []):
            with patch.object(ais_service.provider, "api_key", ""):
                payload = nugen_service.compile_evidence_payload("zone-01", "THERMAL_SPIKE")
                assert "AIS Vessel Transponders" in payload.missing_sources
                assert payload.ais_evidence.is_available is False
                assert payload.ais_evidence.processing_status == "NOT_CONNECTED"
