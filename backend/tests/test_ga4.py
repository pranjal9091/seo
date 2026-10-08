import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.db_models import Base, GA4Import, GA4Row, GSCRow, GSCImport, ContentPage
from app.ga4.parser import (
    clean_numeric_int,
    clean_numeric_float,
    clean_rate,
    clean_page_path,
    parse_ga4_csv,
)
from app.ga4.metrics import (
    calculate_ga4_aggregates,
    aggregate_ga4_pages,
    calculate_gsc_ga4_cross_analysis,
    get_article_360_measurement_loop,
)

# Synthetic GA4 Export Fixture: Standard export
SYNTHETIC_GA4_CSV = """Page path,Page title,Views,Active users,Sessions,Engagement rate,Conversions
/content/generative-ai-explained,What is Generative AI?,"1,450",980,"1,120",68.5%,42
/content/python-vs-cpp-for-dsa,Python vs C++ for DSA,"2,300","1,640","1,850",72.1%,85
/content/ai-ml-internship-preparation,How to Prepare for AI ML Internship,890,620,710,61.2%,18
/reviews,Student Reviews and Outcomes,"3,200","2,100","2,400",81.4%,190
/academy,CCBP 4.0 Academy Programs,"4,100","2,900","3,150",77.3%,240
"""

# Synthetic GA4 Export with missing optional columns (e.g. conversions column omitted)
SYNTHETIC_GA4_CSV_MINIMAL = """Page path and screen class,Views,Users,Sessions,Engagement rate
/content/generative-ai-explained,850,600,720,65.0%
/content/ai-ml-career-roadmap-2026,"1,200",850,990,58.4%
"""

# Synthetic Malformed CSV (no recognizable headers)
SYNTHETIC_MALFORMED_CSV = """Some preamble report line
Random column 1,Random column 2
Value A,Value B
"""

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

def test_clean_numeric_int():
    assert clean_numeric_int("1,450") == 1450
    assert clean_numeric_int("890") == 890
    assert clean_numeric_int(320) == 320
    assert clean_numeric_int("") == 0
    assert clean_numeric_int(None) == 0
    assert clean_numeric_int("invalid", default=5) == 5

def test_clean_numeric_float():
    assert clean_numeric_float("1,450.50") == 1450.5
    assert clean_numeric_float("0.85") == 0.85
    assert clean_numeric_float(None) == 0.0

def test_clean_rate_percentages_and_decimals():
    assert clean_rate("68.5%") == 0.685
    assert clean_rate("72.1%") == 0.721
    assert clean_rate("0.65") == 0.65
    assert clean_rate("65.0") == 0.65  # Auto-scaled if > 1.0
    assert clean_rate(None) == 0.0
    assert clean_rate("") == 0.0

def test_clean_page_path():
    assert clean_page_path("https://www.ccbp.in/reviews") == "/reviews"
    assert clean_page_path("/content/generative-ai-explained/") == "/content/generative-ai-explained"
    assert clean_page_path("/content/python-vs-cpp-for-dsa?ref=social") == "/content/python-vs-cpp-for-dsa"
    assert clean_page_path("") == "/"

def test_parse_standard_ga4_csv():
    rows, cols, errors = parse_ga4_csv(SYNTHETIC_GA4_CSV)
    assert len(errors) == 0
    assert len(rows) == 5
    assert any("path" in c.lower() for c in cols)
    assert any("views" in c.lower() for c in cols)
    assert any("sessions" in c.lower() for c in cols)
    assert any("engagement" in c.lower() for c in cols)
    assert any("conversions" in c.lower() for c in cols)

    first = rows[0]
    assert first["page_path"] == "/content/generative-ai-explained"
    assert first["views"] == 1450
    assert first["users"] == 980
    assert first["sessions"] == 1120
    assert pytest.approx(first["engagement_rate"], 0.001) == 0.685
    assert first["conversions"] == 42

def test_parse_minimal_ga4_csv_with_missing_optional_columns():
    rows, cols, errors = parse_ga4_csv(SYNTHETIC_GA4_CSV_MINIMAL)
    assert len(errors) == 0
    assert len(rows) == 2
    # Conversions should default gracefully to 0 without breaking
    assert rows[0]["conversions"] == 0
    assert rows[0]["views"] == 850
    assert rows[0]["users"] == 600

def test_parse_malformed_ga4_csv():
    rows, cols, errors = parse_ga4_csv(SYNTHETIC_MALFORMED_CSV)
    assert len(rows) == 0
    assert len(errors) > 0
    assert any("Could not identify valid GA4 header row" in e for e in errors)

def test_ga4_session_weighted_aggregation():
    rows, _, _ = parse_ga4_csv(SYNTHETIC_GA4_CSV)
    db_rows = [GA4Row(import_id="imp-1", **r) for r in rows]
    
    aggs = calculate_ga4_aggregates(db_rows)
    assert aggs["total_views"] == 1450 + 2300 + 890 + 3200 + 4100
    assert aggs["total_users"] == 980 + 1640 + 620 + 2100 + 2900
    assert aggs["total_sessions"] == 1120 + 1850 + 710 + 2400 + 3150
    assert aggs["total_conversions"] == 42 + 85 + 18 + 190 + 240
    assert aggs["unique_pages"] == 5

    # Verify session-weighted engagement rate:
    # Weighted rate must not equal simple arithmetic mean
    simple_mean = sum(r.engagement_rate for r in db_rows) / len(db_rows)
    weighted_rate = aggs["weighted_engagement_rate"]
    assert weighted_rate > 0.70  # Heavily weighted by /academy (3150 sessions at 77.3%)
    assert abs(weighted_rate - simple_mean) > 0.005

