// Privacy-conscious, deployment-safe Google Analytics 4 (GA4) Client
// Never logs or stores Personal Identifying Information (PII)

const GA4_MEASUREMENT_ID = (import.meta as any).env?.VITE_GA4_MEASUREMENT_ID || '';
const IS_DEV = Boolean((import.meta as any).env?.DEV);

interface GA4Status {
  isConfigured: boolean;
  maskedId: string;
  statusLabel: string;
}

export interface GA4Diagnostics {
  isConfigured: boolean;
  isInitialized: boolean;
  hasMeasurementId: boolean;
  maskedId: string;
  isDevelopment: boolean;
  recentEvents: Array<{ event: string; params: Record<string, any>; timestamp: string }>;
}

const recentEvents: Array<{ event: string; params: Record<string, any>; timestamp: string }> = [];

function maskMeasurementId(id: string): string {
  if (!id || id.length < 5) return 'G-***';
  return `${id.slice(0, 3)}***${id.slice(-3)}`;
}

export function getGA4Status(): GA4Status {
  const isConfigured = Boolean(GA4_MEASUREMENT_ID && GA4_MEASUREMENT_ID.startsWith('G-'));
  const masked = isConfigured ? maskMeasurementId(GA4_MEASUREMENT_ID) : '';
  return {
    isConfigured,
    maskedId: masked,
    statusLabel: isConfigured ? `Connected (${masked})` : 'GA4 not configured'
  };
}

let isInitialized = false;

export function initGA4() {
  const status = getGA4Status();
  if (!status.isConfigured || isInitialized || typeof window === 'undefined') {
    return;
  }

  // Load gtag script dynamically
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  const win = window as any;
  win.dataLayer = win.dataLayer || [];
  function gtag(...args: any[]) {
    win.dataLayer.push(args);
  }
  win.gtag = gtag;

  gtag('js', new Date());
  gtag('config', GA4_MEASUREMENT_ID, {
    send_page_view: false, // We manually send page_view for SPA routing
    anonymize_ip: true     // Privacy compliance
  });

  isInitialized = true;
}

export function trackEvent(eventName: string, params: Record<string, any> = {}) {
  const status = getGA4Status();

  // In development mode, capture for diagnostics verification even if unconfigured
  if (IS_DEV) {
    recentEvents.unshift({
      event: eventName,
      params,
      timestamp: new Date().toLocaleTimeString()
    });
    if (recentEvents.length > 10) recentEvents.pop();
  }

  if (!status.isConfigured) {
    // Graceful no-op when GA4 is not configured
    return;
  }

  const win = window as any;
  if (typeof win.gtag === 'function') {
    win.gtag('event', eventName, params);
  }
}

export function trackPageView(pagePath: string, pageTitle: string) {
  trackEvent('page_view', {
    page_path: pagePath,
    page_title: pageTitle
  });
}

export function trackArticleView(slug: string, title: string, category: string) {
  trackEvent('article_view', {
    article_slug: slug,
    article_title: title,
    content_category: category
  });
}

export function trackScrollDepth(depthPercent: number, slug: string) {
  trackEvent('scroll_depth', {
    depth_percent: depthPercent,
    article_slug: slug
  });
}

export function trackInternalLinkClick(sourceSlug: string, targetSlug: string, anchorText: string) {
  trackEvent('internal_link_click', {
    source_slug: sourceSlug,
    target_slug: targetSlug,
    anchor_text: anchorText
  });
}

export function trackOutboundLinkClick(url: string, anchorText: string) {
  trackEvent('outbound_link_click', {
    destination_url: url,
    anchor_text: anchorText
  });
}

export function getGA4Diagnostics(): GA4Diagnostics {
  const status = getGA4Status();
  return {
    isConfigured: status.isConfigured,
    isInitialized,
    hasMeasurementId: Boolean(GA4_MEASUREMENT_ID),
    maskedId: status.maskedId || 'None',
    isDevelopment: IS_DEV,
    recentEvents: IS_DEV ? [...recentEvents] : []
  };
}
