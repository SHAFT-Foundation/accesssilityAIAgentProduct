'use client';

import * as Sentry from '@sentry/nextjs';

export function initSentry() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  
  if (!dsn) {
    console.warn('Sentry DSN not configured for frontend');
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    
    // Performance monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Session replay
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    
    integrations: [
      // Replay integration disabled due to compatibility issues
    ],
    
    // Filter sensitive data
    beforeSend(event) {
      // Remove sensitive form data
      if (event.request?.data) {
        const sensitiveFields = ['password', 'token', 'creditCard', 'ssn'];
        sensitiveFields.forEach(field => {
          if (event.request?.data && typeof event.request.data === 'object') {
            if (field in event.request.data) {
              (event.request.data as Record<string, unknown>)[field] = '[REDACTED]';
            }
          }
        });
      }
      
      return event;
    },
    
    // Initial scope
    initialScope: {
      tags: {
        component: 'web-app',
        version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
      },
    },
  });
}

// Error capture with context
export function captureError(error: Error, context?: {
  user?: { id: string; email?: string };
  extra?: Record<string, unknown>;
  tags?: Record<string, string>;
  level?: Sentry.SeverityLevel;
}) {
  Sentry.withScope((scope) => {
    if (context?.user) {
      scope.setUser(context.user);
    }
    
    if (context?.extra) {
      Object.entries(context.extra).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }
    
    if (context?.tags) {
      Object.entries(context.tags).forEach(([key, value]) => {
        scope.setTag(key, value);
      });
    }
    
    if (context?.level) {
      scope.setLevel(context.level);
    }
    
    Sentry.captureException(error);
  });
}

// User feedback
export function showReportDialog() {
  Sentry.showReportDialog();
}

// User context
export function setUser(user: { id: string; email?: string; subscription?: string }) {
  Sentry.setUser(user);
}

// Performance measurement
export function measurePerformance(name: string, fn: () => void | Promise<void>) {
  return Sentry.startSpan(
    {
      name,
      op: 'function',
    },
    fn
  );
}

// Custom metrics
export function addBreadcrumb(message: string, category: string, data?: Record<string, unknown>) {
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: 'info',
    timestamp: Date.now() / 1000,
  });
}