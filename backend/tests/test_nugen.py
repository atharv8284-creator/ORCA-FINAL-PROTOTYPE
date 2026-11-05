import sys
import asyncio
from pathlib import Path
from unittest.mock import patch, AsyncMock, MagicMock
import httpx
from fastapi.testclient import TestClient

# Ensure backend root is on sys.path
backend_path = Path(__file__).resolve().parent.parent
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from app.main import app
from app.core.config import settings
from app.services.nugen_service import NugenService, nugen_service
from app.services.agent_engine import agent_engine
from app.schemas.marine import DeliberationRequest
from app.schemas.nugen import MultimodalEvidencePayload, AgentEvidenceRecord

client = TestClient(app)

# ==============================================================================
# 1. Missing Nugen Credentials & Default Unconfigured Behavior
# ==============================================================================

def test_missing_nugen_credentials():
    """
    When NUGEN_API_KEY or NUGEN_ENDPOINT is unset/empty:
    NugenService must return UNCONFIGURED status and HEURISTIC_RULE_BASED mode.
    Never attempts any speculative HTTP calls.
    """
    svc = NugenService(api_key="", endpoint="", model_id="")
    assert not svc.is_configured
    status_info = svc.get_service_status()
    assert status_info["status"] == "UNCONFIGURED"
    assert status_info["is_configured"] is False

    payload = svc.compile_evidence_payload("zone-01", "THERMAL_SPIKE")
    res = asyncio.run(svc.deliberate(payload))
    assert res.service_status == "UNCONFIGURED"
    assert res.inference_mode == "HEURISTIC_RULE_BASED"
    assert "unconfigured" in res.error_message.lower()


# ==============================================================================
# 2. Missing Model ID or Endpoint
# ==============================================================================

def test_missing_model_id():
    """
    When API key and endpoint are provided but NUGEN_MODEL_ID is empty:
    NugenService must return MODEL_UNAVAILABLE status without sending requests.
    """
    svc = NugenService(api_key="mock_key", endpoint="https://nugen.example.com/v1/deliberate", model_id="")
    assert svc.is_configured is True
    assert svc.has_model_id is False

    status_info = svc.get_service_status()
    assert status_info["status"] == "MODEL_UNAVAILABLE"

    payload = svc.compile_evidence_payload("zone-01", "THERMAL_SPIKE")
    res = asyncio.run(svc.deliberate(payload))
    assert res.service_status == "MODEL_UNAVAILABLE"
    assert res.inference_mode == "HEURISTIC_RULE_BASED"


# ==============================================================================
# 3. Evidence Payload Validation & Provenance
# ==============================================================================

def test_evidence_payload_compilation():
    """
    Verifies that compile_evidence_payload compiles real findings from existing
    stores, preserving sources, providers, units, timestamps, quality indicators,
    and explicit reasons for missing data without fabrication.
    """
    payload = nugen_service.compile_evidence_payload(
        zone_id="zone-01",
        anomaly_type="THERMAL_SPIKE",
        operator_notes="Satellite pass verification"
    )

    assert isinstance(payload, MultimodalEvidencePayload)
    assert payload.zone_id == "zone-01"
    assert payload.anomaly_type == "THERMAL_SPIKE"
    assert payload.operator_notes == "Satellite pass verification"
    assert len(payload.evidence_items) >= 4

    # Verify SAR evidence item structure
    sar_item = payload.sar_evidence
    assert sar_item is not None
    assert sar_item.agent_id == "ORCA-AG-04"
    assert sar_item.source == "Copernicus Data Space Ecosystem (CDSE)"
    assert sar_item.finding_type in ("OBSERVATION", "INFERENCE", "HYPOTHESIS")
    assert sar_item.measurement_units is not None or sar_item.missing_data_reason is not None

    # Verify Optical evidence item structure
    optical_item = payload.optical_evidence
    assert optical_item is not None
    assert optical_item.agent_id == "ORCA-AG-03"
    assert optical_item.source in ("Copernicus Data Space Ecosystem STAC", "Copernicus Data Space Ecosystem (CDSE)")

    # Verify AIS evidence item structure
    ais_item = payload.ais_evidence
    assert ais_item is not None
    assert ais_item.agent_id == "ORCA-AG-06"
    assert "AIS" in ais_item.source


# ==============================================================================
# 4. Successful Mocked Response
# [MOCKED TEST NOTE: Explicitly mock test. Does not establish real Nugen API works.]
# ==============================================================================

