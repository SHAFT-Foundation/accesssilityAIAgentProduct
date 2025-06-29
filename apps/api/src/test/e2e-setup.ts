import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { config } from 'dotenv';
import { resolve } from 'path';
import { GenericContainer, StartedTestContainer, DockerComposeEnvironment } from 'testcontainers';
import supertest from 'supertest';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

// Load test environment variables
config({ path: resolve(__dirname, '../../.env.test') });

let environment: any;
let prisma: PrismaClient;
let redis: Redis;
let app: any;

beforeAll(async () => {
  console.log('Setting up E2E test environment...');
  
  // Start the full application stack using docker-compose
  environment = await new DockerComposeEnvironment(
    resolve(__dirname, '../../'),
    'docker-compose.test.yml'
  ).up(['postgres', 'redis']);

  // Wait for services to be ready
  await new Promise(resolve => setTimeout(resolve, 10000));

  // Initialize database connection
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  });

  // Initialize Redis connection
  redis = new Redis(process.env.REDIS_URL);

  // Import and start the application
  const { createApp } = await import('../app');
  app = createApp();

  // Wait for connections
  await prisma.$connect();
  await redis.ping();

  console.log('E2E test environment ready');
}, 120000);

afterAll(async () => {
  console.log('Cleaning up E2E test environment...');
  
  // Close application connections
  if (prisma) {
    await prisma.$disconnect();
  }
  
  if (redis) {
    await redis.disconnect();
  }

  // Stop docker environment
  if (environment) {
    await environment.down();
  }

  console.log('E2E test cleanup complete');
}, 60000);

beforeEach(async () => {
  // Reset database to clean state
  if (prisma) {
    await prisma.accessibilityIssue.deleteMany();
    await prisma.scan.deleteMany();
    await prisma.repository.deleteMany();
    await prisma.user.deleteMany();
  }

  // Clear Redis cache
  if (redis) {
    await redis.flushall();
  }
});

// Make clients and app available globally for E2E tests
global.testApp = app;
global.testPrisma = prisma;
global.testRedis = redis;
global.request = supertest(app);

// Authentication helper
global.authenticateUser = async (userOverrides = {}) => {
  const user = await global.createTestUser(userOverrides);
  
  // Generate JWT token for the user
  const jwt = require('jsonwebtoken');
  const token = jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
  
  return { user, token };
};

// API request helpers
global.authenticatedRequest = (token: string) => {
  return global.request.set('Authorization', `Bearer ${token}`);
};

global.createAuthenticatedUser = async () => {
  const { user, token } = await global.authenticateUser();
  return {
    user,
    token,
    request: global.authenticatedRequest(token)
  };
};

// Test workflow helpers
global.createCompleteWorkflow = async () => {
  // Create authenticated user
  const { user, token, request } = await global.createAuthenticatedUser();
  
  // Create repository
  const repository = await global.createTestRepository(user.id);
  
  // Create scan
  const scan = await global.createTestScan(repository.id);
  
  // Create issues
  const issues = await Promise.all([
    global.createTestIssue(scan.id, { type: 'missing_alt_text' }),
    global.createTestIssue(scan.id, { type: 'low_contrast' }),
    global.createTestIssue(scan.id, { type: 'missing_label' })
  ]);
  
  return {
    user,
    token,
    request,
    repository,
    scan,
    issues
  };
};

// Mock external service responses for E2E tests
global.mockExternalServices = () => {
  // These would be set up as actual mock servers or nock interceptors
  // for true E2E testing with external API calls
  return {
    github: {
      mockRepository: (repoData = {}) => {
        // Mock GitHub API responses
      },
      mockPullRequest: (prData = {}) => {
        // Mock PR creation
      }
    },
    openai: {
      mockChatCompletion: (response = {}) => {
        // Mock OpenAI API responses
      }
    },
    anthropic: {
      mockMessage: (response = {}) => {
        // Mock Anthropic API responses
      }
    }
  };
};