-- =============================================================================
-- ORCA: Marine Ecosystem Reasoning with Collaborative Autonomous Agents
-- Indradhanu Hackathon 2026: AI for Greener Tomorrow
-- Script 03: Rich Seed Data for Marine Zones, Autonomous Agents, and Telemetry
-- =============================================================================

-- Clean up existing data if re-running
TRUNCATE TABLE ecological_alerts CASCADE;
TRUNCATE TABLE agent_reasoning_logs CASCADE;
TRUNCATE TABLE ecosystem_telemetry CASCADE;
TRUNCATE TABLE marine_agents CASCADE;
TRUNCATE TABLE marine_zones CASCADE;

-- Insert Marine Protected & Critical Biome Zones
INSERT INTO marine_zones (id, code, name, designation, description, area_sq_km, health_score, risk_level, centroid, boundary, latitude, longitude)
VALUES
(
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c01',
    'ZONE-GBR-01',
    'Great Barrier Reef - Ribbon Reef Sector',
    'Coral Reef Sanctuary',
    'Crucial northern outer shelf coral ecosystem subjected to recurrent thermal anomalies and marine heatwaves.',
    2840.50,
    72.40,
    'MODERATE',
    ST_SetSRID(ST_MakePoint(145.8500, -15.4200), 4326),
    ST_SetSRID(ST_GeomFromText('POLYGON((145.70 -15.30, 146.00 -15.30, 146.00 -15.55, 145.70 -15.55, 145.70 -15.30))'), 4326),
    -15.4200,
    145.8500
),
(
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c02',
    'ZONE-GAL-02',
    'Galapagos Marine Reserve - Darwin & Wolf Sanctuary',
    'Marine Protected Area',
    'High-biodiversity pelagic hub for apex predators and hammerhead shark migrations vulnerable to illegal fishing fleets.',
    4120.00,
    91.80,
    'LOW',
    ST_SetSRID(ST_MakePoint(-91.8200, 1.6800), 4326),
    ST_SetSRID(ST_GeomFromText('POLYGON((-92.00 1.50, -91.60 1.50, -91.60 1.85, -92.00 1.85, -92.00 1.50))'), 4326),
    1.6800,
    -91.8200
),
(
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c03',
    'ZONE-RAJA-03',
    'Raja Ampat Coral Triangle - Misool Biome',
    'Benthic Coral Hotspot',
    'World epicenter of marine biodiversity, monitored for ocean acidification, larval dispersal, and manta ray aggregation.',
    1950.25,
    88.50,
    'LOW',
    ST_SetSRID(ST_MakePoint(130.2500, -2.1500), 4326),
    ST_SetSRID(ST_GeomFromText('POLYGON((130.10 -2.00, 130.40 -2.00, 130.40 -2.30, 130.10 -2.30, 130.10 -2.00))'), 4326),
    -2.1500,
    130.2500
),
(
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c04',
    'ZONE-SAR-04',
    'Sargasso Sea Floating Forest Sanctuary',
    'Pelagic Gyre Conservation Area',
    'Open ocean golden floating sargassum nursery, under heavy stress from plastic garbage patch convergence and rising SST.',
    6500.00,
    58.20,
    'HIGH',
    ST_SetSRID(ST_MakePoint(-64.5000, 28.3000), 4326),
    ST_SetSRID(ST_GeomFromText('POLYGON((-65.00 27.80, -64.00 27.80, -64.00 28.80, -65.00 28.80, -65.00 27.80))'), 4326),
    28.3000,
    -64.5000
),
(
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c05',
    'ZONE-BALT-05',
    'Baltic Gotland Basin Dead Zone',
    'Hypoxic Remediation Area',
    'Stratified sea floor experiencing acute seasonal hypoxia and low dissolved oxygen due to eutrophication runoff.',
    3200.75,
    44.10,
    'CRITICAL',
    ST_SetSRID(ST_MakePoint(19.2000, 57.3000), 4326),
    ST_SetSRID(ST_GeomFromText('POLYGON((18.80 56.90, 19.60 56.90, 19.60 57.70, 18.80 57.70, 18.80 56.90))'), 4326),
    57.3000,
    19.2000
);

