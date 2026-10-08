import React, { useState, useEffect } from 'react';
import {
  VisibilityOverviewResponse,
  VisibilityRunItem,
  VisibilityRunDetail,
  SearchQueryItem,
  ProviderStatus
} from '../types/audit';
import {
  getVisibilityRuns,
  getRunDetail,
  getVisibilityQueries,
  manualImportObservation,
  getProvidersStatus,
  executeVisibilityQuery
} from '../services/api';

interface VisibilityPageProps {
  overviewData: VisibilityOverviewResponse | null;
  onRefreshOverview: () => void;
}

export const VisibilityPage: React.FC<VisibilityPageProps> = ({
  overviewData,
  onRefreshOverview,
}) => {
  const [runs, setRuns] = useState<VisibilityRunItem[]>([]);
  const [queries, setQueries] = useState<SearchQueryItem[]>([]);
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [activeIntent, setActiveIntent] = useState<string>('all');
  const [activeProvider, setActiveProvider] = useState<string>('all');
  const [selectedRunDetail, setSelectedRunDetail] = useState<VisibilityRunDetail | null>(null);
  const [isLoadingRuns, setIsLoadingRuns] = useState<boolean>(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState<boolean>(false);

  // Manual Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [importQueryId, setImportQueryId] = useState<string>('q_01');
  const [importProvider, setImportProvider] = useState<string>('Manual / ChatGPT');
  const [importResponseText, setImportResponseText] = useState<string>('');
  const [importCitationsText, setImportCitationsText] = useState<string>('');
  const [importError, setImportError] = useState<string | null>(null);
  const [isSubmittingImport, setIsSubmittingImport] = useState<boolean>(false);

  useEffect(() => {
    async function loadData() {
      setIsLoadingRuns(true);
      try {
        const [runsRes, queriesRes, provRes] = await Promise.all([
          getVisibilityRuns(),
          getVisibilityQueries(),
          getProvidersStatus(),
        ]);
        setRuns(runsRes.runs);
        setQueries(queriesRes.queries);
        setProviders(provRes.providers);
      } catch (err) {
        console.warn('Error loading visibility runs:', err);
      } finally {
        setIsLoadingRuns(false);
      }
    }
    loadData();
  }, []);

  const handleOpenDetail = async (runId: string) => {
    setIsLoadingDetail(true);
    try {
      const detail = await getRunDetail(runId);
      setSelectedRunDetail(detail);
    } catch (err) {
      console.warn('Failed to fetch run detail:', err);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleManualImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importResponseText.trim()) return;

    setIsSubmittingImport(true);
    setImportError(null);
    try {
      const citations = importCitationsText
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.startsWith('http'));

      await manualImportObservation(
        importQueryId,
        importProvider,
        importResponseText.trim(),
        citations
      );

      // Refresh runs and overview
      const updatedRuns = await getVisibilityRuns();
      setRuns(updatedRuns.runs);
      onRefreshOverview();
      setIsImportModalOpen(false);
      setImportResponseText('');
      setImportCitationsText('');
    } catch (err: any) {
      setImportError(err.message || 'Import failed');
    } finally {
      setIsSubmittingImport(false);
    }
  };

  // Filter runs
  const filteredRuns = runs.filter((r) => {
    if (activeProvider !== 'all' && r.provider.toLowerCase() !== activeProvider.toLowerCase()) {
      return false;
    }
    return true;
  });

  const brands = overviewData?.brands || [];
  const summary = overviewData?.summary;

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">AI Search Visibility & Benchmarking</h1>
          <p className="page-description">
            Tracking prompt responses, mention rates, and citations across ChatGPT, Perplexity, and Gemini.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            className="btn btn-teal"
            onClick={() => setIsImportModalOpen(true)}
          >
            + Manual Observation Import
          </button>
        </div>
      </div>

      {/* Competitor Comparison Horizontal Bar Chart */}
      <div className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">EdTech Benchmark: AI Mention Rate Comparison</h2>
            <p className="panel-subtitle">
              Calculated from {summary?.successful_runs ?? 0} observed responses ({summary?.data_label ?? 'Sample data'})
            </p>
          </div>
          <span className="metric-sample-pill">
            {summary?.data_label ?? 'Sample data'}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {brands.map((b) => {
            const isTarget = b.is_target;
            const barPct = Math.round(b.mention_rate * 100);
            return (
              <div key={b.brand_id} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 70px 100px', alignItems: 'center', gap: 16 }}>
                <div style={{ fontWeight: isTarget ? 600 : 400, color: isTarget ? 'var(--text-ink)' : 'var(--text-secondary)', fontSize: '0.86rem' }}>
                  {b.name} {isTarget && <span style={{ color: 'var(--accent)', fontSize: '0.72rem', fontFamily: 'var(--font-mono)' }}>[target]</span>}
                </div>

                <div style={{ width: '100%', height: 10, background: '#F1F5F9', borderRadius: 9999, overflow: 'hidden', border: '1px solid var(--border-hairline)' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${barPct}%`,
                      background: isTarget
                        ? 'linear-gradient(90deg, #10B981 0%, #059669 100%)'
                        : '#94A3B8',
                      borderRadius: 9999,
                      boxShadow: isTarget ? '0 0 10px rgba(16, 185, 129, 0.4)' : 'none',
                      transition: 'width 300ms cubic-bezier(0.16, 1, 0.3, 1)'
                    }}
                  />
                </div>

                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', fontWeight: isTarget ? 600 : 400, color: 'var(--text-ink)', textAlign: 'right' }}>
                  {b.mention_rate_pct}
                </div>

                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                  {b.citation_count} citations
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {['all', 'openai', 'perplexity', 'gemini'].map((prov) => (
            <button
              key={prov}
              type="button"
              className={`btn ${activeProvider === prov ? 'btn-teal' : 'btn-ghost'}`}
              style={{ fontSize: '0.76rem', padding: '4px 10px' }}
              onClick={() => setActiveProvider(prov)}
            >
              {prov === 'all' ? 'All Providers' : prov.toUpperCase()}
            </button>
          ))}
        </div>

        <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          Showing {filteredRuns.length} observed query runs
        </div>
      </div>

      {/* Observed Queries x Platform Table */}
      <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '42%' }}>Target Prompt Query</th>
                <th>Provider</th>
                <th>Brands Mentioned</th>
                <th>Citations</th>
                <th>Recorded At</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRuns.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    No matching runs found for this filter.
                  </td>
                </tr>
              ) : (
                filteredRuns.map((r) => {
                  const hasNxtWave = r.mentioned_brands.includes('nxtwave');
                  return (
                    <tr
                      key={r.id}
                      onClick={() => handleOpenDetail(r.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>
                        <div style={{ fontWeight: 500, color: 'var(--text-ink)' }}>{r.query_text}</div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 380 }}>
                          {r.response_preview}
                        </div>
                      </td>

                      <td>
                        <span className="status-pill neutral">{r.provider}</span>
                      </td>

                      <td>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {r.mentioned_brands.length === 0 ? (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>None</span>
                          ) : (
                            r.mentioned_brands.map((bId) => {
                              const isTarget = bId === 'nxtwave';
                              return (
                                <span
                                  key={bId}
                                  className={`status-pill ${isTarget ? 'green' : 'neutral'}`}
                                >
                                  {bId}
                                </span>
                              );
                            })
                          )}
                        </div>
                      </td>

                      <td className="mono">
                        {r.citation_count > 0 ? (
                          <span style={{ color: 'var(--accent)', fontWeight: 500 }}>{r.citation_count} urls</span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>

                      <td className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(r.executed_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        {r.is_sample && <span style={{ marginLeft: 4, fontSize: '0.65rem', color: 'var(--text-muted)' }}>(sample)</span>}
                        {r.is_manual && <span style={{ marginLeft: 4, fontSize: '0.65rem', color: 'var(--accent)' }}>(manual)</span>}
                      </td>

                      <td>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDetail(r.id);
                          }}
                        >
                          Inspect →
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Side Drawer for Raw Answer Drill-Down */}
      {selectedRunDetail && (
        <div className="drawer-backdrop" onClick={() => setSelectedRunDetail(null)}>
          <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 14, borderBottom: '1px solid var(--border-hairline)' }}>
              <div>
                <span className="status-pill neutral" style={{ marginBottom: 6 }}>
                  {selectedRunDetail.provider} · {selectedRunDetail.intent_category}
                </span>
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', color: 'var(--text-ink)', lineHeight: 1.3 }}>
                  "{selectedRunDetail.query_text}"
                </h3>
              </div>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ padding: '4px 8px' }}
                onClick={() => setSelectedRunDetail(null)}
              >
                ✕ Close
              </button>
            </div>

            {/* Brand Observations Matrix */}
            <div>
              <h4 style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: 8 }}>
                Detected Brand Mentions & Textual Prominence
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8 }}>
                {selectedRunDetail.brand_observations.map((obs) => (
                  <div
                    key={obs.brand_id}
                    style={{
                      padding: '8px 10px',
                      background: obs.mentioned ? 'var(--status-green-bg)' : 'var(--bg-subtle)',
                      border: `1px solid ${obs.mentioned ? '#D1E7DD' : 'var(--border-hairline)'}`,
                      borderRadius: 'var(--radius)',
                      fontSize: '0.78rem'
                    }}
                  >
                    <div style={{ fontWeight: 600, color: obs.mentioned ? 'var(--status-green)' : 'var(--text-secondary)' }}>
                      {obs.brand_name} {obs.mentioned ? '✓' : '—'}
                    </div>
                    {obs.mentioned ? (
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                        Offset: #{obs.first_mention_position}
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>Not in answer</div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Raw Response Text Block */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <h4 style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>
                  Raw Generated Answer
                </h4>
                <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                  {selectedRunDetail.raw_response.length} characters
                </span>
              </div>
              <div
                style={{
                  background: 'var(--bg-canvas)',
                  border: '1px solid var(--border-hairline)',
                  borderRadius: 'var(--radius)',
                  padding: 16,
                  fontSize: '0.86rem',
                  lineHeight: 1.6,
                  color: 'var(--text-ink)',
                  whiteSpace: 'pre-wrap',
                  maxHeight: 320,
                  overflowY: 'auto',
                }}
              >
                {selectedRunDetail.raw_response}
              </div>
            </div>

            {/* Citations */}
            <div>
              <h4 style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: 8 }}>
                Associated Source Citations ({selectedRunDetail.citations.length})
              </h4>
              {selectedRunDetail.citations.length === 0 ? (
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Provider did not expose URL citations for this query.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {selectedRunDetail.citations.map((c, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '6px 10px',
                        background: 'var(--bg-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.76rem',
                        fontFamily: 'var(--font-mono)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <span style={{ color: 'var(--accent)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 380 }}>
                        {c.url}
                      </span>
                      <span style={{ color: 'var(--text-muted)' }}>{c.domain}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Manual Observation Import Modal */}
      {isImportModalOpen && (
        <div className="drawer-backdrop" onClick={() => setIsImportModalOpen(false)}>
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-hairline)',
              borderRadius: 'var(--radius)',
              width: 580,
              maxWidth: '92vw',
              margin: 'auto',
              padding: 28,
              boxShadow: '0 8px 24px rgba(0,0,0,0.08)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', color: 'var(--text-ink)' }}>
                Import Real Observation Manually
              </h3>
              <button type="button" className="btn btn-ghost" onClick={() => setIsImportModalOpen(false)}>
                ✕
              </button>
            </div>

            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 18 }}>
              No API keys required. Copy any answer directly from ChatGPT, Perplexity, or Gemini to index brand mentions and source citations.
            </p>

            <form onSubmit={handleManualImportSubmit}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-ink)', marginBottom: 4 }}>
                  Target Query:
                </label>
                <select
                  className="form-input"
                  value={importQueryId}
                  onChange={(e) => setImportQueryId(e.target.value)}
                >
                  {queries.map((q) => (
                    <option key={q.id} value={q.id}>
                      [{q.intent_category}] {q.question}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-ink)', marginBottom: 4 }}>
                  Origin Platform Label:
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={importProvider}
                  onChange={(e) => setImportProvider(e.target.value)}
                  placeholder="e.g. ChatGPT / Perplexity Pro / Gemini"
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-ink)', marginBottom: 4 }}>
                  Pasted Answer Text:
                </label>
                <textarea
                  className="form-textarea"
                  rows={6}
                  value={importResponseText}
                  onChange={(e) => setImportResponseText(e.target.value)}
                  placeholder="Paste the full raw response generated by the AI platform here..."
                  required
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-ink)', marginBottom: 4 }}>
                  Explicit Citations / Source URLs (optional, one per line):
                </label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  value={importCitationsText}
                  onChange={(e) => setImportCitationsText(e.target.value)}
                  placeholder="https://example.com/source&#10;https://scaler.com/blog"
                />
              </div>

              {importError && (
                <div style={{ color: 'var(--status-red)', fontSize: '0.8rem', marginBottom: 12 }}>
                  {importError}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setIsImportModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-teal"
                  disabled={isSubmittingImport || !importResponseText.trim()}
                >
                  {isSubmittingImport ? 'Indexing...' : 'Index Observation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
