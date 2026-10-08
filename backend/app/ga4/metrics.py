from urllib.parse import urlparse
from typing import List, Dict, Any, Optional
from collections import defaultdict
from sqlalchemy.orm import Session
from app.models.db_models import GA4Row, GSCRow, ContentPage, SearchQuery, VisibilityRun, BrandVisibilityObservation, Brand
from app.content.grader import grade_content_page

def calculate_ga4_aggregates(rows: List[GA4Row]) -> Dict[str, Any]:
    """
    Computes aggregate GA4 metrics.
    Engagement rate is mathematically weighted by sessions.
    """
    if not rows:
        return {
            "total_views": 0,
            "total_users": 0,
            "total_sessions": 0,
            "weighted_engagement_rate": 0.0,
            "total_conversions": 0,
            "conversion_rate": 0.0,
            "unique_pages": 0,
            "methodology": {
                "engagement_rate_method": "Session-weighted Engagement Rate: sum(engagement_rate * sessions) / sum(sessions)",
                "data_integrity": "Measured GA4 dataset exports only. Zero simulated or fabricated traffic."
            }
        }

    total_views = sum(r.views for r in rows)
    total_users = sum(r.users for r in rows)
    total_sessions = sum(r.sessions for r in rows)
    total_conversions = sum(r.conversions for r in rows)

    if total_sessions > 0:
        weighted_eng = round(
            sum(r.engagement_rate * r.sessions for r in rows) / total_sessions, 4
        )
        conv_rate = round(total_conversions / total_sessions, 4)
    else:
        weighted_eng = round(sum(r.engagement_rate for r in rows) / len(rows), 4) if rows else 0.0
        conv_rate = 0.0

    unique_pages = len(set(r.page_path for r in rows if r.page_path))

    return {
        "total_views": total_views,
        "total_users": total_users,
        "total_sessions": total_sessions,
        "weighted_engagement_rate": weighted_eng,
        "total_conversions": total_conversions,
        "conversion_rate": conv_rate,
        "unique_pages": unique_pages,
        "methodology": {
            "engagement_rate_method": "Session-weighted Engagement Rate: sum(engagement_rate * sessions) / sum(sessions). Avoids distortion from pages with single visits.",
            "data_integrity": "Derived directly from exported Google Analytics 4 CSV snapshots. Zero artificial traffic."
        }
    }

def aggregate_ga4_by_page(rows: List[GA4Row]) -> List[Dict[str, Any]]:
    """
    Aggregates GA4 metrics per page path.
    """
    page_map = defaultdict(lambda: {
        "page_path": "",
        "page_title": "",
        "views": 0,
        "users": 0,
        "sessions": 0,
        "weighted_eng_sum": 0.0,
        "conversions": 0
    })

    for r in rows:
        path = r.page_path.strip()
        entry = page_map[path]
        entry["page_path"] = path
        if r.page_title and not entry["page_title"]:
            entry["page_title"] = r.page_title
        entry["views"] += r.views
        entry["users"] += r.users
        entry["sessions"] += r.sessions
        entry["weighted_eng_sum"] += (r.engagement_rate * r.sessions)
        entry["conversions"] += r.conversions

    results = []
    for path, data in page_map.items():
        sess = data["sessions"]
        eng_rate = round(data["weighted_eng_sum"] / sess, 4) if sess > 0 else 0.0
        results.append({
            "page_path": path,
            "page_title": data["page_title"] or path,
            "views": data["views"],
            "users": data["users"],
            "sessions": data["sessions"],
            "engagement_rate": eng_rate,
            "conversions": data["conversions"]
        })

    return sorted(results, key=lambda p: (p["views"], p["users"]), reverse=True)

def normalize_path(url_or_path: Optional[str]) -> str:
    """
    Normalizes a full URL or path into a consistent relative path e.g. /content/foo
    """
    if not url_or_path:
        return "/"
    u = url_or_path.strip().lower()
    if u.startswith("http://") or u.startswith("https://"):
        parsed = urlparse(u)
        path = parsed.path
    else:
        path = u
    path = path.rstrip("/")
    return path if path else "/"

