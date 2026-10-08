import React from 'react';
import {
  ShieldCheck,
  Zap,
  FileText,
  Bot,
  Code2,
  ExternalLink,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Info
} from 'lucide-react';
import { AuditReport, CategoryScore } from '../types/audit';

interface ScoreOverviewProps {
  report: AuditReport;
}

export const ScoreOverview: React.FC<ScoreOverviewProps> = ({ report }) => {
  const { overall_score, category_scores, summary_counts, extracted_data, timestamp, disclaimer } = report;

  // Compute SVG circle stroke
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (overall_score / 100) * circumference;

  const getScoreColor = (val: number) => {
    if (val >= 80) return 'var(--color-emerald)';
    if (val >= 60) return 'var(--accent-gold)';
    if (val >= 40) return 'var(--color-orange)';
    return 'var(--color-rose)';
  };

  const getTierLabel = (val: number) => {
    if (val >= 85) return { title: 'High Search & AI Readiness', desc: 'Strong foundation for both crawler indexing and generative answer synthesis.' };
    if (val >= 70) return { title: 'Good Overall Hygiene', desc: 'Solid structure with actionable opportunities in AEO answer blocks or schema.' };
    if (val >= 50) return { title: 'Moderate Optimization Needed', desc: 'Several technical or on-page elements require attention to prevent ranking friction.' };
    return { title: 'Critical Remediation Needed', desc: 'Severe indexing, canonical, or structural barriers detected.' };
  };

  const tier = getTierLabel(overall_score);

  const getCategoryIcon = (key: string) => {
    switch (key) {
      case 'technical':
        return <Zap size={16} className="pillar-icon" />;
      case 'onpage':
        return <FileText size={16} className="pillar-icon" />;
      case 'aeo':
        return <Bot size={16} className="pillar-icon" />;
      case 'schema':
        return <Code2 size={16} className="pillar-icon" />;
      default:
        return <ShieldCheck size={16} className="pillar-icon" />;
    }
  };

  const formattedDate = new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <div>
      {/* Banner */}
      <div className="audit-header-banner">
        <div className="audited-url-display">
          <ExternalLink size={15} color="var(--text-muted)" />
          <span className="audited-url-text">{report.url}</span>
        </div>

        <div className="meta-pill-group">
          <span className={`badge-pill ${extracted_data.status_code === 200 ? 'status-200' : 'status-error'}`}>
            HTTP {extracted_data.status_code}
          </span>
          <span className="badge-pill latency">
            <Clock size={12} />
            {extracted_data.response_time_ms}ms latency
          </span>
          <span className="badge-pill timestamp">
            Audited at {formattedDate}
          </span>
        </div>
      </div>

      {/* Honest Disclaimer Callout */}
      <div className="honesty-callout">
        <Info size={16} style={{ flexShrink: 0, marginTop: 2, color: 'var(--accent-gold)' }} />
        <div>
          <strong>Transparent Rule-Based Evaluation:</strong> {disclaimer}
        </div>
      </div>

      {/* Main Score Hero */}
      <div className="score-hero-grid">
        <div className="overall-score-card">
          <div className="score-circle-wrapper">
            <svg className="score-svg" viewBox="0 0 140 140">
              <circle
                className="score-circle-bg"
                cx="70"
                cy="70"
                r={radius}
              />
              <circle
                className="score-circle-fg"
                cx="70"
                cy="70"
                r={radius}
                stroke={getScoreColor(overall_score)}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
              />
            </svg>
            <div className="score-number-display">
              <span className="score-huge-val">{overall_score}</span>
              <span className="score-max-val">/ 100</span>
            </div>
          </div>

          <div className="score-tier-label">{tier.title}</div>
          <div className="score-tier-subtext">{tier.desc}</div>
        </div>

        {/* 4 Pillars Grid */}
        <div className="pillars-grid">
          {Object.entries(category_scores).map(([key, cat]: [string, CategoryScore]) => {
            const passedInCat = cat.checks.filter((c) => c.passed).length;
            const totalInCat = cat.checks.length;
            const fillColor = getScoreColor(cat.percentage);

            return (
              <div key={key} className="pillar-card">
                <div>
                  <div className="pillar-top-row">
                    <div className="pillar-label-group">
                      {getCategoryIcon(key)}
                      <span className="pillar-title">{cat.label}</span>
                    </div>
                    <span className="pillar-score-text">
                      {cat.earned} <span style={{ color: 'var(--text-muted)' }}>/ {cat.max_score}</span>
                    </span>
                  </div>

                  <div className="pillar-bar-track">
                    <div
                      className="pillar-bar-fill"
                      style={{
                        width: `${cat.percentage}%`,
                        backgroundColor: fillColor,
                      }}
                    />
                  </div>
                </div>

                <div className="pillar-checks-summary">
                  <span>{cat.percentage}% optimization</span>
                  <span>{passedInCat}/{totalInCat} checks passed</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
