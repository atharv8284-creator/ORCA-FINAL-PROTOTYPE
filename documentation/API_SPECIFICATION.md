# ORCA REST API Specification

### Base URL
`http://localhost:8000/api/v1`

---

## 1. System & Health

### `GET /health`
Returns the status of the FastAPI backend, database connectivity, and agent engine.
- **Response `200 OK`**:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "service": "ORCA Marine Ecosystem Reasoning API",
  "timestamp": "2026-10-31T11:00:00Z",
  "database": "connected (PostgreSQL/PostGIS)",
  "active_agents": 5
}
```

---

## 2. Marine Biome Zones

### `GET /zones`
List all monitored marine biomes with spatial boundaries, health scores, and risk classifications.
- **Query Params**:
  - `risk_level` (optional): Filter by `LOW`, `MODERATE`, `HIGH`, `CRITICAL`.
- **Response `200 OK`**:
```json
[
  {
    "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c01",
    "code": "ZONE-GBR-01",
    "name": "Great Barrier Reef - Ribbon Reef Sector",
    "designation": "Coral Reef Sanctuary",
    "description": "Crucial northern outer shelf coral ecosystem...",
    "area_sq_km": 2840.50,
    "health_score": 72.4,
    "risk_level": "MODERATE",
    "latitude": -15.42,
    "longitude": 145.85,
    "boundary_geojson": { ... }
  }
]
```

### `GET /zones/{zone_id}`
Retrieve granular zone details, associated telemetry stream, and assigned agents.

---

## 3. Collaborative Autonomous Agents

### `GET /agents`
List all autonomous swarm agents, positions, battery state, and active missions.
- **Response `200 OK`**:
```json
[
  {
    "id": "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d01",
    "agent_id": "ORCA-AG-01",
    "name": "Nautilus Sentinel-Alpha",
    "agent_type": "REEF_SENTINEL",
    "status": "ACTIVE",
    "battery_percentage": 94.5,
    "latitude": -15.4150,
    "longitude": 145.8320,
    "depth_meters": 12.4,
    "assigned_zone_id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c01",
    "capabilities": [
      "Multi-spectral coral scanning",
      "Zooxanthellae density estimation",
      "Turbidity profiling"
    ]
  }
]
```

### `POST /agents/{agent_id}/dispatch`
Command an agent to transition state or investigate an ecological anomaly.

---

## 4. Telemetry & Analytics

### `GET /telemetry/latest`
Fetch latest hydrographic and environmental sensor readings across all zones.

### `GET /telemetry/zone/{zone_id}/history`
Retrieve time-series readings for temperature, dissolved oxygen, pH, salinity, and microplastics.

---

## 5. Agent Reasoning & Consensus

### `GET /reasoning/logs`
Retrieve collaborative multi-agent reasoning chains, hypotheses, and consensus actions.

### `POST /reasoning/deliberate`
Trigger an autonomous deliberation cycle where agents evaluate incoming sensor data and formulate an intervention.

---

## 6. Ecological Alerts

### `GET /alerts`
List active environmental alerts (coral bleaching, hypoxia, acidification, dark vessel intrusion).

### `POST /alerts/{alert_id}/acknowledge`
Acknowledge or update status of an active ecological alert.
