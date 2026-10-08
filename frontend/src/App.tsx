import React, { useState, useEffect } from 'react';
import { Sidebar, PageId } from './components/Sidebar';
import { OverviewPage } from './pages/OverviewPage';
import { VisibilityPage } from './pages/VisibilityPage';
import { ContentGraderPage } from './pages/ContentGraderPage';
import { SchemaGeneratorPage } from './pages/SchemaGeneratorPage';
import { SearchPerformancePage } from './pages/SearchPerformancePage';
import { ReportsPage } from './pages/ReportsPage';
import { ContentHubPage } from './pages/ContentHubPage';
import { ArticleDetailPage } from './pages/ArticleDetailPage';
import { GA4AnalyticsPage } from './pages/GA4AnalyticsPage';
import { EvidencePage } from './pages/EvidencePage';
import {
  checkBackendHealth,
  getVisibilityOverview,
  getAuditHistory,
  getSavedAudit
} from './services/api';
import { VisibilityOverviewResponse, AuditReport } from './types/audit';

export function App() {
  const [currentPage, setCurrentPage] = useState<PageId>('overview');
  const [activeArticleSlug, setActiveArticleSlug] = useState<string | null>(null);
  const [isBackendOnline, setIsBackendOnline] = useState<boolean>(false);
  const [visibilityData, setVisibilityData] = useState<VisibilityOverviewResponse | null>(null);
  const [latestAudit, setLatestAudit] = useState<AuditReport | null>(null);

  const fetchOverview = async () => {
    try {
      const data = await getVisibilityOverview();
      setVisibilityData(data);
    } catch (err) {
      console.warn('Failed to fetch visibility overview:', err);
    }
  };

  useEffect(() => {
    async function init() {
      const online = await checkBackendHealth();
      setIsBackendOnline(online);

      await fetchOverview();

      // Load latest audit from history if present
      try {
        const hist = await getAuditHistory();
        if (hist.length > 0) {
          const report = await getSavedAudit(hist[0].id);
          setLatestAudit(report);
        }
      } catch {
        // ignore fallback
      }
    }
    init();

    // Browser URL synchronisation
    const syncFromUrl = () => {
      const pathname = window.location.pathname;
      if (pathname.startsWith('/content/')) {
        const slug = pathname.replace('/content/', '').split('/')[0];
        if (slug) {
          setCurrentPage('content');
          setActiveArticleSlug(slug);
        }
      } else if (pathname === '/content') {
        setCurrentPage('content');
        setActiveArticleSlug(null);
      } else if (pathname === '/ga4') {
        setCurrentPage('ga4');
      } else if (pathname === '/evidence') {
        setCurrentPage('evidence');
      }
    };
    syncFromUrl();
    window.addEventListener('popstate', syncFromUrl);
    return () => window.removeEventListener('popstate', syncFromUrl);
  }, []);

  const handleSelectPage = (page: PageId) => {
    setCurrentPage(page);
    if (page === 'content') {
      setActiveArticleSlug(null);
      if (window.location.pathname !== '/content') {
        window.history.pushState({}, '', '/content');
      }
    } else if (page === 'ga4') {
      if (window.location.pathname !== '/ga4') {
        window.history.pushState({}, '', '/ga4');
      }
    } else if (page === 'evidence') {
      if (window.location.pathname !== '/evidence') {
        window.history.pushState({}, '', '/evidence');
      }
    } else {
      if (window.location.pathname !== '/') {
        window.history.pushState({}, '', '/');
      }
    }
  };

  const handleOpenArticle = (slug: string) => {
    setActiveArticleSlug(slug);
    setCurrentPage('content');
    window.history.pushState({}, '', `/content/${slug}`);
  };

  const handleBackToHub = () => {
    setActiveArticleSlug(null);
    setCurrentPage('content');
    window.history.pushState({}, '', '/content');
  };

  return (
    <div className="app-shell">
      {/* Left Sidebar Nav */}
      <Sidebar
        currentPage={currentPage}
        onSelectPage={handleSelectPage}
        isBackendOnline={isBackendOnline}
      />

      {/* Main View Area */}
      <main className="app-main">
        {currentPage === 'overview' && (
          <OverviewPage
            visibilityData={visibilityData}
            latestAudit={latestAudit}
            onNavigate={handleSelectPage}
          />
        )}

        {currentPage === 'visibility' && (
          <VisibilityPage
            overviewData={visibilityData}
            onRefreshOverview={fetchOverview}
          />
        )}

        {currentPage === 'search-console' && (
          <SearchPerformancePage />
        )}

        {currentPage === 'ga4' && (
          <GA4AnalyticsPage onNavigateToArticle={handleOpenArticle} />
        )}

        {currentPage === 'content' && (
          activeArticleSlug ? (
            <ArticleDetailPage
              slug={activeArticleSlug}
              onBack={handleBackToHub}
              onNavigateArticle={handleOpenArticle}
            />
          ) : (
            <ContentHubPage
              onSelectArticle={handleOpenArticle}
            />
          )
        )}

        {currentPage === 'grader' && (
          <ContentGraderPage
            currentReport={latestAudit}
            onAuditComplete={(report) => setLatestAudit(report)}
          />
        )}

        {currentPage === 'schema' && (
          <SchemaGeneratorPage />
        )}

        {currentPage === 'reports' && (
          <ReportsPage
            visibilityData={visibilityData}
            latestAudit={latestAudit}
          />
        )}

        {currentPage === 'evidence' && (
          <EvidencePage onNavigateToContent={() => handleSelectPage('content')} />
        )}
      </main>
    </div>
  );
}

export default App;
