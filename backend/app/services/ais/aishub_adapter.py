import time
import logging
from datetime import datetime, timezone
from typing import List, Optional, Tuple, Dict, Any
import httpx

from app.services.ais.base import BaseAISProvider
from app.schemas.ais import (
    AISVesselPosition,
    AISVesselMovement,
    decode_vessel_type,
    NAV_STATUS_MAP,
    DEFAULT_UNCONFIGURED_MESSAGE
)

logger = logging.getLogger(__name__)


class AISHubAdapter(BaseAISProvider):
    """
    Adapter for AISHub (https://www.aishub.net/api).
    Physical receiver ownership is NOT mandatory.
    When API credentials become available, this adapter interfaces with 
    AISHub Web Service following official specifications:
    - format=1 (decoded human-readable JSON)
    - output=json, compress=0
    - strictly 1 request per 60 seconds
    """

    def __init__(self, api_key: str = "", api_endpoint: str = "https://data.aishub.net/ws.php"):
        super().__init__(
            provider_name="AISHub",
            api_key=api_key,
            api_endpoint=api_endpoint or "https://data.aishub.net/ws.php"
        )

    async def check_connection_status(self) -> Dict[str, Any]:
        """
        Check connectivity and credential validity with AISHub.
        Returns exact specified statuses: REAL | NOT CONNECTED | OFFLINE | NO DATA.
        """
        if not self.has_credentials:
            return {
                "is_connected": False,
                "status": "NOT CONNECTED",
                "message": DEFAULT_UNCONFIGURED_MESSAGE,
                "latency_ms": 0.0,
                "provider": self.provider_name,
                "endpoint": self.api_endpoint
            }

        start_time = time.time()
        try:
            params = {
                "username": self.api_key,
                "format": 1,
                "output": "json",
                "compress": 0,
                # Restrict to small bbox to test connectivity
                "latmin": 0.0,
                "latmax": 1.0,
                "lonmin": 0.0,
                "lonmax": 1.0
            }
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(self.api_endpoint, params=params)
                latency = round((time.time() - start_time) * 1000, 2)

                if resp.status_code != 200:
                    return {
                        "is_connected": False,
                        "status": "OFFLINE",
                        "message": f"AISHub service unreachable (HTTP {resp.status_code})",
                        "latency_ms": latency,
                        "provider": self.provider_name
                    }

                data = resp.json()
                if isinstance(data, list) and len(data) > 0 and isinstance(data[0], dict):
                    status_obj = data[0]
                    if status_obj.get("ERROR"):
                        err_msg = status_obj.get("ERROR_MESSAGE", "Unknown AISHub error")
                        return {
                            "is_connected": False,
                            "status": "OFFLINE",
                            "message": f"AISHub upstream error: {err_msg}",
                            "latency_ms": latency,
                            "provider": self.provider_name
                        }

                # Check if vessels returned
                vessels = data[1] if (isinstance(data, list) and len(data) > 1 and isinstance(data[1], list)) else []
                status_label = "REAL" if len(vessels) > 0 else "NO DATA"

                return {
                    "is_connected": True,
                    "status": status_label,
                    "message": "AISHub live stream active" if status_label == "REAL" else "Connected to AISHub but no vessels returned in area",
                    "latency_ms": latency,
                    "provider": self.provider_name
                }
        except Exception as e:
            latency = round((time.time() - start_time) * 1000, 2)
            logger.warning(f"AISHub connection check exception: {e}")
            return {
                "is_connected": False,
                "status": "OFFLINE",
                "message": f"Network error connecting to AISHub: {str(e)}",
                "latency_ms": latency,
                "provider": self.provider_name
            }

    async def fetch_vessel_positions(
        self,
        bbox: Optional[Tuple[float, float, float, float]] = None,
        limit: int = 100
    ) -> List[AISVesselPosition]:
        """
        Fetch live vessel positions from AISHub within optional bounding box.
        If no credentials configured, safely returns empty list.
        """
        if not self.has_credentials:
            return []

        params: Dict[str, Any] = {
            "username": self.api_key,
            "format": 1,
            "output": "json",
            "compress": 0
        }

        if bbox:
            min_lat, max_lat, min_lon, max_lon = bbox
            params["latmin"] = min_lat
            params["latmax"] = max_lat
            params["lonmin"] = min_lon
            params["lonmax"] = max_lon

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(self.api_endpoint, params=params)
                if resp.status_code != 200:
                    logger.error(f"AISHub returned status code {resp.status_code}")
                    return []

                raw_data = resp.json()
                parsed = self._parse_aishub_response(raw_data)
                return parsed[:limit]
        except Exception as exc:
            logger.error(f"Failed to fetch vessel positions from AISHub: {exc}")
            return []

    async def fetch_vessel_details(self, mmsi: str) -> Optional[Dict[str, Any]]:
        """
        Fetch vessel details by querying specific MMSI from AISHub.
        """
        if not self.has_credentials:
            return None

        clean_mmsi = mmsi.strip()
        params = {
            "username": self.api_key,
            "format": 1,
            "output": "json",
            "compress": 0,
            "mmsi": clean_mmsi
        }
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(self.api_endpoint, params=params)
                if resp.status_code != 200:
                    return None

                data = resp.json()
                positions = self._parse_aishub_response(data)
                for pos in positions:
                    if pos.mmsi == clean_mmsi:
                        return pos.model_dump()
        except Exception as e:
            logger.error(f"Failed to fetch vessel details for {clean_mmsi}: {e}")
        return None

    async def fetch_vessel_movement(self, mmsi: str) -> Optional[AISVesselMovement]:
        """
        Fetch vessel movement information (speed over ground, course, heading, vector).
        """
        details = await self.fetch_vessel_details(mmsi)
        if not details:
            return None

        sog = details.get("sog_knots", 0.0)
        cog = details.get("cog_degrees", 0.0)
        return AISVesselMovement(
            mmsi=details["mmsi"],
            vessel_name=details["vessel_name"],
            latitude=details["latitude"],
            longitude=details["longitude"],
            speed_over_ground=sog,
            course_over_ground=cog,
            heading=details.get("heading"),
            navigation_status=details.get("navigation_status", "Under way"),
            last_received_timestamp=details["last_received_timestamp"],
            data_provider=self.provider_name,
            is_simulated=False,
            movement_vector={
                "speed_knots": sog,
                "course_degrees": cog,
                "status": details.get("navigation_status", "Under way")
            },
            recent_waypoints=[
                {
                    "timestamp": details["last_received_timestamp"],
                    "latitude": details["latitude"],
                    "longitude": details["longitude"],
                    "sog": sog,
                    "cog": cog
                }
            ]
        )

    def _parse_aishub_response(self, data: Any) -> List[AISVesselPosition]:
        """
        Parse AISHub format=1 JSON response into standardized AISVesselPosition models.
        """
        if not isinstance(data, list) or len(data) < 2:
            return []

        header = data[0]
        if isinstance(header, dict) and header.get("ERROR"):
            logger.warning(f"AISHub API error: {header.get('ERROR_MESSAGE')}")
            return []

        raw_vessels = data[1]
        if not isinstance(raw_vessels, list):
            return []

        parsed: List[AISVesselPosition] = []
        now_utc = datetime.now(timezone.utc)

        for item in raw_vessels:
            if not isinstance(item, dict):
                continue
            try:
                raw_mmsi = str(item.get("MMSI", "")).strip()
                if not raw_mmsi.isdigit() or len(raw_mmsi) != 9:
                    continue

                lat = float(item.get("LATITUDE", 91.0))
                lon = float(item.get("LONGITUDE", 181.0))
                if lat < -90.0 or lat > 90.0 or lon < -180.0 or lon > 180.0:
                    continue

                raw_sog = float(item.get("SOG", 0.0))
                sog = 0.0 if raw_sog >= 102.3 or raw_sog < 0 else round(raw_sog, 1)

                raw_cog = float(item.get("COG", 0.0))
                cog = 0.0 if raw_cog >= 360.0 or raw_cog < 0 else round(raw_cog, 1)

                raw_hdg = item.get("HEADING")
                heading = float(raw_hdg) if (raw_hdg is not None and int(raw_hdg) != 511) else None

                nav_code = item.get("NAVSTAT")
                nav_code_int = int(nav_code) if nav_code is not None else None
                nav_status_str = NAV_STATUS_MAP.get(nav_code_int, "Undefined / Default") if nav_code_int is not None else "Under way"

                type_code = item.get("TYPE")
                type_code_int = int(type_code) if type_code is not None else None
                type_info = decode_vessel_type(type_code_int)

                dim_a = float(item.get("A", 0) or 0)
                dim_b = float(item.get("B", 0) or 0)
                dim_c = float(item.get("C", 0) or 0)
                dim_d = float(item.get("D", 0) or 0)
                length_m = (dim_a + dim_b) if (dim_a + dim_b) > 0 else None
                width_m = (dim_c + dim_d) if (dim_c + dim_d) > 0 else None

                raw_draught = item.get("DRAUGHT")
                draught_m = float(raw_draught) if raw_draught and float(raw_draught) > 0 else None

                time_str = item.get("TIME", "")
                ts_iso = now_utc.isoformat()
                signal_age_sec: Optional[int] = None
                if time_str:
                    try:
                        clean_time = time_str.replace(" GMT", "").strip()
                        dt = datetime.strptime(clean_time, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
                        ts_iso = dt.isoformat()
                        signal_age_sec = max(0, int((now_utc - dt).total_seconds()))
                    except Exception:
                        ts_iso = now_utc.isoformat()

                vessel_pos = AISVesselPosition(
                    mmsi=raw_mmsi,
                    vessel_name=str(item.get("NAME", "UNKNOWN")).strip() or "UNKNOWN",
                    vessel_type=type_info["label"],
                    latitude=lat,
                    longitude=lon,
                    sog_knots=sog,
                    cog_degrees=cog,
                    heading=heading,
                    navigation_status=nav_status_str,
                    nav_status_code=nav_code_int,
                    last_received_timestamp=ts_iso,
                    data_provider="AISHub Live Web Service",
                    data_source="Coastal & Spaceborne AIS Feed",
                    callsign=str(item.get("CALLSIGN", "")).strip() or None,
                    imo=int(item.get("IMO")) if item.get("IMO") and int(item.get("IMO")) > 0 else None,
                    vessel_type_code=type_code_int,
                    vessel_category=type_info["category"],
                    length_m=length_m,
                    width_m=width_m,
                    draught_m=draught_m,
                    destination=str(item.get("DEST", "")).strip() or None,
                    eta=str(item.get("ETA", "")).strip() or None,
                    signal_age_seconds=signal_age_sec,
                    is_simulated=False
                )
                parsed.append(vessel_pos)
            except Exception as e:
                logger.debug(f"Skipping malformed AISHub vessel record: {e}")
                continue

        return parsed
