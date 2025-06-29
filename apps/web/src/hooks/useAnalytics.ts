'use client';

import { useCallback, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import {
  trackEvent,
  trackPageView,
  trackCTAClick,
  trackEngagement,
  trackFeatureUsage,
  trackSignup,
  trackSubscription,
  trackTrialStart,
  trackRepositoryConnect,
  trackScanStart,
  trackScanComplete,
  trackPRCreated,
  trackFormStart,
  trackFormComplete,
  trackDownload,
  trackError,
  identifyUser,
  setUserProperties,
} from '@/lib/analytics';

export function useAnalytics() {
  const pathname = usePathname();

  // Automatically track page views
  useEffect(() => {
    // Get search params safely on client side
    const searchParams = typeof window !== 'undefined' ? window.location.search : '';
    const url = pathname + searchParams;
    trackPageView(url);
  }, [pathname]);

  // Event tracking functions
  const analytics = {
    // Generic event tracking
    track: useCallback((eventName: string, properties?: Record<string, unknown>) => {
      trackEvent(eventName, properties);
    }, []),

    // Page and navigation
    page: useCallback((page: string, title?: string) => {
      trackPageView(page, title);
    }, []),

    // User actions
    clickCTA: useCallback((ctaName: string, location?: string) => {
      trackCTAClick(ctaName, location || pathname);
    }, [pathname]),

    engagement: useCallback((action: string, element?: string, value?: string) => {
      trackEngagement(action, element, value);
    }, []),

    featureUsage: useCallback((feature: string, action: 'view' | 'click' | 'complete') => {
      trackFeatureUsage(feature, action);
    }, []),

    // Conversion events
    signup: useCallback((method: 'github' | 'google' | 'email', plan: 'free' | 'pro' = 'free') => {
      trackSignup(method, plan);
    }, []),

    subscribe: useCallback((plan: 'pro' | 'enterprise', value: number) => {
      trackSubscription(plan, value);
    }, []),

    startTrial: useCallback((plan: 'pro' | 'enterprise') => {
      trackTrialStart(plan);
    }, []),

    // Product-specific events
    connectRepository: useCallback((provider: 'github', repoName: string) => {
      trackRepositoryConnect(provider, repoName);
    }, []),

    startScan: useCallback((scanType: 'first_scan' | 'regular_scan', url: string) => {
      trackScanStart(scanType, url);
    }, []),

    completeScan: useCallback((issuesFound: number, scanDuration: number) => {
      trackScanComplete(issuesFound, scanDuration);
    }, []),

    createPR: useCallback((issuesFixed: number, repoName: string) => {
      trackPRCreated(issuesFixed, repoName);
    }, []),

    // Forms
    startForm: useCallback((formName: string) => {
      trackFormStart(formName);
    }, []),

    completeForm: useCallback((formName: string) => {
      trackFormComplete(formName);
    }, []),

    // Downloads
    download: useCallback((fileName: string, fileType: string) => {
      trackDownload(fileName, fileType);
    }, []),

    // Error tracking
    error: useCallback((errorType: string, errorMessage: string, location?: string) => {
      trackError(errorType, errorMessage, location || pathname);
    }, [pathname]),

    // User identification
    identify: useCallback((userId: string, traits?: Record<string, unknown>) => {
      identifyUser(userId, traits);
    }, []),

    setUserProperties: useCallback((properties: Record<string, string | number | boolean>) => {
      setUserProperties(properties);
    }, []),

    // Marketing funnel tracking
    viewPricing: useCallback(() => {
      trackEvent('view_pricing', {
        page: pathname,
        timestamp: Date.now(),
      });
    }, [pathname]),

    viewFeatures: useCallback(() => {
      trackEvent('view_features', {
        page: pathname,
        timestamp: Date.now(),
      });
    }, [pathname]),

    viewSecurity: useCallback(() => {
      trackEvent('view_security', {
        page: pathname,
        timestamp: Date.now(),
      });
    }, [pathname]),

    // Onboarding funnel
    startOnboarding: useCallback(() => {
      trackEvent('onboarding_started', {
        timestamp: Date.now(),
      });
    }, []),

    completeOnboardingStep: useCallback((step: number, stepName: string) => {
      trackEvent('onboarding_step_completed', {
        step_number: step,
        step_name: stepName,
        timestamp: Date.now(),
      });
    }, []),

    completeOnboarding: useCallback(() => {
      trackEvent('onboarding_completed', {
        timestamp: Date.now(),
      });
    }, []),

    // Email and communication
    newsletterSignup: useCallback((location: string) => {
      trackEvent('newsletter_signup', {
        location,
        timestamp: Date.now(),
      });
    }, []),

    contactSupport: useCallback((method: 'email' | 'chat' | 'phone', topic?: string) => {
      trackEvent('contact_support', {
        contact_method: method,
        topic,
        timestamp: Date.now(),
      });
    }, []),

    // Scroll and engagement tracking
    scrollDepth: useCallback((depth: number) => {
      trackEvent('scroll_depth', {
        scroll_percentage: depth,
        page: pathname,
      });
    }, [pathname]),

    timeOnPage: useCallback((seconds: number) => {
      trackEvent('time_on_page', {
        duration_seconds: seconds,
        page: pathname,
      });
    }, [pathname]),

    // A/B Testing and Experiments
    viewExperiment: useCallback((experimentId: string, variant: string) => {
      trackEvent('experiment_view', {
        experiment_id: experimentId,
        variant_name: variant,
      });
    }, []),

    convertExperiment: useCallback((experimentId: string, variant: string) => {
      trackEvent('experiment_convert', {
        experiment_id: experimentId,
        variant_name: variant,
      });
    }, []),
  };

  return analytics;
}

// Hook for scroll depth tracking
export function useScrollDepthTracking() {
  const analytics = useAnalytics();

  useEffect(() => {
    let maxScrollDepth = 0;
    const scrollDepthThresholds = [25, 50, 75, 90, 100];
    const trackedDepths = new Set<number>();

    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercentage = Math.round((scrollTop / documentHeight) * 100);

      if (scrollPercentage > maxScrollDepth) {
        maxScrollDepth = scrollPercentage;
      }

      // Track specific thresholds
      scrollDepthThresholds.forEach(threshold => {
        if (scrollPercentage >= threshold && !trackedDepths.has(threshold)) {
          trackedDepths.add(threshold);
          analytics.scrollDepth(threshold);
        }
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      // Track final scroll depth on unmount
      if (maxScrollDepth > 0) {
        analytics.scrollDepth(maxScrollDepth);
      }
    };
  }, [analytics]);
}

// Hook for time on page tracking
export function useTimeOnPageTracking() {
  const analytics = useAnalytics();

  useEffect(() => {
    const startTime = Date.now();

    const trackTimeInterval = setInterval(() => {
      const timeOnPage = Math.round((Date.now() - startTime) / 1000);
      analytics.timeOnPage(timeOnPage);
    }, 30000); // Track every 30 seconds

    return () => {
      clearInterval(trackTimeInterval);
      const finalTimeOnPage = Math.round((Date.now() - startTime) / 1000);
      if (finalTimeOnPage > 10) { // Only track if more than 10 seconds
        analytics.timeOnPage(finalTimeOnPage);
      }
    };
  }, [analytics]);
}

// Hook for form analytics
export function useFormAnalytics(formName: string) {
  const analytics = useAnalytics();

  const formAnalytics = {
    start: useCallback(() => {
      analytics.startForm(formName);
    }, [analytics, formName]),

    complete: useCallback(() => {
      analytics.completeForm(formName);
    }, [analytics, formName]),

    abandon: useCallback((fieldName?: string) => {
      analytics.track('form_abandon', {
        form_name: formName,
        last_field: fieldName,
      });
    }, [analytics, formName]),

    fieldFocus: useCallback((fieldName: string) => {
      analytics.track('form_field_focus', {
        form_name: formName,
        field_name: fieldName,
      });
    }, [analytics, formName]),

    fieldError: useCallback((fieldName: string, errorMessage: string) => {
      analytics.track('form_field_error', {
        form_name: formName,
        field_name: fieldName,
        error_message: errorMessage,
      });
    }, [analytics, formName]),
  };

  return formAnalytics;
}