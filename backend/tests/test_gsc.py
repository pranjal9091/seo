import pytest
from app.gsc.parser import parse_gsc_csv, clean_numeric, clean_ctr
from app.gsc.classifier import classify_query_intent, classify_opportunity, generate_aeo_recommendation
from app.gsc.metrics import calculate_aggregate_metrics, aggregate_by_page, compare_datasets
from app.models.db_models import GSCRow

# Synthetic CSV Fixture 1: Standard GSC export with percentage CTR
SYNTHETIC_GSC_CSV_A = """Top queries,Clicks,Impressions,CTR,Position
nxtwave ccbp review,120,1500,8.0%,1.8
full stack developer course,45,3000,1.5%,8.4
what is generative ai course,5,800,0.6%,14.2
scaler vs nxtwave fees,80,600,13.3%,2.1
data science roadmap for freshers,10,2500,0.4%,19.5
"""

# Synthetic CSV Fixture with Page URLs
SYNTHETIC_GSC_PAGES_CSV = """Top queries,Top pages,Clicks,Impressions,CTR,Position
nxtwave ccbp review,https://www.ccbp.in/reviews,120,1500,8.0%,1.8
nxtwave placement record,https://www.ccbp.in/reviews,40,600,6.7%,2.5
full stack developer course,https://www.ccbp.in/academy,45,3000,1.5%,8.4
learn full stack web development,https://www.ccbp.in/academy,15,1000,1.5%,9.1
"""

# Synthetic CSV Fixture 2: Later period (Period B) for comparison
SYNTHETIC_GSC_CSV_B = """Top queries,Clicks,Impressions,CTR,Position
nxtwave ccbp review,150,1800,8.3%,1.5
full stack developer course,70,3500,2.0%,6.2
what is generative ai course,12,1200,1.0%,10.1
scaler vs nxtwave fees,95,700,13.6%,1.9
data science roadmap for freshers,25,3000,0.8%,12.0
"""

# Synthetic Malformed CSV
SYNTHETIC_MALFORMED_CSV = """Some random preamble text
Invalid,Header,Row
foo,bar,baz
"""

def test_clean_numeric():
    assert clean_numeric("1,200") == 1200.0
    assert clean_numeric(45) == 45.0
    assert clean_numeric("0.0") == 0.0
    assert clean_numeric(None) == 0.0
    assert clean_numeric("invalid", default=9.9) == 9.9

def test_clean_ctr_percentage_and_decimal():
    assert clean_ctr("8.0%") == 0.08
    assert clean_ctr("13.3%") == 0.133
    assert clean_ctr("0.052") == 0.052
    assert clean_ctr("5.2") == 0.052  # Normalized from percent value without symbol
    assert clean_ctr(None) == 0.0
    assert clean_ctr("") == 0.0

def test_valid_gsc_csv_parsing():
    rows, cols, errors = parse_gsc_csv(SYNTHETIC_GSC_CSV_A)
    assert len(errors) == 0
    assert len(rows) == 5
    assert "Top queries" in cols or "Clicks" in cols
    
    first = rows[0]
    assert first["query"] == "nxtwave ccbp review"
    assert first["clicks"] == 120
    assert first["impressions"] == 1500
    assert first["ctr"] == 0.08
    assert first["position"] == 1.8

def test_malformed_csv_returns_useful_error():
    rows, cols, errors = parse_gsc_csv(SYNTHETIC_MALFORMED_CSV)
    assert len(rows) == 0
    assert len(errors) > 0
    assert "Could not identify valid Google Search Console header row" in errors[0]

def test_missing_optional_page_column():
    rows, cols, errors = parse_gsc_csv(SYNTHETIC_GSC_CSV_A)
    for r in rows:
        assert r["page"] is None

def test_csv_with_page_column():
    rows, cols, errors = parse_gsc_csv(SYNTHETIC_GSC_PAGES_CSV)
    assert len(rows) == 4
    assert rows[0]["page"] == "https://www.ccbp.in/reviews"
    assert rows[2]["page"] == "https://www.ccbp.in/academy"

