# OmniGEO

<p align="center">
  <strong>Generative Engine Optimization (GEO), AI Search Visibility & Technical SEO Intelligence Platform</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/FastAPI-0.110+-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.5-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/Vite-5.0-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Tests-56%2F56%20Passed-10B981?style=for-the-badge" alt="Tests" />
  <img src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge" alt="License" />
</p>

---

## Overview

**OmniGEO** is an intelligence console designed to measure and optimize brand presence in the era of generative AI search. While legacy SEO tools stop at Google SERP blue links, OmniGEO benchmarks how LLMs (**ChatGPT, Google Gemini, Perplexity**) answer high-intent user questions, cite sources, and recommend brands — unified with deterministic on-page technical audits, Google Search Console performance data, and GA4 telemetry.

Built with a **strict data honesty standard**: OmniGEO never invents rankings, never fabricates traffic numbers, and cleanly separates verified measurements from sample benchmarks.

---

## Core Capabilities

### 1. 🤖 AI Search Visibility (GEO Engine)
- **36-Query EdTech Benchmark Library**: Curated across 9 high-intent student search categories (Career Transition, College Placement, Course Comparisons, Coding Foundations, Salary Expectations, and Upskilling ROI).
- **Competitor Benchmarking**: Directly measures NxtWave's share of voice against Scaler, Masai School, PW Skills, and upGrad.
- **Provider Adapters**: Query live official APIs for OpenAI (`gpt-4o-mini`), Google Gemini (`gemini-1.5-flash`), and Perplexity (`sonar`), with fallback manual observation imports.
- **Metric Extraction**: Captures raw model responses, first mention character offset, citation sources, and response latency.

### 2. ⚡ Technical SEO & AEO URL Auditor
- **Deterministic 0–100 Scoring**: Evaluates crawl status codes, canonical URL consistency, SSR markers, and heading structures.
- **Answer Engine Optimization (AEO)**: Analyzes content for 30–80 word direct answer blocks, definition markers, markdown tables, and bullet structures designed for featured snippet and AI overview extraction.
- **Schema.org Generator**: Generates and validates syntax-compliant `Article`, `FAQPage`, `Organization`, and `Course` JSON-LD structured data.

### 3. 📚 Answer-First Educational Content Hub
- **6 Live Published Guides**: Fully developed long-form educational articles targeting high-intent tech career queries.
- **Direct-Answer Pullquotes**: 40–60 word concise definitions immediately beneath the introduction for AI snippet harvesting.
- **Internal Link Mesh**: Graph analysis that maps cross-links, calculates PageRank-style connectivity, and guarantees **zero orphan pages**.
- **Dynamic SEO Directives**: Production-ready `/sitemap.xml` and `/robots.txt` endpoints with zero localhost leakage.

### 4. 📊 Google Search Console & GA4 Integration
- **GSC Performance Analytics**: Parses real Google Search Console CSV exports; calculates weighted CTR, impression-weighted positions, and intent classification (Informational, Commercial, Navigational, Transactional).
- **Privacy-Safe GA4 Telemetry**: Zero-PII client tracker dispatching `page_view`, `article_view`, `scroll_depth` (25/50/75/100%), and internal link clicks.
- **360° Article Measurement Loop**: Cross-references on-page score, schema validity, search impressions, and user engagement into a unified page lifecycle view.

### 5. 🛡️ Provenance & Evidence Tracker
- **EvidenceRecord Engine**: Auditable database ledger tracking real deployment verification, Search Console ownership, sitemap submission, and live AI citations.

---

## Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        OMNIGEO ARCHITECTURE                            │
└────────────────────────────────────────────────────────────────────────┘
                                   │
         ┌─────────────────────────┴─────────────────────────┐
         ▼                                                   ▼
┌─────────────────────────────────┐         ┌─────────────────────────────────┐
│       React 18 / Vite SPA       │         │      FastAPI Intelligence       │
│  - Deep Obsidian Command Shell  │  REST   │  - /api/audit (Crawler/Scorer)  │
│  - Executive Pulse & Charts     │◄───────►│  - /api/visibility (GEO Engine) │
│  - AI Visibility Matrix         │  JSON   │  - /api/content (Hub & LinkMesh)│
│  - Content Hub (6 Live Guides)  │         │  - /api/gsc & /api/ga4 Analytics│
│  - Evidence & Provenance QA     │         │  - /api/seo/audit (Readiness)   │
└─────────────────────────────────┘         └─────────────────────────────────┘
                                                             │
         ┌───────────────────────────────────────────────────┴───────┐
         ▼                                                           ▼
