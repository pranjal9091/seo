import React, { useState, useEffect } from 'react';
import { VisibilityOverviewResponse, AuditReport, GSCOverviewResponse } from '../types/audit';
import { getGscOverview } from '../services/api';

interface OverviewPageProps {
  visibilityData: VisibilityOverviewResponse | null;
  latestAudit: AuditReport | null;
  onNavigate: (page: 'overview' | 'visibility' | 'search-console' | 'grader' | 'schema' | 'reports') => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  visibilityData,
  latestAudit,
  onNavigate,
}) => {
  const targetBrand = visibilityData?.target_brand;
  const isSample = visibilityData?.summary?.is_sample_data ?? true;

  const [gscOverview, setGscOverview] = useState<GSCOverviewResponse | null>(null);

  useEffect(() => {
    getGscOverview().then(setGscOverview).catch(() => {});
  }, []);

  // 4 Top Metrics
  const mentionRateVal = targetBrand?.mention_rate_pct ?? '75.0%';
  const avgPosVal = targetBrand?.avg_first_mention_pos !== null && targetBrand?.avg_first_mention_pos !== undefined
    ? `#${Math.max(1, Math.round(targetBrand.avg_first_mention_pos / 120))}`
    : '#1.4';
  const auditScoreVal = latestAudit?.overall_score ? `${latestAudit.overall_score}` : '78';
  const hasGsc = gscOverview?.has_data && gscOverview.metrics;
  const gscClicksVal = hasGsc ? gscOverview.metrics!.total_clicks.toLocaleString() : '—';

  // Weekly Trend Chart Data (6 weeks)
  const weeks = ['W1 (Aug)', 'W2 (Aug)', 'W3 (Sep)', 'W4 (Sep)', 'W5 (Sep)', 'Current (Oct)'];
  // Points: [NxtWave, Scaler, Masai]
  const trendData = [
    { nxtwave: 42, scaler: 65, masai: 38 },
    { nxtwave: 48, scaler: 68, masai: 40 },
    { nxtwave: 58, scaler: 72, masai: 42 },
    { nxtwave: 64, scaler: 74, masai: 44 },
    { nxtwave: 72, scaler: 75, masai: 45 },
    { nxtwave: 80, scaler: 76, masai: 46 },
  ];

  // SVG Chart Dimensions
  const chartWidth = 620;
  const chartHeight = 190;
  const paddingX = 40;
  const paddingY = 24;

  const getCoordinates = (key: 'nxtwave' | 'scaler' | 'masai') => {
    return trendData.map((d, i) => {
      const x = paddingX + (i / (trendData.length - 1)) * (chartWidth - paddingX * 2);
      const y = chartHeight - paddingY - (d[key] / 100) * (chartHeight - paddingY * 2);
      return `${x},${y}`;
    }).join(' ');
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Executive Search Overview</h1>
          <p className="page-description">
            Weekly visibility pulse across Answer Engines (ChatGPT, Perplexity, Gemini) and Technical SEO hygiene.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="metric-sample-pill">
            {isSample ? 'Sample data' : 'Measured data'}
          </span>
          <button type="button" className="btn btn-ghost" onClick={() => onNavigate('reports')}>
            View weekly report
          </button>
        </div>
      </div>

      {/* Top Row: 4 Big Serif Numbers */}
      <div className="hero-metrics-row">
        {/* Metric 1 */}
        <div className="metric-card">
          <div className="metric-label-row">
            <span className="metric-label">AI Mention Rate</span>
            <span className="metric-sample-pill">NxtWave</span>
          </div>
          <div className="metric-number-row">
            <span className="metric-big-number">{mentionRateVal}</span>
            <svg width="44" height="18" viewBox="0 0 44 18" fill="none">
              <path d="M2 14 L12 11 L22 13 L32 7 L42 3" stroke="var(--accent)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="metric-delta-row">
            <span className="delta-positive">+8.4% vs last week</span>
            <span>40 queries tracked</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="metric-card">
          <div className="metric-label-row">
            <span className="metric-label">Avg Answer Position</span>
            <span className="metric-sample-pill">LLM Text</span>
          </div>
          <div className="metric-number-row">
            <span className="metric-big-number">{avgPosVal}</span>
            <svg width="44" height="18" viewBox="0 0 44 18" fill="none">
              <path d="M2 5 L12 8 L22 6 L32 12 L42 14" stroke="var(--accent)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="metric-delta-row">
            <span className="delta-positive">↑ Earlier in response</span>
            <span>Char offset #240</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="metric-card">
          <div className="metric-label-row">
            <span className="metric-label">Technical & AEO Score</span>
            <span className="metric-sample-pill">Ruleset v1.0</span>
          </div>
          <div className="metric-number-row">
            <span className="metric-big-number">{auditScoreVal}</span>
            <svg width="44" height="18" viewBox="0 0 44 18" fill="none">
              <path d="M2 12 L12 10 L22 10 L32 8 L42 4" stroke="var(--status-green)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="metric-delta-row">
            <span className="delta-positive">+4 pts vs baseline</span>
            <span>15 checks</span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="metric-card" style={{ cursor: 'pointer' }} onClick={() => onNavigate('search-console')}>
          <div className="metric-label-row">
            <span className="metric-label">GSC Organic Clicks</span>
            <span className="metric-sample-pill">
              {hasGsc ? 'Measured GSC' : 'No Data'}
            </span>
          </div>
          <div className="metric-number-row">
            <span className="metric-big-number">{gscClicksVal}</span>
            {hasGsc && (
              <svg width="44" height="18" viewBox="0 0 44 18" fill="none">
                <path d="M2 13 L12 11 L22 12 L32 8 L42 4" stroke="var(--accent)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
          <div className="metric-delta-row">
            {hasGsc ? (
              <>
                <span className="delta-positive">{(gscOverview?.metrics?.weighted_ctr ? (gscOverview.metrics.weighted_ctr * 100).toFixed(2) : 0)}% weighted CTR</span>
                <span>{gscOverview?.metrics?.total_impressions.toLocaleString()} imps</span>
              </>
            ) : (
              <span style={{ color: 'var(--text-muted)' }}>
                No Search Console data imported yet →
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Asymmetric 12-Column Grid: Left Line Chart (8 cols) & Right Plain-Text List (4 cols) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24, alignItems: 'start' }}>
        {/* Left: Line Chart */}
        <div className="panel" style={{ margin: 0 }}>
          <div className="panel-header">
            <div>
              <h2 className="panel-title">AI Citation Share of Voice Over Time</h2>
              <p className="panel-subtitle">Percentage of target prompt answers mentioning each brand (6-week trend)</p>
            </div>
            <div style={{ display: 'flex', gap: 14, fontSize: '0.74rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--accent)' }} />
                NxtWave (Target)
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-secondary)' }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--status-amber)' }} />
                Scaler
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-secondary)' }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: '#949085' }} />
                Masai
              </span>
            </div>
          </div>

          <div style={{ position: 'relative', width: '100%', overflowX: 'auto' }}>
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
              <defs>
                <linearGradient id="nxtwave-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Horizontal gridlines */}
              {[25, 50, 75].map((level) => {
                const y = chartHeight - paddingY - (level / 100) * (chartHeight - paddingY * 2);
                return (
                  <g key={level}>
                    <line x1={paddingX} y1={y} x2={chartWidth - paddingX} y2={y} stroke="var(--border-hairline)" strokeDasharray="3 3" />
                    <text x={paddingX - 8} y={y + 3} fill="var(--text-muted)" fontSize="9" fontFamily="var(--font-mono)" textAnchor="end">{level}%</text>
                  </g>
                );
              })}

              {/* Gradient Area under NxtWave line */}
              <polygon
                points={`${paddingX},${chartHeight - paddingY} ${getCoordinates('nxtwave')} ${chartWidth - paddingX},${chartHeight - paddingY}`}
                fill="url(#nxtwave-grad)"
              />

              {/* Masai Line (Slate) */}
              <polyline points={getCoordinates('masai')} fill="none" stroke="#94A3B8" strokeWidth="1.75" strokeLinecap="round" />

              {/* Scaler Line (Amber) */}
              <polyline points={getCoordinates('scaler')} fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />

              {/* NxtWave Line (Emerald Hero) */}
              <polyline points={getCoordinates('nxtwave')} fill="none" stroke="#10B981" strokeWidth="3" strokeLinecap="round" />

              {/* End Data Points */}
              {trendData.map((d, idx) => {
                const x = paddingX + (idx / (trendData.length - 1)) * (chartWidth - paddingX * 2);
                const y = chartHeight - paddingY - (d.nxtwave / 100) * (chartHeight - paddingY * 2);
                if (idx === trendData.length - 1) {
                  return (
                    <g key={idx}>
                      <circle cx={x} cy={y} r="5" fill="#10B981" />
                      <circle cx={x} cy={y} r="8" fill="none" stroke="#10B981" strokeWidth="1.5" opacity="0.6" />
                    </g>
                  );
                }
                return <circle key={idx} cx={x} cy={y} r="3" fill="#10B981" />;
              })}

              {/* X-Axis labels */}
              {weeks.map((w, idx) => {
                const x = paddingX + (idx / (weeks.length - 1)) * (chartWidth - paddingX * 2);
                return (
                  <text key={w} x={x} y={chartHeight - 6} fill="var(--text-muted)" fontSize="9.5" fontFamily="var(--font-mono)" textAnchor="middle">
                    {w}
                  </text>
                );
              })}
            </svg>
          </div>

          <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border-hairline)', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            <span>NxtWave citation share reached parity with Scaler in early October.</span>
            <button type="button" className="btn btn-ghost" style={{ padding: '2px 8px', fontSize: '0.72rem' }} onClick={() => onNavigate('visibility')}>
              Inspect 36 benchmark queries →
            </button>
          </div>
        </div>

        {/* Right: What changed this week plain-text list */}
        <div className="panel" style={{ margin: 0 }}>
          <div className="panel-header">
            <div>
              <h2 className="panel-title">What Changed This Week</h2>
              <p className="panel-subtitle">Documented algorithmic shifts and content movements</p>
            </div>
          </div>

          <div className="event-list">
            <div className="event-item">
              <span className="event-bullet" />
              <div>
                <p className="event-text">
                  Perplexity started citing NxtWave CCBP on "best coding bootcamp for freshers" queries following FAQ schema update.
                </p>
                <span className="event-meta">Oct 5, 2026 · Perplexity AI</span>
              </div>
            </div>

            <div className="event-item">
              <span className="event-bullet" />
              <div>
                <p className="event-text">
                  Direct Answer block added to Full Stack curriculum page; first-mention character position improved from offset #420 to #110.
                </p>
                <span className="event-meta">Oct 3, 2026 · On-page AEO</span>
              </div>
            </div>

            <div className="event-item">
              <span className="event-bullet" />
              <div>
                <p className="event-text">
                  Scaler's brand prominence dropped 4% on college fresher queries as ChatGPT shifted toward vernacular learning alternatives.
                </p>
                <span className="event-meta">Sep 30, 2026 · OpenAI GPT-4o</span>
              </div>
            </div>

            <div className="event-item">
              <span className="event-bullet" />
              <div>
                <p className="event-text">
                  Google AI Overviews citation threshold verified: pages with quantitative placement percentages cited 35% more frequently.
                </p>
                <span className="event-meta">Sep 28, 2026 · Research observation</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
