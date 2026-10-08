import React, { useState } from 'react';
import { Search, ArrowRight, Sparkles, ExternalLink } from 'lucide-react';

interface UrlAuditFormProps {
  onAudit: (url: string) => void;
  isLoading: boolean;
}

const SAMPLE_URLS = [
  { label: 'MDN Web Docs', url: 'https://developer.mozilla.org/en-US/docs/Web/HTML' },
  { label: 'Wikipedia SEO Entry', url: 'https://en.wikipedia.org/wiki/Search_engine_optimization' },
  { label: 'Python Official Docs', url: 'https://docs.python.org/3/' },
  { label: 'Minimalist Page', url: 'https://example.com' },
];

export const UrlAuditForm: React.FC<UrlAuditFormProps> = ({ onAudit, isLoading }) => {
  const [inputUrl, setInputUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputUrl.trim() && !isLoading) {
      onAudit(inputUrl.trim());
    }
  };

  const handleSelectSample = (sampleUrl: string) => {
    setInputUrl(sampleUrl);
    if (!isLoading) {
      onAudit(sampleUrl);
    }
  };

  return (
    <div className="audit-input-card">
      <div className="input-headline">
        <div>
          <h2>Webpage Audit & AEO Intelligence</h2>
          <p>
            Audit any public URL for Technical SEO foundation, On-Page hierarchy, JSON-LD Schema, and Generative Answer Readiness.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="input-form-row">
        <div className="url-input-wrapper">
          <Search size={16} className="url-input-icon" />
          <input
            type="text"
            className="url-input-field"
            placeholder="Enter destination URL (e.g., https://mybrand.com/courses/full-stack)..."
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <button type="submit" className="btn-primary" disabled={isLoading || !inputUrl.trim()}>
          {isLoading ? (
            <>Analyzing Page...</>
          ) : (
            <>
              Run Audit
              <ArrowRight size={15} />
            </>
          )}
        </button>
      </form>

      <div className="quick-samples">
        <span className="quick-sample-label">Test Real Destinations:</span>
        {SAMPLE_URLS.map((sample) => (
          <button
            key={sample.url}
            type="button"
            className="sample-chip"
            onClick={() => handleSelectSample(sample.url)}
            disabled={isLoading}
          >
            {sample.label}
          </button>
        ))}
      </div>
    </div>
  );
};