┌─────────────────────────────────┐                 ┌─────────────────────────────────┐
│     Persistent Storage Layer    │                 │      External Integrations      │
│  - SQLite (omnigeo.db / volume) │                 │  - OpenAI, Gemini, Perplexity   │
│  - SQLAlchemy 2.0 ORM Models    │                 │  - Google Search Console (CSV)  │
│  - Thread-Safe Connection Pool  │                 │  - Google Analytics 4 (gtag)    │
└─────────────────────────────────┘                 └─────────────────────────────────┘
```

---

## Tech Stack

| Component | Technologies |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite, Vanilla CSS Design System, SVG Visualization |
| **Backend** | Python 3.11+, FastAPI, Uvicorn, SQLAlchemy 2.0, Pydantic v2 |
| **Storage** | SQLite (persistent named disk volume in Docker) / PostgreSQL compatible |
| **Testing** | Pytest, pytest-asyncio, HTTPX TestClient (56 unit & integration tests) |
| **Container** | Multi-stage Dockerfile, Docker Compose |

---

## Quick Start (Local Development)

### 1. Prerequisites
- Python 3.11+
- Node.js 18+ and npm

### 2. Backend Setup
```bash
# Clone the repository
git clone https://github.com/pranjalsingh/seo.git
cd seo

# Setup virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt

# Start backend server
PYTHONPATH=backend uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
API Documentation will be live at `http://127.0.0.1:8000/docs`.

### 3. Frontend Setup
```bash
# In a new terminal window:
cd frontend

# Install npm packages
npm install

# Start Vite dev server
npm run dev
```
Open `http://localhost:5173` to access the OmniGEO dashboard.

---

## Automated QA & Test Suite

The platform includes **56 automated tests** with 100% pass rate:

```bash
# Run backend test suite
source .venv/bin/activate
PYTHONPATH=backend pytest backend/tests

# Run production SEO readiness verification
PYTHONPATH=backend python3 scripts/production_check.py

# Build frontend production bundle
cd frontend && npm run build
```

---

## Deploy to Vercel (Step-by-Step)

The frontend is fully configured for deployment on **Vercel**:

### 1. Push Code to GitHub
```bash
git add .
git commit -m "feat: complete OmniGEO intelligence platform"
git push -u origin main
```

### 2. Import Project on Vercel
1. Go to [vercel.com](https://vercel.com) and log in.
2. Click **Add New...** → **Project**.
3. Select your GitHub repository: `pranjal9091/seo`.
4. In the configuration screen:
   - **Root Directory**: Click `Edit` and select `frontend`.
   - **Framework Preset**: `Vite` (automatically detected).
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. **Environment Variables**:
   Add the following variable:
   ```
   VITE_API_BASE_URL = https://your-backend-url.onrender.com
   VITE_SITE_URL     = https://your-vercel-domain.vercel.app
   ```
   *(If deploying the frontend first, you can leave `VITE_API_BASE_URL` empty or point it to your deployed backend once ready).*
6. Click **Deploy**. Vercel will build and launch your live site in under 60 seconds!

> [!NOTE]
> `frontend/vercel.json` already contains SPA rewrite rules so that direct navigation to `/content/what-is-generative-ai-and-how-does-it-work`, `/evidence`, etc. works seamlessly on page reload.

---

## Deploy Backend (Render / Railway / Docker)

Since FastAPI is a Python ASGI application, deploy it to a Python container host:

### Option A: Render (Free / Web Service)
1. In Render, select **New +** → **Web Service** → connect `pranjal9091/seo`.
2. **Environment**: `Python`
3. **Build Command**: `pip install -r backend/requirements.txt`
4. **Start Command**: `PYTHONPATH=backend uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. **Environment Variables**:
   ```
   ENVIRONMENT=production
   SITE_URL=https://your-vercel-domain.vercel.app
   FRONTEND_ORIGIN=https://your-vercel-domain.vercel.app
   DATABASE_URL=sqlite:///./omnigeo.db
   ```

### Option B: Docker Compose (Self-Hosted VPS)
```bash
docker compose up -d --build
```
`docker-compose.yml` mounts a persistent Docker volume (`omnigeo_data:/data`) so SQLite database writes survive container updates.

---

## Data Honesty & Provenance Policy

OmniGEO adheres to strict academic and measurement integrity:
1. **No Simulated SERP Rankings**: Position within an LLM response is termed *"Answer Mention Position"* and is never claimed as a Google SERP rank.
2. **No Fake Traffic or Conversions**: If no GSC or GA4 CSV is uploaded, dashboards remain in explicit *"Pending measurement"* states.
3. **Sample vs. Measured Separation**: The 180 baseline observations are labeled with prominent `SAMPLE / DEMO` badges and never mixed with real data.
4. **Descriptive Correlation**: GSC search demand and GA4 engagement are presented as descriptive cross-signals, never false causal attribution.

---

## Documentation

- [`docs/RESUME_EVIDENCE.md`](docs/RESUME_EVIDENCE.md): Verifiable technical claims categorized by Built, Verified, Measured, and Not Yet Measured.
- [`docs/NXTWAVE_ALIGNMENT.md`](docs/NXTWAVE_ALIGNMENT.md): Line-by-line mapping of all 17 requirements for the NxtWave AI Search Optimization / AEO / GEO role.

---

## License

This project is licensed under the [MIT License](LICENSE).
