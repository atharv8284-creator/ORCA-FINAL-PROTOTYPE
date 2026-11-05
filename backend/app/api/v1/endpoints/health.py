from fastapi import APIRouter
from datetime import datetime, timezone
from app.schemas.marine import SystemHealth
from app.services.data_store import data_store
from app.core.config import settings

router = APIRouter()

@router.get("/health", response_model=SystemHealth, summary="Check API health and status")
def get_system_health():
    """
    Returns system status, active agents count, and database connection mode.
    """
    return SystemHealth(
        status="healthy",
        service=settings.PROJECT_NAME,
        version="1.0.0",
        timestamp=datetime.now(timezone.utc),
        database="PostgreSQL/PostGIS Spatial Engine (Active)",
        active_agents=len(data_store.get_all_agents()),
        monitored_zones=len(data_store.get_all_zones())
    )
