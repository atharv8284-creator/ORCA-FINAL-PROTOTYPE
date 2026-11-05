import time
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from app.core.config import settings
from app.schemas.marine import (
    SatelliteSearchQuery,
    CopernicusSearchResponse,
    CopernicusSatelliteProduct,
    SatelliteAssetInfo,
    ProcessingPipelineStatus,
    CopernicusServiceHealth
)

logger = logging.getLogger(__name__)

class CopernicusSTACService:
    """
    Real-world Satellite Data Integration for ORCA Marine Intelligence.
    Direct integration with the official Copernicus Data Space Ecosystem (CDSE) STAC API.
    STAC Catalog Root: https://stac.dataspace.copernicus.eu/v1/
    Documentation: https://documentation.dataspace.copernicus.eu/APIs/STAC.html
    """

    def __init__(self):
        self.base_url = settings.COPERNICUS_STAC_URL.rstrip('/')
        self.search_url = f"{self.base_url}/search"
        self.auth_url = settings.COPERNICUS_AUTH_URL
        
        # Configure robust HTTP session with retries for transient network issues
        self.session = requests.Session()
        retries = Retry(
            total=3,
            backoff_factor=0.5,
            status_forcelist=[429, 500, 502, 503, 504],
            raise_on_status=False
        )
        adapter = HTTPAdapter(max_retries=retries)
        self.session.mount("https://", adapter)
        self.session.mount("http://", adapter)
        self.session.headers.update({
            "User-Agent": "ORCA-Marine-Platform/1.0 (Indradhanu-Hackathon-2026; STAC-Client)",
            "Accept": "application/json"
        })
        self._product_cache: Dict[str, CopernicusSatelliteProduct] = {}

    def check_health(self) -> CopernicusServiceHealth:
        """
        Verify live connectivity to Copernicus Data Space STAC catalog,
        measure latency, and verify authentication configuration.
        """
        start = time.time()
        try:
            res = self.session.get(self.base_url, timeout=12)
            latency = (time.time() - start) * 1000.0

            if res.status_code == 200:
                data = res.json()
                conforms = data.get("conformsTo", [])
                stac_version = data.get("stac_version", "1.0.0")
                status = "OPERATIONAL"
            else:
                latency = (time.time() - start) * 1000.0
                stac_version = "unknown"
                conforms = []
                status = "DEGRADED"

        except Exception as e:
            latency = (time.time() - start) * 1000.0
            logger.error(f"Failed to connect to Copernicus STAC endpoint: {e}")
            return CopernicusServiceHealth(
                status="UNREACHABLE",
                stac_endpoint=self.base_url,
                latency_ms=round(latency, 2),
                stac_version="N/A",
                conformance_count=0,
                supported_collections=["sentinel-1-grd", "sentinel-2-l2a"],
                authentication_required_for_metadata=False,
                authentication_required_for_download=True,
                auth_configured=bool(settings.COPERNICUS_CLIENT_ID or settings.COPERNICUS_USERNAME),
                auth_instructions=(
                    "Could not connect to Copernicus STAC service. Please verify internet access. "
                    "Free registration for full data downloads is available at https://dataspace.copernicus.eu/"
                )
            )

        auth_configured = bool(settings.COPERNICUS_CLIENT_ID or settings.COPERNICUS_USERNAME)
        auth_msg = (
            "Authentication Configured: Ready for authenticated asset staging."
            if auth_configured else
            "Unauthenticated STAC Discovery Active: Satellite metadata search and asset inventory "
            "do not require authentication. Full raw raster granule downloads require free registration "
            "at https://dataspace.copernicus.eu/ and setting COPERNICUS_CLIENT_ID / COPERNICUS_CLIENT_SECRET in .env."
        )

        return CopernicusServiceHealth(
            status=status,
            stac_endpoint=self.base_url,
            latency_ms=round(latency, 2),
            stac_version=stac_version,
            conformance_count=len(conforms),
            supported_collections=["sentinel-1-grd", "sentinel-2-l2a"],
            authentication_required_for_metadata=False,
            authentication_required_for_download=True,
            auth_configured=auth_configured,
            auth_instructions=auth_msg
        )

    def search_sentinel1(self, query: SatelliteSearchQuery) -> CopernicusSearchResponse:
        """
        Query available Sentinel-1 SAR observation metadata from Copernicus Data Space.
        Supports:
        - Geographical bounding box: [min_lon, min_lat, max_lon, max_lat]
        - Date range: start_date, end_date (formatted as RFC3339 datetime)
        - Product identifier
        - Available assets & product metadata (radar polarization, orbit, platform)
        """
        return self._execute_stac_search(
            collection="sentinel-1-grd",
            satellite_family="Sentinel-1",
            sensor_type="SAR C-Band",
            query=query
        )

    def search_sentinel2(self, query: SatelliteSearchQuery) -> CopernicusSearchResponse:
        """
        Query available Sentinel-2 optical observation metadata from Copernicus Data Space.
        Supports:
        - Geographical bounding box: [min_lon, min_lat, max_lon, max_lat]
        - Date range: start_date, end_date
        - Product identifier
        - Cloud cover metadata (eo:cloud_cover)
        - Available assets (multispectral bands, TCI, thumbnails)
        """
        return self._execute_stac_search(
            collection="sentinel-2-l2a",
            satellite_family="Sentinel-2",
            sensor_type="Multispectral Optical",
            query=query
        )

    def get_product(self, product_id: str) -> Optional[CopernicusSatelliteProduct]:
        """
        Retrieve complete metadata and asset listings for a specific Copernicus product by ID.
        """
        if product_id in self._product_cache:
            return self._product_cache[product_id]

        collections = (
            ["sentinel-1-grd"] if ("s1" in product_id.lower() or "sentinel-1" in product_id.lower())
            else ["sentinel-2-l2a"] if ("s2" in product_id.lower() or "sentinel-2" in product_id.lower())
            else ["sentinel-1-grd", "sentinel-2-l2a"]
        )
        payload: Dict[str, Any] = {
            "collections": collections,
            "ids": [product_id],
            "limit": 1
        }
        try:
            res = self.session.post(self.search_url, json=payload, timeout=15)
            if res.status_code != 200:
                logger.warning(f"Copernicus STAC item search returned {res.status_code} for {product_id}")
                return None
            data = res.json()
            features = data.get("features", [])
            if not features:
                return None
            
            f = features[0]
            collection = f.get("collection", "")
            is_s1 = "sentinel-1" in collection.lower() or "s1" in product_id.lower()
            product = self._parse_feature(
                f,
                satellite_family="Sentinel-1" if is_s1 else "Sentinel-2",
                sensor_type="SAR C-Band" if is_s1 else "Multispectral Optical"
            )
            self._product_cache[product_id] = product
            return product
        except Exception as e:
            logger.error(f"Error retrieving product {product_id} from Copernicus STAC: {e}")
            raise e

    def _execute_stac_search(
        self,
        collection: str,
        satellite_family: str,
        sensor_type: str,
        query: SatelliteSearchQuery
    ) -> CopernicusSearchResponse:
        """
        Internal implementation of STAC search against Copernicus Data Space Ecosystem.
        Strictly adheres to STAC API v1.0.0 specifications.
        """
        payload: Dict[str, Any] = {
            "collections": [collection],
            "limit": query.limit
        }

        # 1. Product ID specific query
        if query.product_id and query.product_id.strip():
            payload["ids"] = [query.product_id.strip()]

        # 2. Geographical Bounding Box: [min_lon, min_lat, max_lon, max_lat]
        if query.bbox and len(query.bbox) == 4:
            payload["bbox"] = query.bbox

        # 3. Datetime Interval
        datetime_str = self._format_datetime_interval(query.start_date, query.end_date)
        if datetime_str:
            payload["datetime"] = datetime_str

        # 4. Cloud Cover CQL2 / Query filtering for Sentinel-2
        if query.max_cloud_cover is not None and "sentinel-2" in collection:
            payload["query"] = {
                "eo:cloud_cover": {
                    "lte": float(query.max_cloud_cover)
                }
            }

        # 5. Execute STAC Search POST request
        now_iso = datetime.now(timezone.utc).isoformat()
        try:
            logger.info(f"Querying Copernicus STAC API: {self.search_url} for {collection} with payload: {payload}")
            res = self.session.post(self.search_url, json=payload, timeout=20)

            if res.status_code == 429:
                return CopernicusSearchResponse(
                    total_features=0,
                    returned_features=0,
                    collection=collection,
                    query_bbox=query.bbox,
                    query_datetime=datetime_str,
                    features=[],
                    stac_endpoint=self.search_url,
                    executed_at=now_iso,
                    message="Copernicus Data Space STAC rate limit reached (HTTP 429). Please back off and retry shortly."
                )

            if res.status_code != 200:
                err_text = res.text[:300]
                logger.error(f"Copernicus STAC query failed with HTTP {res.status_code}: {err_text}")
                return CopernicusSearchResponse(
                    total_features=0,
                    returned_features=0,
                    collection=collection,
                    query_bbox=query.bbox,
                    query_datetime=datetime_str,
                    features=[],
                    stac_endpoint=self.search_url,
                    executed_at=now_iso,
                    message=f"Copernicus STAC API returned HTTP {res.status_code}: {err_text}"
                )

            data = res.json()
            raw_features = data.get("features", [])
            total_matched = data.get("numberMatched", len(raw_features))

            parsed_products: List[CopernicusSatelliteProduct] = []
            for feat in raw_features:
                product = self._parse_feature(feat, satellite_family, sensor_type)
                self._product_cache[product.id] = product
                parsed_products.append(product)

            # Check next link for pagination token
            next_token = None
            for link in data.get("links", []):
                if link.get("rel") == "next":
                    next_token = link.get("href")

            return CopernicusSearchResponse(
                total_features=total_matched,
                returned_features=len(parsed_products),
                collection=collection,
                query_bbox=query.bbox,
                query_datetime=datetime_str,
                features=parsed_products,
                next_token=next_token,
                stac_endpoint=self.search_url,
                executed_at=now_iso,
                message=f"Successfully discovered {len(parsed_products)} real-world {satellite_family} products from Copernicus Data Space STAC."
            )

        except requests.exceptions.Timeout:
            logger.error("Timeout connecting to Copernicus Data Space STAC service.")
            return CopernicusSearchResponse(
                total_features=0,
                returned_features=0,
                collection=collection,
                query_bbox=query.bbox,
                query_datetime=datetime_str,
                features=[],
                stac_endpoint=self.search_url,
                executed_at=now_iso,
                message="Copernicus STAC request timed out after 20 seconds. Remote server may be undergoing maintenance."
            )
        except Exception as e:
            logger.error(f"Unexpected error querying Copernicus STAC: {e}", exc_info=True)
            return CopernicusSearchResponse(
                total_features=0,
                returned_features=0,
                collection=collection,
                query_bbox=query.bbox,
                query_datetime=datetime_str,
                features=[],
                stac_endpoint=self.search_url,
                executed_at=now_iso,
                message=f"Network error querying Copernicus STAC: {str(e)}"
            )

    def _parse_feature(
        self,
        feat: Dict[str, Any],
        satellite_family: str,
        sensor_type: str
    ) -> CopernicusSatelliteProduct:
        """
        Parse a STAC Item GeoJSON object into strongly typed CopernicusSatelliteProduct.
        Extracts platform, acquisition timestamp, assets, geometry, and sets processing status.
        """
        item_id = feat.get("id", "UNKNOWN_ITEM")
        collection = feat.get("collection", "")
        properties = feat.get("properties", {})
        geometry = feat.get("geometry")
        bbox = feat.get("bbox")

        # Platform details
        platform_raw = properties.get("platform", "").lower()
        if "sentinel-1a" in platform_raw or "s1a" in item_id.lower():
            platform = "Sentinel-1A"
            sat_title = "Sentinel-1A (SAR)"
        elif "sentinel-1b" in platform_raw or "s1b" in item_id.lower():
            platform = "Sentinel-1B"
            sat_title = "Sentinel-1B (SAR)"
        elif "sentinel-2a" in platform_raw or "s2a" in item_id.lower():
            platform = "Sentinel-2A"
            sat_title = "Sentinel-2A (MSI)"
        elif "sentinel-2b" in platform_raw or "s2b" in item_id.lower():
            platform = "Sentinel-2B"
            sat_title = "Sentinel-2B (MSI)"
        else:
            platform = properties.get("platform", satellite_family)
            sat_title = f"{platform} ({sensor_type})"

        # Acquisition timestamp
        acq_time = (
            properties.get("datetime") or
            properties.get("start_datetime") or
            properties.get("end_datetime")
        )

        # Cloud cover (for Sentinel-2)
        cloud_cover = properties.get("eo:cloud_cover")
        if cloud_cover is not None:
            try:
                cloud_cover = round(float(cloud_cover), 2)
            except (ValueError, TypeError):
                cloud_cover = None

        # Orbit and radar properties
        orbit_dir = properties.get("sat:orbit_state") or properties.get("orbit_direction")
        rel_orbit = properties.get("sat:relative_orbit") or properties.get("relative_orbit_number")
        polarization = properties.get("s1:polarizations") or properties.get("polarization")
        if isinstance(polarization, str):
            polarization = [polarization]

        # Assets mapping
        raw_assets = feat.get("assets", {})
        assets_dict: Dict[str, SatelliteAssetInfo] = {}
        thumbnail_url = None

        for k, v in raw_assets.items():
            if isinstance(v, dict):
                href = v.get("href", "")
                # Normalize legacy creodias asset URLs to official active CDSE catalogue endpoint
                if "datahub.creodias.eu/odata/v1/Assets" in href:
                    href = href.replace("datahub.creodias.eu/odata/v1/Assets", "catalogue.dataspace.copernicus.eu/odata/v1/Assets")

                title = v.get("title", k)
                asset_type = v.get("type")
                roles = v.get("roles", [])

                assets_dict[k] = SatelliteAssetInfo(
                    name=k,
                    title=title,
                    type=asset_type,
                    href=href,
                    roles=roles
                )

                # Identify thumbnail URL
                if k == "thumbnail" or "thumbnail" in roles:
                    thumbnail_url = href
                elif not thumbnail_url and ("overview" in k.lower() or "quicklook" in k.lower()):
                    thumbnail_url = href

        # Separate Pipeline Status
        pipeline_status = ProcessingPipelineStatus(
            product_discovered=True,
            asset_available=len(assets_dict) > 0,
            image_downloaded=False,
            image_processed=False,
            anomaly_analysis_completed=False,
            status_summary=(
                f"STAC Metadata Discovered ({len(assets_dict)} asset references available). "
                f"Full image download and radiometric calibration require scheduled compute task."
            )
        )

        return CopernicusSatelliteProduct(
            id=item_id,
            collection=collection,
            satellite=sat_title,
            sensor_type=sensor_type,
            acquisition_timestamp=acq_time,
            platform=platform,
            constellation=properties.get("constellation", satellite_family),
            bbox=bbox,
            geometry=geometry,
            cloud_cover_pct=cloud_cover,
            orbit_direction=orbit_dir,
            relative_orbit_number=rel_orbit,
            polarization=polarization,
            resolution_meters=10.0 if "sentinel-2" in collection or "grd" in collection else 20.0,
            swath_identifier=properties.get("sar:instrument_mode") or properties.get("instruments", [""])[0],
            thumbnail_url=thumbnail_url,
            assets_count=len(assets_dict),
            assets=assets_dict,
            properties=properties,
            pipeline_status=pipeline_status,
            scientific_disclaimer=(
                "Observation Discovered: Satellite metadata presence confirms orbital coverage over the area of interest. "
                "It does NOT indicate or confirm an environmental anomaly, oil spill, or pollution event without calibrated radiometric/SAR processing."
            )
        )

    def _format_datetime_interval(
        self,
        start_date: Optional[str],
        end_date: Optional[str]
    ) -> Optional[str]:
        """
        Format date range into RFC3339 interval string (e.g. 2024-06-01T00:00:00Z/2024-06-10T23:59:59Z).
        """
        if not start_date and not end_date:
            return None

        # Format start
        if start_date:
            if "T" in start_date:
                start_str = start_date
            else:
                start_str = f"{start_date}T00:00:00Z"
        else:
            start_str = ".."

        # Format end
        if end_date:
            if "T" in end_date:
                end_str = end_date
            else:
                end_str = f"{end_date}T23:59:59Z"
        else:
            end_str = ".."

        return f"{start_str}/{end_str}"

copernicus_service = CopernicusSTACService()
