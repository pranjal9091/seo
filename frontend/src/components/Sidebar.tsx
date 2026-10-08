import React from 'react';

export type PageId =
  | 'overview'
  | 'visibility'
  | 'search-console'
  | 'ga4'
  | 'content'
  | 'grader'
  | 'schema'
  | 'reports'
  | 'evidence';

interface SidebarProps {
  currentPage: PageId;
  onSelectPage: (page: PageId) => void;
  isBackendOnline: boolean;
}

interface NavItem {
  id: PageId;
  label: string;
  badge?: string;
  icon: React.ReactNode;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onSelectPage,
  isBackendOnline,
}) => {
  const sections: NavSection[] = [
    {
      title: 'INTELLIGENCE & SIGNALS',
      items: [
        {
          id: 'overview',
          label: 'Executive Pulse',
          icon: (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="9" rx="1.5" />
              <rect x="14" y="3" width="7" height="5" rx="1.5" />
              <rect x="14" y="12" width="7" height="9" rx="1.5" />
              <rect x="3" y="16" width="7" height="5" rx="1.5" />
            </svg>
          ),
        },
        {
          id: 'visibility',
          label: 'AI Visibility (GEO)',
          badge: '36Q',
          icon: (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
          ),
        },
        {
          id: 'search-console',
          label: 'Search Console (GSC)',
          icon: (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
              <path d="M11 8v6M8 11h6" />
            </svg>
          ),
        },
        {
          id: 'ga4',
          label: 'GA4 Analytics',
          icon: (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 20V10" />
              <path d="M12 20V4" />
              <path d="M6 20v-6" />
            </svg>
          ),
        },
      ],
    },
    {
      title: 'EDITORIAL & AEO OPTIMIZATION',
      items: [
        {
          id: 'content',
          label: 'Content Hub',
          badge: '6 Live',
          icon: (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          ),
        },
        {
          id: 'grader',
          label: 'Content Grader',
          icon: (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          ),
        },
        {
          id: 'schema',
          label: 'Schema Generator',
          icon: (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
          ),
        },
      ],
    },
    {
      title: 'EVIDENCE & GOVERNANCE',
      items: [
        {
          id: 'reports',
          label: 'Executive Reports',
          icon: (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          ),
        },
        {
          id: 'evidence',
          label: 'Evidence & Provenance',
          badge: 'Proof',
          icon: (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
          ),
        },
      ],
    },
  ];

  return (
    <aside className="app-sidebar">
      <div>
        {/* Brand Header */}
        <div className="sidebar-brand">
          <div className="brand-badge-container">
            <div className="brand-logo-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 2 7 12 12 22 7 12 2" />
                <polyline points="2 17 12 22 22 17" />
                <polyline points="2 12 12 17 22 12" />
              </svg>
            </div>
            <div>
              <div className="brand-title">
                Omni<span>GEO</span>
                <span className="brand-pro-tag">PRO</span>
              </div>
              <div className="brand-subtitle">
                AI Search & AEO Intelligence
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Sections */}
        <nav className="sidebar-nav">
          {sections.map((section, sIdx) => (
            <div key={sIdx} className="nav-section">
              <div className="nav-section-title">{section.title}</div>
              <div className="nav-group">
                {section.items.map((item) => {
                  const isActive = currentPage === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`nav-item ${isActive ? 'active' : ''}`}
                      onClick={() => onSelectPage(item.id)}
                    >
                      <span className="nav-item-icon">{item.icon}</span>
                      <span className="nav-item-label">{item.label}</span>
                      {item.badge && (
                        <span className={`nav-item-badge ${isActive ? 'active' : ''}`}>
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Footer System Status */}
      <div className="sidebar-footer">
        <div className="footer-status-card">
          <div className="status-indicator-row">
            <span
              className={`status-radar-dot ${isBackendOnline ? 'online' : 'offline'}`}
            />
            <span className="status-text">
              {isBackendOnline ? 'FastAPI Engine Live' : 'Connecting to Core...'}
            </span>
          </div>
          <div className="status-meta">
            <span>56 Automated Tests</span>
            <span className="meta-separator">•</span>
            <span>SQLite Active</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