def test_successful_mocked_response():
    """
    MOCK TEST: Simulates an authorized upstream Nugen inference service returning
    a valid schema. Verifies that NUGEN_NEURAL_REASONING mode is only activated
    after successful response validation.
    """
    async def _run():
        mock_nugen_json = {
            "observation": "Multispectral analysis indicates surface reflectance shift concordant with thermal bloom.",
            "hypothesis": "Sub-surface upwelling suppressed by anomalous anticyclonic eddy.",
            "reasoning_chain": [
                {"step": 1, "agent": "SAR C-Band", "claim": "Backscatter normal at -14.2 dB."},
                {"step": 2, "agent": "Thermal Recon", "claim": "Infrared radiometric elevation of +2.1C."},
                {"step": 3, "consensus": "Multi-agent consensus confirms localized thermal entrapment."}
            ],
            "consensus_action": "Reposition autonomous glider fleet to map thermocline depth boundary.",
            "confidence_score": 93.5,
            "severity": "CRITICAL",
            "alert_type": "CORAL_BLEACHING_RISK"
        }

        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = mock_nugen_json

        svc = NugenService(
            api_key="mock_test_key",
            endpoint="https://mock-nugen-api.internal/deliberate",
            model_id="nugen-marine-v1",
            timeout_seconds=5.0
        )

        payload = svc.compile_evidence_payload("zone-01", "THERMAL_SPIKE")

        with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
            mock_post.return_value = mock_resp
            delib_res = await svc.deliberate(payload)

            assert delib_res.service_status == "INFERENCE_SUCCESS"
            assert delib_res.inference_mode == "NUGEN_NEURAL_REASONING"
            assert delib_res.confidence_score == 93.5
            assert delib_res.severity == "CRITICAL"
            assert "thermal entrapment" in delib_res.reasoning_chain[2]["consensus"]

    asyncio.run(_run())


# ==============================================================================
# 5. Authentication Failure (HTTP 401 / 403)
# [MOCKED TEST NOTE: Simulates invalid credentials on server.]
# ==============================================================================

def test_authentication_failure():
    """
    MOCK TEST: Upstream returns HTTP 401 Unauthorized.
    Service must return INFERENCE_FAILED and fallback mode HEURISTIC_RULE_BASED
    without leaking credentials in logs or errors.
    """
    async def _run():
        mock_resp = MagicMock()
        mock_resp.status_code = 401
        mock_resp.text = "Unauthorized: Invalid API Key"

        svc = NugenService(
            api_key="bad_key",
            endpoint="https://mock-nugen-api.internal/deliberate",
            model_id="nugen-marine-v1"
        )
        payload = svc.compile_evidence_payload("zone-01", "THERMAL_SPIKE")

        with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
            mock_post.return_value = mock_resp
            delib_res = await svc.deliberate(payload)

            assert delib_res.service_status == "INFERENCE_FAILED"
            assert delib_res.inference_mode == "HEURISTIC_RULE_BASED"
            assert "authentication failed" in delib_res.error_message.lower()
            # Verify secret is not in error message
            assert "bad_key" not in delib_res.error_message

    asyncio.run(_run())


# ==============================================================================
# 6. Timeout and Connection Errors
# [MOCKED TEST NOTE: Simulates network disconnect and timeout.]
# ==============================================================================

def test_timeout_and_connection_errors():
    """
    MOCK TEST: Simulates httpx.TimeoutException and httpx.ConnectError.
    Service must gracefully catch the exception, set INFERENCE_FAILED,
    and preserve heuristic fallback.
    """
    async def _run():
        svc = NugenService(
            api_key="test_key",
            endpoint="https://mock-nugen-api.internal/deliberate",
            model_id="nugen-marine-v1",
            timeout_seconds=2.0
        )
        payload = svc.compile_evidence_payload("zone-01", "THERMAL_SPIKE")

        # Timeout
        with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
            mock_post.side_effect = httpx.TimeoutException("Connection timed out")
            delib_res = await svc.deliberate(payload)
            assert delib_res.service_status == "INFERENCE_FAILED"
            assert delib_res.inference_mode == "HEURISTIC_RULE_BASED"
            assert "timed out" in delib_res.error_message.lower()

        # Connection Error
        with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
            mock_post.side_effect = httpx.ConnectError("Failed to connect")
            delib_res = await svc.deliberate(payload)
            assert delib_res.service_status == "INFERENCE_FAILED"
            assert delib_res.inference_mode == "HEURISTIC_RULE_BASED"
            assert "network connection" in delib_res.error_message.lower()

    asyncio.run(_run())


# ==============================================================================
# 7. Rate Limiting (HTTP 429)
# [MOCKED TEST NOTE: Simulates rate-limited upstream API.]
# ==============================================================================

def test_rate_limiting():
    """
    MOCK TEST: Upstream returns HTTP 429 Too Many Requests.
    Service must handle rate-limit gracefully with explicit error message.
    """
    async def _run():
        mock_resp = MagicMock()
        mock_resp.status_code = 429
        mock_resp.text = "Too Many Requests"

        svc = NugenService(
            api_key="test_key",
            endpoint="https://mock-nugen-api.internal/deliberate",
            model_id="nugen-marine-v1"
        )
        payload = svc.compile_evidence_payload("zone-01", "THERMAL_SPIKE")

        with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
            mock_post.return_value = mock_resp
            delib_res = await svc.deliberate(payload)
            assert delib_res.service_status == "INFERENCE_FAILED"
            assert delib_res.inference_mode == "HEURISTIC_RULE_BASED"
            assert "rate limit exceeded" in delib_res.error_message.lower()

    asyncio.run(_run())


