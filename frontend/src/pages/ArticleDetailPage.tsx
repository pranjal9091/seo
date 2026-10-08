import React, { useState, useEffect } from 'react';
import { ContentArticleDetail, Article360LoopResponse } from '../types/audit';
import { getContentArticleDetail, getArticle360Loop } from '../services/api';
import { trackPageView, trackArticleView, trackScrollDepth, trackInternalLinkClick } from '../services/ga4';

interface ArticleDetailPageProps {
  slug: string;
  onNavigateHome?: () => void;
  onNavigateArticle?: (slug: string) => void;
  onBack?: () => void;
}

export const ArticleDetailPage: React.FC<ArticleDetailPageProps> = ({
  slug,
  onNavigateHome,
  onNavigateArticle,
  onBack
}) => {
  const handleGoBack = onBack || onNavigateHome || (() => {});
  const [article, setArticle] = useState<ContentArticleDetail | null>(null);
  const [measurementLoop, setMeasurementLoop] = useState<Article360LoopResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Panels
  const [showSchemaDrawer, setShowSchemaDrawer] = useState<boolean>(false);
  const [showMeasurementLoop, setShowMeasurementLoop] = useState<boolean>(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setErrorMessage(null);

    Promise.all([
      getContentArticleDetail(slug),
      getArticle360Loop(slug).catch(() => null)
    ])
      .then(([artData, loopData]) => {
        setArticle(artData);
        setMeasurementLoop(loopData);
        // Track GA4 page & article views
        trackPageView(`/content/${slug}`, artData.title);
        trackArticleView(slug, artData.title, artData.primary_topic);
      })
      .catch((err) => {
        setErrorMessage(err.message || 'Article not found');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [slug]);

  // Track scroll depth (25%, 50%, 75%, 100%)
  useEffect(() => {
    const trackedDepths = new Set<number>();
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight <= 0) return;
      const scrollPercent = Math.round((window.scrollY / scrollHeight) * 100);

      [25, 50, 75, 100].forEach((depth) => {
        if (scrollPercent >= depth && !trackedDepths.has(depth)) {
          trackedDepths.add(depth);
          trackScrollDepth(depth, slug);
        }
      });
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [slug]);

  const handleCopySchema = (jsonContent: any) => {
    navigator.clipboard.writeText(JSON.stringify(jsonContent, null, 2));
    setCopyFeedback('JSON-LD copied to clipboard!');
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  const handleInternalLinkClick = (targetSlug: string, anchor: string) => {
    trackInternalLinkClick(slug, targetSlug, anchor);
    onNavigateArticle?.(targetSlug);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (isLoading) {
    return (
      <div className="panel" style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
        Loading publication document...
      </div>
    );
  }

  if (errorMessage || !article) {
    return (
      <div className="panel" style={{ textAlign: 'center', padding: 60 }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', color: 'var(--text-ink)', marginBottom: 8 }}>
          404 — Article Not Found
        </h2>
        <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginBottom: 20 }}>
          The requested article slug <code>{slug}</code> does not exist or has been archived.
        </p>
        <button type="button" className="btn btn-teal" onClick={handleGoBack}>
          ← Back to Content Hub
        </button>
      </div>
    );
  }

  // Simple clean markdown paragraph formatter
  const renderFormattedContent = (md: string) => {
    const lines = md.split('\n');
    const elements: React.ReactNode[] = [];
    let tableBuffer: string[] = [];

    const flushTable = (keyIndex: number) => {
      if (tableBuffer.length === 0) return;
      const rows = tableBuffer.filter((r) => r.trim().startsWith('|'));
      if (rows.length >= 2) {
        const headerCells = rows[0].split('|').map((c) => c.trim()).filter(Boolean);
        const bodyRows = rows.slice(2).map((r) => r.split('|').map((c) => c.trim()).filter(Boolean));
        elements.push(
          <div key={`table-${keyIndex}`} className="data-table-wrapper" style={{ margin: '20px 0' }}>
            <table className="data-table">
              <thead>
                <tr>
                  {headerCells.map((h, i) => (
                    <th key={i}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bodyRows.map((r, ri) => (
                  <tr key={ri}>
                    {r.map((cell, ci) => (
                      <td key={ci}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      tableBuffer = [];
    };

    lines.forEach((line, idx) => {
      const trimmed = line.trim();

      if (trimmed.startsWith('|')) {
        tableBuffer.push(trimmed);
        return;
      } else {
        flushTable(idx);
      }

      if (trimmed.startsWith('# ')) {
        // Skip H1 since it is rendered prominently in document header
        return;
      } else if (trimmed.startsWith('## ')) {
        elements.push(
          <h2 key={idx} style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', fontWeight: 600, color: 'var(--text-ink)', marginTop: 32, marginBottom: 12 }}>
            {trimmed.slice(3)}
          </h2>
        );
      } else if (trimmed.startsWith('### ')) {
        elements.push(
          <h3 key={idx} style={{ fontFamily: 'var(--font-sans)', fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-ink)', marginTop: 22, marginBottom: 8 }}>
            {trimmed.slice(4)}
          </h3>
        );
      } else if (trimmed.startsWith('> **Direct Answer**:')) {
        // Handled via standalone pullquote below
        return;
      } else if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
        elements.push(
          <li key={idx} style={{ fontSize: '0.92rem', color: 'var(--text-ink)', marginLeft: 24, marginBottom: 6, lineHeight: 1.6 }}>
            {trimmed.slice(2)}
          </li>
        );
      } else if (/^\d+\.\s+/.test(trimmed)) {
        elements.push(
          <li key={idx} style={{ fontSize: '0.92rem', color: 'var(--text-ink)', marginLeft: 24, marginBottom: 6, lineHeight: 1.6 }}>
            {trimmed.replace(/^\d+\.\s+/, '')}
          </li>
        );
      } else if (trimmed.length > 0) {
        elements.push(
          <p key={idx} style={{ fontSize: '0.94rem', color: 'var(--text-ink)', lineHeight: 1.7, marginBottom: 16 }}>
            {trimmed}
          </p>
        );
      }
    });

    flushTable(lines.length);
    return elements;
  };

  return (
    <article className="article-reader-container" style={{ maxWidth: 840, margin: '0 auto', paddingBottom: 60 }}>
      {/* Top Utility Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <button
          type="button"
          className="btn btn-ghost"
          style={{ padding: '4px 10px', fontSize: '0.78rem' }}
          onClick={handleGoBack}
        >
          ← Content Hub
        </button>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ padding: '4px 10px', fontSize: '0.76rem' }}
            onClick={() => setShowSchemaDrawer(true)}
          >
            📋 View Structured Data (JSON-LD)
          </button>
          <button
            type="button"
            className="btn btn-teal"
            style={{ padding: '4px 12px', fontSize: '0.76rem' }}
            onClick={() => setShowMeasurementLoop(true)}
          >
            ⚡ 360° Measurement Loop
          </button>
        </div>
      </div>

      {/* Article Publication Header */}
      <header style={{ marginBottom: 28, paddingBottom: 20, borderBottom: '1px solid var(--border-hairline)' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', padding: '2px 6px', background: 'var(--accent-subtle)', color: 'var(--accent)', borderRadius: 'var(--radius-sm)', fontWeight: 600 }}>
            {article.primary_topic}
          </span>
          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
            Intent: <strong>{article.intent}</strong> • {article.reading_time_min} min read
          </span>
          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginLeft: 'auto', fontFamily: 'var(--font-mono)' }}>
            Canonical: {article.canonical_url}
          </span>
        </div>

        <h1
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '2.1rem',
            fontWeight: 600,
            lineHeight: 1.25,
            color: 'var(--text-ink)',
            letterSpacing: '-0.02em',
            marginBottom: 14
          }}
        >
          {article.title}
        </h1>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
          <div>
            By <strong>{article.author}</strong> • Published {article.published_at ? new Date(article.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Draft'}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--status-green)' }}>
            ✓ Verified Schema.org & AEO Optimized
          </div>
        </div>
      </header>

      {/* 40-60 Word Direct Answer Block (Pullquote) */}
      {article.direct_answer_block && (
        <section
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--accent-border)',
            borderLeft: '4px solid var(--accent)',
            padding: '18px 22px',
            borderRadius: 'var(--radius)',
            marginBottom: 32,
            boxShadow: '0 2px 8px rgba(15, 107, 92, 0.05)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <span style={{ color: 'var(--accent)', fontSize: '0.9rem' }}>💡</span>
            <span style={{ fontSize: '0.74rem', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Direct Answer (40–60 Word AEO Snippet Candidate)
            </span>
          </div>
          <p style={{ fontSize: '0.96rem', color: 'var(--text-ink)', lineHeight: 1.6, fontWeight: 500 }}>
            {article.direct_answer_block}
          </p>
        </section>
      )}

      {/* Main Body Content */}
      <section style={{ backgroundColor: '#FFFFFF', padding: '36px 40px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-hairline)', boxShadow: 'var(--shadow-sm)', marginBottom: 32 }}>
        {renderFormattedContent(article.content_markdown)}
      </section>

      {/* Frequently Asked Questions Section */}
      {article.faqs && article.faqs.length > 0 && (
        <section style={{ backgroundColor: '#FFFFFF', padding: '32px 36px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-hairline)', boxShadow: 'var(--shadow-sm)', marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', color: 'var(--text-ink)' }}>
              Frequently Asked Questions
            </h2>
            <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--accent)', background: 'var(--accent-subtle)', padding: '2px 6px', borderRadius: 'var(--radius-sm)' }}>
              Schema: FAQPage Valid
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {article.faqs.map((faq, fIdx) => (
              <div
                key={fIdx}
                style={{
                  border: '1px solid var(--border-hairline)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '14px 16px',
                  backgroundColor: 'var(--bg-subtle)'
                }}
              >
                <h3 style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-ink)', marginBottom: 6 }}>
                  Q: {faq.question}
                </h3>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Contextual Internal Link Recommendations */}
      {article.internal_links && article.internal_links.length > 0 && (
        <section style={{ backgroundColor: '#FFFFFF', padding: '24px 28px', borderRadius: 'var(--radius)', border: '1px solid var(--border-hairline)', marginBottom: 32 }}>
          <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-ink)', marginBottom: 12 }}>
            Connected Reading & Internal Resources
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {article.internal_links.map((link, lIdx) => (
              <button
                key={lIdx}
                type="button"
                onClick={() => handleInternalLinkClick(link.target_slug, link.anchor_text)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  border: '1px solid var(--border-hairline)',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-canvas)',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <span style={{ fontSize: '0.84rem', fontWeight: 500, color: 'var(--accent)' }}>
                  📖 {link.anchor_text}
                </span>
                <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                  /content/{link.target_slug} →
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* STRUCTURED DATA (JSON-LD) MODAL / DRAWER */}
      {showSchemaDrawer && (
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
              maxWidth: 720,
              maxHeight: '85vh',
              overflowY: 'auto',
              padding: 24,
              boxShadow: '0 12px 30px rgba(0,0,0,0.12)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', color: 'var(--text-ink)' }}>
                  Structured Data (Schema.org JSON-LD)
                </h3>
                <div style={{ fontSize: '0.76rem', color: 'var(--status-green)' }}>
                  ✓ {article.structured_data.notes}
                </div>
              </div>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowSchemaDrawer(false)}
              >
                ✕ Close
              </button>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>1. Article Schema:</span>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ padding: '2px 8px', fontSize: '0.72rem' }}
                  onClick={() => handleCopySchema(article.structured_data.article)}
                >
                  Copy Article JSON-LD
                </button>
              </div>
              <pre
                style={{
                  backgroundColor: '#1C1B19',
                  color: '#FAF9F6',
                  padding: 14,
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  fontFamily: 'var(--font-mono)',
                  overflowX: 'auto',
                  maxHeight: 220
                }}
              >
                {JSON.stringify(article.structured_data.article, null, 2)}
              </pre>
            </div>

            {article.structured_data.faq && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>2. FAQPage Schema:</span>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ padding: '2px 8px', fontSize: '0.72rem' }}
                    onClick={() => handleCopySchema(article.structured_data.faq)}
                  >
                    Copy FAQ JSON-LD
                  </button>
                </div>
                <pre
                  style={{
                    backgroundColor: '#1C1B19',
                    color: '#FAF9F6',
                    padding: 14,
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.75rem',
                    fontFamily: 'var(--font-mono)',
                    overflowX: 'auto',
                    maxHeight: 220
                  }}
                >
                  {JSON.stringify(article.structured_data.faq, null, 2)}
                </pre>
              </div>
            )}

            {copyFeedback && (
              <div style={{ padding: 8, backgroundColor: 'var(--status-green-bg)', color: 'var(--status-green)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', textAlign: 'center' }}>
                {copyFeedback}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 360° CONTENT-TO-MEASUREMENT LOOP MODAL */}
      {showMeasurementLoop && measurementLoop && (
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
              maxWidth: 780,
              maxHeight: '85vh',
              overflowY: 'auto',
              padding: 24,
              boxShadow: '0 12px 30px rgba(0,0,0,0.12)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', color: 'var(--text-ink)' }}>
                  360° Content → Measurement Loop
                </h3>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                  Independent measurement channels without fabricated ranking claims.
                </div>
              </div>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowMeasurementLoop(false)}
              >
                ✕ Close
              </button>
            </div>

            {/* Loop Channels Grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Channel 1: Content Optimization */}
              <div style={{ border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-sm)', padding: 14, backgroundColor: 'var(--bg-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <strong style={{ fontSize: '0.84rem' }}>1. Internal SEO & AEO Score:</strong>
                  <span style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', fontWeight: 600, color: 'var(--accent)' }}>
                    {measurementLoop.content_optimization.seo_aeo_score}/100
                  </span>
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                  Technical: {measurementLoop.content_optimization.readiness.technical_readiness}% • On-Page: {measurementLoop.content_optimization.readiness.onpage_readiness}% • Answer: {measurementLoop.content_optimization.readiness.answer_readiness}% • Schema: {measurementLoop.content_optimization.readiness.structured_data_readiness}%
                </div>
              </div>

              {/* Channel 2: Schema.org Validation */}
              <div style={{ border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-sm)', padding: 14, backgroundColor: '#FFFFFF' }}>
                <strong style={{ fontSize: '0.84rem', display: 'block', marginBottom: 4 }}>2. Structured Data Integration:</strong>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                  Article: <strong style={{ color: 'var(--status-green)' }}>{measurementLoop.schema_status.article_schema}</strong> | FAQPage: <strong style={{ color: 'var(--status-green)' }}>{measurementLoop.schema_status.faq_schema}</strong>
                </div>
              </div>

              {/* Channel 3: Google Search Console (Organic Demand) */}
              <div style={{ border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-sm)', padding: 14, backgroundColor: '#FFFFFF' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <strong style={{ fontSize: '0.84rem' }}>3. Google Search Console (Measured Demand):</strong>
                  <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', padding: '2px 6px', background: measurementLoop.google_search_console.status === 'Not measured yet' ? 'var(--bg-subtle)' : 'var(--status-green-bg)', color: measurementLoop.google_search_console.status === 'Not measured yet' ? 'var(--text-muted)' : 'var(--status-green)', borderRadius: 'var(--radius-sm)' }}>
                    {measurementLoop.google_search_console.status}
                  </span>
                </div>
                {measurementLoop.google_search_console.metrics ? (
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-ink)', fontFamily: 'var(--font-mono)' }}>
                    Clicks: {measurementLoop.google_search_console.metrics.clicks} | Impressions: {measurementLoop.google_search_console.metrics.impressions} | Weighted CTR: {(measurementLoop.google_search_console.metrics.weighted_ctr * 100).toFixed(1)}% | Avg Pos: {measurementLoop.google_search_console.metrics.average_position}
                  </div>
                ) : (
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    No matching Search Console CSV export has been uploaded for this URL or target query yet.
                  </div>
                )}
              </div>

              {/* Channel 4: Google Analytics 4 (On-Site Usage) */}
              <div style={{ border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-sm)', padding: 14, backgroundColor: '#FFFFFF' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <strong style={{ fontSize: '0.84rem' }}>4. Google Analytics 4 (Measured Usage):</strong>
                  <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', padding: '2px 6px', background: measurementLoop.google_analytics_4.status === 'Not measured yet' ? 'var(--bg-subtle)' : 'var(--status-green-bg)', color: measurementLoop.google_analytics_4.status === 'Not measured yet' ? 'var(--text-muted)' : 'var(--status-green)', borderRadius: 'var(--radius-sm)' }}>
                    {measurementLoop.google_analytics_4.status}
                  </span>
                </div>
                {measurementLoop.google_analytics_4.metrics ? (
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-ink)', fontFamily: 'var(--font-mono)' }}>
                    Views: {measurementLoop.google_analytics_4.metrics.views} | Users: {measurementLoop.google_analytics_4.metrics.users} | Sessions: {measurementLoop.google_analytics_4.metrics.sessions} | Engagement: {(measurementLoop.google_analytics_4.metrics.engagement_rate * 100).toFixed(1)}% | Conversions: {measurementLoop.google_analytics_4.metrics.conversions}
                  </div>
                ) : (
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    No GA4 dataset matching path <code>/content/{article.slug}</code> imported yet.
                  </div>
                )}
              </div>

              {/* Channel 5: Generative Engine Optimization (AI Visibility) */}
              <div style={{ border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-sm)', padding: 14, backgroundColor: '#FFFFFF' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <strong style={{ fontSize: '0.84rem' }}>5. Generative AI Visibility (LLM Observations):</strong>
                  <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', padding: '2px 6px', background: measurementLoop.ai_search_visibility.status === 'Not measured yet' ? 'var(--bg-subtle)' : 'var(--accent-subtle)', color: measurementLoop.ai_search_visibility.status === 'Not measured yet' ? 'var(--text-muted)' : 'var(--accent)', borderRadius: 'var(--radius-sm)' }}>
                    {measurementLoop.ai_search_visibility.status}
                  </span>
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                  Tracks empirical citations and brand mentions across ChatGPT, Perplexity, and Gemini without simulating artificial ranks.
                </div>
              </div>
            </div>

            <div style={{ marginTop: 20, padding: 10, backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              *Notice: {measurementLoop.methodology_notice}
            </div>
          </div>
        </div>
      )}
    </article>
  );
};
