import { describe, it, expect } from 'vitest';
import supertest from 'supertest';
import { app } from '../index';

const request = supertest(app);

describe('Health Routes', () => {
  describe('GET /health', () => {
    it('should return healthy status', async () => {
      const response = await request.get('/health');
      
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        status: 'healthy',
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        version: expect.any(String),
      });
    });
  });

  describe('GET /health/ready', () => {
    it('should return readiness status', async () => {
      const response = await request.get('/health/ready');
      
      expect([200, 503]).toContain(response.status);
      expect(response.body).toMatchObject({
        status: expect.stringMatching(/^(ready|not_ready)$/),
        checks: {
          database: expect.any(Boolean),
          redis: expect.any(Boolean),
          external_apis: expect.any(Boolean),
        },
        timestamp: expect.any(String),
      });
    });
  });
});