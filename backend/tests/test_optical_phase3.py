import sys
from pathlib import Path

backend_path = Path(__file__).resolve().parent.parent
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

import pytest
import io
import base64
import numpy as np
from PIL import Image
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from app.main import app
from app.services.copernicus_service import copernicus_service
from app.services.optical_engine import optical_engine, SENTINEL2_SPECTRAL_BANDS
from app.services.nugen_service import nugen_service
from app.schemas.marine import SatelliteSearchQuery
from app.schemas.optical import OpticalProcessRequest, OpticalDownloadRequest

client = TestClient(app)


def create_dummy_png_bytes(width=64, height=64, color=(20, 80, 120)) -> bytes:
    """Creates raw PNG bytes for test processing."""
    img = Image.new("RGB", (width, height), color=color)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def create_cloud_heavy_png_bytes(width=64, height=64) -> bytes:
    """Creates raw cloudy PNG bytes (bright white/grey pixels)."""
    img = Image.new("RGB", (width, height), color=(240, 245, 250))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


class TestSentinel2DiscoveryAndMetadata:
    """Verifies Sentinel-2 metadata discovery via Copernicus STAC."""

    def test_sentinel2_stac_search_returns_normalized_products(self):
        # Query known marine bounding box (Great Barrier Reef)
        q = SatelliteSearchQuery(
            satellite="sentinel-2",
            bbox=[145.5, -15.8, 146.2, -15.1],
            limit=5
        )
        res = copernicus_service.search_sentinel2(q)
        assert res is not None
        assert hasattr(res, "features")
        assert len(res.features) > 0

        first_prod = res.features[0]
        assert first_prod.id.startswith("S2")
        assert "sentinel-2" in first_prod.satellite.lower()
        assert first_prod.platform.lower() in ("sentinel-2a", "sentinel-2b", "sentinel-2c", "sentinel-2")
        assert first_prod.acquisition_timestamp is not None
        assert first_prod.cloud_cover_pct is not None
        assert isinstance(first_prod.cloud_cover_pct, (int, float))

    def test_sentinel2_direct_product_id_lookup(self):
        q1 = SatelliteSearchQuery(satellite="sentinel-2", limit=1)
        search_res = copernicus_service.search_sentinel2(q1)
        if search_res.features:
            target_id = search_res.features[0].id
            q2 = SatelliteSearchQuery(satellite="sentinel-2", product_id=target_id, limit=1)
            direct_res = copernicus_service.search_sentinel2(q2)
            assert len(direct_res.features) >= 1
            assert direct_res.features[0].id == target_id

    def test_copernicus_sentinel2_api_endpoint(self):
        response = client.get("/api/v1/satellite/sentinel-2/search?limit=3")
        assert response.status_code == 200
        data = response.json()
        assert "features" in data
        assert "total_features" in data
        if data["total_features"] == 0:
            pytest.skip("External CDSE STAC read timed out during remote query")
        assert data["total_features"] >= 1


