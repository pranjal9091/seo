import re
from typing import List, Dict, Any
from collections import defaultdict
from app.models.db_models import ContentPage
from sqlalchemy.orm import Session

def analyze_internal_links(db: Session) -> Dict[str, Any]:
    """
    Analyzes internal links across all articles.
    Calculates incoming links, outgoing links, and flags potential orphan pages.
    """
    articles = db.query(ContentPage).all()
    article_slugs = {a.slug for a in articles}
    
    # Track incoming and outgoing links
    incoming_map = defaultdict(list)
    outgoing_map = defaultdict(list)

    for article in articles:
        # Check explicit internal_links JSON
        seen_targets = set()
        if article.internal_links:
            for link in article.internal_links:
                target = link.get("target_slug")
                if target and target in article_slugs and target != article.slug:
                    outgoing_map[article.slug].append({
                        "target_slug": target,
                        "anchor_text": link.get("anchor_text", target)
                    })
                    incoming_map[target].append({
                        "source_slug": article.slug,
                        "anchor_text": link.get("anchor_text", target)
                    })
                    seen_targets.add(target)

        # Also regex-scan content_markdown for Markdown links: [Anchor Text](/content/target-slug)
        md_links = re.findall(r'\[([^\]]+)\]\(/content/([a-zA-Z0-9\-]+)\)', article.content_markdown)
        for anchor, target in md_links:
            if target in article_slugs and target != article.slug and target not in seen_targets:
                outgoing_map[article.slug].append({
                    "target_slug": target,
                    "anchor_text": anchor
                })
                incoming_map[target].append({
                    "source_slug": article.slug,
                    "anchor_text": anchor
                })
                seen_targets.add(target)

    results = []
    orphan_pages = []

    for article in articles:
        inc = incoming_map.get(article.slug, [])
        outg = outgoing_map.get(article.slug, [])
        is_orphan = len(inc) == 0 and article.status == "published"

        if is_orphan:
            orphan_pages.append(article.slug)

        results.append({
            "slug": article.slug,
            "title": article.title,
            "status": article.status,
            "incoming_count": len(inc),
            "outgoing_count": len(outg),
            "incoming_links": inc,
            "outgoing_links": outg,
            "is_orphan": is_orphan,
            "orphan_warning": "Potential orphan page (0 incoming internal links from other articles)" if is_orphan else None
        })

    return {
        "total_articles": len(articles),
        "total_internal_links": sum(len(links) for links in outgoing_map.values()),
        "orphan_count": len(orphan_pages),
        "orphan_slugs": orphan_pages,
        "articles": results
    }

def extract_internal_links(content_str: str) -> List[str]:
    """
    Extracts internal article slugs linked via HTML <a href="/content/slug">
    or Markdown [anchor](/content/slug).
    """
    found = []
    # Markdown [text](/content/slug)
    md_matches = re.findall(r'\[([^\]]+)\]\(/content/([a-zA-Z0-9\-]+)\)', content_str)
    for _, slug in md_matches:
        if slug not in found:
            found.append(slug)
    # HTML <a href="/content/slug">
    html_matches = re.findall(r'href=["\']/content/([a-zA-Z0-9\-]+)["\']', content_str)
    for slug in html_matches:
        if slug not in found:
            found.append(slug)
    return found

def build_link_mesh(articles: List[ContentPage]) -> Dict[str, Any]:
    """
    Builds the link graph mesh for a given list of ContentPages.
    """
    article_slugs = {a.slug for a in articles}
    incoming_map = defaultdict(list)
    outgoing_map = defaultdict(list)

    for article in articles:
        seen = set()
        if article.internal_links:
            for link in article.internal_links:
                target = link.get("target_slug")
                if target and target in article_slugs and target != article.slug:
                    outgoing_map[article.slug].append(target)
                    incoming_map[target].append(article.slug)
                    seen.add(target)

        # Content markdown scan
        md = article.content_markdown or ""
        md_slugs = extract_internal_links(md)
        for target in md_slugs:
            if target in article_slugs and target != article.slug and target not in seen:
                outgoing_map[article.slug].append(target)
                incoming_map[target].append(article.slug)
                seen.add(target)

    orphans = [
        a.slug for a in articles
        if len(incoming_map[a.slug]) == 0 and a.status == "published"
    ]

    return {
        "total_articles": len(articles),
        "total_internal_links": sum(len(links) for links in outgoing_map.values()),
        "orphan_count": len(orphans),
        "orphan_slugs": orphans,
    }

