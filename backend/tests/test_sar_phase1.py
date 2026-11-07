"""
ORCA Phase 1 Verification Test Suite: Sentinel-1 SAR Imagery Processing & Anomaly Candidate Extraction
Indradhanu Hackathon 2026 - AI for Greener Tomorrow

Tests:
1. Sentinel-1 discovery via CDSE STAC (product metadata, acquisition timestamps, platform, bounding boxes).
2. Download asset handling (distinguishing public quicklook previews from protected S3/OAuth2 full rasters).
3. Complete mathematical SAR pipeline on image raster (radiometric calibration to Sigma-0 dB, Refined Lee speckle filter, land masking, candidate detection, GeoJSON polygon geometry, uncertainty margin).
4. Strict enforcement: prohibition of silent synthetic substitution when allow_synthetic_fallback=False.
5. Explicit tier labelling across PREVIEW, LIVE_PROCESSED_IMAGERY, SIMULATED, METADATA_ONLY, UNAVAILABLE.
6. Evidence payload compilation into Lead Orchestrator / Nugen with full provenance and candidate geometries.
7. SAR FastAPI REST endpoints verification.
"""

import sys
import os
import io
from pathlib import Path
import pytest
import numpy as np
from PIL import Image
from fastapi.testclient import TestClient

backend_path = Path(__file__).resolve().parent.parent
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from app.main import app
from app.services.copernicus_service import copernicus_service
from app.services.sar_engine import sar_engine
from app.services.sar_storage import sar_storage
from app.services.nugen_service import nugen_service
from app.schemas.marine import SatelliteSearchQuery
from app.schemas.sar import SARPreprocessingParams, SARProcessingRequest

client = TestClient(app)

def create_sample_marine_radar_image_bytes(width: int = 120, height: int = 90) -> bytes:
    """
    Creates a valid synthetic grayscale radar test raster in PNG format.
    Simulates ambient sea speckle with an intentional dark capillary-damping slick patch.
    """
    # Background sea speckle: mean 128, std 20
    np.random.seed(42)
    sea = np.random.normal(loc=130, scale=18, size=(height, width)).clip(40, 240).astype(np.uint8)

    # Insert a low-backscatter dark slick anomaly in the center (representing capillary wave damping)
    cy, cx = height // 2, width // 2
    y_indices, x_indices = np.ogrid[:height, :width]
    mask = ((x_indices - cx) ** 2 / 18**2 + (y_indices - cy) ** 2 / 8**2) <= 1.0
    sea[mask] = np.random.normal(loc=45, scale=8, size=mask.sum()).clip(10, 80).astype(np.uint8)

    # Insert a bright metallic point echo (ship target)
    sea[cy - 10, cx + 20] = 255
    sea[cy - 9, cx + 20] = 250

    img = Image.fromarray(sea, mode="L")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


class TestSentinel1Discovery:
    """Requirement 1 & 2: Discover acquisitions and inspect product metadata."""

    def test_sentinel1_stac_discovery(self):
        """Verify discovery of Sentinel-1 products with real metadata from CDSE STAC."""
        # Query with a bounding box (Persian Gulf maritime corridor)
        res = copernicus_service.search_sentinel1(
            SatelliteSearchQuery(
                satellite="sentinel-1",
                bbox=[54.0, 25.5, 57.5, 27.5],
                limit=3
            )
        )
        assert res.total_features >= 0
        assert res.collection == "sentinel-1-grd"
        assert res.stac_endpoint is not None
        assert isinstance(res.features, list)

        if len(res.features) > 0:
            prod = res.features[0]
            assert prod.id is not None
            assert prod.platform is not None
            assert prod.acquisition_timestamp is not None
            assert prod.assets_count > 0
            assert "thumbnail" in prod.assets or "Product" in prod.assets

    def test_sar_products_endpoint(self):
        """Verify GET /api/v1/sar/products returns valid STAC features."""
        r = client.get("/api/v1/sar/products?limit=2&min_lon=54.0&min_lat=25.5&max_lon=57.5&max_lat=27.5")
        assert r.status_code == 200
        data = r.json()
        assert "features" in data
        assert "collection" in data
        assert data["collection"] == "sentinel-1-grd"


