from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends, Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.config import settings
from app.storage.db import get_db
from app.models.db_models import ContentPage
from app.content.manager import (
    list_articles, get_article_by_slug, create_article,
    update_article_status, build_article_schema_jsonld, resolve_canonical_url
)
from app.content.links import analyze_internal_links
from app.content.grader import grade_content_page

router = APIRouter(prefix="/api/content", tags=["Content Hub"])
seo_router = APIRouter(tags=["SEO Public Directives"])

class CreateArticleRequest(BaseModel):
    title: str
    slug: str
    meta_title: Optional[str] = None
    meta_description: str
    excerpt: str
    direct_answer_block: Optional[str] = None
    content_markdown: str
    primary_topic: str = "Technology"
    target_query: str
    intent: str = "Informational"
    status: str = "published"
    author: Optional[str] = "OmniGEO Research Team"
    faqs: List[Dict[str, str]] = []
    internal_links: List[Dict[str, str]] = []

class UpdateStatusRequest(BaseModel):
    status: str = Field(..., description="published, draft, archived")

@router.get("/articles")
def get_articles_list(
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Returns list of content articles with reading time and audit scores.
    """
    articles = list_articles(db, status=status)
    results = []
    for a in articles:
        words = len((a.content_markdown or "").split())
        read_time_min = max(1, round(words / 200))
        results.append({
            "id": a.id,
            "slug": a.slug,
            "title": a.title,
            "meta_title": a.meta_title,
            "meta_description": a.meta_description,
            "excerpt": a.excerpt,
            "direct_answer_block": a.direct_answer_block,
            "primary_topic": a.primary_topic,
            "target_query": a.target_query,
            "intent": a.intent,
            "status": a.status,
            "author": a.author,
            "canonical_url": resolve_canonical_url(a.slug, a.canonical_url),
            "published_at": a.published_at.isoformat() if a.published_at else None,
            "word_count": words,
            "reading_time_min": read_time_min,
            "faq_count": len(a.faqs or []),
            "internal_link_count": len(a.internal_links or [])
        })
    return {"total": len(results), "articles": results}

@router.get("/articles/{slug}")
def get_article_detail(
    slug: str,
    db: Session = Depends(get_db)
):
    """
    Fetches full article by slug, including visible FAQs and Schema.org JSON-LD.
    """
    article = get_article_by_slug(db, slug)
    if not article:
        raise HTTPException(status_code=404, detail=f"Article '{slug}' not found.")

    schema_data = build_article_schema_jsonld(article)
    words = len((article.content_markdown or "").split())
    read_time_min = max(1, round(words / 200))

    return {
        "id": article.id,
        "slug": article.slug,
        "title": article.title,
        "meta_title": article.meta_title,
        "meta_description": article.meta_description,
        "excerpt": article.excerpt,
        "direct_answer_block": article.direct_answer_block,
        "content_markdown": article.content_markdown,
        "primary_topic": article.primary_topic,
        "target_query": article.target_query,
        "intent": article.intent,
        "status": article.status,
        "author": article.author,
        "canonical_url": resolve_canonical_url(article.slug, article.canonical_url),
        "published_at": article.published_at.isoformat() if article.published_at else None,
        "updated_at": article.updated_at.isoformat() if article.updated_at else None,
        "word_count": words,
        "reading_time_min": read_time_min,
        "faqs": article.faqs or [],
        "internal_links": article.internal_links or [],
        "structured_data": schema_data
    }

@router.post("/articles")
def create_new_article(
    payload: CreateArticleRequest,
    db: Session = Depends(get_db)
):
    """
    Creates a new content page (draft or published).
    """
    try:
        page = create_article(db, payload.model_dump())
        return {"status": "created", "slug": page.slug, "id": page.id}
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))

@router.patch("/articles/{slug}/status")
def patch_article_status(
    slug: str,
    body: UpdateStatusRequest,
    db: Session = Depends(get_db)
):
    """
    Updates article status (draft, published, archived).
    """
    try:
        page = update_article_status(db, slug, body.status)
        return {"status": page.status, "slug": page.slug}
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))

@router.get("/articles/{slug}/grade")
def get_article_grade(
    slug: str,
    db: Session = Depends(get_db)
):
    """
    Runs the article through the deterministic Content Grader engine.
    """
    article = get_article_by_slug(db, slug)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found.")
    return grade_content_page(article)

@router.get("/articles/{slug}/schema")
def get_article_schema(
    slug: str,
    db: Session = Depends(get_db)
):
    """
    Returns Schema.org Article and FAQPage JSON-LD.
    """
    article = get_article_by_slug(db, slug)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found.")
    return build_article_schema_jsonld(article)

@router.get("/link-graph")
def get_content_link_graph(db: Session = Depends(get_db)):
    """
    Analyzes internal links across all articles and identifies potential orphan pages.
    """
    return analyze_internal_links(db)

# PUBLIC ROBOTS.TXT & SITEMAP.XML ENDPOINTS
@seo_router.get("/robots.txt", response_class=Response)
def get_robots_txt():
    """
    Generates standard robots.txt adhering to configured SITE_URL.
    Allows normal crawling and references the production sitemap.
    """
    base = settings.SITE_URL.rstrip("/")
    content = f"User-agent: *\nAllow: /\n\nSitemap: {base}/sitemap.xml\n"
    return Response(content=content, media_type="text/plain")

@seo_router.get("/sitemap.xml", response_class=Response)
def get_sitemap_xml(db: Session = Depends(get_db)):
    """
    Generates standard XML sitemap.
    CRITICAL: Strictly includes published pages; draft/archived pages must NOT appear.
    Guarantees production domain URLs and zero localhost leakage when configured.
    """
    base = settings.SITE_URL.rstrip("/")
    published = db.query(ContentPage).filter(ContentPage.status == "published").all()
    
    xml_lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        '  <url>',
        f'    <loc>{base}/</loc>',
        '    <changefreq>daily</changefreq>',
        '    <priority>1.0</priority>',
        '  </url>',
        '  <url>',
        f'    <loc>{base}/content</loc>',
        '    <changefreq>daily</changefreq>',
        '    <priority>0.9</priority>',
        '  </url>'
    ]

    for page in published:
        canonical = resolve_canonical_url(page.slug, page.canonical_url)
        pub_date = page.published_at.strftime("%Y-%m-%d") if page.published_at else ""
        xml_lines.extend([
            '  <url>',
            f'    <loc>{canonical}</loc>',
            f'    <lastmod>{pub_date}</lastmod>' if pub_date else '',
            '    <changefreq>weekly</changefreq>',
            '    <priority>0.8</priority>',
            '  </url>'
        ])

    # Filter out empty lines
    xml_lines = [line for line in xml_lines if line]
    xml_lines.append('</urlset>')

    return Response(content="\n".join(xml_lines), media_type="application/xml")
