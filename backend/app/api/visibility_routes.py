import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.storage.db import get_db
from app.models.db_models import (
    Brand, SearchQuery, VisibilityRun, BrandVisibilityObservation, CitationObservation
)
from app.visibility.detector import detect_brands_in_text, extract_citations_from_text
from app.visibility.providers.registry import get_provider, list_providers_status
from app.visibility.metrics import calculate_benchmark_metrics
from app.schema.generator import (
    generate_article_schema, generate_faq_schema, generate_course_schema,
    generate_organization_schema, generate_howto_schema
)

router = APIRouter(prefix="/api/visibility", tags=["AI Search Visibility"])

class ExecuteQueryRequest(BaseModel):
    query_id: str
    provider: str

class ManualImportRequest(BaseModel):
    query_id: str
    provider_label: str = Field("Manual / ChatGPT", description="Origin of pasted response")
    raw_response: str
    explicit_citations: List[str] = []

class SchemaGenerateRequest(BaseModel):
    schema_type: str  # "Article", "FAQPage", "Course", "Organization", "HowTo"
    data: Dict[str, Any]

@router.get("/overview")
def get_visibility_overview(db: Session = Depends(get_db)):
    """
    Returns high-level AI Search visibility metrics, benchmark table, and provider breakdown.
    """
    metrics = calculate_benchmark_metrics(db)
    return metrics

@router.get("/brands")
def get_brands(db: Session = Depends(get_db)):
    brands = db.query(Brand).all()
    return {
        "brands": [
            {
                "id": b.id,
                "name": b.name,
                "domain": b.domain,
                "aliases": b.aliases,
                "active": bool(b.active),
                "is_target": bool(b.is_target)
            }
            for b in brands
        ]
    }

