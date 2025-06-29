import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { config } from 'dotenv';
import { resolve } from 'path';
import { GenericContainer, StartedTestContainer } from 'testcontainers';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

// Load test environment variables
config({ path: resolve(__dirname, '../../.env.test') });

let postgresContainer: StartedTestContainer;
let redisContainer: StartedTestContainer;
let prisma: PrismaClient;
let redis: Redis;

beforeAll(async () => {
  console.log('Setting up integration test environment...');
  
  // Start PostgreSQL test container
  postgresContainer = await new GenericContainer('postgres:15-alpine')
    .withEnvironment({
      POSTGRES_DB: 'accessibility_scanner_test',
      POSTGRES_USER: 'test_user',
      POSTGRES_PASSWORD: 'test_password'
    })
    .withExposedPorts(5432)
    .start();

  const postgresPort = postgresContainer.getMappedPort(5432);
  const postgresHost = postgresContainer.getHost();
  
  // Update DATABASE_URL for the test container
  process.env.DATABASE_URL = `postgresql://test_user:test_password@${postgresHost}:${postgresPort}/accessibility_scanner_test`;

  // Start Redis test container
  redisContainer = await new GenericContainer('redis:7-alpine')
    .withCommand(['redis-server', '--requirepass', 'test_redis_password'])
    .withExposedPorts(6379)
    .start();

  const redisPort = redisContainer.getMappedPort(6379);
  const redisHost = redisContainer.getHost();
  
  // Update REDIS_URL for the test container
  process.env.REDIS_URL = `redis://:test_redis_password@${redisHost}:${redisPort}`;

  // Initialize Prisma with test database
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  });

  // Run database migrations
  const { execSync } = require('child_process');
  execSync('npx prisma migrate deploy', { 
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
    stdio: 'inherit'
  });

  // Initialize Redis client
  redis = new Redis(process.env.REDIS_URL);

  // Wait for connections to be ready
  await prisma.$connect();
  await redis.ping();

  console.log('Integration test environment ready');
}, 60000);

afterAll(async () => {
  console.log('Cleaning up integration test environment...');
  
  // Close connections
  if (prisma) {
    await prisma.$disconnect();
  }
  
  if (redis) {
    await redis.disconnect();
  }

  // Stop containers
  if (postgresContainer) {
    await postgresContainer.stop();
  }
  
  if (redisContainer) {
    await redisContainer.stop();
  }

  console.log('Integration test cleanup complete');
}, 30000);

beforeEach(async () => {
  // Clean database before each test
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

// Make clients available globally for tests
global.testPrisma = prisma;
global.testRedis = redis;

// Test data factories
global.createTestUser = async (overrides = {}) => {
  return await prisma.user.create({
    data: {
      email: 'test@example.com',
      name: 'Test User',
      githubId: '123456',
      role: 'user',
      ...overrides
    }
  });
};

global.createTestRepository = async (userId: string, overrides = {}) => {
  return await prisma.repository.create({
    data: {
      name: 'test-repo',
      fullName: 'test-user/test-repo',
      url: 'https://github.com/test-user/test-repo',
      userId,
      ...overrides
    }
  });
};

global.createTestScan = async (repositoryId: string, overrides = {}) => {
  return await prisma.scan.create({
    data: {
      repositoryId,
      status: 'completed',
      issuesFound: 0,
      startedAt: new Date(),
      completedAt: new Date(),
      ...overrides
    }
  });
};

global.createTestIssue = async (scanId: string, overrides = {}) => {
  return await prisma.accessibilityIssue.create({
    data: {
      scanId,
      type: 'missing_alt_text',
      severity: 'error',
      description: 'Test accessibility issue',
      element: '<img src="test.jpg">',
      selector: 'img',
      wcagCriteria: ['1.1.1'],
      ...overrides
    }
  });
};