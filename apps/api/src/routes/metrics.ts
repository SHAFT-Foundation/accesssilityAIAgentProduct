import { Router } from 'express';
import { asyncHandler } from '../middleware/error-handler';
import { getMetrics } from '../middleware/metrics';
import { checkRedisHealth } from '../services/redis';
import { checkQueueHealth } from '../services/queue';
import { checkStripeHealth } from '../services/stripe';

const router = Router();

// Prometheus-style metrics endpoint
router.get('/metrics', asyncHandler(async (req, res) => {
  const metrics = getMetrics();
  const redisHealthy = await checkRedisHealth();
  const queueHealth = await checkQueueHealth();
  const stripeHealthy = await checkStripeHealth();
  
  // Format as Prometheus metrics
  const prometheusMetrics = `
# HELP accessibility_scanner_requests_total Total number of API requests
# TYPE accessibility_scanner_requests_total counter
accessibility_scanner_requests_total ${metrics.totalRequests}

# HELP accessibility_scanner_errors_total Total number of API errors
# TYPE accessibility_scanner_errors_total counter
accessibility_scanner_errors_total ${metrics.totalErrors}

# HELP accessibility_scanner_error_rate API error rate percentage
# TYPE accessibility_scanner_error_rate gauge
accessibility_scanner_error_rate ${metrics.errorRate}

# HELP accessibility_scanner_response_time_avg Average response time in milliseconds
# TYPE accessibility_scanner_response_time_avg gauge
accessibility_scanner_response_time_avg ${metrics.avgResponseTime}

# HELP accessibility_scanner_active_connections Current active connections
# TYPE accessibility_scanner_active_connections gauge
accessibility_scanner_active_connections ${metrics.activeConnections}

# HELP accessibility_scanner_uptime_seconds Server uptime in seconds
# TYPE accessibility_scanner_uptime_seconds gauge
accessibility_scanner_uptime_seconds ${metrics.uptime}

# HELP accessibility_scanner_memory_usage_bytes Memory usage in bytes
# TYPE accessibility_scanner_memory_usage_bytes gauge
accessibility_scanner_memory_usage_bytes{type="rss"} ${metrics.memoryUsage.rss}
accessibility_scanner_memory_usage_bytes{type="heapTotal"} ${metrics.memoryUsage.heapTotal}
accessibility_scanner_memory_usage_bytes{type="heapUsed"} ${metrics.memoryUsage.heapUsed}

# HELP accessibility_scanner_service_health Service health status (1 = healthy, 0 = unhealthy)
# TYPE accessibility_scanner_service_health gauge
accessibility_scanner_service_health{service="redis"} ${redisHealthy ? 1 : 0}
accessibility_scanner_service_health{service="stripe"} ${stripeHealthy ? 1 : 0}
accessibility_scanner_service_health{service="scan_queue"} ${queueHealth.scan ? 1 : 0}
accessibility_scanner_service_health{service="pr_queue"} ${queueHealth.pr ? 1 : 0}
accessibility_scanner_service_health{service="email_queue"} ${queueHealth.email ? 1 : 0}
`;

  res.set('Content-Type', 'text/plain');
  res.send(prometheusMetrics.trim());
}));

// JSON metrics endpoint for dashboards
router.get('/metrics/json', asyncHandler(async (req, res) => {
  const metrics = getMetrics();
  const redisHealthy = await checkRedisHealth();
  const queueHealth = await checkQueueHealth();
  const stripeHealthy = await checkStripeHealth();
  
  res.json({
    timestamp: new Date().toISOString(),
    api: {
      totalRequests: metrics.totalRequests,
      totalErrors: metrics.totalErrors,
      errorRate: metrics.errorRate,
      avgResponseTime: metrics.avgResponseTime,
      activeConnections: metrics.activeConnections,
    },
    system: {
      uptime: metrics.uptime,
      memoryUsage: metrics.memoryUsage,
      nodeVersion: process.version,
      platform: process.platform,
    },
    services: {
      redis: redisHealthy,
      stripe: stripeHealthy,
      queues: queueHealth,
    },
  });
}));

// SLA metrics
router.get('/metrics/sla', asyncHandler(async (req, res) => {
  const metrics = getMetrics();
  
  // Calculate SLA metrics
  const uptime = metrics.uptime;
  const errorRate = metrics.errorRate;
  const avgResponseTime = metrics.avgResponseTime;
  
  // SLA targets
  const targets = {
    uptime: 99.9, // 99.9% uptime
    errorRate: 1.0, // <1% error rate
    responseTime: 200, // <200ms average response time
  };
  
  // Calculate SLA compliance
  const uptimePercentage = 100; // Simplified - would need actual downtime tracking
  const slaCompliance = {
    uptime: uptimePercentage >= targets.uptime,
    errorRate: errorRate <= targets.errorRate,
    responseTime: avgResponseTime <= targets.responseTime,
  };
  
  const overallSLA = Object.values(slaCompliance).every(Boolean);
  
  res.json({
    timestamp: new Date().toISOString(),
    sla: {
      overall: overallSLA,
      targets,
      current: {
        uptime: uptimePercentage,
        errorRate,
        responseTime: avgResponseTime,
      },
      compliance: slaCompliance,
    },
  });
}));

export { router as metricsRoutes };