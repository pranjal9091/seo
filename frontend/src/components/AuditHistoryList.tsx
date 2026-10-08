import React from 'react';
import { History, ExternalLink, ChevronRight, Clock } from 'lucide-react';
import { AuditHistoryItem } from '../types/audit';

interface AuditHistoryListProps {
  history: AuditHistoryItem[];
  onSelectAudit: (id: string) => void;
  selectedId?: string;
}

export const AuditHistoryList: React.FC<AuditHistoryListProps> = ({
  history,
  onSelectAudit,
  selectedId,
}) => {
  if (history.length === 0) return null;

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        <History size={15} color="var(--accent-gold)" />
        <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          Recent Audits (SQLite Persisted)
        </span>
      </div>

      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 6 }}>
        {history.map((item) => {
          const isSelected = item.id === selectedId;
          const scoreColor =
            item.overall_score >= 80
              ? 'var(--color-emerald)'
              : item.overall_score >= 60
              ? 'var(--accent-gold)'
              : 'var(--color-rose)';

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectAudit(item.id)}
              style={{
                background: isSelected ? 'var(--bg-elevated)' : 'var(--bg-subtle)',
                border: isSelected ? '1px solid var(--accent-gold)' : '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '8px 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                whiteSpace: 'nowrap',
                transition: 'all 0.12s ease',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  color: scoreColor,
                }}
              >
                {item.overall_score}
              </span>

              <div style={{ textAlign: 'left' }}>
                <div
                  style={{
                    fontSize: '0.78rem',
                    color: 'var(--text-primary)',
                    maxWidth: 160,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {item.url.replace(/^https?:\/\//, '')}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                  {item.summary_counts.total_issues} issues
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
