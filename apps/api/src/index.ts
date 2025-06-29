import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import passport from './services/passport';
import { config } from './config';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/error-handler';
import { healthRoutes } from './routes/health';
import { stripeRoutes } from './routes/stripe';
import { metricsRoutes } from './routes/metrics';
import { authRoutes } from './routes/auth';
import { repositoriesRoutes } from './routes/repositories';
import { scansRoutes } from './routes/scans';
import { issuesRoutes } from './routes/issues';
import { pullRequestsRoutes } from './routes/pull-requests';
import { auditLogsRoutes } from './routes/audit-logs';
import { metricsMiddleware } from './middleware/metrics';
import { initSentry } from './services/sentry';
import { socketService } from './services/socket';

// Initialize Sentry as early as possible
initSentry();

const app = express();

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

app.use(cors({
  origin: config.allowedOrigins,
  credentials: true,
}));

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Passport middleware
app.use(passport.initialize());

// Metrics collection
app.use(metricsMiddleware);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Routes
app.use('/health', healthRoutes);
app.use('/auth', authRoutes);
app.use('/api/stripe', stripeRoutes);
app.use('/api/metrics', metricsRoutes);

// Core API routes (protected)
app.use('/api/repositories', repositoriesRoutes);
app.use('/api/scans', scansRoutes);
app.use('/api/issues', issuesRoutes);
app.use('/api/pull-requests', pullRequestsRoutes);
app.use('/api/audit-logs', auditLogsRoutes);

// Error handling
app.use(errorHandler);

const port = config.port || 3001;

// Create HTTP server and initialize Socket.IO
const server = createServer(app);
const io = socketService.initialize(server);

server.listen(port, () => {
  logger.info(`API server with Socket.IO running on port ${port}`);
});

export { app, server, io };