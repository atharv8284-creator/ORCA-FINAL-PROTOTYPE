-- =============================================================================
-- ORCA: Marine Ecosystem Reasoning with Collaborative Autonomous Agents
-- Indradhanu Hackathon 2026: AI for Greener Tomorrow
-- Script 01: Enable PostGIS & Required Extensions
-- =============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable PostGIS spatial database extension
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Enable PostGIS Topology if needed
CREATE EXTENSION IF NOT EXISTS "postgis_topology";

-- Confirm PostGIS version
DO $$
BEGIN
    RAISE NOTICE 'PostGIS Extension initialized successfully. Version: %', postgis_version();
END $$;