# ==============================================================================
# 8. Invalid Response Structure
# [MOCKED TEST NOTE: Simulates malformed response schema.]
# ==============================================================================

def test_invalid_response_structure():
    """
    MOCK TEST: Upstream returns 200 OK but with non-JSON or missing schema fields.
    Service must reject invalid schema and mark INFERENCE_FAILED.
    """
    async def _run():
        svc = NugenService(
            api_key="test_key",
            endpoint="https://mock-nugen-api.internal/deliberate",
            model_id="nugen-marine-v1"
        )
        payload = svc.compile_evidence_payload("zone-01", "THERMAL_SPIKE")

        # Missing required keys
        incomplete_json_resp = MagicMock()
        incomplete_json_resp.status_code = 200
        incomplete_json_resp.json.return_value = {"status": "ok"} # Missing observation, hypothesis, etc.

        with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
            mock_post.return_value = incomplete_json_resp
            delib_res = await svc.deliberate(payload)
            assert delib_res.service_status == "INFERENCE_FAILED"
            assert delib_res.inference_mode == "HEURISTIC_RULE_BASED"
            assert "missing required keys" in delib_res.error_message.lower()

    asyncio.run(_run())


# ==============================================================================
# 9. Rule-Based Fallback via Lead Orchestrator
# ==============================================================================

def test_rule_based_fallback_execution():
    """
    When Nugen is unconfigured or unavailable:
    Lead Orchestrator deliberate_on_anomaly returns deterministic rule-based
    findings with explicit inference_mode = 'HEURISTIC_RULE_BASED' and status.
    """
    async def _run():
        with patch.object(settings, "NUGEN_API_KEY", ""):
            req = DeliberationRequest(zone_id="zone-01", anomaly_type="THERMAL_SPIKE")
            log = await agent_engine.deliberate_on_anomaly(req)

            assert log.inference_mode == "HEURISTIC_RULE_BASED"
            assert log.nugen_status in ("UNCONFIGURED", "MODEL_UNAVAILABLE")
            assert log.agent_name == "HydroThermal Recon-02"
            assert "Sea Surface Temperature" in log.observation
            assert len(log.reasoning_chain) == 3

    asyncio.run(_run())


# ==============================================================================
# 10. Correct Reporting of Inference Mode via API Endpoints
# ==============================================================================

def test_api_status_and_deliberate_endpoints():
    """
    Verifies that GET /api/v1/reasoning/status and POST /api/v1/reasoning/deliberate
    report inference_mode and service_status correctly.
    """
    # 1. Status endpoint
    status_resp = client.get("/api/v1/reasoning/status")
    assert status_resp.status_code == 200
    data = status_resp.json()
    assert "status" in data
    assert "is_configured" in data
    assert "has_model_id" in data
    assert "timeout_seconds" in data
    assert "detail" in data

    # 2. Evidence inspection endpoint
    ev_resp = client.get("/api/v1/reasoning/evidence/zone-01?anomaly_type=THERMAL_SPIKE")
    assert ev_resp.status_code == 200
    ev_data = ev_resp.json()
    assert ev_data["zone_id"] == "zone-01"
    assert "evidence_items" in ev_data

    # 3. Deliberation endpoint (tested in unconfigured fallback state)
    with patch.object(settings, "NUGEN_API_KEY", ""):
        delib_resp = client.post(
            "/api/v1/reasoning/deliberate",
            json={"zone_id": "zone-01", "anomaly_type": "THERMAL_SPIKE"}
        )
        assert delib_resp.status_code == 200
        delib_data = delib_resp.json()
        assert delib_data["inference_mode"] == "HEURISTIC_RULE_BASED"
        assert delib_data["nugen_status"] in ("UNCONFIGURED", "MODEL_UNAVAILABLE")
        assert isinstance(delib_data["missing_evidence"], list)


# ==============================================================================
# 11. No Fabricated Successful Inference
# ==============================================================================

def test_no_fabricated_successful_inference():
    """
    Ensures that under zero-configuration or fallback conditions,
    the platform NEVER claims NUGEN_NEURAL_REASONING or fabricates model outputs.
    """
    with patch.object(settings, "NUGEN_API_KEY", ""):
        with patch.object(settings, "NUGEN_ENDPOINT", ""):
            with patch.object(settings, "NUGEN_MODEL_ID", ""):
                delib_resp = client.post(
                    "/api/v1/reasoning/deliberate",
                    json={"zone_id": "zone-01", "anomaly_type": "UNKNOWN_VESSEL"}
                )
                assert delib_resp.status_code == 200
                res = delib_resp.json()
                assert res["inference_mode"] == "HEURISTIC_RULE_BASED"
                assert res["inference_mode"] != "NUGEN_NEURAL_REASONING"
                assert res["nugen_status"] == "UNCONFIGURED"
