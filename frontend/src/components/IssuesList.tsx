import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  AlertOctagon,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  Wrench,
  HelpCircle,
  FileCode2
} from 'lucide-react';
import { AuditFinding, SeverityLevel, CategoryType, RuleCheckResult, AuditReport } from '../types/audit';

interface IssuesListProps {
  report: AuditReport;
}

export const IssuesList: React.FC<IssuesListProps> = ({ report }) => {
  const { findings, category_scores, summary_counts } = report;

  const [activeSeverity, setActiveSeverity] = useState<string>('all');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [expandedIssueIds, setExpandedIssueIds] = useState<Record<string, boolean>>({});

  // Collect all checks for "passed" tab
  const allChecks: { catKey: string; check: RuleCheckResult }[] = [];
  Object.entries(category_scores).forEach(([catKey, cat]) => {
    cat.checks.forEach((c) => {
      allChecks.push({ catKey, check: c });
    });
  });

  const passedChecks = allChecks.filter((c) => c.check.passed);

  const toggleExpand = (id: string) => {
    setExpandedIssueIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const filteredFindings = findings.filter((f) => {
    if (activeSeverity !== 'all' && activeSeverity !== 'passed') {
      if (f.severity !== activeSeverity) return false;
    }
    if (activeCategory !== 'all') {
      if (f.category !== activeCategory) return false;
    }
    return true;
  });

  const getSeverityIcon = (sev: SeverityLevel) => {
    switch (sev) {
      case 'critical':
        return <AlertOctagon size={14} color="var(--color-rose)" />;
      case 'high':
        return <AlertTriangle size={14} color="var(--color-orange)" />;
      case 'medium':
        return <AlertCircle size={14} color="var(--color-amber)" />;
      case 'low':
        return <Info size={14} color="var(--text-secondary)" />;
    }
  };

  return (
    <div style={{ marginBottom: 36 }}>
      {/* Filter Bar */}
      <div className="filter-tabs-wrapper">
        <div className="severity-filter-group">
          <button
            type="button"
            className={`filter-btn ${activeSeverity === 'all' ? 'active' : ''}`}
            onClick={() => setActiveSeverity('all')}
          >
            All Issues
            <span className="filter-count-chip">{findings.length}</span>
          </button>

          <button
            type="button"
            className={`filter-btn ${activeSeverity === 'critical' ? 'active' : ''}`}
            onClick={() => setActiveSeverity('critical')}
          >
            <span style={{ color: 'var(--color-rose)' }}>●</span>
            Critical
            <span className="filter-count-chip">{summary_counts.critical}</span>
          </button>

          <button
            type="button"
            className={`filter-btn ${activeSeverity === 'high' ? 'active' : ''}`}
            onClick={() => setActiveSeverity('high')}
          >
            <span style={{ color: 'var(--color-orange)' }}>●</span>
            High
            <span className="filter-count-chip">{summary_counts.high}</span>
          </button>

          <button
            type="button"
            className={`filter-btn ${activeSeverity === 'medium' ? 'active' : ''}`}
            onClick={() => setActiveSeverity('medium')}
          >
            <span style={{ color: 'var(--color-amber)' }}>●</span>
            Medium
            <span className="filter-count-chip">{summary_counts.medium}</span>
          </button>

          <button
            type="button"
            className={`filter-btn ${activeSeverity === 'low' ? 'active' : ''}`}
            onClick={() => setActiveSeverity('low')}
          >
            Low
            <span className="filter-count-chip">{summary_counts.low}</span>
          </button>

          <button
            type="button"
            className={`filter-btn ${activeSeverity === 'passed' ? 'active' : ''}`}
            onClick={() => setActiveSeverity('passed')}
          >
            <CheckCircle2 size={13} color="var(--color-emerald)" />
            Passed Checks
            <span className="filter-count-chip">{passedChecks.length}</span>
          </button>
        </div>

        {/* Category Filter */}
        {activeSeverity !== 'passed' && (
          <div style={{ display: 'flex', gap: 6 }}>
            {['all', 'technical', 'onpage', 'aeo', 'schema'].map((cat) => (
              <button
                key={cat}
                type="button"
                className={`filter-btn ${activeCategory === cat ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat === 'all' ? 'All Pillars' : cat.toUpperCase()}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Render Passed Checks List if selected */}
      {activeSeverity === 'passed' ? (
        <div className="findings-container">
          {passedChecks.map(({ catKey, check }) => (
            <div
              key={check.rule_id}
              className="issue-card"
              style={{ borderLeft: '3px solid var(--color-emerald)' }}
            >
              <div className="issue-header" style={{ cursor: 'default' }}>
                <div className="issue-title-group">
                  <div className="issue-badges-row">
                    <span className="severity-tag" style={{ background: 'var(--bg-emerald)', color: 'var(--color-emerald)', border: '1px solid var(--border-emerald)' }}>
                      PASSED ({check.earned_points}/{check.max_points} PTS)
                    </span>
                    <span className="category-tag">[{catKey.toUpperCase()}] {check.rule_id}</span>
                  </div>
                  <h3 className="issue-headline">{check.title}</h3>
                  <p className="issue-short-prob">{check.explanation}</p>
                </div>
                <CheckCircle2 size={18} color="var(--color-emerald)" style={{ flexShrink: 0 }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Render Prioritized Issues */
        <div className="findings-container">
          {filteredFindings.length === 0 ? (
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: 32,
              textAlign: 'center',
              color: 'var(--text-secondary)'
            }}>
              <CheckCircle2 size={28} color="var(--color-emerald)" style={{ margin: '0 auto 10px' }} />
              <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>No matching issues detected</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                This page satisfied all evaluation rules for the selected filter.
              </p>
            </div>
          ) : (
            filteredFindings.map((finding) => {
              const isExpanded = expandedIssueIds[finding.id] ?? false;

              return (
                <div key={finding.id} className={`issue-card severity-${finding.severity}`}>
                  <div className="issue-header" onClick={() => toggleExpand(finding.id)}>
                    <div className="issue-title-group">
                      <div className="issue-badges-row">
                        <span className={`severity-tag ${finding.severity}`}>
                          {finding.severity}
                        </span>
                        <span className="category-tag">{finding.category}</span>
                      </div>
                      <h3 className="issue-headline">{finding.title}</h3>
                      <p className="issue-short-prob">{finding.problem}</p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)' }}>
                      <span style={{ fontSize: '0.74rem' }}>{isExpanded ? 'Hide Details' : 'View Action'}</span>
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="issue-body-drawer">
                      {/* Evidence */}
                      <div className="drawer-section">
                        <span className="drawer-label">Audit Evidence / Detected State:</span>
                        <div className="drawer-content-box">
                          {finding.evidence}
                        </div>
                      </div>

                      {/* Why It Matters */}
                      <div className="drawer-section">
                        <span className="drawer-label">Why This Matters (AEO / Search Impact):</span>
                        <p className="drawer-content-text">
                          {finding.why_it_matters}
                        </p>
                      </div>

                      {/* Recommendation */}
                      <div className="drawer-section">
                        <span className="drawer-label">Recommended Remediation:</span>
                        <div className="recommendation-box">
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                            <Wrench size={15} style={{ flexShrink: 0, marginTop: 2, color: 'var(--accent-gold)' }} />
                            <span>{finding.recommendation}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
