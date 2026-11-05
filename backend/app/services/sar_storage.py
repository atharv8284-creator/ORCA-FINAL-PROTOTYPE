import os
import json
import logging
from typing import List, Optional, Dict
from app.schemas.sar import SARProcessingResult

logger = logging.getLogger(__name__)

STORAGE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "sar_analyses")
os.makedirs(STORAGE_DIR, exist_ok=True)

class SARStorageService:
    """
    Persistent and in-memory storage manager for SAR Anomaly Analysis runs.
    Saves analysis logs, candidate metadata, and pipeline execution diagnostics.
    """

    def __init__(self):
        self.storage_dir = STORAGE_DIR
        self._memory_cache: Dict[str, SARProcessingResult] = {}
        self._load_from_disk()

    def _load_from_disk(self):
        try:
            for fname in os.listdir(self.storage_dir):
                if fname.endswith(".json"):
                    fpath = os.path.join(self.storage_dir, fname)
                    with open(fpath, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        result = SARProcessingResult.model_validate(data)
                        self._memory_cache[result.analysis_id] = result
        except Exception as e:
            logger.warning(f"Could not load previous SAR analyses from disk: {e}")

    def save_analysis(self, result: SARProcessingResult) -> SARProcessingResult:
        """
        Store an executed SAR analysis result in memory and on disk.
        """
        self._memory_cache[result.analysis_id] = result
        fpath = os.path.join(self.storage_dir, f"{result.analysis_id}.json")
        try:
            with open(fpath, "w", encoding="utf-8") as f:
                f.write(result.model_dump_json(indent=2))
        except Exception as e:
            logger.error(f"Failed to persist SAR analysis {result.analysis_id} to disk: {e}")
        return result

    def get_analysis(self, analysis_id: str) -> Optional[SARProcessingResult]:
        """
        Retrieve a specific SAR analysis run by its unique identifier.
        """
        return self._memory_cache.get(analysis_id)

    def list_analyses(self, limit: int = 20) -> List[SARProcessingResult]:
        """
        List previous SAR analysis runs ordered by most recent first.
        """
        items = list(self._memory_cache.values())
        def _get_ts(x):
            ts = getattr(x, "timestamp", None)
            if ts is None and isinstance(x, dict):
                ts = x.get("timestamp", x.get("acquisition_time", ""))
            if hasattr(ts, "isoformat"):
                return ts.isoformat()
            return str(ts or "")
        items.sort(key=_get_ts, reverse=True)
        return items[:limit]

    def delete_analysis(self, analysis_id: str) -> bool:
        """
        Remove an analysis record.
        """
        if analysis_id in self._memory_cache:
            del self._memory_cache[analysis_id]
            fpath = os.path.join(self.storage_dir, f"{analysis_id}.json")
            if os.path.exists(fpath):
                os.remove(fpath)
            return True
        return False

sar_storage = SARStorageService()