class TestSentinel2AssetInspectionAndDownload:
    """Verifies asset discovery, spectral bands mapping, and CDSE download handling."""

    def test_spectral_bands_mapping_completeness(self):
        # Verify Sentinel-2 MSI spectral bands are defined
        required_bands = ["B01", "B02", "B03", "B04", "B05", "B06", "B07", "B08", "B8A", "B09", "B11", "B12", "TCI", "SCL"]
        for b in required_bands:
            assert b in SENTINEL2_SPECTRAL_BANDS
            band_info = SENTINEL2_SPECTRAL_BANDS[b]
            assert "name" in band_info
            assert "resolution_meters" in band_info

    def test_get_product_assets_inspects_public_previews_and_rasters(self):
        q = SatelliteSearchQuery(satellite="sentinel-2", limit=1)
        search_res = copernicus_service.search_sentinel2(q)
        assert len(search_res.features) > 0
        product_id = search_res.features[0].id

        assets_resp = optical_engine.get_product_assets(product_id)
        assert assets_resp.product_id == product_id
        assert assets_resp.assets_count > 0
        assert len(assets_resp.available_bands) >= 5

        # Check public preview existence in assets
        public_previews = [a for a in assets_resp.assets.values() if a.is_downloadable_without_auth]
        assert len(public_previews) >= 1
        preview = public_previews[0]
        assert preview.is_downloadable_without_auth is True
        assert "catalogue.dataspace.copernicus.eu" in preview.href or "Assets" in preview.href

    def test_download_asset_staged_from_cdse_odata(self):
        q = SatelliteSearchQuery(satellite="sentinel-2", limit=1)
        search_res = copernicus_service.search_sentinel2(q)
        if len(search_res.features) == 0 and ("429" in str(search_res.message) or "rate limit" in str(search_res.message).lower()):
            pytest.skip(f"External CDSE STAC rate limited: {search_res.message}")
        assert len(search_res.features) > 0
        product_id = search_res.features[0].id

        download_resp = optical_engine.download_asset(product_id, asset_key="thumbnail")
        if download_resp.status == "FAILED" and ("Failed to resolve" in str(download_resp.message) or "Network error" in str(download_resp.message)):
            pytest.skip(f"External CDSE download endpoint temporarily unreachable: {download_resp.message}")
        assert download_resp.status in ("PREVIEW_STAGED", "DOWNLOADED")
        assert download_resp.size_bytes > 0
        assert download_resp.is_preview is True
        assert download_resp.local_path is not None
        assert Path(download_resp.local_path).exists()

        # Second download should hit local cache
        cache_resp = optical_engine.download_asset(product_id, asset_key="thumbnail")
        assert cache_resp.status in ("PREVIEW_STAGED", "DOWNLOADED")

    def test_download_s3_raster_safely_reports_auth_required(self):
        q = SatelliteSearchQuery(satellite="sentinel-2", limit=1)
        search_res = copernicus_service.search_sentinel2(q)
        assert len(search_res.features) > 0
        product_id = search_res.features[0].id
        product = copernicus_service.get_product(product_id)

        s3_key = next((k for k, v in product.assets.items() if v.href.startswith("s3://")), None)
        if not s3_key:
            s3_key = "B04_S3_TEST"
            product.assets[s3_key] = MagicMock(href="s3://eodata/Sentinel-2/MSI/L2A/B04.jp2")
            with patch.object(copernicus_service, "get_product", return_value=product):
                download_resp = optical_engine.download_asset(product_id, asset_key=s3_key)
        else:
            download_resp = optical_engine.download_asset(product_id, asset_key=s3_key)

        assert download_resp.status == "AUTH_REQUIRED_FOR_FULL_RASTER"
        assert not download_resp.size_bytes
        assert "S3" in download_resp.message or "credentials" in download_resp.message


class TestMultispectralProcessingAndCloudScreening:
    """Verifies radiometric ratioing, aquatic extraction, and cloud threshold screening."""

    def test_clear_water_multispectral_indicators_calculation(self):
        # Create a water-like image (low red, moderate green, higher blue)
        raw_bytes = create_dummy_png_bytes(color=(20, 70, 110))

        result = optical_engine.process_optical_product(
            product_id="TEST_S2_CLEAR_WATER",
            zone_id="TEST_ZONE",
            custom_image_bytes=raw_bytes,
            allow_synthetic_fallback=False
        )

        assert result.processing_status == "COMPLETED"
        assert result.data_tier == "CALIBRATED_PREVIEW_ANALYSIS"
        assert result.uncertainty_margin <= 0.15

        # Indicators verification
        ind = result.spectral_indicators
        assert ind.valid_water_coverage_pct > 80.0
        assert ind.cloud_coverage_pct < 10.0
        assert ind.ndci_chlorophyll_proxy > 0.0
        assert ind.turbidity_spm_index > 0.0
        assert -1.0 <= ind.ndwi_water_index <= 1.0
        assert ind.algal_bloom_risk in ("LOW", "MODERATE", "ELEVATED", "HIGH")
        assert ind.turbidity_severity in ("CLEAR", "SLIGHT_PLUME", "MODERATE_TURBIDITY", "HEAVY_SEDIMENT")

        # Visualizations generated
        assert result.visualizations["true_color_rgb_png"].startswith("data:image/png;base64,")
        assert result.visualizations["chlorophyll_ndci_png"].startswith("data:image/png;base64,")
        assert result.visualizations["turbidity_spm_png"].startswith("data:image/png;base64,")

    def test_cloud_heavy_screening_raises_uncertainty_and_status(self):
        # High brightness image simulating dense cloud cover
        cloud_bytes = create_cloud_heavy_png_bytes()

        result = optical_engine.process_optical_product(
            product_id="TEST_S2_CLOUDY_SCENE",
            zone_id="TEST_ZONE_CLOUD",
            custom_image_bytes=cloud_bytes,
            allow_synthetic_fallback=False
        )

        assert result.processing_status == "HIGH_CLOUD_COVER"
        assert result.uncertainty_margin >= 0.30
        assert "HIGH_CLOUD_OBSCURATION" in result.quality_flags
        assert result.spectral_indicators.cloud_coverage_pct > 70.0


