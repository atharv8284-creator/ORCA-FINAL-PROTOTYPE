import logging
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Query, Response
from app.schemas.orchestration import (
    MultiAgentInvestigationRequest,
    FinalMarineIntelligenceAssessment,
    OrchestrationStatusResponse,
    OrchestrationHistoryResponse,
    UnifiedEvidenceRecord
)
from app.services.orchestration.orchestrator import lead_orchestrator
from app.services.orchestration.storage import orchestration_storage

logger = logging.getLogger("orca.api.orchestration")
router = APIRouter()


@router.post(
    "/investigate",
    response_model=FinalMarineIntelligenceAssessment,
    summary="Trigger central multi-agent marine intelligence investigation"
)
async def start_multi_agent_investigation(
    req: MultiAgentInvestigationRequest
) -> FinalMarineIntelligenceAssessment:
    """
    Initiates an evidence-based multi-agent investigation across all enabled agents
    (SAR, Optical, Oceanographic, AIS, and IoT), running spatial and temporal
    correlation engines, quality assessment, and Nugen neural deliberation.
    """
    try:
        assessment = await lead_orchestrator.investigate(req)
        return assessment
    except Exception as e:
        logger.error(f"Multi-agent investigation failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Orchestration engine failure: {str(e)}"
        )


@router.get(
    "/status/{assessment_id}",
    response_model=OrchestrationStatusResponse,
    summary="Get status and agent lifecycle summary for an assessment"
)
def get_investigation_status(assessment_id: str) -> OrchestrationStatusResponse:
    """
    Returns real-time or historical execution status for each individual agent.
    """
    # Check active task first
    active = lead_orchestrator.active_tasks.get(assessment_id)
    if active:
        agent_st = active.get("agent_statuses", {})
        done_cnt = sum(1 for s in agent_st.values() if s in ["SUCCESS", "FAILED", "SKIPPED"])
        return OrchestrationStatusResponse(
            assessment_id=assessment_id,
            status=active.get("status", "RUNNING"),
            total_agents=len(agent_st),
            completed_agents=done_cnt,
            agent_statuses=agent_st,
            elapsed_time_ms=0.0,
            incident_category=None,
            generated_at=active.get("started_at", "")
        )

    # Check persisted assessment
    assessment = orchestration_storage.get_assessment(assessment_id)
    if not assessment:
        raise HTTPException(status_code=404, detail=f"Assessment {assessment_id} not found.")

    agent_st = assessment.agent_statuses
    done_cnt = sum(1 for s in agent_st.values() if s in ["SUCCESS", "FAILED", "SKIPPED"])
    total_time = sum(assessment.agent_execution_times_ms.values()) if assessment.agent_execution_times_ms else 0.0

    return OrchestrationStatusResponse(
        assessment_id=assessment_id,
        status="COMPLETED" if assessment.status in ["COMPLETED", "PARTIAL"] else "FAILED",
        total_agents=len(agent_st),
        completed_agents=done_cnt,
        agent_statuses=agent_st,
        elapsed_time_ms=round(total_time, 2),
        incident_category=assessment.incident_category,
        generated_at=assessment.generated_at
    )


@router.get(
    "/assessment/{assessment_id}",
    response_model=FinalMarineIntelligenceAssessment,
    summary="Get complete synthesized marine intelligence assessment"
)
def get_assessment_by_id(assessment_id: str) -> FinalMarineIntelligenceAssessment:
    """
    Returns the full structured assessment including normalized evidence, spatial
    and temporal correlations, confidence, uncertainty, and Nugen reasoning.
    """
    assessment = orchestration_storage.get_assessment(assessment_id)
    if not assessment:
        raise HTTPException(status_code=404, detail=f"Assessment {assessment_id} not found.")
    return assessment


@router.get(
    "/evidence/{assessment_id}",
    summary="Inspect normalized evidence and provenance for an assessment"
)
def get_assessment_evidence(assessment_id: str) -> Dict[str, Any]:
    """
    Returns the complete list of normalized evidence records, data tier breakdown,
    and upstream provenance for an assessment.
    """
    assessment = orchestration_storage.get_assessment(assessment_id)
    if not assessment:
        raise HTTPException(status_code=404, detail=f"Assessment {assessment_id} not found.")

    return {
        "assessment_id": assessment.assessment_id,
        "total_records": len(assessment.evidence_summary),
        "data_mode_summary": assessment.data_mode_summary,
        "data_quality": assessment.data_quality.model_dump(),
        "evidence": [e.model_dump() for e in assessment.evidence_summary]
    }


@router.get(
    "/history",
    response_model=OrchestrationHistoryResponse,
    summary="List past synthesized multi-agent assessments"
)
def get_orchestration_history(limit: int = Query(25, ge=1, le=100)) -> OrchestrationHistoryResponse:
    """
    Retrieves chronological history of multi-agent investigations.
    """
    assessments = orchestration_storage.list_assessments(limit=limit)
    return OrchestrationHistoryResponse(
        total_assessments=len(assessments),
        assessments=assessments
    )


