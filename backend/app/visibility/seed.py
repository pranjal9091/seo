import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from app.models.db_models import (
    Brand, SearchQuery, VisibilityRun, BrandVisibilityObservation, CitationObservation
)

BENCHMARK_BRANDS = [
    {
        "id": "nxtwave",
        "name": "NxtWave",
        "domain": "nxtwave.co.in",
        "aliases": ["nxtwave", "ccbp", "ccbp 4.0", "nxt wave"],
        "is_target": 1
    },
    {
        "id": "scaler",
        "name": "Scaler",
        "domain": "scaler.com",
        "aliases": ["scaler", "scaler academy", "interviewbit"],
        "is_target": 0
    },
    {
        "id": "masai",
        "name": "Masai",
        "domain": "masaischool.com",
        "aliases": ["masai", "masai school"],
        "is_target": 0
    },
    {
        "id": "pwskills",
        "name": "PW Skills",
        "domain": "pwskills.com",
        "aliases": ["pw skills", "pwskills", "physics wallah skills"],
        "is_target": 0
    },
    {
        "id": "upgrad",
        "name": "upGrad",
        "domain": "upgrad.com",
        "aliases": ["upgrad", "up grad"],
        "is_target": 0
    }
]

INITIAL_QUERIES = [
    # 1. Discovery
    ("q_01", "best coding course for freshers in India", "Discovery"),
    ("q_02", "top online software engineering bootcamps in India", "Discovery"),
    ("q_03", "how to learn coding from scratch for B.Tech students", "Discovery"),
    ("q_04", "best full stack development courses with job guarantee or assistance", "Discovery"),

    # 2. Comparison
    ("q_05", "NxtWave vs Scaler", "Comparison"),
    ("q_06", "Scaler vs Masai school for web development", "Comparison"),
    ("q_07", "NxtWave CCBP vs traditional MCA degree", "Comparison"),
    ("q_08", "PW Skills vs NxtWave for beginner developers", "Comparison"),
    ("q_09", "Scaler academy vs upGrad full stack program", "Comparison"),

    # 3. Recommendation
    ("q_10", "which coding course is best for tier-3 college engineering students", "Recommendation"),
    ("q_11", "recommended tech upskilling platform for non-CS graduates", "Recommendation"),
    ("q_12", "best platform to learn MERN stack and data structures in India", "Recommendation"),
    ("q_13", "which online institute offers practical project-based coding curriculum", "Recommendation"),

    # 4. Brand Evaluation
    ("q_14", "is NxtWave CCBP worth it for freshers", "Brand evaluation"),
    ("q_15", "honest student reviews of NxtWave disruptive technologies", "Brand evaluation"),
    ("q_16", "is Scaler academy worth the high fee structure", "Brand evaluation"),
    ("q_17", "Masai school ISA placement reviews", "Brand evaluation"),

    # 5. Career Outcome
    ("q_18", "best placement-focused coding program in India", "Career outcome"),
    ("q_19", "which edtech platform has highest placement percentage for developers", "Career outcome"),
    ("q_20", "average salary package after completing NxtWave CCBP", "Career outcome"),
    ("q_21", "software engineer salary after Scaler academy", "Career outcome"),

    # 6. Course Selection
    ("q_22", "best online coding course for B.Tech students", "Course selection"),
    ("q_23", "which coding course is best for beginners in college", "Course selection"),
    ("q_24", "best Python and React full stack roadmap course", "Course selection"),
    ("q_25", "backend development program with live mentor guidance", "Course selection"),

    # 7. Pricing / Value
    ("q_26", "affordable coding bootcamp in India with good placement records", "Pricing/value"),
    ("q_27", "NxtWave CCBP course fee and EMI options", "Pricing/value"),
    ("q_28", "best value for money software engineering bootcamp", "Pricing/value"),

    # 8. AI/ML Learning
    ("q_29", "best AI/ML course for college students in India", "AI/ML learning"),
    ("q_30", "data science and generative AI curriculum for beginners", "AI/ML learning"),
    ("q_31", "how to learn practical artificial intelligence alongside college", "AI/ML learning"),
    ("q_32", "NxtWave 4.0 emerging technologies and AI programs", "AI/ML learning"),

    # 9. Coding / Placement
    ("q_33", "how to get a high-paying software job without a CS degree", "Coding/placement"),
    ("q_34", "tech upskilling programs for mechanical and civil engineers", "Coding/placement"),
    ("q_35", "courses that teach DSA and system design for product companies", "Coding/placement"),
    ("q_36", "best preparation program for software developer campus placements", "Coding/placement"),
]

