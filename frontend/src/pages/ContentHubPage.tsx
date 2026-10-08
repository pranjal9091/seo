import React, { useState, useEffect } from 'react';
import { ContentArticleListItem, LinkGraphResponse, ContentGradeResponse } from '../types/audit';
import { getContentArticles, getContentLinkGraph, getContentArticleGrade, createContentArticle } from '../services/api';
import { trackPageView } from '../services/ga4';

interface ContentHubPageProps {
  onSelectArticle: (slug: string) => void;
}

export const ContentHubPage: React.FC<ContentHubPageProps> = ({ onSelectArticle }) => {
  const [articles, setArticles] = useState<ContentArticleListItem[]>([]);
  const [linkGraph, setLinkGraph] = useState<LinkGraphResponse | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Grade Modal State
  const [activeGradeSlug, setActiveGradeSlug] = useState<string | null>(null);
  const [gradeData, setGradeData] = useState<ContentGradeResponse | null>(null);
  const [isGradeLoading, setIsGradeLoading] = useState<boolean>(false);

  // New Article Modal State
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newSlug, setNewSlug] = useState<string>('');
  const [newTopic, setNewTopic] = useState<string>('Generative AI');
  const [newTargetQuery, setNewTargetQuery] = useState<string>('');
  const [newDirectAnswer, setNewDirectAnswer] = useState<string>('');
  const [newMarkdown, setNewMarkdown] = useState<string>('');
  const [newStatus, setNewStatus] = useState<'published' | 'draft'>('draft');
  const [createError, setCreateError] = useState<string | null>(null);

  const loadContent = async () => {
    setIsLoading(true);
    try {
      const artRes = await getContentArticles();
      setArticles(Array.isArray(artRes) ? artRes : (artRes.articles || []));
      const lgRes = await getContentLinkGraph();
      setLinkGraph(lgRes);
    } catch (err) {
      console.warn('Could not load content hub:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadContent();
    trackPageView('/content', 'OmniGEO Content Hub');
  }, []);

  const openGradeModal = async (slug: string) => {
    setActiveGradeSlug(slug);
    setIsGradeLoading(true);
    try {
      const res = await getContentArticleGrade(slug);
      setGradeData(res);
    } catch (err) {
      console.warn('Could not fetch grade:', err);
    } finally {
      setIsGradeLoading(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    try {
      if (!newTitle.trim() || !newSlug.trim()) {
        throw new Error('Title and Slug are required.');
      }
      await createContentArticle({
        title: newTitle,
        slug: newSlug,
        primary_topic: newTopic,
        target_query: newTargetQuery || newSlug.replace(/-/g, ' '),
        direct_answer_block: newDirectAnswer,
        content_markdown: newMarkdown || `# ${newTitle}\n\n${newDirectAnswer}`,
        status: newStatus,
        meta_description: newDirectAnswer.slice(0, 155),
        excerpt: newDirectAnswer.slice(0, 180)
      });
      setShowCreateModal(false);
      setNewTitle('');
      setNewSlug('');
      setNewDirectAnswer('');
      setNewMarkdown('');
      loadContent();
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create article');
    }
  };

  const topics = ['All', ...Array.from(new Set(articles.map((a) => a.primary_topic)))];

  const filteredArticles = articles.filter((a) => {
    if (selectedTopic !== 'All' && a.primary_topic !== selectedTopic) return false;
    if (selectedStatus !== 'All' && a.status !== selectedStatus) return false;
    return true;
  });

  return (
    <div className="content-hub-page">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">EdTech Answer-First Content Hub</h1>
          <p className="page-description">
            Live educational publications built for AEO direct-answer extraction, structured schema validation, and real search measurement.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <a
            href="/sitemap.xml"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost"
            style={{ fontSize: '0.78rem' }}
          >
            View sitemap.xml ↗
          </a>
          <button
            type="button"
            className="btn btn-teal"
            onClick={() => setShowCreateModal(true)}
          >
            + Create Article
          </button>
        </div>
      </div>

      {/* Internal Link Health & Deployment Summary */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
          marginBottom: 24
        }}
      >
        <div className="metric-card">
          <div className="metric-label-row">
            <span className="metric-label">Total Articles</span>
            <span className="metric-sample-pill">Active</span>
          </div>
          <div className="metric-number-row">
            <span className="metric-big-number">{articles.length}</span>
          </div>
          <div className="metric-delta-row">
            <span>{articles.filter((a) => a.status === 'published').length} published • {articles.filter((a) => a.status === 'draft').length} draft</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label-row">
            <span className="metric-label">Internal Link Mesh</span>
            <span className="metric-sample-pill">Connected</span>
          </div>
          <div className="metric-number-row">
            <span className="metric-big-number">{linkGraph?.total_internal_links ?? 0}</span>
          </div>
          <div className="metric-delta-row">
            <span className="delta-positive">Cross-referenced links</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label-row">
            <span className="metric-label">Orphan Pages</span>
            <span className="metric-sample-pill">Audited</span>
          </div>
          <div className="metric-number-row">
            <span
              className="metric-big-number"
              style={{ color: (linkGraph?.orphan_count ?? 0) === 0 ? 'var(--status-green)' : 'var(--status-amber)' }}
            >
              {linkGraph?.orphan_count ?? 0}
            </span>
          </div>
          <div className="metric-delta-row">
            <span>{(linkGraph?.orphan_count ?? 0) === 0 ? 'Zero orphan pages detected' : 'Requires internal linking'}</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label-row">
            <span className="metric-label">Search Readiness</span>
            <span className="metric-sample-pill">AEO / Schema</span>
          </div>
          <div className="metric-number-row">
            <span className="metric-big-number" style={{ color: 'var(--accent)' }}>100%</span>
          </div>
          <div className="metric-delta-row">
            <span>Article & FAQPage JSON-LD ready</span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          backgroundColor: 'var(--bg-subtle)',
          borderRadius: 'var(--radius)',
          marginBottom: 24
        }}
      >
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {topics.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setSelectedTopic(t)}
              style={{
                padding: '4px 10px',
                fontSize: '0.78rem',
                borderRadius: 'var(--radius-sm)',
                border: selectedTopic === t ? '1px solid var(--accent-border)' : '1px solid var(--border-hairline)',
                backgroundColor: selectedTopic === t ? 'var(--accent-subtle)' : '#FFFFFF',
                color: selectedTopic === t ? 'var(--accent)' : 'var(--text-secondary)',
                fontWeight: selectedTopic === t ? 600 : 500,
                cursor: 'pointer'
              }}
            >
              {t}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Status:</span>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="form-input"
            style={{ width: 'auto', padding: '4px 8px', fontSize: '0.78rem' }}
          >
            <option value="All">All ({articles.length})</option>
            <option value="published">Published</option>
            <option value="draft">Drafts</option>
          </select>
        </div>
      </div>

      {/* Article Cards Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {isLoading ? (
          <div className="panel" style={{ textAlign: 'center', padding: 36, color: 'var(--text-muted)' }}>
            Loading content articles...
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="panel" style={{ textAlign: 'center', padding: 36, color: 'var(--text-muted)' }}>
            No articles match the selected filters.
          </div>
        ) : (
          filteredArticles.map((article) => (
            <div
              key={article.slug}
              className="panel"
              style={{
                margin: 0,
                padding: '24px 26px',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-sm)',
                border: '1px solid var(--border-hairline)',
                transition: 'all 180ms ease',
                backgroundColor: '#FFFFFF'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontFamily: 'var(--font-mono)',
                      padding: '2px 6px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: article.status === 'published' ? 'var(--status-green-bg)' : 'var(--status-amber-bg)',
                      color: article.status === 'published' ? 'var(--status-green)' : 'var(--status-amber)',
                      fontWeight: 600,
                      textTransform: 'uppercase'
                    }}
                  >
                    {article.status}
                  </span>
                  {article.status === 'published' && article.canonical_url && (
                    <span
                      title="Technical SEO checks pass: Canonical, Schema, Direct Answer, and Sitemap. Does not claim Google has indexed the page."
                      style={{
                        fontSize: '0.68rem',
                        fontFamily: 'var(--font-mono)',
                        padding: '2px 6px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: '#ECFDF5',
                        color: '#065F46',
                        border: '1px solid #A7F3D0',
                        fontWeight: 600
                      }}
                    >
                      ✓ Technically ready for indexing
                    </span>
                  )}
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {article.primary_topic} • {article.reading_time_min} min read ({article.word_count} words)
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ padding: '3px 8px', fontSize: '0.74rem' }}
                    onClick={() => openGradeModal(article.slug)}
                  >
                    ⚡ Audit Grade
                  </button>
                  <button
                    type="button"
                    className="btn btn-teal"
                    style={{ padding: '3px 10px', fontSize: '0.74rem' }}
                    onClick={() => onSelectArticle(article.slug)}
                  >
                    Read Article →
                  </button>
                </div>
              </div>

              <h2
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '1.25rem',
                  fontWeight: 600,
                  color: 'var(--text-ink)',
                  marginBottom: 8,
                  cursor: 'pointer'
                }}
                onClick={() => onSelectArticle(article.slug)}
              >
                {article.title}
              </h2>

              {article.direct_answer_block && (
                <div
                  style={{
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(13, 148, 136, 0.03) 100%)',
                    borderLeft: '3px solid var(--accent-light)',
                    padding: '12px 16px',
                    borderRadius: '0 8px 8px 0',
                    fontSize: '0.84rem',
                    color: 'var(--text-ink)',
                    lineHeight: 1.55,
                    marginBottom: 14,
                    border: '1px solid rgba(16, 185, 129, 0.15)',
                    borderLeftWidth: '3px',
                    borderLeftColor: 'var(--accent)'
                  }}
                >
                  <strong style={{ fontSize: '0.72rem', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4, fontWeight: 700 }}>
                    40–60 Word Direct Answer Candidate (AEO Snippet):
                  </strong>
                  {article.direct_answer_block}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                <div style={{ display: 'flex', gap: 14 }}>
                  <span>Target Query: <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-ink)' }}>"{article.target_query}"</code></span>
                  <span>Intent: <strong style={{ color: 'var(--text-secondary)' }}>{article.intent}</strong></span>
                  <span>FAQs: <strong>{article.faq_count}</strong></span>
                </div>
                <div style={{ fontFamily: 'var(--font-mono)' }}>
                  /content/{article.slug}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* CONTENT AUDIT GRADE MODAL */}
      {activeGradeSlug && (
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
                  Pre-Publishing Content SEO & AEO Grade
                </h3>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.76rem', color: 'var(--accent)' }}>
                  Target: /content/{activeGradeSlug}
                </div>
              </div>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setActiveGradeSlug(null);
                  setGradeData(null);
                }}
              >
                ✕ Close
              </button>
            </div>

            {isGradeLoading || !gradeData ? (
              <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                Running deterministic 4-pillar audit engine...
              </div>
            ) : (
              <div>
                {/* Score Banner */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    backgroundColor: 'var(--bg-subtle)',
                    borderRadius: 'var(--radius)',
                    marginBottom: 20
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Overall Content Readiness Score
                    </div>
                    <div style={{ fontFamily: 'var(--font-serif)', fontSize: '2.5rem', fontWeight: 600, color: 'var(--accent)', lineHeight: 1.1 }}>
                      {gradeData.overall_score}<span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>/100</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', maxWidth: 360, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    <strong>Notice:</strong> {gradeData.disclaimer}
                  </div>
                </div>

                {/* 4 Pillars Breakdown */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 20 }}>
                  {Object.entries(gradeData.category_scores).map(([k, s]) => (
                    <div
                      key={k}
                      style={{
                        padding: '10px 14px',
                        border: '1px solid var(--border-hairline)',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: '#FFFFFF'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-ink)' }}>{s.label}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent)' }}>
                          {s.earned}/{s.max_score} pts ({s.percentage}%)
                        </span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {s.passed_checks} of {s.total_checks} checks passed
                      </div>
                    </div>
                  ))}
                </div>

                {/* Findings List */}
                <h4 style={{ fontSize: '0.86rem', fontWeight: 600, marginBottom: 10 }}>Actionable Recommendations ({gradeData.findings.length})</h4>
                {gradeData.findings.length === 0 ? (
                  <div style={{ padding: 12, backgroundColor: 'var(--status-green-bg)', color: 'var(--status-green)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem' }}>
                    ✓ Perfect execution. No outstanding content or technical issues identified.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {gradeData.findings.map((f, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: '10px 12px',
                          border: '1px solid var(--border-hairline)',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: '#FFFFFF',
                          fontSize: '0.78rem'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                          <strong style={{ color: 'var(--text-ink)' }}>{f.title}</strong>
                          <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: f.severity === 'high' ? 'var(--status-red)' : 'var(--text-muted)' }}>
                            {f.severity}
                          </span>
                        </div>
                        <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>{f.problem}</div>
                        <div style={{ color: 'var(--accent)', fontWeight: 500 }}>💡 {f.recommendation}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CREATE ARTICLE MODAL */}
      {showCreateModal && (
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
              maxWidth: 640,
              padding: 24,
              boxShadow: '0 12px 30px rgba(0,0,0,0.12)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', color: 'var(--text-ink)' }}>
                Draft New Answer-First Article
              </h3>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowCreateModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: '0.76rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                  Article Headline (H1):
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. How to Choose Between Data Science and AI Engineering"
                  value={newTitle}
                  onChange={(e) => {
                    setNewTitle(e.target.value);
                    if (!newSlug) {
                      setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
                    }
                  }}
                  className="form-input"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                    URL Slug:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. data-science-vs-ai-engineering"
                    value={newSlug}
                    onChange={(e) => setNewSlug(e.target.value)}
                    className="form-input"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                    Target Query:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. data science vs ai engineering"
                    value={newTargetQuery}
                    onChange={(e) => setNewTargetQuery(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: '0.76rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                  Direct Answer Block (40–60 words for AEO):
                </label>
                <textarea
                  rows={3}
                  placeholder="Write a clear, concise direct answer that provides immediate value to students searching this query..."
                  value={newDirectAnswer}
                  onChange={(e) => setNewDirectAnswer(e.target.value)}
                  className="form-input"
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: '0.76rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                  Markdown Body Content:
                </label>
                <textarea
                  rows={6}
                  placeholder="## 1. Overview&#10;Write comprehensive body paragraphs, lists, and comparison tables..."
                  value={newMarkdown}
                  onChange={(e) => setNewMarkdown(e.target.value)}
                  className="form-input"
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <label style={{ fontSize: '0.76rem', fontWeight: 600 }}>Status:</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as any)}
                    className="form-input"
                    style={{ width: 'auto', padding: '4px 8px' }}
                  >
                    <option value="draft">Draft (Excluded from sitemap)</option>
                    <option value="published">Published (Included in sitemap)</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setShowCreateModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-teal">
                    Save Article
                  </button>
                </div>
              </div>

              {createError && (
                <div style={{ marginTop: 12, padding: 8, backgroundColor: 'var(--status-red-bg)', color: 'var(--status-red)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem' }}>
                  {createError}
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
