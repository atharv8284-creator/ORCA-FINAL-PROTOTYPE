import math
from typing import List, Optional, Tuple, Dict, Any
from app.schemas.orchestration import (
    UnifiedEvidenceRecord,
    SpatialCorrelationRecord,
    SpatialRelationshipType
)


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculates great-circle distance between two geographic coordinates using the Haversine formula.
    """
    radius = 6371.0 # Earth's radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2.0) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(radius * c, 3)


def point_in_bbox(lat: float, lon: float, bbox: List[float]) -> bool:
    """
    Checks if a point (lat, lon) is strictly within a bounding box [min_lon, min_lat, max_lon, max_lat].
    """
    if len(bbox) < 4:
        return False
    min_lon, min_lat, max_lon, max_lat = bbox[:4]
    return min_lat <= lat <= max_lat and min_lon <= lon <= max_lon


def get_record_coordinates(record: UnifiedEvidenceRecord) -> Optional[Tuple[float, float]]:
    """
    Extracts a representative coordinate (lat, lon) from an evidence record.
    If point is missing, attempts to extract from spatial_coverage centroid.
    """
    if record.latitude is not None and record.longitude is not None:
        return (record.latitude, record.longitude)

    if record.spatial_coverage:
        cov = record.spatial_coverage
        if "bbox" in cov and isinstance(cov["bbox"], list) and len(cov["bbox"]) >= 4:
            b = cov["bbox"]
            return ((b[1] + b[3]) / 2.0, (b[0] + b[2]) / 2.0)
        if "centroid" in cov and isinstance(cov["centroid"], list) and len(cov["centroid"]) >= 2:
            return (cov["centroid"][1], cov["centroid"][0])
        if "coordinates" in cov and isinstance(cov["coordinates"], list) and len(cov["coordinates"]) >= 2:
            return (cov["coordinates"][1], cov["coordinates"][0])

    return None


class SpatialCorrelationEngine:
    """
    Evaluates geographic proximity and spatial overlap between cross-agent evidence records.
    Strictly adheres to the scientific principle that spatial proximity is supporting context,
    NEVER proof of causation.
    """

    @classmethod
    def correlate_evidence(
        cls,
        records: List[UnifiedEvidenceRecord],
        max_radius_km: float = 25.0
    ) -> List[SpatialCorrelationRecord]:
        correlations: List[SpatialCorrelationRecord] = []
        n = len(records)

        for i in range(n):
            rec_a = records[i]
            coords_a = get_record_coordinates(rec_a)
            if not coords_a:
                continue

            for j in range(i + 1, n):
                rec_b = records[j]
                # Only correlate across distinct agents or distinct sensors
                if rec_a.agent_name == rec_b.agent_name and rec_a.evidence_id == rec_b.evidence_id:
                    continue

                coords_b = get_record_coordinates(rec_b)
                if not coords_b:
                    continue

                lat1, lon1 = coords_a
                lat2, lon2 = coords_b
                dist_km = haversine_distance_km(lat1, lon1, lat2, lon2)

                # Check if one falls inside the other's footprint
                is_overlap = False
                if rec_b.spatial_coverage and "bbox" in rec_b.spatial_coverage:
                    is_overlap = point_in_bbox(lat1, lon1, rec_b.spatial_coverage["bbox"])
                if not is_overlap and rec_a.spatial_coverage and "bbox" in rec_a.spatial_coverage:
                    is_overlap = point_in_bbox(lat2, lon2, rec_a.spatial_coverage["bbox"])

                # Determine spatial relationship
                if is_overlap or dist_km == 0.0:
                    relationship: SpatialRelationshipType = "INTERSECTS"
                    confidence_factor = 0.95
                    summary = f"Geographic footprint overlap: {rec_a.agent_name} and {rec_b.agent_name} coincide."
                elif dist_km <= 5.0:
                    relationship = "WITHIN_IMMEDIATE_PROXIMITY"
                    confidence_factor = round(max(0.70, 0.90 - (dist_km / 5.0) * 0.20), 2)
                    summary = f"Immediate spatial proximity: {dist_km:.2f} km separation between observations."
                elif dist_km <= max_radius_km:
                    relationship = "WITHIN_LOCAL_AREA"
                    confidence_factor = round(max(0.40, 0.70 - ((dist_km - 5.0) / (max_radius_km - 5.0)) * 0.30), 2)
                    summary = f"Local marine area proximity: {dist_km:.2f} km separation within configured {max_radius_km} km radius."
                elif dist_km <= 100.0:
                    relationship = "DISTANT"
                    confidence_factor = 0.20
                    summary = f"Distant observations: {dist_km:.2f} km separation (exceeds {max_radius_km} km radius)."
                else:
                    relationship = "DISJOINT"
                    confidence_factor = 0.05
                    summary = f"Disjoint geographic sectors: {dist_km:.2f} km separation."

                correlations.append(
                    SpatialCorrelationRecord(
                        evidence_id_a=rec_a.evidence_id,
                        evidence_id_b=rec_b.evidence_id,
                        agent_a=rec_a.agent_name,
                        agent_b=rec_b.agent_name,
                        distance_km=dist_km,
                        spatial_relationship=relationship,
                        correlation_radius_km=max_radius_km,
                        proximity_summary=summary,
                        spatial_confidence_factor=confidence_factor
                    )
                )

        return correlations


spatial_correlation_engine = SpatialCorrelationEngine()