class TestSARAssetDownloadAuthorization:
    """Requirement 3: Verify access permissions and asset retrieval distinction."""

    def test_asset_inspection_distinguishes_preview_and_full_raster(self):
        """
        Verify that asset inspection labels 'thumbnail' as downloadable without auth,
        and full raw assets (vh, vv, Product) as requiring authentication.
        """
        # Discover an actual product
        search = copernicus_service.search_sentinel1(
            SatelliteSearchQuery(satellite="sentinel-1", limit=1)
        )
        if not search.features:
            pytest.skip("CDSE STAC temporarily returned no features for bounding box")

        prod_id = search.features[0].id
        assets_resp = sar_engine.get_product_assets(prod_id)
        assert assets_resp.product_id == prod_id
        assert assets_resp.assets_count > 0

        # Thumbnail should be public
        if "thumbnail" in assets_resp.assets:
            thumb = assets_resp.assets["thumbnail"]
            assert thumb.is_downloadable_without_auth is True

        # S3 or Product should require authorization
        if "vh" in assets_resp.assets:
            assert assets_resp.assets["vh"].is_downloadable_without_auth is False
        if "Product" in assets_resp.assets:
            assert assets_resp.assets["Product"].is_downloadable_without_auth is False

    def test_download_s3_asset_returns_auth_required_safely(self):
        """
        Verify attempting to download an s3:// raster without EODATA credentials
        does not crash and returns AUTH_REQUIRED_FOR_FULL_RASTER.
        """
        search = copernicus_service.search_sentinel1(
            SatelliteSearchQuery(satellite="sentinel-1", limit=1)
        )
        if not search.features:
            pytest.skip("CDSE STAC returned no features")

        prod_id = search.features[0].id
        # Attempt to download 'vh' asset which is s3://
        res = sar_engine.download_asset(prod_id, asset_key="vh")
        assert res.status in ("AUTH_REQUIRED_FOR_FULL_RASTER", "UNAVAILABLE", "PREVIEW_STAGED")
        if res.status == "AUTH_REQUIRED_FOR_FULL_RASTER":
            assert res.auth_details is not None
            assert "CREDENTIALS_REQUIRED" in res.auth_details


class TestSARProcessingWorkflow:
    """Requirements 4, 5 & 6: Preprocessing, filtering, anomaly detection, geometry and uncertainty."""

    def test_sar_processing_with_real_raster_data(self):
        """
        Execute the complete processing pipeline on an injected radar raster.
        Verifies:
        - Radiometric calibration (Sigma-0 dB)
        - Refined Lee speckle filtering
        - Land masking
        - Statistical sea backscatter calculation
        - Anomaly candidate detection with damping ratio dB, area km², and GeoJSON polygon
        - Calculated uncertainty margin
        """
        raster_bytes = create_sample_marine_radar_image_bytes(width=160, height=120)
        params = SARPreprocessingParams(
            calibration_mode="SIGMA_NAUGHT_DB",
            speckle_filter="REFINED_LEE",
            filter_window_size=5,
            enable_land_masking=True,
            adaptive_threshold_sigma=2.0,
            min_cluster_pixels=10
        )

        result = sar_engine.process_sar_product(
            product_id="S1_TEST_VERIFIED_RASTER_001",
            asset_key="thumbnail",
            params=params,
            custom_image_bytes=raster_bytes,
            allow_synthetic_fallback=False
        )

        assert result.analysis_id.startswith("SAR-PROC-")
        assert result.product_id == "S1_TEST_VERIFIED_RASTER_001"
        assert result.data_tier in ("PREVIEW", "LIVE_PROCESSED_IMAGERY", "CALIBRATED_PREVIEW_ANALYSIS")
        assert result.processing_status == "COMPLETED"
        assert result.uncertainty == 0.15  # Preview tier uncertainty

        # Verify pipeline stages
        stages = {s.stage_name: s.status for s in result.pipeline_stages}
        assert "Radiometric Calibration" in stages
        assert "Speckle Filtering" in stages
        assert "Georeferencing & Spatial Mapping" in stages
        assert "Land & Coastal Masking" in stages
        assert "Statistical Backscatter Analysis" in stages
        assert "Surface Anomaly Candidate Detection" in stages

        # Verify backscatter statistics
        stats = result.backscatter_statistics
        assert "ambient_sea_mean_db" in stats
        assert "ambient_sea_std_db" in stats
        assert "detection_threshold_db" in stats
        assert stats["ambient_sea_mean_db"] < 0  # In dB space

        # Verify candidates were detected (since we injected an elliptical dark slick)
        assert result.total_candidates_found >= 1
        cand = result.anomaly_candidates[0]
        assert "SAR" in cand.candidate_id
        assert cand.anomaly_type in ("LOW_BACKSCATTER_CANDIDATE", "DARK_FORMATION_LOOKALIKE", "METALLIC_POINT_ECHO")
        assert cand.damping_ratio_db > 0.0  # Significant damping relative to ambient sea
        assert cand.area_sq_km > 0.0
        assert len(cand.bounding_box) == 4
        assert cand.uncertainty >= 0.05
        assert cand.geometry_type == "Polygon"
        assert cand.geojson_geometry is not None
        assert "coordinates" in cand.geojson_geometry
        assert len(cand.geojson_geometry["coordinates"][0]) >= 4  # Valid closed polygon ring

        # Verify generated visualizations
        assert "calibrated_backscatter_png" in result.visualizations
        assert "speckle_filtered_png" in result.visualizations
        assert "anomaly_candidate_mask_png" in result.visualizations


