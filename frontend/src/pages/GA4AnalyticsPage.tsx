import React, { useState, useEffect } from 'react';
import {
  GA4ImportDataset,
  GA4OverviewResponse,
  GA4PageItem,
  GSCGA4CrossResponse
} from '../types/audit';
import {
  getGa4Overview,
  getGa4Pages,
  getGa4Datasets,
  uploadGa4Csv,
  uploadGa4Text,
  deleteGa4Dataset,
  getGscGa4CrossAnalysis
} from '../services/api';
import { getGA4Status, trackPageView } from '../services/ga4';

interface GA4AnalyticsPageProps {
  onNavigateToArticle?: (slug: string) => void;
}

export const GA4AnalyticsPage: React.FC<GA4AnalyticsPageProps> = ({ onNavigateToArticle }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'pages' | 'cross' | 'datasets'>('overview');

  // Datasets state
  const [datasets, setDatasets] = useState<GA4ImportDataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Overview data
  const [overviewData, setOverviewData] = useState<GA4OverviewResponse | null>(null);

  // Pages data & sorting
  const [pagesList, setPagesList] = useState<GA4PageItem[]>([]);
  const [pageSortBy, setPageSortBy] = useState<'views' | 'users' | 'sessions' | 'engagement_rate' | 'conversions'>('views');
  const [pageSortOrder, setPageSortOrder] = useState<'desc' | 'asc'>('desc');

  // GSC + GA4 Cross-analysis data
  const [crossData, setCrossData] = useState<GSCGA4CrossResponse | null>(null);

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [uploadMode, setUploadMode] = useState<'file' | 'text'>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pastedCsv, setPastedCsv] = useState<string>('');
  const [customFilename, setCustomFilename] = useState<string>('ga4_pages_export.csv');
  const [dateRangeInput, setDateRangeInput] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadFeedback, setUploadFeedback] = useState<{ status: 'success' | 'error'; message: string; errors?: string[] } | null>(null);

  const ga4ClientStatus = getGA4Status();

  const loadDatasets = async () => {
    setIsLoading(true);
    try {
      const list = await getGa4Datasets();
      setDatasets(list);
      if (list.length > 0 && !selectedDatasetId) {
        setSelectedDatasetId(list[0].id);
      }
    } catch (err) {
      console.warn('Could not load GA4 datasets:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDatasets();
    trackPageView('/ga4', 'OmniGEO GA4 Analytics');
  }, []);

  useEffect(() => {
    if (!selectedDatasetId && datasets.length === 0) {
      setOverviewData(null);
      return;
    }

    getGa4Overview(selectedDatasetId || undefined)
      .then(setOverviewData)
      .catch((err) => console.warn('Could not load GA4 overview:', err));
  }, [selectedDatasetId, datasets]);

  useEffect(() => {
    if (activeTab === 'pages' && (selectedDatasetId || datasets.length > 0)) {
      getGa4Pages(selectedDatasetId || undefined)
        .then((res) => setPagesList(res.pages || []))
        .catch((err) => console.warn('Could not load GA4 pages:', err));
    }
  }, [activeTab, selectedDatasetId, datasets]);

  useEffect(() => {
    if (activeTab === 'cross') {
      getGscGa4CrossAnalysis()
        .then(setCrossData)
        .catch((err) => console.warn('Could not load GSC + GA4 cross analysis:', err));
    }
  }, [activeTab]);

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    setUploadFeedback(null);

    try {
      let res;
      if (uploadMode === 'file') {
        if (!selectedFile) throw new Error('Please select a valid CSV file.');
        res = await uploadGa4Csv(selectedFile, dateRangeInput || undefined);
      } else {
        if (!pastedCsv.trim()) throw new Error('Please paste valid CSV content.');
        res = await uploadGa4Text(pastedCsv, customFilename, dateRangeInput || undefined);
      }

      if (res.status === 'error') {
        setUploadFeedback({
          status: 'error',
          message: res.message || 'Import failed.',
          errors: res.errors
        });
      } else {
        setUploadFeedback({
          status: 'success',
          message: `Successfully imported ${res.row_count} rows (${res.total_views} views, ${res.total_sessions} sessions).`
        });
        const updatedList = await getGa4Datasets();
        setDatasets(updatedList);
        setSelectedDatasetId(res.id);
        setTimeout(() => {
          setShowUploadModal(false);
          setUploadFeedback(null);
          setSelectedFile(null);
          setPastedCsv('');
        }, 1200);
      }
    } catch (err: any) {
      setUploadFeedback({
        status: 'error',
        message: err.message || 'Failed to upload GA4 dataset.'
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDataset = async (id: string) => {
    if (!window.confirm('Delete this GA4 dataset and its metrics?')) return;
    try {
      await deleteGa4Dataset(id);
      const updated = await getGa4Datasets();
      setDatasets(updated);
      if (selectedDatasetId === id) {
        setSelectedDatasetId(updated.length > 0 ? updated[0].id : '');
      }
    } catch (err: any) {
      alert(`Failed to delete: ${err.message}`);
    }
  };

  const hasImportedData = overviewData?.has_data && overviewData?.metrics;

  const sortedPages = [...pagesList].sort((a, b) => {
    const valA = a[pageSortBy];
    const valB = b[pageSortBy];
    return pageSortOrder === 'desc' ? (valB > valA ? 1 : -1) : (valA > valB ? 1 : -1);
  });

  return (
    <div className="ga4-analytics-page">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Google Analytics 4 (GA4) Intelligence</h1>
          <p className="page-description">
            Measured on-site engagement, user sessions, and conversions from verified GA4 exports.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {/* Active Dataset Selector */}
          {datasets.length > 0 && (
            <select
              value={selectedDatasetId}
              onChange={(e) => setSelectedDatasetId(e.target.value)}
              className="form-input"
              style={{ width: 'auto', padding: '6px 12px', fontSize: '0.82rem' }}
            >
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.filename} ({d.row_count} rows • {d.date_range || 'Unspecified range'})
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            className="btn btn-teal"
            onClick={() => setShowUploadModal(true)}
          >
            + Upload GA4 Export
          </button>
        </div>
      </div>

      {/* Sub Tabs */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border-hairline)', marginBottom: 24 }}>
        {[
          { id: 'overview', label: 'Overview & Usage' },
          { id: 'pages', label: 'Content Performance' },
          { id: 'cross', label: 'GSC + GA4 Cross-Signals' },
          { id: 'datasets', label: `Datasets (${datasets.length})` }
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              padding: '8px 14px',
              fontSize: '0.84rem',
              fontWeight: activeTab === tab.id ? 600 : 500,
              color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-secondary)',
              borderBottom: activeTab === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
              background: 'transparent',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
              marginBottom: -1,
              fontFamily: 'var(--font-sans)'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Real-time GA4 Tracking Status Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 16px',
          backgroundColor: 'var(--bg-subtle)',
          borderRadius: 'var(--radius)',
          marginBottom: 20,
          fontSize: '0.78rem'
        }}
      >
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: ga4ClientStatus.isConfigured ? 'var(--status-green)' : 'var(--text-muted)'
            }}
          />
          <strong style={{ color: 'var(--text-ink)' }}>Client Measurement Script:</strong>
          <span style={{ color: ga4ClientStatus.isConfigured ? 'var(--status-green)' : 'var(--text-secondary)' }}>
            {ga4ClientStatus.statusLabel}
          </span>
        </div>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          Environment Variable: VITE_GA4_MEASUREMENT_ID
        </div>
      </div>

      {/* EMPTY STATE */}
      {!hasImportedData && activeTab !== 'datasets' && (
        <div className="panel" style={{ textAlign: 'center', padding: '56px 24px', backgroundColor: '#FFFFFF' }}>
          <div style={{ fontSize: '1.8rem', marginBottom: 12 }}>📈</div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', fontWeight: 500, color: 'var(--text-ink)', marginBottom: 8 }}>
            No GA4 data imported yet.
          </h2>
          <p style={{ maxWidth: 560, margin: '0 auto 20px auto', fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            OmniGEO enforces strict data honesty: users, sessions, engagement rate, and conversions are never simulated or fabricated.
            Export your Pages and Screens report from Google Analytics 4 as a CSV and upload it to inspect verified usage metrics.
          </p>
          <button
            type="button"
            className="btn btn-teal"
            onClick={() => setShowUploadModal(true)}
          >
            Upload Google Analytics 4 CSV
          </button>
        </div>
      )}

      {/* TAB 1: OVERVIEW */}
      {hasImportedData && activeTab === 'overview' && (
        <div>
          {/* Hero Metrics Row */}
          <div className="hero-metrics-row">
            <div className="metric-card">
              <div className="metric-label-row">
                <span className="metric-label">Total Users</span>
                <span className="metric-sample-pill">Measured</span>
              </div>
              <div className="metric-number-row">
                <span className="metric-big-number">
                  {overviewData?.metrics?.total_users.toLocaleString()}
                </span>
              </div>
              <div className="metric-delta-row">
                <span>Unique visitors across dataset</span>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-label-row">
                <span className="metric-label">Total Sessions</span>
                <span className="metric-sample-pill">Measured</span>
              </div>
              <div className="metric-number-row">
                <span className="metric-big-number">
                  {overviewData?.metrics?.total_sessions.toLocaleString()}
                </span>
              </div>
              <div className="metric-delta-row">
                <span>On-site engagement sessions</span>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-label-row">
                <span className="metric-label">Page Views</span>
                <span className="metric-sample-pill">Measured</span>
              </div>
              <div className="metric-number-row">
                <span className="metric-big-number">
                  {overviewData?.metrics?.total_views.toLocaleString()}
                </span>
              </div>
              <div className="metric-delta-row">
                <span>Total content screen views</span>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-label-row">
                <span className="metric-label">Engagement Rate</span>
                <span className="metric-sample-pill">Weighted</span>
              </div>
              <div className="metric-number-row">
                <span className="metric-big-number">
                  {((overviewData?.metrics?.weighted_engagement_rate || 0) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="metric-delta-row">
                <span>Weighted by session volume</span>
              </div>
            </div>
          </div>

          {/* Conversions Banner */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border-hairline)',
              borderRadius: 'var(--radius)',
              marginBottom: 24
            }}
          >
            <div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Total Recorded Conversions (Key Events)
              </div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.8rem', fontWeight: 600, color: 'var(--accent)' }}>
                {overviewData?.metrics?.total_conversions.toLocaleString()}
              </div>
            </div>
            <div style={{ textAlign: 'right', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Overall Session Conversion Rate: <strong style={{ color: 'var(--text-ink)' }}>{((overviewData?.metrics?.conversion_rate || 0) * 100).toFixed(2)}%</strong>
            </div>
          </div>

          {/* Methodology Panel */}
          <div className="panel" style={{ backgroundColor: 'var(--bg-subtle)' }}>
            <h4 style={{ fontSize: '0.84rem', fontWeight: 600, marginBottom: 6 }}>
              GA4 Aggregation Methodology Documentation
            </h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 6 }}>
              {overviewData?.metrics?.methodology.engagement_rate_method}
            </p>
            <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>
              {overviewData?.metrics?.methodology.data_integrity}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CONTENT PERFORMANCE TABLE */}
      {hasImportedData && activeTab === 'pages' && (
        <div className="panel">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">Content Page Performance ({pagesList.length} paths detected)</h3>
              <div className="panel-subtitle">
                Page-level engagement, unique visitors, and conversions from uploaded GA4 exports
              </div>
            </div>
          </div>

          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Page Path & Title</th>
                  <th
                    style={{ textAlign: 'right', cursor: 'pointer' }}
                    onClick={() => {
                      setPageSortBy('views');
                      setPageSortOrder(pageSortOrder === 'desc' ? 'asc' : 'desc');
                    }}
                  >
                    Views {pageSortBy === 'views' && (pageSortOrder === 'desc' ? '↓' : '↑')}
                  </th>
                  <th
                    style={{ textAlign: 'right', cursor: 'pointer' }}
                    onClick={() => {
                      setPageSortBy('users');
                      setPageSortOrder(pageSortOrder === 'desc' ? 'asc' : 'desc');
                    }}
                  >
                    Users {pageSortBy === 'users' && (pageSortOrder === 'desc' ? '↓' : '↑')}
                  </th>
                  <th
                    style={{ textAlign: 'right', cursor: 'pointer' }}
                    onClick={() => {
                      setPageSortBy('sessions');
                      setPageSortOrder(pageSortOrder === 'desc' ? 'asc' : 'desc');
                    }}
                  >
                    Sessions {pageSortBy === 'sessions' && (pageSortOrder === 'desc' ? '↓' : '↑')}
                  </th>
                  <th
                    style={{ textAlign: 'right', cursor: 'pointer' }}
                    onClick={() => {
                      setPageSortBy('engagement_rate');
                      setPageSortOrder(pageSortOrder === 'desc' ? 'asc' : 'desc');
                    }}
                  >
                    Eng. Rate {pageSortBy === 'engagement_rate' && (pageSortOrder === 'desc' ? '↓' : '↑')}
                  </th>
                  <th
                    style={{ textAlign: 'right', cursor: 'pointer' }}
                    onClick={() => {
                      setPageSortBy('conversions');
                      setPageSortOrder(pageSortOrder === 'desc' ? 'asc' : 'desc');
                    }}
                  >
                    Conversions {pageSortBy === 'conversions' && (pageSortOrder === 'desc' ? '↓' : '↑')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedPages.map((p, idx) => (
                  <tr key={idx}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{p.page_title}</div>
                      <div style={{ fontSize: '0.74rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                        {p.page_path}
                      </div>
                    </td>
                    <td className="mono" style={{ textAlign: 'right', fontWeight: 600 }}>{p.views.toLocaleString()}</td>
                    <td className="mono" style={{ textAlign: 'right' }}>{p.users.toLocaleString()}</td>
                    <td className="mono" style={{ textAlign: 'right' }}>{p.sessions.toLocaleString()}</td>
                    <td className="mono" style={{ textAlign: 'right' }}>{(p.engagement_rate * 100).toFixed(1)}%</td>
                    <td className="mono" style={{ textAlign: 'right', color: p.conversions > 0 ? 'var(--status-green)' : 'var(--text-muted)' }}>
                      {p.conversions}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: GSC + GA4 CROSS-SIGNALS */}
      {activeTab === 'cross' && (
        <div className="panel">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">Google Search Console + GA4 Cross-Analysis</h3>
              <div className="panel-subtitle">
                Side-by-side comparison of Google organic search demand against on-site engagement
              </div>
            </div>
          </div>

          <div
            style={{
              padding: '12px 16px',
              backgroundColor: 'var(--accent-subtle)',
              border: '1px solid var(--accent-border)',
              borderRadius: 'var(--radius)',
              marginBottom: 20,
              fontSize: '0.8rem',
              color: 'var(--text-ink)',
              lineHeight: 1.5
            }}
          >
            <strong>Methodology Notice:</strong> {crossData?.disclaimer || "Observed performance across independent measurement systems. Descriptive correlation — not causal attribution."}
            <span style={{ display: 'block', marginTop: 4 }}>
              Google Search Console measures organic discovery and SERP clicks. Google Analytics 4 measures visitor session engagement. We do not claim that organic rankings directly caused on-site conversions without unified attribution data.
            </span>
          </div>

          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Page Path</th>
                  <th style={{ textAlign: 'right' }}>GSC Clicks</th>
                  <th style={{ textAlign: 'right' }}>GSC Impr</th>
                  <th style={{ textAlign: 'right' }}>GSC CTR</th>
                  <th style={{ textAlign: 'right' }}>GA4 Users</th>
                  <th style={{ textAlign: 'right' }}>GA4 Sessions</th>
                  <th style={{ textAlign: 'right' }}>GA4 Eng. Rate</th>
                  <th style={{ textAlign: 'right' }}>Conversions</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(crossData?.pages || []).length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                      Import both a Search Console export and a GA4 export to view correlated page signals.
                    </td>
                  </tr>
                ) : (
                  (crossData?.pages || []).map((row, idx) => (
                    <tr key={idx}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', fontWeight: 500 }}>
                        {row.path}
                      </td>
                      <td className="mono" style={{ textAlign: 'right', fontWeight: 600 }}>
                        {row.has_gsc ? row.gsc_clicks : '—'}
                      </td>
                      <td className="mono" style={{ textAlign: 'right' }}>
                        {row.has_gsc ? row.gsc_impressions : '—'}
                      </td>
                      <td className="mono" style={{ textAlign: 'right' }}>
                        {row.has_gsc ? `${(row.gsc_ctr * 100).toFixed(1)}%` : '—'}
                      </td>
                      <td className="mono" style={{ textAlign: 'right' }}>
                        {row.has_ga4 ? row.ga4_users : '—'}
                      </td>
                      <td className="mono" style={{ textAlign: 'right' }}>
                        {row.has_ga4 ? row.ga4_sessions : '—'}
                      </td>
                      <td className="mono" style={{ textAlign: 'right' }}>
                        {row.has_ga4 ? `${(row.ga4_engagement_rate * 100).toFixed(1)}%` : '—'}
                      </td>
                      <td className="mono" style={{ textAlign: 'right', color: row.ga4_conversions > 0 ? 'var(--status-green)' : undefined }}>
                        {row.has_ga4 ? row.ga4_conversions : '—'}
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            padding: '2px 6px',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: row.status.includes('both') ? 'var(--status-green-bg)' : 'var(--bg-subtle)',
                            color: row.status.includes('both') ? 'var(--status-green)' : 'var(--text-muted)',
                            fontWeight: 500
                          }}
                        >
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: DATASETS REPOSITORY */}
      {activeTab === 'datasets' && (
        <div className="panel">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">GA4 Dataset Repository ({datasets.length} snapshots)</h3>
              <div className="panel-subtitle">
                Trace provenance, detected columns, and manage uploaded Google Analytics 4 CSV snapshots
              </div>
            </div>
            <button
              type="button"
              className="btn btn-teal"
              onClick={() => setShowUploadModal(true)}
            >
              + Upload New Dataset
            </button>
          </div>

          {datasets.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--text-muted)' }}>
              No GA4 datasets uploaded yet.
            </div>
          ) : (
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Filename</th>
                    <th>Import Timestamp</th>
                    <th>Date Range</th>
                    <th style={{ textAlign: 'right' }}>Rows</th>
                    <th style={{ textAlign: 'right' }}>Views</th>
                    <th style={{ textAlign: 'right' }}>Sessions</th>
                    <th>Columns Detected</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {datasets.map((d) => (
                    <tr key={d.id} style={{ backgroundColor: selectedDatasetId === d.id ? 'var(--accent-subtle)' : undefined }}>
                      <td style={{ fontWeight: 600 }}>
                        {d.filename}
                        {selectedDatasetId === d.id && (
                          <span style={{ marginLeft: 8, fontSize: '0.68rem', color: 'var(--accent)', fontWeight: 600 }}>
                            (Active)
                          </span>
                        )}
                      </td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {new Date(d.imported_at).toLocaleString()}
                      </td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {d.date_range || 'Unspecified'}
                      </td>
                      <td className="mono" style={{ textAlign: 'right' }}>{d.row_count}</td>
                      <td className="mono" style={{ textAlign: 'right', fontWeight: 600 }}>{d.total_views}</td>
                      <td className="mono" style={{ textAlign: 'right' }}>{d.total_sessions}</td>
                      <td style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {d.columns_detected.join(', ')}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            type="button"
                            className="btn btn-ghost"
                            style={{ padding: '2px 8px', fontSize: '0.72rem' }}
                            onClick={() => {
                              setSelectedDatasetId(d.id);
                              setActiveTab('overview');
                            }}
                          >
                            Set Active
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost"
                            style={{ padding: '2px 8px', fontSize: '0.72rem', color: 'var(--status-red)' }}
                            onClick={() => handleDeleteDataset(d.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* UPLOAD MODAL */}
      {showUploadModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.45)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border-hairline)',
              width: '90%',
              maxWidth: 600,
              padding: 24,
              boxShadow: '0 12px 30px rgba(0,0,0,0.12)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', color: 'var(--text-ink)' }}>
                  Upload Google Analytics 4 Export
                </h3>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Parses real GA4 CSV reports (Pages and Screens) with comma values and engagement percentages.
                </div>
              </div>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadFeedback(null);
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <button
                type="button"
                onClick={() => setUploadMode('file')}
                style={{
                  flex: 1,
                  padding: '6px 12px',
                  fontSize: '0.82rem',
                  fontWeight: uploadMode === 'file' ? 600 : 500,
                  backgroundColor: uploadMode === 'file' ? 'var(--accent-subtle)' : 'transparent',
                  color: uploadMode === 'file' ? 'var(--accent)' : 'var(--text-secondary)',
                  border: uploadMode === 'file' ? '1px solid var(--accent-border)' : '1px solid var(--border-hairline)',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer'
                }}
              >
                Upload CSV File
              </button>
              <button
                type="button"
                onClick={() => setUploadMode('text')}
                style={{
                  flex: 1,
                  padding: '6px 12px',
                  fontSize: '0.82rem',
                  fontWeight: uploadMode === 'text' ? 600 : 500,
                  backgroundColor: uploadMode === 'text' ? 'var(--accent-subtle)' : 'transparent',
                  color: uploadMode === 'text' ? 'var(--accent)' : 'var(--text-secondary)',
                  border: uploadMode === 'text' ? '1px solid var(--accent-border)' : '1px solid var(--border-hairline)',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer'
                }}
              >
                Paste CSV Text
              </button>
            </div>

            <form onSubmit={handleUploadSubmit}>
              {uploadMode === 'file' ? (
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                    Select .csv file from GA4:
                  </label>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        setSelectedFile(e.target.files[0]);
                      }
                    }}
                    className="form-input"
                    style={{ padding: 8 }}
                  />
                </div>
              ) : (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ marginBottom: 8 }}>
                    <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>
                      Dataset Label:
                    </label>
                    <input
                      type="text"
                      value={customFilename}
                      onChange={(e) => setCustomFilename(e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                    Paste CSV Data:
                  </label>
                  <textarea
                    rows={6}
                    value={pastedCsv}
                    onChange={(e) => setPastedCsv(e.target.value)}
                    placeholder={`Page path,Page title,Views,Users,Sessions,Engagement rate,Conversions\n/content/what-is-generative-ai,What is GenAI,1200,850,920,68.5%,45\n/reviews,NxtWave Reviews,450,300,320,54.0%,12`}
                    className="form-input"
                    style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}
                  />
                </div>
              )}

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                  Date Range Label (Optional):
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sep 1 – Sep 30, 2026"
                  value={dateRangeInput}
                  onChange={(e) => setDateRangeInput(e.target.value)}
                  className="form-input"
                />
              </div>

              {uploadFeedback && (
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: 16,
                    fontSize: '0.78rem',
                    backgroundColor: uploadFeedback.status === 'success' ? 'var(--status-green-bg)' : 'var(--status-red-bg)',
                    color: uploadFeedback.status === 'success' ? 'var(--status-green)' : 'var(--status-red)',
                    border: `1px solid ${uploadFeedback.status === 'success' ? 'var(--status-green)' : 'var(--status-red)'}`
                  }}
                >
                  {uploadFeedback.message}
                  {uploadFeedback.errors && uploadFeedback.errors.length > 0 && (
                    <ul style={{ marginTop: 4, paddingLeft: 18 }}>
                      {uploadFeedback.errors.map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setShowUploadModal(false);
                    setUploadFeedback(null);
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-teal" disabled={isUploading}>
                  {isUploading ? 'Parsing...' : 'Import Dataset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
