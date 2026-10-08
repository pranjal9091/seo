import React, { useState, useEffect } from 'react';
import {
  SystemReadinessResponse, SEOAuditResponse, EvidenceRecordItem
} from '../types/audit';
import {
  getSystemReadiness, runSeoAudit, getEvidenceRecords,
  updateEvidenceRecord, createEvidenceRecord
} from '../services/api';
import { getGA4Diagnostics, GA4Diagnostics } from '../services/ga4';

interface EvidencePageProps {
  onNavigateToContent?: () => void;
}

export const EvidencePage: React.FC<EvidencePageProps> = () => {
  const [readiness, setReadiness] = useState<SystemReadinessResponse | null>(null);
  const [seoAudit, setSeoAudit] = useState<SEOAuditResponse | null>(null);
  const [evidenceRecords, setEvidenceRecords] = useState<EvidenceRecordItem[]>([]);
  const [ga4Diag, setGa4Diag] = useState<GA4Diagnostics | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuditing, setIsAuditing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // New Evidence Modal State
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newCategory, setNewCategory] = useState<string>('deployment');
  const [newClaim, setNewClaim] = useState<string>('');
  const [newStatus, setNewStatus] = useState<string>('pending');
  const [newSource, setNewSource] = useState<string>('');
  const [newNote, setNewNote] = useState<string>('');

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [readyData, auditData, recordsData] = await Promise.all([
        getSystemReadiness(),
        runSeoAudit(),
        getEvidenceRecords()
      ]);
      setReadiness(readyData);
      setSeoAudit(auditData);
      setEvidenceRecords(recordsData);
      setGa4Diag(getGA4Diagnostics());
    } catch (err: any) {
      setError(err?.message || 'Failed to load production readiness & evidence data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefreshAudit = async () => {
    setIsAuditing(true);
    try {
      const auditData = await runSeoAudit();
      setSeoAudit(auditData);
      setGa4Diag(getGA4Diagnostics());
    } catch (err: any) {
      setError(err?.message || 'Failed to re-run SEO audit');
    } finally {
      setIsAuditing(false);
    }
  };

  const handleStatusChange = async (id: string, newStatusVal: string) => {
    try {
      await updateEvidenceRecord(id, { status: newStatusVal as any });
      setEvidenceRecords((prev) =>
        prev.map((rec) => (rec.id === id ? { ...rec, status: newStatusVal as any } : rec))
      );
    } catch (err: any) {
      alert(`Error updating status: ${err?.message || 'Unknown error'}`);
    }
  };

  const handleCreateEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClaim.trim()) return;
    try {
      await createEvidenceRecord({
        category: newCategory,
        claim: newClaim.trim(),
        status: newStatus as any,
        source: newSource.trim() || undefined,
        evidence_note: newNote.trim() || undefined
      });
      setShowAddModal(false);
      setNewClaim('');
      setNewSource('');
      setNewNote('');
      const updated = await getEvidenceRecords();
      setEvidenceRecords(updated);
    } catch (err: any) {
      alert(`Error creating evidence item: ${err?.message || 'Unknown error'}`);
    }
  };

  const categories = [
    { id: 'all', label: 'All Evidence' },
    { id: 'deployment', label: 'Deployment' },
    { id: 'gsc', label: 'Search Console' },
    { id: 'ga4', label: 'GA4 Analytics' },
    { id: 'ai_visibility', label: 'AI Visibility' },
    { id: 'content', label: 'Content Hub' },
    { id: 'schema', label: 'Schema / Technical' }
  ];

  const filteredRecords = evidenceRecords.filter((rec) => {
    if (selectedCategory === 'all') return true;
    return rec.category === selectedCategory;
  });

  return (
    <div className="evidence-page">
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Production Evidence & SEO Verification</h1>
          <p className="page-description">
            Provenance tracker and technical readiness verification for the NxtWave AI Search Optimization / AEO / GEO internship.
            Strictly distinguishes verified technical foundations from unmeasured external outcomes.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={handleRefreshAudit}
            disabled={isAuditing}
            style={{ fontSize: '0.82rem' }}
          >
            {isAuditing ? 'Auditing...' : '⚡ Re-run SEO Check'}
          </button>
          <button
            type="button"
            className="btn btn-teal"
            onClick={() => setShowAddModal(true)}
            style={{ fontSize: '0.82rem' }}
          >
            + Add Evidence Item
          </button>
        </div>
      </div>

      {error && (
        <div className="panel" style={{ backgroundColor: '#FEF2F2', borderColor: '#F87171', color: '#991B1B', marginBottom: 20 }}>
          <strong>Notice:</strong> {error}
        </div>
      )}

      {/* System Readiness & Infrastructure Overview */}
      {readiness && (
        <div className="panel" style={{ marginBottom: 24, padding: '20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 600, margin: 0, fontFamily: 'var(--font-serif)', color: 'var(--text-ink)' }}>
              System Architecture & Production Readiness
            </h2>
            <span
              style={{
                fontSize: '0.75rem',
                fontFamily: 'var(--font-mono)',
                padding: '3px 8px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: readiness.overall_status === 'ready' ? 'var(--status-green-bg)' : 'var(--status-amber-bg)',
                color: readiness.overall_status === 'ready' ? 'var(--status-green)' : 'var(--status-amber)',
                fontWeight: 600
              }}
            >
              System Status: {readiness.overall_status.toUpperCase()}
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 16
            }}
          >
            <div style={{ padding: '14px 16px', backgroundColor: '#FFFFFF', borderRadius: 'var(--radius)', border: '1px solid var(--border-hairline)', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>
                Database Persistence
              </div>
              <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-ink)', marginBottom: 3 }}>
                {readiness.database.status === 'ready' ? 'Operational' : 'Disconnected'}
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                {readiness.database.details}
              </div>
            </div>

            <div style={{ padding: '14px 16px', backgroundColor: '#FFFFFF', borderRadius: 'var(--radius)', border: '1px solid var(--border-hairline)', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>
                Environment & Host
              </div>
              <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-ink)', marginBottom: 3 }}>
                {readiness.configuration.environment.toUpperCase()}
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {readiness.configuration.site_url}
              </div>
            </div>

            <div style={{ padding: '14px 16px', backgroundColor: '#FFFFFF', borderRadius: 'var(--radius)', border: '1px solid var(--border-hairline)', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>
                XML Sitemap & Robots
              </div>
              <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-ink)', marginBottom: 3 }}>
                {readiness.sitemap.url_count} Canonical URLs
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Zero localhost leaks configured
              </div>
            </div>

            <div style={{ padding: '14px 16px', backgroundColor: '#FFFFFF', borderRadius: 'var(--radius)', border: '1px solid var(--border-hairline)', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>
                GA4 Client Tracking
              </div>
              <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-ink)', marginBottom: 3 }}>
                {readiness.ga4_configuration.status === 'ready' ? 'Connected' : 'GA4 Dormant (Safe)'}
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                {readiness.ga4_configuration.details}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SEO Technical Audit Matrix (Part 6 & Part 17) */}
      {seoAudit && (
        <div className="panel" style={{ marginBottom: 24, padding: '20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 600, margin: 0, fontFamily: 'var(--font-serif)', color: 'var(--text-ink)' }}>
                Production SEO & AEO Technical Check
              </h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                Deterministic audit of published articles across titles, canonicals, H1 hierarchy, direct-answer blocks, internal link mesh, and Schema.org.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', padding: '3px 8px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--status-green-bg)', color: 'var(--status-green)', fontWeight: 600 }}>
                {seoAudit.summary.total_passes} PASS
              </span>
              <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', padding: '3px 8px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--status-amber-bg)', color: 'var(--status-amber)', fontWeight: 600 }}>
                {seoAudit.summary.total_warns} WARN
              </span>
              <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', padding: '3px 8px', borderRadius: 'var(--radius-sm)', backgroundColor: seoAudit.summary.total_fails === 0 ? 'var(--bg-subtle)' : '#FEE2E2', color: seoAudit.summary.total_fails === 0 ? 'var(--text-muted)' : '#DC2626', fontWeight: 600 }}>
                {seoAudit.summary.total_fails} FAIL
              </span>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', fontSize: '0.8rem' }}>
              <thead>
                <tr>
                  <th>Article Slug</th>
                  <th>Canonical URL</th>
                  <th>Checks Passed</th>
                  <th>Technical Status</th>
                  <th>Google Indexing Reality</th>
                </tr>
              </thead>
              <tbody>
                {seoAudit.articles.map((art) => (
                  <tr key={art.slug}>
                    <td>
                      <strong>{art.title}</strong>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        /content/{art.slug}
                      </div>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
                      {art.canonical_url}
                    </td>
                    <td>
                      <span style={{ color: 'var(--status-green)', fontWeight: 600 }}>
                        {art.passes}/{art.checks.length}
                      </span>
                      {art.warns > 0 && (
                        <span style={{ color: 'var(--status-amber)', marginLeft: 6 }}>
                          ({art.warns} warn)
                        </span>
                      )}
                    </td>
                    <td>
                      <span
                        style={{
                          display: 'inline-block',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: art.technically_ready_for_indexing ? 'var(--status-green-bg)' : '#FEE2E2',
                          color: art.technically_ready_for_indexing ? 'var(--status-green)' : '#DC2626'
                        }}
                      >
                        {art.indexing_status_label}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          color: 'var(--text-secondary)',
                          fontStyle: 'italic'
                        }}
                      >
                        Pending Search Console data
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div
            style={{
              marginTop: 14,
              padding: '10px 14px',
              backgroundColor: 'var(--bg-subtle)',
              borderLeft: '3px solid var(--accent)',
              borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
              fontSize: '0.76rem',
              color: 'var(--text-ink)'
            }}
          >
            <strong>Evidence Rule:</strong> "Technically ready for indexing" confirms clean Schema.org Article JSON-LD, single H1 hierarchy, direct-answer summary, and sitemap inclusion. It does <em>not</em> claim Google has crawled or ranked the page.
          </div>
        </div>
      )}

      {/* GA4 Development Diagnostics (Part 10) */}
      {ga4Diag && ga4Diag.isDevelopment && (
        <div className="panel" style={{ marginBottom: 24, padding: '18px 22px', backgroundColor: '#F8FAFC' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontSize: '0.92rem', fontWeight: 600, margin: 0, fontFamily: 'var(--font-serif)', color: 'var(--text-ink)' }}>
              GA4 Local Development Diagnostics (Dev Mode Only)
            </h3>
            <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
              Masked ID: {ga4Diag.maskedId} • Initialized: {ga4Diag.isInitialized ? 'Yes' : 'No (dormant)'}
            </span>
          </div>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: 10 }}>
            Recent telemetry events dispatched locally:
          </div>
          {ga4Diag.recentEvents.length === 0 ? (
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              No client events dispatched yet in this browser session. Navigate to Content Hub or an article to trigger page_view / article_view.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {ga4Diag.recentEvents.slice(0, 5).map((ev, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.73rem', fontFamily: 'var(--font-mono)', padding: '4px 8px', backgroundColor: '#FFFFFF', borderRadius: 4, border: '1px solid var(--border-light)' }}>
                  <span><strong>{ev.event}</strong> ({JSON.stringify(ev.params)})</span>
                  <span style={{ color: 'var(--text-muted)' }}>{ev.timestamp}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Evidence Provenance Tracker (Part 12, 13, 14) */}
      <div className="panel" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 600, margin: 0, fontFamily: 'var(--font-serif)', color: 'var(--text-ink)' }}>
              Provenance & Evidence Records
            </h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
              Auditable records tracking real deployment, Search Console verification, GA4 events, and AI visibility citations.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`btn ${selectedCategory === cat.id ? 'btn-teal' : 'btn-ghost'}`}
                style={{ fontSize: '0.74rem', padding: '3px 9px' }}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 36, color: 'var(--text-muted)' }}>
            Loading evidence records...
          </div>
        ) : filteredRecords.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 36, color: 'var(--text-muted)' }}>
            No evidence records found for category "{selectedCategory}".
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filteredRecords.map((rec) => {
              const statusBg =
                rec.status === 'verified'
                  ? 'var(--status-green-bg)'
                  : rec.status === 'pending'
                  ? 'var(--status-amber-bg)'
                  : 'var(--bg-subtle)';
              const statusColor =
                rec.status === 'verified'
                  ? 'var(--status-green)'
                  : rec.status === 'pending'
                  ? 'var(--status-amber)'
                  : 'var(--text-muted)';

              return (
                <div
                  key={rec.id}
                  style={{
                    padding: '16px 20px',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--border-hairline)',
                    borderLeft: rec.status === 'verified'
                      ? '4px solid var(--status-green)'
                      : rec.status === 'pending'
                      ? '4px solid var(--status-amber)'
                      : '4px solid var(--border-strong)',
                    backgroundColor: '#FFFFFF',
                    boxShadow: 'var(--shadow-sm)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 16
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                      <span
                        style={{
                          fontSize: '0.68rem',
                          fontFamily: 'var(--font-mono)',
                          textTransform: 'uppercase',
                          padding: '2px 6px',
                          borderRadius: 3,
                          backgroundColor: 'var(--bg-subtle)',
                          color: 'var(--text-secondary)',
                          fontWeight: 600
                        }}
                      >
                        {rec.category}
                      </span>
                      {rec.source && (
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          Source: <strong>{rec.source}</strong>
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-ink)', marginBottom: 4 }}>
                      {rec.claim}
                    </div>
                    {rec.evidence_note && (
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                        {rec.evidence_note}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                    <select
                      value={rec.status}
                      onChange={(e) => handleStatusChange(rec.id, e.target.value)}
                      style={{
                        fontSize: '0.72rem',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 600,
                        padding: '3px 8px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: statusBg,
                        color: statusColor,
                        border: '1px solid var(--border-light)',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="pending">Pending</option>
                      <option value="verified">Verified</option>
                      <option value="not_verified">Not Verified</option>
                    </select>
                    {rec.captured_at && (
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {new Date(rec.captured_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Evidence Modal */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div
            className="panel"
            style={{
              width: 520,
              backgroundColor: '#FFFFFF',
              boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
              margin: 0
            }}
          >
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', marginBottom: 14 }}>
              Record Evidence Item
            </h2>
            <form onSubmit={handleCreateEvidence}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: 4 }}>
                  Category:
                </label>
                <select
                  className="input"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="deployment">Deployment</option>
                  <option value="gsc">Google Search Console</option>
                  <option value="ga4">Google Analytics 4</option>
                  <option value="ai_visibility">AI Visibility</option>
                  <option value="content">Content Hub</option>
                  <option value="schema">Schema / Technical</option>
                </select>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: 4 }}>
                  Claim / Deliverable:
                </label>
                <input
                  type="text"
                  className="input"
                  style={{ width: '100%' }}
                  placeholder="e.g. GSC domain ownership verified"
                  value={newClaim}
                  onChange={(e) => setNewClaim(e.target.value)}
                  required
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: 4 }}>
                  Status:
                </label>
                <select
                  className="input"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="pending">Pending</option>
                  <option value="verified">Verified</option>
                  <option value="not_verified">Not Verified</option>
                </select>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: 4 }}>
                  Source / Verification Tool:
                </label>
                <input
                  type="text"
                  className="input"
                  style={{ width: '100%' }}
                  placeholder="e.g. Google Search Console, Render, GA4 DebugView"
                  value={newSource}
                  onChange={(e) => setNewSource(e.target.value)}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: 4 }}>
                  Evidence Note / Methodology:
                </label>
                <textarea
                  className="input"
                  rows={3}
                  style={{ width: '100%', resize: 'vertical' }}
                  placeholder="Describe how this milestone was verified or what external step is pending..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-teal"
                >
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
