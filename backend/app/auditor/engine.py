import uuid
from datetime import datetime, timezone
from typing import Dict, List
from app.models.audit import (
    ExtractedWebpageData, AuditReport, CategoryScore,
    AuditFinding, RuleCheckResult, SeverityLevel
)
from app.auditor.categories.technical import audit_technical
from app.auditor.categories.onpage import audit_onpage
from app.auditor.categories.aeo import audit_aeo
from app.auditor.categories.schema import audit_schema

SEVERITY_ORDER: Dict[SeverityLevel, int] = {
    "critical": 0,
    "high": 1,
    "medium": 2,
    "low": 3,
}

def run_audit(data: ExtractedWebpageData) -> AuditReport:
    # 1. Evaluate categories
    tech_checks, tech_findings = audit_technical(data)
    onpage_checks, onpage_findings = audit_onpage(data)
    aeo_checks, aeo_findings = audit_aeo(data)
    schema_checks, schema_findings = audit_schema(data)

    # 2. Build Category Scores
    def build_category_score(cat_name: str, label: str, max_points: float, checks: List[RuleCheckResult]) -> CategoryScore:
        earned = sum(c.earned_points for c in checks)
        pct = round((earned / max_points) * 100, 1) if max_points > 0 else 0.0
        return CategoryScore(
            category=cat_name,  # type: ignore
            label=label,
            earned=round(earned, 1),
            max_score=round(max_points, 1),
            percentage=pct,
            checks=checks
        )

    cat_scores: Dict[str, CategoryScore] = {
        "technical": build_category_score("technical", "Technical Foundation", 25.0, tech_checks),
        "onpage": build_category_score("onpage", "On-Page & Architecture", 25.0, onpage_checks),
        "aeo": build_category_score("aeo", "AEO & Answer Readiness", 30.0, aeo_checks),
        "schema": build_category_score("schema", "Structured Data & Knowledge Graph", 20.0, schema_checks),
    }

    # 3. Overall 0-100 score
    total_earned = sum(c.earned for c in cat_scores.values())
    overall_score = int(round(total_earned))
    overall_score = max(0, min(100, overall_score))

    # 4. Consolidate and sort findings by severity
    all_findings = tech_findings + onpage_findings + aeo_findings + schema_findings
    all_findings.sort(key=lambda f: SEVERITY_ORDER.get(f.severity, 99))

    # 5. Counts summary
    all_checks = tech_checks + onpage_checks + aeo_checks + schema_checks
    summary_counts = {
        "critical": sum(1 for f in all_findings if f.severity == "critical"),
        "high": sum(1 for f in all_findings if f.severity == "high"),
        "medium": sum(1 for f in all_findings if f.severity == "medium"),
        "low": sum(1 for f in all_findings if f.severity == "low"),
        "total_issues": len(all_findings),
        "passed_checks": sum(1 for c in all_checks if c.passed),
        "total_checks": len(all_checks),
    }

    report_id = f"aud_{uuid.uuid4().hex[:12]}"

    return AuditReport(
        id=report_id,
        url=data.final_url,
        timestamp=datetime.now(timezone.utc),
        overall_score=overall_score,
        category_scores=cat_scores,
        findings=all_findings,
        extracted_data=data,
        summary_counts=summary_counts,
        methodology_version="OmniGEO-Ruleset-v1.0",
        is_measured_data=True
    )
