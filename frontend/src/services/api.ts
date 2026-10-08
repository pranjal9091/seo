import {
  AuditReport, AuditHistoryItem, RoadmapModule,
  SystemReadinessResponse, SEOAuditResponse, EvidenceRecordItem
} from '../types/audit';

const ENV_API_BASE = (import.meta as any).env?.VITE_API_BASE_URL;
const BASE_URL = ENV_API_BASE ? ENV_API_BASE.replace(/\/$/, '') : '';
const API_BASE = `${BASE_URL}/api`;

export class ApiError extends Error {
  status: number;
  details?: string;
  constructor(message: string, status: number, details?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export async function auditUrl(url: string): Promise<AuditReport> {
  const res = await fetch(`${API_BASE}/audit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url }),
  });

  if (!res.ok) {
    let errData: any = {};
    try {
      errData = await res.json();
    } catch {
      // ignore json parse fail
    }
    const message = errData?.detail?.message || errData?.detail || `Audit request failed with status ${res.status}`;
    const details = errData?.detail?.details;
    throw new ApiError(message, res.status, details);
  }

  return res.json();
}

export async function getAuditHistory(): Promise<AuditHistoryItem[]> {
  try {
    const res = await fetch(`${API_BASE}/history?limit=15`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.history || [];
  } catch (err) {
    console.warn('Could not load audit history:', err);
    return [];
  }
}

export async function getSavedAudit(id: string): Promise<AuditReport> {
  const res = await fetch(`${API_BASE}/audit/${id}`);
  if (!res.ok) {
    throw new ApiError('Failed to fetch saved audit report', res.status);
  }
  return res.json();
}

export async function getRoadmap(): Promise<RoadmapModule[]> {
  try {
    const res = await fetch(`${API_BASE}/roadmap`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.modules || [];
  } catch (err) {
    console.warn('Could not load roadmap:', err);
    return [];
  }
}

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

// Milestone 2 — Visibility & Benchmarking
export async function getVisibilityOverview(): Promise<import('../types/audit').VisibilityOverviewResponse> {
  const res = await fetch(`${API_BASE}/visibility/overview`);
  if (!res.ok) throw new ApiError('Failed to fetch visibility overview', res.status);
  return res.json();
}

export async function getVisibilityQueries(intent?: string): Promise<{ total_queries: number; intents: string[]; queries: import('../types/audit').SearchQueryItem[] }> {
  const url = intent ? `${API_BASE}/visibility/queries?intent=${encodeURIComponent(intent)}` : `${API_BASE}/visibility/queries`;
  const res = await fetch(url);
  if (!res.ok) throw new ApiError('Failed to fetch queries', res.status);
  return res.json();
}

export async function getVisibilityRuns(queryId?: string, provider?: string): Promise<{ runs: import('../types/audit').VisibilityRunItem[] }> {
  let url = `${API_BASE}/visibility/runs?limit=30`;
  if (queryId) url += `&query_id=${encodeURIComponent(queryId)}`;
  if (provider) url += `&provider=${encodeURIComponent(provider)}`;
  const res = await fetch(url);
  if (!res.ok) throw new ApiError('Failed to fetch visibility runs', res.status);
  return res.json();
}

export async function getRunDetail(runId: string): Promise<import('../types/audit').VisibilityRunDetail> {
  const res = await fetch(`${API_BASE}/visibility/runs/${runId}`);
  if (!res.ok) throw new ApiError('Failed to fetch run detail', res.status);
  return res.json();
}

export async function getProvidersStatus(): Promise<{ providers: import('../types/audit').ProviderStatus[] }> {
  const res = await fetch(`${API_BASE}/visibility/providers`);
  if (!res.ok) throw new ApiError('Failed to fetch provider status', res.status);
  return res.json();
}

export async function executeVisibilityQuery(queryId: string, provider: string): Promise<{ message: string; run_id: string }> {
  const res = await fetch(`${API_BASE}/visibility/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query_id: queryId, provider }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(err.detail || 'Execution failed', res.status);
  }
  return res.json();
}

export async function manualImportObservation(
  queryId: string,
  providerLabel: string,
  rawResponse: string,
  explicitCitations: string[] = []
): Promise<any> {
  const res = await fetch(`${API_BASE}/visibility/manual-import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query_id: queryId,
      provider_label: providerLabel,
      raw_response: rawResponse,
      explicit_citations: explicitCitations
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(err.detail || 'Manual import failed', res.status);
  }
  return res.json();
}

// Milestone 2 — Schema Generator
export async function generateSchema(schemaType: string, data: any): Promise<{ schema_type: string; json_ld: any; is_valid: boolean; validation_notes: string }> {
  const res = await fetch(`${API_BASE}/schema/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ schema_type: schemaType, data }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(err.detail || 'Schema generation failed', res.status);
  }
  return res.json();
}