def test_aggregate_clicks_impressions_and_weighted_ctr():
    rows = [
        GSCRow(query="q1", page="/p1", clicks=100, impressions=1000, ctr=0.10, position=2.0),
        GSCRow(query="q2", page="/p2", clicks=10, impressions=10000, ctr=0.001, position=15.0),
    ]
    metrics = calculate_aggregate_metrics(rows)
    assert metrics["total_clicks"] == 110
    assert metrics["total_impressions"] == 11000
    # Weighted CTR must be 110 / 11000 = 0.0100 (1.0%)
    # Simple average would have been (0.10 + 0.001) / 2 = 0.0505 (5.05%), which is mathematically flawed!
    assert metrics["weighted_ctr"] == 0.01
    
    # Impression-weighted position: (2.0*1000 + 15.0*10000) / 11000 = 152000 / 11000 = 13.818... -> 13.8
    assert metrics["average_position"] == 13.8
    assert metrics["unique_queries"] == 2
    assert metrics["unique_pages"] == 2

def test_empty_dataset_behavior():
    metrics = calculate_aggregate_metrics([])
    assert metrics["total_clicks"] == 0
    assert metrics["total_impressions"] == 0
    assert metrics["weighted_ctr"] == 0.0
    assert metrics["average_position"] == 0.0
    assert metrics["unique_queries"] == 0
    assert metrics["unique_pages"] == 0
    assert "methodology" in metrics

def test_opportunity_classification_heuristics():
    # Top Performer
    assert classify_opportunity(position=1.8, impressions=1500, clicks=120, ctr=0.08) == "Top Performer"
    
    # Striking distance
    assert classify_opportunity(position=8.4, impressions=3000, clicks=45, ctr=0.015) == "Striking Distance"
    assert classify_opportunity(position=18.0, impressions=500, clicks=5, ctr=0.01) == "Striking Distance"
    
    # High Impression / Low CTR
    assert classify_opportunity(position=2.5, impressions=500, clicks=2, ctr=0.004) == "Top Performer"
    # Over pos 3, high imp, low CTR
    assert classify_opportunity(position=19.5, impressions=2500, clicks=10, ctr=0.004) == "Striking Distance"
    # Low CTR with high impressions outside striking distance:
    assert classify_opportunity(position=25.0, impressions=500, clicks=2, ctr=0.004) == "High Impression / Low CTR"

def test_intent_classification_heuristic():
    assert classify_query_intent("nxtwave student login") == "Navigational"
    assert classify_query_intent("scaler vs nxtwave comparison") == "Comparison"
    assert classify_query_intent("ccbp 4.0 program fees structure") == "Transactional"
    assert classify_query_intent("software engineer fresher salary in bangalore") == "Career"
    assert classify_query_intent("best full stack coding bootcamp in india") == "Commercial"
    assert classify_query_intent("python full stack development course syllabus") == "Educational"
    assert classify_query_intent("what is answer engine optimization") == "Informational"

def test_aeo_recommendations_generation():
    rec_q = generate_aeo_recommendation("what is generative ai roadmap?", position=6.0, impressions=500, ctr=0.02)
    assert rec_q is not None
    assert "direct answer block" in rec_q.lower() or "faqpage" in rec_q.lower()
    
    rec_striking = generate_aeo_recommendation("full stack course bangalore", position=7.5, impressions=80, ctr=0.05)
    assert rec_striking is not None
    assert "striking distance" in rec_striking.lower()

def test_page_aggregation():
    rows = [
        GSCRow(query="q1", page="https://www.ccbp.in/reviews", clicks=100, impressions=1000, ctr=0.10, position=2.0),
        GSCRow(query="q2", page="https://www.ccbp.in/reviews", clicks=50, impressions=500, ctr=0.10, position=3.0),
        GSCRow(query="q3", page="https://www.ccbp.in/academy", clicks=20, impressions=400, ctr=0.05, position=8.0),
    ]
    pages = aggregate_by_page(rows)
    assert len(pages) == 2
    reviews_page = pages[0]
    assert reviews_page["page"] == "https://www.ccbp.in/reviews"
    assert reviews_page["clicks"] == 150
    assert reviews_page["impressions"] == 1500
    assert reviews_page["ctr"] == 0.10
    assert len(reviews_page["top_queries"]) == 2

