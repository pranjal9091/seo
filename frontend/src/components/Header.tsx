import React from 'react';
import { Globe, BookOpen, Layers, CheckCircle2, AlertCircle } from 'lucide-react';

interface HeaderProps {
  isBackendOnline: boolean;
  onOpenMethodology: () => void;
  onScrollToRoadmap: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isBackendOnline,
  onOpenMethodology,
  onScrollToRoadmap,
}) => {
  return (
    <header className="site-header">
      <div className="header-inner">
        <div className="brand-wrapper">
          <div className="brand-logo-mark">
            <Globe size={18} />
          </div>
          <div className="brand-title-group">
            <h1>
              OmniGEO
              <span className="version-chip">v1.0-M1</span>
            </h1>
            <span className="brand-subtitle">
              AI Search Visibility, AEO & Technical SEO Intelligence Platform
            </span>
          </div>
        </div>

        <div className="header-actions">
          <div className="status-badge">
            <span className={`status-dot ${isBackendOnline ? '' : 'offline'}`} />
            {isBackendOnline ? 'FastAPI Connected' : 'Connecting Engine...'}
          </div>

          <button
            onClick={onOpenMethodology}
            className="btn-secondary"
            title="Read transparent scoring rules"
          >
            <BookOpen size={14} />
            Scoring Rules
          </button>

          <button
            onClick={onScrollToRoadmap}
            className="btn-secondary"
            title="View system modules roadmap"
          >
            <Layers size={14} />
            Modules
          </button>
        </div>
      </div>
    </header>
  );
};