// Milestone 3 — Google Search Console API methods
export async function uploadGscCsv(file: File, dateRange?: string): Promise<any> {
  const formData = new FormData();
  formData.append('file', file);
  if (dateRange) {
    formData.append('date_range', dateRange);
  }

  const res = await fetch(`${API_BASE}/gsc/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(err.detail || 'Failed to upload Search Console CSV', res.status);
  }
  return res.json();
}

export async function uploadGscText(content: string, filename?: string, dateRange?: string): Promise<any> {
  const res = await fetch(`${API_BASE}/gsc/upload/text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, filename, date_range: dateRange }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(err.detail || 'Failed to upload Search Console CSV text', res.status);
  }
  return res.json();
}

export async function getGscDatasets(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/gsc/datasets`);
  if (!res.ok) return [];
  return res.json();
}

export async function deleteGscDataset(importId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/gsc/datasets/${importId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw new ApiError('Failed to delete dataset', res.status);
  }
  return res.json();
}

export async function getGscOverview(importId?: string): Promise<any> {
  const url = importId ? `${API_BASE}/gsc/overview?import_id=${encodeURIComponent(importId)}` : `${API_BASE}/gsc/overview`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new ApiError('Failed to load Search Console overview', res.status);
  }
  return res.json();
}

export async function getGscQueries(params: {
  import_id?: string;
  search?: string;
  min_impressions?: number;
  min_clicks?: number;
  min_position?: number;
  max_position?: number;
  opportunity_type?: string;
  intent?: string;
  sort_by?: string;
  order?: string;
  limit?: number;
  offset?: number;
}): Promise<any> {
  const qp = new URLSearchParams();
  if (params.import_id) qp.append('import_id', params.import_id);
  if (params.search) qp.append('search', params.search);
  if (params.min_impressions !== undefined) qp.append('min_impressions', params.min_impressions.toString());
  if (params.min_clicks !== undefined) qp.append('min_clicks', params.min_clicks.toString());
  if (params.min_position !== undefined) qp.append('min_position', params.min_position.toString());
  if (params.max_position !== undefined) qp.append('max_position', params.max_position.toString());
  if (params.opportunity_type) qp.append('opportunity_type', params.opportunity_type);
  if (params.intent) qp.append('intent', params.intent);
  if (params.sort_by) qp.append('sort_by', params.sort_by);
  if (params.order) qp.append('order', params.order);
  if (params.limit !== undefined) qp.append('limit', params.limit.toString());
  if (params.offset !== undefined) qp.append('offset', params.offset.toString());

  const res = await fetch(`${API_BASE}/gsc/queries?${qp.toString()}`);
  if (!res.ok) {
    throw new ApiError('Failed to load queries', res.status);
  }
  return res.json();
}

export async function getGscPages(importId?: string): Promise<any> {
  const url = importId ? `${API_BASE}/gsc/pages?import_id=${encodeURIComponent(importId)}` : `${API_BASE}/gsc/pages`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new ApiError('Failed to load page performance', res.status);
  }
  return res.json();
}

export async function updateGscRowIntent(rowId: string, intentCategory: string): Promise<any> {
  const res = await fetch(`${API_BASE}/gsc/rows/${rowId}/intent`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ intent_category: intentCategory }),
  });
  if (!res.ok) {
    throw new ApiError('Failed to update intent category', res.status);
  }
  return res.json();
}

export async function getGscComparison(baselineId?: string, latestId?: string): Promise<any> {
  const qp = new URLSearchParams();
  if (baselineId) qp.append('baseline_id', baselineId);
  if (latestId) qp.append('latest_id', latestId);
  const url = `${API_BASE}/gsc/compare?${qp.toString()}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new ApiError('Failed to load comparison', res.status);
  }
  return res.json();
}

export async function getGscGeoCrossAnalysis(importId?: string): Promise<any> {
  const url = importId ? `${API_BASE}/gsc/cross-analysis?import_id=${encodeURIComponent(importId)}` : `${API_BASE}/gsc/cross-analysis`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new ApiError('Failed to load cross-analysis', res.status);
  }
  return res.json();
}

// Milestone 4 — Content Hub API Methods
export async function getContentArticles(status?: string): Promise<any> {
  const url = status ? `${API_BASE}/content/articles?status=${encodeURIComponent(status)}` : `${API_BASE}/content/articles`;
  const res = await fetch(url);
  if (!res.ok) throw new ApiError('Failed to load articles', res.status);
  const data = await res.json();
  return Array.isArray(data) ? data : (data.articles || []);
}

export async function getContentArticleDetail(slug: string): Promise<any> {
  const res = await fetch(`${API_BASE}/content/articles/${encodeURIComponent(slug)}`);
  if (!res.ok) throw new ApiError(`Article '${slug}' not found`, res.status);
  return res.json();
}

