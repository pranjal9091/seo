import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends, Query, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.storage.db import get_db
from app.models.db_models import GA4Import, GA4Row, GSCRow
from app.ga4.parser import parse_ga4_csv
from app.ga4.metrics import (
    calculate_ga4_aggregates, aggregate_ga4_by_page,
    cross_analyze_gsc_ga4, build_article_360_measurement_loop
)

router = APIRouter(prefix="/api/ga4", tags=["Google Analytics 4"])

class GA4TextUploadRequest(BaseModel):
    content: str
    filename: Optional[str] = "ga4_export.csv"
    date_range: Optional[str] = None

@router.post("/upload")
async def upload_ga4_csv(
    file: Optional[UploadFile] = File(None),
    raw_content: Optional[str] = Form(None),
    filename: Optional[str] = Form(None),
    date_range: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Uploads and parses a GA4 CSV export via multipart upload.
    """
    content = ""
    actual_filename = filename or "ga4_export.csv"

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

    parsed_rows, columns_detected, errors = parse_ga4_csv(content)
    if not parsed_rows:
        return {
            "status": "error",
            "message": "No valid GA4 rows found.",
            "errors": errors or ["CSV does not match expected GA4 headers."]
        }

    import_id = str(uuid.uuid4())
    total_views = sum(r["views"] for r in parsed_rows)
    total_users = sum(r["users"] for r in parsed_rows)
    total_sessions = sum(r["sessions"] for r in parsed_rows)
    total_conversions = sum(r["conversions"] for r in parsed_rows)

    imp = GA4Import(
        id=import_id,
        filename=actual_filename,
        imported_at=datetime.now(timezone.utc),
        date_range=date_range,
        row_count=len(parsed_rows),
        total_views=total_views,
        total_users=total_users,
        total_sessions=total_sessions,
        total_conversions=total_conversions,
        status="success",
        columns_detected=columns_detected
    )
    db.add(imp)

    for r in parsed_rows:
        row = GA4Row(
            id=str(uuid.uuid4()),
            import_id=import_id,
            date=r.get("date"),
            page_path=r["page_path"],
            page_title=r.get("page_title"),
            views=r["views"],
            users=r["users"],
            sessions=r["sessions"],
            engagement_rate=r["engagement_rate"],
            conversions=r["conversions"]
        )
        db.add(row)

    db.commit()

    return {
        "status": "success",
        "id": import_id,
        "filename": actual_filename,
        "row_count": len(parsed_rows),
        "total_views": total_views,
        "total_users": total_users,
        "total_sessions": total_sessions,
        "total_conversions": total_conversions,
        "columns_detected": columns_detected,
        "errors": errors
    }

@router.post("/upload/text")
def upload_ga4_text(
    req: GA4TextUploadRequest,
    db: Session = Depends(get_db)
):
    """
    Alternative endpoint to upload raw GA4 CSV text via JSON body.
    """
    if not req.content.strip():
        raise HTTPException(status_code=400, detail="CSV content is empty.")

    parsed_rows, columns_detected, errors = parse_ga4_csv(req.content)
    if not parsed_rows:
        return {
            "status": "error",
            "message": "No valid GA4 rows found.",
            "errors": errors or ["CSV does not match expected GA4 headers."]
        }

    import_id = str(uuid.uuid4())
    total_views = sum(r["views"] for r in parsed_rows)
    total_users = sum(r["users"] for r in parsed_rows)
    total_sessions = sum(r["sessions"] for r in parsed_rows)
    total_conversions = sum(r["conversions"] for r in parsed_rows)

    imp = GA4Import(
        id=import_id,
        filename=req.filename or "pasted_ga4_export.csv",
        imported_at=datetime.now(timezone.utc),
        date_range=req.date_range,
        row_count=len(parsed_rows),
        total_views=total_views,
        total_users=total_users,
        total_sessions=total_sessions,
        total_conversions=total_conversions,
        status="success",
        columns_detected=columns_detected
    )
    db.add(imp)

    for r in parsed_rows:
        row = GA4Row(
            id=str(uuid.uuid4()),
            import_id=import_id,
            date=r.get("date"),
            page_path=r["page_path"],
            page_title=r.get("page_title"),
            views=r["views"],
            users=r["users"],
            sessions=r["sessions"],
            engagement_rate=r["engagement_rate"],
            conversions=r["conversions"]
        )
        db.add(row)

    db.commit()

    return {
        "status": "success",
        "id": import_id,
        "filename": imp.filename,
        "row_count": len(parsed_rows),
        "total_views": total_views,
        "total_users": total_users,
        "total_sessions": total_sessions,
        "total_conversions": total_conversions,
        "columns_detected": columns_detected,
        "errors": errors
    }

@router.get("/datasets")
def list_ga4_datasets(db: Session = Depends(get_db)):
    """
    Returns list of all uploaded GA4 datasets.
    """
    imports = db.query(GA4Import).order_by(desc(GA4Import.imported_at)).all()
    return [
        {
            "id": imp.id,
            "filename": imp.filename,
            "imported_at": imp.imported_at.isoformat() if imp.imported_at else None,
            "date_range": imp.date_range,
            "row_count": imp.row_count,
            "total_views": imp.total_views,
            "total_users": imp.total_users,
            "total_sessions": imp.total_sessions,
            "total_conversions": imp.total_conversions,
            "columns_detected": imp.columns_detected,
            "status": imp.status
        }
        for imp in imports
    ]

@router.delete("/datasets/{import_id}")
def delete_ga4_dataset(import_id: str, db: Session = Depends(get_db)):
    """
    Deletes an uploaded GA4 dataset and its rows.
    """
    imp = db.query(GA4Import).filter(GA4Import.id == import_id).first()
    if not imp:
        raise HTTPException(status_code=404, detail="Dataset not found")

    db.query(GA4Row).filter(GA4Row.import_id == import_id).delete()
    db.delete(imp)
    db.commit()
    return {"status": "deleted", "id": import_id}

@router.get("/overview")
def get_ga4_overview(
    import_id: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Returns high-level aggregate GA4 performance metrics.
    If no datasets exist, explicitly returns 'No GA4 data imported yet.'
    """
    target_import = None
    if import_id:
        target_import = db.query(GA4Import).filter(GA4Import.id == import_id).first()
    else:
        target_import = db.query(GA4Import).order_by(desc(GA4Import.imported_at)).first()

    if not target_import:
        return {
            "has_data": False,
            "message": "No GA4 data imported yet.",
            "metrics": None,
            "import_info": None
        }

    rows = db.query(GA4Row).filter(GA4Row.import_id == target_import.id).all()
    metrics = calculate_ga4_aggregates(rows)

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
        "metrics": metrics
    }

