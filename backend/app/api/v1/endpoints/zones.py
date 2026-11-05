from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from app.schemas.marine import MarineZone
from app.services.data_store import data_store

router = APIRouter()

@router.get("", response_model=List[MarineZone], summary="List all monitored marine biomes and protected zones")
def list_zones(risk_level: Optional[str] = Query(None, description="Filter by LOW, MODERATE, HIGH, CRITICAL")):
    """
    Retrieve all marine zones with PostGIS coordinates, boundaries, health scores, and risk classifications.
    """
    return data_store.get_all_zones(risk_level=risk_level)

@router.get("/{zone_id}", response_model=MarineZone, summary="Get details for a specific marine zone")
def get_zone_by_id(zone_id: str):
    """
    Retrieve specific marine biome details and boundary geometry.
    """
    zone = data_store.get_zone(zone_id)
    if not zone:
        raise HTTPException(status_code=404, detail=f"Marine zone with id '{zone_id}' not found")
    return zone
