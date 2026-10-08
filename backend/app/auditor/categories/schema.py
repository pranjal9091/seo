from typing import List, Tuple, Set
from app.models.audit import ExtractedWebpageData, AuditFinding, RuleCheckResult
from app.auditor.rules_base import create_finding, create_check

HIGH_VALUE_SCHEMAS = {
    "Course", "FAQPage", "Article", "BlogPosting", "NewsArticle",
    "HowTo", "Organization", "EducationalOrganization", "Product", "Event"
}

def audit_schema(data: ExtractedWebpageData) -> Tuple[List[RuleCheckResult], List[AuditFinding]]:
    checks: List[RuleCheckResult] = []
    findings: List[AuditFinding] = []
    
    schemas = data.schemas
    total_schemas = len(schemas)
    
    # Collect all types and errors
    all_types: Set[str] = set()
    syntax_errors: List[str] = []
    valid_count = 0
    has_schema_org_context = False
    
    for s in schemas:
        if s.is_valid_json:
            valid_count += 1
            all_types.update(s.schema_types)
            if s.has_context:
                has_schema_org_context = True
        else:
            if s.error:
                syntax_errors.append(s.error)

    # SCHEMA-01: JSON-LD Presence & Validity (Max: 8.0)
    if total_schemas == 0:
        checks.append(create_check(
            "SCHEMA-01", "Missing JSON-LD Structured Data", 0.0, 8.0,
            "No <script type='application/ld+json'> blocks detected on the page."
        ))
        findings.append(create_finding(
            "SCHEMA-ERR-NONE", "high", "schema",
            "Missing JSON-LD Structured Data",
            "Webpage contains no JSON-LD schema markup.",
            "Evidence: 0 application/ld+json script blocks found",
            "Structured data provides explicit semantic context to Google Knowledge Graph and AI search engines, enabling rich snippets and entity disambiguation.",
            "Implement relevant schema markup (such as Course, FAQPage, Organization, or Article) in JSON-LD format."
        ))
    elif syntax_errors:
        checks.append(create_check(
            "SCHEMA-01", "Invalid JSON-LD Syntax Detected", 2.0, 8.0,
            f"Found {len(syntax_errors)} JSON-LD script block(s) with syntax errors."
        ))
        findings.append(create_finding(
            "SCHEMA-ERR-SYNTAX", "critical", "schema",
            "JSON-LD Syntax Errors Detected",
            f"Failed to parse JSON-LD due to syntax error: {syntax_errors[0]}",
            f"Error details: {syntax_errors[0]}",
            "Invalid JSON is discarded entirely by search engine crawlers, nullifying all rich result eligibility.",
            "Validate JSON syntax using Google's Rich Results Test and eliminate unescaped quotes or trailing commas."
        ))
    elif not has_schema_org_context:
        checks.append(create_check(
            "SCHEMA-01", "Missing schema.org @context", 4.0, 8.0,
            "JSON-LD blocks do not properly reference '@context': 'https://schema.org'."
        ))
        findings.append(create_finding(
            "SCHEMA-WARN-CONTEXT", "medium", "schema",
            "Missing schema.org Context Definition",
            "JSON-LD does not declare standard https://schema.org context.",
            "Evidence: @context property missing or invalid",
            "Search engines require the schema.org vocabulary context to correctly map entities.",
            "Add '@context': 'https://schema.org' at the root of the JSON-LD object."
        ))
    else:
        checks.append(create_check(
            "SCHEMA-01", "Valid JSON-LD Markup", 8.0, 8.0,
            f"Found {valid_count} valid JSON-LD schema block(s) properly utilizing schema.org context."
        ))

    # SCHEMA-02: High-Value Entity Schema Coverage (Max: 7.0)
    matched_high_value = all_types.intersection(HIGH_VALUE_SCHEMAS)
    if matched_high_value:
        types_str = ", ".join(sorted(list(matched_high_value)))
        checks.append(create_check(
            "SCHEMA-02", "High-Value Entity Schema Present", 7.0, 7.0,
            f"Detected recommended entity schemas: {types_str}"
        ))
    elif all_types:
        types_str = ", ".join(sorted(list(all_types)))
        checks.append(create_check(
            "SCHEMA-02", "Generic Schema Types Only", 4.0, 7.0,
            f"Detected generic schema types ({types_str}), but lacking specific rich entity schemas."
        ))
        findings.append(create_finding(
            "SCHEMA-INFO-GENERIC", "low", "schema",
            "Generic Structured Data Detected",
            f"Page only declares basic schemas: {types_str}",
            f"Schemas present: {types_str}",
            "Generic schemas (like WebSite or WebPage) do not trigger Google Rich Badges or specialized AI entity cards.",
            "Enrich with specialized types such as Course, Article, FAQPage, or EducationalOrganization."
        ))
    else:
        checks.append(create_check(
            "SCHEMA-02", "No Entity Types Recognized", 0.0, 7.0,
            "No valid schema types could be recognized."
        ))

    # SCHEMA-03: FAQ & Q&A Schema Readiness (Max: 5.0)
    has_faq_schema = "FAQPage" in all_types
    has_faq_html = data.aeo.has_faq_section

    if has_faq_schema:
        checks.append(create_check(
            "SCHEMA-03", "FAQPage Schema Implemented", 5.0, 5.0,
            "FAQPage schema successfully configured for rich Q&A search results."
        ))
    elif has_faq_html:
        checks.append(create_check(
            "SCHEMA-03", "FAQ Detected in HTML but Missing Schema", 2.0, 5.0,
            "FAQ section exists in page content but is not marked up with FAQPage JSON-LD."
        ))
        findings.append(create_finding(
            "SCHEMA-WARN-UNMARKED-FAQ", "medium", "schema",
            "FAQ Content Lacks FAQPage Schema Markup",
            "The webpage includes an FAQ section in the HTML body, but no FAQPage schema is implemented.",
            "Evidence: FAQ headings or section detected in HTML, but FAQPage missing from JSON-LD",
            "Adding FAQPage schema directly enables Google to display collapsible accordion answers in search results and feeds AI query engines.",
            "Wrap existing Q&A content in FAQPage JSON-LD schema using our Schema Generator."
        ))
    else:
        checks.append(create_check(
            "SCHEMA-03", "No FAQ Schema", 0.0, 5.0,
            "No FAQ content or FAQPage schema found on this page."
        ))

    return checks, findings
