import pytest
from app.crawler.fetcher import FetchedWebpage
from app.crawler.parser import parse_html_document

SAMPLE_HTML = """
<!DOCTYPE html>
<html lang="en">
<head>
    <title>Best Full Stack Developer Course in India | CCBP 4.0 Review</title>
    <meta name="description" content="Discover the best full stack developer course in India with placement support. Learn MERN stack, Python, and practical industry software engineering." />
    <link rel="canonical" href="https://example.com/courses/full-stack" />
    <meta name="robots" content="index, follow" />
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "Course",
      "name": "CCBP 4.0 Intensive",
      "description": "Full stack software development bootcamp for engineers.",
      "provider": {
        "@type": "Organization",
        "name": "NxtWave"
      }
    }
    </script>
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [{
        "@type": "Question",
        "name": "What is the duration of CCBP 4.0?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "The program typically spans 6 to 9 months depending on the track."
        }
      }]
    }
    </script>
</head>
<body>
    <header>
        <nav>
            <a href="/about">About Us</a>
            <a href="https://externalsite.com/resource">External Resource</a>
            <a href="/contact">click here</a>
        </nav>
    </header>
    <main>
        <h1>Full Stack Web Development Certification in India</h1>
        <p>A full stack developer course is an intensive training program designed to teach front-end, back-end, and database technologies. It equips aspiring software engineers with hands-on skills in React, Node.js, and SQL to secure high-paying tech jobs in 2025.</p>
        
        <h2>What is the eligibility for this course?</h2>
        <p>Any graduate or B.Tech student with 60% aggregate can apply for the program.</p>
        
        <h2>How does the curriculum compare to traditional colleges?</h2>
        <p>In 2025, over 85% of tech companies require practical project portfolios rather than theoretical knowledge.</p>
        
        <ul>
            <li>Front-end: HTML5, CSS3, React</li>
            <li>Back-end: Node.js, Express, Python</li>
            <li>Database: PostgreSQL, MongoDB</li>
        </ul>
        
        <table>
            <tr><th>Track</th><th>Duration</th><th>Average CTC</th></tr>
            <tr><td>Standard</td><td>6 Months</td><td>₹6.5 LPA</td></tr>
        </table>
        
        <img src="/assets/hero.webp" alt="Full Stack Coding Bootcamp Classroom" />
        <img src="/assets/badge.png" />
    </main>
</body>
</html>
"""

def test_parse_html_document_comprehensive():
    fetched = FetchedWebpage(
        requested_url="https://example.com/courses/full-stack",
        final_url="https://example.com/courses/full-stack",
        status_code=200,
        html_content=SAMPLE_HTML,
        response_time_ms=240,
        headers={"content-type": "text/html; charset=utf-8"},
        redirect_count=0,
        content_length_bytes=len(SAMPLE_HTML.encode("utf-8"))
    )

    data = parse_html_document(fetched)

    # Title & Meta
    assert "Full Stack Developer Course" in data.title
    assert data.title_length > 40
    assert data.meta_description is not None
    assert 120 <= data.meta_description_length <= 165

    # Canonical
    assert data.canonical_url == "https://example.com/courses/full-stack"
    assert data.canonical_matches_final is True

    # Directives
    assert data.directives.is_noindex is False
    assert data.directives.is_nosnippet is False

    # Headings
    assert data.h1_count == 1
    assert data.h1_list[0] == "Full Stack Web Development Certification in India"
    assert len(data.headings) >= 3

    # Links
    assert data.links.total_links == 3
    assert data.links.internal_links == 2
    assert data.links.external_links == 1
    assert data.links.generic_anchor_count == 1  # "click here"

    # Images
    assert data.images.total_images == 2
    assert data.images.missing_alt_count == 1

    # Schemas
    assert len(data.schemas) == 2
    all_types = set()
    for s in data.schemas:
        assert s.is_valid_json is True
        assert s.has_context is True
        all_types.update(s.schema_types)
    assert "Course" in all_types
    assert "FAQPage" in all_types

    # AEO Features
    assert data.aeo.direct_answer_candidate is not None
    assert 35 <= data.aeo.answer_word_count <= 65
    assert data.aeo.question_headings_count >= 2
    assert data.aeo.ordered_lists_count + data.aeo.unordered_lists_count >= 1
    assert data.aeo.tables_count >= 1
    assert data.aeo.factual_numbers_count >= 3
    assert data.aeo.has_faq_section is True
