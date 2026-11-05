-- =============================================================================
-- ORCA: Marine Ecosystem Reasoning with Collaborative Autonomous Agents
-- Indradhanu Hackathon 2026: AI for Greener Tomorrow
-- Script 02: Core Schema Definition with Spatial Geometries
-- =============================================================================

-- 1. Marine Zones Table (Protected areas, reefs, benthic sanctuaries)
CREATE TABLE IF NOT EXISTS marine_zones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(32) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    designation VARCHAR(100) NOT NULL, -- Marine Protected Area, Coral Reef Sanctuary, Coastal Mangrove, etc.
    description TEXT,
    area_sq_km NUMERIC(10, 2) NOT NULL DEFAULT 0.0,
    health_score NUMERIC(5, 2) NOT NULL DEFAULT 85.00, -- 0 to 100
    risk_level VARCHAR(32) NOT NULL DEFAULT 'LOW', -- LOW, MODERATE, HIGH, CRITICAL
    
    -- PostGIS Geometries: WGS 84 (SRID 4326)
    centroid GEOMETRY(Point, 4326) NOT NULL,
    boundary GEOMETRY(Polygon, 4326),
    
    latitude NUMERIC(9, 6) NOT NULL,
    longitude NUMERIC(9, 6) NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for spatial queries
CREATE INDEX IF NOT EXISTS idx_marine_zones_centroid ON marine_zones USING GIST (centroid);
CREATE INDEX IF NOT EXISTS idx_marine_zones_boundary ON marine_zones USING GIST (boundary);
CREATE INDEX IF NOT EXISTS idx_marine_zones_risk ON marine_zones (risk_level);

-- 2. Collaborative Marine Autonomous Agents Table
CREATE TABLE IF NOT EXISTS marine_agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(128) NOT NULL,
    agent_type VARCHAR(64) NOT NULL, -- REEF_SENTINEL, THERMAL_SCANNER, ACOUSTIC_PROFILER, CARBON_SINK_OBSERVER, PATROL_SWARM
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, IDLE, INVESTIGATING, WARNING, OFFLINE
    battery_percentage NUMERIC(5, 2) NOT NULL DEFAULT 100.0,
    
    -- Current position of autonomous agent
    current_location GEOMETRY(Point, 4326) NOT NULL,
    latitude NUMERIC(9, 6) NOT NULL,
    longitude NUMERIC(9, 6) NOT NULL,
    depth_meters NUMERIC(6, 2) DEFAULT 10.0,
    
    assigned_zone_id UUID REFERENCES marine_zones(id) ON DELETE SET NULL,
    capabilities JSONB NOT NULL DEFAULT '[]'::jsonb,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    last_heartbeat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_marine_agents_loc ON marine_agents USING GIST (current_location);
CREATE INDEX IF NOT EXISTS idx_marine_agents_zone ON marine_agents (assigned_zone_id);
CREATE INDEX IF NOT EXISTS idx_marine_agents_status ON marine_agents (status);

-- 3. Ecosystem Telemetry (Sensors & Hydrographic Monitoring)
CREATE TABLE IF NOT EXISTS ecosystem_telemetry (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    zone_id UUID NOT NULL REFERENCES marine_zones(id) ON DELETE CASCADE,
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    water_temperature_c NUMERIC(5, 2) NOT NULL,
    dissolved_oxygen_mg_l NUMERIC(5, 2) NOT NULL,
    ph_level NUMERIC(4, 2) NOT NULL,
    salinity_psu NUMERIC(5, 2) NOT NULL,
    turbidity_ntu NUMERIC(6, 2) NOT NULL,
    chlorophyll_mg_m3 NUMERIC(6, 3) NOT NULL,
    microplastics_index NUMERIC(5, 2) NOT NULL DEFAULT 0.0, -- Index 0-100
    acoustic_noise_db NUMERIC(5, 1) NOT NULL DEFAULT 40.0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_telemetry_zone_time ON ecosystem_telemetry (zone_id, recorded_at DESC);

-- 4. Agent Reasoning Logs (Multi-Agent Collaborative Deliberation)
CREATE TABLE IF NOT EXISTS agent_reasoning_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES marine_agents(id) ON DELETE CASCADE,
    zone_id UUID REFERENCES marine_zones(id) ON DELETE SET NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    observation TEXT NOT NULL,
    hypothesis TEXT NOT NULL,
    reasoning_chain JSONB NOT NULL DEFAULT '[]'::jsonb,
    consensus_action TEXT NOT NULL,
    confidence_score NUMERIC(5, 2) NOT NULL, -- 0 to 100%
    severity VARCHAR(32) NOT NULL DEFAULT 'INFO', -- INFO, ADVISORY, ELEVATED, CRITICAL
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reasoning_agent ON agent_reasoning_logs (agent_id);
CREATE INDEX IF NOT EXISTS idx_reasoning_time ON agent_reasoning_logs (timestamp DESC);

-- 5. Ecological Alerts (Actionable anomalies detected across marine biomes)
CREATE TABLE IF NOT EXISTS ecological_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    zone_id UUID NOT NULL REFERENCES marine_zones(id) ON DELETE CASCADE,
    alert_type VARCHAR(64) NOT NULL, -- CORAL_BLEACHING_RISK, HYPOXIC_DEAD_ZONE, OCEAN_ACIDIFICATION, UNREGULATED_VESSEL, PLASTIC_CONVERGENCE
    severity VARCHAR(32) NOT NULL DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH, CRITICAL
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    recommended_mitigation TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, ACKNOWLEDGED, RESOLVED
    
    triggered_by_agent_id UUID REFERENCES marine_agents(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_alerts_zone ON ecological_alerts (zone_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON ecological_alerts (status);
