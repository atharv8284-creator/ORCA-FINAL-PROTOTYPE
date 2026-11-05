from abc import ABC, abstractmethod
from typing import List, Optional, Tuple, Dict, Any
from app.schemas.ais import AISVesselPosition, AISVesselMovement


class BaseAISProvider(ABC):
    """
    Provider-independent abstract base class for AIS tracking feeds.
    Enables pluggable integration of authorized third-party providers
    (AISHub, MarineTraffic, Spire, coastal receivers) or demonstration mode.
    """
    def __init__(self, provider_name: str, api_key: str, api_endpoint: str):
        self.provider_name = provider_name
        self.api_key = api_key.strip() if api_key else ""
        self.api_endpoint = api_endpoint.strip() if api_endpoint else ""

    @property
    def has_credentials(self) -> bool:
        return bool(self.api_key)

    @abstractmethod
    async def check_connection_status(self) -> Dict[str, Any]:
        """
        Check provider connection status.
        Returns dictionary with:
        - is_connected: bool
        - status: 'REAL' | 'NOT CONNECTED' | 'OFFLINE' | 'NO DATA' | 'DEMO'
        - message: str
        - latency_ms: float
        - provider: str
        """
        pass

    @abstractmethod
    async def fetch_vessel_positions(
        self,
        bbox: Optional[Tuple[float, float, float, float]] = None,
        limit: int = 100
    ) -> List[AISVesselPosition]:
        """
        Fetch current vessel positions matching optional bounding box.
        bbox format: (min_lat, max_lat, min_lon, max_lon)
        """
        pass

    @abstractmethod
    async def fetch_vessel_details(self, mmsi: str) -> Optional[Dict[str, Any]]:
        """
        Fetch comprehensive technical and voyage details for a specific MMSI.
        """
        pass

    @abstractmethod
    async def fetch_vessel_movement(self, mmsi: str) -> Optional[AISVesselMovement]:
        """
        Fetch kinematic and movement information (SOG, COG, heading, movement vector)
        for a specific vessel MMSI.
        """
        pass
