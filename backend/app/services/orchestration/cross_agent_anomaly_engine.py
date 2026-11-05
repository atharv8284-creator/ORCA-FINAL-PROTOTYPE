import logging
from typing import List, Dict, Any, Tuple
from app.schemas.orchestration import (
    UnifiedEvidenceRecord,
    SpatialCorrelationRecord,
    TemporalCorrelationRecord,
    IncidentCategory
)

logger = logging.getLogger("orca.orchestration.cross_agent_engine")


class CrossAgentAnomalyEngine:
    """
    Synthesizes normalized evidence from multiple agents to detect and classify
    marine ecological incidents across 4 primary scenarios with rigorous conflict detection.
    """

    @classmethod
    def evaluate_cross_agent_anomalies(
        cls,
        evidence: List[UnifiedEvidenceRecord],
        spatial_correlations: List[SpatialCorrelationRecord],
        temporal_correlations: List[TemporalCorrelationRecord],
        incident_hint: str = None
    ) -> Tuple[IncidentCategory, str, List[Dict[str, Any]], List[Dict[str, Any]], List[str], List[str], List[str]]:
        """
        Returns:
        (category, label, supporting_evidence, contradicting_evidence, missing_evidence, alternative_explanations, recommended_follow_up)
        """
        supporting: List[Dict[str, Any]] = []
        contradicting: List[Dict[str, Any]] = []
        missing: List[str] = []
        alternatives: List[str] = []
        recommendations: List[str] = []

        # Identify evidence by agent
        sar_records = [e for e in evidence if "SAR" in e.agent_name.upper()]
        optical_records = [e for e in evidence if "OPTICAL" in e.agent_name.upper()]
        ocean_records = [e for e in evidence if "OCEAN" in e.agent_name.upper() or "COPERNICUS" in e.agent_name.upper()]
        ais_records = [e for e in evidence if "AIS" in e.agent_name.upper()]
        iot_records = [e for e in evidence if "IOT" in e.agent_name.upper() or "BUOY" in e.agent_name.upper()]

        # Track missing agents
        if not sar_records:
            missing.append("Sentinel-1 SAR C-Band Imagery (No staged SAR acquisition in target window)")
        if not optical_records:
            missing.append("Sentinel-2 Optical Multispectral Bands (No cloud-free optical acquisition)")
        if not ocean_records:
            missing.append("Copernicus Marine Physical Oceanography (In-situ CTD or Mercator model offline)")
        if not ais_records:
            missing.append("AIS Vessel Kinematics (No authorized vessel transponder feed in target area)")
        if not iot_records:
            missing.append("In-Situ Marine Buoy Telemetry (IoT station unmonitored or unconfigured)")

        # Extract specific findings
        sar_has_dark_patch = any("DARK_PATCH" in str(e.value).upper() or "SLICK" in str(e.value).upper() or "CANDIDATE" in str(e.value).upper() for e in sar_records)
        optical_turbidity_high = any(
            isinstance(e.value, (int, float)) and e.value > 2.0 and "TURBIDITY" in e.measurement_or_indicator.upper()
            for e in optical_records
        )
        optical_chlorophyll_high = any(
            isinstance(e.value, (int, float)) and e.value > 0.15 and "CHLOROPHYLL" in e.measurement_or_indicator.upper()
            for e in optical_records
        )
        ocean_temp_elevated = any(
            isinstance(e.value, (int, float)) and e.value > 30.0 and "TEMPERATURE" in e.measurement_or_indicator.upper()
            for e in ocean_records
        )
        ocean_wind_speed = None
        for e in ocean_records:
            if "WIND" in e.measurement_or_indicator.upper() and isinstance(e.value, (int, float)):
                ocean_wind_speed = float(e.value)

        ais_has_anomalies = any("ANOMALY" in str(e.value).upper() or "LOITERING" in str(e.value).upper() for e in ais_records)
        iot_has_anomalies = any(e.quality_status == "SYNTHETIC" and "ANOMALY" in str(e.value).upper() for e in iot_records)

        # Scenario 1: POSSIBLE_OIL_SPILL_SURFACE_ANOMALY
        if sar_has_dark_patch or (incident_hint and "SPILL" in incident_hint.upper()):
            category: IncidentCategory = "POSSIBLE_OIL_SPILL_SURFACE_ANOMALY"
            label = "Possible Surface Hydrocarbon or Biogenic Slick Candidate"

            for s in sar_records:
                supporting.append({
                    "agent": s.agent_name,
                    "evidence_id": s.evidence_id,
                    "finding": f"SAR dark patch detected: {s.measurement_or_indicator} = {s.value} {s.unit}",
                    "significance": "Radar backscatter reduction caused by capillary wave damping typical of surfactants or thin surface slicks."
                })

            # Check for nearby AIS vessels
            nearby_vessels = [c for c in spatial_correlations if "AIS" in c.agent_a.upper() or "AIS" in c.agent_b.upper()]
            if nearby_vessels:
                for v in nearby_vessels[:2]:
                    supporting.append({
                        "agent": "AIS Agent",
                        "correlation_id": v.correlation_id,
                        "finding": f"AIS vessel in vicinity ({v.distance_km:.1f} km away): {v.proximity_summary}",
                        "significance": "Vessel traffic presence provides contextual maritime traffic footprint (non-causal)."
                    })
            else:
                contradicting.append({
                    "agent": "AIS Agent",
                    "finding": "Zero authorized vessels observed within immediate proximity (<= 15 km) during observation window.",
                    "significance": "Absence of nearby transponder signals reduces likelihood of immediate ongoing operational discharge, though historical transit remains possible."
                })

            # Check wind speed conflict
            if ocean_wind_speed is not None:
                if ocean_wind_speed < 3.0:
                    contradicting.append({
                        "agent": "Oceanographic Agent",
                        "finding": f"Low surface wind speed measured: {ocean_wind_speed:.1f} m/s (< 3.0 m/s threshold).",
                        "significance": "Wind speeds under 3 m/s naturally produce mirror-smooth sea surfaces ('calms') which mimic oil slick radar signatures identically."
                    })
                    alternatives.append("Calm sea conditions / wind shadow (< 3 m/s) producing a false-positive dark radar patch.")
                elif ocean_wind_speed > 12.0:
                    contradicting.append({
                        "agent": "Oceanographic Agent",
                        "finding": f"High surface wind speed measured: {ocean_wind_speed:.1f} m/s (> 12.0 m/s threshold).",
                        "significance": "High wind and breaking waves rapidly disperse thin oil films and break up cohesive surface slicks within 1 to 2 hours."
                    })
                    alternatives.append("Wave break shadowing or turbulent wind gust divergence boundary.")

            alternatives.extend([
                "Natural biogenic film from coral spawning or concentrated phytoplankton exudates.",
                "Internal ocean wave surface convergence line.",
                "Shallow bathymetric reef bank dampening surface wave resonance."
            ])

            recommendations.extend([
                "Request targeted Sentinel-2 multispectral pass with Level-2A surface reflectance to inspect sun-glint contrast.",
                "Deploy aerial drone or Autonomous Surface Vehicle (ASV) equipped with fluorometer to verify hydrocarbon fluorescence.",
                "Cross-check regional maritime port authority vessel traffic schedules for unrecorded transit."
            ])
            return category, label, supporting, contradicting, missing, alternatives, recommendations

        # Scenario 2: POSSIBLE_WATER_QUALITY_ANOMALY
        if optical_turbidity_high or optical_chlorophyll_high or (incident_hint and ("TURBIDITY" in incident_hint.upper() or "BLOOM" in incident_hint.upper())):
            category = "POSSIBLE_WATER_QUALITY_ANOMALY"
            label = "Possible Coastal Sediment Runoff or Chlorophyll/Algal Bloom"

            for opt in optical_records:
                supporting.append({
                    "agent": opt.agent_name,
                    "evidence_id": opt.evidence_id,
                    "finding": f"Optical spectral index anomaly: {opt.measurement_or_indicator} = {opt.value} {opt.unit}",
                    "significance": "Elevated red-edge/NIR or green-red band reflectance indicates suspended sediment or photosynthetic phytoplankton pigments."
                })

            if iot_records:
                for iot in iot_records:
                    if "TURBIDITY" in iot.measurement_or_indicator.upper() or "OXYGEN" in iot.measurement_or_indicator.upper():
                        supporting.append({
                            "agent": iot.agent_name,
                            "evidence_id": iot.evidence_id,
                            "finding": f"In-situ sensor reading: {iot.measurement_or_indicator} = {iot.value} {iot.unit} (DATA TIER: {iot.data_mode})",
                            "significance": f"Simulated IoT buoy demonstrates concordant multi-parameter perturbation (synthetic context only)."
                        })

            alternatives.extend([
                "Riverine stormwater sediment discharge following heavy coastal rainfall.",
                "Shallow water bottom sediment resuspension from tidal currents or wind waves.",
                "Harmless non-toxic seasonal diatom bloom."
            ])

            recommendations.extend([
                "Inspect Copernicus Marine river runoff discharge model estimates for adjacent catchment basins.",
                "Perform in-situ water grab sampling for laboratory chlorophyll HPLC and suspended solids filtration.",
                "Task repeat optical observation under favorable illumination to track plume dissipation."
            ])
            return category, label, supporting, contradicting, missing, alternatives, recommendations

        # Scenario 3: POSSIBLE_UNUSUAL_VESSEL_ACTIVITY
        if ais_has_anomalies or (incident_hint and "VESSEL" in incident_hint.upper()):
            category = "POSSIBLE_UNUSUAL_VESSEL_ACTIVITY"
            label = "Unusual Maritime Navigation Pattern or Sensitive Zone Loitering"

            for a in ais_records:
                supporting.append({
                    "agent": a.agent_name,
                    "evidence_id": a.evidence_id,
                    "finding": f"AIS kinematics finding: {a.measurement_or_indicator} = {a.value}",
                    "significance": "Vessel trajectory exhibits erratic course alterations, slow loitering, or transponder gap inside protected waters."
                })

            alternatives.extend([
                "Vessel conducting legitimate marine research, underwater cable maintenance, or authorized anchoring.",
                "Adverse weather or sea-state avoidance maneuver.",
                "Transponder signal attenuation due to atmospheric ducting or coastal land obstruction."
            ])

            recommendations.extend([
                "Query Maritime Safety Agency (AMSA) for authorized marine scientific or mooring permits.",
                "Query satellite AIS (S-AIS) provider for historical long-range track verification.",
                "Correlate with daylight optical imaging to confirm vessel superstructure and activity."
            ])
            return category, label, supporting, contradicting, missing, alternatives, recommendations

        # Scenario 4: POSSIBLE_MARINE_ENVIRONMENTAL_STRESS
        if ocean_temp_elevated or (incident_hint and ("THERMAL" in incident_hint.upper() or "BLEACHING" in incident_hint.upper())):
            category = "POSSIBLE_MARINE_ENVIRONMENTAL_STRESS"
            label = "Elevated Sea Surface Temperature & Coral Thermal Stress Warning"

            for o in ocean_records:
                supporting.append({
                    "agent": o.agent_name,
                    "evidence_id": o.evidence_id,
                    "finding": f"Oceanographic thermal record: {o.measurement_or_indicator} = {o.value} {o.unit}",
                    "significance": "Sustained temperature anomaly exceeds local summertime coral bleaching threshold."
                })

            alternatives.extend([
                "Diurnal solar heating of shallow, calm reef lagoon surface layer during low tide.",
                "Transient warm ocean eddy transit."
            ])

            recommendations.extend([
                "Monitor NOAA Coral Reef Watch Degree Heating Weeks (DHW) index accumulation.",
                "Deploy diver underwater photogrammetry surveys to assess zooxanthellae loss across index reef transects."
            ])
            return category, label, supporting, contradicting, missing, alternatives, recommendations

        # Default: BASELINE_EVALUATION
        category = "BASELINE_EVALUATION"
        label = "Nominal Marine Ecosystem Equilibrium (All Parameters Baseline)"
        supporting.append({
            "agent": "ORCA Multi-Agent Fleet",
            "finding": f"Synthesized {len(evidence)} evidence records across available agents; all observations remain within nominal marine ranges.",
            "significance": "No anomalous backscatter reduction, water quality deviations, vessel irregularities, or extreme thermal pulses detected."
        })
        recommendations.append("Continue scheduled automated multi-agent surveillance and satellite pass monitoring.")

        return category, label, supporting, contradicting, missing, alternatives, recommendations


cross_agent_anomaly_engine = CrossAgentAnomalyEngine()
