from fastapi import APIRouter
from app.api.v1.endpoints import health, zones, agents, telemetry, reasoning, alerts, satellite, sar, oceanographic, ais, optical, iot, orchestration

api_router = APIRouter()

api_router.include_router(health.router, tags=["Health"])
api_router.include_router(zones.router, prefix="/zones", tags=["Marine Biome Zones"])
api_router.include_router(agents.router, prefix="/agents", tags=["Autonomous Swarm Agents"])
api_router.include_router(telemetry.router, prefix="/telemetry", tags=["Ecosystem Telemetry"])
api_router.include_router(iot.router, prefix="/iot", tags=["Virtual ESP32 Buoy & IoT Intelligence"])
api_router.include_router(orchestration.router, prefix="/orchestration", tags=["Lead Orchestration & Multi-Agent Intelligence"])
api_router.include_router(reasoning.router, prefix="/reasoning", tags=["Collaborative Agent Reasoning"])
api_router.include_router(alerts.router, prefix="/alerts", tags=["Ecological Alerts"])
api_router.include_router(satellite.router, prefix="/satellite", tags=["Copernicus Satellite Intelligence"])
api_router.include_router(sar.router, prefix="/sar", tags=["Synthetic Aperture Radar (SAR) Monitoring"])
api_router.include_router(optical.router, prefix="/optical", tags=["Sentinel-2 Optical Multispectral Monitoring"])
api_router.include_router(oceanographic.router, prefix="/oceanographic", tags=["Copernicus Marine Oceanographic Monitoring"])
api_router.include_router(ais.router, prefix="/ais", tags=["AIS Vessel Tracking"])


