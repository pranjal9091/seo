import uuid
from sqlalchemy import Column, String, Integer, Float, DateTime, Text, JSON
from sqlalchemy.orm import declarative_base
from datetime import datetime, timezone

Base = declarative_base()

class AuditRecord(Base):
    __tablename__ = "audit_records"

    id = Column(String, primary_key=True, index=True)
    url = Column(String, index=True, nullable=False)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    overall_score = Column(Integer, nullable=False)
    status_code = Column(Integer, nullable=False)
    response_time_ms = Column(Integer, nullable=False)
    
    # Category scores stored as JSON
    category_scores = Column(JSON, nullable=False)
    
    # Findings stored as JSON
    findings = Column(JSON, nullable=False)
    
    # Summary stats stored as JSON
    summary_counts = Column(JSON, nullable=False)
    
    # Serialized full extracted data
    extracted_data = Column(JSON, nullable=False)

class Brand(Base):
    __tablename__ = "brands"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    domain = Column(String, nullable=False)
    aliases = Column(JSON, nullable=False, default=list)
    active = Column(Integer, default=1)  # 1 for active, 0 for inactive
    is_target = Column(Integer, default=0)

class SearchQuery(Base):
    __tablename__ = "search_queries"

    id = Column(String, primary_key=True, index=True)
    question = Column(String, nullable=False, index=True)
    intent_category = Column(String, nullable=False, index=True)
    active = Column(Integer, default=1)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class VisibilityRun(Base):
    __tablename__ = "visibility_runs"

    id = Column(String, primary_key=True, index=True)
    provider = Column(String, nullable=False, index=True)
    query_id = Column(String, index=True, nullable=False)
    executed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    raw_response = Column(Text, nullable=False)
    status = Column(String, default="success")  # "success", "error"
    latency_ms = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    is_manual = Column(Integer, default=0)
    is_sample = Column(Integer, default=0)

class BrandVisibilityObservation(Base):
    __tablename__ = "brand_visibility_observations"

    id = Column(String, primary_key=True, index=True)
    run_id = Column(String, index=True, nullable=False)
    brand_id = Column(String, index=True, nullable=False)
    mentioned = Column(Integer, default=0)  # 1 or 0
    mention_count = Column(Integer, default=0)
    first_mention_position = Column(Integer, default=-1)
    prominence_score = Column(Float, default=0.0)

class CitationObservation(Base):
    __tablename__ = "citation_observations"

    id = Column(String, primary_key=True, index=True)
    run_id = Column(String, index=True, nullable=False)
    url = Column(String, nullable=False)
    domain = Column(String, nullable=False, index=True)
    brand_id = Column(String, nullable=True, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class GSCImport(Base):
    __tablename__ = "gsc_imports"

    id = Column(String, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    imported_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    date_range = Column(String, nullable=True)
    row_count = Column(Integer, default=0)
    total_clicks = Column(Integer, default=0)
    total_impressions = Column(Integer, default=0)
    status = Column(String, default="success")
    columns_detected = Column(JSON, default=list)

class GSCRow(Base):
    __tablename__ = "gsc_rows"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    import_id = Column(String, index=True, nullable=False)
    query = Column(String, nullable=False, index=True)
    page = Column(String, nullable=True, index=True)
    clicks = Column(Integer, default=0)
    impressions = Column(Integer, default=0)
    ctr = Column(Float, default=0.0)
    position = Column(Float, default=0.0)
    intent_category = Column(String, nullable=True, index=True)
    opportunity_type = Column(String, nullable=True)

class ContentPage(Base):
    __tablename__ = "content_pages"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    slug = Column(String, unique=True, index=True, nullable=False)
    title = Column(String, nullable=False)
    meta_title = Column(String, nullable=False)
    meta_description = Column(Text, nullable=False)
    excerpt = Column(Text, nullable=False)
    direct_answer_block = Column(Text, nullable=True)
    content_markdown = Column(Text, nullable=False)
    primary_topic = Column(String, nullable=False, index=True)
    target_query = Column(String, nullable=False, index=True)
    intent = Column(String, default="Informational", nullable=False)
    status = Column(String, default="published", index=True)  # draft, published, archived
    author = Column(String, default="OmniGEO Research Team")
    canonical_url = Column(String, nullable=False)
    published_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    faqs = Column(JSON, default=list)  # list of { question, answer }
    internal_links = Column(JSON, default=list)  # list of { target_slug, anchor_text }
    seo_audit_cache = Column(JSON, nullable=True)

class GA4Import(Base):
    __tablename__ = "ga4_imports"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    filename = Column(String, nullable=False)
    imported_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    date_range = Column(String, nullable=True)
    row_count = Column(Integer, default=0)
    total_views = Column(Integer, default=0)
    total_users = Column(Integer, default=0)
    total_sessions = Column(Integer, default=0)
    total_conversions = Column(Integer, default=0)
    status = Column(String, default="success")
    columns_detected = Column(JSON, default=list)

class GA4Row(Base):
    __tablename__ = "ga4_rows"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    import_id = Column(String, index=True, nullable=False)
    date = Column(String, nullable=True)
    page_path = Column(String, index=True, nullable=False)
    page_title = Column(String, nullable=True)
    views = Column(Integer, default=0)
    users = Column(Integer, default=0)
    sessions = Column(Integer, default=0)
    engagement_rate = Column(Float, default=0.0)
    conversions = Column(Integer, default=0)

class EvidenceRecord(Base):
    __tablename__ = "evidence_records"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    category = Column(String, nullable=False, index=True)  # deployment, gsc, ga4, ai_visibility, content, schema
    claim = Column(String, nullable=False)
    status = Column(String, default="pending", index=True)  # verified, pending, not_verified
    source = Column(String, nullable=True)  # e.g. "Google Search Console", "GA4 Realtime", "Vercel Production"
    evidence_url = Column(String, nullable=True)
    evidence_note = Column(Text, nullable=True)
    captured_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)


