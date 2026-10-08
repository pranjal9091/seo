import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends, Query, UploadFile, File, Form
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc

from app.storage.db import get_db
from app.models.db_models import GSCImport, GSCRow
from app.gsc.parser import parse_gsc_csv
from app.gsc.classifier import classify_query_intent, classify_opportunity, generate_aeo_recommendation
from app.gsc.metrics import (
    calculate_aggregate_metrics, aggregate_by_page, compare_datasets, cross_analyze_with_geo
)

router = APIRouter(prefix="/api/gsc", tags=["Google Search Console"])

class ManualUploadRequest(BaseModel):
    content: str
    filename: Optional[str] = "manual_gsc_export.csv"
    date_range: Optional[str] = None

class IntentUpdateRequest(BaseModel):
    intent_category: str

@router.post("/upload")
async def upload_gsc_csv(
    file: Optional[UploadFile] = File(None),
    raw_content: Optional[str] = Form(None),
    filename: Optional[str] = Form(None),
    date_range: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Parses and persists a Google Search Console CSV export.
    Supports file uploads or direct CSV content strings.
    """
    content = ""
    actual_filename = filename or "search_console_export.csv"

    if file:
        actual_filename = file.filename or actual_filename
        try:
            raw_bytes = await file.read()
            content = raw_bytes.decode("utf-8", errors="replace")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to read file: {str(e)}")
    elif raw_content:
        content = raw_content
    else:
        raise HTTPException(status_code=400, detail="No file or CSV content provided.")

    if not content.strip():
        raise HTTPException(status_code=400, detail="Uploaded CSV file is empty.")

    # Parse CSV
    parsed_rows, columns_detected, errors = parse_gsc_csv(content)

    if not parsed_rows:
        return {
            "status": "error",
            "message": "No valid GSC data rows found.",
            "errors": errors or ["CSV does not contain required GSC headers."]
        }

    import_id = str(uuid.uuid4())
    total_clicks = sum(r["clicks"] for r in parsed_rows)
    total_impressions = sum(r["impressions"] for r in parsed_rows)

    # Persist import record
    import_record = GSCImport(
        id=import_id,
        filename=actual_filename,
        imported_at=datetime.now(timezone.utc),
        date_range=date_range,
        row_count=len(parsed_rows),
        total_clicks=total_clicks,
        total_impressions=total_impressions,
        status="success",
        columns_detected=columns_detected
    )
    db.add(import_record)

    # Persist individual rows
    for r in parsed_rows:
        intent = classify_query_intent(r["query"])
        opp = classify_opportunity(r["position"], r["impressions"], r["clicks"], r["ctr"])
        
        row_record = GSCRow(
            id=str(uuid.uuid4()),
            import_id=import_id,
            query=r["query"],
            page=r.get("page"),
            clicks=r["clicks"],
            impressions=r["impressions"],
            ctr=r["ctr"],
            position=r["position"],
            intent_category=intent,
            opportunity_type=opp
        )
        db.add(row_record)

    db.commit()

    return {
        "status": "success",
        "id": import_id,
        "filename": actual_filename,
        "row_count": len(parsed_rows),
        "total_clicks": total_clicks,
        "total_impressions": total_impressions,
        "columns_detected": columns_detected,
        "errors": errors
    }

@router.post("/upload/text")
def upload_gsc_text(
    req: ManualUploadRequest,
    db: Session = Depends(get_db)
):
    """
    Alternative endpoint to upload raw CSV text via JSON payload.
    """
    if not req.content.strip():
        raise HTTPException(status_code=400, detail="CSV content is empty.")

    parsed_rows, columns_detected, errors = parse_gsc_csv(req.content)

    if not parsed_rows:
        return {
            "status": "error",
            "message": "No valid GSC data rows found.",
            "errors": errors or ["CSV does not contain required GSC headers."]
        }

    import_id = str(uuid.uuid4())
    total_clicks = sum(r["clicks"] for r in parsed_rows)
    total_impressions = sum(r["impressions"] for r in parsed_rows)

    import_record = GSCImport(
        id=import_id,
        filename=req.filename or "pasted_gsc_export.csv",
        imported_at=datetime.now(timezone.utc),
        date_range=req.date_range,
        row_count=len(parsed_rows),
        total_clicks=total_clicks,
        total_impressions=total_impressions,
        status="success",
        columns_detected=columns_detected
    )
    db.add(import_record)

    for r in parsed_rows:
        intent = classify_query_intent(r["query"])
        opp = classify_opportunity(r["position"], r["impressions"], r["clicks"], r["ctr"])
        
        row_record = GSCRow(
            id=str(uuid.uuid4()),
            import_id=import_id,
            query=r["query"],
            page=r.get("page"),
            clicks=r["clicks"],
            impressions=r["impressions"],
            ctr=r["ctr"],
            position=r["position"],
            intent_category=intent,
            opportunity_type=opp
        )
        db.add(row_record)

    db.commit()

    return {
        "status": "success",
        "id": import_id,
        "filename": import_record.filename,
        "row_count": len(parsed_rows),
        "total_clicks": total_clicks,
        "total_impressions": total_impressions,
        "columns_detected": columns_detected,
        "errors": errors
    }

@router.get("/datasets")
def list_gsc_datasets(db: Session = Depends(get_db)):
    """
    Returns list of all uploaded Search Console datasets.
    """
    imports = db.query(GSCImport).order_by(desc(GSCImport.imported_at)).all()
    return [
        {
            "id": imp.id,
            "filename": imp.filename,
            "imported_at": imp.imported_at.isoformat() if imp.imported_at else None,
            "date_range": imp.date_range,
            "row_count": imp.row_count,
            "total_clicks": imp.total_clicks,
            "total_impressions": imp.total_impressions,
            "columns_detected": imp.columns_detected,
            "status": imp.status
        }
        for imp in imports
    ]

@router.delete("/datasets/{import_id}")
def delete_gsc_dataset(import_id: str, db: Session = Depends(get_db)):
    """
    Deletes an uploaded dataset and its associated rows.
    """
    imp = db.query(GSCImport).filter(GSCImport.id == import_id).first()
    if not imp:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    db.query(GSCRow).filter(GSCRow.import_id == import_id).delete()
    db.delete(imp)
    db.commit()
    return {"status": "deleted", "id": import_id}

@router.get("/overview")
def get_gsc_overview(
    import_id: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Returns high-level aggregate search performance metrics.
    If no datasets exist, explicitly returns 'No Search Console data imported yet'.
    """
    target_import = None
    if import_id:
        target_import = db.query(GSCImport).filter(GSCImport.id == import_id).first()
    else:
        target_import = db.query(GSCImport).order_by(desc(GSCImport.imported_at)).first()

    if not target_import:
        return {
            "has_data": False,
            "message": "No Search Console data imported yet.",
            "metrics": None,
            "import_info": None,
            "opportunity_breakdown": {},
            "intent_breakdown": {}
        }

    rows = db.query(GSCRow).filter(GSCRow.import_id == target_import.id).all()
    metrics = calculate_aggregate_metrics(rows)

    # Opportunity Breakdown
    opp_counts: Dict[str, int] = {}
    for r in rows:
        opp = r.opportunity_type or "Standard"
        opp_counts[opp] = opp_counts.get(opp, 0) + 1

    # Intent Breakdown
    intent_counts: Dict[str, int] = {}
    for r in rows:
        intent = r.intent_category or "Other"
        intent_counts[intent] = intent_counts.get(intent, 0) + 1

    return {
        "has_data": True,
        "import_info": {
            "id": target_import.id,
            "filename": target_import.filename,
            "imported_at": target_import.imported_at.isoformat() if target_import.imported_at else None,
            "date_range": target_import.date_range,
            "row_count": target_import.row_count,
            "columns_detected": target_import.columns_detected
        },
        "metrics": metrics,
        "opportunity_breakdown": opp_counts,
        "intent_breakdown": intent_counts
    }

@router.get("/queries")
def get_gsc_queries(
    import_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    min_impressions: Optional[int] = Query(None),
    min_clicks: Optional[int] = Query(None),
    min_position: Optional[float] = Query(None),
    max_position: Optional[float] = Query(None),
    opportunity_type: Optional[str] = Query(None),
    intent: Optional[str] = Query(None),
    sort_by: str = Query("clicks"),
    order: str = Query("desc"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """
    Returns query-level table with filtering, sorting, intent tagging, and AEO recommendations.
    """
    target_import = None
    if import_id:
        target_import = db.query(GSCImport).filter(GSCImport.id == import_id).first()
    else:
        target_import = db.query(GSCImport).order_by(desc(GSCImport.imported_at)).first()

    if not target_import:
        return {"total": 0, "rows": [], "has_data": False}

    q = db.query(GSCRow).filter(GSCRow.import_id == target_import.id)

    if search:
        s_term = search.strip()
        q = q.filter((GSCRow.query.ilike(f"%{s_term}%")) | (GSCRow.page.ilike(f"%{s_term}%")))
    if min_impressions is not None:
        q = q.filter(GSCRow.impressions >= min_impressions)
    if min_clicks is not None:
        q = q.filter(GSCRow.clicks >= min_clicks)
    if min_position is not None:
        q = q.filter(GSCRow.position >= min_position)
    if max_position is not None:
        q = q.filter(GSCRow.position <= max_position)
    if opportunity_type and opportunity_type != "All":
        q = q.filter(GSCRow.opportunity_type == opportunity_type)
    if intent and intent != "All":
        q = q.filter(GSCRow.intent_category == intent)

    total_count = q.count()

    # Dynamic sorting
    sort_column = GSCRow.clicks
    if sort_by == "impressions":
        sort_column = GSCRow.impressions
    elif sort_by == "ctr":
        sort_column = GSCRow.ctr
    elif sort_by == "position":
        sort_column = GSCRow.position
    elif sort_by == "query":
        sort_column = GSCRow.query

    if order.lower() == "asc":
        q = q.order_by(asc(sort_column))
    else:
        q = q.order_by(desc(sort_column))

    rows = q.offset(offset).limit(limit).all()

    result_rows = []
    for r in rows:
        aeo_rec = generate_aeo_recommendation(r.query, r.position, r.impressions, r.ctr)
        result_rows.append({
            "id": r.id,
            "query": r.query,
            "page": r.page,
            "clicks": r.clicks,
            "impressions": r.impressions,
            "ctr": r.ctr,
            "position": r.position,
            "intent_category": r.intent_category or "Other",
            "opportunity_type": r.opportunity_type or "Standard",
            "aeo_recommendation": aeo_rec
        })

    return {
        "has_data": True,
        "total": total_count,
        "limit": limit,
        "offset": offset,
        "rows": result_rows
    }

@router.get("/pages")
def get_gsc_pages(
    import_id: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Returns page-level aggregated metrics and top associated queries per landing page.
    """
    target_import = None
    if import_id:
        target_import = db.query(GSCImport).filter(GSCImport.id == import_id).first()
    else:
        target_import = db.query(GSCImport).order_by(desc(GSCImport.imported_at)).first()

    if not target_import:
        return {"has_data": False, "pages": []}

    rows = db.query(GSCRow).filter(GSCRow.import_id == target_import.id).all()
    page_aggregates = aggregate_by_page(rows)

    return {
        "has_data": True,
        "import_id": target_import.id,
        "total_pages": len(page_aggregates),
        "pages": page_aggregates
    }

@router.patch("/rows/{row_id}/intent")
def update_query_intent(
    row_id: str,
    body: IntentUpdateRequest,
    db: Session = Depends(get_db)
):
    """
    Allows user override of AI/rule-suggested search intent.
    """
    row = db.query(GSCRow).filter(GSCRow.id == row_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Row not found")

    row.intent_category = body.intent_category.strip()
    db.commit()
    return {
        "id": row.id,
        "query": row.query,
        "intent_category": row.intent_category
    }

@router.get("/compare")
def compare_gsc_periods(
    baseline_id: Optional[str] = Query(None),
    latest_id: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Calculates measured change between Baseline (Dataset A) and Latest (Dataset B).
    If fewer than 2 datasets exist, returns honest prompt to upload a second period.
    """
    all_imports = db.query(GSCImport).order_by(desc(GSCImport.imported_at)).all()
    if len(all_imports) < 2 and (not baseline_id or not latest_id):
        return {
            "can_compare": False,
            "message": "Upload a second period to calculate change.",
            "available_datasets_count": len(all_imports)
        }

    # Determine baseline & latest
    b_id = baseline_id
    l_id = latest_id
    if not b_id or not l_id:
        l_id = all_imports[0].id
        b_id = all_imports[1].id

    baseline_imp = db.query(GSCImport).filter(GSCImport.id == b_id).first()
    latest_imp = db.query(GSCImport).filter(GSCImport.id == l_id).first()

    if not baseline_imp or not latest_imp:
        raise HTTPException(status_code=404, detail="Specified baseline or latest dataset not found.")

    baseline_rows = db.query(GSCRow).filter(GSCRow.import_id == b_id).all()
    latest_rows = db.query(GSCRow).filter(GSCRow.import_id == l_id).all()

    comparison = compare_datasets(baseline_rows, latest_rows)
    comparison["can_compare"] = True
    comparison["baseline"]["filename"] = baseline_imp.filename
    comparison["baseline"]["date_range"] = baseline_imp.date_range
    comparison["baseline"]["id"] = baseline_imp.id
    comparison["latest"]["filename"] = latest_imp.filename
    comparison["latest"]["date_range"] = latest_imp.date_range
    comparison["latest"]["id"] = latest_imp.id

    return comparison

@router.get("/cross-analysis")
def get_gsc_geo_cross_analysis(
    import_id: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Connects existing AI visibility observations with Search Console query demand.
    Explicitly maintains data separation without implying causation.
    """
    target_import = None
    if import_id:
        target_import = db.query(GSCImport).filter(GSCImport.id == import_id).first()
    else:
        target_import = db.query(GSCImport).order_by(desc(GSCImport.imported_at)).first()

    if not target_import:
        return {
            "has_data": False,
            "message": "No Search Console data imported yet."
        }

    rows = db.query(GSCRow).filter(GSCRow.import_id == target_import.id).all()
    analysis = cross_analyze_with_geo(rows, db)
    analysis["has_data"] = True
    analysis["import_filename"] = target_import.filename
    return analysis
