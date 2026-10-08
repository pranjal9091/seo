import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.db_models import Base, ContentPage
from app.content.seed_content import SEED_ARTICLES
from app.content.manager import (
    seed_default_articles,
    get_all_articles,
    list_articles,
    get_article_by_slug,
    create_article,
    update_article_status,
    generate_article_schema_for_content,
)
from app.content.links import extract_internal_links, build_link_mesh
from app.content.grader import grade_content_page

@pytest.fixture
def test_db():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()

def test_content_model_and_creation(test_db):
    page = ContentPage(
        slug="test-slug-ml",
        title="Test Machine Learning Guide",
        meta_title="Test Machine Learning Guide | OmniGEO",
        meta_description="A test guide for ML careers in EdTech.",
        excerpt="Summary of ML guide.",
        direct_answer_block="Machine learning is a subset of artificial intelligence.",
        content_markdown="# Test Machine Learning Guide\n\nFull content text here with enough content to grade.",
        primary_topic="Artificial Intelligence",
        target_query="how to learn machine learning",
        intent="Informational",
        status="draft",
        canonical_url="https://omnigeo.io/content/test-slug-ml",
    )
    test_db.add(page)
    test_db.commit()

    retrieved = test_db.query(ContentPage).filter(ContentPage.slug == "test-slug-ml").first()
    assert retrieved is not None
    assert retrieved.title == "Test Machine Learning Guide"
    assert retrieved.status == "draft"
    assert retrieved.canonical_url == "https://omnigeo.io/content/test-slug-ml"

def test_seed_default_articles(test_db):
    # Should seed 6 high-intent EdTech articles
    seeded = seed_default_articles(test_db)
    assert len(seeded) == 6
    assert len(SEED_ARTICLES) == 6

    # Verify all 6 articles are in the database and published
    articles = list_articles(test_db)
    assert len(articles) == 6
    for art in articles:
        assert art.status == "published"
        assert art.slug != ""
        assert len(art.direct_answer_block) > 20
        assert art.canonical_url.startswith("http")

def test_article_status_update(test_db):
    seed_default_articles(test_db)
    slug = SEED_ARTICLES[0]["slug"]
    
    # Update to draft
    updated = update_article_status(test_db, slug, "draft")
    assert updated.status == "draft"

    # Query published articles only
    published_only = list_articles(test_db, status="published")
    assert len(published_only) == 5
    assert not any(a.slug == slug for a in published_only)

def test_create_custom_article(test_db):
    data = {
        "slug": "custom-dsa-roadmap",
        "title": "Complete DSA Roadmap for Placements",
        "meta_title": "Complete DSA Roadmap for Placements | OmniGEO",
        "meta_description": "Step by step DSA roadmap for top product companies.",
        "excerpt": "A master roadmap for data structures and algorithms.",
        "direct_answer_block": "To master DSA for placements, focus on Arrays, Strings, Trees, and DP over 6 months.",
        "content_markdown": "# Complete DSA Roadmap\n\nContent with [Python vs C++](/content/python-vs-cpp-for-dsa) guide.",
        "primary_topic": "Data Structures & Algorithms",
        "target_query": "dsa roadmap for placements",
        "intent": "Informational",
        "status": "draft",
        "author": "OmniGEO Academic Team",
    }
    art = create_article(test_db, data)
    assert art.slug == "custom-dsa-roadmap"
    assert art.status == "draft"

def test_draft_exclusion_from_sitemap(test_db):
    seed_default_articles(test_db)
    
    # Create draft article
    draft_page = ContentPage(
        slug="secret-draft-article",
        title="Secret Draft",
        meta_title="Secret Draft",
        meta_description="Not ready for search indexing",
        excerpt="Draft excerpt",
        content_markdown="# Draft Content",
        primary_topic="Draft",
        target_query="draft query",
        status="draft",
        canonical_url="https://omnigeo.io/content/secret-draft-article",
    )
    test_db.add(draft_page)
    test_db.commit()

    # Query only published pages for sitemap
    published = list_articles(test_db, status="published")
    slugs = [p.slug for p in published]
    
    assert "secret-draft-article" not in slugs
    assert len(published) == 6

def test_internal_link_detection():
    html_sample = """
    <div>
        <p>Check out our <a href="/content/generative-ai-explained">Generative AI overview</a>.</p>
        <p>Also see <a href="/content/ai-ml-internship-preparation">internship preparation</a>.</p>
        <p>External link: <a href="https://example.com/external">Example</a></p>
        <p>Relative anchor: <a href="#faq">Jump to FAQ</a></p>
    </div>
    """
    links = extract_internal_links(html_sample)
    assert len(links) == 2
    assert "generative-ai-explained" in links
    assert "ai-ml-internship-preparation" in links
    assert "https://example.com/external" not in links

def test_link_mesh_and_zero_orphans(test_db):
    seed_default_articles(test_db)
    articles = list_articles(test_db)
    mesh = build_link_mesh(articles)

    assert mesh["total_articles"] == 6
    assert mesh["total_internal_links"] >= 10
    # The 6 seeded articles link to each other contextually: 0 orphans
    assert mesh["orphan_count"] == 0

    # Test orphan flag when an isolated article is added
    isolated = ContentPage(
        slug="isolated-orphan-page",
        title="Isolated Page",
        meta_title="Isolated Page",
        meta_description="Has no incoming links",
        excerpt="Orphan excerpt",
        content_markdown="No incoming links anywhere in the mesh.",
        primary_topic="Isolated",
        target_query="isolated query",
        status="published",
        canonical_url="https://omnigeo.io/content/isolated-orphan-page",
    )
    test_db.add(isolated)
    test_db.commit()

    updated_articles = list_articles(test_db)
    updated_mesh = build_link_mesh(updated_articles)
    assert updated_mesh["orphan_count"] == 1
    assert "isolated-orphan-page" in updated_mesh["orphan_slugs"]

def test_schema_generation_and_validation(test_db):
    seed_default_articles(test_db)
    article = get_article_by_slug(test_db, "what-is-generative-ai-and-how-does-it-work")
    assert article is not None

    schema_data = generate_article_schema_for_content(article)
    assert schema_data["article"]["@type"] == "Article"
    assert schema_data["article"]["headline"] == article.title
    assert schema_data["article"]["description"] == article.meta_description
    assert schema_data["is_valid"] is True

    # FAQ schema should be generated because visible FAQs exist
    assert schema_data["faq"] is not None
    assert schema_data["faq"]["@type"] == "FAQPage"
    assert len(schema_data["faq"]["mainEntity"]) > 0

def test_content_grading_with_deterministic_auditor(test_db):
    seed_default_articles(test_db)
    article = get_article_by_slug(test_db, "what-is-generative-ai-and-how-does-it-work")
    
    grade = grade_content_page(article)
    assert "overall_score" in grade
    assert "category_scores" in grade
    assert "findings" in grade
    assert "readiness_summary" in grade
    assert grade["overall_score"] > 60
    assert grade["readiness_summary"]["answer_readiness"] > 50
    # Must make explicit that optimization score != Google ranking
    assert "Optimization score" in grade["disclaimer"]
    assert "does not predict" in grade["disclaimer"]
