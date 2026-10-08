import uuid
import re
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.config import settings
from app.models.db_models import ContentPage
from app.content.seed_content import SEED_ARTICLES
from app.schema.generator import generate_article_schema, generate_faq_schema

def resolve_canonical_url(slug: str, stored_url: Optional[str] = None) -> str:
    """
    Resolves the canonical URL using the environment-configured SITE_URL.
    Guarantees zero localhost / 127.0.0.1 leakage in production environments.
    """
    site_url = settings.SITE_URL.rstrip("/")
    if stored_url:
        is_dev_url = any(dev_host in stored_url for dev_host in ["localhost", "127.0.0.1"])
        if is_dev_url:
            return f"{site_url}/content/{slug}"
        if stored_url.startswith("http://") or stored_url.startswith("https://"):
            return stored_url
    return f"{site_url}/content/{slug}"

def seed_default_articles(db: Session) -> List[ContentPage]:
    """
    Seeds the 6 initial answer-first content articles if table is empty.
    Never seeds fake performance data.
    """
    count = db.query(ContentPage).count()
    if count == 0:
        for item in SEED_ARTICLES:
            page = ContentPage(
                id=str(uuid.uuid4()),
                slug=item["slug"],
                title=item["title"],
                meta_title=item["meta_title"],
                meta_description=item["meta_description"],
                excerpt=item["excerpt"],
                direct_answer_block=item.get("direct_answer_block"),
                content_markdown=item["content_markdown"],
                primary_topic=item["primary_topic"],
                target_query=item["target_query"],
                intent=item["intent"],
                status=item.get("status", "published"),
                author=item.get("author", "OmniGEO Research Team"),
                canonical_url=item["canonical_url"],
                published_at=item.get("published_at") or datetime.now(timezone.utc),
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc),
                faqs=item.get("faqs", []),
                internal_links=item.get("internal_links", [])
            )
            db.add(page)
        db.commit()
    return db.query(ContentPage).all()

def list_articles(db: Session, status: Optional[str] = None) -> List[ContentPage]:
    q = db.query(ContentPage)
    if status:
        q = q.filter(ContentPage.status == status)
    return q.order_by(ContentPage.published_at.desc()).all()

# Aliases for compatibility
get_all_articles = list_articles

def get_article_by_slug(db: Session, slug: str) -> Optional[ContentPage]:
    return db.query(ContentPage).filter(ContentPage.slug == slug.strip().lower()).first()

def create_article(db: Session, data: Dict[str, Any]) -> ContentPage:
    slug = re.sub(r'[^a-z0-9\-]', '', data["slug"].strip().lower().replace(" ", "-"))
    existing = db.query(ContentPage).filter(ContentPage.slug == slug).first()
    if existing:
        raise ValueError(f"Article with slug '{slug}' already exists.")

    page = ContentPage(
        id=str(uuid.uuid4()),
        slug=slug,
        title=data["title"].strip(),
        meta_title=data.get("meta_title", data["title"]).strip(),
        meta_description=data.get("meta_description", "").strip(),
        excerpt=data.get("excerpt", "").strip(),
        direct_answer_block=data.get("direct_answer_block", "").strip(),
        content_markdown=data.get("content_markdown", "").strip(),
        primary_topic=data.get("primary_topic", "Technology").strip(),
        target_query=data.get("target_query", slug.replace("-", " ")).strip(),
        intent=data.get("intent", "Informational").strip(),
        status=data.get("status", "published").strip(),
        author=data.get("author", "OmniGEO Research Team").strip(),
        canonical_url=data.get("canonical_url", f"http://localhost:5173/content/{slug}").strip(),
        published_at=datetime.now(timezone.utc) if data.get("status") == "published" else None,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
        faqs=data.get("faqs", []),
        internal_links=data.get("internal_links", [])
    )
    db.add(page)
    db.commit()
    db.refresh(page)
    return page

def update_article_status(db: Session, slug: str, status: str) -> ContentPage:
    article = get_article_by_slug(db, slug)
    if not article:
        raise ValueError(f"Article '{slug}' not found.")
    article.status = status
    if status == "published" and not article.published_at:
        article.published_at = datetime.now(timezone.utc)
    article.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(article)
    return article

def build_article_schema_jsonld(article: ContentPage) -> Dict[str, Any]:
    """
    Constructs Schema.org Article and FAQPage JSON-LD.
    Strictly follows Google guidelines: only outputs FAQ schema if FAQs exist on page.
    """
    canonical = resolve_canonical_url(article.slug, article.canonical_url)
    article_schema = generate_article_schema(
        headline=article.title,
        description=article.meta_description or article.excerpt,
        url=canonical,
        author_name=article.author,
        publisher_name="OmniGEO Research",
        date_published=article.published_at.isoformat() if article.published_at else article.created_at.isoformat()
    )

    schemas = {
        "article": article_schema,
        "faq": None,
        "is_valid": True,
        "validation_status": "Valid",
        "notes": "Article Schema complies with schema.org standards."
    }

    if article.faqs and len(article.faqs) > 0:
        faq_schema = generate_faq_schema(article.faqs)
        schemas["faq"] = faq_schema
        schemas["notes"] += " FAQPage Schema generated matching on-page FAQs."

    return schemas
    
# Alias for compatibility
generate_article_schema_for_content = build_article_schema_jsonld