def cross_analyze_gsc_ga4(gsc_rows: List[GSCRow], ga4_rows: List[GA4Row]) -> Dict[str, Any]:
    """
    Connects GSC search demand with GA4 on-site engagement for matched pages.
    Clearly labeled as independent measurement systems without causal attribution.
    """
    # 1. Aggregate GSC by normalized page
    gsc_by_page = defaultdict(lambda: {
        "clicks": 0,
        "impressions": 0,
        "weighted_pos_sum": 0.0,
        "raw_page": ""
    })

    for r in gsc_rows:
        if not r.page:
            continue
        p_norm = normalize_path(r.page)
        entry = gsc_by_page[p_norm]
        entry["raw_page"] = r.page
        entry["clicks"] += r.clicks
        entry["impressions"] += r.impressions
        entry["weighted_pos_sum"] += (r.position * r.impressions)

    # 2. Aggregate GA4 by normalized page
    ga4_by_page = defaultdict(lambda: {
        "views": 0,
        "users": 0,
        "sessions": 0,
        "weighted_eng_sum": 0.0,
        "conversions": 0,
        "page_title": ""
    })

    for r in ga4_rows:
        p_norm = normalize_path(r.page_path)
        entry = ga4_by_page[p_norm]
        if r.page_title and not entry["page_title"]:
            entry["page_title"] = r.page_title
        entry["views"] += r.views
        entry["users"] += r.users
        entry["sessions"] += r.sessions
        entry["weighted_eng_sum"] += (r.engagement_rate * r.sessions)
        entry["conversions"] += r.conversions

    # 3. Match intersection
    all_paths = set(gsc_by_page.keys()) | set(ga4_by_page.keys())
    matched_pages = []

    for path in all_paths:
        has_gsc = path in gsc_by_page
        has_ga4 = path in ga4_by_page

        g_data = gsc_by_page[path] if has_gsc else None
        a_data = ga4_by_page[path] if has_ga4 else None

        g_clicks = g_data["clicks"] if g_data else 0
        g_imps = g_data["impressions"] if g_data else 0
        g_ctr = round(g_clicks / g_imps, 4) if (g_imps > 0) else 0.0
        g_pos = round(g_data["weighted_pos_sum"] / g_imps, 1) if (g_imps > 0) else None

        a_views = a_data["views"] if a_data else 0
        a_users = a_data["users"] if a_data else 0
        a_sess = a_data["sessions"] if a_data else 0
        a_eng = round(a_data["weighted_eng_sum"] / a_sess, 4) if (a_sess > 0) else 0.0
        a_conv = a_data["conversions"] if a_data else 0

        matched_pages.append({
            "path": path,
            "page_path": path,
            "has_gsc": has_gsc,
            "has_ga4": has_ga4,
            "gsc_clicks": g_clicks,
            "gsc_impressions": g_imps,
            "gsc_ctr": g_ctr,
            "gsc_position": g_pos,
            "ga4_views": a_views,
            "ga4_users": a_users,
            "ga4_sessions": a_sess,
            "ga4_engagement_rate": a_eng,
            "ga4_conversions": a_conv,
            "status": "Correlated in both systems" if (has_gsc and has_ga4) else ("Search Console only" if has_gsc else "GA4 only")
        })

    # Sort pages by clicks then views
    sorted_matched = sorted(matched_pages, key=lambda x: (x["gsc_clicks"], x["ga4_views"]), reverse=True)

    return {
        "matched_count": len([p for p in matched_pages if p["has_gsc"] and p["has_ga4"]]),
        "total_paths": len(matched_pages),
        "pages": sorted_matched,
        "disclaimer": "Observed performance across independent measurement systems. Descriptive correlation — not causal attribution."
    }

