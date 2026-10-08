from typing import List, Tuple
from app.models.audit import ExtractedWebpageData, AuditFinding, RuleCheckResult
from app.auditor.rules_base import create_finding, create_check

def audit_aeo(data: ExtractedWebpageData) -> Tuple[List[RuleCheckResult], List[AuditFinding]]:
    checks: List[RuleCheckResult] = []
    findings: List[AuditFinding] = []
    aeo = data.aeo

    # AEO-01: Direct Answer Snippet Block (Max: 10.0)
    if aeo.direct_answer_candidate:
        wc = aeo.answer_word_count
        if aeo.is_optimal_length:
            checks.append(create_check(
                "AEO-01", "Optimal Direct Answer Block (40-65 words)", 10.0, 10.0,
                f"Concise direct answer block detected ({wc} words) near top of content: '{aeo.direct_answer_candidate[:90]}...'"
            ))
        elif 25 <= wc <= 80:
            checks.append(create_check(
                "AEO-01", "Sub-Optimal Answer Block Length", 6.5, 10.0,
                f"Answer block detected ({wc} words), slightly outside optimal 40-65 word snippet window."
            ))
            findings.append(create_finding(
                "AEO-WARN-ANSWER-LEN", "low", "aeo",
                "Direct Answer Block Could Be More Concise",
                f"Candidate answer paragraph contains {wc} words.",
                f"Candidate text: '{aeo.direct_answer_candidate[:110]}...'",
                "Google Featured Snippets and LLM retrieval engines prioritize tight 40-60 word summaries for direct answers.",
                "Edit the introductory definition paragraph to directly answer the target query in 40-55 words."
            ))
        else:
            checks.append(create_check(
                "AEO-01", "Answer Block Too Verbose/Short", 3.0, 10.0,
                f"Paragraph is {wc} words, which is either too brief or too long for a featured snippet."
            ))
            findings.append(create_finding(
                "AEO-ERR-VERBOSE-ANSWER", "medium", "aeo",
                "Missing Concise Answer Paragraph",
                f"Paragraph length is {wc} words.",
                f"Extracted block: '{aeo.direct_answer_candidate[:90]}...'",
                "Lengthy paragraphs dilute key takeaways, reducing the likelihood of LLM extraction and featured snippet capture.",
                "Add a standalone, bolded or highlighted 2-3 sentence direct answer right below the primary H1/H2."
            ))
    else:
        checks.append(create_check(
            "AEO-01", "No Concise Direct Answer Block Detected", 0.0, 10.0,
            "No concise direct answer paragraph was identified in the opening sections of the webpage."
        ))
        findings.append(create_finding(
            "AEO-ERR-NO-ANSWER-BLOCK", "high", "aeo",
            "Missing Direct Answer / Inverted Pyramid Structure",
            "Page fails to provide a direct, concise answer to the user's primary query in the top section.",
            "Evidence: No 30-70 word definitive answer paragraph found under document headings",
            "Generative AI engines (Perplexity, ChatGPT, Gemini) and Google AI Overviews seek immediate answers to synthesize responses.",
            "Implement the 'Answer-First' framework: provide a crisp 40-50 word answer block immediately beneath the primary heading before elaborating."
        ))

    # AEO-02: Question-Led Search Intent Headings (Max: 7.0)
    q_count = aeo.question_headings_count
    if q_count >= 2:
        checks.append(create_check(
            "AEO-02", "Question-Led Search Intent Headings", 7.0, 7.0,
            f"Found {q_count} question-targeted headings matching user search queries (e.g., '{aeo.question_headings[0]}')."
        ))
    elif q_count == 1:
        checks.append(create_check(
            "AEO-02", "Single Question Heading", 4.0, 7.0,
            f"Found 1 question heading: '{aeo.question_headings[0]}'."
        ))
        findings.append(create_finding(
            "AEO-WARN-FEW-QUESTIONS", "low", "aeo",
            "Limited Question-Targeted Headings",
            "Page contains only 1 question-form heading.",
            f"Heading: '{aeo.question_headings[0]}'",
            "Users search using conversational questions ('Is X worth it?', 'How does Y work?'). Question headings capture Google PAA and AI queries.",
            "Formulate secondary H2/H3 headings as explicit questions reflecting long-tail search intent."
        ))
    else:
        checks.append(create_check(
            "AEO-02", "No Question-Led Headings", 1.0, 7.0,
            "No headings are formatted as user-style questions (What, How, Why, Which, Is)."
        ))
        findings.append(create_finding(
            "AEO-WARN-NO-QUESTION-HEADINGS", "medium", "aeo",
            "Lack of Natural Question Headings (PAA Gaps)",
            "Headings are purely topical labels rather than user-intent questions.",
            "Headings reviewed: No interrogative phrases ('What is', 'How to', 'Is it worth it')",
            "Modern AI search engines use question-heading alignment to map user prompts directly to candidate answer passages.",
            "Incorporate at least 2-3 question-style headings (e.g., 'What is CCBP 4.0?', 'How does it compare to traditional bootcamps?')."
        ))

    # AEO-03: Structured Formats for LLM Extraction (Max: 7.0)
    has_lists = (aeo.ordered_lists_count + aeo.unordered_lists_count) > 0
    has_tables = aeo.tables_count > 0
    
    if has_lists and has_tables:
        checks.append(create_check(
            "AEO-03", "Rich Lists & Comparison Tables Present", 7.0, 7.0,
            f"Page features structured lists ({aeo.ordered_lists_count + aeo.unordered_lists_count}) and comparison tables ({aeo.tables_count})."
        ))
    elif has_lists:
        checks.append(create_check(
            "AEO-03", "Structured Lists Present", 5.0, 7.0,
            f"Page contains structured bullet/numbered lists ({aeo.ordered_lists_count + aeo.unordered_lists_count}), but no data table."
        ))
        findings.append(create_finding(
            "AEO-INFO-NO-TABLES", "low", "aeo",
            "Opportunity for Comparison / Summary Table",
            "Content uses lists but does not include any HTML <table> structures.",
            f"Lists: {aeo.ordered_lists_count + aeo.unordered_lists_count} | Tables: 0",
            "For comparison or feature queries, AI Overviews frequently pull structured table matrices directly into the response.",
            "If discussing programs, curriculums, or comparisons, include a clean HTML comparison table."
        ))
    elif has_tables:
        checks.append(create_check(
            "AEO-03", "Data Table Present", 5.0, 7.0,
            f"Page includes {aeo.tables_count} structured data table(s)."
        ))
    else:
        checks.append(create_check(
            "AEO-03", "No Structured Lists or Tables", 1.5, 7.0,
            "Content consists exclusively of standard text paragraphs without lists or tables."
        ))
        findings.append(create_finding(
            "AEO-WARN-UNSTRUCTURED-CONTENT", "medium", "aeo",
            "Unstructured Content Layout (No Lists or Tables)",
            "Webpage contains no <ol>, <ul>, or <table> tags in the main content.",
            "Evidence: 0 lists and 0 tables found",
            "Continuous wall-of-text content impairs skimmability and prevents AI models from synthesizing step-by-step or comparative summaries.",
            "Break down core points into bulleted steps (<ol>/<ul>) or comparative matrices."
        ))

    # AEO-04: Factual & Statistical Density (Max: 6.0)
    stats_count = aeo.factual_numbers_count
    if stats_count >= 5:
        checks.append(create_check(
            "AEO-04", "High Factual & Statistical Density", 6.0, 6.0,
            f"Detected {stats_count} verifiable quantitative markers (percentages, metrics, dates, currency)."
        ))
    elif 2 <= stats_count < 5:
        checks.append(create_check(
            "AEO-04", "Moderate Factual Density", 3.5, 6.0,
            f"Detected {stats_count} quantitative markers."
        ))
        findings.append(create_finding(
            "AEO-INFO-MORE-STATS", "low", "aeo",
            "Opportunity to Increase Statistical Citations",
            f"Found only {stats_count} quantitative data markers in page content.",
            f"Quantitative references count: {stats_count}",
            "Generative Engine Optimization (GEO) research indicates factual and statistical claims boost LLM citation rates by ~35%.",
            "Incorporate concrete data (e.g., placement rates, student cohorts, completion timelines, specific percentages)."
        ))
    else:
        checks.append(create_check(
            "AEO-04", "Low Factual & Quantitative Density", 1.0, 6.0,
            "Few or no quantitative data points detected in the text."
        ))
        findings.append(create_finding(
            "AEO-WARN-NO-FACTS", "medium", "aeo",
            "Low Quantitative Citation Density",
            "Page contains negligible statistical, numeric, or verifiable factual metrics.",
            f"Data markers detected: {stats_count}",
            "LLMs tend to favor sources that provide concrete, verifiable figures over vague generalized claims.",
            "Back assertions with specific metrics, survey figures, dates, and quantitative evidence."
        ))

    return checks, findings
