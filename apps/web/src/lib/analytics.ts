'use client';

// Analytics configuration and utilities
export const ANALYTICS_CONFIG = {
  gtag: {
    id: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '',
    enabled: process.env.NODE_ENV === 'production',
  },
  gtm: {
    id: process.env.NEXT_PUBLIC_GTM_ID || '',
    enabled: process.env.NODE_ENV === 'production',
  },
  facebook: {
    pixelId: process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID || '',
    enabled: process.env.NODE_ENV === 'production',
  },
  linkedin: {
    partnerId: process.env.NEXT_PUBLIC_LINKEDIN_PARTNER_ID || '',
    enabled: process.env.NODE_ENV === 'production',
  },
};

// Google Analytics 4 Events
export const trackEvent = (eventName: string, parameters?: Record<string, unknown>) => {
  if (typeof window !== 'undefined' && window.gtag && ANALYTICS_CONFIG.gtag.enabled) {
    window.gtag('event', eventName, {
      custom_parameter: true,
      ...parameters,
    });
  }
};

// Conversion Events
export const trackConversion = (action: string, value?: number, currency = 'USD') => {
  if (typeof window !== 'undefined' && window.gtag && ANALYTICS_CONFIG.gtag.enabled) {
    window.gtag('event', 'conversion', {
      send_to: `${ANALYTICS_CONFIG.gtag.id}/${action}`,
      value: value,
      currency: currency,
    });
  }
};

// Marketing Events
export const trackSignup = (method: 'github' | 'google' | 'email', plan: 'free' | 'pro' = 'free') => {
  trackEvent('sign_up', {
    method,
    plan,
    value: plan === 'pro' ? 29.99 : 0,
    currency: 'USD',
  });

  // Facebook Pixel
  if (typeof window !== 'undefined' && window.fbq && ANALYTICS_CONFIG.facebook.enabled) {
    window.fbq('track', 'CompleteRegistration', {
      content_name: `${plan}_plan_signup`,
      content_category: 'subscription',
      value: plan === 'pro' ? 29.99 : 0,
      currency: 'USD',
    });
  }

  // LinkedIn
  if (typeof window !== 'undefined' && window.lintrk && ANALYTICS_CONFIG.linkedin.enabled) {
    window.lintrk('track', { conversion_id: 'signup' });
  }
};

export const trackSubscription = (plan: 'pro' | 'enterprise', value: number) => {
  trackEvent('purchase', {
    transaction_id: `sub_${Date.now()}`,
    value,
    currency: 'USD',
    items: [{
      item_id: plan,
      item_name: `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan`,
      item_category: 'subscription',
      price: value,
      quantity: 1,
    }],
  });

  // Facebook Pixel
  if (typeof window !== 'undefined' && window.fbq && ANALYTICS_CONFIG.facebook.enabled) {
    window.fbq('track', 'Purchase', {
      content_type: 'product',
      content_ids: [plan],
      value,
      currency: 'USD',
    });
  }
};

export const trackTrialStart = (plan: 'pro' | 'enterprise') => {
  trackEvent('begin_checkout', {
    currency: 'USD',
    value: plan === 'pro' ? 29.99 : 0,
    items: [{
      item_id: plan,
      item_name: `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan Trial`,
      item_category: 'trial',
    }],
  });

  // Facebook Pixel
  if (typeof window !== 'undefined' && window.fbq && ANALYTICS_CONFIG.facebook.enabled) {
    window.fbq('track', 'InitiateCheckout', {
      content_name: `${plan}_trial`,
      content_category: 'trial',
      value: plan === 'pro' ? 29.99 : 0,
      currency: 'USD',
    });
  }
};

// User Journey Events
export const trackPageView = (page: string, title?: string) => {
  if (typeof window !== 'undefined' && window.gtag && ANALYTICS_CONFIG.gtag.enabled) {
    window.gtag('config', ANALYTICS_CONFIG.gtag.id, {
      page_title: title,
      page_location: window.location.href,
      page_path: page,
    });
  }

  // Facebook Pixel
  if (typeof window !== 'undefined' && window.fbq && ANALYTICS_CONFIG.facebook.enabled) {
    window.fbq('track', 'PageView');
  }
};

export const trackEngagement = (action: string, element?: string, value?: string) => {
  trackEvent('engagement', {
    engagement_type: action,
    element_name: element,
    element_value: value,
  });
};