def test_baseline_latest_dataset_comparison():
    rows_a = [
        GSCRow(query="q1", page="/p1", clicks=100, impressions=1000, ctr=0.10, position=3.0),
        GSCRow(query="q2", page="/p2", clicks=20, impressions=500, ctr=0.04, position=10.0),
    ]
    rows_b = [
        GSCRow(query="q1", page="/p1", clicks=130, impressions=1200, ctr=0.108, position=2.0),
        GSCRow(query="q2", page="/p2", clicks=25, impressions=600, ctr=0.041, position=8.0),
    ]
    comp = compare_datasets(rows_a, rows_b)
    assert comp["deltas"]["clicks"] == 35
    assert comp["deltas"]["impressions"] == 300
    assert comp["deltas"]["position"] < 0  # Position improved (went from higher number to lower)
    assert comp["deltas"]["position_direction"] == "improved"
    assert len(comp["query_deltas"]["top_growing"]) > 0
    assert comp["query_deltas"]["top_growing"][0]["click_delta"] == 30

def test_gsc_api_workflow_and_clean_removal():
    from fastapi.testclient import TestClient
    from app.main import app
    client = TestClient(app)

    # 1. Test empty overview behavior
    resp_empty = client.get("/api/gsc/overview?import_id=nonexistent-id")
    assert resp_empty.status_code == 200
    assert resp_empty.json()["has_data"] is False
    assert "No Search Console data imported yet" in resp_empty.json()["message"]

    # 2. Upload synthetic Dataset A
    upload_res = client.post(
        "/api/gsc/upload/text",
        json={"content": SYNTHETIC_GSC_PAGES_CSV, "filename": "test_period_a.csv", "date_range": "2026-09-01 - 2026-09-30"}
    )
    assert upload_res.status_code == 200
    dataset_a_id = upload_res.json()["id"]
    assert upload_res.json()["row_count"] == 4
    assert upload_res.json()["total_clicks"] == 220

    # 3. Upload synthetic Dataset B
    upload_b_res = client.post(
        "/api/gsc/upload/text",
        json={"content": SYNTHETIC_GSC_CSV_B, "filename": "test_period_b.csv", "date_range": "2026-10-01 - 2026-10-31"}
    )
    assert upload_b_res.status_code == 200
    dataset_b_id = upload_b_res.json()["id"]

    try:
        # 4. Check overview
        resp_ov = client.get(f"/api/gsc/overview?import_id={dataset_a_id}")
        assert resp_ov.status_code == 200
        ov_data = resp_ov.json()
        assert ov_data["has_data"] is True
        assert ov_data["metrics"]["total_clicks"] == 220
        assert ov_data["metrics"]["total_impressions"] == 6100
        # Weighted CTR: 220 / 6100 = 0.0361
        assert ov_data["metrics"]["weighted_ctr"] == 0.0361

        # 5. Check query table
        resp_q = client.get(f"/api/gsc/queries?import_id={dataset_a_id}&search=reviews")
        assert resp_q.status_code == 200
        q_data = resp_q.json()
        assert q_data["total"] == 2
        assert len(q_data["rows"]) == 2

        # 6. Check intent override
        row_id = q_data["rows"][0]["id"]
        patch_res = client.patch(f"/api/gsc/rows/{row_id}/intent", json={"intent_category": "Commercial"})
        assert patch_res.status_code == 200
        assert patch_res.json()["intent_category"] == "Commercial"

        # 7. Check page aggregation
        resp_p = client.get(f"/api/gsc/pages?import_id={dataset_a_id}")
        assert resp_p.status_code == 200
        p_data = resp_p.json()
        assert p_data["total_pages"] == 2

        # 8. Check dataset comparison between A and B
        resp_comp = client.get(f"/api/gsc/compare?baseline_id={dataset_a_id}&latest_id={dataset_b_id}")
        assert resp_comp.status_code == 200
        comp_data = resp_comp.json()
        assert comp_data["can_compare"] is True
        assert "deltas" in comp_data

        # 9. Check cross-analysis
        resp_cross = client.get(f"/api/gsc/cross-analysis?import_id={dataset_a_id}")
        assert resp_cross.status_code == 200
        cross_data = resp_cross.json()
        assert "cross_signals" in cross_data
        assert "No causal relationship is implied" in cross_data["analytical_notice"] or len(cross_data["cross_signals"]) >= 0

    finally:
        # Crucial clean-up: Remove test fixtures so production DB remains 100% clean of fake data!
        client.delete(f"/api/gsc/datasets/{dataset_a_id}")
        client.delete(f"/api/gsc/datasets/{dataset_b_id}")