@router.get("/pages")
def get_ga4_pages(
    import_id: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Returns page-level aggregated GA4 engagement performance.
    """
    target_import = None
    if import_id:
        target_import = db.query(GA4Import).filter(GA4Import.id == import_id).first()
    else:
        target_import = db.query(GA4Import).order_by(desc(GA4Import.imported_at)).first()

    if not target_import:
        return {"has_data": False, "pages": []}

    rows = db.query(GA4Row).filter(GA4Row.import_id == target_import.id).all()
    page_aggs = aggregate_ga4_by_page(rows)

    return {
        "has_data": True,
        "import_id": target_import.id,
        "total_pages": len(page_aggs),
        "pages": page_aggs
    }

@router.get("/gsc-cross")
def get_gsc_ga4_cross_analysis(db: Session = Depends(get_db)):
    """
    Correlates Google Search Console demand with GA4 on-site usage side-by-side.
    """
    gsc_rows = db.query(GSCRow).all()
    ga4_rows = db.query(GA4Row).all()

    if not gsc_rows and not ga4_rows:
        return {
            "has_data": False,
            "message": "Neither Search Console nor GA4 data has been imported yet."
        }

    analysis = cross_analyze_gsc_ga4(gsc_rows, ga4_rows)
    analysis["has_data"] = True
    return analysis

@router.get("/article-loop/{slug}")
def get_article_measurement_loop(
    slug: str,
    db: Session = Depends(get_db)
):
    """
    Full 360-degree measurement loop for an individual article.
    """
    res = build_article_360_measurement_loop(slug, db)
    if not res.get("found"):
        raise HTTPException(status_code=404, detail=res.get("message"))
    return res