export async function createContentArticle(payload: any): Promise<any> {
  const res = await fetch(`${API_BASE}/content/articles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(err.detail || 'Failed to create article', res.status);
  }
  return res.json();
}

export async function updateContentArticleStatus(slug: string, status: string): Promise<any> {
  const res = await fetch(`${API_BASE}/content/articles/${encodeURIComponent(slug)}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new ApiError('Failed to update article status', res.status);
  return res.json();
}

export async function getContentArticleGrade(slug: string): Promise<any> {
  const res = await fetch(`${API_BASE}/content/articles/${encodeURIComponent(slug)}/grade`);
  if (!res.ok) throw new ApiError('Failed to fetch article grade', res.status);
  return res.json();
}

export async function getContentArticleSchema(slug: string): Promise<any> {
  const res = await fetch(`${API_BASE}/content/articles/${encodeURIComponent(slug)}/schema`);
  if (!res.ok) throw new ApiError('Failed to fetch article schema', res.status);
  return res.json();
}

export async function getContentLinkGraph(): Promise<any> {
  const res = await fetch(`${API_BASE}/content/link-graph`);
  if (!res.ok) throw new ApiError('Failed to load internal link graph', res.status);
  return res.json();
}

// Milestone 4 — GA4 Analytics API Methods
export async function uploadGa4Csv(file: File, dateRange?: string): Promise<any> {
  const formData = new FormData();
  formData.append('file', file);
  if (dateRange) formData.append('date_range', dateRange);

  const res = await fetch(`${API_BASE}/ga4/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(err.detail || 'Failed to upload GA4 CSV', res.status);
  }
  return res.json();
}

export async function uploadGa4Text(content: string, filename?: string, dateRange?: string): Promise<any> {
  const res = await fetch(`${API_BASE}/ga4/upload/text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, filename, date_range: dateRange }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(err.detail || 'Failed to upload GA4 CSV text', res.status);
  }
  return res.json();
}

export async function getGa4Datasets(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/ga4/datasets`);
  if (!res.ok) return [];
  return res.json();
}

export async function deleteGa4Dataset(importId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/ga4/datasets/${importId}`, { method: 'DELETE' });
  if (!res.ok) throw new ApiError('Failed to delete GA4 dataset', res.status);
  return res.json();
}

export async function getGa4Overview(importId?: string): Promise<any> {
  const url = importId ? `${API_BASE}/ga4/overview?import_id=${encodeURIComponent(importId)}` : `${API_BASE}/ga4/overview`;
  const res = await fetch(url);
  if (!res.ok) throw new ApiError('Failed to load GA4 overview', res.status);
  return res.json();
}

export async function getGa4Pages(importId?: string): Promise<any> {
  const url = importId ? `${API_BASE}/ga4/pages?import_id=${encodeURIComponent(importId)}` : `${API_BASE}/ga4/pages`;
  const res = await fetch(url);
  if (!res.ok) throw new ApiError('Failed to load GA4 page performance', res.status);
  return res.json();
}

export async function getGscGa4CrossAnalysis(): Promise<any> {
  const res = await fetch(`${API_BASE}/ga4/gsc-cross`);
  if (!res.ok) throw new ApiError('Failed to load GSC + GA4 cross-analysis', res.status);
  return res.json();
}

export async function getArticle360Loop(slug: string): Promise<any> {
  const res = await fetch(`${API_BASE}/ga4/article-loop/${encodeURIComponent(slug)}`);
  if (!res.ok) throw new ApiError('Failed to load 360 measurement loop', res.status);
  return res.json();
}

// Milestone 5: Production Readiness, SEO Technical Audit & Evidence Tracking
export async function getSystemReadiness(): Promise<SystemReadinessResponse> {
  const res = await fetch(`${API_BASE}/system/readiness`);
  if (!res.ok) throw new ApiError('Failed to load system readiness', res.status);
  return res.json();
}

export async function runSeoAudit(): Promise<SEOAuditResponse> {
  const res = await fetch(`${API_BASE}/seo/audit`);
  if (!res.ok) throw new ApiError('Failed to run SEO technical audit', res.status);
  return res.json();
}

export async function getEvidenceRecords(category?: string): Promise<EvidenceRecordItem[]> {
  const url = category ? `${API_BASE}/evidence?category=${encodeURIComponent(category)}` : `${API_BASE}/evidence`;
  const res = await fetch(url);
  if (!res.ok) throw new ApiError('Failed to load evidence records', res.status);
  return res.json();
}

export async function createEvidenceRecord(record: Partial<EvidenceRecordItem>): Promise<{ status: string; id: string }> {
  const res = await fetch(`${API_BASE}/evidence`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(record)
  });
  if (!res.ok) throw new ApiError('Failed to create evidence record', res.status);
  return res.json();
}

export async function updateEvidenceRecord(
  id: string,
  updates: Partial<EvidenceRecordItem>
): Promise<{ status: string; id: string; record_status: string }> {
  const res = await fetch(`${API_BASE}/evidence/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
  if (!res.ok) throw new ApiError('Failed to update evidence record', res.status);
  return res.json();
}

export async function deleteEvidenceRecord(id: string): Promise<{ status: string; id: string }> {
  const res = await fetch(`${API_BASE}/evidence/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new ApiError('Failed to delete evidence record', res.status);
  return res.json();
}



