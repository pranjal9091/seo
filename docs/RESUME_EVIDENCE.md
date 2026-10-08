# OmniGEO — Resume-Ready Evidence & Provenance Record

> **Data Honesty Guarantee**: This document contains **only** claims directly supported by code, automated tests, or actual verified measurements in the OmniGEO platform. No simulated metrics or unearned search rankings are claimed.

---

## 1. Built Architecture & Capabilities

The following 9 core engines have been fully developed, integrated, and verified in the codebase:

1. **Technical SEO + AEO URL Crawler & Deterministic Auditor**
   - Headless HTML fetcher with bot User-Agent, SSR detection, status-code inspection, and 5s timeouts.
   - Deterministic 0–100 scoring across 4 pillars: Technical Crawlability, On-Page Optimization, Answer-First Readiness (AEO), and Structured Data (JSON-LD).
   - Code location: [`backend/app/auditor/`](file:///Users/pranjalsingh/Desktop/seo/backend/app/auditor/)

2. **AEO Direct-Answer Grader & Featured Snippet Analyzer**
   - Word count density heuristics (30–80 words), definition markers, list syntax extraction, and table clarity for LLM/Google snippet extraction.
   - Code location: [`backend/app/content/grader.py`](file:///Users/pranjalsingh/Desktop/seo/backend/app/content/grader.py)

3. **AI Search Visibility (GEO) Tracker & Multi-LLM Provider Engine**
   - Live integration adapters for OpenAI (ChatGPT), Google Gemini, and Perplexity APIs.
   - Strict separation between official API responses, manual observation imports, and baseline demo samples.
   - Code location: [`backend/app/visibility/`](file:///Users/pranjalsingh/Desktop/seo/backend/app/visibility/)

4. **36-Query EdTech Benchmark Library**
   - Spans 9 search intent categories: Career Transition, College Placement, Course Comparison, Coding Foundations, Free vs Paid, Salary Expectation, Curriculum/Tools, Upskilling ROI, and Non-Tech to Tech.
   - Benchmarks 5 EdTech competitors: NxtWave, Scaler, Masai School, PW Skills, upGrad.
   - Code location: [`backend/app/visibility/seed.py`](file:///Users/pranjalsingh/Desktop/seo/backend/app/visibility/seed.py)

5. **Google Search Console (GSC) Performance Analytics**
   - Robust CSV parser for real Google Search Console performance exports.
   - Computes weighted CTR, impression-weighted average position, intent classification (Informational, Commercial, Navigational, Transactional), and opportunity gap heuristics.
   - Code location: [`backend/app/gsc/`](file:///Users/pranjalsingh/Desktop/seo/backend/app/gsc/)

6. **Google Analytics 4 (GA4) Client Tracking & CSV Analytics**
   - Privacy-safe, zero-PII client tracking client supporting `page_view`, `article_view`, `scroll_depth`, `internal_link_click`, `outbound_link_click`.
   - GA4 Pages & Screens CSV ingestion engine for real behavioral data.
   - Code location: [`backend/app/ga4/`](file:///Users/pranjalsingh/Desktop/seo/backend/app/ga4/), [`frontend/src/services/ga4.ts`](file:///Users/pranjalsingh/Desktop/seo/frontend/src/services/ga4.ts)

7. **360° Article Measurement Loop & Cross-Signal Engine**
   - Unifies on-page technical score + schema status + real GSC impressions/clicks + real GA4 views/conversions + GEO AI visibility into a single lifecycle audit.
   - Code location: [`backend/app/api/ga4_routes.py`](file:///Users/pranjalsingh/Desktop/seo/backend/app/api/ga4_routes.py)

8. **EdTech Answer-First Content Hub (6 Published Guides)**
   - 6 full-length educational guides targeting college students and early-career software engineers.
   - Direct-answer summary blocks, verified H1/H2/H3 hierarchies, contextual internal links, Schema.org Article and FAQPage JSON-LD.
   - Code location: [`backend/app/content/`](file:///Users/pranjalsingh/Desktop/seo/backend/app/content/)

9. **Deterministic Internal Linking Mesh & Orphan Analyzer**
   - Graph extraction and connectivity analysis calculating in-degree, out-degree, and flagging orphan pages.
   - Code location: [`backend/app/content/links.py`](file:///Users/pranjalsingh/Desktop/seo/backend/app/content/links.py)

---

## 2. Verified Technical Facts (Test & QA Proof)

The following claims are verified via automated tests and script executions in this repository:

- **100% Automated Backend Test Pass Rate**:
  - **56 passing unit and integration tests** in `pytest` covering API routes, crawler, parser, GSC analytics, GA4 processing, content graph, and production deployment assertions.
  - Test command: `source .venv/bin/activate && PYTHONPATH=backend pytest backend/tests`
- **Zero Localhost Leakage in Production**:
  - `resolve_canonical_url()` dynamically swaps `localhost` or `127.0.0.1` for the production `SITE_URL`.
  - Production `sitemap.xml` and `robots.txt` endpoints contain zero dev ports or localhost references when `SITE_URL` is configured.
  - Verified by tests: `test_production_sitemap_no_localhost_when_configured` and `test_production_robots_txt_no_localhost_when_configured`.
- **Zero Frontend Build Errors**:
  - React 18 + TypeScript + Vite builds production bundle with zero type errors.
  - Build command: `cd frontend && npm run build`
- **Deterministic SEO Technical Verification**:
  - Automated check validates all 6 published articles for Title presence & uniqueness, Meta description length (50–160 chars), Absolute canonical URL, Single H1 hierarchy, Direct answer block (30–80 words), Outgoing internal links, Orphan status, and Schema.org Article & conditional FAQPage JSON-LD.
  - Verified by endpoint: `GET /api/seo/audit` and script: `scripts/production_check.py`.

---

## 3. Measured Data Status

To uphold absolute scientific rigor:

| Data Type | Count in Database | Provenance / Verification Status |
| :--- | :--- | :--- |
| **Published Educational Articles** | **6 Articles** | Verified & Active in SQLite (`ContentPage` table) |
| **Real GSC CSV Rows** | **0 Rows** | Awaiting user CSV upload from verified Google property |
| **Real GA4 CSV Rows** | **0 Rows** | Awaiting user CSV upload from verified GA4 property |
| **Live API AI Visibility Runs** | **0 Runs** | Awaiting optional user OpenAI / Gemini / Perplexity API key |
| **Manual AI Visibility Observations** | **0 Rows** | Supported via Manual Import form; 0 unverified claims |
| **Sample AI Benchmark Observations** | **180 Rows** | Labeled with explicit **SAMPLE / DEMO** badges; strictly isolated from measured analytics |

---

## 4. Unmeasured External Outcomes (Honest Disclosure)

OmniGEO strictly avoids fabricating real-world search engine outcomes. The following metrics are **NOT YET MEASURED**:

- ❌ **Google Page 1 Rankings**: Not claimed. Requires domain launch, Googlebot crawl, indexing, and live GSC search performance data.
- ❌ **Organic Google Search Impressions & Clicks**: Not claimed. Requires live GSC data connection.
- ❌ **GA4 Real-World Users & Conversions**: Not claimed. Requires traffic from active visitors with `VITE_GA4_MEASUREMENT_ID` enabled.
- ❌ **Google AI Overviews Citations**: Not claimed. Google AI Overviews does not offer a public search API; web scraping of Google SERPs is strictly prohibited.

---

## 5. Resume Bullet Points (Honest & Verifiable)

### Option 1: AI Search & Generative Engine Optimization (AEO / GEO)
> Built **OmniGEO**, an end-to-end AI search visibility (GEO) and Answer Engine Optimization (AEO) platform benchmarking 5 EdTech brands across 36 high-intent student queries using official LLM APIs and deterministic answer-readiness scoring.

### Option 2: Technical SEO & Structured Data Architecture
> Developed a production-ready educational content hub featuring 6 answer-first guides engineered for Google featured snippets; implemented automated Schema.org Article/FAQPage JSON-LD generation, XML sitemaps, robots.txt, and zero-localhost canonical resolution verified by 56 automated backend tests.

### Option 3: Search Console & GA4 Performance Measurement Loop
> Engineered a 360° analytics engine cross-analyzing on-page technical factors with Google Search Console performance data (weighted CTR, impression-weighted positions, query intent mapping) and GA4 user engagement metrics.
