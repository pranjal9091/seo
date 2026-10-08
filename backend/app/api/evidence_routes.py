from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.storage.db import get_db
from app.models.db_models import EvidenceRecord

router = APIRouter(prefix="/api/evidence", tags=["Provenance & Evidence Tracker"])

class EvidenceItemSchema(BaseModel):
    category: str = Field(..., description="deployment, gsc, ga4, ai_visibility, content, schema")
    claim: str
    status: str = Field(default="pending", description="verified, pending, not_verified")
    source: Optional[str] = None
    evidence_url: Optional[str] = None
    evidence_note: Optional[str] = None

class EvidenceUpdateSchema(BaseModel):
    status: Optional[str] = Field(None, description="verified, pending, not_verified")
    source: Optional[str] = None
    evidence_url: Optional[str] = None
    evidence_note: Optional[str] = None

DEFAULT_EVIDENCE_RECORDS = [
    {
        "category": "deployment",
        "claim": "Production backend & frontend deployed with stable public URL",
        "status": "pending",
        "source": "Vercel / Render",
        "evidence_url": None,
        "evidence_note": "Local development verified. Ready for deployment with configured environment variables."
    },
    {
        "category": "gsc",
        "claim": "Google Search Console property ownership verified",
        "status": "pending",
        "source": "Google Search Console",
        "evidence_url": None,
        "evidence_note": "Awaiting domain DNS / HTML tag verification by site administrator."
    },
    {
        "category": "gsc",
        "claim": "Production sitemap.xml submitted to Search Console",
        "status": "pending",
        "source": "GSC Sitemaps",
        "evidence_url": None,
        "evidence_note": "Sitemap endpoint verified. Submittable to GSC upon domain live."
    },
    {
        "category": "gsc",
        "claim": "First article URL indexed and inspected in Google Search Console",
        "status": "pending",
        "source": "GSC URL Inspection",
        "evidence_url": None,
        "evidence_note": "Requires live production domain and inspection execution. Never claim indexing without GSC evidence."
    },
    {
        "category": "ga4",
        "claim": "Real GA4 Measurement ID configured in production environment",
        "status": "pending",
        "source": "Google Analytics 4",
        "evidence_url": None,
        "evidence_note": "VITE_GA4_MEASUREMENT_ID empty in local test; tracker safely dormant."
    },
    {
        "category": "ga4",
        "claim": "Realtime event dispatch verified in GA4 DebugView",
        "status": "pending",
        "source": "GA4 Realtime",
        "evidence_url": None,
        "evidence_note": "Requires valid G-XXXXXXXXXX stream ID and live browser session."
    },
    {
        "category": "ai_visibility",
        "claim": "36-query EdTech benchmark monitored with live provider APIs",
        "status": "pending",
        "source": "OpenAI / Gemini / Perplexity API",
        "evidence_url": None,
        "evidence_note": "Manual observation import verified; live API runs require API key configuration."
    },
    {
        "category": "ai_visibility",
        "claim": "Zero simulated or fake AI visibility claims reported",
        "status": "verified",
        "source": "OmniGEO Core Engine",
        "evidence_url": None,
        "evidence_note": "Strict distinction enforced: SAMPLE / DEMO badges vs MEASURED observations."
    },
    {
        "category": "content",
        "claim": "6 answer-first articles pass deterministic technical SEO audit",
        "status": "verified",
        "source": "OmniGEO SEO Auditor",
        "evidence_url": "/api/seo/audit",
        "evidence_note": "All 6 articles contain direct answer blocks, valid headings, internal links, and Schema.org Article JSON-LD."
    },
    {
        "category": "schema",
        "claim": "Zero localhost leakage in production sitemap and robots.txt",
        "status": "verified",
        "source": "Production QA Script",
        "evidence_url": "/sitemap.xml",
        "evidence_note": "Dynamic canonical URL resolver prevents localhost leakage in production."
    }
]

def seed_default_evidence(db: Session):
    count = db.query(EvidenceRecord).count()
    if count == 0:
        for item in DEFAULT_EVIDENCE_RECORDS:
            rec = EvidenceRecord(
                id=str(uuid.uuid4()),
                category=item["category"],
                claim=item["claim"],
                status=item["status"],
                source=item.get("source"),
                evidence_url=item.get("evidence_url"),
                evidence_note=item.get("evidence_note"),
                captured_at=datetime.now(timezone.utc)
            )
            db.add(rec)
        db.commit()

@router.get("")
def list_evidence_records(
    category: Optional[str] = None,
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    """
    Returns all evidence provenance records. Auto-seeds defaults if empty.
    """
    seed_default_evidence(db)
    query = db.query(EvidenceRecord)
    if category:
        query = query.filter(EvidenceRecord.category == category)
    records = query.order_by(EvidenceRecord.captured_at.asc()).all()

    return [
        {
            "id": r.id,
            "category": r.category,
            "claim": r.claim,
            "status": r.status,
            "source": r.source,
            "evidence_url": r.evidence_url,
            "evidence_note": r.evidence_note,
            "captured_at": r.captured_at.isoformat() if r.captured_at else None
        }
        for r in records
    ]

@router.post("")
def create_evidence_record(
    payload: EvidenceItemSchema,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Adds a new manual or automated evidence record.
    """
    rec = EvidenceRecord(
        id=str(uuid.uuid4()),
        category=payload.category,
        claim=payload.claim,
        status=payload.status,
        source=payload.source,
        evidence_url=payload.evidence_url,
        evidence_note=payload.evidence_note,
        captured_at=datetime.now(timezone.utc)
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return {"status": "created", "id": rec.id}

@router.patch("/{record_id}")
def update_evidence_record(
    record_id: str,
    payload: EvidenceUpdateSchema,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Updates an evidence record's verification status, evidence link, or notes.
    """
    rec = db.query(EvidenceRecord).filter(EvidenceRecord.id == record_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Evidence record not found")

    if payload.status is not None:
        if payload.status not in ["verified", "pending", "not_verified"]:
            raise HTTPException(status_code=400, detail="Status must be verified, pending, or not_verified")
        rec.status = payload.status
    if payload.source is not None:
        rec.source = payload.source
    if payload.evidence_url is not None:
        rec.evidence_url = payload.evidence_url
    if payload.evidence_note is not None:
        rec.evidence_note = payload.evidence_note

    db.commit()
    db.refresh(rec)
    return {"status": "updated", "id": rec.id, "record_status": rec.status}

@router.delete("/{record_id}")
def delete_evidence_record(
    record_id: str,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    rec = db.query(EvidenceRecord).filter(EvidenceRecord.id == record_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Evidence record not found")
    db.delete(rec)
    db.commit()
    return {"status": "deleted", "id": record_id}