-- Insert Autonomous Marine Agents (Swarm)
INSERT INTO marine_agents (id, agent_id, name, agent_type, status, battery_percentage, current_location, latitude, longitude, depth_meters, assigned_zone_id, capabilities, metadata)
VALUES
(
    'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d01',
    'ORCA-AG-01',
    'Nautilus Sentinel-Alpha',
    'REEF_SENTINEL',
    'ACTIVE',
    94.5,
    ST_SetSRID(ST_MakePoint(145.8320, -15.4150), 4326),
    -15.4150,
    145.8320,
    12.4,
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c01',
    '["Multi-spectral coral scanning", "Zooxanthellae density estimation", "Turbidity profiling"]'::jsonb,
    '{"firmware": "v3.2.1-orca", "mission": "Continuous Bleaching Surveillance"}'::jsonb
),
(
    'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d02',
    'ORCA-AG-02',
    'HydroThermal Recon-02',
    'THERMAL_SCANNER',
    'INVESTIGATING',
    82.0,
    ST_SetSRID(ST_MakePoint(145.8650, -15.4380), 4326),
    -15.4380,
    145.8650,
    25.0,
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c01',
    '["Thermocline inversion tracking", "Degree Heating Week (DHW) calculation", "Internal wave detection"]'::jsonb,
    '{"firmware": "v3.1.8-orca", "mission": "Thermal Plume Mapping"}'::jsonb
),
(
    'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d03',
    'ORCA-AG-03',
    'Apex Acoustic Glider-03',
    'ACOUSTIC_PROFILER',
    'ACTIVE',
    89.2,
    ST_SetSRID(ST_MakePoint(-91.8350, 1.6920), 4326),
    1.6920,
    -91.8350,
    45.5,
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c02',
    '["Passive hydrophone beamforming", "Cetacean vocalization classifier", "Vessel propeller acoustic signature"]'::jsonb,
    '{"firmware": "v3.4.0-orca", "mission": "Dark Vessel and Mega-fauna Guard"}'::jsonb
),
(
    'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d04',
    'ORCA-AG-04',
    'Blue Carbon Observer-04',
    'CARBON_SINK_OBSERVER',
    'ACTIVE',
    96.0,
    ST_SetSRID(ST_MakePoint(130.2650, -2.1420), 4326),
    -2.1420,
    130.2650,
    18.0,
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c03',
    '["Dissolved inorganic carbon profiling", "Seagrass bed biomass assessment", "pH fluctuation analysis"]'::jsonb,
    '{"firmware": "v3.2.0-orca", "mission": "Blue Carbon Sequestration Rate"}'::jsonb
),
(
    'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d05',
    'ORCA-AG-05',
    'Anoxia Profiler Drone-05',
    'PATROL_SWARM',
    'WARNING',
    68.5,
    ST_SetSRID(ST_MakePoint(19.2150, 57.3100), 4326),
    57.3100,
    19.2150,
    75.0,
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c05',
    '["Dissolved oxygen gradient probing", "Benthic methane sniff", "Hydrogen sulfide sensor array"]'::jsonb,
    '{"firmware": "v3.3.4-orca", "mission": "Deep Benthic Anoxia Boundary Tracking"}'::jsonb
);

-- Insert Real-world Baseline Telemetry for Zones
INSERT INTO ecosystem_telemetry (zone_id, recorded_at, water_temperature_c, dissolved_oxygen_mg_l, ph_level, salinity_psu, turbidity_ntu, chlorophyll_mg_m3, microplastics_index, acoustic_noise_db)
VALUES
('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c01', NOW() - INTERVAL '3 hours', 29.8, 5.8, 8.08, 35.1, 1.8, 0.42, 14.5, 42.0),
('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c01', NOW() - INTERVAL '2 hours', 30.2, 5.5, 8.05, 35.2, 2.1, 0.45, 15.0, 43.5),
('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c01', NOW() - INTERVAL '1 hour',  30.6, 5.2, 8.01, 35.3, 2.4, 0.48, 16.2, 45.0),
('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c01', NOW(),                        31.1, 4.9, 7.98, 35.4, 2.8, 0.52, 18.0, 48.0),

('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c02', NOW() - INTERVAL '1 hour',  22.4, 7.2, 8.18, 34.8, 0.9, 0.28, 5.2, 38.0),
('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c02', NOW(),                        22.6, 7.1, 8.16, 34.8, 1.0, 0.30, 5.8, 39.5),

('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c03', NOW() - INTERVAL '1 hour',  28.1, 6.8, 8.21, 34.6, 0.8, 0.35, 6.0, 36.5),
('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c03', NOW(),                        28.2, 6.7, 8.20, 34.6, 0.8, 0.36, 6.4, 37.0),

('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c04', NOW() - INTERVAL '1 hour',  26.5, 6.0, 8.10, 36.5, 3.2, 0.65, 74.2, 52.0),
('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c04', NOW(),                        26.8, 5.8, 8.08, 36.6, 3.5, 0.70, 78.5, 54.0),