class TestScientificIntegrityAndDisclaimer:
    """Verifies direct radiometry vs derived proxies and mandatory scientific disclaimer (Req 7)."""

    def test_direct_observations_vs_derived_proxies_separation(self):
        raw_bytes = create_dummy_png_bytes()
        result = optical_engine.process_optical_product(
            product_id="TEST_S2_INTEGRITY",
            custom_image_bytes=raw_bytes
        )

        ind = result.spectral_indicators
        # Direct observations
        assert ind.direct_observations is not None
        assert "mean_reflectance_red" in ind.direct_observations
        assert "valid_water_coverage_pct" in ind.direct_observations

        # Derived proxies
        assert ind.derived_proxies is not None
        assert "ndci_chlorophyll_proxy" in ind.derived_proxies
        assert "turbidity_spm_index" in ind.derived_proxies
        assert "algal_bloom_risk" in ind.derived_proxies

    def test_mandatory_scientific_disclaimer_attached(self):
        raw_bytes = create_dummy_png_bytes()
        result = optical_engine.process_optical_product(
            product_id="TEST_S2_DISCLAIMER",
            custom_image_bytes=raw_bytes
        )

        assert result.scientific_disclaimer is not None
        # Check disclaimer text warns that proxies must not be asserted as toxic pollutants
        disclaimer_lower = result.scientific_disclaimer.lower()
        assert "proxy" in disclaimer_lower or "proxies" in disclaimer_lower
        assert "not" in disclaimer_lower or "prohibit" in disclaimer_lower or "corroboration" in disclaimer_lower


class TestSyntheticFallbackGuardrails:
    """Verifies strict zero-silent-substitution guardrail."""

    def test_strict_mode_rejects_missing_image_without_silent_substitution(self):
        # allow_synthetic_fallback=False must raise ValueError when product cannot be downloaded
        with patch.object(optical_engine, "download_asset", return_value=MagicMock(status="FAILED", local_path=None)):
            with pytest.raises(ValueError) as excinfo:
                optical_engine.process_optical_product(
                    product_id="NON_EXISTENT_S2_PRODUCT_XYZ",
                    allow_synthetic_fallback=False
                )
            assert "Strict non-synthetic mode enabled" in str(excinfo.value) or "Silent synthetic substitution is prohibited" in str(excinfo.value)

    def test_explicit_synthetic_mode_transparently_labels_simulated(self):
        # allow_synthetic_fallback=True must explicitly flag SIMULATED
        with patch.object(optical_engine, "download_asset", return_value=MagicMock(status="FAILED", local_path=None)):
            result = optical_engine.process_optical_product(
                product_id="NON_EXISTENT_S2_FALLBACK_TEST",
                allow_synthetic_fallback=True
            )
            assert result.data_tier == "SIMULATED"
            assert result.is_preview is False
            assert "SYNTHETIC_FALLBACK_GENERATED" in result.quality_flags
            assert result.uncertainty_margin >= 0.35