class TestSyntheticFallbackGuardrails:
    """Requirements 7 & 8: Prohibition of silent substitution & explicit tiers."""

    def test_strict_mode_rejects_missing_product_without_silent_substitution(self):
        """
        Verify that when allow_synthetic_fallback=False, a missing asset
        raises ValueError and is NOT silently replaced by synthetic data.
        """
        with pytest.raises(ValueError) as exc:
            sar_engine.process_sar_product(
                product_id="S1_NON_EXISTENT_SCENE_999",
                asset_key="thumbnail",
                allow_synthetic_fallback=False
            )
        assert "Silent synthetic substitution is prohibited" in str(exc.value)

    def test_explicit_synthetic_fallback_is_transparently_labelled(self):
        """
        Verify that when allow_synthetic_fallback=True is explicitly granted,
        the output data_tier is labeled SIMULATED, processing_status is DEGRADED,
        and uncertainty is 0.40.
        """
        res = sar_engine.process_sar_product(
            product_id="S1_OFFLINE_TEST_MODE",
            asset_key="thumbnail",
            allow_synthetic_fallback=True
        )
        assert res.data_tier == "SIMULATED"
        assert res.processing_status == "DEGRADED"
        assert res.uncertainty == 0.40
        assert res.is_preview is False
        assert res.processing_engine_info.get("data_tier") == "SIMULATED"

    def test_api_pipeline_rejects_missing_data_when_fallback_disabled(self):
        """Verify POST /api/v1/sar/pipeline/process returns HTTP 400 when download fails in strict mode."""
        payload = {
            "product_id": "S1_INVALID_PRODUCT_XYZ",
            "asset_key": "thumbnail",
            "allow_synthetic_fallback": False
        }
        res = client.post("/api/v1/sar/pipeline/process", json=payload)
        assert res.status_code == 400
        assert "Silent synthetic substitution is prohibited" in res.json()["detail"]


class TestLeadOrchestratorEvidenceIntegration:
    """Requirement 9: Pass available, provenance-labelled SAR evidence to Lead Orchestrator."""

    def test_evidence_compiler_includes_sar_provenance_and_candidates(self):
        """
        Verify that nugen_service.compile_evidence_payload collects staged SAR analyses
        with full provenance, source attribution, acquisition timestamps, uncertainty,
        and candidate geometries.
        """
        # Ensure a verified SAR analysis is in storage
        raster_bytes = create_sample_marine_radar_image_bytes(width=100, height=80)
        res = sar_engine.process_sar_product(
            product_id="S1_VERIFIED_STAGE_001",
            asset_key="thumbnail",
            custom_image_bytes=raster_bytes,
            allow_synthetic_fallback=False
        )
        sar_storage.save_analysis(res)

        payload = nugen_service.compile_evidence_payload(
            zone_id="zone-01",
            anomaly_type="DARK_FORMATION_LOOKALIKE"
        )

        assert payload.sar_evidence is not None
        sar_ev = payload.sar_evidence
        assert sar_ev.agent_id == "ORCA-AG-04"
        assert sar_ev.is_available is True
        assert sar_ev.source == "Copernicus Data Space Ecosystem (CDSE)"
        assert sar_ev.provider == "European Space Agency (ESA)"
        assert sar_ev.uncertainty_margin is not None
        assert sar_ev.uncertainty_margin <= 0.20

        # Metrics should contain candidates with geometry details
        metrics = sar_ev.metrics
        assert "data_tier" in metrics
        assert "candidates" in metrics
        if len(metrics["candidates"]) > 0:
            top_cand = metrics["candidates"][0]
            assert "candidate_id" in top_cand
            assert "area_sq_km" in top_cand
            assert "bounding_box" in top_cand
            assert "geometry_type" in top_cand
            assert "geojson_geometry" in top_cand
            assert "uncertainty" in top_cand


class TestSARDependenciesAndLedgerEndpoints:
    """Requirement 10: Display results, system capabilities, and ledger."""

    def test_sar_dependencies_endpoint(self):
        """Verify /api/v1/sar/dependencies reports real mathematical and image libraries."""
        res = client.get("/api/v1/sar/dependencies")
        assert res.status_code == 200
        data = res.json()
        assert "engine_name" in data
        assert "installed_libraries" in data
        libs = {k.lower(): v for k, v in data["installed_libraries"].items()}
        assert "numpy" in libs
        assert "scipy" in libs
        assert "pillow" in libs
        assert "scikit-learn" in libs

    def test_sar_analyses_ledger_endpoint(self):
        """Verify /api/v1/sar/analyses returns stored analyses."""
        res = client.get("/api/v1/sar/analyses")
        assert res.status_code == 200
        analyses = res.json()
        assert isinstance(analyses, list)
        assert len(analyses) >= 1
