import os
import json
from typing import List
from dotenv import load_dotenv

# Load local environment if available
load_dotenv()

class Settings:
    PROJECT_NAME: str = os.getenv("PROJECT_NAME", "ORCA - Marine Ecosystem Reasoning with Collaborative Autonomous Agents")
    API_V1_STR: str = os.getenv("API_V1_STR", "/api/v1")
    DEBUG: bool = os.getenv("DEBUG", "True").lower() in ("true", "1", "yes")
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "postgresql://postgres:postgres@localhost:5432/orca_marine_db"
    )
    
    # Copernicus Data Space Ecosystem (CDSE) STAC & Auth
    COPERNICUS_STAC_URL: str = os.getenv(
        "COPERNICUS_STAC_URL", 
        "https://stac.dataspace.copernicus.eu/v1"
    )
    COPERNICUS_AUTH_URL: str = os.getenv(
        "COPERNICUS_AUTH_URL", 
        "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token"
    )
    COPERNICUS_CLIENT_ID: str = os.getenv("COPERNICUS_CLIENT_ID", "")
    COPERNICUS_CLIENT_SECRET: str = os.getenv("COPERNICUS_CLIENT_SECRET", "")
    COPERNICUS_USERNAME: str = os.getenv("COPERNICUS_USERNAME", "")
    COPERNICUS_PASSWORD: str = os.getenv("COPERNICUS_PASSWORD", "")
    
    # Copernicus Marine Service (CMS / CMEMS)
    COPERNICUS_MARINE_STAC_URL: str = os.getenv(
        "COPERNICUS_MARINE_STAC_URL", 
        "https://stac.marine.copernicus.eu/metadata/catalog.stac.json"
    )
    COPERNICUS_MARINE_WMTS_URL: str = os.getenv(
        "COPERNICUS_MARINE_WMTS_URL", 
        "https://wmts.marine.copernicus.eu/teroWmts"
    )
    COPERNICUS_MARINE_USERNAME: str = os.getenv("COPERNICUS_MARINE_USERNAME", os.getenv("COPERNICUS_MARINE_USER", ""))
    COPERNICUS_MARINE_PASSWORD: str = os.getenv("COPERNICUS_MARINE_PASSWORD", "")
    COPERNICUS_MARINE_API_KEY: str = os.getenv("COPERNICUS_MARINE_API_KEY", "")
    
    # Automatic Identification System (AIS) Vessel Tracking
    AIS_API_KEY: str = os.getenv("AIS_API_KEY", "")
    AIS_PROVIDER: str = os.getenv("AIS_PROVIDER", "aishub") # aishub, marinetraffic, demo
    AIS_API_ENDPOINT: str = os.getenv("AIS_API_ENDPOINT", "https://data.aishub.net/ws.php")
    AIS_CACHE_TTL_SECONDS: int = int(os.getenv("AIS_CACHE_TTL_SECONDS", "60"))
    AIS_DEMO_MODE: bool = os.getenv("AIS_DEMO_MODE", "False").lower() in ("true", "1", "yes")
    MARINETRAFFIC_API_KEY: str = os.getenv("MARINETRAFFIC_API_KEY", "")
    MARINETRAFFIC_API_ENDPOINT: str = os.getenv("MARINETRAFFIC_API_ENDPOINT", "https://services.marinetraffic.com/api/exportvessels/v:8")
    
    # NUGEN Neural Inference Service (Server-side only)
    NUGEN_API_KEY: str = os.getenv("NUGEN_API_KEY", "")
    NUGEN_ENDPOINT: str = os.getenv("NUGEN_ENDPOINT", "")
    NUGEN_MODEL_ID: str = os.getenv("NUGEN_MODEL_ID", "")
    NUGEN_TIMEOUT_SECONDS: float = float(os.getenv("NUGEN_TIMEOUT_SECONDS", "30.0"))

    # In-Situ IoT Buoy Hardware Ingestion Interface & Virtual Buoy Simulation
    IOT_INGESTION_KEY: str = os.getenv("IOT_INGESTION_KEY", "orca-esp32-ingest-key-2026")
    IOT_SIMULATION_ENABLED: bool = os.getenv("IOT_SIMULATION_ENABLED", "True").lower() in ("true", "1", "yes")
    IOT_DEVICE_ID: str = os.getenv("IOT_DEVICE_ID", "ORCA-BUOY-001")
    IOT_UPDATE_INTERVAL_SECONDS: int = int(os.getenv("IOT_UPDATE_INTERVAL_SECONDS", "5"))
    IOT_DEFAULT_SCENARIO: str = os.getenv("IOT_DEFAULT_SCENARIO", "normal")
    IOT_ENABLE_REAL_DEVICE: bool = os.getenv("IOT_ENABLE_REAL_DEVICE", "False").lower() in ("true", "1", "yes")
    
    # CORS
    @property
    def CORS_ORIGINS(self) -> List[str]:
        raw = os.getenv("BACKEND_CORS_ORIGINS", '["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"]')
        try:
            return json.loads(raw)
        except Exception:
            return ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"]

settings = Settings()
