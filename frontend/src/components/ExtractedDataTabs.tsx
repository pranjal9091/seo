import React, { useState } from 'react';
import {
  Bot,
  Code2,
  ListTree,
  FileText,
  Image as ImageIcon,
  Link as LinkIcon,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink
} from 'lucide-react';
import { ExtractedWebpageData } from '../types/audit';

interface ExtractedDataTabsProps {
  data: ExtractedWebpageData;
}

export const ExtractedDataTabs: React.FC<ExtractedDataTabsProps> = ({ data }) => {
  const [activeTab, setActiveTab] = useState<'aeo' | 'schema' | 'headings' | 'metadata' | 'media'>('aeo');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopyJson = (rawJson: string, index: number) => {
    navigator.clipboard.writeText(rawJson);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="inspector-card">
      <div className="inspector-nav-tabs">
        <button
          type="button"
          className={`nav-tab-btn ${activeTab === 'aeo' ? 'active' : ''}`}
          onClick={() => setActiveTab('aeo')}
        >
          <Bot size={15} />
          AEO & Answer-First
        </button>

        <button
          type="button"
          className={`nav-tab-btn ${activeTab === 'schema' ? 'active' : ''}`}
          onClick={() => setActiveTab('schema')}
        >
          <Code2 size={15} />
          Schema JSON-LD ({data.schemas.length})
        </button>

        <button
          type="button"
          className={`nav-tab-btn ${activeTab === 'headings' ? 'active' : ''}`}
          onClick={() => setActiveTab('headings')}
        >
          <ListTree size={15} />
          Headings Tree ({data.headings.length})
        </button>

        <button
          type="button"
          className={`nav-tab-btn ${activeTab === 'metadata' ? 'active' : ''}`}
          onClick={() => setActiveTab('metadata')}
        >
          <FileText size={15} />
          Meta & Directives
        </button>

        <button
          type="button"
          className={`nav-tab-btn ${activeTab === 'media' ? 'active' : ''}`}
          onClick={() => setActiveTab('media')}
        >
          <ImageIcon size={15} />
          Media & Links ({data.images.total_images} imgs / {data.links.total_links} links)
        </button>
      </div>

      {/* TAB 1: AEO & Answer-First */}
      {activeTab === 'aeo' && (
        <div>
          <div className="aeo-preview-box">
            <div className="aeo-preview-header">
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-emerald)', textTransform: 'uppercase' }}>
                Detected Direct Answer Block (Snippet Candidate)
              </span>
              <span className="badge-pill" style={{ background: 'var(--bg-subtle)' }}>
                {data.aeo.answer_word_count} words {data.aeo.is_optimal_length ? '(Optimal 40-65w)' : '(Sub-optimal)'}
              </span>
            </div>

            {data.aeo.direct_answer_candidate ? (
              <p className="aeo-preview-text">
                "{data.aeo.direct_answer_candidate}"
              </p>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                No concise direct answer block identified in opening paragraphs.
              </p>
            )}
          </div>

          <div className="aeo-stats-row">
            <div className="aeo-stat-card">
              <div className="aeo-stat-num">{data.aeo.question_headings_count}</div>
              <div className="aeo-stat-desc">Question-Led Headings (PAA Targets)</div>
            </div>

            <div className="aeo-stat-card">
              <div className="aeo-stat-num">{data.aeo.factual_numbers_count}</div>
              <div className="aeo-stat-desc">Statistical & Quantitative Data Markers</div>
            </div>

            <div className="aeo-stat-card">
              <div className="aeo-stat-num">
                {data.aeo.ordered_lists_count + data.aeo.unordered_lists_count}
              </div>
              <div className="aeo-stat-desc">Structured Lists (Steps & Key Points)</div>
            </div>

            <div className="aeo-stat-card">
              <div className="aeo-stat-num">{data.aeo.tables_count}</div>
              <div className="aeo-stat-desc">Comparison / Data Tables</div>
            </div>
          </div>

          {data.aeo.question_headings.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <span className="drawer-label" style={{ display: 'block', marginBottom: 8 }}>
                Detected Question Headings:
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {data.aeo.question_headings.map((qh, i) => (
                  <div key={i} style={{ padding: '8px 12px', background: 'var(--bg-subtle)', borderRadius: 4, fontSize: '0.82rem', fontFamily: 'var(--font-mono)' }}>
                    • {qh}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Schema JSON-LD */}
      {activeTab === 'schema' && (
        <div>
          {data.schemas.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              No JSON-LD structured data detected on this page.
            </p>
          ) : (
            data.schemas.map((s, idx) => (
              <div key={idx} className="schema-block-wrapper">
                <div className="schema-block-header">
                  <div className="schema-types-group">
                    {s.schema_types.map((t, ti) => (
                      <span key={ti} className="schema-type-pill">
                        @{t}
                      </span>
                    ))}
                    {s.is_valid_json ? (
                      <span className="badge-pill" style={{ background: 'var(--bg-emerald)', color: 'var(--color-emerald)' }}>
                        Valid JSON-LD
                      </span>
                    ) : (
                      <span className="badge-pill" style={{ background: 'var(--bg-rose)', color: 'var(--color-rose)' }}>
                        Syntax Error
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                    onClick={() => handleCopyJson(s.raw_json, idx)}
                  >
                    <Copy size={12} />
                    {copiedIndex === idx ? 'Copied' : 'Copy JSON'}
                  </button>
                </div>

                <pre className="schema-code-pre">
                  {s.parsed_content ? JSON.stringify(s.parsed_content, null, 2) : s.raw_json}
                </pre>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 3: Headings Tree */}
      {activeTab === 'headings' && (
        <div className="headings-tree-list">
          {data.headings.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              No H1, H2, or H3 headings detected.
            </p>
          ) : (
            data.headings.map((h, hi) => {
              const indent = (h.level - 1) * 20;
              return (
                <div key={hi} className="heading-tree-item" style={{ marginLeft: indent }}>
                  <span className={`heading-level-pill h${h.level}`}>H{h.level}</span>
                  <span style={{ color: 'var(--text-primary)', wordBreak: 'break-word' }}>{h.text}</span>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 4: Metadata & Directives */}
      {activeTab === 'metadata' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          <div style={{ background: 'var(--bg-subtle)', padding: 16, borderRadius: 'var(--radius-sm)' }}>
            <span className="drawer-label">Title Tag ({data.title_length} characters):</span>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
              {data.title || '[Missing Title]'}
            </p>
          </div>

          <div style={{ background: 'var(--bg-subtle)', padding: 16, borderRadius: 'var(--radius-sm)' }}>
            <span className="drawer-label">Meta Description ({data.meta_description_length} characters):</span>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
              {data.meta_description || '[Missing Meta Description]'}
            </p>
          </div>

          <div style={{ background: 'var(--bg-subtle)', padding: 16, borderRadius: 'var(--radius-sm)' }}>
            <span className="drawer-label">Canonical URL:</span>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-primary)', marginTop: 4, fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>
              {data.canonical_url || '[No Canonical Tag Found]'}
            </p>
            <div style={{ marginTop: 6, fontSize: '0.74rem', color: data.canonical_matches_final ? 'var(--color-emerald)' : 'var(--color-amber)' }}>
              {data.canonical_matches_final ? '✓ Self-referential canonical matches target' : '⚠ Canonical differs from target URL'}
            </div>
          </div>

          <div style={{ background: 'var(--bg-subtle)', padding: 16, borderRadius: 'var(--radius-sm)' }}>
            <span className="drawer-label">Directives & Crawl Flags:</span>
            <ul style={{ listStyle: 'none', marginTop: 6, fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <li>noindex: <strong style={{ color: data.directives.is_noindex ? 'var(--color-rose)' : 'var(--color-emerald)' }}>{String(data.directives.is_noindex)}</strong></li>
              <li>nofollow: <strong>{String(data.directives.is_nofollow)}</strong></li>
              <li>nosnippet: <strong style={{ color: data.directives.is_nosnippet ? 'var(--color-rose)' : 'var(--color-emerald)' }}>{String(data.directives.is_nosnippet)}</strong></li>
              <li>X-Robots-Tag: <code>{data.directives.x_robots_tag || 'none'}</code></li>
            </ul>
          </div>
        </div>
      )}

      {/* TAB 5: Media & Links */}
      {activeTab === 'media' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Images */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span className="drawer-label">Images Alt Status:</span>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {data.images.total_images} total / {data.images.missing_alt_count} missing alt
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
              {data.images.items_sample.slice(0, 6).map((img, idx) => (
                <div key={idx} style={{ background: 'var(--bg-subtle)', padding: 10, borderRadius: 4, fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                  <div style={{ color: img.has_alt ? 'var(--color-emerald)' : 'var(--color-rose)', marginBottom: 4 }}>
                    {img.has_alt ? '✓ alt="' + (img.alt || '') + '"' : '✕ Missing alt attribute'}
                  </div>
                  <div style={{ color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {img.src}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Links */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span className="drawer-label">Link Profile Distribution:</span>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {data.links.internal_links} Internal / {data.links.external_links} External
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
              {data.links.samples.slice(0, 6).map((lnk, idx) => (
                <div key={idx} style={{ background: 'var(--bg-subtle)', padding: 10, borderRadius: 4, fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                  <div style={{ color: lnk.is_external ? 'var(--color-cyan)' : 'var(--text-primary)', marginBottom: 2 }}>
                    [{lnk.is_external ? 'External' : 'Internal'}] "{lnk.text}"
                  </div>
                  <div style={{ color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {lnk.href}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
