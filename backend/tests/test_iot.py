import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

backend_path = Path(__file__).resolve().parent.parent
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from app.main import app
from app.services.iot import virtual_buoy, iot_service, iot_anomaly_engine
from app.services.nugen_service import nugen_service, SYSTEM_PROMPT

client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_virtual_buoy():
    """Ensure virtual buoy starts in normal running state and hardware registry is clean for every test."""
    from app.services.telemetry_service import iot_telemetry_service
    iot_telemetry_service._hardware_devices.clear()
    virtual_buoy.set_scenario("normal")
    virtual_buoy.start_simulation()
    yield
    iot_telemetry_service._hardware_devices.clear()
    virtual_buoy.set_scenario("normal")
    virtual_buoy.start_simulation()


# ==============================================================================
# 1. Virtual Device Registration & Detail Specifications
# ==============================================================================

def test_virtual_device_registration():
    """
    GET /api/v1/iot/devices returns registered virtual buoy with explicit SIMULATED labels.
    """
    response = client.get("/api/v1/iot/devices")
    assert response.status_code == 200
    devices = response.json()
    assert isinstance(devices, list)
    assert len(devices) >= 1

    buoy = next((d for d in devices if d["device_id"] == "ORCA-BUOY-001"), None)
    assert buoy is not None
    assert buoy["device_name"] == "ORCA Virtual ESP32 Reef Mooring"
    assert buoy["device_type"] == "ESP32 Marine Monitoring Buoy"
    assert buoy["data_mode"] == "SIMULATED"
    assert buoy["is_simulated"] is True
    assert buoy["connectivity"] in ("VIRTUAL", "SIMULATED_ONLINE")
    assert -90.0 <= buoy["latitude"] <= 90.0
    assert -180.0 <= buoy["longitude"] <= 180.0


def test_device_detail_endpoint():
    """
    GET /api/v1/iot/devices/ORCA-BUOY-001 returns complete hardware manifest,
    sensor suite, microcontroller specification, and battery capacity.
    """
    response = client.get("/api/v1/iot/devices/ORCA-BUOY-001")
    assert response.status_code == 200
    data = response.json()
    assert data["device_id"] == "ORCA-BUOY-001"
    assert "ESP32" in data["microcontroller"]
    assert "v2.4.0" in data["firmware_version"]
    assert data["battery_capacity_mah"] > 0
    assert "Solar" in data["solar_panel_spec"] or "PV" in data["solar_panel_spec"]
    assert len(data["sensors_installed"]) >= 5
    assert data["data_mode"] == "SIMULATED"
    assert data["is_simulated"] is True


def test_missing_device_handling():
    """
    Querying an unregistered device ID returns 404 Not Found.
    """
    response = client.get("/api/v1/iot/devices/UNKNOWN-NONEXISTENT-BUOY")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


# ==============================================================================
# 2. Normal Telemetry Generation, Bounded Values & Correct Units
# ==============================================================================

def test_normal_telemetry_generation():
    """
    GET /api/v1/iot/telemetry returns all 7 core sensor parameters and hardware metrics.
    """
    response = client.get("/api/v1/iot/telemetry")
    assert response.status_code == 200
    data = response.json()
    assert data["device_id"] == "ORCA-BUOY-001"
    assert data["data_mode"] == "SIMULATED"
    assert data["is_simulated"] is True
    assert data["simulation_scenario"] == "normal"
    assert "timestamp" in data

    # 7 Core Sensors
    assert "water_temperature_c" in data
    assert "ph_level" in data
    assert "turbidity_ntu" in data
    assert "dissolved_oxygen_mg_l" in data
    assert "salinity_psu" in data
    assert "battery_percentage" in data
    assert "signal_strength_dbm" in data

    # Granular Sensors Map
    assert "sensors" in data
    assert "water_temperature" in data["sensors"]
    assert "turbidity" in data["sensors"]
    assert "dissolved_oxygen" in data["sensors"]


def test_bounded_sensor_values_in_normal_scenario():
    """
    Verify all generated sensor readings adhere to plausible oceanographic bounds.
    """
    response = client.get("/api/v1/iot/telemetry")
    assert response.status_code == 200
    t = response.json()

    # Temperature in tropical reef waters (24°C - 31°C in normal)
    assert 24.0 <= t["water_temperature_c"] <= 31.0
    # Seawater pH (7.8 - 8.4 in normal)
    assert 7.8 <= t["ph_level"] <= 8.4
    # Optical Turbidity (< 5.0 NTU in clear water)
    assert 0.0 <= t["turbidity_ntu"] <= 5.0
    # Dissolved Oxygen (> 5.5 mg/L in healthy reef)
    assert 5.5 <= t["dissolved_oxygen_mg_l"] <= 10.0
    # Practical Salinity (33 - 37 PSU in open ocean)
    assert 33.0 <= t["salinity_psu"] <= 37.0
    # Battery & Signal
    assert 50.0 <= t["battery_percentage"] <= 100.0
    assert -120.0 <= t["signal_strength_dbm"] <= 0.0


