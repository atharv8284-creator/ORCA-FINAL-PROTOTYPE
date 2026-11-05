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


class MarineTrafficAdapter(BaseAISProvider):
    """
    Adapter for MarineTraffic API (https://www.marinetraffic.com/en/ais-api-services/documentation).
    Follows official PS07 / Export Vessels API v8 documentation.
    No physical receiver required; interfaces with authorized MarineTraffic API key.
    
    API Rules:
    - Base URL: https://services.marinetraffic.com/api/exportvessels/v:8
    - Format: json, msgtype: extended
    """

    def __init__(self, api_key: str = "", api_endpoint: str = "https://services.marinetraffic.com/api/exportvessels/v:8"):
        super().__init__(
            provider_name="MarineTraffic",
            api_key=api_key,
            api_endpoint=api_endpoint or "https://services.marinetraffic.com/api/exportvessels/v:8"
        )

    async def check_connection_status(self) -> Dict[str, Any]:
        """
        Check MarineTraffic API credentials and connection.
        Returns: REAL | NOT CONNECTED | OFFLINE | NO DATA.
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
            # Query with small test bbox
            url = f"{self.api_endpoint}/{self.api_key}/minlat:0.0/maxlat:1.0/minlon:0.0/maxlon:1.0/protocol:json"
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(url)
                latency = round((time.time() - start_time) * 1000, 2)

                if resp.status_code == 401 or resp.status_code == 403:
                    return {
                        "is_connected": False,
                        "status": "OFFLINE",
                        "message": "MarineTraffic API key invalid or unauthorized",
                        "latency_ms": latency,
                        "provider": self.provider_name
                    }
                elif resp.status_code != 200:
                    return {
                        "is_connected": False,
                        "status": "OFFLINE",
                        "message": f"MarineTraffic HTTP error {resp.status_code}",
                        "latency_ms": latency,
                        "provider": self.provider_name
                    }

                data = resp.json()
                status_label = "REAL" if (isinstance(data, list) and len(data) > 0) else "NO DATA"
                return {
                    "is_connected": True,
                    "status": status_label,
                    "message": "MarineTraffic API active" if status_label == "REAL" else "Connected to MarineTraffic (0 vessels returned in area)",
                    "latency_ms": latency,
                    "provider": self.provider_name
                }
        except Exception as e:
            latency = round((time.time() - start_time) * 1000, 2)
            logger.warning(f"MarineTraffic check exception: {e}")
            return {
                "is_connected": False,
                "status": "OFFLINE",
                "message": f"MarineTraffic connection failed: {str(e)}",
                "latency_ms": latency,
                "provider": self.provider_name
            }

    async def fetch_vessel_positions(
        self,
        bbox: Optional[Tuple[float, float, float, float]] = None,
        limit: int = 100
    ) -> List[AISVesselPosition]:
        """
        Fetch vessel positions from MarineTraffic API within bounding box.
        """
        if not self.has_credentials:
            return []

        url = f"{self.api_endpoint}/{self.api_key}/protocol:json/msgtype:extended"
        if bbox:
            min_lat, max_lat, min_lon, max_lon = bbox
            url += f"/minlat:{min_lat}/maxlat:{max_lat}/minlon:{min_lon}/maxlon:{max_lon}"

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(url)
                if resp.status_code != 200:
                    logger.error(f"MarineTraffic returned {resp.status_code}")
                    return []
                raw_data = resp.json()
                return self._parse_marinetraffic_response(raw_data)[:limit]
        except Exception as e:
            logger.error(f"Failed to fetch MarineTraffic vessels: {e}")
            return []

    async def fetch_vessel_details(self, mmsi: str) -> Optional[Dict[str, Any]]:
        """
        Fetch vessel details by MMSI from MarineTraffic.
        """
        if not self.has_credentials:
            return None

        clean_mmsi = mmsi.strip()
        url = f"{self.api_endpoint}/{self.api_key}/mmsi:{clean_mmsi}/protocol:json/msgtype:extended"
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(url)
                if resp.status_code != 200:
                    return None
                parsed = self._parse_marinetraffic_response(resp.json())
                for v in parsed:
                    if v.mmsi == clean_mmsi:
                        return v.model_dump()
        except Exception as e:
            logger.error(f"Error fetching MarineTraffic vessel {clean_mmsi}: {e}")
        return None

    async def fetch_vessel_movement(self, mmsi: str) -> Optional[AISVesselMovement]:
        """
        Fetch vessel movement info for MarineTraffic contact.
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

    def _parse_marinetraffic_response(self, data: Any) -> List[AISVesselPosition]:
        """
        Parse official MarineTraffic JSON array response.
        """
        if not isinstance(data, list):
            return []

        parsed: List[AISVesselPosition] = []
        now_utc = datetime.now(timezone.utc)

        for item in data:
            if not isinstance(item, dict):
                continue
            try:
                raw_mmsi = str(item.get("MMSI", "")).strip()
                if not raw_mmsi.isdigit() or len(raw_mmsi) != 9:
                    continue

                lat = float(item.get("LAT", 91.0))
                lon = float(item.get("LON", 181.0))
                if lat < -90.0 or lat > 90.0 or lon < -180.0 or lon > 180.0:
                    continue

                # In MarineTraffic PS07, SPEED is often in 1/10th of a knot
                raw_speed = float(item.get("SPEED", 0.0))
                sog = round(raw_speed / 10.0, 1) if raw_speed > 100 else round(raw_speed, 1)

                cog = float(item.get("COURSE", 0.0))
                raw_hdg = item.get("HEADING")
                heading = float(raw_hdg) if raw_hdg is not None and int(raw_hdg) != 511 else None

                nav_status_code = int(item.get("STATUS", 15)) if str(item.get("STATUS", "")).isdigit() else None
                nav_status = NAV_STATUS_MAP.get(nav_status_code, "Under way") if nav_status_code is not None else "Under way"

                type_code = int(item.get("SHIPTYPE", 0)) if str(item.get("SHIPTYPE", "")).isdigit() else None
                type_info = decode_vessel_type(type_code)

                timestamp_str = str(item.get("TIMESTAMP", "")).strip()
                signal_age_sec = None
                if timestamp_str:
                    try:
                        dt = datetime.fromisoformat(timestamp_str.replace("Z", "+00:00"))
                        signal_age_sec = max(0, int((now_utc - dt).total_seconds()))
                    except Exception:
                        timestamp_str = now_utc.isoformat()
                else:
                    timestamp_str = now_utc.isoformat()

                pos = AISVesselPosition(
                    mmsi=raw_mmsi,
                    vessel_name=str(item.get("SHIPNAME", "UNKNOWN")).strip() or "UNKNOWN",
                    vessel_type=type_info["label"],
                    latitude=lat,
                    longitude=lon,
                    sog_knots=sog,
                    cog_degrees=cog,
                    heading=heading,
                    navigation_status=nav_status,
                    nav_status_code=nav_status_code,
                    last_received_timestamp=timestamp_str,
                    data_provider="MarineTraffic API",
                    data_source="Satellite & Coastal AIS",
                    callsign=str(item.get("CALLSIGN", "")).strip() or None,
                    imo=int(item.get("IMO")) if item.get("IMO") and str(item.get("IMO")).isdigit() else None,
                    vessel_type_code=type_code,
                    vessel_category=type_info["category"],
                    destination=str(item.get("DESTINATION", "")).strip() or None,
                    eta=str(item.get("ETA", "")).strip() or None,
                    signal_age_seconds=signal_age_sec,
                    is_simulated=False
                )
                parsed.append(pos)
            except Exception as e:
                logger.debug(f"Skipping malformed MarineTraffic record: {e}")
                continue

        return parsed