export const trackFeatureUsage = (feature: string, action: 'view' | 'click' | 'complete') => {
  trackEvent('feature_usage', {
    feature_name: feature,
    action_type: action,
  });
};

// Repository and Scan Events
export const trackRepositoryConnect = (provider: 'github', repoName: string) => {
  trackEvent('repository_connected', {
    provider,
    repository_name: repoName,
  });
};

export const trackScanStart = (scanType: 'first_scan' | 'regular_scan', url: string) => {
  trackEvent('scan_started', {
    scan_type: scanType,
    target_url: url,
  });
};

export const trackScanComplete = (issuesFound: number, scanDuration: number) => {
  trackEvent('scan_completed', {
    issues_found: issuesFound,
    scan_duration_seconds: scanDuration,
  });
};

export const trackPRCreated = (issuesFixed: number, repoName: string) => {
  trackEvent('pr_created', {
    issues_fixed: issuesFixed,
    repository_name: repoName,
  });

  // Facebook Pixel - Lead event
  if (typeof window !== 'undefined' && window.fbq && ANALYTICS_CONFIG.facebook.enabled) {
    window.fbq('track', 'Lead', {
      content_name: 'accessibility_pr_created',
      content_category: 'automation',
      value: issuesFixed * 10, // Estimated value per fix
      currency: 'USD',
    });
  }
};

// Form and CTA Events
export const trackCTAClick = (ctaName: string, location: string) => {
  trackEvent('cta_click', {
    cta_name: ctaName,
    cta_location: location,
  });
};

export const trackFormStart = (formName: string) => {
  trackEvent('form_start', {
    form_name: formName,
  });
};

export const trackFormComplete = (formName: string) => {
  trackEvent('form_submit', {
    form_name: formName,
  });
};

export const trackDownload = (fileName: string, fileType: string) => {
  trackEvent('file_download', {
    file_name: fileName,
    file_type: fileType,
  });
};

// Error and Performance Events
export const trackError = (errorType: string, errorMessage: string, location?: string) => {
  trackEvent('exception', {
    description: errorMessage,
    error_type: errorType,
    location,
    fatal: false,
  });
};

export const trackPerformance = (metric: string, value: number, unit: string) => {
  trackEvent('performance_metric', {
    metric_name: metric,
    metric_value: value,
    metric_unit: unit,
  });
};

// Advanced Ecommerce Events
export const trackViewPromotion = (promotionId: string, promotionName: string) => {
  trackEvent('view_promotion', {
    promotion_id: promotionId,
    promotion_name: promotionName,
  });
};

export const trackSelectPromotion = (promotionId: string, promotionName: string) => {
  trackEvent('select_promotion', {
    promotion_id: promotionId,
    promotion_name: promotionName,
  });
};

// User Properties
export const setUserProperties = (properties: Record<string, string | number | boolean>) => {
  if (typeof window !== 'undefined' && window.gtag && ANALYTICS_CONFIG.gtag.enabled) {
    window.gtag('config', ANALYTICS_CONFIG.gtag.id, {
      custom_map: properties,
    });
  }
};

export const identifyUser = (userId: string, traits?: Record<string, unknown>) => {
  if (typeof window !== 'undefined' && window.gtag && ANALYTICS_CONFIG.gtag.enabled) {
    window.gtag('config', ANALYTICS_CONFIG.gtag.id, {
      user_id: userId,
      ...traits,
    });
  }

  // Facebook Pixel
  if (typeof window !== 'undefined' && window.fbq && ANALYTICS_CONFIG.facebook.enabled) {
    window.fbq('init', ANALYTICS_CONFIG.facebook.pixelId, {
      external_id: userId,
    });
  }
};

// Consent Management
export const updateConsent = (granted: boolean) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('consent', 'update', {
      analytics_storage: granted ? 'granted' : 'denied',
      ad_storage: granted ? 'granted' : 'denied',
      ad_user_data: granted ? 'granted' : 'denied',
      ad_personalization: granted ? 'granted' : 'denied',
    });
  }
};

// Debug mode for development
export const enableDebugMode = () => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', ANALYTICS_CONFIG.gtag.id, {
      debug_mode: true,
    });
  }
};

// Types for window globals
declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
    fbq: (...args: unknown[]) => void;
    lintrk: (...args: unknown[]) => void;
    dataLayer: unknown[];
  }
}