def test_correct_sensor_units():
    """
    Verify every sensor reports the scientifically correct measurement unit.
    """
    response = client.get("/api/v1/iot/telemetry")
    assert response.status_code == 200
    sensors = response.json()["sensors"]

    assert sensors["water_temperature"]["unit"] == "°C"
    assert "pH" in sensors["ph_level"]["unit"]
    assert sensors["turbidity"]["unit"] == "NTU"
    assert sensors["dissolved_oxygen"]["unit"] == "mg/L"
    assert sensors["salinity"]["unit"] == "PSU"
    assert sensors["battery_level"]["unit"] == "%"
    assert sensors["signal_strength"]["unit"] == "dBm"


def test_simulated_labels_in_every_response():
    """
    Anti-Fabrication Rule:
    Every Virtual Buoy response must carry data_mode='SIMULATED' and is_simulated=True.
    """
    status_res = client.get("/api/v1/iot/status").json()
    assert status_res["data_mode"] == "SIMULATED"
    assert status_res["is_simulated"] is True

    telem_res = client.get("/api/v1/iot/telemetry").json()
    assert telem_res["data_mode"] == "SIMULATED"
    assert telem_res["is_simulated"] is True

    hist_res = client.get("/api/v1/iot/history").json()
    assert hist_res["data_mode"] == "SIMULATED"
    assert hist_res["is_simulated"] is True


# ==============================================================================
# 3. Controllable Scenarios: Normal, Anomaly, Offline
# ==============================================================================

def test_anomaly_scenario_generation_and_detection():
    """
    POST /api/v1/iot/scenario with scenario='anomaly':
    - Successfully updates active scenario to 'anomaly'
    - Produces elevated turbidity, high temperature, and hypoxic oxygen
    - GET /api/v1/iot/anomalies returns explainable anomaly events
    """
    # 1. Switch to Anomaly scenario
    res = client.post("/api/v1/iot/scenario", json={"scenario": "anomaly", "reason": "Simulated coastal sediment plume"})
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["new_scenario"] == "anomaly"

    # 2. Verify telemetry exhibits anomalous readings
    telem_res = client.get("/api/v1/iot/telemetry")
    assert telem_res.status_code == 200
    telem = telem_res.json()
    assert telem["simulation_scenario"] == "anomaly"
    assert telem["turbidity_ntu"] > 10.0  # Spike
    assert telem["water_temperature_c"] > 31.5  # Thermal surge
    assert telem["dissolved_oxygen_mg_l"] < 4.5  # Hypoxia

    # 3. Query Anomaly Engine
    anom_res = client.get("/api/v1/iot/anomalies")
    assert anom_res.status_code == 200
    anomalies = anom_res.json()
    assert len(anomalies) >= 2

    # Check Turbidity Anomaly Details
    turb_anom = next((a for a in anomalies if "turbidity" in a["sensor_name"].lower()), None)
    assert turb_anom is not None
    assert turb_anom["observed_value"] > 10.0
    assert turb_anom["severity"] in ("MODERATE", "CRITICAL", "ELEVATED")
    assert "turbidity" in turb_anom["explanation"].lower()
    assert "simulated" in turb_anom["compliance_disclaimer"].lower()
    assert turb_anom["data_mode"] == "SIMULATED"


def test_returning_to_normal_scenario():
    """
    Switching from anomaly back to normal restores standard baseline
    and clears elevated anomaly indicators.
    """
    # Enter anomaly first
    client.post("/api/v1/iot/scenario", json={"scenario": "anomaly"})
    # Return to normal
    res = client.post("/api/v1/iot/scenario", json={"scenario": "normal"})
    assert res.status_code == 200
    assert res.json()["new_scenario"] == "normal"

    # Verify telemetry is back in normal bounds
    telem = client.get("/api/v1/iot/telemetry").json()
    assert telem["simulation_scenario"] == "normal"
    assert telem["turbidity_ntu"] <= 5.0
    assert telem["dissolved_oxygen_mg_l"] >= 5.5

    # Anomalies should be zero
    anomalies = client.get("/api/v1/iot/anomalies").json()
    assert len(anomalies) == 0