('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c05', NOW() - INTERVAL '1 hour',  16.2, 1.8, 7.55, 7.8, 6.5, 2.10, 38.0, 61.0),
('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c05', NOW(),                        16.4, 1.4, 7.48, 7.9, 7.2, 2.30, 42.0, 63.5);

-- Insert Agent Collaborative Reasoning Logs
INSERT INTO agent_reasoning_logs (agent_id, zone_id, timestamp, observation, hypothesis, reasoning_chain, consensus_action, confidence_score, severity)
VALUES
(
    'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d01',
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c01',
    NOW() - INTERVAL '45 minutes',
    'Continuous water temperature at 31.1°C exceeds localized Climatological Maximum Monthly Mean (MMM) by +1.9°C over 72 hours.',
    'Early-stage thermal stress induced zooxanthellae photodamage with 70% probability of Acropora coral bleaching onset.',
    '[
        {"step": 1, "agent": "ORCA-AG-01", "claim": "Upper coral canopy reflectivity indicates chlorophyll loss."},
        {"step": 2, "agent": "ORCA-AG-02", "claim": "Confirmed thermocline depth collapsed to 8m, trapping high thermal energy."},
        {"step": 3, "consensus": "Joint assessment computes Degree Heating Weeks index at 4.2 DHW (Level 1 Alert)."}
    ]'::jsonb,
    'Dispatch swarm gliders to create localized shading micro-bubbles and notify Great Barrier Reef Marine Park Authority (GBRMPA).',
    92.5,
    'ELEVATED'
),
(
    'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d05',
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c05',
    NOW() - INTERVAL '20 minutes',
    'Dissolved oxygen levels plunged to 1.4 mg/L at 75m benthic layer with elevated H2S plume detection.',
    'Severe benthic asphyxiation boundary expanding upwards into demersal cod habitat due to stagnant pycnocline.',
    '[
        {"step": 1, "agent": "ORCA-AG-05", "claim": "Sub-surface sonde detected dissolved oxygen < 2.0 mg/L threshold."},
        {"step": 2, "agent": "ORCA-AG-05", "claim": "Zero demersal fish acoustics detected in a 1.2 nautical mile radius."},
        {"step": 3, "consensus": "Trigger immediate hypoxic dead zone alert to Baltic Marine Environment Commission (HELCOM)."}
    ]'::jsonb,
    'Activate robotic benthic oxygenation bubblers and flag high priority exclusion corridor for commercial trawling.',
    97.0,
    'CRITICAL'
),
(
    'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d03',
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c02',
    NOW() - INTERVAL '10 minutes',
    'Acoustic array detected low-frequency cavitation signature (125 rpm) 3.2 nm inside restricted sanctuary boundary without AIS ping.',
    'Suspected unflagged longline vessel operating in protected hammerhead shark migratory corridor.',
    '[
        {"step": 1, "agent": "ORCA-AG-03", "claim": "Hydrophone triangulated propulsion signature moving southwest at 8.4 knots."},
        {"step": 2, "agent": "ORCA-AG-03", "claim": "Absence of AIS broadcast verified via satellite cross-reference."}
    ]'::jsonb,
    'Transmit coordinate telemetry to Ecuadorian Coast Guard and maneuver autonomous patrol drone for visual snapshot.',
    94.0,
    'ELEVATED'
);

-- Insert Active Ecological Alerts
INSERT INTO ecological_alerts (zone_id, alert_type, severity, title, description, recommended_mitigation, status, triggered_by_agent_id)
VALUES
(
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c01',
    'CORAL_BLEACHING_RISK',
    'HIGH',
    'Thermal Stress Anomaly: Ribbon Reef Sector',
    'Prolonged marine heatwave (+1.9°C anomaly) with DHW index reaching 4.2 °C-weeks. Severe risk for branching Acropora corals.',
    'Deploy artificial upwelling and alert regional conservation management to restrict tourism vessel emissions.',
    'ACTIVE',
    'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d01'
),
(
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c05',
    'HYPOXIC_DEAD_ZONE',
    'CRITICAL',
    'Severe Benthic Anoxia Event (1.4 mg/L DO)',
    'Critical drop in dissolved oxygen across Gotland Basin seabed below lethal threshold for benthic fauna.',
    'Implement emergency acoustic deterrence to guide pelagic fish away from anoxic basin and activate oxygenation diffusers.',
    'ACTIVE',
    'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d05'
),
(
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c04',
    'PLASTIC_CONVERGENCE',
    'MEDIUM',
    'High Microplastic Entrainment in Sargassum Mats',
    'Microplastics index 78.5/100 detected within pelagic sargassum nursery, threatening juvenile sea turtle foraging.',
    'Direct autonomous surface skimmer drones to intercept accumulation convergence lines.',
    'ACTIVE',
    NULL
);