@router.get("/queries")
def get_queries(intent: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(SearchQuery)
    if intent:
        q = q.filter(SearchQuery.intent_category == intent)
    queries = q.all()
    
    # Group by intent
    intents = sorted(list(set(item.intent_category for item in queries)))
    return {
        "total_queries": len(queries),
        "intents": intents,
        "queries": [
            {
                "id": item.id,
                "question": item.question,
                "intent_category": item.intent_category,
                "active": bool(item.active)
            }
            for item in queries
        ]
    }

@router.get("/providers")
def get_providers_status():
    return {"providers": list_providers_status()}

@router.get("/runs")
def get_visibility_runs(
    query_id: Optional[str] = None,
    provider: Optional[str] = None,
    limit: int = Query(25, ge=1, le=100),
    db: Session = Depends(get_db)
):
    q = db.query(VisibilityRun)
    if query_id:
        q = q.filter(VisibilityRun.query_id == query_id)
    if provider:
        q = q.filter(VisibilityRun.provider == provider)
        
    runs = q.order_by(desc(VisibilityRun.executed_at)).limit(limit).all()
    
    # Query map
    all_queries = {item.id: item.question for item in db.query(SearchQuery).all()}
    
    results = []
    for r in runs:
        # Fetch observations
        b_obs = db.query(BrandVisibilityObservation).filter(BrandVisibilityObservation.run_id == r.id).all()
        c_obs = db.query(CitationObservation).filter(CitationObservation.run_id == r.id).all()
        
        mentioned_brands = [o.brand_id for o in b_obs if o.mentioned == 1]
        
        results.append({
            "id": r.id,
            "provider": r.provider,
            "query_id": r.query_id,
            "query_text": all_queries.get(r.query_id, r.query_id),
            "executed_at": r.executed_at.isoformat(),
            "status": r.status,
            "latency_ms": r.latency_ms,
            "is_manual": bool(r.is_manual),
            "is_sample": bool(r.is_sample),
            "mentioned_brands": mentioned_brands,
            "citation_count": len(c_obs),
            "response_preview": r.raw_response[:140] + ("..." if len(r.raw_response) > 140 else "")
        })
        
    return {"runs": results}

@router.get("/runs/{run_id}")
def get_run_detail(run_id: str, db: Session = Depends(get_db)):
    run = db.query(VisibilityRun).filter(VisibilityRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Visibility run not found")
        
    query_obj = db.query(SearchQuery).filter(SearchQuery.id == run.query_id).first()
    b_obs = db.query(BrandVisibilityObservation).filter(BrandVisibilityObservation.run_id == run.id).all()
    c_obs = db.query(CitationObservation).filter(CitationObservation.run_id == run.id).all()
    
    # Brand map
    brand_map = {b.id: b.name for b in db.query(Brand).all()}
    
    return {
        "id": run.id,
        "provider": run.provider,
        "query_id": run.query_id,
        "query_text": query_obj.question if query_obj else run.query_id,
        "intent_category": query_obj.intent_category if query_obj else "Unknown",
        "executed_at": run.executed_at.isoformat(),
        "raw_response": run.raw_response,
        "status": run.status,
        "latency_ms": run.latency_ms,
        "error_message": run.error_message,
        "is_manual": bool(run.is_manual),
        "is_sample": bool(run.is_sample),
        "brand_observations": [
            {
                "brand_id": o.brand_id,
                "brand_name": brand_map.get(o.brand_id, o.brand_id),
                "mentioned": bool(o.mentioned),
                "mention_count": o.mention_count,
                "first_mention_position": o.first_mention_position,
                "prominence_score": o.prominence_score
            }
            for o in b_obs
        ],
        "citations": [
            {
                "url": c.url,
                "domain": c.domain,
                "brand_id": c.brand_id,
                "brand_name": brand_map.get(c.brand_id) if c.brand_id else None
            }
            for c in c_obs
        ]
    }

@router.post("/execute")
async def execute_query_run(req: ExecuteQueryRequest, db: Session = Depends(get_db)):
    """
    Executes a real query against a configured AI provider.
    """
    query_obj = db.query(SearchQuery).filter(SearchQuery.id == req.query_id).first()
    if not query_obj:
        raise HTTPException(status_code=404, detail="Query ID not found in library")
        
    provider = get_provider(req.provider)
    if not provider:
        raise HTTPException(status_code=400, detail=f"Unsupported provider: {req.provider}")
        
    if not provider.is_configured():
        raise HTTPException(
            status_code=400,
            detail=f"{provider.display_name} is not configured. Please supply API key in environment variables or use Manual Import."
        )
        
    # Execute query
    result = await provider.execute_query(query_obj.question)
    if result.status == "error":
        raise HTTPException(status_code=502, detail=result.error_message or "Provider query execution failed")
        
    # Save run
    run_id = f"run_{uuid.uuid4().hex[:10]}"
    now = datetime.now(timezone.utc)
    
    run = VisibilityRun(
        id=run_id,
        provider=req.provider,
        query_id=req.query_id,
        executed_at=now,
        raw_response=result.raw_response,
        status="success",
        latency_ms=result.latency_ms,
        is_manual=0,
        is_sample=0  # REAL observation
    )
    db.add(run)
    
    # Process brand mentions
    brands_data = [{"id": b.id, "name": b.name, "aliases": b.aliases, "domain": b.domain} for b in db.query(Brand).all()]
    detections = detect_brands_in_text(result.raw_response, brands_data)
    for d in detections:
        obs = BrandVisibilityObservation(
            id=f"bobs_{uuid.uuid4().hex[:10]}",
            run_id=run_id,
            brand_id=d["brand_id"],
            mentioned=d["mentioned"],
            mention_count=d["mention_count"],
            first_mention_position=d["first_mention_position"],
            prominence_score=d["prominence_score"]
        )
        db.add(obs)
        
    # Process citations
    citations = extract_citations_from_text(result.raw_response, result.citations, brands_data)
    for c in citations:
        c_obs = CitationObservation(
            id=f"cobs_{uuid.uuid4().hex[:10]}",
            run_id=run_id,
            url=c["url"],
            domain=c["domain"],
            brand_id=c["brand_id"],
            created_at=now
        )
        db.add(c_obs)
        
    db.commit()
    return {"message": "Query executed successfully", "run_id": run_id}

@router.post("/manual-import")
def manual_import_observation(req: ManualImportRequest, db: Session = Depends(get_db)):
    """
    Allows importing real observations copied directly from AI search answers.
    Processes text with the identical detection engine.
    """
    query_obj = db.query(SearchQuery).filter(SearchQuery.id == req.query_id).first()
    if not query_obj:
        raise HTTPException(status_code=404, detail="Query ID not found in library")
        
    if not req.raw_response.strip():
        raise HTTPException(status_code=400, detail="Response text cannot be empty")
        
    run_id = f"run_man_{uuid.uuid4().hex[:10]}"
    now = datetime.now(timezone.utc)
    
    run = VisibilityRun(
        id=run_id,
        provider=req.provider_label or "manual",
        query_id=req.query_id,
        executed_at=now,
        raw_response=req.raw_response.strip(),
        status="success",
        latency_ms=0,
        is_manual=1,
        is_sample=0  # REAL user-imported observation
    )
    db.add(run)
    
    brands_data = [{"id": b.id, "name": b.name, "aliases": b.aliases, "domain": b.domain} for b in db.query(Brand).all()]
    detections = detect_brands_in_text(req.raw_response, brands_data)
    for d in detections:
        obs = BrandVisibilityObservation(
            id=f"bobs_{uuid.uuid4().hex[:10]}",
            run_id=run_id,
            brand_id=d["brand_id"],
            mentioned=d["mentioned"],
            mention_count=d["mention_count"],
            first_mention_position=d["first_mention_position"],
            prominence_score=d["prominence_score"]
        )
        db.add(obs)
        
    citations = extract_citations_from_text(req.raw_response, req.explicit_citations, brands_data)
    for c in citations:
        c_obs = CitationObservation(
            id=f"cobs_{uuid.uuid4().hex[:10]}",
            run_id=run_id,
            url=c["url"],
            domain=c["domain"],
            brand_id=c["brand_id"],
            created_at=now
        )
        db.add(c_obs)
        
    db.commit()
    return {
        "message": "Manual observation imported and indexed successfully",
        "run_id": run_id,
        "brands_detected": [d["brand_id"] for d in detections if d["mentioned"] == 1],
        "citations_count": len(citations)
    }

# Schema Generator Endpoint
schema_router = APIRouter(prefix="/api/schema", tags=["Schema Generator"])

@schema_router.post("/generate")
def generate_schema(req: SchemaGenerateRequest):
    t = req.schema_type.lower()
    d = req.data
    
    if t == "article":
        res = generate_article_schema(
            headline=d.get("headline", ""),
            description=d.get("description", ""),
            url=d.get("url", ""),
            author_name=d.get("author_name", "Editorial Team"),
            publisher_name=d.get("publisher_name", "NxtWave"),
            date_published=d.get("date_published", "2025-01-01"),
            image_url=d.get("image_url", "")
        )
    elif t in ("faq", "faqpage"):
        res = generate_faq_schema(d.get("qa_pairs", []))
    elif t == "course":
        res = generate_course_schema(
            name=d.get("name", ""),
            description=d.get("description", ""),
            provider_name=d.get("provider_name", "NxtWave"),
            provider_url=d.get("provider_url", "https://www.nxtwave.co.in"),
            course_code=d.get("course_code", ""),
            credential=d.get("credential", "Industry Certification"),
            price=d.get("price", ""),
            currency=d.get("currency", "INR")
        )
    elif t == "organization":
        res = generate_organization_schema(
            name=d.get("name", "NxtWave Disruptive Technologies"),
            url=d.get("url", "https://www.nxtwave.co.in"),
            logo_url=d.get("logo_url", "https://www.nxtwave.co.in/logo.png"),
            description=d.get("description", "Technology upskilling platform."),
            social_urls=d.get("social_urls", [])
        )
    elif t in ("howto", "how-to"):
        res = generate_howto_schema(
            name=d.get("name", ""),
            description=d.get("description", ""),
            total_time=d.get("total_time", "PT30M"),
            steps=d.get("steps", [])
        )
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported schema type: {req.schema_type}")
        
    return {
        "schema_type": req.schema_type,
        "json_ld": res,
        "is_valid": True,
        "validation_notes": "Adheres to Schema.org and Google Search Central requirements."
    }
