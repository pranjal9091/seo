import React, { useState } from 'react';
import { AuditReport, AuditFinding } from '../types/audit';
import { auditUrl, ApiError } from '../services/api';

interface ContentGraderPageProps {
  currentReport: AuditReport | null;
  onAuditComplete: (report: AuditReport) => void;
}

const SAMPLE_TARGETS = [
  { label: 'MDN Web Docs', url: 'https://developer.mozilla.org/en-US/docs/Web/HTML' },
  { label: 'Wikipedia SEO', url: 'https://en.wikipedia.org/wiki/Search_engine_optimization' },
  { label: 'Python Official Docs', url: 'https://docs.python.org/3/' },
  { label: 'Minimalist Page', url: 'https://example.com' },
];

export const ContentGraderPage: React.FC<ContentGraderPageProps> = ({
  currentReport,
  onAuditComplete,
}) => {
  const [urlInput, setUrlInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeSeverityFilter, setActiveSeverityFilter] = useState<string>('all');

  const handleRunAudit = async (targetUrl: string) => {
    if (!targetUrl.trim() || isLoading) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await auditUrl(targetUrl.trim());
      onAuditComplete(res);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setErrorMsg(`${err.message}${err.details ? ` (${err.details})` : ''}`);
      } else {
        setErrorMsg(err.message || 'Audit failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const findings = currentReport?.findings || [];
  const filteredFindings = findings.filter((f) => {
    if (activeSeverityFilter !== 'all' && f.severity !== activeSeverityFilter) return false;
    return true;
  });

  const aeoData = currentReport?.extracted_data?.aeo;

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">AEO & Content Grader</h1>
          <p className="page-description">
            Audit any webpage for Technical SEO, direct answer readiness (40–65 words), heading hierarchy, and JSON-LD schema.
          </p>
        </div>
        {currentReport && (
          <span className="metric-sample-pill">
            Audited URL: {currentReport.url}
          </span>
        )}
      </div>

      {/* Input Row */}
      <div className="panel" style={{ marginBottom: 24 }}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleRunAudit(urlInput);
          }}
          style={{ display: 'flex', gap: 10, alignItems: 'stretch' }}
        >
          <input
            type="text"
            className="form-input"
            style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: '0.84rem' }}
            placeholder="Enter public URL to audit (e.g. https://www.nxtwave.co.in)..."
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            disabled={isLoading}
          />
          <button
            type="submit"
            className="btn btn-teal"
            disabled={isLoading || !urlInput.trim()}
          >
            {isLoading ? 'Crawling & Scoring...' : 'Audit Page'}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Quick targets:</span>
          {SAMPLE_TARGETS.map((s) => (
            <button
              key={s.url}
              type="button"
              className="btn btn-ghost"
              style={{ padding: '2px 8px', fontSize: '0.74rem' }}
              onClick={() => {
                setUrlInput(s.url);
                handleRunAudit(s.url);
              }}
              disabled={isLoading}
            >
              {s.label}
            </button>
          ))}
        </div>

        {errorMsg && (
          <div style={{ marginTop: 12, padding: '8px 12px', background: 'var(--status-red-bg)', border: '1px solid #FECACA', borderRadius: 'var(--radius)', color: 'var(--status-red)', fontSize: '0.8rem' }}>
            {errorMsg}
          </div>
        )}
      </div>

      {currentReport && (
        <>
          {/* Asymmetric 2-Column: Left Document Details & Right Score + Direct Answer Quote */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: 24, marginBottom: 28, alignItems: 'start' }}>
            {/* Left: Document Metadata */}
            <div className="panel" style={{ margin: 0 }}>
              <div className="panel-header">
                <h3 className="panel-title">Extracted Document Metadata</h3>
                <span className="status-pill green">HTTP {currentReport.extracted_data.status_code}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: '0.82rem' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Page Title:</span>
                  <div style={{ fontWeight: 500, color: 'var(--text-ink)', marginTop: 2 }}>
                    {currentReport.extracted_data.title || '[Missing title]'}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {currentReport.extracted_data.title_length} characters
                  </div>
                </div>

                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Meta Description:</span>
                  <div style={{ color: 'var(--text-secondary)', marginTop: 2 }}>
                    {currentReport.extracted_data.meta_description || '[Missing meta description]'}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {currentReport.extracted_data.meta_description_length} characters
                  </div>
                </div>

                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Canonical Status:</span>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.76rem', color: 'var(--text-ink)', marginTop: 2, wordBreak: 'break-all' }}>
                    {currentReport.extracted_data.canonical_url || '[No canonical declared]'}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, paddingTop: 8, borderTop: '1px solid var(--border-hairline)' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Latency:</span>
                    <div className="mono">{currentReport.extracted_data.response_time_ms}ms</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>H1 Headings:</span>
                    <div className="mono">{currentReport.extracted_data.h1_count} declared</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Score & Direct Answer Block */}
            <div className="panel" style={{ margin: 0 }}>
              <div className="panel-header">
                <div>
                  <h3 className="panel-title">Deterministic Audit Score</h3>
                  <p className="panel-subtitle">Calculated via documented Ruleset v1.0 (Not a Google rank)</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontFamily: 'var(--font-serif)', fontSize: '2.5rem', fontWeight: 600, color: 'var(--text-ink)', lineHeight: 1 }}>
                    {currentReport.overall_score}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>/100</span>
                </div>
              </div>

              {/* 4 Category Pillar Breakdown */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                {Object.entries(currentReport.category_scores).map(([key, cat]) => (
                  <div key={key} style={{ padding: '8px 10px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius)', fontSize: '0.78rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                      <span>{cat.label}</span>
                      <span className="mono" style={{ color: 'var(--text-ink)', fontWeight: 500 }}>{cat.earned}/{cat.max_score}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Detected Direct-Answer Block Quoted */}
              <div>
                <span style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                  Detected Direct-Answer Paragraph (Featured Snippet Candidate):
                </span>
                {aeoData?.direct_answer_candidate ? (
                  <blockquote className="pullquote-answer">
                    "{aeoData.direct_answer_candidate}"
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 6, fontFamily: 'var(--font-mono)' }}>
                      Length: {aeoData.answer_word_count} words {aeoData.is_optimal_length ? '(Optimal 40–65w)' : '(Sub-optimal word count)'}
                    </div>
                  </blockquote>
                ) : (
                  <div style={{ padding: 12, background: 'var(--bg-subtle)', borderRadius: 'var(--radius)', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    No concise direct answer paragraph was identified near the opening section of the page.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Prioritized Fix List at the Bottom */}
          <div className="panel">
            <div className="panel-header">
              <div>
                <h3 className="panel-title">Prioritized Action Items</h3>
                <p className="panel-subtitle">Fixes ordered by search engine indexing and AEO citation impact</p>
              </div>

              <div style={{ display: 'flex', gap: 6 }}>
                {['all', 'critical', 'high', 'medium', 'low'].map((sev) => (
                  <button
                    key={sev}
                    type="button"
                    className={`btn ${activeSeverityFilter === sev ? 'btn-teal' : 'btn-ghost'}`}
                    style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                    onClick={() => setActiveSeverityFilter(sev)}
                  >
                    {sev.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {filteredFindings.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: '0.84rem' }}>
                  No issues found matching this filter.
                </div>
              ) : (
                filteredFindings.map((f: AuditFinding) => {
                  const badgeClass = f.severity === 'critical' ? 'red' : f.severity === 'high' ? 'amber' : 'neutral';
                  return (
                    <div
                      key={f.id}
                      style={{
                        padding: '14px 16px',
                        background: 'var(--bg-canvas)',
                        border: '1px solid var(--border-hairline)',
                        borderRadius: 'var(--radius)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className={`status-pill ${badgeClass}`}>{f.severity}</span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>[{f.category.toUpperCase()}]</span>
                          <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-ink)' }}>{f.title}</h4>
                        </div>
                      </div>

                      <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
                        {f.problem}
                      </p>

                      <div style={{ background: 'var(--bg-subtle)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', fontSize: '0.78rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: 8, wordBreak: 'break-all' }}>
                        {f.evidence}
                      </div>

                      <div style={{ fontSize: '0.82rem', color: 'var(--accent)', fontWeight: 500 }}>
                        → Fix: {f.recommendation}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