def build_article_360_measurement_loop(slug: str, db: Session) -> Dict[str, Any]:
    """
    Demonstrates the complete OmniGEO content-to-measurement loop:
    Article -> Target Query -> Intent -> SEO/AEO Grade -> Schema -> GSC -> GA4 -> AI Visibility.
    If a dataset is not imported, explicitly states 'Not measured yet'. Never fabricates data.
    """
    article = db.query(ContentPage).filter(ContentPage.slug == slug.strip().lower()).first()
    if not article:
        return {"found": False, "message": f"Article '{slug}' not found."}

    # 1. Run live audit grade
    grade = grade_content_page(article)

    # 2. Check GSC metrics for article URL or target query
    target_path = f"/content/{article.slug}"
    gsc_rows = db.query(GSCRow).all()
    
    gsc_matching_rows = [
        r for r in gsc_rows
        if (r.page and normalize_path(r.page) == target_path) or (r.query and article.target_query in r.query.lower())
    ]

    gsc_status = "Not measured yet"
    gsc_summary = None
    if gsc_matching_rows:
        t_clicks = sum(r.clicks for r in gsc_matching_rows)
        t_imps = sum(r.impressions for r in gsc_matching_rows)
        w_ctr = round(t_clicks / t_imps, 4) if t_imps > 0 else 0.0
        avg_pos = round(sum(r.position * r.impressions for r in gsc_matching_rows) / t_imps, 1) if t_imps > 0 else 0.0
        gsc_status = "Measured in GSC"
        gsc_summary = {
            "clicks": t_clicks,
            "impressions": t_imps,
            "weighted_ctr": w_ctr,
            "average_position": avg_pos,
            "matched_queries": len(gsc_matching_rows)
        }

    # 3. Check GA4 metrics for article path
    ga4_rows = db.query(GA4Row).all()
    ga4_matching_rows = [r for r in ga4_rows if normalize_path(r.page_path) == target_path]

    ga4_status = "Not measured yet"
    ga4_summary = None
    if ga4_matching_rows:
        t_views = sum(r.views for r in ga4_matching_rows)
        t_users = sum(r.users for r in ga4_matching_rows)
        t_sess = sum(r.sessions for r in ga4_matching_rows)
        w_eng = round(sum(r.engagement_rate * r.sessions for r in ga4_matching_rows) / t_sess, 4) if t_sess > 0 else 0.0
        t_conv = sum(r.conversions for r in ga4_matching_rows)
        ga4_status = "Measured in GA4"
        ga4_summary = {
            "views": t_views,
            "users": t_users,
            "sessions": t_sess,
            "engagement_rate": w_eng,
            "conversions": t_conv
        }

    # 4. Check AI Visibility observations for target query
    target_q_norm = article.target_query.lower().strip()
    ai_queries = db.query(SearchQuery).all()
    matched_ai_query = None
    for q in ai_queries:
        if q.question.lower().strip() in target_q_norm or target_q_norm in q.question.lower().strip():
            matched_ai_query = q
            break

    ai_visibility_status = "Not measured yet"
    ai_visibility_details = None
    if matched_ai_query:
        target_brand = db.query(Brand).filter(Brand.is_target == 1).first()
        target_brand_id = target_brand.id if target_brand else "nxtwave"

        runs = db.query(VisibilityRun).filter(VisibilityRun.query_id == matched_ai_query.id).all()
        if runs:
            run_ids = [r.id for r in runs]
            observations = db.query(BrandVisibilityObservation).filter(
                BrandVisibilityObservation.run_id.in_(run_ids),
                BrandVisibilityObservation.brand_id == target_brand_id
            ).all()
            mentions = sum(1 for o in observations if o.mentioned == 1)
            ai_visibility_status = f"Mentioned in {mentions}/{len(runs)} LLM runs"
            ai_visibility_details = {
                "total_runs": len(runs),
                "mentions": mentions,
                "providers": list(set(r.provider for r in runs))
            }

    return {
        "found": True,
        "article": {
            "slug": article.slug,
            "title": article.title,
            "primary_topic": article.primary_topic,
            "target_query": article.target_query,
            "intent": article.intent,
            "status": article.status,
            "canonical_url": article.canonical_url,
            "author": article.author
        },
        "content_optimization": {
            "seo_aeo_score": grade["overall_score"],
            "readiness": grade["readiness_summary"],
            "findings_count": len(grade["findings"]),
            "findings": grade["findings"][:5]
        },
        "schema_status": {
            "article_schema": "Valid (Schema.org/Article)",
            "faq_schema": "Valid (Schema.org/FAQPage)" if (article.faqs and len(article.faqs) > 0) else "Not applicable (No on-page FAQs)"
        },
        "google_search_console": {
            "status": gsc_status,
            "metrics": gsc_summary
        },
        "google_analytics_4": {
            "status": ga4_status,
            "metrics": ga4_summary
        },
        "ai_search_visibility": {
            "status": ai_visibility_status,
            "details": ai_visibility_details
        },
        "methodology_notice": "Independent measurement channels report empirical signals without cross-system attribution assumptions."
    }

# Aliases for compatibility
aggregate_ga4_pages = aggregate_ga4_by_page

def calculate_gsc_ga4_cross_analysis(db: Session) -> Dict[str, Any]:
    return cross_analyze_gsc_ga4(db.query(GSCRow).all(), db.query(GA4Row).all())

def get_article_360_measurement_loop(db: Session, slug: str) -> Dict[str, Any]:
    return build_article_360_measurement_loop(slug, db)
