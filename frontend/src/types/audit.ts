export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low';
export type CategoryType = 'technical' | 'onpage' | 'aeo' | 'schema';

export interface HeadingNode {
  level: number;
  text: string;
}

export interface LinkSample {
  href: string;
  text: string;
  is_external: boolean;
}

export interface LinkStats {
  total_links: number;
  internal_links: number;
  external_links: number;
  generic_anchor_count: number;
  empty_anchor_count: number;
  samples: LinkSample[];
}

export interface ImageItem {
  src: string;
  alt: string | null;
  has_alt: boolean;
  is_empty_alt: boolean;
}

export interface ImageStats {
  total_images: number;
  missing_alt_count: number;
  empty_alt_count: number;
  items_sample: ImageItem[];
}

export interface SchemaItem {
  raw_json: string;
  is_valid_json: boolean;
  schema_types: string[];
  has_context: boolean;
  error?: string | null;
  parsed_content?: Record<string, any> | null;
}

export interface Directives {
  robots_meta?: string | null;
  googlebot_meta?: string | null;
  x_robots_tag?: string | null;
  is_noindex: boolean;
  is_nofollow: boolean;
  is_nosnippet: boolean;
}

export interface AeoExtraction {
  direct_answer_candidate?: string | null;
  answer_word_count: number;
  is_optimal_length: boolean;
  question_headings: string[];
  question_headings_count: number;
  factual_numbers_count: number;
  ordered_lists_count: number;
  unordered_lists_count: number;
  tables_count: number;
  has_faq_section: boolean;
}

export interface ExtractedWebpageData {
  requested_url: string;
  final_url: string;
  status_code: number;
  response_time_ms: number;
  content_type: string;
  content_length_bytes: number;
  redirect_count: number;
  title: string | null;
  title_length: number;
  meta_description: string | null;
  meta_description_length: number;
  canonical_url: string | null;
  canonical_matches_final: boolean;
  headings: HeadingNode[];
  h1_count: number;
  h1_list: string[];
  links: LinkStats;
  images: ImageStats;
  directives: Directives;
  schemas: SchemaItem[];
  aeo: AeoExtraction;
}

export interface AuditFinding {
  id: string;
  severity: SeverityLevel;
  category: CategoryType;
  title: string;
  problem: string;
  evidence: string;
  why_it_matters: string;
  recommendation: string;
}

export interface RuleCheckResult {
  rule_id: string;
  title: string;
  earned_points: number;
  max_points: number;
  passed: boolean;
  explanation: string;
}

export interface CategoryScore {
  category: CategoryType;
  label: string;
  earned: number;
  max_score: number;
  percentage: number;
  checks: RuleCheckResult[];
}

export interface AuditReport {
  id: string;
  url: string;
  timestamp: string;
  overall_score: number;
  category_scores: Record<string, CategoryScore>;
  findings: AuditFinding[];
  extracted_data: ExtractedWebpageData;
  summary_counts: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    total_issues: number;
    passed_checks: number;
    total_checks: number;
  };
  methodology_version: string;
  is_measured_data: boolean;
  disclaimer: string;
}

export interface AuditHistoryItem {
  id: string;
  url: string;
  timestamp: string;
  overall_score: number;
  status_code: number;
  response_time_ms: number;
  summary_counts: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    total_issues: number;
  };
}

export interface RoadmapModule {
  id: string;
  name: string;
  status: string;
  description: string;
  milestone: string;
}

export interface BrandBenchmark {
  brand_id: string;
  name: string;
  domain: string;
  is_target: boolean;
  mention_rate: number;
  mention_rate_pct: string;
  total_mentions: number;
  avg_first_mention_pos: number | null;
  avg_prominence_score: number;
  citation_count: number;
  citation_domain_share_pct: string;
  query_coverage: number;
  query_coverage_pct: string;
  provider_breakdown: Record<string, { total_runs: number; mentions: number; rate: number }>;
}

export interface VisibilitySummary {
  total_queries: number;
  successful_runs: number;
  providers_tested: string[];
  total_citations_observed: number;
  last_run_timestamp: string | null;
  is_sample_data: boolean;
  has_real_observations: boolean;
  data_label: string;
}

export interface VisibilityOverviewResponse {
  summary: VisibilitySummary;
  target_brand: BrandBenchmark | null;
  brands: BrandBenchmark[];
}

export interface SearchQueryItem {
  id: string;
  question: string;
  intent_category: string;
  active: boolean;
}

export interface VisibilityRunItem {
  id: string;
  provider: string;
  query_id: string;
  query_text: string;
  executed_at: string;
  status: string;
  latency_ms: number;
  is_manual: boolean;
  is_sample: boolean;
  mentioned_brands: string[];
  citation_count: number;
  response_preview: string;
}

export interface VisibilityRunDetail {
  id: string;
  provider: string;
  query_id: string;
  query_text: string;
  intent_category: string;
  executed_at: string;
  raw_response: string;
  status: string;
  latency_ms: number;
  error_message?: string | null;
  is_manual: boolean;
  is_sample: boolean;
  brand_observations: {
    brand_id: string;
    brand_name: string;
    mentioned: boolean;
    mention_count: number;
    first_mention_position: number;
    prominence_score: number;
  }[];
  citations: {
    url: string;
    domain: string;
    brand_id?: string | null;
    brand_name?: string | null;
  }[];
}

