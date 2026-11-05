import math
import logging
from datetime import datetime, timezone
from typing import List, Optional, Tuple, Dict, Any
from app.schemas.orchestration import (
    UnifiedEvidenceRecord,
    TemporalCorrelationRecord,
    TemporalCompatibilityType
)

logger = logging.getLogger("orca.orchestration.temporal")


def parse_to_utc(ts_str: Optional[str]) -> Optional[datetime]:
    """
    Safely parses an ISO 8601 string or date string to a UTC-aware datetime.
    Returns None if the timestamp is missing or malformed.
    """
    if not ts_str or not isinstance(ts_str, str):
        return None
    try:
        clean = ts_str.strip().replace("Z", "+00:00")
        dt = datetime.fromisoformat(clean)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except Exception as e:
        logger.debug(f"Failed to parse timestamp '{ts_str}': {e}")
        return None


def calculate_freshness(obs_time: datetime, now_time: datetime) -> str:
    """
    Classifies the freshness of an observation relative to the current assessment time.
    """
    age_seconds = (now_time - obs_time).total_seconds()
    if age_seconds < 0:
        return "FUTURE_TIMESTAMP_ANOMALOUS"
    age_hours = age_seconds / 3600.0

    if age_hours < 0.5:
        return "REAL_TIME (< 30 min)"
    elif age_hours <= 6.0:
        return "CURRENT (0.5 - 6 hrs)"
    elif age_hours <= 24.0:
        return "RECENT (6 - 24 hrs)"
    elif age_hours <= 72.0:
        return "HISTORICAL (24 - 72 hrs)"
    else:
        return f"STALE ({age_hours:.1f} hrs old)"


class TemporalCorrelationEngine:
    """
    Evaluates temporal synchronization, timestamp validity, observation freshness,
    and hydrodynamic drift transport plausibility between cross-agent evidence.
    """

    @classmethod
    def correlate_evidence(
        cls,
        records: List[UnifiedEvidenceRecord],
        window_hours: float = 24.0,
        current_velocity_m_s: Optional[float] = None,
        current_direction_deg: Optional[float] = None
    ) -> List[TemporalCorrelationRecord]:
        correlations: List[TemporalCorrelationRecord] = []
        now_utc = datetime.now(timezone.utc)
        n = len(records)

        for i in range(n):
            rec_a = records[i]
            dt_a = parse_to_utc(rec_a.observation_timestamp)
            if not dt_a:
                continue
            freshness_a = calculate_freshness(dt_a, now_utc)

            for j in range(i + 1, n):
                rec_b = records[j]
                if rec_a.agent_name == rec_b.agent_name and rec_a.evidence_id == rec_b.evidence_id:
                    continue

                dt_b = parse_to_utc(rec_b.observation_timestamp)
                if not dt_b:
                    continue
                freshness_b = calculate_freshness(dt_b, now_utc)

                diff_seconds = abs((dt_a - dt_b).total_seconds())
                diff_hours = round(diff_seconds / 3600.0, 2)

                # Classify temporal compatibility
                if diff_hours <= 1.0:
                    compat: TemporalCompatibilityType = "COINCIDENT"
                elif diff_hours <= 6.0:
                    compat = "HIGH"
                elif diff_hours <= window_hours:
                    compat = "MODERATE"
                elif diff_hours <= window_hours * 2.0:
                    compat = "LOW"
                else:
                    compat = "INCOMPATIBLE"

                # Calculate hydrodynamic drift displacement if current speed is available
                drift_dict: Optional[Dict[str, Any]] = None
                if current_velocity_m_s is not None and current_velocity_m_s > 0.05:
                    drift_speed_km_h = current_velocity_m_s * 3.6
                    approx_displacement_km = round(drift_speed_km_h * diff_hours, 2)
                    drift_dict = {
                        "ocean_current_speed_m_s": current_velocity_m_s,
                        "ocean_current_speed_km_h": round(drift_speed_km_h, 2),
                        "ocean_current_direction_deg": current_direction_deg,
                        "time_separation_hours": diff_hours,
                        "estimated_passive_drift_distance_km": approx_displacement_km,
                        "hydrodynamic_plausibility_note": (
                            f"Over {diff_hours:.1f} hrs, surface current of {current_velocity_m_s:.2f} m/s "
                            f"could displace a floating surface slick or debris by approximately ~{approx_displacement_km} km. "
                            "Notice: Rough hydrodynamic estimate only; insufficient multi-layer data to compute an exact spill trajectory."
                        )
                    }

                correlations.append(
                    TemporalCorrelationRecord(
                        evidence_id_a=rec_a.evidence_id,
                        evidence_id_b=rec_b.evidence_id,
                        agent_a=rec_a.agent_name,
                        agent_b=rec_b.agent_name,
                        time_difference_hours=diff_hours,
                        applicable_window_hours=window_hours,
                        temporal_compatibility=compat,
                        freshness_status_a=freshness_a,
                        freshness_status_b=freshness_b,
                        drift_analysis=drift_dict
                    )
                )

        return correlations


temporal_correlation_engine = TemporalCorrelationEngine()
