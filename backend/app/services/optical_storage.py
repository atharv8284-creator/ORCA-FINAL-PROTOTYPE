import os
import json
import logging
from typing import List, Optional, Dict
from app.schemas.optical import OpticalProcessingResult

logger = logging.getLogger(__name__)

STORAGE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "optical_analyses")
os.makedirs(STORAGE_DIR, exist_ok=True)

class OpticalStorageService:
    """
    Persistent and in-memory storage manager for Sentinel-2 Optical Analysis runs.
    """

    def __init__(self):
        self.storage_dir = STORAGE_DIR
        self._memory_cache: Dict[str, OpticalProcessingResult] = {}
        self._load_from_disk()

    def _load_from_disk(self):
        try:
            for fname in os.listdir(self.storage_dir):
                if fname.endswith(".json"):
                    fpath = os.path.join(self.storage_dir, fname)
                    with open(fpath, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        result = OpticalProcessingResult.model_validate(data)
                        self._memory_cache[result.analysis_id] = result
        except Exception as e:
            logger.warning(f"Could not load previous Optical analyses from disk: {e}")

    def save_analysis(self, result: OpticalProcessingResult) -> OpticalProcessingResult:
        self._memory_cache[result.analysis_id] = result
        fpath = os.path.join(self.storage_dir, f"{result.analysis_id}.json")
        try:
            with open(fpath, "w", encoding="utf-8") as f:
                f.write(result.model_dump_json(indent=2))
        except Exception as e:
            logger.error(f"Failed to persist Optical analysis {result.analysis_id} to disk: {e}")
        return result

    def get_analysis(self, analysis_id: str) -> Optional[OpticalProcessingResult]:
        return self._memory_cache.get(analysis_id)

    def list_analyses(self, limit: int = 20) -> List[OpticalProcessingResult]:
        items = list(self._memory_cache.values())
        items.sort(key=lambda x: x.processed_at, reverse=True)
        return items[:limit]

    def delete_analysis(self, analysis_id: str) -> bool:
        if analysis_id in self._memory_cache:
            del self._memory_cache[analysis_id]
            fpath = os.path.join(self.storage_dir, f"{analysis_id}.json")
            if os.path.exists(fpath):
                os.remove(fpath)
            return True
        return False

optical_storage = OpticalStorageService()
