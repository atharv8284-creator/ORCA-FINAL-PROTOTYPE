import os
import json
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from pathlib import Path

from app.schemas.ais import AISVesselPosition

logger = logging.getLogger(__name__)

# Resolve backend root directory regardless of current working directory
BASE_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = BASE_DIR / "data" / "ais_vessels"
TRACKS_DIR = DATA_DIR / "tracks"
LATEST_VESSELS_FILE = DATA_DIR / "vessels_latest.json"


class AISStorage:
    """
    Persistent storage and spatial history ledger for AIS vessel positions.
    Maintains latest known positions and chronological waypoint tracks.
    """

    def __init__(self):
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        TRACKS_DIR.mkdir(parents=True, exist_ok=True)

    def save_vessels(self, vessels: List[AISVesselPosition]) -> int:
        """
        Persist a batch of live vessel observations.
        Updates latest index and appends to per-vessel track files.
        """
        if not vessels:
            return 0

        # Load existing latest records
        latest_map: Dict[str, Dict[str, Any]] = {}
        if LATEST_VESSELS_FILE.exists():
            try:
                with open(LATEST_VESSELS_FILE, "r", encoding="utf-8") as f:
                    latest_map = json.load(f)
            except Exception as e:
                logger.warning(f"Could not load existing latest vessels: {e}")

        saved_count = 0
        for v in vessels:
            v_dict = v.model_dump()
            latest_map[v.mmsi] = v_dict
            self._append_track_point(v)
            saved_count += 1

        try:
            with open(LATEST_VESSELS_FILE, "w", encoding="utf-8") as f:
                json.dump(latest_map, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to write latest vessels file: {e}")

        return saved_count

    def _append_track_point(self, v: AISVesselPosition, max_points: int = 100):
        """Append a waypoint to the vessel's historical track file."""
        track_file = TRACKS_DIR / f"{v.mmsi}.json"
        points: List[Dict[str, Any]] = []

        if track_file.exists():
            try:
                with open(track_file, "r", encoding="utf-8") as f:
                    points = json.load(f)
            except Exception:
                points = []

        new_point = {
            "timestamp_utc": v.timestamp_utc,
            "latitude": v.latitude,
            "longitude": v.longitude,
            "sog_knots": v.sog_knots,
            "cog_degrees": v.cog_degrees,
            "nav_status": v.nav_status,
            "nav_status_code": v.nav_status_code
        }

        # Prevent duplicate sequential point if identical timestamp
        if not points or points[-1].get("timestamp_utc") != v.timestamp_utc:
            points.append(new_point)

        # Cap at max_points to manage storage
        if len(points) > max_points:
            points = points[-max_points:]

        try:
            with open(track_file, "w", encoding="utf-8") as f:
                json.dump(points, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to append track point for {v.mmsi}: {e}")

    def get_all_latest(self) -> List[AISVesselPosition]:
        """Retrieve all currently known latest vessel positions."""
        if not LATEST_VESSELS_FILE.exists():
            return []

        try:
            with open(LATEST_VESSELS_FILE, "r", encoding="utf-8") as f:
                data: Dict[str, Dict[str, Any]] = json.load(f)
                return [AISVesselPosition(**item) for item in data.values()]
        except Exception as e:
            logger.error(f"Error reading latest vessels: {e}")
            return []

    def get_vessel_by_mmsi(self, mmsi: str) -> Optional[AISVesselPosition]:
        """Find a specific vessel by its 9-digit MMSI."""
        clean_mmsi = mmsi.strip()
        if not LATEST_VESSELS_FILE.exists():
            return None

        try:
            with open(LATEST_VESSELS_FILE, "r", encoding="utf-8") as f:
                data: Dict[str, Dict[str, Any]] = json.load(f)
                if clean_mmsi in data:
                    return AISVesselPosition(**data[clean_mmsi])
        except Exception as e:
            logger.error(f"Error fetching vessel {clean_mmsi}: {e}")

        return None

    def get_vessel_track(self, mmsi: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Retrieve historical coordinate track points for map polyline rendering."""
        clean_mmsi = mmsi.strip()
        track_file = TRACKS_DIR / f"{clean_mmsi}.json"
        if not track_file.exists():
            return []

        try:
            with open(track_file, "r", encoding="utf-8") as f:
                points = json.load(f)
                return points[-limit:]
        except Exception as e:
            logger.error(f"Error reading track for {clean_mmsi}: {e}")
            return []


ais_storage = AISStorage()
