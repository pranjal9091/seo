import pytest
from app.storage.db import SessionLocal, init_db
from app.visibility.detector import detect_brands_in_text, extract_citations_from_text, normalize_domain
from app.visibility.providers.registry import get_provider, list_providers_status
from app.visibility.providers.manual_provider import ManualProvider
from app.visibility.seed import seed_database_defaults, BENCHMARK_BRANDS
from app.visibility.metrics import calculate_benchmark_metrics
from app.models.db_models import Brand, SearchQuery, VisibilityRun, BrandVisibilityObservation, CitationObservation

@pytest.fixture(scope="module")
def db_session():
    init_db()
    db = SessionLocal()
    seed_database_defaults(db)
    yield db
    db.close()

def test_query_library_and_brands_seeded(db_session):
    brands = db_session.query(Brand).all()
    queries = db_session.query(SearchQuery).all()
    assert len(brands) >= 5
    brand_ids = [b.id for b in brands]
    assert "nxtwave" in brand_ids
    assert "scaler" in brand_ids
    assert "masai" in brand_ids
    assert "pwskills" in brand_ids
    assert "upgrad" in brand_ids
    assert len(queries) >= 30

def test_brand_detection_case_insensitivity_and_aliases():
    sample_text = (
        "For freshers, CCBP 4.0 by NxtWave offers a structured roadmap. "
        "Alternatively, Scaler Academy is suitable for senior DSA prep, "
        "while physics wallah skills provides budget foundations."
    )
    detections = detect_brands_in_text(sample_text, BENCHMARK_BRANDS)
    
    det_map = {d["brand_id"]: d for d in detections}
    
    # NxtWave should be detected via both CCBP and NxtWave
    assert det_map["nxtwave"]["mentioned"] == 1
    assert det_map["nxtwave"]["mention_count"] >= 2
    assert det_map["nxtwave"]["first_mention_position"] >= 0
    assert det_map["nxtwave"]["prominence_score"] > 0.8
    
    # Scaler
    assert det_map["scaler"]["mentioned"] == 1
    
    # PW Skills detected via alias "physics wallah skills"
    assert det_map["pwskills"]["mentioned"] == 1
    
    # upGrad should NOT be mentioned
    assert det_map["upgrad"]["mentioned"] == 0
    assert det_map["upgrad"]["first_mention_position"] == -1
    assert det_map["upgrad"]["prominence_score"] == 0.0

def test_first_mention_position_prominence_calculation():
    text = "Scaler is mentioned first. Later on, NxtWave appears."
    detections = detect_brands_in_text(text, BENCHMARK_BRANDS)
    det_map = {d["brand_id"]: d for d in detections}
    
    assert det_map["scaler"]["first_mention_position"] < det_map["nxtwave"]["first_mention_position"]
    assert det_map["scaler"]["prominence_score"] > det_map["nxtwave"]["prominence_score"]

def test_citation_url_normalization_and_mapping():
    text = "Learn more at https://www.scaler.com/blog/dsa and https://nxtwave.co.in/programs."
    citations = extract_citations_from_text(text, brands=BENCHMARK_BRANDS)
    
    domains = [c["domain"] for c in citations]
    assert "scaler.com" in domains
    assert "nxtwave.co.in" in domains
    
    c_map = {c["domain"]: c for c in citations}
    assert c_map["scaler.com"]["brand_id"] == "scaler"
    assert c_map["nxtwave.co.in"]["brand_id"] == "nxtwave"

def test_provider_registry_and_unconfigured_state():
    providers = list_providers_status()
    assert len(providers) >= 4
    
    openai_p = get_provider("openai")
    assert openai_p is not None
    # If no key in env, should report not configured
    if not openai_p.is_configured():
        assert "Not configured" in [p["status_label"] for p in providers if p["id"] == "openai"][0]

def test_manual_provider_import_processing(db_session):
    manual_p = ManualProvider()
    assert manual_p.is_configured() is True
    
    raw_response = (
        "Comparing bootcamps in India: Masai School operates an ISA model. "
        "NxtWave focuses on 4.0 skills for B.Tech students. Scaler is for FAANG prep."
    )
    result = manual_p.process_manual_input(raw_response, source_provider_label="Manual / Claude")
    assert result.status == "success"
    assert result.is_manual is True
    assert result.raw_response == raw_response

def test_metrics_calculation_and_zero_runs_handling(db_session):
    metrics = calculate_benchmark_metrics(db_session)
    assert "summary" in metrics
    assert "brands" in metrics
    assert len(metrics["brands"]) >= 5
    
    # Target brand should be identified
    target = metrics["target_brand"]
    assert target is not None
    assert target["name"] == "NxtWave"
    assert "mention_rate" in target
    assert "query_coverage" in target

def test_missing_citations_handling():
    text_without_urls = "A response discussing coding bootcamps without any hyperlinks or references."
    citations = extract_citations_from_text(text_without_urls)
    assert len(citations) == 0
