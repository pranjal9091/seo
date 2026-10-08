from typing import List, Tuple
from app.models.audit import ExtractedWebpageData, AuditFinding, RuleCheckResult
from app.auditor.rules_base import create_finding, create_check

def audit_technical(data: ExtractedWebpageData) -> Tuple[List[RuleCheckResult], List[AuditFinding]]:
    checks: List[RuleCheckResult] = []
    findings: List[AuditFinding] = []

    # TECH-01: HTTP Status Code (Max: 8.0)
    if data.status_code == 200:
        checks.append(create_check(
            "TECH-01", "HTTP Status 200 OK", 8.0, 8.0,
            "Webpage responded with standard HTTP 200 OK status code."
        ))
    elif 300 <= data.status_code < 400:
        checks.append(create_check(
            "TECH-01", "HTTP Redirect Code", 4.0, 8.0,
            f"Page returned redirect status code {data.status_code}."
        ))
        findings.append(create_finding(
            "TECH-ERR-3XX", "medium", "technical",
            "Page Returned an HTTP Redirect",
            f"The audited URL issued an HTTP {data.status_code} redirect to '{data.final_url}'.",
            f"Final URL: {data.final_url} (Redirect count: {data.redirect_count})",
            "Unnecessary redirects increase crawl budget consumption, page latency, and link equity dilution.",
            "Update internal links and sitemaps to point directly to the canonical destination URL."
        ))
    else:
        checks.append(create_check(
            "TECH-01", f"HTTP Error {data.status_code}", 0.0, 8.0,
            f"Webpage returned error status code {data.status_code}."
        ))
        findings.append(create_finding(
            "TECH-ERR-STATUS", "critical", "technical",
            f"HTTP Response Error ({data.status_code})",
            f"Server returned non-success HTTP status {data.status_code}.",
            f"Status Code: {data.status_code} on {data.final_url}",
            "Search engine crawlers and answer engines cannot index or retrieve content from non-200 URLs.",
            "Verify server configuration, routing, and database availability to restore 200 OK response."
        ))

    # TECH-02: Response Latency (Max: 5.0)
    rt = data.response_time_ms
    if rt < 600:
        checks.append(create_check(
            "TECH-02", "Server Latency (<600ms)", 5.0, 5.0,
            f"Optimal initial server response latency of {rt}ms."
        ))
    elif rt < 1500:
        checks.append(create_check(
            "TECH-02", "Server Latency (Moderate)", 3.5, 5.0,
            f"Acceptable response latency of {rt}ms (ideal is <600ms)."
        ))
        findings.append(create_finding(
            "TECH-WARN-LATENCY", "low", "technical",
            "Moderate Server Response Time",
            f"HTML document response time was {rt}ms.",
            f"Measured latency: {rt}ms",
            "Slower response times can reduce crawl budget efficiency and increase page abandonment.",
            "Review edge caching (CDN), server-side rendering bottlenecks, or database query response."
        ))
    else:
        checks.append(create_check(
            "TECH-02", "Server Latency (Slow)", 1.0, 5.0,
            f"High response latency of {rt}ms exceeds recommended 1500ms threshold."
        ))
        findings.append(create_finding(
            "TECH-ERR-LATENCY", "high", "technical",
            "Slow Initial Server Response Time (>1.5s)",
            f"HTML document response took {rt}ms to deliver.",
            f"Response latency: {rt}ms",
            "Excessive Time To First Byte (TTFB) directly impacts Google Core Web Vitals and prevents rapid AI bot ingestion.",
            "Implement full-page caching at the CDN edge (Cloudflare/Fastly) and optimize backend server performance."
        ))

    # TECH-03: Canonical Tag (Max: 6.0)
    if data.canonical_url:
        if data.canonical_matches_final:
            checks.append(create_check(
                "TECH-03", "Self-Referencing Canonical Tag", 6.0, 6.0,
                f"Valid self-referencing canonical URL matches destination: {data.canonical_url}"
            ))
        else:
            checks.append(create_check(
                "TECH-03", "Cross-Domain/Alternate Canonical", 3.0, 6.0,
                f"Canonical URL points to a different destination: {data.canonical_url}"
            ))
            findings.append(create_finding(
                "TECH-WARN-CANONICAL-DIFF", "medium", "technical",
                "Canonical URL Points to Different Destination",
                "The canonical URL does not match the current URL.",
                f"Current: {data.final_url} | Canonical: {data.canonical_url}",
                "If unintentional, search engines will attribute all ranking signals and index status to the canonical target instead.",
                "Ensure canonical tag is intended for cross-domain syndication or update it to self-reference this URL."
            ))
    else:
        checks.append(create_check(
            "TECH-03", "Missing Canonical Tag", 0.0, 6.0,
            "No <link rel='canonical'> tag was detected on the page."
        ))
        findings.append(create_finding(
            "TECH-ERR-NO-CANONICAL", "high", "technical",
            "Missing Canonical Tag",
            "No canonical URL tag is declared in document head.",
            "Evidence: <link rel='canonical'> tag absent in HTML <head>",
            "Without a canonical tag, URL parameter variations (utm tags, tracking IDs, trailing slashes) can cause duplicate content issues.",
            f"Add a self-referencing canonical tag in the <head>: <link rel='canonical' href='{data.final_url}' />"
        ))

    # TECH-04: Indexability & Meta Directives (Max: 6.0)
    if data.directives.is_noindex:
        checks.append(create_check(
            "TECH-04", "Page Has Noindex Directive", 0.0, 6.0,
            "Document contains 'noindex' instruction blocking search engine indexing."
        ))
        findings.append(create_finding(
            "TECH-ERR-NOINDEX", "critical", "technical",
            "Noindex Directive Detected",
            "Page is explicitly instructed not to be indexed via robots meta tag or X-Robots-Tag.",
            f"Directives detected: robots='{data.directives.robots_meta}' x-robots-tag='{data.directives.x_robots_tag}'",
            "Search engines (Google) and AI crawlers will completely de-index and ignore this page.",
            "If this page should be discoverable in search and AI results, remove the 'noindex' directive."
        ))
    elif data.directives.is_nosnippet:
        checks.append(create_check(
            "TECH-04", "Nosnippet Directive Present", 2.0, 6.0,
            "Document contains 'nosnippet' directive restricting search snippets and AI answer generation."
        ))
        findings.append(create_finding(
            "TECH-WARN-NOSNIPPET", "high", "technical",
            "Nosnippet Directive Restricts AI & Search Snippets",
            "Page specifies 'nosnippet', instructing crawlers not to display textual snippets or use content in AI Overviews.",
            "Directives: nosnippet present in robots meta tag",
            "Completely cripples AEO and GEO visibility because answer engines cannot quote or extract summaries from this page.",
            "Remove 'nosnippet' or replace with 'max-snippet:-1' to allow rich AI overviews and featured snippets."
        ))
    else:
        checks.append(create_check(
            "TECH-04", "Fully Indexable Directives", 6.0, 6.0,
            "No conflicting noindex or nosnippet directives detected; page is indexable and crawlable."
        ))

    return checks, findings