def test_offline_scenario_freezes_telemetry():
    """
    POST /api/v1/iot/scenario with scenario='offline':
    - Device status transitions to OFFLINE
    - Does NOT generate new packets while offline
    - Retains last seen reading and timestamp
    """
    # Switch to offline
    res = client.post("/api/v1/iot/scenario", json={"scenario": "offline", "reason": "Simulated RF mast failure"})
    assert res.status_code == 200
    assert res.json()["new_scenario"] == "offline"

    # Status reflects OFFLINE
    status_data = client.get("/api/v1/iot/status").json()
    assert status_data["device_status"] == "OFFLINE"
    assert status_data["scenario"] == "offline"
    assert status_data["is_generating_telemetry"] is False

    # Get reading once
    t1 = client.get("/api/v1/iot/telemetry").json()
    seq1 = t1["packet_sequence_number"]
    ts1 = t1["timestamp"]

    # Get reading again: packet sequence counter and timestamp must remain FROZEN
    t2 = client.get("/api/v1/iot/telemetry").json()
    seq2 = t2["packet_sequence_number"]
    ts2 = t2["timestamp"]

    assert seq1 == seq2
    assert ts1 == ts2


def test_invalid_scenario_rejection():
    """
    Submitting an unrecognized scenario returns HTTP 422 Unprocessable Entity.
    """
    res = client.post("/api/v1/iot/scenario", json={"scenario": "INVALID_SCENARIO_NAME"})
    assert res.status_code == 422


# ==============================================================================
# 4. Simulation Start/Stop & Historical Telemetry
# ==============================================================================

def test_simulation_start_stop():
    """
    POST /api/v1/iot/simulation/stop and /start control packet generation state.
    """
    res_stop = client.post("/api/v1/iot/simulation/stop")
    assert res_stop.status_code == 200
    assert res_stop.json()["status"] == "STOPPED"
    assert res_stop.json()["is_generating_telemetry"] is False

    res_start = client.post("/api/v1/iot/simulation/start")
    assert res_start.status_code == 200
    assert res_start.json()["status"] == "RUNNING"
    assert res_start.json()["is_generating_telemetry"] is True


def test_telemetry_history_endpoint():
    """
    GET /api/v1/iot/history returns time-series records with limit filter.
    """
    response = client.get("/api/v1/iot/history?limit=15")
    assert response.status_code == 200
    data = response.json()
    assert data["device_id"] == "ORCA-BUOY-001"
    assert data["data_mode"] == "SIMULATED"
    assert data["is_simulated"] is True
    assert isinstance(data["history"], list)
    assert len(data["history"]) > 0
    assert len(data["history"]) <= 15

    point = data["history"][0]
    assert "water_temperature_c" in point
    assert "dissolved_oxygen_mg_l" in point
    assert "turbidity_ntu" in point
    assert point["data_mode"] == "SIMULATED"


# ==============================================================================
# 5. Lead Orchestrator Integration & Prompt Rule 9
# ==============================================================================

def test_lead_orchestrator_compiles_iot_evidence():
    """
    Verify Lead Orchestrator compile_evidence_payload includes Virtual ESP32 Buoy readings
    while strictly preserving data_mode='SIMULATED' and is_simulated=True.
    """
    payload = nugen_service.compile_evidence_payload("zone-01", "REEF_STRESS_ANOMALY")
    assert payload.iot_evidence is not None
    iot_ev = payload.iot_evidence

    assert iot_ev.agent_id == "ORCA-AG-01"
    assert iot_ev.metrics["data_mode"] == "SIMULATED"
    assert iot_ev.metrics["is_simulated"] is True
    assert "virtual_buoy_id" in iot_ev.metrics
    assert iot_ev.metrics["virtual_buoy_id"] == "ORCA-BUOY-001"
    assert "water_temperature_c" in iot_ev.metrics
    assert "turbidity_ntu" in iot_ev.metrics
    assert "dissolved_oxygen_mg_l" in iot_ev.metrics
    assert "compliance_disclaimer" in iot_ev.metrics
    assert "simulated" in iot_ev.metrics["compliance_disclaimer"].lower()


def test_nugen_system_prompt_rule_9_compliance():
    """
    Verify Nugen Lead Orchestrator prompt strictly incorporates Rule 9:
    Virtual ESP32 buoy telemetry is SIMULATED and must NEVER be reported as real pollution.
    """
    assert "Rule 9" in SYSTEM_PROMPT or "9. Virtual ESP32 buoy" in SYSTEM_PROMPT
    assert "simulated" in SYSTEM_PROMPT.lower()
    assert "turbidity" in SYSTEM_PROMPT.lower()
    assert "pollution" in SYSTEM_PROMPT.lower()
