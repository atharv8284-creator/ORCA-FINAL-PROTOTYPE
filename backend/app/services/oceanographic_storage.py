import os
import json
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone

from app.schemas.oceanographic import OceanographicProfileResponse

logger = logging.getLogger("orca.oceanographic_storage")

STORAGE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "oceanographic_observations")

class OceanographicStorage:
    """
    Persistent storage and retrieval of Copernicus Marine observation records and metadata.
    Stored as JSON files in backend/data/oceanographic_observations/.
    """

    def __init__(self):
        os.makedirs(STORAGE_DIR, exist_ok=True)
        self.memory_cache: Dict[str, Dict[str, Any]] = {}
        self._load_cache()

    def _load_cache(self):
        try:
            for fname in os.listdir(STORAGE_DIR):
                if fname.endswith(".json"):
                    fpath = os.path.join(STORAGE_DIR, fname)
                    with open(fpath, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        rec_id = data.get("record_id") or fname[:-5]
                        self.memory_cache[rec_id] = data
        except Exception as e:
            logger.warning(f"Error loading oceanographic storage cache: {e}")

    def save_profile(self, profile: OceanographicProfileResponse) -> str:
        """
        Persist an observation profile record and its metadata.
        """
        timestamp_str = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
        sanitized_loc = profile.location_name.replace(" ", "_").replace("(", "").replace(")", "").replace(",", "")[:15]
        record_id = f"OCN-{timestamp_str}-{sanitized_loc}"

        record_data = {
            "record_id": record_id,
            "saved_at": datetime.now(timezone.utc).isoformat(),
            "query_latitude": profile.query_latitude,
            "query_longitude": profile.query_longitude,
            "location_name": profile.location_name,
            "data_source": profile.data_source,
            "service_status": profile.service_status,
            "data_tier": profile.data_tier,
            "retrieval_status": profile.retrieval_status,
            "spatial_coverage": profile.spatial_coverage,
            "temporal_range": profile.temporal_range,
            "error_message": profile.error_message,
            "summary_card": profile.summary_card,
            "observations_count": len(profile.observations),
            "observations": [obs.model_dump() for obs in profile.observations],
            "authentication_status": profile.authentication_status
        }

        self.memory_cache[record_id] = record_data

        fpath = os.path.join(STORAGE_DIR, f"{record_id}.json")
        try:
            with open(fpath, "w", encoding="utf-8") as f:
                json.dump(record_data, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to write oceanographic observation to {fpath}: {e}")

        return record_id

    def list_saved_profiles(self, limit: int = 25) -> List[Dict[str, Any]]:
        """
        Return the list of saved observation profiles, ordered by latest first.
        """
        items = list(self.memory_cache.values())
        items.sort(key=lambda x: x.get("saved_at", ""), reverse=True)
        return items[:limit]

    def get_saved_profile(self, record_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve a specific saved observation profile by ID.
        """
        if record_id in self.memory_cache:
            return self.memory_cache[record_id]

        fpath = os.path.join(STORAGE_DIR, f"{record_id}.json")
        if os.path.exists(fpath):
            try:
                with open(fpath, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.memory_cache[record_id] = data
                    return data
            except Exception as e:
                logger.error(f"Failed to read oceanographic observation from {fpath}: {e}")
        return None

oceanographic_storage = OceanographicStorage()
