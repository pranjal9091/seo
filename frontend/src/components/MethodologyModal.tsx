import React from 'react';
import { X, ShieldCheck, Zap, FileText, Bot, Code2, AlertCircle } from 'lucide-react';

interface MethodologyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MethodologyModal: React.FC<MethodologyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ShieldCheck size={20} color="var(--accent-gold)" />
            <h3>OmniGEO Scoring Methodology & Ruleset v1.0</h3>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          <div style={{ background: 'var(--bg-subtle)', padding: 14, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
            <strong style={{ color: 'var(--text-primary)' }}>Honesty & Scientific Grounding:</strong>
            <p style={{ marginTop: 4 }}>
              OmniGEO calculates a deterministic, rule-based 0–100 score based on established Technical SEO specifications, W3C standards, and peer-reviewed Generative Engine Optimization (GEO) benchmarks. It is strictly NOT a Google proprietary ranking score, nor does it simulate undocumented algorithm black-boxes.
            </p>
          </div>

          <div>
            <h4 style={{ color: 'var(--text-primary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Zap size={15} color="var(--color-emerald)" />
              1. Technical Foundation (25 Points Max)
            </h4>
            <ul style={{ paddingLeft: 18, lineHeight: 1.6 }}>
              <li><strong>TECH-01 (8 pts):</strong> HTTP Status Code. Requires 200 OK. 3xx redirects penalized; 4xx/5xx errors award 0 pts.</li>
              <li><strong>TECH-02 (5 pts):</strong> Initial Server Response Latency. Optimal TTFB &lt;600ms (5 pts), 600-1500ms (3.5 pts), &gt;1500ms (1 pt).</li>
              <li><strong>TECH-03 (6 pts):</strong> Canonical Tag Implementation. Full credit for self-referential canonical tags matching the final URL.</li>
              <li><strong>TECH-04 (6 pts):</strong> Indexability &amp; Directives. Checks for conflicting <code>noindex</code> and <code>nosnippet</code> directives.</li>
            </ul>
          </div>

          <div>
            <h4 style={{ color: 'var(--text-primary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <FileText size={15} color="var(--accent-gold)" />
              2. On-Page &amp; Architecture (25 Points Max)
            </h4>
            <ul style={{ paddingLeft: 18, lineHeight: 1.6 }}>
              <li><strong>ONPAGE-01 (7 pts):</strong> Title Tag Optimization. Optimal SERP display length is 40–65 characters. Short (&lt;40) or long (&gt;65) penalized.</li>
              <li><strong>ONPAGE-02 (6 pts):</strong> Meta Description. Optimal SERP snippet display is 120–165 characters. Missing descriptions award 0 pts.</li>
              <li><strong>ONPAGE-03 (6 pts):</strong> Heading 1 Hierarchy. Evaluates exactly one primary semantic <code>&lt;h1&gt;</code> per document.</li>
              <li><strong>ONPAGE-04 (6 pts):</strong> Image Accessibility. 100% of images must contain informative alt attributes.</li>
            </ul>
          </div>

          <div>
            <h4 style={{ color: 'var(--text-primary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Bot size={15} color="var(--color-cyan)" />
              3. AEO &amp; Answer Readiness (30 Points Max)
            </h4>
            <ul style={{ paddingLeft: 18, lineHeight: 1.6 }}>
              <li><strong>AEO-01 (10 pts):</strong> Direct Answer Snippet Block. Tests for a concise 40–65 word definitive answer paragraph near the top of the content (Google Featured Snippet / Perplexity target).</li>
              <li><strong>AEO-02 (7 pts):</strong> Question-Led Search Intent Headings. Headings starting with interrogatives (What, How, Why, Which, Is) that map to "People Also Ask" and LLM prompt tokens.</li>
              <li><strong>AEO-03 (7 pts):</strong> Structured Extraction Formats. Evaluates HTML tables (<code>&lt;table&gt;</code>) and ordered/unordered lists for procedural AI synthesis.</li>
              <li><strong>AEO-04 (6 pts):</strong> Factual &amp; Statistical Citation Density. Evaluates quantitative metrics, percentages, dates, and currency markers. GEO research indicates verifiable statistics improve LLM citation likelihood by ~35%.</li>
            </ul>
          </div>

          <div>
            <h4 style={{ color: 'var(--text-primary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Code2 size={15} color="var(--color-emerald)" />
              4. Structured Data &amp; Knowledge Graph (20 Points Max)
            </h4>
            <ul style={{ paddingLeft: 18, lineHeight: 1.6 }}>
              <li><strong>SCHEMA-01 (8 pts):</strong> JSON-LD Syntax Validity. Tests for well-formed JSON and standard <code>schema.org</code> vocabulary context.</li>
              <li><strong>SCHEMA-02 (7 pts):</strong> High-Value Entity Schema Coverage. Rewards Course, FAQPage, Article, Organization, and HowTo schemas.</li>
              <li><strong>SCHEMA-03 (5 pts):</strong> FAQ &amp; Q&amp;A Schema Readiness. Confirms FAQPage schema markup matches on-page Q&amp;A content.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