export interface ProviderStatus {
  id: string;
  display_name: string;
  is_configured: boolean;
  status_label: string;
}

export interface WeeklyReportItem {
  id: string;
  week_label: string;
  date_range: string;
  mention_rate: string;
  delta_mention_rate: string;
  avg_position: string;
  delta_position: string;
  audit_score: number;
  delta_audit: string;
  gsc_clicks: string;
  delta_clicks: string;
  status: 'Ready' | 'Generating';
}

// Milestone 3 — Google Search Console Interfaces
export interface GSCImportDataset {
  id: string;
  filename: string;
  imported_at: string;
  date_range?: string | null;
  row_count: number;
  total_clicks: number;
  total_impressions: number;
  columns_detected: string[];
  status: string;
}

export interface GSCMetrics {
  total_clicks: number;
  total_impressions: number;
  weighted_ctr: number;
  average_position: number;
  unique_queries: number;
  unique_pages: number;
  methodology: {
    ctr_method: string;
    position_method: string;
    data_integrity: string;
  };
}

export interface GSCOverviewResponse {
  has_data: boolean;
  message?: string;
  import_info?: GSCImportDataset | null;
  metrics?: GSCMetrics | null;
  opportunity_breakdown: Record<string, number>;
  intent_breakdown: Record<string, number>;
}

export interface GSCRowItem {
  id: string;
  query: string;
  page?: string | null;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  intent_category: string;
  opportunity_type: string;
  aeo_recommendation?: string | null;
}

export interface GSCQueriesResponse {
  has_data: boolean;
  total: number;
  limit: number;
  offset: number;
  rows: GSCRowItem[];
}

export interface GSCPageQuery {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  intent: string;
  opportunity: string;
}

export interface GSCPageItem {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  query_count: number;
  top_queries: GSCPageQuery[];
  all_queries: GSCPageQuery[];
}

export interface GSCPagesResponse {
  has_data: boolean;
  import_id?: string;
  total_pages: number;
  pages: GSCPageItem[];
}

export interface GSCComparisonResponse {
  can_compare: boolean;
  message?: string;
  baseline?: GSCMetrics & { filename: string; date_range?: string; id: string };
  latest?: GSCMetrics & { filename: string; date_range?: string; id: string };
  deltas?: {
    clicks: number;
    clicks_pct?: number | null;
    impressions: number;
    impressions_pct?: number | null;
    ctr: number;
    position: number;
    position_direction: 'improved' | 'declined' | 'unchanged';
  };
  query_deltas?: {
    top_growing: any[];
    top_declining: any[];
    matched_queries_count: number;
  };
  methodology?: string;
}

export interface GSCGeoCrossResponse {
  has_data: boolean;
  message?: string;
  import_filename?: string;
  matched_count: number;
  total_gsc_queries: number;
  total_geo_library_queries: number;
  cross_signals: {
    query: string;
    gsc_clicks: number;
    gsc_impressions: number;
    gsc_position: number;
    gsc_ctr: number;
    geo_query_category: string;
    geo_visibility_status: string;
    geo_observations_count: number;
    disclaimer: string;
  }[];
  high_demand_not_in_geo_tracker: {
    query: string;
    clicks: number;
    impressions: number;
    position: number;
    intent: string;
  }[];
  analytical_notice: string;
}

// Milestone 4 — Content Hub & GA4 Interfaces
export interface ContentArticleListItem {
  id: string;
  slug: string;
  title: string;
  meta_title: string;
  meta_description: string;
  excerpt: string;
  direct_answer_block?: string | null;
  primary_topic: string;
  target_query: string;
  intent: string;
  status: 'published' | 'draft' | 'archived';
  author: string;
  canonical_url: string;
  published_at?: string | null;
  word_count: number;
  reading_time_min: number;
  faq_count: number;
  internal_link_count: number;
}

export type ContentArticle = ContentArticleListItem;

export interface ContentArticleDetail extends ContentArticleListItem {
  content_markdown: string;
  updated_at?: string | null;
  faqs: { question: string; answer: string }[];
  internal_links: { target_slug: string; anchor_text: string }[];
  structured_data: {
    article: any;
    faq?: any | null;
    is_valid: boolean;
    validation_status: string;
    notes: string;
  };
}

export interface LinkGraphResponse {
  total_articles: number;
  total_internal_links: number;
  orphan_count: number;
  orphan_slugs: string[];
  articles: {
    slug: string;
    title: string;
    status: string;
    incoming_count: number;
    outgoing_count: number;
    incoming_links: { source_slug: string; anchor_text: string }[];
    outgoing_links: { target_slug: string; anchor_text: string }[];
    is_orphan: boolean;
    orphan_warning?: string | null;
  }[];
}

