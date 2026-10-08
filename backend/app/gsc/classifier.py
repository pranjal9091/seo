import re
from typing import Dict, Any, Optional

def classify_query_intent(query: str) -> str:
    """
    Transparent rule-based heuristic for search intent classification.
    Labeled as 'Suggested Intent' in UI.
    """
    q = query.lower().strip()
    
    # Comparison (highest priority when comparison terms appear)
    if any(k in q for k in [" vs ", " versus ", "compare", "alternative", "difference between", " or "]):
        return "Comparison"
        
    # Transactional / Pricing
    if any(k in q for k in ["fees", "fee", "cost", "price", "pricing", "admission", "apply", "enroll", "discount", "emi", "scholarship"]):
        return "Transactional"
        
    # Career & Placement
    if any(k in q for k in ["placement", "salary", "job", "career", "package", "hiring", "fresher", "internship", "ctc", "lpa"]):
        return "Career"
        
    # Commercial Investigation
    if any(k in q for k in ["best", "top", "review", "reviews", "ratings", "worth it", "good or bad"]):
        return "Commercial"
        
    # Educational
    if any(k in q for k in ["course", "bootcamp", "training", "curriculum", "syllabus", "degree", "program", "certificate", "certification"]):
        return "Educational"

    # Informational
    if any(q.startswith(w) for w in ["what", "how", "why", "who", "when", "which", "is", "can", "does"]) or any(k in q for k in ["guide", "roadmap", "tutorial", "learn"]):
        return "Informational"

    # Navigational (brand without transactional/comparison intent or portal/login)
    if any(b in q for b in ["nxtwave", "scaler", "masai", "pw skills", "upgrad", "login", "portal", "website"]):
        return "Navigational"
        
    return "Other"

def classify_opportunity(position: float, impressions: int, clicks: int, ctr: float) -> str:
    """
    Deterministic internal opportunity heuristics (NOT Google ranking categories).
    """
    if position <= 3.0 and clicks > 0:
        return "Top Performer"
        
    if 4.0 <= position <= 20.0:
        return "Striking Distance"
        
    if impressions >= 100 and ctr < 0.03:
        return "High Impression / Low CTR"
        
    if position > 20.0 and impressions >= 50:
        return "Long Tail Demand"
        
    return "Standard"

def generate_aeo_recommendation(query: str, position: float, impressions: int, ctr: float) -> Optional[str]:
    """
    Suggests AEO / content optimization recommendations for GSC queries.
    """
    q = query.lower().strip()
    is_question = q.endswith("?") or any(q.startswith(w) for w in ["what", "how", "why", "which", "is", "can"])
    is_comparison = " vs " in q or "compare" in q or "alternative" in q
    
    if is_question or is_comparison:
        return "Candidate for AEO direct answer block. Structure a 40–60 word concise paragraph and FAQPage schema."
        
    if impressions >= 100 and ctr < 0.03:
        return "High search demand with weak CTR. Refine title tag and meta description to directly match search intent."
        
    if 4.0 <= position <= 15.0:
        return "Striking distance position. Deepen topical coverage, add verified statistics, and optimize internal links."
        
    return None
