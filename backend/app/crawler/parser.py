import re
import json
from typing import List, Dict, Any, Optional, Set
from urllib.parse import urlparse, urljoin
from bs4 import BeautifulSoup
from app.models.audit import (
    ExtractedWebpageData, HeadingNode, LinkStats, LinkSample,
    ImageStats, ImageItem, SchemaItem, Directives, AeoExtraction
)
from app.crawler.fetcher import FetchedWebpage

GENERIC_ANCHOR_PATTERNS = {
    "click here", "read more", "learn more", "here", "link", "website",
    "more", "details", "check here", "this link", "view more", "continue reading"
}

QUESTION_PREFIXES = (
    "what", "how", "why", "which", "is", "are", "can", "does", "do",
    "where", "when", "who", "should", "will", "difference between", "best"
)

DEFINITIONAL_TRIGGERS = (
    " is a ", " is an ", " is the ", " are ", " refers to ", " is defined as ",
    " provides ", " stands for ", " means ", " helps you ", " allows developers to "
)

def parse_html_document(fetched: FetchedWebpage) -> ExtractedWebpageData:
    soup = BeautifulSoup(fetched.html_content, "html.parser")
    final_parsed_url = urlparse(fetched.final_url)
    base_domain = final_parsed_url.netloc.lower()
    
    # 1. Title
    title_tag = soup.find("title")
    title_text = title_tag.get_text().strip() if title_tag else None
    title_len = len(title_text) if title_text else 0
    
    # 2. Meta Description
    meta_desc_tag = soup.find("meta", attrs={"name": re.compile(r"^description$", re.I)})
    meta_desc_text = meta_desc_tag.get("content", "").strip() if meta_desc_tag else None
    meta_desc_len = len(meta_desc_text) if meta_desc_text else 0
    
    # 3. Canonical URL
    canonical_tag = soup.find("link", attrs={"rel": re.compile(r"^canonical$", re.I)})
    canonical_url = None
    canonical_matches_final = False
    if canonical_tag and canonical_tag.get("href"):
        canonical_raw = canonical_tag.get("href").strip()
        canonical_url = urljoin(fetched.final_url, canonical_raw)
        
        # Normalize for comparison
        clean_canonical = canonical_url.rstrip("/").lower()
        clean_final = fetched.final_url.rstrip("/").lower()
        canonical_matches_final = (clean_canonical == clean_final)
    
    # 4. Robots & Directives
    robots_meta = soup.find("meta", attrs={"name": re.compile(r"^robots$", re.I)})
    googlebot_meta = soup.find("meta", attrs={"name": re.compile(r"^googlebot$", re.I)})
    x_robots = fetched.headers.get("x-robots-tag")
    
    robots_str = robots_meta.get("content", "").lower() if robots_meta else ""
    googlebot_str = googlebot_meta.get("content", "").lower() if googlebot_meta else ""
    x_robots_str = x_robots.lower() if x_robots else ""
    
    all_directives_str = f"{robots_str} {googlebot_str} {x_robots_str}"
    is_noindex = "noindex" in all_directives_str
    is_nofollow = "nofollow" in all_directives_str
    is_nosnippet = "nosnippet" in all_directives_str
    
    directives = Directives(
        robots_meta=robots_meta.get("content") if robots_meta else None,
        googlebot_meta=googlebot_meta.get("content") if googlebot_meta else None,
        x_robots_tag=x_robots,
        is_noindex=is_noindex,
        is_nofollow=is_nofollow,
        is_nosnippet=is_nosnippet,
    )
    
    # 5. Headings (H1, H2, H3)
    headings_list: List[HeadingNode] = []
    h1_list: List[str] = []
    
    for tag in soup.find_all(["h1", "h2", "h3"]):
        text = tag.get_text().strip()
        if not text:
            continue
        level = int(tag.name[1])
        headings_list.append(HeadingNode(level=level, text=text))
        if level == 1:
            h1_list.append(text)
            
    # 6. Links (Internal vs External & Anchor Quality)
    total_links = 0
    internal_links = 0
    external_links = 0
    generic_anchor_count = 0
    empty_anchor_count = 0
    link_samples: List[LinkSample] = []
    
    for a_tag in soup.find_all("a", href=True):
        href = a_tag.get("href", "").strip()
        if not href or href.startswith("javascript:") or href.startswith("mailto:") or href.startswith("tel:"):
            continue
        
        total_links += 1
        full_href = urljoin(fetched.final_url, href)
        parsed_href = urlparse(full_href)
        
        is_external = bool(parsed_href.netloc and parsed_href.netloc.lower() != base_domain)
        if is_external:
            external_links += 1
        else:
            internal_links += 1
            
        anchor_text = a_tag.get_text().strip().lower()
        if not anchor_text:
            empty_anchor_count += 1
        elif anchor_text in GENERIC_ANCHOR_PATTERNS:
            generic_anchor_count += 1
            
        if len(link_samples) < 25:
            link_samples.append(LinkSample(
                href=full_href,
                text=a_tag.get_text().strip()[:50] or "[empty]",
                is_external=is_external
            ))
            
    link_stats = LinkStats(
        total_links=total_links,
        internal_links=internal_links,
        external_links=external_links,
        generic_anchor_count=generic_anchor_count,
        empty_anchor_count=empty_anchor_count,
        samples=link_samples
    )
    
    # 7. Images & Alt Attributes
    images = soup.find_all("img")
    total_images = len(images)
    missing_alt_count = 0
    empty_alt_count = 0
    image_items: List[ImageItem] = []
    
    for img in images:
        src = img.get("src", "").strip()
        has_alt = "alt" in img.attrs
        alt_val = img.get("alt")
        
        if not has_alt:
            missing_alt_count += 1
            is_empty = False
        else:
            is_empty = (alt_val is None or alt_val.strip() == "")
            if is_empty:
                empty_alt_count += 1
                
        if len(image_items) < 20:
            image_items.append(ImageItem(
                src=urljoin(fetched.final_url, src) if src else "[no-src]",
                alt=alt_val.strip() if (alt_val and isinstance(alt_val, str)) else None,
                has_alt=has_alt,
                is_empty_alt=is_empty
            ))
            
    image_stats = ImageStats(
        total_images=total_images,
        missing_alt_count=missing_alt_count,
        empty_alt_count=empty_alt_count,
        items_sample=image_items
    )
    
    # 8. Schema Markup (JSON-LD)
    schema_items: List[SchemaItem] = []
    
    def extract_types_from_obj(obj: Any, collected_types: Set[str]):
        if isinstance(obj, dict):
            if "@type" in obj:
                t = obj["@type"]
                if isinstance(t, str):
                    collected_types.add(t)
                elif isinstance(t, list):
                    for item in t:
                        if isinstance(item, str):
                            collected_types.add(item)
            for v in obj.values():
                extract_types_from_obj(v, collected_types)
        elif isinstance(obj, list):
            for elem in obj:
                extract_types_from_obj(elem, collected_types)
                
    json_ld_scripts = soup.find_all("script", attrs={"type": "application/ld+json"})
    for s in json_ld_scripts:
        raw_text = s.string or s.get_text() or ""
        raw_text = raw_text.strip()
        if not raw_text:
            continue
            
        try:
            parsed_data = json.loads(raw_text)
            collected: Set[str] = set()
            extract_types_from_obj(parsed_data, collected)
            
            has_context = False
            if isinstance(parsed_data, dict):
                has_context = "schema.org" in str(parsed_data.get("@context", "")).lower()
            elif isinstance(parsed_data, list) and len(parsed_data) > 0 and isinstance(parsed_data[0], dict):
                has_context = "schema.org" in str(parsed_data[0].get("@context", "")).lower()
                
            schema_items.append(SchemaItem(
                raw_json=raw_text[:1000],  # truncated snippet for reporting
                is_valid_json=True,
                schema_types=sorted(list(collected)),
                has_context=has_context,
                parsed_content=parsed_data if isinstance(parsed_data, dict) else {"items": parsed_data}
            ))
        except Exception as json_err:
            schema_items.append(SchemaItem(
                raw_json=raw_text[:500],
                is_valid_json=False,
                schema_types=[],
                has_context=False,
                error=f"JSON-LD Syntax Error: {str(json_err)}"
            ))
            
    # 9. AEO & Answer Readiness Analysis
    question_headings: List[str] = []
    for h in headings_list:
        h_text_clean = h.text.strip().lower()
        if h.text.strip().endswith("?") or any(h_text_clean.startswith(prefix) for prefix in QUESTION_PREFIXES):
            question_headings.append(h.text.strip())
            
    # Detect direct answer block candidate
    direct_answer_candidate = None
    answer_word_count = 0
    is_optimal_len = False
    
    # Look for paragraphs in article, main, or body
    content_root = soup.find(["main", "article"]) or soup.body or soup
    paragraphs = content_root.find_all("p")
    
    for p in paragraphs[:6]:  # evaluate early paragraphs
        p_text = p.get_text().strip()
        words = p_text.split()
        w_len = len(words)
        
        if 20 <= w_len <= 90:
            # Check for informative or definitional cues
            lower_p = f" {p_text.lower()} "
            has_definition = any(trigger in lower_p for trigger in DEFINITIONAL_TRIGGERS)
            
            if has_definition or direct_answer_candidate is None:
                direct_answer_candidate = p_text
                answer_word_count = w_len
                is_optimal_len = (40 <= w_len <= 65)
                if has_definition:
                    break  # strongest candidate found
                    
    # Factual density (numbers, stats, percentages, currency, dates)
    body_text = content_root.get_text() if content_root else ""
    stat_matches = re.findall(r"\b\d+(?:\.\d+)?%|\b\d{4}\b|\b[₹$€£]\s*\d+|\b\d+(?:,\d+)*(?:\.\d+)?\b", body_text)
    factual_numbers_count = len(stat_matches)
    
    ordered_lists_count = len(content_root.find_all("ol")) if content_root else 0
    unordered_lists_count = len(content_root.find_all("ul")) if content_root else 0
    tables_count = len(content_root.find_all("table")) if content_root else 0
    
    # Check if FAQ section exists in HTML
    has_faq_in_html = bool(
        soup.find(attrs={"id": re.compile(r"faq", re.I)}) or
        soup.find(attrs={"class": re.compile(r"faq", re.I)}) or
        any("faq" in h.text.lower() or "frequently asked" in h.text.lower() for h in headings_list)
    )
    has_faq_in_schema = any("FAQPage" in s.schema_types for s in schema_items)
    
    aeo_extraction = AeoExtraction(
        direct_answer_candidate=direct_answer_candidate,
        answer_word_count=answer_word_count,
        is_optimal_length=is_optimal_len,
        question_headings=question_headings,
        question_headings_count=len(question_headings),
        factual_numbers_count=factual_numbers_count,
        ordered_lists_count=ordered_lists_count,
        unordered_lists_count=unordered_lists_count,
        tables_count=tables_count,
        has_faq_section=has_faq_in_html or has_faq_in_schema
    )
    
    return ExtractedWebpageData(
        requested_url=fetched.requested_url,
        final_url=fetched.final_url,
        status_code=fetched.status_code,
        response_time_ms=fetched.response_time_ms,
        content_type=fetched.headers.get("content-type", "unknown"),
        content_length_bytes=fetched.content_length_bytes,
        redirect_count=fetched.redirect_count,
        title=title_text,
        title_length=title_len,
        meta_description=meta_desc_text,
        meta_description_length=meta_desc_len,
        canonical_url=canonical_url,
        canonical_matches_final=canonical_matches_final,
        headings=headings_list,
        h1_count=len(h1_list),
        h1_list=h1_list,
        links=link_stats,
        images=image_stats,
        directives=directives,
        schemas=schema_items,
        aeo=aeo_extraction
    )
