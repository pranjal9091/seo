from typing import List, Tuple, Optional
from app.models.audit import AuditFinding, RuleCheckResult, SeverityLevel, CategoryType

def create_finding(
    fid: str,
    severity: SeverityLevel,
    category: CategoryType,
    title: str,
    problem: str,
    evidence: str,
    why_it_matters: str,
    recommendation: str
) -> AuditFinding:
    return AuditFinding(
        id=fid,
        severity=severity,
        category=category,
        title=title,
        problem=problem,
        evidence=evidence,
        why_it_matters=why_it_matters,
        recommendation=recommendation
    )

def create_check(
    rule_id: str,
    title: str,
    earned: float,
    max_pts: float,
    explanation: str
) -> RuleCheckResult:
    return RuleCheckResult(
        rule_id=rule_id,
        title=title,
        earned_points=round(earned, 1),
        max_points=round(max_pts, 1),
        passed=(earned >= max_pts * 0.8),
        explanation=explanation
    )