class TestLeadOrchestratorEvidenceFlow:
    """Verifies that optical evidence flows into the Nugen Lead Orchestrator with verified integrity."""

    def test_lead_orchestrator_compiles_optical_evidence(self):
        # Ensure at least one optical analysis exists in storage
        raw_bytes = create_dummy_png_bytes()
        optical_engine.process_optical_product(
            product_id="TEST_S2_NUGEN_FLOW",
            custom_image_bytes=raw_bytes
        )

        payload = nugen_service.compile_evidence_payload(
            zone_id="ZONE-GBR-01",
            anomaly_type="ALGAL_BLOOM_RISK"
        )

        assert payload.optical_evidence is not None
        opt_ev = payload.optical_evidence
        assert opt_ev.agent_name == "Sentinel-2 MSI Optical"
        assert opt_ev.is_available is True
        assert opt_ev.uncertainty_margin is not None

        # Evidence metrics contains direct observations and derived proxies
        metrics = opt_ev.metrics
        assert "ndci_chlorophyll_proxy" in metrics
        assert "turbidity_spm_index" in metrics
        assert "direct_observations" in metrics
        assert "derived_proxies" in metrics

    def test_nugen_system_prompt_includes_rule_7_for_optical_proxies(self):
        # Verify Rule 7 exists in nugen_service
        with open(backend_path / "app" / "services" / "nugen_service.py", "r", encoding="utf-8") as f:
            content = f.read()
        assert "Optical spectral indicators (NDCI chlorophyll proxies and turbidity SPM ratios)" in content
        assert "NEVER be asserted as definitive chemical pollutant" in content


class TestOpticalAPIEndpoints:
    """Verifies FastAPI REST endpoints for Optical processing."""

    def test_optical_health_endpoint(self):
        resp = client.get("/api/v1/optical/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "OPERATIONAL"
        assert "engine" in data
        assert "Sentinel-2" in data["source_attribution"]

    def test_product_assets_endpoint(self):
        q = SatelliteSearchQuery(satellite="sentinel-2", limit=1)
        search_res = copernicus_service.search_sentinel2(q)
        assert len(search_res.features) > 0
        pid = search_res.features[0].id

        resp = client.get(f"/api/v1/optical/products/{pid}/assets")
        assert resp.status_code == 200
        data = resp.json()
        assert data["product_id"] == pid
        assert "available_bands" in data
        assert "assets" in data

    def test_download_asset_endpoint(self):
        q = SatelliteSearchQuery(satellite="sentinel-2", limit=1)
        search_res = copernicus_service.search_sentinel2(q)
        assert len(search_res.features) > 0
        pid = search_res.features[0].id

        resp = client.post(
            f"/api/v1/optical/products/{pid}/download-asset",
            json={"product_id": pid, "asset_key": "thumbnail"}
        )
        assert resp.status_code == 200
        data = resp.json()
        if data["status"] == "FAILED" and ("Failed to resolve" in str(data.get("message", "")) or "Network error" in str(data.get("message", "")) or "Max retries" in str(data.get("message", ""))):
            pytest.skip(f"External CDSE download endpoint temporarily unreachable: {data.get('message')}")
        assert data["status"] in ("PREVIEW_STAGED", "DOWNLOADED")
        assert data["size_bytes"] > 0

    def test_process_optical_endpoint_with_custom_image(self):
        raw_bytes = create_dummy_png_bytes()
        img_b64 = base64.b64encode(raw_bytes).decode("utf-8")
        payload = {
            "product_id": "TEST_API_S2_PRODUCT",
            "zone_id": "GBR",
            "custom_image_base64": img_b64,
            "allow_synthetic_fallback": False
        }
        resp = client.post("/api/v1/optical/process", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["analysis_id"] is not None
        assert data["data_tier"] == "CALIBRATED_PREVIEW_ANALYSIS"
        assert "spectral_indicators" in data
        assert "visualizations" in data

        # Check in analyses ledger
        aid = data["analysis_id"]
        get_resp = client.get(f"/api/v1/optical/analyses/{aid}")
        assert get_resp.status_code == 200
        assert get_resp.json()["analysis_id"] == aid

        # Delete test analysis
        del_resp = client.delete(f"/api/v1/optical/analyses/{aid}")
        assert del_resp.status_code == 200
