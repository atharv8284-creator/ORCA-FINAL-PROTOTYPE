import time
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Tuple, Dict, Any

from app.services.ais.base import BaseAISProvider
from app.schemas.ais import AISVesselPosition, AISVesselMovement


class DemoAISProvider(BaseAISProvider):
    """
    Demonstration Mode AIS Provider.
    Activated ONLY when the user explicitly enables demonstration mode.
    All records are strictly stamped with:
      is_simulated = True
      data_provider = "DEMO MODE (Simulated)"
    Never presented as real observations.
    """

    def __init__(self):
        super().__init__(
            provider_name="ORCA Demonstration Transponder Feed",
            api_key="DEMO_MODE",
            api_endpoint="internal://orca-demo-ais-feed"
        )

    async def check_connection_status(self) -> Dict[str, Any]:
        return {
            "is_connected": True,
            "status": "DEMO",
            "message": "DEMO MODE ACTIVE: Displaying labeled simulated vessel profiles for UI evaluation. NOT real observations.",
            "latency_ms": 1.2,
            "provider": self.provider_name,
            "endpoint": self.api_endpoint
        }

    def get_demo_vessels(
        self,
        bbox: Optional[Tuple[float, float, float, float]] = None,
        limit: int = 100
    ) -> List[AISVesselPosition]:
        now = datetime.now(timezone.utc)
        demo_vessels = [
            AISVesselPosition(
                mmsi="503999120",
                vessel_name="DEMO PACIFIC SENTINEL",
                vessel_type="Law Enforcement / Patrol Cutter",
                vessel_type_code=55,
                vessel_category="LAW_ENFORCEMENT",
                latitude=-15.4120,
                longitude=145.8600,
                sog_knots=16.5,
                cog_degrees=142.0,
                heading=142.0,
                navigation_status="Under way using engine",
                nav_status_code=0,
                callsign="VHE8",
                imo=9482103,
                flag="Australia",
                length_m=58.0,
                width_m=10.5,
                draught_m=3.2,
                destination="CAIRNS SECTOR",
                eta="10-31 18:00",
                last_received_timestamp=(now - timedelta(minutes=4)).isoformat(),
                signal_age_seconds=240,
                data_provider="DEMO MODE (Simulated)",
                data_source="ORCA Fixed Demo Profile",
                is_simulated=True
            ),
            AISVesselPosition(
                mmsi="354128990",
                vessel_name="DEMO OCEANIC VOYAGER",
                vessel_type="Cargo / Container / Bulk Carrier",
                vessel_type_code=70,
                vessel_category="CARGO",
                latitude=28.3200,
                longitude=-64.4800,
                sog_knots=19.2,
                cog_degrees=88.0,
                heading=86.0,
                navigation_status="Under way using engine",
                nav_status_code=0,
                callsign="HP41",
                imo=9318820,
                flag="Panama",
                length_m=294.0,
                width_m=32.2,
                draught_m=11.4,
                destination="ROTTERDAM",
                eta="11-04 10:00",
                last_received_timestamp=(now - timedelta(minutes=2)).isoformat(),
                signal_age_seconds=120,
                data_provider="DEMO MODE (Simulated)",
                data_source="ORCA Fixed Demo Profile",
                is_simulated=True
            ),
            AISVesselPosition(
                mmsi="412389001",
                vessel_name="DEMO CORAL EXPLORER",
                vessel_type="Fishing Vessel / Trawler",
                vessel_type_code=30,
                vessel_category="FISHING",
                latitude=-2.1650,
                longitude=130.2450,
                sog_knots=6.8,
                cog_degrees=210.0,
                heading=208.0,
                navigation_status="Engaged in fishing",
                nav_status_code=7,
                callsign="BY92",
                imo=8910443,
                flag="Indonesia",
                length_m=42.0,
                width_m=8.5,
                draught_m=4.1,
                destination="SORONG FISHING BASIN",
                eta="11-01 06:00",
                last_received_timestamp=(now - timedelta(minutes=7)).isoformat(),
                signal_age_seconds=420,
                data_provider="DEMO MODE (Simulated)",
                data_source="ORCA Fixed Demo Profile",
                is_simulated=True
            ),
            AISVesselPosition(
                mmsi="211281610",
                vessel_name="DEMO NORDIC BULKER",
                vessel_type="Tanker (Crude Oil / Chemical / LNG)",
                vessel_type_code=80,
                vessel_category="TANKER",
                latitude=50.9500,
                longitude=1.3500,
                sog_knots=12.4,
                cog_degrees=65.0,
                heading=64.0,
                navigation_status="Under way using engine",
                nav_status_code=0,
                callsign="DJ78",
                imo=9512340,
                flag="Germany",
                length_m=180.0,
                width_m=28.0,
                draught_m=9.6,
                destination="ANTWERP",
                eta="10-31 22:00",
                last_received_timestamp=(now - timedelta(minutes=1)).isoformat(),
                signal_age_seconds=60,
                data_provider="DEMO MODE (Simulated)",
                data_source="ORCA Fixed Demo Profile",
                is_simulated=True
            ),
            AISVesselPosition(
                mmsi="563098711",
                vessel_name="DEMO MALACCA STRAIT TUG",
                vessel_type="Towing Vessel / Tug",
                vessel_type_code=31,
                vessel_category="TUG",
                latitude=1.2850,
                longitude=103.8200,
                sog_knots=8.2,
                cog_degrees=285.0,
                heading=285.0,
                navigation_status="Towing ahead/alongside",
                nav_status_code=12,
                callsign="9V21",
                imo=9201199,
                flag="Singapore",
                length_m=34.0,
                width_m=9.2,
                draught_m=3.8,
                destination="JURONG PORT",
                eta="10-31 16:30",
                last_received_timestamp=(now - timedelta(minutes=3)).isoformat(),
                signal_age_seconds=180,
                data_provider="DEMO MODE (Simulated)",
                data_source="ORCA Fixed Demo Profile",
                is_simulated=True
            )
        ]

        # Apply bounding box filter if provided
        if bbox:
            min_lat, max_lat, min_lon, max_lon = bbox
            filtered = [
                v for v in demo_vessels
                if min_lat <= v.latitude <= max_lat and min_lon <= v.longitude <= max_lon
            ]
            return filtered[:limit]

        return demo_vessels[:limit]

    async def fetch_vessel_positions(
        self,
        bbox: Optional[Tuple[float, float, float, float]] = None,
        limit: int = 100
    ) -> List[AISVesselPosition]:
        return self.get_demo_vessels(bbox=bbox, limit=limit)

    async def fetch_vessel_details(self, mmsi: str) -> Optional[Dict[str, Any]]:
        positions = await self.fetch_vessel_positions()
        for p in positions:
            if p.mmsi == mmsi:
                return p.model_dump()
        return None

    async def fetch_vessel_movement(self, mmsi: str) -> Optional[AISVesselMovement]:
        details = await self.fetch_vessel_details(mmsi)
        if not details:
            return None

        sog = details["sog_knots"]
        cog = details["cog_degrees"]
        return AISVesselMovement(
            mmsi=details["mmsi"],
            vessel_name=details["vessel_name"],
            latitude=details["latitude"],
            longitude=details["longitude"],
            speed_over_ground=sog,
            course_over_ground=cog,
            heading=details.get("heading"),
            navigation_status=details["navigation_status"],
            last_received_timestamp=details["last_received_timestamp"],
            data_provider=self.provider_name,
            is_simulated=True,
            movement_vector={
                "speed_knots": sog,
                "course_degrees": cog,
                "status": details["navigation_status"]
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
