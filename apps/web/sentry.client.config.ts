import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  
  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1,
  
  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
  
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  
  integrations: [
    // Replay integration disabled for now due to compatibility issues
  ],
  
  beforeSend(event) {
    // Filter out non-error events in development
    if (process.env.NODE_ENV === 'development' && event.level !== 'error') {
      return null;
    }
    
    // Remove sensitive data
    if (event.request?.data) {
      const sensitiveFields = ['password', 'token', 'creditCard'];
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
});