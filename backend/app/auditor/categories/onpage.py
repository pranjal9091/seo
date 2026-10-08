from typing import List, Tuple
from app.models.audit import ExtractedWebpageData, AuditFinding, RuleCheckResult
from app.auditor.rules_base import create_finding, create_check

def audit_onpage(data: ExtractedWebpageData) -> Tuple[List[RuleCheckResult], List[AuditFinding]]:
    checks: List[RuleCheckResult] = []
    findings: List[AuditFinding] = []

    # ONPAGE-01: Title Tag (Max: 7.0)
    if not data.title:
        checks.append(create_check(
            "ONPAGE-01", "Missing Title Tag", 0.0, 7.0,
            "Document has no <title> tag in the HTML head."
        ))
        findings.append(create_finding(
            "ONPAGE-ERR-NO-TITLE", "critical", "onpage",
            "Missing HTML Title Tag",
            "No <title> tag was found in the HTML document.",
            "Evidence: <title> tag absent",
            "The title tag is one of the strongest on-page ranking signals and is the primary headline displayed in SERPs and AI citations.",
            "Add a descriptive, intent-focused title tag between 45 and 65 characters."
        ))
    elif 40 <= data.title_length <= 65:
        checks.append(create_check(
            "ONPAGE-01", "Optimal Title Tag Length", 7.0, 7.0,
            f"Title is {data.title_length} characters (within optimal 40-65 char range): '{data.title}'"
        ))
    elif 25 <= data.title_length < 40:
        checks.append(create_check(
            "ONPAGE-01", "Title Tag Under-Optimized", 4.5, 7.0,
            f"Title is {data.title_length} characters (slightly short): '{data.title}'"
        ))
        findings.append(create_finding(
            "ONPAGE-WARN-SHORT-TITLE", "low", "onpage",
            "Title Tag Is Short",
            f"Title length is only {data.title_length} characters.",
            f"Current title: '{data.title}'",
            "Shorter titles miss opportunities to target primary keywords and user intent modifiers.",
            "Expand title to 45-65 characters by including primary search intent, value proposition, and brand name."
        ))
    elif 65 < data.title_length <= 80:
        checks.append(create_check(
            "ONPAGE-01", "Title Tag Slightly Long", 4.5, 7.0,
            f"Title is {data.title_length} characters (risk of minor SERP truncation)."
        ))
        findings.append(create_finding(
            "ONPAGE-WARN-LONG-TITLE", "low", "onpage",
            "Title Tag Exceeds Recommended Length",
            f"Title is {data.title_length} characters, exceeding the 60-65 character desktop SERP display limit.",
            f"Current title: '{data.title}'",
            "Google truncates titles longer than ~600px with an ellipsis ('...'), potentially obscuring brand and key terms.",
            "Trim title to under 65 characters, front-loading the most critical search keywords."
        ))
    elif data.title_length > 80:
        checks.append(create_check(
            "ONPAGE-01", "Excessively Long Title Tag", 2.0, 7.0,
            f"Title is {data.title_length} characters (severe SERP truncation)."
        ))
        findings.append(create_finding(
            "ONPAGE-ERR-EXCESSIVE-TITLE", "medium", "onpage",
            "Excessively Long Title Tag (>80 chars)",
            f"Title is {data.title_length} characters.",
            f"Current title: '{data.title}'",
            "Significantly exceeds search snippet display limits and signals keyword stuffing or uncurated page headers.",
            "Rewrite title concisely within 50-60 characters."
        ))
    else:
        checks.append(create_check(
            "ONPAGE-01", "Critically Short Title", 2.0, 7.0,
            f"Title is only {data.title_length} characters: '{data.title}'"
        ))
        findings.append(create_finding(
            "ONPAGE-ERR-CRITICAL-SHORT-TITLE", "medium", "onpage",
            "Critically Short Title Tag (<25 chars)",
            f"Title contains only {data.title_length} characters.",
            f"Current title: '{data.title}'",
            "Lacks sufficient topical depth and semantic context for search engines and AI parsers.",
            "Expand title with primary keywords and brand context."
        ))

    # ONPAGE-02: Meta Description (Max: 6.0)
    if not data.meta_description:
        checks.append(create_check(
            "ONPAGE-02", "Missing Meta Description", 0.0, 6.0,
            "No <meta name='description'> tag detected."
        ))
        findings.append(create_finding(
            "ONPAGE-WARN-NO-DESC", "medium", "onpage",
            "Missing Meta Description",
            "Page does not declare a meta description tag.",
            "Evidence: <meta name='description'> tag missing",
            "Without an explicit description, search engines pull arbitrary text snippets from the page, reducing CTR control.",
            "Write an engaging 120-160 character meta description summarizing page intent with a clear call-to-action."
        ))
    elif 120 <= data.meta_description_length <= 165:
        checks.append(create_check(
            "ONPAGE-02", "Optimal Meta Description", 6.0, 6.0,
            f"Meta description is {data.meta_description_length} characters (within optimal 120-165 range)."
        ))
    elif 70 <= data.meta_description_length < 120:
        checks.append(create_check(
            "ONPAGE-02", "Short Meta Description", 4.0, 6.0,
            f"Meta description is {data.meta_description_length} characters (slightly short)."
        ))
        findings.append(create_finding(
            "ONPAGE-WARN-SHORT-DESC", "low", "onpage",
            "Meta Description Is Brief",
            f"Meta description is {data.meta_description_length} characters.",
            f"Current description: '{data.meta_description}'",
            "Under-utilizes the full SERP snippet real estate to drive organic clicks.",
            "Expand description to 130-160 characters highlighting key benefits and search intent."
        ))
    elif data.meta_description_length > 165:
        checks.append(create_check(
            "ONPAGE-02", "Long Meta Description", 3.5, 6.0,
            f"Meta description is {data.meta_description_length} characters (may be truncated in SERP)."
        ))
        findings.append(create_finding(
            "ONPAGE-WARN-LONG-DESC", "low", "onpage",
            "Meta Description Exceeds SERP Length",
            f"Meta description is {data.meta_description_length} characters.",
            f"Current description: '{data.meta_description[:80]}...'",
            "Google truncates meta descriptions beyond ~155-160 characters on mobile and desktop.",
            "Condense meta description to 140-155 characters so the core value proposition remains visible."
        ))
    else:
        checks.append(create_check(
            "ONPAGE-02", "Critically Short Meta Description", 2.0, 6.0,
            f"Meta description is only {data.meta_description_length} characters."
        ))

    # ONPAGE-03: Heading 1 (H1) Structure (Max: 6.0)
    if data.h1_count == 1:
        checks.append(create_check(
            "ONPAGE-03", "Single Clear H1 Heading", 6.0, 6.0,
            f"Exactly 1 H1 heading found: '{data.h1_list[0]}'"
        ))
    elif data.h1_count == 0:
        checks.append(create_check(
            "ONPAGE-03", "Missing H1 Heading", 0.0, 6.0,
            "No <h1> heading was found on the page."
        ))
        findings.append(create_finding(
            "ONPAGE-ERR-NO-H1", "high", "onpage",
            "Missing H1 Heading Tag",
            "Document contains zero <h1> tags.",
            "Evidence: <h1> count is 0",
            "The H1 represents the primary semantic topic of the webpage for search engines, assistive technologies, and LLMs.",
            "Add a single, clear <h1> tag at the top of the main content representing the core subject."
        ))
    else:
        checks.append(create_check(
            "ONPAGE-03", "Multiple H1 Headings Detected", 3.0, 6.0,
            f"Page contains {data.h1_count} H1 tags (recommended is exactly 1)."
        ))
        findings.append(create_finding(
            "ONPAGE-WARN-MULTI-H1", "medium", "onpage",
            "Multiple H1 Headings Detected",
            f"Found {data.h1_count} separate <h1> tags on the page.",
            f"H1 tags: {', '.join(data.h1_list[:3])}",
            "Multiple H1 tags can dilute topical hierarchy and confuse search crawlers regarding the primary subject.",
            "Reserve <h1> strictly for the main page title; convert secondary section headers to <h2> tags."
        ))

    # ONPAGE-04: Image Accessibility & Alt Attributes (Max: 6.0)
    total_imgs = data.images.total_images
    missing_alt = data.images.missing_alt_count
    
    if total_imgs == 0:
        checks.append(create_check(
            "ONPAGE-04", "No Images (N/A)", 6.0, 6.0,
            "Page has no images; no accessibility issues detected."
        ))
    else:
        has_alt_ratio = (total_imgs - missing_alt) / total_imgs
        if missing_alt == 0:
            checks.append(create_check(
                "ONPAGE-04", "100% Images Have Alt Attributes", 6.0, 6.0,
                f"All {total_imgs} images have an alt attribute declared."
            ))
        elif has_alt_ratio >= 0.8:
            checks.append(create_check(
                "ONPAGE-04", "Most Images Have Alt Text", 4.0, 6.0,
                f"{total_imgs - missing_alt}/{total_imgs} images have alt text ({missing_alt} missing)."
            ))
            sample_srcs = [item.src for item in data.images.items_sample if not item.has_alt][:3]
            findings.append(create_finding(
                "ONPAGE-WARN-SOME-ALT", "low", "onpage",
                f"{missing_alt} Images Missing Alt Attribute",
                f"Out of {total_imgs} images, {missing_alt} lack an alt attribute.",
                f"Sample images: {', '.join(sample_srcs)}",
                "Missing alt attributes prevent image indexing in Google Images and harm screen reader accessibility.",
                "Add descriptive, keyword-rich alt text to all informative images, or alt='' for purely decorative elements."
            ))
        else:
            checks.append(create_check(
                "ONPAGE-04", "Widespread Missing Alt Text", 1.5, 6.0,
                f"{missing_alt} out of {total_imgs} images lack an alt attribute."
            ))
            sample_srcs = [item.src for item in data.images.items_sample if not item.has_alt][:3]
            findings.append(create_finding(
                "ONPAGE-ERR-MISSING-ALT", "medium", "onpage",
                "Majority of Images Lack Alt Attributes",
                f"{missing_alt} out of {total_imgs} images have no alt attribute.",
                f"Sample images: {', '.join(sample_srcs)}",
                "Substantially impairs SEO for visual search and violates basic web accessibility standards.",
                "Audit all <img> tags and add concise, contextual alt descriptions."
            ))

    return checks, findings
