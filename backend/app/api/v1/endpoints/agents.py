from fastapi import APIRouter, HTTPException
from typing import List
from app.schemas.marine import MarineAgent, MarineAgentDispatch
from app.services.data_store import data_store

router = APIRouter()

@router.get("", response_model=List[MarineAgent], summary="List all autonomous marine swarm agents")
def list_agents():
    """
    Returns the real-time status, battery levels, geographic coordinates, and mission payloads
    of all collaborative autonomous agents.
    """
    return data_store.get_all_agents()

@router.get("/{agent_id}", response_model=MarineAgent, summary="Get details for a specific marine agent")
def get_agent_by_id(agent_id: str):
    agent = data_store.get_agent(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail=f"Marine agent '{agent_id}' not found")
    return agent

@router.post("/{agent_id}/dispatch", response_model=MarineAgent, summary="Dispatch or retask an autonomous agent")
def dispatch_agent(agent_id: str, dispatch_req: MarineAgentDispatch):
    """
    Assigns a new spatial waypoint or mission to an autonomous agent.
    """
    agent = data_store.get_agent(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail=f"Marine agent '{agent_id}' not found")

    agent.status = "INVESTIGATING"
    agent.metadata["current_mission"] = dispatch_req.mission
    if dispatch_req.target_latitude is not None and dispatch_req.target_longitude is not None:
        agent.latitude = dispatch_req.target_latitude
        agent.longitude = dispatch_req.target_longitude
    if dispatch_req.target_zone_id:
        agent.assigned_zone_id = dispatch_req.target_zone_id

    return agent
