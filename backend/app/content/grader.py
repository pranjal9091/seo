import re
import json
from typing import Dict, Any, List
from app.models.db_models import ContentPage
from app.models.audit import (
    ExtractedWebpageData, HeadingNode, LinkStats, LinkSample,
    ImageStats, Directives, SchemaItem, AeoExtraction
)
from app.auditor.engine import run_audit
from app.content.manager import build_article_schema_jsonld

def grade_content_page(article: ContentPage) -> Dict[str, Any]:
    """
    Evaluates a ContentPage directly through the existing 4-pillar deterministic auditor.
    Produces SEO/AEO Score (0-100), pillar breakdowns, and actionable findings.
    Note: 'Optimization score ≠ Google ranking' - rule-based audit score only.
    """
    md = article.content_markdown or ""
    
    # 1. Parse headings
    heading_nodes: List[HeadingNode] = []
    h1_list: List[str] = []
    for line in md.split("\n"):
        line_s = line.strip()
        if line_s.startswith("# "):
            h_text = line_s[2:].strip()
            heading_nodes.append(HeadingNode(level=1, text=h_text))
            h1_list.append(h_text)
        elif line_s.startswith("## "):
            heading_nodes.append(HeadingNode(level=2, text=line_s[3:].strip()))
        elif line_s.startswith("### "):
            heading_nodes.append(HeadingNode(level=3, text=line_s[4:].strip()))

    if not h1_list and article.title:
        heading_nodes.insert(0, HeadingNode(level=1, text=article.title))
        h1_list.append(article.title)

    # 2. Extract links
    internal_links_count = len(article.internal_links or [])
    md_links = re.findall(r'\[([^\]]+)\]\(([^)]+)\)', md)
    total_links = len(md_links)
    ext_links = sum(1 for _, href in md_links if href.startswith("http"))
    int_links = total_links - ext_links

    link_samples = [
        LinkSample(href=href, text=text, is_external=href.startswith("http"))
        for text, href in md_links[:10]
    ]

    link_stats = LinkStats(
        total_links=total_links,
        internal_links=max(internal_links_count, int_links),
        external_links=ext_links,
        generic_anchor_count=0,
        empty_anchor_count=0,
        samples=link_samples
    )

    # 3. Directives
    directives = Directives(
        robots_meta="index, follow" if article.status == "published" else "noindex, nofollow",
        is_noindex=article.status != "published",
        is_nofollow=False,
        is_nosnippet=False
    )

    # 4. Schemas
    schema_payload = build_article_schema_jsonld(article)
    schema_items: List[SchemaItem] = []
    
    if schema_payload.get("article"):
        schema_items.append(SchemaItem(
            raw_json=json.dumps(schema_payload["article"]),
            is_valid_json=True,
            schema_types=["Article"],
            has_context=True,
            parsed_content=schema_payload["article"]
        ))
    if schema_payload.get("faq"):
        schema_items.append(SchemaItem(
            raw_json=json.dumps(schema_payload["faq"]),
            is_valid_json=True,
            schema_types=["FAQPage"],
            has_context=True,
            parsed_content=schema_payload["faq"]
        ))

    # 5. AEO components
    direct_ans = article.direct_answer_block or ""
    ans_words = len(direct_ans.split()) if direct_ans else 0
    is_optimal = 40 <= ans_words <= 65

    question_headings = [
        h.text for h in heading_nodes if h.text.endswith("?") or any(
            h.text.lower().startswith(w) for w in ["what", "how", "why", "which", "can", "is", "difference"]
        )
    ]

    numbers_count = len(re.findall(r'\b\d+(\.\d+)?%?\b', md))
    ordered_lists_count = len(re.findall(r'^\s*\d+\.\s+', md, flags=re.MULTILINE))
    unordered_lists_count = len(re.findall(r'^\s*[\*\-]\s+', md, flags=re.MULTILINE))
    tables_count = md.count("|---")

    aeo = AeoExtraction(
        direct_answer_candidate=direct_ans if direct_ans else None,
        answer_word_count=ans_words,
        is_optimal_length=is_optimal,
        question_headings=question_headings,
        question_headings_count=len(question_headings),
        factual_numbers_count=numbers_count,
        ordered_lists_count=ordered_lists_count,
        unordered_lists_count=unordered_lists_count,
        tables_count=tables_count,
        has_faq_section=bool(article.faqs and len(article.faqs) > 0)
    )

    # 6. Build ExtractedWebpageData
    extracted = ExtractedWebpageData(
        requested_url=article.canonical_url,
        final_url=article.canonical_url,
        status_code=200 if article.status == "published" else 404,
        response_time_ms=120,
        content_type="text/html; charset=utf-8",
        content_length_bytes=len(md.encode("utf-8")),
        redirect_count=0,
        title=article.meta_title or article.title,
        title_length=len(article.meta_title or article.title),
        meta_description=article.meta_description,
        meta_description_length=len(article.meta_description or ""),
        canonical_url=article.canonical_url,
        canonical_matches_final=True,
        headings=heading_nodes,
        h1_count=len(h1_list),
        h1_list=h1_list,
        links=link_stats,
        images=ImageStats(total_images=0, missing_alt_count=0, empty_alt_count=0),
        directives=directives,
        schemas=schema_items,
        aeo=aeo
    )

    # 7. Run through auditor engine
    report = run_audit(extracted)

    return {
        "slug": article.slug,
        "overall_score": report.overall_score,
        "category_scores": {
            cat: {
                "earned": score.earned,
                "max_score": score.max_score,
                "percentage": score.percentage,
                "label": score.label,
                "passed_checks": sum(1 for c in score.checks if c.passed),
                "total_checks": len(score.checks)
            }
            for cat, score in report.category_scores.items()
        },
        "findings": [
            {
                "id": f.id,
                "severity": f.severity,
                "category": f.category,
                "title": f.title,
                "problem": f.problem,
                "evidence": f.evidence,
                "recommendation": f.recommendation
            }
            for f in report.findings
        ],
        "readiness_summary": {
            "technical_readiness": report.category_scores.get("technical", None).percentage if "technical" in report.category_scores else 0,
            "onpage_readiness": report.category_scores.get("onpage", None).percentage if "onpage" in report.category_scores else 0,
            "answer_readiness": report.category_scores.get("aeo", None).percentage if "aeo" in report.category_scores else 0,
            "structured_data_readiness": report.category_scores.get("schema", None).percentage if "schema" in report.category_scores else 0,
        },
        "disclaimer": "Optimization score is a deterministic rule-based evaluation and does not predict or guarantee Google rankings or traffic."
    }
