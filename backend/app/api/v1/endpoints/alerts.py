from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from app.schemas.marine import EcologicalAlert, AlertStatusUpdate
from app.services.data_store import data_store

router = APIRouter()

@router.get("", response_model=List[EcologicalAlert], summary="List ecological alerts")
def list_alerts(status: Optional[str] = Query(None, description="Filter by ACTIVE, ACKNOWLEDGED, RESOLVED")):
    """
    Returns active or historical ecological alerts (bleaching, hypoxia, acidification, dark vessel).
    """
    return data_store.get_alerts(status=status)

@router.patch("/{alert_id}/status", response_model=EcologicalAlert, summary="Update alert status")
def update_alert_status(alert_id: str, update_req: AlertStatusUpdate):
    """
    Update status of an alert (e.g. ACKNOWLEDGED or RESOLVED).
    """
    updated = data_store.update_alert_status(alert_id, update_req.status.upper())
    if not updated:
        raise HTTPException(status_code=404, detail=f"Alert '{alert_id}' not found")
    return updated
