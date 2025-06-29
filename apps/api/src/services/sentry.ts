import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { config } from '../config';

// Initialize Sentry
export function initSentry() {
  if (!config.sentryDsn) {
    console.warn('Sentry DSN not configured, skipping Sentry initialization');
    return;
  }

  Sentry.init({
    dsn: config.sentryDsn,
    environment: config.nodeEnv,
    
    // Performance monitoring
    tracesSampleRate: config.nodeEnv === 'production' ? 0.1 : 1.0,
    
    // Profiling
    profilesSampleRate: config.nodeEnv === 'production' ? 0.1 : 1.0,
    
    integrations: [
      // Add profiling integration
      nodeProfilingIntegration(),
      
      // Add HTTP integration
      new Sentry.Integrations.Http({ tracing: true }),
      
      // Add Express integration
      new Sentry.Integrations.Express({ app: undefined }),
    ],
    
    // Filter sensitive data
    beforeSend(event) {
      // Remove sensitive headers
      if (event.request?.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.cookie;
        delete event.request.headers['stripe-signature'];
      }
      
      // Remove sensitive query parameters
      if (event.request?.query_string) {
        const sensitiveParams = ['token', 'key', 'password', 'secret'];
        sensitiveParams.forEach(param => {
          if (event.request?.query_string?.includes(param)) {
            event.request.query_string = event.request.query_string.replace(
              new RegExp(`${param}=[^&]*`, 'gi'),
              `${param}=[REDACTED]`
            );
          }
        });
      }
      
      return event;
    },
    
    // Custom tags
    initialScope: {
      tags: {
        service: 'accessibility-scanner-api',
        version: process.env.npm_package_version || '1.0.0',
      },
    },
  });
}

// Error capture with context
export function captureError(error: Error, context?: {
  user?: { id: string; email?: string };
  extra?: Record<string, any>;
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

// Performance transaction
export function startTransaction(name: string, op: string) {
  return Sentry.startTransaction({
    name,
    op,
  });
}

// Custom metrics
export function addBreadcrumb(message: string, category: string, data?: Record<string, any>) {
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: 'info',
    timestamp: Date.now() / 1000,
  });
}

// User context
export function setUser(user: { id: string; email?: string; subscription?: string }) {
  Sentry.setUser(user);
}

// Clear user context
export function clearUser() {
  Sentry.setUser(null);
}

// Performance mark
export function markPerformance(name: string) {
  Sentry.addBreadcrumb({
    message: `Performance: ${name}`,
    category: 'performance',
    level: 'info',
    timestamp: Date.now() / 1000,
  });
}