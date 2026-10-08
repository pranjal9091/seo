import math
from typing import List, Dict, Any, Optional
from collections import defaultdict
from app.models.db_models import GSCRow, SearchQuery, VisibilityRun, BrandVisibilityObservation, Brand
from sqlalchemy.orm import Session
from sqlalchemy import func

def calculate_aggregate_metrics(rows: List[GSCRow]) -> Dict[str, Any]:
    """
    Calculates aggregate metrics using mathematically correct methodologies.
    Aggregate CTR = total_clicks / total_impressions (weighted CTR).
    Average Position = sum(position * impressions) / total_impressions (impression-weighted).
    """
    if not rows:
        return {
            "total_clicks": 0,
            "total_impressions": 0,
            "weighted_ctr": 0.0,
            "average_position": 0.0,
            "unique_queries": 0,
            "unique_pages": 0,
            "methodology": {
                "ctr_method": "Weighted CTR: sum(clicks) / sum(impressions)",
                "position_method": "Impression-weighted Average Position: sum(position * impressions) / sum(impressions)",
                "data_integrity": "Measured Search Console data only. Zero fabricated or estimated metrics."
            }
        }

    total_clicks = sum(r.clicks for r in rows)
    total_impressions = sum(r.impressions for r in rows)
    
    # Mathematically sound weighted CTR
    if total_impressions > 0:
        weighted_ctr = round(total_clicks / total_impressions, 4)
        weighted_position = round(
            sum(r.position * r.impressions for r in rows) / total_impressions, 1
        )
    else:
        weighted_ctr = 0.0
        weighted_position = round(sum(r.position for r in rows) / len(rows), 1)

    unique_queries = len(set(r.query for r in rows if r.query))
    unique_pages = len(set(r.page for r in rows if r.page))

    return {
        "total_clicks": total_clicks,
        "total_impressions": total_impressions,
        "weighted_ctr": weighted_ctr,
        "average_position": weighted_position,
        "unique_queries": unique_queries,
        "unique_pages": unique_pages,
        "methodology": {
            "ctr_method": "Weighted CTR: sum(clicks) / sum(impressions). Avoids distortion caused by arithmetic averaging of percentage rates.",
            "position_method": "Impression-weighted Average Position: sum(position * impressions) / sum(impressions). Accurately weights keywords with major search volume.",
            "data_integrity": "Derived exclusively from verified Google Search Console CSV imports. Zero modeled or fabricated traffic."
        }
    }

def aggregate_by_page(rows: List[GSCRow]) -> List[Dict[str, Any]]:
    """
    Aggregates metrics by Page URL.
    Returns page metrics and associates top queries with each page.
    """
    page_map = defaultdict(lambda: {
        "page": "",
        "clicks": 0,
        "impressions": 0,
        "weighted_pos_sum": 0.0,
        "queries": []
    })

    for r in rows:
        page_key = r.page if r.page else "[Unspecified Landing Page]"
        entry = page_map[page_key]
        entry["page"] = page_key
        entry["clicks"] += r.clicks
        entry["impressions"] += r.impressions
        entry["weighted_pos_sum"] += (r.position * r.impressions)
        entry["queries"].append({
            "query": r.query,
            "clicks": r.clicks,
            "impressions": r.impressions,
            "ctr": r.ctr,
            "position": r.position,
            "intent": r.intent_category or "Other",
            "opportunity": r.opportunity_type or "Standard"
        })

    results = []
    for page_url, data in page_map.items():
        total_imp = data["impressions"]
        clicks = data["clicks"]
        weighted_ctr = round(clicks / total_imp, 4) if total_imp > 0 else 0.0
        avg_pos = round(data["weighted_pos_sum"] / total_imp, 1) if total_imp > 0 else (
            round(sum(q["position"] for q in data["queries"]) / len(data["queries"]), 1) if data["queries"] else 0.0
        )
        
        # Sort queries by clicks descending
        sorted_queries = sorted(data["queries"], key=lambda q: (q["clicks"], q["impressions"]), reverse=True)
        
        results.append({
            "page": page_url,
            "clicks": clicks,
            "impressions": total_imp,
            "ctr": weighted_ctr,
            "position": avg_pos,
            "query_count": len(data["queries"]),
            "top_queries": sorted_queries[:10],
            "all_queries": sorted_queries
        })

    # Sort pages by clicks descending
    return sorted(results, key=lambda p: (p["clicks"], p["impressions"]), reverse=True)

