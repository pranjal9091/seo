import React, { useState, useEffect, useMemo } from 'react';
import {
  GSCImportDataset,
  GSCOverviewResponse,
  GSCRowItem,
  GSCPageItem,
  GSCComparisonResponse,
  GSCGeoCrossResponse
} from '../types/audit';
import {
  getGscOverview,
  getGscQueries,
  getGscPages,
  getGscDatasets,
  uploadGscCsv,
  uploadGscText,
  deleteGscDataset,
  updateGscRowIntent,
  getGscComparison,
  getGscGeoCrossAnalysis
} from '../services/api';

const INTENT_OPTIONS = [
  'Informational',
  'Commercial',
  'Navigational',
  'Comparison',
  'Transactional',
  'Career',
  'Educational',
  'Other'
];

const OPPORTUNITY_OPTIONS = [
  'All',
  'Top Performer',
  'Striking Distance',
  'High Impression / Low CTR',
  'Long Tail Demand',
  'Standard'
];

export const SearchPerformancePage: React.FC = () => {
  // Navigation tabs within Search Performance
  const [activeTab, setActiveTab] = useState<'overview' | 'queries' | 'pages' | 'compare' | 'cross' | 'datasets'>('overview');

  // Datasets state
  const [datasets, setDatasets] = useState<GSCImportDataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Overview data
  const [overviewData, setOverviewData] = useState<GSCOverviewResponse | null>(null);

  // Queries data & filters
  const [queries, setQueries] = useState<GSCRowItem[]>([]);
  const [queriesTotal, setQueriesTotal] = useState<number>(0);
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [minImpressions, setMinImpressions] = useState<string>('');
  const [minClicks, setMinClicks] = useState<string>('');
  const [minPosition, setMinPosition] = useState<string>('');
  const [maxPosition, setMaxPosition] = useState<string>('');
  const [opportunityFilter, setOpportunityFilter] = useState<string>('All');
  const [intentFilter, setIntentFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<string>('clicks');
  const [sortOrder, setSortOrder] = useState<string>('desc');
  const [isQueryLoading, setIsQueryLoading] = useState<boolean>(false);

  // Pages data
  const [pagesList, setPagesList] = useState<GSCPageItem[]>([]);
  const [selectedPageDetail, setSelectedPageDetail] = useState<GSCPageItem | null>(null);

  // Comparison data
  const [comparisonData, setComparisonData] = useState<GSCComparisonResponse | null>(null);
  const [baselineId, setBaselineId] = useState<string>('');
  const [latestId, setLatestId] = useState<string>('');

  // Cross-analysis data
  const [crossData, setCrossData] = useState<GSCGeoCrossResponse | null>(null);

  // Upload modal/form state
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [uploadMode, setUploadMode] = useState<'file' | 'text'>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pastedCsv, setPastedCsv] = useState<string>('');
  const [customFilename, setCustomFilename] = useState<string>('search_console_export.csv');
  const [dateRangeInput, setDateRangeInput] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadFeedback, setUploadFeedback] = useState<{ status: 'success' | 'error'; message: string; errors?: string[] } | null>(null);

  // Intent edit state
  const [editingRowId, setEditingRowId] = useState<string | null>(null);

  // Load datasets list initially
  const loadDatasets = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const list = await getGscDatasets();
      setDatasets(list);
      if (list.length > 0 && !selectedDatasetId) {
        setSelectedDatasetId(list[0].id);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to connect to backend engine.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDatasets();
  }, []);

  // Whenever selectedDatasetId changes, load the overview, pages, and cross analysis
  useEffect(() => {
    if (!selectedDatasetId && datasets.length === 0) {
      setOverviewData(null);
      return;
    }

    const fetchSelectedDatasetDetails = async () => {
      try {
        const ov = await getGscOverview(selectedDatasetId || undefined);
        setOverviewData(ov);
      } catch (err: any) {
        console.warn('Could not load GSC overview:', err);
      }
    };

    fetchSelectedDatasetDetails();
  }, [selectedDatasetId, datasets]);

  // Load queries table
  const fetchQueries = async () => {
    if (!selectedDatasetId && datasets.length === 0) return;
    setIsQueryLoading(true);
    try {
      const resp = await getGscQueries({
        import_id: selectedDatasetId || undefined,
        search: searchFilter || undefined,
        min_impressions: minImpressions ? parseInt(minImpressions, 10) : undefined,
        min_clicks: minClicks ? parseInt(minClicks, 10) : undefined,
        min_position: minPosition ? parseFloat(minPosition) : undefined,
        max_position: maxPosition ? parseFloat(maxPosition) : undefined,
        opportunity_type: opportunityFilter !== 'All' ? opportunityFilter : undefined,
        intent: intentFilter !== 'All' ? intentFilter : undefined,
        sort_by: sortBy,
        order: sortOrder,
        limit: 150
      });
      setQueries(resp.rows || []);
      setQueriesTotal(resp.total || 0);
    } catch (err: any) {
      console.warn('Could not load queries:', err);
    } finally {
      setIsQueryLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'queries') {
      fetchQueries();
    }
  }, [
    activeTab,
    selectedDatasetId,
    searchFilter,
    minImpressions,
    minClicks,
    minPosition,
    maxPosition,
    opportunityFilter,
    intentFilter,
    sortBy,
    sortOrder
  ]);

  // Load pages table
  useEffect(() => {
    if (activeTab === 'pages' && (selectedDatasetId || datasets.length > 0)) {
      getGscPages(selectedDatasetId || undefined)
        .then((res) => {
          setPagesList(res.pages || []);
        })
        .catch((err) => console.warn('Could not load pages:', err));
    }
  }, [activeTab, selectedDatasetId, datasets]);

  // Load comparison
  useEffect(() => {
    if (activeTab === 'compare') {
      getGscComparison(baselineId || undefined, latestId || undefined)
        .then((res) => {
          setComparisonData(res);
        })
        .catch((err) => console.warn('Could not load comparison:', err));
    }
  }, [activeTab, baselineId, latestId]);

  // Load cross analysis
  useEffect(() => {
    if (activeTab === 'cross' && (selectedDatasetId || datasets.length > 0)) {
      getGscGeoCrossAnalysis(selectedDatasetId || undefined)
        .then((res) => {
          setCrossData(res);
        })
        .catch((err) => console.warn('Could not load cross analysis:', err));
    }
  }, [activeTab, selectedDatasetId, datasets]);

  // Handle upload submit
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    setUploadFeedback(null);

    try {
      let res;
      if (uploadMode === 'file') {
        if (!selectedFile) {
          throw new Error('Please select a valid .csv export file.');
        }
        res = await uploadGscCsv(selectedFile, dateRangeInput || undefined);
      } else {
        if (!pastedCsv.trim()) {
          throw new Error('Please paste valid CSV content.');
        }
        res = await uploadGscText(pastedCsv, customFilename, dateRangeInput || undefined);
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
          message: `Successfully imported ${res.row_count} rows (${res.total_clicks} clicks, ${res.total_impressions} impressions).`
        });
        // Reload datasets list
        const updatedList = await getGscDatasets();
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
        message: err.message || 'Failed to upload Search Console dataset.'
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Handle Intent override
  const handleIntentChange = async (rowId: string, newIntent: string) => {
    try {
      await updateGscRowIntent(rowId, newIntent);
      setQueries((prev) =>
        prev.map((r) => (r.id === rowId ? { ...r, intent_category: newIntent } : r))
      );
      setEditingRowId(null);
    } catch (err: any) {
      alert(`Failed to update intent: ${err.message}`);
    }
  };

  // Handle delete dataset
  const handleDeleteDataset = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this Search Console dataset and its rows?')) {
      return;
    }
    try {
      await deleteGscDataset(id);
      const updated = await getGscDatasets();
      setDatasets(updated);
      if (selectedDatasetId === id) {
        setSelectedDatasetId(updated.length > 0 ? updated[0].id : '');
      }
    } catch (err: any) {
      alert(`Failed to delete: ${err.message}`);
    }
  };

  // Has data check
  const hasImportedData = overviewData?.has_data && overviewData?.metrics;

  return (
    <div className="search-performance-page">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Search Performance Analytics</h1>
          <p className="page-description">
            Google Search Console verified dataset intelligence. Real measured clicks, impressions, and weighted CTR.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {/* Dataset Selector if datasets exist */}
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
            + Upload GSC Export
          </button>
        </div>
      </div>

      {/* Secondary Tab Navigation */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border-hairline)', marginBottom: 24 }}>
        {[
          { id: 'overview', label: 'Overview & Summary' },
          { id: 'queries', label: 'Query Explorer' },
          { id: 'pages', label: 'Landing Pages' },
          { id: 'compare', label: 'Period Comparison (A/B)' },
          { id: 'cross', label: 'GEO + GSC Cross-Signals' },
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

      {/* EMPTY STATE (Honesty Requirement) */}
      {!hasImportedData && activeTab !== 'datasets' && (
        <div className="panel" style={{ textAlign: 'center', padding: '56px 24px', backgroundColor: '#FFFFFF' }}>
          <div style={{ fontSize: '1.8rem', marginBottom: 12 }}>📊</div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', fontWeight: 500, color: 'var(--text-ink)', marginBottom: 8 }}>
            No Search Console data imported yet.
          </h2>
          <p style={{ maxWidth: 560, margin: '0 auto 20px auto', fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            OmniGEO enforces strict data honesty: rankings, impressions, clicks, and CTR are never simulated or fabricated.
            Export your queries or pages from Google Search Console as a CSV file and upload it to generate verified performance analytics.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
            <button
              type="button"
              className="btn btn-teal"
              onClick={() => setShowUploadModal(true)}
            >
              Upload Google Search Console CSV
            </button>
          </div>
          <div style={{ marginTop: 24, fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            Supported columns: Query / Top queries, Page / Top pages, Clicks, Impressions, CTR, Position
          </div>
        </div>
      )}

      {/* TAB 1: OVERVIEW */}
      {hasImportedData && activeTab === 'overview' && (
        <div>
          {/* Provenance Banner */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              backgroundColor: 'var(--bg-subtle)',
              border: '1px solid var(--border-hairline)',
              borderRadius: 'var(--radius)',
              marginBottom: 20,
              fontSize: '0.78rem'
            }}
          >
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-ink)' }}>
                Active Dataset: {overviewData?.import_info?.filename}
              </span>
              <span style={{ color: 'var(--text-secondary)' }}>
                Imported: {overviewData?.import_info?.imported_at ? new Date(overviewData.import_info.imported_at).toLocaleString() : 'N/A'}
              </span>
              {overviewData?.import_info?.date_range && (
                <span className="metric-sample-pill">
                  Date Range: {overviewData.import_info.date_range}
                </span>
              )}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontSize: '0.72rem' }}>
              {overviewData?.import_info?.row_count} rows parsed • Verified SQLite persistence
            </div>
          </div>

          {/* Hero Metrics Row */}
          <div className="hero-metrics-row">
            <div className="metric-card">
              <div className="metric-label-row">
                <span className="metric-label">Total Clicks</span>
                <span className="metric-sample-pill">Measured</span>
              </div>
              <div className="metric-number-row">
                <span className="metric-big-number">
                  {overviewData?.metrics?.total_clicks.toLocaleString()}
                </span>
              </div>
              <div className="metric-delta-row">
                <span>Sum of all query clicks</span>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-label-row">
                <span className="metric-label">Total Impressions</span>
                <span className="metric-sample-pill">Measured</span>
              </div>
              <div className="metric-number-row">
                <span className="metric-big-number">
                  {overviewData?.metrics?.total_impressions.toLocaleString()}
                </span>
              </div>
              <div className="metric-delta-row">
                <span>Total organic SERP views</span>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-label-row">
                <span className="metric-label">Average CTR</span>
                <span className="metric-sample-pill">Weighted</span>
              </div>
              <div className="metric-number-row">
                <span className="metric-big-number">
                  {((overviewData?.metrics?.weighted_ctr || 0) * 100).toFixed(2)}%
                </span>
              </div>
              <div className="metric-delta-row">
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>
                  clicks / impressions
                </span>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-label-row">
                <span className="metric-label">Average Position</span>
                <span className="metric-sample-pill">Weighted</span>
              </div>
              <div className="metric-number-row">
                <span className="metric-big-number">
                  {overviewData?.metrics?.average_position.toFixed(1)}
                </span>
              </div>
              <div className="metric-delta-row">
                <span>Weighted by impressions</span>
              </div>
            </div>
          </div>

          {/* Volume Summary & Opportunity Classification Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 24 }}>
            {/* Opportunity Breakdown */}
            <div className="panel" style={{ margin: 0 }}>
              <div className="panel-header">
                <div>
                  <h3 className="panel-title">Search Opportunity Heuristics</h3>
                  <div className="panel-subtitle">
                    Transparent rule-based segmentation of imported search demand
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {Object.entries(overviewData?.opportunity_breakdown || {}).map(([oppType, count]) => {
                  let badgeColor = 'var(--text-secondary)';
                  let bg = 'var(--bg-subtle)';
                  if (oppType === 'Top Performer') {
                    badgeColor = 'var(--status-green)';
                    bg = 'var(--status-green-bg)';
                  } else if (oppType === 'Striking Distance') {
                    badgeColor = 'var(--accent)';
                    bg = 'var(--accent-subtle)';
                  } else if (oppType === 'High Impression / Low CTR') {
                    badgeColor = 'var(--status-amber)';
                    bg = 'var(--status-amber-bg)';
                  }

                  return (
                    <div
                      key={oppType}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        border: '1px solid var(--border-hairline)',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: bg
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: 600, fontSize: '0.84rem', color: badgeColor }}>
                          {oppType}
                        </span>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                          {oppType === 'Striking Distance' && 'Pos 4.0 – 20.0: Target for content depth & AEO answer blocks'}
                          {oppType === 'Top Performer' && 'Pos 1.0 – 3.0: Core revenue and branded authority queries'}
                          {oppType === 'High Impression / Low CTR' && 'Impressions ≥ 100 with CTR < 3%: Snippet optimization target'}
                          {oppType === 'Long Tail Demand' && 'Pos > 20.0 with Impressions ≥ 50: Secondary topical intent'}
                          {oppType === 'Standard' && 'Standard ranking query'}
                        </div>
                      </div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-ink)' }}>
                        {count} queries
                      </span>
                    </div>
                  );
                })}
              </div>

              <div style={{ marginTop: 14, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                *Note: "Striking Distance" and opportunity tags are internal evaluation heuristics, not official Google ranking algorithms.
              </div>
            </div>

            {/* Intent Distribution */}
            <div className="panel" style={{ margin: 0 }}>
              <div className="panel-header">
                <div>
                  <h3 className="panel-title">Search Intent Distribution</h3>
                  <div className="panel-subtitle">
                    Rule-suggested intent mapping across queries (user-overridable)
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                {Object.entries(overviewData?.intent_breakdown || {}).map(([intent, count]) => (
                  <div
                    key={intent}
                    style={{
                      padding: '10px 12px',
                      border: '1px solid var(--border-hairline)',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-surface)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}
                  >
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{intent}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-ink)' }}>
                      {count}
                    </span>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 14, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                *Queries are classified based on transparent keyword heuristics. You can override intent classifications in the Query Explorer tab.
              </div>
            </div>
          </div>

          {/* Mathematical Methodology Documentation Panel */}
          <div className="panel" style={{ backgroundColor: 'var(--bg-subtle)' }}>
            <h4 style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-ink)', marginBottom: 6 }}>
              Aggregation Methodology & Data Integrity Documentation
            </h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 8 }}>
              {overviewData?.metrics?.methodology.ctr_method}
            </p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 8 }}>
              {overviewData?.metrics?.methodology.position_method}
            </p>
            <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>
              {overviewData?.metrics?.methodology.data_integrity}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: QUERY EXPLORER */}
      {hasImportedData && activeTab === 'queries' && (
        <div className="panel">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">Query Explorer ({queriesTotal.toLocaleString()} total)</h3>
              <div className="panel-subtitle">
                Filter by performance thresholds, review internal opportunities, and explore AEO content recommendations
              </div>
            </div>
          </div>

          {/* Filters Bar */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: 10,
              padding: '12px 14px',
              backgroundColor: 'var(--bg-subtle)',
              borderRadius: 'var(--radius)',
              marginBottom: 16
            }}
          >
            <div>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>
                Search Query / Page
              </label>
              <input
                type="text"
                placeholder="Filter by keyword..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="form-input"
                style={{ padding: '4px 8px', fontSize: '0.8rem' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>
                Min Impressions
              </label>
              <input
                type="number"
                placeholder="e.g. 50"
                value={minImpressions}
                onChange={(e) => setMinImpressions(e.target.value)}
                className="form-input"
                style={{ padding: '4px 8px', fontSize: '0.8rem' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>
                Min Clicks
              </label>
              <input
                type="number"
                placeholder="e.g. 5"
                value={minClicks}
                onChange={(e) => setMinClicks(e.target.value)}
                className="form-input"
                style={{ padding: '4px 8px', fontSize: '0.8rem' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>
                Max Position (Rank)
              </label>
              <input
                type="number"
                placeholder="e.g. 20"
                value={maxPosition}
                onChange={(e) => setMaxPosition(e.target.value)}
                className="form-input"
                style={{ padding: '4px 8px', fontSize: '0.8rem' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>
                Opportunity Type
              </label>
              <select
                value={opportunityFilter}
                onChange={(e) => setOpportunityFilter(e.target.value)}
                className="form-input"
                style={{ padding: '4px 8px', fontSize: '0.8rem' }}
              >
                {OPPORTUNITY_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>
                Search Intent
              </label>
              <select
                value={intentFilter}
                onChange={(e) => setIntentFilter(e.target.value)}
                className="form-input"
                style={{ padding: '4px 8px', fontSize: '0.8rem' }}
              >
                <option value="All">All Intents</option>
                {INTENT_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Queries Table */}
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      setSortBy('query');
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    }}
                  >
                    Query {sortBy === 'query' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    style={{ textAlign: 'right', cursor: 'pointer' }}
                    onClick={() => {
                      setSortBy('clicks');
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    }}
                  >
                    Clicks {sortBy === 'clicks' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    style={{ textAlign: 'right', cursor: 'pointer' }}
                    onClick={() => {
                      setSortBy('impressions');
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    }}
                  >
                    Impr {sortBy === 'impressions' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    style={{ textAlign: 'right', cursor: 'pointer' }}
                    onClick={() => {
                      setSortBy('ctr');
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    }}
                  >
                    CTR {sortBy === 'ctr' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    style={{ textAlign: 'right', cursor: 'pointer' }}
                    onClick={() => {
                      setSortBy('position');
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    }}
                  >
                    Pos {sortBy === 'position' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th>Intent (Suggested)</th>
                  <th>Opportunity</th>
                  <th>AEO Content Recommendation</th>
                </tr>
              </thead>
              <tbody>
                {isQueryLoading ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                      Loading query data...
                    </td>
                  </tr>
                ) : queries.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                      No queries match your current filter criteria.
                    </td>
                  </tr>
                ) : (
                  queries.map((r) => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 500 }}>
                        <div>{r.query}</div>
                        {r.page && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                            {r.page}
                          </div>
                        )}
                      </td>
                      <td className="mono" style={{ textAlign: 'right', fontWeight: 600 }}>
                        {r.clicks.toLocaleString()}
                      </td>
                      <td className="mono" style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                        {r.impressions.toLocaleString()}
                      </td>
                      <td className="mono" style={{ textAlign: 'right' }}>
                        {(r.ctr * 100).toFixed(1)}%
                      </td>
                      <td className="mono" style={{ textAlign: 'right', fontWeight: 500 }}>
                        {r.position.toFixed(1)}
                      </td>
                      <td>
                        {editingRowId === r.id ? (
                          <select
                            value={r.intent_category}
                            onChange={(e) => handleIntentChange(r.id, e.target.value)}
                            onBlur={() => setEditingRowId(null)}
                            autoFocus
                            style={{ fontSize: '0.75rem', padding: '2px 4px' }}
                          >
                            {INTENT_OPTIONS.map((i) => (
                              <option key={i} value={i}>{i}</option>
                            ))}
                          </select>
                        ) : (
                          <span
                            onClick={() => setEditingRowId(r.id)}
                            title="Click to override intent category"
                            style={{
                              fontSize: '0.74rem',
                              border: '1px solid var(--border-hairline)',
                              padding: '2px 6px',
                              borderRadius: 'var(--radius-sm)',
                              cursor: 'pointer',
                              backgroundColor: 'var(--bg-subtle)'
                            }}
                          >
                            {r.intent_category} ✎
                          </span>
                        )}
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            padding: '2px 6px',
                            borderRadius: 'var(--radius-sm)',
                            fontWeight: 500,
                            backgroundColor:
                              r.opportunity_type === 'Top Performer'
                                ? 'var(--status-green-bg)'
                                : r.opportunity_type === 'Striking Distance'
                                ? 'var(--accent-subtle)'
                                : r.opportunity_type === 'High Impression / Low CTR'
                                ? 'var(--status-amber-bg)'
                                : 'var(--bg-subtle)',
                            color:
                              r.opportunity_type === 'Top Performer'
                                ? 'var(--status-green)'
                                : r.opportunity_type === 'Striking Distance'
                                ? 'var(--accent)'
                                : r.opportunity_type === 'High Impression / Low CTR'
                                ? 'var(--status-amber)'
                                : 'var(--text-secondary)'
                          }}
                        >
                          {r.opportunity_type}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', maxWidth: 280 }}>
                        {r.aeo_recommendation ? (
                          <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                            <span style={{ color: 'var(--accent)', fontWeight: 600 }}>💡</span>
                            <span>{r.aeo_recommendation}</span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-faint)' }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: LANDING PAGES */}
      {hasImportedData && activeTab === 'pages' && (
        <div className="panel">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">Landing Page Performance ({pagesList.length} pages detected)</h3>
              <div className="panel-subtitle">
                Page-level aggregated search demand. Click any page to drill down into its associated queries.
              </div>
            </div>
          </div>

          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Landing Page URL</th>
                  <th style={{ textAlign: 'right' }}>Clicks</th>
                  <th style={{ textAlign: 'right' }}>Impressions</th>
                  <th style={{ textAlign: 'right' }}>Weighted CTR</th>
                  <th style={{ textAlign: 'right' }}>Avg Position</th>
                  <th style={{ textAlign: 'right' }}>Queries</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {pagesList.map((p, idx) => (
                  <tr key={idx}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 500 }}>
                      {p.page}
                    </td>
                    <td className="mono" style={{ textAlign: 'right', fontWeight: 600 }}>
                      {p.clicks.toLocaleString()}
                    </td>
                    <td className="mono" style={{ textAlign: 'right' }}>
                      {p.impressions.toLocaleString()}
                    </td>
                    <td className="mono" style={{ textAlign: 'right' }}>
                      {(p.ctr * 100).toFixed(1)}%
                    </td>
                    <td className="mono" style={{ textAlign: 'right' }}>
                      {p.position.toFixed(1)}
                    </td>
                    <td className="mono" style={{ textAlign: 'right' }}>
                      {p.query_count}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        style={{ padding: '2px 8px', fontSize: '0.74rem' }}
                        onClick={() => setSelectedPageDetail(p)}
                      >
                        View Queries →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Drill-Down Modal / Drawer for Page Queries */}
          {selectedPageDetail && (
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.4)',
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
                  maxWidth: 860,
                  maxHeight: '85vh',
                  display: 'flex',
                  flexDirection: 'column',
                  padding: 24,
                  boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div>
                    <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', color: 'var(--text-ink)' }}>
                      Associated Queries for Landing Page
                    </h3>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--accent)', marginTop: 4 }}>
                      {selectedPageDetail.page}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setSelectedPageDetail(null)}
                  >
                    ✕ Close
                  </button>
                </div>

                <div style={{ overflowY: 'auto', flex: 1 }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Query</th>
                        <th style={{ textAlign: 'right' }}>Clicks</th>
                        <th style={{ textAlign: 'right' }}>Impr</th>
                        <th style={{ textAlign: 'right' }}>CTR</th>
                        <th style={{ textAlign: 'right' }}>Pos</th>
                        <th>Intent</th>
                        <th>Opportunity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedPageDetail.all_queries.map((q, qIdx) => (
                        <tr key={qIdx}>
                          <td style={{ fontWeight: 500 }}>{q.query}</td>
                          <td className="mono" style={{ textAlign: 'right', fontWeight: 600 }}>{q.clicks}</td>
                          <td className="mono" style={{ textAlign: 'right' }}>{q.impressions}</td>
                          <td className="mono" style={{ textAlign: 'right' }}>{(q.ctr * 100).toFixed(1)}%</td>
                          <td className="mono" style={{ textAlign: 'right' }}>{q.position.toFixed(1)}</td>
                          <td>
                            <span style={{ fontSize: '0.72rem', padding: '2px 6px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)' }}>
                              {q.intent}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontSize: '0.72rem', padding: '2px 6px', background: 'var(--accent-subtle)', color: 'var(--accent)', borderRadius: 'var(--radius-sm)' }}>
                              {q.opportunity}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: PERIOD COMPARISON (A vs B) */}
      {activeTab === 'compare' && (
        <div className="panel">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">Before / After Period Comparison</h3>
              <div className="panel-subtitle">
                Compare Baseline (Period A) against Latest (Period B) using strictly measured deltas
              </div>
            </div>
          </div>

          {datasets.length < 2 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius)' }}>
              <div style={{ fontSize: '1.4rem', marginBottom: 8 }}>⚖️</div>
              <h4 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', color: 'var(--text-ink)', marginBottom: 6 }}>
                Upload a second period to calculate change.
              </h4>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', maxWidth: 500, margin: '0 auto 16px auto' }}>
                OmniGEO never fabricates historical comparison baselines. To observe true click, impression, CTR, and position deltas, import at least two Search Console export files (e.g. Previous Month vs Current Month).
              </p>
              <button
                type="button"
                className="btn btn-teal"
                onClick={() => setShowUploadModal(true)}
              >
                + Upload Second Dataset
              </button>
            </div>
          ) : (
            <div>
              {/* Selectors for Baseline and Latest */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 24 }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-ink)', display: 'block', marginBottom: 4 }}>
                    Period A (Baseline):
                  </label>
                  <select
                    value={baselineId || (datasets.length > 1 ? datasets[1].id : '')}
                    onChange={(e) => setBaselineId(e.target.value)}
                    className="form-input"
                  >
                    {datasets.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.filename} ({d.date_range || 'Unspecified range'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-ink)', display: 'block', marginBottom: 4 }}>
                    Period B (Latest):
                  </label>
                  <select
                    value={latestId || (datasets.length > 0 ? datasets[0].id : '')}
                    onChange={(e) => setLatestId(e.target.value)}
                    className="form-input"
                  >
                    {datasets.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.filename} ({d.date_range || 'Unspecified range'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {comparisonData?.can_compare && (
                <div>
                  {/* Delta Metrics Cards */}
                  <div className="hero-metrics-row">
                    <div className="metric-card">
                      <div className="metric-label-row">
                        <span className="metric-label">Click Change</span>
                        <span className="metric-sample-pill">Delta</span>
                      </div>
                      <div className="metric-number-row">
                        <span
                          className="metric-big-number"
                          style={{
                            color:
                              (comparisonData.deltas?.clicks || 0) > 0
                                ? 'var(--status-green)'
                                : (comparisonData.deltas?.clicks || 0) < 0
                                ? 'var(--status-red)'
                                : 'var(--text-ink)'
                          }}
                        >
                          {(comparisonData.deltas?.clicks || 0) > 0 ? '+' : ''}
                          {comparisonData.deltas?.clicks.toLocaleString()}
                        </span>
                      </div>
                      <div className="metric-delta-row">
                        <span>
                          Baseline: {comparisonData.baseline?.total_clicks} → Latest: {comparisonData.latest?.total_clicks}
                        </span>
                      </div>
                    </div>

                    <div className="metric-card">
                      <div className="metric-label-row">
                        <span className="metric-label">Impression Change</span>
                        <span className="metric-sample-pill">Delta</span>
                      </div>
                      <div className="metric-number-row">
                        <span
                          className="metric-big-number"
                          style={{
                            color:
                              (comparisonData.deltas?.impressions || 0) > 0
                                ? 'var(--status-green)'
                                : (comparisonData.deltas?.impressions || 0) < 0
                                ? 'var(--status-red)'
                                : 'var(--text-ink)'
                          }}
                        >
                          {(comparisonData.deltas?.impressions || 0) > 0 ? '+' : ''}
                          {comparisonData.deltas?.impressions.toLocaleString()}
                        </span>
                      </div>
                      <div className="metric-delta-row">
                        <span>
                          Baseline: {comparisonData.baseline?.total_impressions} → Latest: {comparisonData.latest?.total_impressions}
                        </span>
                      </div>
                    </div>

                    <div className="metric-card">
                      <div className="metric-label-row">
                        <span className="metric-label">Weighted CTR Delta</span>
                        <span className="metric-sample-pill">Delta</span>
                      </div>
                      <div className="metric-number-row">
                        <span className="metric-big-number">
                          {(comparisonData.deltas?.ctr || 0) > 0 ? '+' : ''}
                          {(((comparisonData.deltas?.ctr || 0)) * 100).toFixed(2)}%
                        </span>
                      </div>
                      <div className="metric-delta-row">
                        <span>
                          {(((comparisonData.baseline?.weighted_ctr || 0)) * 100).toFixed(2)}% → {(((comparisonData.latest?.weighted_ctr || 0)) * 100).toFixed(2)}%
                        </span>
                      </div>
                    </div>

                    <div className="metric-card">
                      <div className="metric-label-row">
                        <span className="metric-label">Position Delta</span>
                        <span className="metric-sample-pill">Rank</span>
                      </div>
                      <div className="metric-number-row">
                        <span
                          className="metric-big-number"
                          style={{
                            color:
                              (comparisonData.deltas?.position || 0) < 0
                                ? 'var(--status-green)'
                                : (comparisonData.deltas?.position || 0) > 0
                                ? 'var(--status-red)'
                                : 'var(--text-ink)'
                          }}
                        >
                          {(comparisonData.deltas?.position || 0) > 0 ? '+' : ''}
                          {comparisonData.deltas?.position.toFixed(1)}
                        </span>
                      </div>
                      <div className="metric-delta-row">
                        <span>
                          {comparisonData.deltas?.position_direction === 'improved'
                            ? 'Rank improved (closer to #1)'
                            : comparisonData.deltas?.position_direction === 'declined'
                            ? 'Rank declined'
                            : 'Rank unchanged'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Top Growing and Declining Queries */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginTop: 24 }}>
                    <div className="panel" style={{ margin: 0 }}>
                      <h4 style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--status-green)', marginBottom: 12 }}>
                        ▲ Top Growing Queries
                      </h4>
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Query</th>
                            <th style={{ textAlign: 'right' }}>Delta</th>
                            <th style={{ textAlign: 'right' }}>Latest</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(comparisonData.query_deltas?.top_growing || []).map((q, idx) => (
                            <tr key={idx}>
                              <td style={{ fontWeight: 500 }}>{q.query}</td>
                              <td className="mono" style={{ textAlign: 'right', color: 'var(--status-green)', fontWeight: 600 }}>
                                +{q.click_delta}
                              </td>
                              <td className="mono" style={{ textAlign: 'right' }}>
                                {q.latest_clicks}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="panel" style={{ margin: 0 }}>
                      <h4 style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--status-red)', marginBottom: 12 }}>
                        ▼ Top Declining Queries
                      </h4>
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Query</th>
                            <th style={{ textAlign: 'right' }}>Delta</th>
                            <th style={{ textAlign: 'right' }}>Latest</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(comparisonData.query_deltas?.top_declining || []).map((q, idx) => (
                            <tr key={idx}>
                              <td style={{ fontWeight: 500 }}>{q.query}</td>
                              <td className="mono" style={{ textAlign: 'right', color: 'var(--status-red)', fontWeight: 600 }}>
                                {q.click_delta}
                              </td>
                              <td className="mono" style={{ textAlign: 'right' }}>
                                {q.latest_clicks}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: GEO + GSC CROSS-SIGNALS */}
      {hasImportedData && activeTab === 'cross' && (
        <div className="panel">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">GEO + Google Search Console Cross-Signals</h3>
              <div className="panel-subtitle">
                Compare verified Google search demand with synthetic AI visibility signals
              </div>
            </div>
          </div>

          {/* Critical Honesty / Non-Causation Disclaimer */}
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
            <strong>Analytical Transparency Notice:</strong> Google Search Console measures actual user search demand and click-through rates on Google SERPs. Generative Engine Optimization (GEO) measures brand citations and recommendations generated by LLMs (ChatGPT, Perplexity, Gemini).
            <span style={{ display: 'block', marginTop: 4, fontWeight: 500 }}>
              These datasets can be compared as separate search visibility signals. No causal relationship (e.g. "AI visibility increased Google traffic") is implied or claimed.
            </span>
          </div>

          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Query</th>
                  <th style={{ textAlign: 'right' }}>GSC Clicks</th>
                  <th style={{ textAlign: 'right' }}>GSC Impr</th>
                  <th style={{ textAlign: 'right' }}>Google Rank</th>
                  <th>GEO Query Category</th>
                  <th>NxtWave AI Engine Visibility</th>
                </tr>
              </thead>
              <tbody>
                {(crossData?.cross_signals || []).length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                      No direct query overlap found between your imported GSC queries and the AI visibility query library yet.
                    </td>
                  </tr>
                ) : (
                  (crossData?.cross_signals || []).map((s, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 500 }}>{s.query}</td>
                      <td className="mono" style={{ textAlign: 'right', fontWeight: 600 }}>{s.gsc_clicks}</td>
                      <td className="mono" style={{ textAlign: 'right' }}>{s.gsc_impressions}</td>
                      <td className="mono" style={{ textAlign: 'right' }}>{s.gsc_position.toFixed(1)}</td>
                      <td>
                        <span style={{ fontSize: '0.72rem', padding: '2px 6px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)' }}>
                          {s.geo_query_category}
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            padding: '3px 8px',
                            borderRadius: 'var(--radius-sm)',
                            fontWeight: 500,
                            backgroundColor: s.geo_visibility_status.includes('0/')
                              ? 'var(--status-red-bg)'
                              : 'var(--status-green-bg)',
                            color: s.geo_visibility_status.includes('0/')
                              ? 'var(--status-red)'
                              : 'var(--status-green)'
                          }}
                        >
                          {s.geo_visibility_status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* High demand queries not yet in AI Visibility Tracker */}
          {(crossData?.high_demand_not_in_geo_tracker || []).length > 0 && (
            <div style={{ marginTop: 28 }}>
              <h4 style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-ink)', marginBottom: 8 }}>
                High Search Demand GSC Queries Candidate for GEO Tracking
              </h4>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 12 }}>
                These keywords receive measurable organic impressions on Google and represent strategic candidates to add to your AI query tracking library:
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {(crossData?.high_demand_not_in_geo_tracker || []).map((item, idx) => (
                  <span
                    key={idx}
                    style={{
                      padding: '4px 10px',
                      fontSize: '0.76rem',
                      border: '1px solid var(--border-hairline)',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-surface)'
                    }}
                  >
                    <strong>{item.query}</strong> ({item.impressions} imps • Pos {item.position.toFixed(1)})
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 6: DATASETS MANAGEMENT */}
      {activeTab === 'datasets' && (
        <div className="panel">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">Search Console Dataset Repository ({datasets.length} datasets)</h3>
              <div className="panel-subtitle">
                Inspect data provenance, detected columns, and manage uploaded Google Search Console snapshots
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
              No Search Console datasets uploaded yet.
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
                    <th style={{ textAlign: 'right' }}>Total Clicks</th>
                    <th style={{ textAlign: 'right' }}>Total Impr</th>
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
                      <td className="mono" style={{ textAlign: 'right', fontWeight: 600 }}>{d.total_clicks}</td>
                      <td className="mono" style={{ textAlign: 'right' }}>{d.total_impressions}</td>
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
              maxWidth: 620,
              padding: 24,
              boxShadow: '0 12px 30px rgba(0,0,0,0.12)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', color: 'var(--text-ink)' }}>
                  Upload Google Search Console Export
                </h3>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Parses real CSV export files with UTF-8, percentage CTRs, and comma formatted metrics.
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

            {/* Mode Toggle */}
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
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                    Select .csv file from Google Search Console:
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
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    Supports "Queries.csv", "Pages.csv", or combined export files.
                  </div>
                </div>
              ) : (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 8 }}>
                    <div>
                      <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>
                        Dataset Label / Filename:
                      </label>
                      <input
                        type="text"
                        value={customFilename}
                        onChange={(e) => setCustomFilename(e.target.value)}
                        className="form-input"
                        placeholder="gsc_export_september.csv"
                      />
                    </div>
                  </div>

                  <label style={{ fontSize: '0.78rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                    Paste CSV Data:
                  </label>
                  <textarea
                    rows={7}
                    value={pastedCsv}
                    onChange={(e) => setPastedCsv(e.target.value)}
                    placeholder={`Top queries,Clicks,Impressions,CTR,Position\nnxtwave review,120,1500,8.0%,1.8\nfull stack developer course,45,3000,1.5%,8.4`}
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
                  placeholder="e.g. 2026-09-01 – 2026-09-30 (Last 28 Days)"
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
                <button
                  type="submit"
                  className="btn btn-teal"
                  disabled={isUploading}
                >
                  {isUploading ? 'Parsing & Storing...' : 'Import Dataset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
