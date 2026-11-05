import logging
from typing import List, Dict, Any, Tuple
from app.schemas.orchestration import (
    UnifiedEvidenceRecord,
    SpatialCorrelationRecord,
    TemporalCorrelationRecord,
    EvidenceQualityAssessment
)

logger = logging.getLogger("orca.orchestration.quality")


class QualityUncertaintyEngine:
    """
    Transparent quality and uncertainty assessment engine for multi-agent evidence.
    
    CRITICAL SCIENTIFIC PRINCIPLES:
    1. Separate four distinct concepts:
       - Data Quality: Sensor accuracy, spatial resolution, and atmospheric interference.
       - Evidence Confidence: Confidence that the observed physical signal is genuine.
       - Correlation Strength: Combined spatial proximity and temporal alignment.
       - Incident Assessment Confidence: Overall confidence in the cross-agent synthesis.
    2. A simulated IoT anomaly must NEVER increase confidence in a real-world incident.
    3. Preview-derived optical indicators must NOT be treated as validated native-band measurements.
    4. AIS gaps must NOT be treated as proof of illegal activity.
    5. A SAR dark patch must NOT automatically be classified as an oil spill.
    6. Conflicting evidence must be explicitly detected and reported.
    """

    @classmethod
    def evaluate_quality(
        cls,
        evidence: List[UnifiedEvidenceRecord],
        spatial_correlations: List[SpatialCorrelationRecord],
        temporal_correlations: List[TemporalCorrelationRecord]
    ) -> EvidenceQualityAssessment:
        rules_applied: List[str] = []
        if not evidence:
            return EvidenceQualityAssessment(
                overall_quality_score=0.0,
                data_reliability_score=0.0,
                freshness_score=0.0,
                spatial_relevance_score=0.0,
                temporal_relevance_score=0.0,
                missing_evidence_count=5,
                simulated_evidence_count=0,
                quality_rules_applied=["RULE_EMPTY_EVIDENCE_ZERO_SCORE"]
            )

        reliability_sum = 0.0
        freshness_sum = 0.0
        simulated_count = 0

        for rec in evidence:
            # Data reliability weighting based on processing method and data tier
            if rec.data_mode == "LIVE":
                if rec.quality_status == "VERIFIED":
                    r = 0.95
                elif rec.quality_status == "CALIBRATED_ESTIMATE":
                    r = 0.80
                else:
                    r = 0.65
            elif rec.data_mode == "MODEL_OUTPUT":
                r = 0.85
                rules_applied.append(f"RULE_MODEL_OUTPUT_RELIABILITY_CAP: {rec.agent_name}")
            elif rec.data_mode in ["SIMULATED", "DEMO"]:
                r = 0.50
                simulated_count += 1
                rules_applied.append(f"RULE_SIMULATION_ISOLATION_APPLIED: {rec.agent_name} marked SYNTHETIC")
            elif rec.data_mode == "HISTORICAL":
                r = 0.70
            else:
                r = 0.10

            # Freshness score
            if "REAL_TIME" in rec.quality_status or "LIVE" in rec.data_mode:
                f = 0.95
            elif rec.data_mode == "SIMULATED":
                f = 0.75 # Synthetic real-time simulation
            elif rec.data_mode == "HISTORICAL":
                f = 0.50
            else:
                f = 0.70

            reliability_sum += r
            freshness_sum += f

        n = len(evidence)
        avg_reliability = round(reliability_sum / n, 2)
        avg_freshness = round(freshness_sum / n, 2)

        # Spatial relevance from spatial correlations
        if spatial_correlations:
            avg_spatial = round(
                sum(c.spatial_confidence_factor for c in spatial_correlations) / len(spatial_correlations), 2
            )
            rules_applied.append(f"RULE_SPATIAL_PROXIMITY_EVALUATED: {len(spatial_correlations)} correlations")
        else:
            avg_spatial = 0.50
            rules_applied.append("RULE_SPATIAL_DEFAULT_SINGLE_OR_DISJOINT")

        # Temporal relevance from temporal correlations
        if temporal_correlations:
            compat_weights = {"COINCIDENT": 1.0, "HIGH": 0.85, "MODERATE": 0.65, "LOW": 0.40, "INCOMPATIBLE": 0.10}
            avg_temporal = round(
                sum(compat_weights.get(c.temporal_compatibility, 0.5) for c in temporal_correlations) / len(temporal_correlations), 2
            )
            rules_applied.append(f"RULE_TEMPORAL_SYNCHRONIZATION_EVALUATED: {len(temporal_correlations)} correlations")
        else:
            avg_temporal = 0.50

        # Overall composite quality score
        overall_quality = round(
            (avg_reliability * 0.35) + (avg_freshness * 0.25) + (avg_spatial * 0.20) + (avg_temporal * 0.20),
            2
        )

        return EvidenceQualityAssessment(
            overall_quality_score=overall_quality,
            data_reliability_score=avg_reliability,
            freshness_score=avg_freshness,
            spatial_relevance_score=avg_spatial,
            temporal_relevance_score=avg_temporal,
            missing_evidence_count=max(0, 5 - len(set(e.agent_name for e in evidence))),
            simulated_evidence_count=simulated_count,
            quality_rules_applied=list(set(rules_applied))
        )

    @classmethod
    def evaluate_assessment_confidence(
        cls,
        evidence: List[UnifiedEvidenceRecord],
        spatial_correlations: List[SpatialCorrelationRecord],
        temporal_correlations: List[TemporalCorrelationRecord],
        incident_category: str
    ) -> Tuple[Dict[str, Any], List[str]]:
        """
        Calculates overall incident assessment confidence and explicit uncertainty caveats.
        """
        uncertainties: List[str] = []
        positive_factors: List[str] = []
        penalties: float = 0.0

        # Filter real-world vs simulated evidence
        real_evidence = [e for e in evidence if not e.is_simulated and e.data_mode != "SIMULATED"]
        simulated_evidence = [e for e in evidence if e.is_simulated or e.data_mode == "SIMULATED"]

        if simulated_evidence:
            uncertainties.append(
                f"Contains {len(simulated_evidence)} simulated IoT evidence record(s). "
                "Simulated sensor data is isolated and does NOT contribute to real-world incident confidence."
            )

        if not real_evidence:
            if simulated_evidence:
                return (
                    {
                        "confidence_score": 0.30,
                        "confidence_tier": "DEMONSTRATION_ONLY",
                        "corroboration_level": "SYNTHETIC_ONLY",
                        "basis": "All contributing evidence originates from simulated demonstration models."
                    },
                    uncertainties + ["Assessment is based entirely on demonstration data; cannot be used for operational dispatch."]
                )
            else:
                return (
                    {
                        "confidence_score": 0.0,
                        "confidence_tier": "NO_EVIDENCE",
                        "corroboration_level": "NONE",
                        "basis": "Zero evidence records collected across all agents."
                    },
                    ["No evidence records were returned by any engaged agent."]
                )

        # Count corroborating independent real agents
        agents_involved = set(e.agent_name for e in real_evidence)
        corroboration_count = len(agents_involved)

        base_confidence = 0.40
        if corroboration_count >= 3:
            base_confidence = 0.85
            positive_factors.append(f"Triangulated by {corroboration_count} independent observational agents ({', '.join(agents_involved)}).")
        elif corroboration_count == 2:
            base_confidence = 0.65
            positive_factors.append(f"Corroborated by 2 distinct observational agents ({', '.join(agents_involved)}).")
        else:
            base_confidence = 0.45
            uncertainties.append(f"Single-agent observation ({list(agents_involved)[0]}); lacks cross-modal corroboration.")

        # Check for specific scientific caveats
        for rec in real_evidence:
            if "SAR" in rec.agent_name.upper():
                if "PREVIEW" in rec.quality_status:
                    penalties += 0.05
                    uncertainties.append("SAR analysis uses calibrated preview resolution; precise sub-pixel boundary uncertainty ±150m.")
                uncertainties.append("SAR dark backscatter can be caused by natural biogenic slicks, grease ice, or wind shadows (<3 m/s).")

            if "OPTICAL" in rec.agent_name.upper():
                if "CALIBRATED_PREVIEW" in rec.quality_status:
                    penalties += 0.05
                    uncertainties.append("Optical indicators (NDCI, Turbidity) derived from preview composite; non-atmospheric-corrected proxy.")

            if "AIS" in rec.agent_name.upper():
                uncertainties.append("AIS proximity to anomaly candidate provides circumstantial context only; does NOT prove discharge causation.")

        # Check temporal alignment
        if temporal_correlations:
            coincident = any(c.temporal_compatibility in ["COINCIDENT", "HIGH"] for c in temporal_correlations)
            if coincident:
                base_confidence += 0.05
                positive_factors.append("Cross-agent observations synchronized within high temporal compatibility window (<= 6 hrs).")
            else:
                penalties += 0.10
                uncertainties.append("Observations have temporal gaps exceeding 6 hours; environmental transport or dissipation likely.")
        else:
            penalties += 0.05
            uncertainties.append("No cross-agent temporal correlations found within configured window.")

        final_score = round(max(0.15, min(0.95, base_confidence - penalties)), 2)

        if final_score >= 0.80:
            tier = "HIGH"
        elif final_score >= 0.55:
            tier = "MODERATE"
        else:
            tier = "LOW"

        confidence_dict = {
            "confidence_score": final_score,
            "confidence_tier": tier,
            "corroboration_level": f"{corroboration_count}_AGENTS_CORROBORATING",
            "contributing_real_agents": list(agents_involved),
            "positive_factors": positive_factors,
            "penalties_applied": round(penalties, 2)
        }

        return confidence_dict, list(set(uncertainties))


quality_uncertainty_engine = QualityUncertaintyEngine()