def compare_datasets(baseline_rows: List[GSCRow], latest_rows: List[GSCRow]) -> Dict[str, Any]:
    """
    Compares Baseline (Dataset A) vs Latest (Dataset B).
    Calculates measured absolute and percentage deltas.
    Never fabricates values if only one dataset exists.
    """
    baseline_metrics = calculate_aggregate_metrics(baseline_rows)
    latest_metrics = calculate_aggregate_metrics(latest_rows)

    click_delta = latest_metrics["total_clicks"] - baseline_metrics["total_clicks"]
    imp_delta = latest_metrics["total_impressions"] - baseline_metrics["total_impressions"]
    ctr_delta = round(latest_metrics["weighted_ctr"] - baseline_metrics["weighted_ctr"], 4)
    # Position: negative delta is an improvement (lower rank number)
    pos_delta = round(latest_metrics["average_position"] - baseline_metrics["average_position"], 1)

    click_pct = round((click_delta / baseline_metrics["total_clicks"]) * 100, 1) if baseline_metrics["total_clicks"] > 0 else None
    imp_pct = round((imp_delta / baseline_metrics["total_impressions"]) * 100, 1) if baseline_metrics["total_impressions"] > 0 else None

    # Compare query performance changes
    baseline_query_map = {r.query.lower().strip(): r for r in baseline_rows if r.query}
    latest_query_map = {r.query.lower().strip(): r for r in latest_rows if r.query}

    query_deltas = []
    for q_clean, l_row in latest_query_map.items():
        if q_clean in baseline_query_map:
            b_row = baseline_query_map[q_clean]
            c_delta = l_row.clicks - b_row.clicks
            i_delta = l_row.impressions - b_row.impressions
            p_delta = round(l_row.position - b_row.position, 1)
            query_deltas.append({
                "query": l_row.query,
                "baseline_clicks": b_row.clicks,
                "latest_clicks": l_row.clicks,
                "click_delta": c_delta,
                "baseline_impressions": b_row.impressions,
                "latest_impressions": l_row.impressions,
                "impression_delta": i_delta,
                "baseline_position": b_row.position,
                "latest_position": l_row.position,
                "position_delta": p_delta
            })

    # Sort growing vs declining
    top_growing = sorted(query_deltas, key=lambda x: x["click_delta"], reverse=True)[:5]
    top_declining = sorted(query_deltas, key=lambda x: x["click_delta"])[:5]

    return {
        "baseline": baseline_metrics,
        "latest": latest_metrics,
        "deltas": {
            "clicks": click_delta,
            "clicks_pct": click_pct,
            "impressions": imp_delta,
            "impressions_pct": imp_pct,
            "ctr": ctr_delta,
            "position": pos_delta,
            "position_direction": "improved" if pos_delta < 0 else ("declined" if pos_delta > 0 else "unchanged")
        },
        "query_deltas": {
            "top_growing": top_growing,
            "top_declining": top_declining,
            "matched_queries_count": len(query_deltas)
        },
        "methodology": "Comparative delta calculated strictly between two uploaded Search Console snapshots. Zero interpolation."
    }

def cross_analyze_with_geo(gsc_rows: List[GSCRow], db: Session) -> Dict[str, Any]:
    """
    Connects existing AI visibility observations with GSC search demand.
    Explicitly maintains data separation: DOES NOT IMPLY CAUSATION.
    """
    # Fetch target brand
    target_brand = db.query(Brand).filter(Brand.is_target == 1).first()
    target_brand_id = target_brand.id if target_brand else "nxtwave"

    # Fetch all AI search queries
    ai_queries = db.query(SearchQuery).all()
    ai_query_map = {q.question.lower().strip(): q for q in ai_queries}

    # Fetch all visibility runs and their observations
    runs = db.query(VisibilityRun).all()
    run_map = {r.id: r for r in runs}

    obs_list = db.query(BrandVisibilityObservation).filter(BrandVisibilityObservation.brand_id == target_brand_id).all()
    
    # Map observations by query_id
    obs_by_query_id = defaultdict(list)
    for obs in obs_list:
        run = run_map.get(obs.run_id)
        if run:
            obs_by_query_id[run.query_id].append(obs)

    matched = []
    gsc_unmatched_demand = []

    # Map GSC rows by normalized query
    for r in gsc_rows:
        if not r.query:
            continue
        q_norm = r.query.lower().strip()
        
        # Check direct or fuzzy inclusion
        matched_ai_q = None
        if q_norm in ai_query_map:
            matched_ai_q = ai_query_map[q_norm]
        else:
            # Check if any AI query contains or is contained in this GSC query
            for ai_text, ai_obj in ai_query_map.items():
                if ai_text in q_norm or q_norm in ai_text:
                    matched_ai_q = ai_obj
                    break

        if matched_ai_q:
            # Get AI visibility observations for this query
            q_obs = obs_by_query_id.get(matched_ai_q.id, [])
            mentions = sum(1 for o in q_obs if o.mentioned == 1)
            total_checks = len(q_obs)
            
            visibility_status = "Unchecked in GEO"
            if total_checks > 0:
                visibility_status = f"Mentioned in {mentions}/{total_checks} AI Engine Runs" if mentions > 0 else f"0/{total_checks} Mentions"

            matched.append({
                "query": r.query,
                "gsc_clicks": r.clicks,
                "gsc_impressions": r.impressions,
                "gsc_position": r.position,
                "gsc_ctr": r.ctr,
                "geo_query_category": matched_ai_q.intent_category,
                "geo_visibility_status": visibility_status,
                "geo_observations_count": total_checks,
                "disclaimer": "These datasets represent distinct search signals: Google organic demand vs Generative AI engine visibility. No causal relationship is implied."
            })
        else:
            if r.impressions >= 50 or r.clicks >= 5:
                gsc_unmatched_demand.append({
                    "query": r.query,
                    "clicks": r.clicks,
                    "impressions": r.impressions,
                    "position": r.position,
                    "intent": r.intent_category or "Other"
                })

    # Sort by organic impressions descending
    matched_sorted = sorted(matched, key=lambda x: (x["gsc_impressions"], x["gsc_clicks"]), reverse=True)
    unmatched_sorted = sorted(gsc_unmatched_demand, key=lambda x: (x["impressions"], x["clicks"]), reverse=True)[:15]

    return {
        "matched_count": len(matched),
        "total_gsc_queries": len(gsc_rows),
        "total_geo_library_queries": len(ai_queries),
        "cross_signals": matched_sorted,
        "high_demand_not_in_geo_tracker": unmatched_sorted,
        "analytical_notice": "Google Search Console measures user search demand and click-throughs on Google SERPs. GEO observations measure synthetic LLM citation presence. They are complementary visibility vectors."
    }
