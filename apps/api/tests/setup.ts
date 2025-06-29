import { beforeAll, afterAll, beforeEach } from 'vitest';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

beforeAll(async () => {
  // Setup test database, Redis connections, etc.
  console.log('Setting up test environment...');
});

afterAll(async () => {
  // Cleanup test database, close connections, etc.
  console.log('Cleaning up test environment...');
});

beforeEach(async () => {
  // Reset test data before each test
});