@router.get(
    "/export/{assessment_id}",
    summary="Export complete intelligence assessment as formatted report"
)
def export_assessment_report(
    assessment_id: str,
    format: str = Query("markdown", pattern="^(markdown|json)$")
):
    """
    Exports formal intelligence report with ORCA headers, data provenance,
    correlation matrices, Nugen neural deliberation, and scientific disclosures.
    """
    assessment = orchestration_storage.get_assessment(assessment_id)
    if not assessment:
        raise HTTPException(status_code=404, detail=f"Assessment {assessment_id} not found.")

    if format == "json":
        return assessment.model_dump()

    # Generate professional Markdown report
    lines = [
        f"# ORCA Marine Ecosystem Intelligence",
        f"## Multi-Agent Intelligence Assessment Report: {assessment.assessment_id}",
        f"**Incident Category:** {assessment.incident_category} • **Status:** {assessment.status}",
        f"**Generated UTC:** {assessment.generated_at} • **Assessment Label:** {assessment.assessment_label}",
        f"",
        f"---",
        f"",
        f"### 1. Geographic Context & Target Biome",
        f"- **Marine Zone:** {assessment.geographic_area.get('zone_name')} (ID: {assessment.geographic_area.get('zone_id')})",
        f"- **Coordinates Centroid:** {assessment.geographic_area.get('centroid_latitude')}°, {assessment.geographic_area.get('centroid_longitude')}°",
        f"- **Observation Window:** {assessment.observation_period.get('earliest_observation')} to {assessment.observation_period.get('latest_observation')}",
        f"",
        f"### 2. Multi-Agent Swarm Contributions",
        f"| Agent | Execution Status | Latency (ms) |",
        f"| :--- | :--- | :--- |",
    ]
    for agent, status in assessment.agent_statuses.items():
        ms = assessment.agent_execution_times_ms.get(agent, 0.0)
        lines.append(f"| {agent} | {status} | {ms:.1f} ms |")

    lines.extend([
        f"",
        f"### 3. Synthesized Evidence Summary ({len(assessment.evidence_summary)} Records)",
        f"| Evidence ID | Reporting Agent | Observation | Measurement / Value | Tier | Quality |",
        f"| :--- | :--- | :--- | :--- | :--- | :--- |",
    ])
    for e in assessment.evidence_summary:
        val_str = str(e.value)
        if len(val_str) > 40:
            val_str = val_str[:37] + "..."
        lines.append(f"| {e.evidence_id} | {e.agent_name} | {e.measurement_or_indicator} | {val_str} {e.unit} | {e.data_mode} | {e.quality_status} |")

    lines.extend([
        f"",
        f"### 4. Cross-Modal Correlations",
        f"- **Spatial Correlations Found:** {len(assessment.spatial_correlations)}",
    ])
    for sc in assessment.spatial_correlations:
        lines.append(f"  - **{sc.agent_a} ↔ {sc.agent_b}**: {sc.distance_km:.2f} km separation ({sc.spatial_relationship}) — *{sc.proximity_summary}*")

    lines.extend([
        f"- **Temporal Correlations Found:** {len(assessment.temporal_correlations)}",
    ])
    for tc in assessment.temporal_correlations:
        lines.append(f"  - **{tc.agent_a} ↔ {tc.agent_b}**: Δt = {tc.time_difference_hours:.1f} hrs ({tc.temporal_compatibility})")

    lines.extend([
        f"",
        f"### 5. Nugen Neural Deliberation & Hypothesis",
        f"- **Inference Mode:** {assessment.nugen_reasoning.get('inference_mode', 'NUGEN_NEURAL_REASONING')}",
        f"- **Observation:** {assessment.nugen_reasoning.get('observation', 'N/A')}",
        f"- **Hypothesis:** {assessment.nugen_reasoning.get('hypothesis', 'N/A')}",
        f"- **Consensus Action:** {assessment.nugen_reasoning.get('consensus_action', 'N/A')}",
        f"",
        f"### 6. Evidence Quality & Assessment Confidence",
        f"- **Overall Quality Score:** {assessment.data_quality.overall_quality_score:.2f} / 1.0",
        f"- **Assessment Confidence Score:** {assessment.confidence.get('confidence_score', 0.0) * 100:.0f}% ({assessment.confidence.get('confidence_tier')})",
        f"- **Corroboration Level:** {assessment.confidence.get('corroboration_level')}",
        f"",
        f"### 7. Explicit Uncertainty & Alternative Explanations",
        f"**Scientific Caveats:**",
    ])
    for u in assessment.uncertainty:
        lines.append(f"- ⚠️ {u}")

    lines.append(f"\n**Plausible Alternative Explanations:**")
    for alt in assessment.alternative_explanations:
        lines.append(f"- {alt}")

    lines.append(f"\n### 8. Recommended Operational Follow-up")
    for rec in assessment.recommended_follow_up:
        lines.append(f"1. {rec}")

    lines.extend([
        f"",
        f"---",
        f"*Report generated by ORCA Lead Orchestrator v1.0.0 • Indradhanu Hackathon 2026*"
    ])

    report_content = "\n".join(lines)
    return Response(
        content=report_content,
        media_type="text/markdown",
        headers={"Content-Disposition": f"attachment; filename=ORCA-REPORT-{assessment_id}.md"}
    )
