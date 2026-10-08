from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.db_models import (
    Brand, SearchQuery, VisibilityRun, BrandVisibilityObservation, CitationObservation
)

def calculate_benchmark_metrics(db: Session, include_sample: bool = True) -> Dict[str, Any]:
    # 1. Fetch active brands and queries
    brands = db.query(Brand).filter(Brand.active == 1).all()
    queries = db.query(SearchQuery).filter(SearchQuery.active == 1).all()
    
    # Filter runs
    query_runs = db.query(VisibilityRun).filter(VisibilityRun.status == "success")
    if not include_sample:
        query_runs = query_runs.filter(VisibilityRun.is_sample == 0)
        
    runs = query_runs.all()
    total_runs = len(runs)
    run_ids = [r.id for r in runs]
    
    # Check if data contains only sample data
    is_all_sample = (total_runs > 0 and all(r.is_sample == 1 for r in runs))
    has_real_data = (total_runs > 0 and any(r.is_sample == 0 for r in runs))
    
    # Distinct intent categories
    all_categories = sorted(list(set(q.intent_category for q in queries)))
    total_categories = len(all_categories)
    
    # Query map for quick lookup
    query_intent_map = {q.id: q.intent_category for q in queries}
    
    # Total citations
    total_citations_count = db.query(CitationObservation).filter(CitationObservation.run_id.in_(run_ids)).count() if run_ids else 0
    
    brand_metrics = []
    
    for b in brands:
        if total_runs == 0:
            brand_metrics.append({
                "brand_id": b.id,
                "name": b.name,
                "domain": b.domain,
                "is_target": bool(b.is_target),
                "mention_rate": 0.0,
                "mention_rate_pct": "0.0%",
                "total_mentions": 0,
                "avg_first_mention_pos": None,
                "avg_prominence_score": 0.0,
                "citation_count": 0,
                "citation_domain_share_pct": "0.0%",
                "query_coverage": 0,
                "query_coverage_pct": "0.0%",
                "provider_breakdown": {}
            })
            continue

        # Observations for this brand
        b_obs = db.query(BrandVisibilityObservation).filter(
            BrandVisibilityObservation.run_id.in_(run_ids),
            BrandVisibilityObservation.brand_id == b.id
        ).all()
        
        mentioned_obs = [o for o in b_obs if o.mentioned == 1]
        mentions_count = len(mentioned_obs)
        mention_rate = round(mentions_count / total_runs, 3)
        
        # Avg position
        if mentioned_obs:
            avg_pos = int(sum(o.first_mention_position for o in mentioned_obs) / len(mentioned_obs))
            avg_prom = round(sum(o.prominence_score for o in mentioned_obs) / len(mentioned_obs), 3)
        else:
            avg_pos = None
            avg_prom = 0.0
            
        # Citation count for brand
        b_citations_count = db.query(CitationObservation).filter(
            CitationObservation.run_id.in_(run_ids),
            CitationObservation.brand_id == b.id
        ).count()
        
        cit_share = round((b_citations_count / max(total_citations_count, 1)) * 100, 1) if total_citations_count > 0 else 0.0
        
        # Query coverage (unique intent categories where brand was mentioned)
        mentioned_run_ids = set(o.run_id for o in mentioned_obs)
        mentioned_intents = set()
        for r in runs:
            if r.id in mentioned_run_ids:
                intent = query_intent_map.get(r.query_id)
                if intent:
                    mentioned_intents.add(intent)
                    
        coverage_count = len(mentioned_intents)
        coverage_pct = round((coverage_count / max(total_categories, 1)) * 100, 1)
        
        # Provider breakdown
        provider_stats = {}
        for p_name in ["openai", "gemini", "perplexity", "manual"]:
            p_runs = [r for r in runs if r.provider == p_name]
            if p_runs:
                p_run_ids = set(r.id for r in p_runs)
                p_mentions = sum(1 for o in mentioned_obs if o.run_id in p_run_ids)
                provider_stats[p_name] = {
                    "total_runs": len(p_runs),
                    "mentions": p_mentions,
                    "rate": round(p_mentions / len(p_runs), 2)
                }
            else:
                provider_stats[p_name] = {"total_runs": 0, "mentions": 0, "rate": 0.0}

        brand_metrics.append({
            "brand_id": b.id,
            "name": b.name,
            "domain": b.domain,
            "is_target": bool(b.is_target),
            "mention_rate": mention_rate,
            "mention_rate_pct": f"{round(mention_rate * 100, 1)}%",
            "total_mentions": mentions_count,
            "avg_first_mention_pos": avg_pos,
            "avg_prominence_score": avg_prom,
            "citation_count": b_citations_count,
            "citation_domain_share_pct": f"{cit_share}%",
            "query_coverage": coverage_count,
            "query_coverage_pct": f"{coverage_pct}%",
            "provider_breakdown": provider_stats
        })

    # Sort so target brand (NxtWave) is first, then by mention rate descending
    brand_metrics.sort(key=lambda x: (not x["is_target"], -x["mention_rate"]))

    # Overview summary stats
    providers_tested = sorted(list(set(r.provider for r in runs)))
    last_run_time = max((r.executed_at for r in runs), default=None)
    
    # Target brand metric
    target_metric = next((m for m in brand_metrics if m["is_target"]), brand_metrics[0] if brand_metrics else None)

    return {
        "summary": {
            "total_queries": len(queries),
            "successful_runs": total_runs,
            "providers_tested": providers_tested,
            "total_citations_observed": total_citations_count,
            "last_run_timestamp": last_run_time.isoformat() if last_run_time else None,
            "is_sample_data": is_all_sample,
            "has_real_observations": has_real_data,
            "data_label": "Sample data (No API key set)" if is_all_sample else "Measured observations"
        },
        "target_brand": target_metric,
        "brands": brand_metrics
    }
