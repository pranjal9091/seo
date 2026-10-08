import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.storage.db import init_db, SessionLocal
from app.config import settings
from app.content.manager import seed_default_articles, resolve_canonical_url
from app.api.evidence_routes import seed_default_evidence

init_db()

@pytest.fixture(autouse=True)
def setup_db():
    db = SessionLocal()
    seed_default_articles(db)
    seed_default_evidence(db)
    db.close()
    yield

client = TestClient(app)

def test_health_check_endpoint():
    """Verify GET /health returns status, environment, and site_url without leaking secrets."""
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert "environment" in data
    assert "version" in data
    assert "site_url" in data
    # Ensure no secret keys leaked
    for key in ["OPENAI_API_KEY", "GEMINI_API_KEY", "PERPLEXITY_API_KEY"]:
        assert key not in data

def test_system_readiness_endpoint():
    """Verify GET /api/system/readiness correctly returns all subsystem readiness states."""
    res = client.get("/api/system/readiness")
    assert res.status_code == 200
    data = res.json()
    assert data["database"]["status"] == "ready"
    assert data["content"]["status"] == "ready"
    assert data["content"]["published_count"] >= 6
    assert data["sitemap"]["status"] == "ready"
    assert data["configuration"]["status"] == "ready"
    assert "openai" in data["ai_providers"]["providers"]
    assert "gemini" in data["ai_providers"]["providers"]
    assert "perplexity" in data["ai_providers"]["providers"]
    # Not configured is NOT an error
    assert data["ga4_configuration"]["status"] in ["ready", "not_configured"]

def test_production_seo_technical_audit():
    """Verify GET /api/seo/audit runs full technical checks and outputs concrete evidence."""
    res = client.get("/api/seo/audit")
    assert res.status_code == 200
    data = res.json()
    summary = data["summary"]
    articles = data["articles"]
    assert summary["total_articles"] >= 6
    assert summary["total_fails"] == 0
    assert summary["overall_status"] == "PASS"

    for art in articles:
        assert art["technically_ready_for_indexing"] is True
        assert art["indexing_status_label"] == "Technically ready for indexing"
        check_names = [c["check"] for c in art["checks"]]
        assert "Title Exists" in check_names
        assert "Title Unique" in check_names
        assert "Meta Description Length" in check_names
        assert "Canonical Absolute URL" in check_names
        assert "Direct Answer Block (AEO)" in check_names
        assert "Article Schema JSON-LD" in check_names
        assert "FAQ Schema Consistency" in check_names
        assert "Sitemap & Robots Accessibility" in check_names

def test_production_sitemap_no_localhost_when_configured(monkeypatch):
    """Verify sitemap uses production domain and contains zero localhost references when configured."""
    monkeypatch.setattr(settings, "SITE_URL", "https://omnigeo.vercel.app")
    res = client.get("/sitemap.xml")
    assert res.status_code == 200
    content = res.text
    assert "https://omnigeo.vercel.app/" in content
    assert "https://omnigeo.vercel.app/content" in content
    assert "localhost" not in content
    assert "127.0.0.1" not in content
    assert "<loc>https://omnigeo.vercel.app/content/what-is-generative-ai-and-how-does-it-work</loc>" in content

def test_production_robots_txt_no_localhost_when_configured(monkeypatch):
    """Verify robots.txt references the production sitemap without localhost or dev port."""
    monkeypatch.setattr(settings, "SITE_URL", "https://omnigeo.vercel.app")
    res = client.get("/robots.txt")
    assert res.status_code == 200
    content = res.text
    assert "User-agent: *" in content
    assert "Allow: /" in content
    assert "Sitemap: https://omnigeo.vercel.app/sitemap.xml" in content
    assert "localhost" not in content
    assert ":5173" not in content
    assert ":8000" not in content

def test_resolve_canonical_url_swaps_localhost_in_production(monkeypatch):
    """Verify resolve_canonical_url cleanly replaces localhost with production SITE_URL."""
    monkeypatch.setattr(settings, "SITE_URL", "https://omnigeo.ai")
    slug = "python-vs-cpp-for-data-structures-and-algorithms"
    stored_dev_url = f"http://localhost:5173/content/{slug}"
    resolved = resolve_canonical_url(slug, stored_dev_url)
    assert resolved == f"https://omnigeo.ai/content/{slug}"
    assert "localhost" not in resolved

def test_evidence_records_api_lifecycle():
    """Verify EvidenceRecord API: list, seed, create, patch, delete."""
    # List (should auto-seed)
    res = client.get("/api/evidence")
    assert res.status_code == 200
    records = res.json()
    assert len(records) >= 8

    # Create new record
    new_rec = {
        "category": "deployment",
        "claim": "Docker containerized production release",
        "status": "pending",
        "source": "Docker Hub",
        "evidence_note": "Multi-stage Dockerfile verified locally."
    }
    create_res = client.post("/api/evidence", json=new_rec)
    assert create_res.status_code == 200
    rec_id = create_res.json()["id"]

    # Patch record
    patch_res = client.patch(f"/api/evidence/{rec_id}", json={
        "status": "verified",
        "evidence_note": "Image built and tested."
    })
    assert patch_res.status_code == 200
    assert patch_res.json()["record_status"] == "verified"

    # Delete record
    del_res = client.delete(f"/api/evidence/{rec_id}")
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "deleted"

def test_cors_environment_configuration(monkeypatch):
    """Verify CORS origins can be configured and are respected."""
    monkeypatch.setattr(settings, "FRONTEND_ORIGIN", "https://omnigeo.vercel.app")
    origins = settings.CORS_ORIGINS
    assert "https://omnigeo.vercel.app" in origins
