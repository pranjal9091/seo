import json
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.audit import AuditRequest, AuditReport
from app.models.db_models import AuditRecord
from app.crawler.fetcher import fetch_webpage, FetchError
from app.crawler.parser import parse_html_document
from app.auditor.engine import run_audit
from app.storage.db import get_db

router = APIRouter(prefix="/api", tags=["Audit"])

@router.get("/health")
def get_health():
    return {
        "status": "healthy",
        "service": "OmniGEO Intelligence Suite",
        "version": "1.0.0-m1",
        "modules": {
            "module_1_ai_visibility_tracker": "IN PROGRESS (Roadmap)",
            "module_2_technical_aeo_auditor": "ACTIVE (Milestone 1 MVP Complete)",
            "module_3_schema_generator": "IN PROGRESS (Roadmap)",
            "module_4_weekly_reporting_gsc": "IN PROGRESS (Roadmap)",
            "module_5_live_content_site": "IN PROGRESS (Roadmap)"
        }
    }

@router.post("/audit", response_model=AuditReport)
async def perform_audit(request: AuditRequest, db: Session = Depends(get_db)):
    # 1. Safe fetch
    try:
        fetched = await fetch_webpage(request.url)
    except FetchError as fe:
        raise HTTPException(
            status_code=fe.status_code or 400,
            detail={
                "error": "Webpage Fetch Failed",
                "message": fe.message,
                "details": fe.details
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Internal Crawl Error",
                "message": f"Unexpected error while fetching webpage: {str(e)}"
            }
        )

    # 2. Extract Document Features
    try:
        extracted = parse_html_document(fetched)
    except Exception as pe:
        raise HTTPException(
            status_code=500,
            detail={
                "error": "HTML Parse Error",
                "message": f"Failed to extract document features: {str(pe)}"
            }
        )

    # 3. Execute Deterministic Audit Rules
    try:
        report = run_audit(extracted)
    except Exception as ae:
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Audit Execution Error",
                "message": f"Audit rule calculation failed: {str(ae)}"
            }
        )

    # 4. Persist to SQLite
    try:
        record = AuditRecord(
            id=report.id,
            url=report.url,
            timestamp=report.timestamp,
            overall_score=report.overall_score,
            status_code=report.extracted_data.status_code,
            response_time_ms=report.extracted_data.response_time_ms,
            category_scores={k: v.model_dump() for k, v in report.category_scores.items()},
            findings=[f.model_dump() for f in report.findings],
            summary_counts=report.summary_counts,
            extracted_data=report.extracted_data.model_dump()
        )
        db.add(record)
        db.commit()
    except Exception as dbe:
        # DB failure should not prevent returning the live audit report
        print(f"[Warning] Failed to persist audit to DB: {dbe}")
        db.rollback()

    return report

@router.get("/history")
def get_audit_history(limit: int = Query(15, ge=1, le=50), db: Session = Depends(get_db)):
    records = db.query(AuditRecord).order_by(desc(AuditRecord.timestamp)).limit(limit).all()
    history = []
    for r in records:
        history.append({
            "id": r.id,
            "url": r.url,
            "timestamp": r.timestamp.isoformat(),
            "overall_score": r.overall_score,
            "status_code": r.status_code,
            "response_time_ms": r.response_time_ms,
            "summary_counts": r.summary_counts,
        })
    return {"history": history}

@router.get("/audit/{audit_id}")
def get_saved_audit(audit_id: str, db: Session = Depends(get_db)):
    record = db.query(AuditRecord).filter(AuditRecord.id == audit_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Audit record not found")
    
    return {
        "id": record.id,
        "url": record.url,
        "timestamp": record.timestamp.isoformat(),
        "overall_score": record.overall_score,
        "category_scores": record.category_scores,
        "findings": record.findings,
        "extracted_data": record.extracted_data,
        "summary_counts": record.summary_counts,
        "methodology_version": "OmniGEO-Ruleset-v1.0",
        "is_measured_data": True,
        "disclaimer": (
            "This score is a transparent, deterministic rule-based evaluation of technical SEO, "
            "on-page hygiene, schema structure, and AEO answer-readiness. It is NOT a Google "
            "ranking algorithm score or simulated search position."
        )
    }

@router.get("/roadmap")
def get_roadmap():
    return {
        "modules": [
            {
                "id": "module_1",
                "name": "AI Visibility Tracker",
                "status": "IN PROGRESS",
                "description": "Multi-model prompt tracking (Perplexity, Gemini, ChatGPT) for 30-50 search intent queries; citation SOV and benchmark analysis.",
                "milestone": "Milestone 2"
            },
            {
                "id": "module_2",
                "name": "Technical SEO, On-Page & AEO Auditor",
                "status": "ACTIVE / COMPLETE",
                "description": "Rule-based audit engine evaluating crawlability, title/meta, H1 hierarchy, alt tags, direct answer blocks, question headings, and JSON-LD schema.",
                "milestone": "Milestone 1 (Current)"
            },
            {
                "id": "module_3",
                "name": "EdTech Schema Generator & Validator",
                "status": "IN PROGRESS",
                "description": "Dedicated generator for Course, FAQPage, Article, HowTo, and Organization JSON-LD markup.",
                "milestone": "Milestone 3"
            },
            {
                "id": "module_4",
                "name": "Weekly Reporting & GSC Import Engine",
                "status": "IN PROGRESS",
                "description": "Google Search Console real CSV parser (clicks, impressions, CTR, average position) + weekly executive PDF exporter.",
                "milestone": "Milestone 4"
            },
            {
                "id": "module_5",
                "name": "Live EdTech Career Content Hub",
                "status": "IN PROGRESS",
                "description": "5-6 answer-first articles with verified GSC/GA4 measurement hooks targeting B.Tech/upskilling queries.",
                "milestone": "Milestone 5"
            }
        ]
    }