export interface ContentGradeResponse {
  slug: string;
  overall_score: number;
  category_scores: Record<string, {
    earned: number;
    max_score: number;
    percentage: number;
    label: string;
    passed_checks: number;
    total_checks: number;
  }>;
  findings: {
    id: string;
    severity: string;
    category: string;
    title: string;
    problem: string;
    evidence: string;
    recommendation: string;
  }[];
  readiness_summary: {
    technical_readiness: number;
    onpage_readiness: number;
    answer_readiness: number;
    structured_data_readiness: number;
  };
  disclaimer: string;
}

export interface GA4ImportDataset {
  id: string;
  filename: string;
  imported_at: string;
  date_range?: string | null;
  row_count: number;
  total_views: number;
  total_users: number;
  total_sessions: number;
  total_conversions: number;
  columns_detected: string[];
  status: string;
}

export interface GA4Metrics {
  total_views: number;
  total_users: number;
  total_sessions: number;
  weighted_engagement_rate: number;
  total_conversions: number;
  conversion_rate: number;
  unique_pages: number;
  methodology: {
    engagement_rate_method: string;
    data_integrity: string;
  };
}

export interface GA4OverviewResponse {
  has_data: boolean;
  message?: string;
  import_info?: GA4ImportDataset | null;
  metrics?: GA4Metrics | null;
}

export interface GA4PageItem {
  page_path: string;
  page_title: string;
  views: number;
  users: number;
  sessions: number;
  engagement_rate: number;
  conversions: number;
}

export interface GA4PagesResponse {
  has_data: boolean;
  import_id?: string;
  total_pages: number;
  pages: GA4PageItem[];
}

export interface GSCGA4CrossResponse {
  has_data: boolean;
  message?: string;
  matched_count: number;
  total_paths: number;
  pages: {
    path: string;
    has_gsc: boolean;
    has_ga4: boolean;
    gsc_clicks: number;
    gsc_impressions: number;
    gsc_ctr: number;
    gsc_position?: number | null;
    ga4_views: number;
    ga4_users: number;
    ga4_sessions: number;
    ga4_engagement_rate: number;
    ga4_conversions: number;
    status: string;
  }[];
  disclaimer: string;
}

export interface Article360LoopResponse {
  found: boolean;
  message?: string;
  article: {
    slug: string;
    title: string;
    primary_topic: string;
    target_query: string;
    intent: string;
    status: string;
    canonical_url: string;
    author: string;
  };
  content_optimization: {
    seo_aeo_score: number;
    readiness: {
      technical_readiness: number;
      onpage_readiness: number;
      answer_readiness: number;
      structured_data_readiness: number;
    };
    findings_count: number;
    findings: any[];
  };
  schema_status: {
    article_schema: string;
    faq_schema: string;
  };
  google_search_console: {
    status: string;
    metrics?: {
      clicks: number;
      impressions: number;
      weighted_ctr: number;
      average_position: number;
      matched_queries: number;
    } | null;
  };
  google_analytics_4: {
    status: string;
    metrics?: {
      views: number;
      users: number;
      sessions: number;
      engagement_rate: number;
      conversions: number;
    } | null;
  };
  ai_search_visibility: {
    status: string;
    details?: {
      total_runs: number;
      mentions: number;
      providers: string[];
    } | null;
  };
  methodology_notice: string;
}

export interface SystemReadinessResponse {
  overall_status: 'ready' | 'degraded';
  timestamp: string;
  database: {
    status: 'ready' | 'not_ready';
    details: string;
  };
  content: {
    status: 'ready' | 'not_ready';
    published_count: number;
    details: string;
  };
  sitemap: {
    status: 'ready' | 'not_ready';
    url_count: number;
    details: string;
  };
  configuration: {
    status: 'ready' | 'not_ready';
    environment: string;
    site_url: string;
    details: string;
  };
  ai_providers: {
    status: 'ready' | 'not_configured';
    providers: {
      openai: 'ready' | 'not_configured';
      gemini: 'ready' | 'not_configured';
      perplexity: 'ready' | 'not_configured';
    };
    details: string;
  };
  ga4_configuration: {
    status: 'ready' | 'not_configured';
    details: string;
  };
}

export interface SEOCheckItem {
  check: string;
  status: 'PASS' | 'WARN' | 'FAIL';
  evidence: string;
}

export interface SEOArticleAudit {
  slug: string;
  title: string;
  canonical_url: string;
  status: string;
  checks: SEOCheckItem[];
  passes: number;
  warns: number;
  fails: number;
  technically_ready_for_indexing: boolean;
  indexing_status_label: string;
}

export interface SEOAuditResponse {
  summary: {
    total_articles: number;
    technically_ready_count: number;
    total_passes: number;
    total_warns: number;
    total_fails: number;
    overall_status: 'PASS' | 'FAIL';
  };
  articles: SEOArticleAudit[];
}

export interface EvidenceRecordItem {
  id: string;
  category: 'deployment' | 'gsc' | 'ga4' | 'ai_visibility' | 'content' | 'schema' | string;
  claim: string;
  status: 'verified' | 'pending' | 'not_verified';
  source?: string | null;
  evidence_url?: string | null;
  evidence_note?: string | null;
  captured_at?: string | null;
}