def seed_database_defaults(db: Session):
    # 1. Seed Brands
    for b_data in BENCHMARK_BRANDS:
        existing = db.query(Brand).filter(Brand.id == b_data["id"]).first()
        if not existing:
            brand = Brand(
                id=b_data["id"],
                name=b_data["name"],
                domain=b_data["domain"],
                aliases=b_data["aliases"],
                active=1,
                is_target=b_data["is_target"]
            )
            db.add(brand)

    # 2. Seed Queries
    for q_id, q_text, q_intent in INITIAL_QUERIES:
        existing_q = db.query(SearchQuery).filter(SearchQuery.id == q_id).first()
        if not existing_q:
            query_obj = SearchQuery(
                id=q_id,
                question=q_text,
                intent_category=q_intent,
                active=1,
                created_at=datetime.now(timezone.utc)
            )
            db.add(query_obj)

    db.commit()

    # 3. Seed Realistic Sample Observations (Flagged is_sample=1) if table is empty
    runs_count = db.query(VisibilityRun).count()
    if runs_count == 0:
        seed_sample_observations(db)

def seed_sample_observations(db: Session):
    """
    Seeds transparent sample observations across OpenAI, Gemini, and Perplexity
    for key queries. These are explicitly tagged with is_sample = 1.
    """
    providers = ["openai", "gemini", "perplexity"]
    now = datetime.now(timezone.utc)

    # Sample query responses and observations
    sample_records = [
        {
            "query_id": "q_01",
            "provider": "openai",
            "response": (
                "For freshers in India seeking coding courses with placement orientation, prominent options include:\n"
                "1. Scaler Academy: Known for a rigorous DSA and system design curriculum taught by tech industry mentors.\n"
                "2. NxtWave (CCBP 4.0): Focuses specifically on college students and fresh graduates, emphasizing continuous practice and vernacular support.\n"
                "3. Masai School: Offers intense full-stack web development with ISA and placement assistance.\n"
                "4. PW Skills: Provides budget-friendly foundation courses in web development and data science."
            ),
            "citations": ["https://www.scaler.com/courses", "https://www.nxtwave.co.in/ccbp"],
            "days_ago": 2
        },
        {
            "query_id": "q_05",
            "provider": "perplexity",
            "response": (
                "When comparing NxtWave and Scaler:\n"
                "- NxtWave (CCBP 4.0) primarily targets college students, non-CS graduates, and tier-2/3 college freshers with 4.0 technology tracks.\n"
                "- Scaler Academy is geared towards working software engineers or students with prior fundamentals aiming for product companies (FAANG/tier-1).\n"
                "Both have strong placement support, with Scaler costing higher and NxtWave offering accessible structured learning tracks."
            ),
            "citations": ["https://www.nxtwave.co.in", "https://www.scaler.com/blog/comparison"],
            "days_ago": 3
        },
        {
            "query_id": "q_06",
            "provider": "gemini",
            "response": (
                "Comparing Scaler and Masai School for web development:\n"
                "Masai School focuses heavily on MERN stack web development from ground zero with synchronous coding routines.\n"
                "Scaler Academy provides advanced computer science fundamentals, DSA, and scalable architecture.\n"
                "NxtWave is also an alternative providing 4.0 tech ecosystem training for freshers."
            ),
            "citations": ["https://masaischool.com", "https://scaler.com"],
            "days_ago": 4
        },
        {
            "query_id": "q_14",
            "provider": "perplexity",
            "response": (
                "NxtWave's CCBP 4.0 program is generally reviewed positively for engineering freshers who struggle with college campus placements. "
                "Strengths include industry-aligned practical projects, vernacular tech explanations, and active placement drives. "
                "However, students note that dedication to the intensive daily schedule is required to achieve results."
            ),
            "citations": ["https://www.nxtwave.co.in/reviews", "https://timesofindia.indiatimes.com/education"],
            "days_ago": 1
        },
        {
            "query_id": "q_18",
            "provider": "openai",
            "response": (
                "Top placement-focused coding programs in India include:\n"
                "1. Scaler Academy - High average CTC for software engineering roles.\n"
                "2. NxtWave CCBP - High volume placement numbers for tier-2/3 college learners across 1500+ companies.\n"
                "3. upGrad - Comprehensive degree and diploma certifications with tech companies.\n"
                "4. PW Skills - Affordable upskilling programs for early careers."
            ),
            "citations": ["https://scaler.com", "https://nxtwave.co.in"],
            "days_ago": 5
        },
        {
            "query_id": "q_22",
            "provider": "gemini",
            "response": (
                "For B.Tech students looking for online coding courses, the best platforms depend on career stage:\n"
                "- First & Second Year: PW Skills or Coursera for fundamentals.\n"
                "- Pre-final & Final Year: NxtWave CCBP 4.0 for placement preparation or Scaler for advanced competitive programming.\n"
                "- Career transitioners: Masai School."
            ),
            "citations": ["https://pwskills.com", "https://nxtwave.co.in"],
            "days_ago": 6
        },
        {
            "query_id": "q_29",
            "provider": "openai",
            "response": (
                "For college students in India aiming to learn AI and Machine Learning:\n"
                "1. upGrad offers AI/ML post-graduate diplomas with university partnerships.\n"
                "2. Scaler Data Science & ML provides deep math, statistics, and machine learning modules.\n"
                "3. NxtWave incorporates emerging AI/ML and full stack 4.0 tracks for early-stage engineering students."
            ),
            "citations": ["https://upgrad.com", "https://scaler.com"],
            "days_ago": 7
        },
        {
            "query_id": "q_02",
            "provider": "perplexity",
            "response": (
                "Top software engineering bootcamps in India include Masai School, Scaler, and NxtWave. "
                "Masai emphasizes rigorous 9-9-6 coding bootcamps, Scaler focuses on senior tech career acceleration, "
                "and NxtWave bridges the academia-industry gap for freshers."
            ),
            "citations": ["https://masaischool.com", "https://scaler.com", "https://nxtwave.co.in"],
            "days_ago": 8
        }
    ]

    for rec in sample_records:
        run_id = f"run_{uuid.uuid4().hex[:10]}"
        run_time = now - timedelta(days=rec["days_ago"])
        
        run = VisibilityRun(
            id=run_id,
            provider=rec["provider"],
            query_id=rec["query_id"],
            executed_at=run_time,
            raw_response=rec["response"],
            status="success",
            latency_ms=1250,
            is_manual=0,
            is_sample=1
        )
        db.add(run)

        # Detect brands for this sample run
        resp_lower = rec["response"].lower()
        for b_data in BENCHMARK_BRANDS:
            # Check if brand or alias matches
            matched = False
            first_pos = -1
            mention_count = 0

            for alias in b_data["aliases"]:
                pos = resp_lower.find(alias.lower())
                if pos != -1:
                    matched = True
                    count = resp_lower.count(alias.lower())
                    mention_count += count
                    if first_pos == -1 or pos < first_pos:
                        first_pos = pos

            prominence = 0.0
            if matched and len(rec["response"]) > 0:
                prominence = max(0.0, round(1.0 - (first_pos / len(rec["response"])), 3))

            obs = BrandVisibilityObservation(
                id=f"bobs_{uuid.uuid4().hex[:10]}",
                run_id=run_id,
                brand_id=b_data["id"],
                mentioned=1 if matched else 0,
                mention_count=mention_count,
                first_mention_position=first_pos,
                prominence_score=prominence
            )
            db.add(obs)

        # Citations
        for c_url in rec.get("citations", []):
            domain = c_url.split("//")[-1].split("/")[0].replace("www.", "").lower()
            mapped_brand = None
            for b_data in BENCHMARK_BRANDS:
                if b_data["domain"].lower() in domain or domain in b_data["domain"].lower():
                    mapped_brand = b_data["id"]
                    break

            c_obs = CitationObservation(
                id=f"cobs_{uuid.uuid4().hex[:10]}",
                run_id=run_id,
                url=c_url,
                domain=domain,
                brand_id=mapped_brand,
                created_at=run_time
            )
            db.add(c_obs)

    db.commit()
