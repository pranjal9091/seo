import re
from typing import List, Dict, Any, Optional, Tuple
from urllib.parse import urlparse

def normalize_domain(url: str) -> str:
    try:
        parsed = urlparse(url)
        netloc = parsed.netloc.lower()
        if netloc.startswith("www."):
            netloc = netloc[4:]
        return netloc or "unknown"
    except Exception:
        return "unknown"

def detect_brands_in_text(text: str, brands: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Scans text for brand names and aliases using word-boundary regex.
    Calculates mention count, first mention character position, and prominence score.
    
    Prominence Score Definition:
    1.0 - (first_mention_position / len(text)) rounded to 3 decimal places.
    A mention at character 0 gets 1.0 (highest prominence).
    A mention at the end of text gets ~0.0.
    """
    results = []
    text_len = len(text)
    
    for brand in brands:
        brand_id = brand["id"]
        aliases = brand.get("aliases", [brand["name"]])
        
        # Build regex with word boundaries for all aliases
        escaped_aliases = [re.escape(alias) for alias in aliases]
        pattern = re.compile(r"\b(" + "|".join(escaped_aliases) + r")\b", re.IGNORECASE)
        
        matches = list(pattern.finditer(text))
        mentioned = len(matches) > 0
        mention_count = len(matches)
        
        if mentioned:
            first_pos = matches[0].start()
            prominence = round(1.0 - (first_pos / max(text_len, 1)), 3)
        else:
            first_pos = -1
            prominence = 0.0
            
        results.append({
            "brand_id": brand_id,
            "mentioned": 1 if mentioned else 0,
            "mention_count": mention_count,
            "first_mention_position": first_pos,
            "prominence_score": prominence
        })
        
    return results

def extract_citations_from_text(text: str, explicit_urls: Optional[List[str]] = None, brands: Optional[List[Dict[str, Any]]] = None) -> List[Dict[str, Any]]:
    """
    Extracts URLs from text and explicit provider citations.
    Normalizes domain names and maps to known benchmark brands.
    """
    urls_found = set(explicit_urls or [])
    
    # URL extraction regex
    url_pattern = re.compile(r"https?://[^\s)\]>\"'\,]+", re.IGNORECASE)
    for match in url_pattern.finditer(text):
        cleaned_url = match.group(0).rstrip(".,;:!?)")
        urls_found.add(cleaned_url)
        
    citations = []
    for raw_url in urls_found:
        domain = normalize_domain(raw_url)
        mapped_brand_id = None
        
        if brands:
            for b in brands:
                b_domain = b.get("domain", "").lower()
                if b_domain and (b_domain in domain or domain in b_domain):
                    mapped_brand_id = b["id"]
                    break
                    
        citations.append({
            "url": raw_url,
            "domain": domain,
            "brand_id": mapped_brand_id
        })
        
    return citations