def test_aggregate_ga4_pages():
    rows, _, _ = parse_ga4_csv(SYNTHETIC_GA4_CSV)
    db_rows = [GA4Row(import_id="imp-1", **r) for r in rows]
    
    page_data = aggregate_ga4_pages(db_rows)
    assert len(page_data) == 5
    # Should be sorted by views descending by default
    assert page_data[0]["page_path"] == "/academy"
    assert page_data[0]["views"] == 4100

def test_gsc_and_ga4_cross_page_matching(test_db):
    # Setup synthetic GSC rows
    gsc_imp = GSCImport(id="gsc-test-1", filename="gsc.csv", status="active", row_count=2)
    test_db.add(gsc_imp)
    test_db.add(GSCRow(
        import_id="gsc-test-1",
        query="ccbp review",
        page="https://www.ccbp.in/reviews",
        clicks=120,
        impressions=1500,
        ctr=0.08,
        position=1.8,
        intent_category="Brand / Trust",
        opportunity_type="Rank 1",
    ))
    test_db.add(GSCRow(
        import_id="gsc-test-1",
        query="what is generative ai",
        page="https://omnigeo.io/content/generative-ai-explained",
        clicks=45,
        impressions=900,
        ctr=0.05,
        position=4.2,
        intent_category="Informational",
        opportunity_type="Striking Distance",
    ))

    # Setup synthetic GA4 rows
    ga4_imp = GA4Import(id="ga4-test-1", filename="ga4.csv", status="active", row_count=2)
    test_db.add(ga4_imp)
    test_db.add(GA4Row(
        import_id="ga4-test-1",
        page_path="/reviews",
        page_title="Reviews",
        views=3200,
        users=2100,
        sessions=2400,
        engagement_rate=0.814,
        conversions=190,
    ))
    test_db.add(GA4Row(
        import_id="ga4-test-1",
        page_path="/content/generative-ai-explained",
        page_title="What is Generative AI?",
        views=1450,
        users=980,
        sessions=1120,
        engagement_rate=0.685,
        conversions=42,
    ))
    test_db.commit()

    cross = calculate_gsc_ga4_cross_analysis(test_db)
    assert cross["matched_count"] == 2
    assert "Descriptive correlation" in cross["disclaimer"]
    assert "not causal attribution" in cross["disclaimer"]

    paths = [p["page_path"] for p in cross["pages"]]
    assert "/reviews" in paths
    assert "/content/generative-ai-explained" in paths

    # Verify joined metrics
    review_match = next(p for p in cross["pages"] if p["page_path"] == "/reviews")
    assert review_match["gsc_clicks"] == 120
    assert review_match["ga4_users"] == 2100
    assert review_match["ga4_sessions"] == 2400

def test_article_360_measurement_loop_empty_and_measured(test_db):
    # Create article
    art = ContentPage(
        slug="generative-ai-explained",
        title="What is Generative AI?",
        meta_title="What is Generative AI? | OmniGEO",
        meta_description="A complete guide.",
        excerpt="Summary",
        direct_answer_block="Generative AI is a subset of deep learning that synthesizes new content.",
        content_markdown="# What is Generative AI?\n\nDetailed guide on generative models.",
        primary_topic="Artificial Intelligence",
        target_query="what is generative ai",
        status="published",
        canonical_url="https://omnigeo.io/content/generative-ai-explained",
    )
    test_db.add(art)
    test_db.commit()

    # Before any GSC/GA4 imports, must explicitly report "Not measured yet"
    loop_empty = get_article_360_measurement_loop(test_db, "generative-ai-explained")
    assert loop_empty["article"]["slug"] == "generative-ai-explained"
    assert loop_empty["google_search_console"]["status"] == "Not measured yet"
    assert loop_empty["google_analytics_4"]["status"] == "Not measured yet"

    # Now add measured GA4 row
    ga4_imp = GA4Import(id="ga4-loop-1", filename="ga4.csv", status="active", row_count=1)
    test_db.add(ga4_imp)
    test_db.add(GA4Row(
        import_id="ga4-loop-1",
        page_path="/content/generative-ai-explained",
        page_title="What is Generative AI?",
        views=1450,
        users=980,
        sessions=1120,
        engagement_rate=0.685,
        conversions=42,
    ))
    test_db.commit()

    loop_measured = get_article_360_measurement_loop(test_db, "generative-ai-explained")
    assert loop_measured["google_analytics_4"]["status"] == "Measured in GA4"
    assert loop_measured["google_analytics_4"]["metrics"]["views"] == 1450
    assert loop_measured["google_analytics_4"]["metrics"]["users"] == 980
    assert loop_measured["google_analytics_4"]["metrics"]["sessions"] == 1120

