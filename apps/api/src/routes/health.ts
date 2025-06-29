import { Router } from 'express';
import { asyncHandler } from '../middleware/error-handler';
import { logger } from '../utils/logger';
import { checkRedisHealth } from '../services/redis';
import { checkQueueHealth } from '../services/queue';
import { checkStripeHealth } from '../services/stripe';

const router = Router();

// Basic health check
router.get('/', asyncHandler(async (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
  });
}));

// Detailed health check with dependencies
router.get('/ready', asyncHandler(async (req, res) => {
  const checks = {
    database: false,
    redis: false,
    queues: {
      scan: false,
      pr: false,
      email: false,
      deadLetter: false,
    },
    external_apis: false,
  };

  try {
    // Check Redis connection
    checks.redis = await checkRedisHealth();
    
    // Check queue health
    const queueStatus = await checkQueueHealth();
    checks.queues = queueStatus;
    
    // TODO: Add actual database connection check
    checks.database = true;
    
    // Check external APIs
    const stripeHealthy = await checkStripeHealth();
    checks.external_apis = stripeHealthy;
    
    const queueHealthy = Object.values(queueStatus).every(status => status);
    const allHealthy = checks.database && checks.redis && queueHealthy && checks.external_apis;
    
    res.status(allHealthy ? 200 : 503).json({
      status: allHealthy ? 'ready' : 'not_ready',
      checks,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Health check failed', error);
    res.status(503).json({
      status: 'not_ready',
      checks,
      error: 'Health check failed',
      timestamp: new Date().toISOString(),
    });
  }
}));

export { router as healthRoutes };