from typing import List, Dict, Any, Optional, Literal
from pydantic import BaseModel, HttpUrl, Field
from datetime import datetime

class AuditRequest(BaseModel):
    url: str = Field(..., description="Target webpage URL starting with http:// or https://")

class HeadingNode(BaseModel):
    level: int  # 1 for H1, 2 for H2, 3 for H3
    text: str

class LinkSample(BaseModel):
    href: str
    text: str
    is_external: bool

class LinkStats(BaseModel):
    total_links: int
    internal_links: int
    external_links: int
    generic_anchor_count: int  # "click here", "read more", etc.
    empty_anchor_count: int
    samples: List[LinkSample] = []

class ImageItem(BaseModel):
    src: str
    alt: Optional[str] = None
    has_alt: bool
    is_empty_alt: bool

class ImageStats(BaseModel):
    total_images: int
    missing_alt_count: int
    empty_alt_count: int
    items_sample: List[ImageItem] = []

class SchemaItem(BaseModel):
    raw_json: str
    is_valid_json: bool
    schema_types: List[str] = []
    has_context: bool
    error: Optional[str] = None
    parsed_content: Optional[Dict[str, Any]] = None

class Directives(BaseModel):
    robots_meta: Optional[str] = None
    googlebot_meta: Optional[str] = None
    x_robots_tag: Optional[str] = None
    is_noindex: bool = False
    is_nofollow: bool = False
    is_nosnippet: bool = False

class AeoExtraction(BaseModel):
    direct_answer_candidate: Optional[str] = None
    answer_word_count: int = 0
    is_optimal_length: bool = False  # 40-65 words
    question_headings: List[str] = []
    question_headings_count: int = 0
    factual_numbers_count: int = 0  # detected stats, numbers, percentages in primary content
    ordered_lists_count: int = 0
    unordered_lists_count: int = 0
    tables_count: int = 0
    has_faq_section: bool = False

class ExtractedWebpageData(BaseModel):
    requested_url: str
    final_url: str
    status_code: int
    response_time_ms: int
    content_type: str
    content_length_bytes: int
    redirect_count: int
    
    # On-page text
    title: Optional[str] = None
    title_length: int = 0
    meta_description: Optional[str] = None
    meta_description_length: int = 0
    canonical_url: Optional[str] = None
    canonical_matches_final: bool = False
    
    # Document components
    headings: List[HeadingNode] = []
    h1_count: int = 0
    h1_list: List[str] = []
    links: LinkStats
    images: ImageStats
    directives: Directives
    schemas: List[SchemaItem] = []
    aeo: AeoExtraction

SeverityLevel = Literal["critical", "high", "medium", "low"]
CategoryType = Literal["technical", "onpage", "aeo", "schema"]

class AuditFinding(BaseModel):
    id: str
    severity: SeverityLevel
    category: CategoryType
    title: str
    problem: str
    evidence: str
    why_it_matters: str
    recommendation: str

class RuleCheckResult(BaseModel):
    rule_id: str
    title: str
    earned_points: float
    max_points: float
    passed: bool
    explanation: str

class CategoryScore(BaseModel):
    category: CategoryType
    label: str
    earned: float
    max_score: float
    percentage: float
    checks: List[RuleCheckResult]

class AuditReport(BaseModel):
    id: str
    url: str
    timestamp: datetime
    overall_score: int  # 0 to 100
    category_scores: Dict[str, CategoryScore]
    findings: List[AuditFinding]
    extracted_data: ExtractedWebpageData
    summary_counts: Dict[str, int]
    methodology_version: str = "OmniGEO-Ruleset-v1.0"
    is_measured_data: bool = True
    disclaimer: str = (
        "This score is a transparent, deterministic rule-based evaluation of technical SEO, "
        "on-page hygiene, schema structure, and AEO answer-readiness. It is NOT a Google "
        "ranking algorithm score or simulated search position."
    )
