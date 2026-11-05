# ORCA Database Architecture: PostgreSQL + PostGIS

This folder contains the database setup, schema, and initial seed data for **ORCA – Marine Ecosystem Reasoning with Collaborative Autonomous Agents**.

---

## Spatial Data Engine: PostGIS
ORCA relies on PostGIS for high-performance geospatial operations:
- Geodetic coordinate system: **WGS 84 (EPSG:4326)**
- Polygon & MultiPolygon representations for Marine Protected Areas (MPAs), Coral Reef Sanctuaries, and coastal lagoons.
- Point geometries for real-time tracking of autonomous marine agents (AUVs, gliders, buoys).
- GiST spatial indexing for low-latency containment, proximity, and distance queries (`ST_DWithin`, `ST_Contains`, `ST_Intersects`).

---

## Files in this Directory

| File | Description |
|------|-------------|
| `01_init_postgis.sql` | Enables `uuid-ossp` and `postgis` spatial extensions. |
| `02_schema.sql` | Creates tables: `marine_zones`, `marine_agents`, `ecosystem_telemetry`, `agent_reasoning_logs`, `ecological_alerts`. |
| `03_seed_data.sql` | Seeds realistic real-world marine biodiversity biomes (Great Barrier Reef, Galapagos, Raja Ampat, Sargasso Sea, Baltic Basin), agent swarms, telemetry time-series, and multi-agent reasoning chains. |

---

## Local Setup Options

### Option 1: Docker (Fastest & Recommended)
Run an official PostGIS Docker container with one command:

```bash
docker run --name orca-postgis \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=orca_marine_db \
  -p 5432:5432 \
  -d postgis/postgis:16-3.4
```

Then apply the initialization scripts:
```bash
docker exec -i orca-postgis psql -U postgres -d orca_marine_db < database/01_init_postgis.sql
docker exec -i orca-postgis psql -U postgres -d orca_marine_db < database/02_schema.sql
docker exec -i orca-postgis psql -U postgres -d orca_marine_db < database/03_seed_data.sql
```

### Option 2: Local PostgreSQL / pgAdmin
1. Ensure PostgreSQL is installed with the PostGIS extension package.
2. Create the database:
   ```sql
   CREATE DATABASE orca_marine_db;
   ```
3. Connect and run `01_init_postgis.sql`, `02_schema.sql`, and `03_seed_data.sql` in sequence.

---

## Note on Local In-Memory Fallback
The ORCA backend is designed with a resilient fallback mechanism: if a live PostgreSQL + PostGIS server is not running on `localhost:5432`, the backend gracefully initializes an in-memory repository with the identical spatial datasets and schema to allow immediate local testing and evaluation without database friction during hackathon judging.
