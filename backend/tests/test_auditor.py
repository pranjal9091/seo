import pytest
from app.crawler.fetcher import FetchedWebpage
from app.crawler.parser import parse_html_document
from app.auditor.engine import run_audit
from tests.test_parser import SAMPLE_HTML

POOR_HTML = """
<!DOCTYPE html>
<html>
<head>
    <title>Hi</title>
    <!-- No meta description -->
    <!-- No canonical tag -->
    <meta name="robots" content="noindex, nosnippet" />
    <script type="application/ld+json">
    { "bad_json": true, }
    </script>
</head>
<body>
    <!-- Missing H1 tag -->
    <h2>Just a section</h2>
    <p>Some vague text without any direct answers or statistics.</p>
    <img src="/logo.png" />
    <img src="/banner.jpg" />
</body>
</html>
"""

def test_audit_well_optimized_page():
    fetched = FetchedWebpage(
        requested_url="https://example.com/courses/full-stack",
        final_url="https://example.com/courses/full-stack",
        status_code=200,
        html_content=SAMPLE_HTML,
        response_time_ms=210,
        headers={"content-type": "text/html; charset=utf-8"},
        redirect_count=0,
        content_length_bytes=len(SAMPLE_HTML.encode("utf-8"))
    )
    extracted = parse_html_document(fetched)
    report = run_audit(extracted)

    assert report.overall_score >= 85
    assert report.overall_score <= 100
    
    # Category checks
    tech = report.category_scores["technical"]
    onpage = report.category_scores["onpage"]
    aeo = report.category_scores["aeo"]
    schema = report.category_scores["schema"]

    assert tech.earned >= 22.0
    assert onpage.earned >= 20.0
    assert aeo.earned >= 25.0
    assert schema.earned >= 18.0

    # Ensure methodology version and disclaimer exist
    assert "OmniGEO-Ruleset" in report.methodology_version
    assert "NOT a Google" in report.disclaimer
    assert report.is_measured_data is True

def test_audit_poor_page_catches_critical_issues():
    fetched = FetchedWebpage(
        requested_url="https://example.com/broken",
        final_url="https://example.com/broken",
        status_code=200,
        html_content=POOR_HTML,
        response_time_ms=1800,
        headers={"content-type": "text/html"},
        redirect_count=0,
        content_length_bytes=len(POOR_HTML.encode("utf-8"))
    )
    extracted = parse_html_document(fetched)
    report = run_audit(extracted)

    # Poor page should have a significantly lower score
    assert report.overall_score < 40

    # Critical findings should be flagged
    severities = [f.severity for f in report.findings]
    assert "critical" in severities
    assert "high" in severities

    # Check for specific critical rules
    finding_titles = [f.title for f in report.findings]
    assert any("Noindex" in t for t in finding_titles)
    assert any("JSON-LD Syntax" in t for t in finding_titles)
    assert any("Missing H1" in t for t in finding_titles)
    assert any("Canonical" in t for t in finding_titles)
