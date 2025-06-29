import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import { QueueProcessor, QueueConfig } from './services/queueProcessor';
import { logger } from './utils/logger';

const app = express();
const port = parseInt(process.env.PORT || '3001');

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));

app.use(express.json({ limit: '1mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime(),
  });
});

// Readiness check endpoint
app.get('/ready', async (req, res) => {
  try {
    // Check if queue processor is ready
    const stats = await queueProcessor.getQueueStats();
    
    res.json({
      status: 'ready',
      timestamp: new Date().toISOString(),
      queueStats: stats,
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Queue stats endpoint
app.get('/stats', async (req, res) => {
  try {
    const stats = await queueProcessor.getQueueStats();
    res.json(stats);
  } catch (error) {
    logger.error('Failed to get queue stats', { error: error.message });
    res.status(500).json({ error: 'Failed to get queue stats' });
  }
});

// Metrics endpoint for monitoring
app.get('/metrics', async (req, res) => {
  try {
    const [queueStats, memoryUsage] = await Promise.all([
      queueProcessor.getQueueStats(),
      Promise.resolve(process.memoryUsage()),
    ]);

    const metrics = {
      queue: queueStats,
      memory: {
        rss: memoryUsage.rss,
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
        external: memoryUsage.external,
      },
      uptime: process.uptime(),
      cpu: process.cpuUsage(),
      timestamp: new Date().toISOString(),
    };

    res.json(metrics);
  } catch (error) {
    logger.error('Failed to get metrics', { error: error.message });
    res.status(500).json({ error: 'Failed to get metrics' });
  }
});

// Error handling middleware
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled request error', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
  });

  res.status(500).json({
    error: 'Internal server error',
    timestamp: new Date().toISOString(),
  });
});

// Initialize queue processor
const queueConfig: QueueConfig = {
  redisUrl: process.env.UPSTASH_REDIS_URL!,
  redisToken: process.env.UPSTASH_REDIS_TOKEN!,
  maxConcurrency: parseInt(process.env.MAX_CONCURRENCY || '3'),
  retryAttempts: parseInt(process.env.RETRY_ATTEMPTS || '3'),
  retryBackoffMs: parseInt(process.env.RETRY_BACKOFF_MS || '1000'),
  deadLetterQueue: process.env.DEAD_LETTER_QUEUE || 'failed_scans',
  processingTimeout: parseInt(process.env.PROCESSING_TIMEOUT || '300000'), // 5 minutes
};

const queueProcessor = new QueueProcessor(queueConfig);

// Graceful shutdown handling
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}, starting graceful shutdown`);

  try {
    // Stop accepting new requests
    const server = app.listen(0); // Get server instance
    server.close();

    // Stop queue processor
    await queueProcessor.stop();

    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown', {
      error: error.message,
    });
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.fatal('Uncaught exception', {
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.fatal('Unhandled promise rejection', {
    reason,
    promise,
  });
  process.exit(1);
});

// Start the application
async function start() {
  try {
    // Validate required environment variables
    const required = [
      'UPSTASH_REDIS_URL',
      'UPSTASH_REDIS_TOKEN',
      'DATABASE_URL',
    ];

    const missing = required.filter(key => !process.env[key]);
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    // Start queue processor
    await queueProcessor.start();

    // Start HTTP server
    app.listen(port, () => {
      logger.info('Accessibility Scanner Worker started', {
        port,
        nodeEnv: process.env.NODE_ENV,
        maxConcurrency: queueConfig.maxConcurrency,
        processingTimeout: queueConfig.processingTimeout,
      });
    });

    // Log startup metrics
    const memoryUsage = process.memoryUsage();
    logger.info('Worker startup metrics', {
      memory: {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
      },
      pid: process.pid,
      version: process.version,
    });
  } catch (error) {
    logger.fatal('Failed to start worker', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
}

// Start the application
start().catch((error) => {
  logger.fatal('Application startup failed', {
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
});