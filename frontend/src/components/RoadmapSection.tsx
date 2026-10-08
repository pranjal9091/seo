import React from 'react';
import { Layers, CheckCircle2, Clock, Bot, Code2, FileSpreadsheet, Newspaper, ShieldCheck } from 'lucide-react';
import { RoadmapModule } from '../types/audit';

interface RoadmapSectionProps {
  modules: RoadmapModule[];
}

export const RoadmapSection: React.FC<RoadmapSectionProps> = ({ modules }) => {
  const defaultModules: RoadmapModule[] = [
    {
      id: 'module_1',
      name: 'Module 1: AI Visibility Tracker',
      status: 'IN PROGRESS',
      description: 'Query-level brand citation monitoring across ChatGPT, Perplexity, Gemini, and Google AI Overviews. Tracks Share of Model (SoM), cited URLs, and competitor benchmarking (NxtWave, Scaler, Masai, PW Skills).',
      milestone: 'Milestone 2'
    },
    {
      id: 'module_2',
      name: 'Module 2: Technical SEO & AEO Auditor',
      status: 'ACTIVE / COMPLETE',
      description: 'Live deterministic audit engine evaluating response latency, canonical tags, indexability, title/meta, H1 hierarchy, alt tags, direct answer blocks (40-65 words), and JSON-LD schema validity.',
      milestone: 'Milestone 1 (Current)'
    },
    {
      id: 'module_3',
      name: 'Module 3: Rich Schema Generator',
      status: 'IN PROGRESS',
      description: 'Automated JSON-LD generator for Course, FAQPage, Article, HowTo, and Organization structured data with schema.org compliance validator.',
      milestone: 'Milestone 3'
    },
    {
      id: 'module_4',
      name: 'Module 4: GSC Weekly Reporting Engine',
      status: 'IN PROGRESS',
      description: 'Real Google Search Console CSV export parser (clicks, impressions, CTR, average position) + automated weekly executive PDF/HTML audit report.',
      milestone: 'Milestone 4'
    },
    {
      id: 'module_5',
      name: 'Module 5: Live EdTech Content Hub',
      status: 'IN PROGRESS',
      description: 'Production answer-first content hub targeting high-intent long-tail queries for B.Tech learners, connected to real GSC/GA4 measurement hooks.',
      milestone: 'Milestone 5'
    }
  ];

  const displayList = modules.length > 0 ? modules : defaultModules;

  return (
    <section className="roadmap-section" id="roadmap-section">
      <div className="roadmap-header">
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Layers size={18} color="var(--accent-gold)" />
            OmniGEO Platform Architecture & Implementation Roadmap
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Systematic 5-module build plan. Milestone 1 establishes the production crawler and deterministic AEO audit engine.
          </p>
        </div>
      </div>

      <div className="roadmap-grid">
        {displayList.map((m) => {
          const isActive = m.status.includes('ACTIVE') || m.status.includes('COMPLETE');

          return (
            <div key={m.id} className={`roadmap-card ${isActive ? 'active' : ''}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span className={`module-badge ${isActive ? 'active' : 'in-progress'}`}>
                  {isActive ? '✓ ' + m.status : '⏳ ' + m.status}
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {m.milestone}
                </span>
              </div>

              <h4>{m.name}</h4>
              <p>{m.description}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
};
