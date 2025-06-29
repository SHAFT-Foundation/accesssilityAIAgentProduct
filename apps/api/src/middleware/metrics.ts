import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// Store metrics in memory (in production, use StatsD or similar)
const metrics = {
  requests: 0,
  errors: 0,
  responseTimes: [] as number[],
  activeConnections: 0,
};

// Middleware to collect metrics
export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  metrics.requests++;
  metrics.activeConnections++;
  
  // Track response
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    metrics.responseTimes.push(responseTime);
    metrics.activeConnections--;
    
    // Keep only last 100 response times
    if (metrics.responseTimes.length > 100) {
      metrics.responseTimes = metrics.responseTimes.slice(-100);
    }
    
    // Track errors
    if (res.statusCode >= 400) {
      metrics.errors++;
    }
    
    // Log metrics periodically
    if (metrics.requests % 100 === 0) {
      logMetrics();
    }
  });
  
  next();
};

// Log current metrics
function logMetrics() {
  const avgResponseTime = metrics.responseTimes.length > 0 
    ? metrics.responseTimes.reduce((a, b) => a + b, 0) / metrics.responseTimes.length 
    : 0;
    
  const errorRate = metrics.requests > 0 ? (metrics.errors / metrics.requests) * 100 : 0;
  
  logger.info('API Metrics', {
    totalRequests: metrics.requests,
    totalErrors: metrics.errors,
    errorRate: `${errorRate.toFixed(2)}%`,
    avgResponseTime: `${avgResponseTime.toFixed(2)}ms`,
    activeConnections: metrics.activeConnections,
  });
}

// Get metrics for health check
export function getMetrics() {
  const avgResponseTime = metrics.responseTimes.length > 0 
    ? metrics.responseTimes.reduce((a, b) => a + b, 0) / metrics.responseTimes.length 
    : 0;
    
  const errorRate = metrics.requests > 0 ? (metrics.errors / metrics.requests) * 100 : 0;
  
  return {
    totalRequests: metrics.requests,
    totalErrors: metrics.errors,
    errorRate: parseFloat(errorRate.toFixed(2)),
    avgResponseTime: parseFloat(avgResponseTime.toFixed(2)),
    activeConnections: metrics.activeConnections,
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
  };
}

// Reset metrics (for testing)
export function resetMetrics() {
  metrics.requests = 0;
  metrics.errors = 0;
  metrics.responseTimes = [];
  metrics.activeConnections = 0;
}