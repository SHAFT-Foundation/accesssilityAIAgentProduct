import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import './integration-setup';

describe('API Integration Tests', () => {
  let user: any;
  let repository: any;
  let authToken: string;

  beforeAll(async () => {
    user = await global.createTestUser();
    repository = await global.createTestRepository(user.id);
    
    // Generate auth token for API calls
    const jwt = require('jsonwebtoken');
    authToken = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  describe('Authentication Endpoints', () => {
    it('should authenticate user with valid GitHub OAuth', async () => {
      const response = await global.request
        .post('/api/auth/github')
        .send({
          code: 'mock_github_code',
          state: 'mock_state'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
    });

    it('should reject invalid authentication', async () => {
      const response = await global.request
        .post('/api/auth/github')
        .send({
          code: 'invalid_code'
        });

      expect(response.status).toBe(401);
    });

    it('should protect authenticated routes', async () => {
      const response = await global.request
        .get('/api/repositories');

      expect(response.status).toBe(401);
    });
  });

  describe('Repository Management', () => {
    it('should list user repositories', async () => {
      const response = await global.request
        .get('/api/repositories')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.repositories)).toBe(true);
    });

    it('should create new repository connection', async () => {
      const repositoryData = {
        name: 'new-test-repo',
        fullName: 'test-user/new-test-repo',
        url: 'https://github.com/test-user/new-test-repo',
        private: false
      };

      const response = await global.request
        .post('/api/repositories')
        .set('Authorization', `Bearer ${authToken}`)
        .send(repositoryData);

      expect(response.status).toBe(201);
      expect(response.body.repository.name).toBe(repositoryData.name);
      expect(response.body.repository.userId).toBe(user.id);
    });

    it('should update repository settings', async () => {
      const updateData = {
        scanOnPush: true,
        autoCreatePRs: false
      };

      const response = await global.request
        .put(`/api/repositories/${repository.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.repository.scanOnPush).toBe(true);
    });

    it('should delete repository connection', async () => {
      const tempRepo = await global.createTestRepository(user.id, {
        name: 'temp-repo'
      });

      const response = await global.request
        .delete(`/api/repositories/${tempRepo.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(204);

      // Verify deletion
      const getResponse = await global.request
        .get(`/api/repositories/${tempRepo.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getResponse.status).toBe(404);
    });
  });

  describe('Accessibility Scanning', () => {
    it('should initiate repository scan', async () => {
      const response = await global.request
        .post(`/api/repositories/${repository.id}/scan`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          branch: 'main',
          targetUrl: 'https://example.com'
        });

      expect(response.status).toBe(202);
      expect(response.body).toHaveProperty('scanId');
      expect(response.body.status).toBe('started');
    });

    it('should get scan status', async () => {
      const scan = await global.createTestScan(repository.id, {
        status: 'in_progress'
      });

      const response = await global.request
        .get(`/api/scans/${scan.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.scan.id).toBe(scan.id);
      expect(response.body.scan.status).toBe('in_progress');
    });

    it('should list repository scans', async () => {
      await global.createTestScan(repository.id);
      await global.createTestScan(repository.id);

      const response = await global.request
        .get(`/api/repositories/${repository.id}/scans`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.scans.length).toBeGreaterThanOrEqual(2);
    });

    it('should get scan results with issues', async () => {
      const scan = await global.createTestScan(repository.id, {
        status: 'completed',
        issuesFound: 3
      });

      const issues = await Promise.all([
        global.createTestIssue(scan.id, { type: 'missing_alt_text' }),
        global.createTestIssue(scan.id, { type: 'low_contrast' }),
        global.createTestIssue(scan.id, { type: 'missing_label' })
      ]);

      const response = await global.request
        .get(`/api/scans/${scan.id}/results`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.scan.issuesFound).toBe(3);
      expect(response.body.issues.length).toBe(3);
    });
  });

  describe('AI-Powered Fix Generation', () => {
    let scan: any;
    let issues: any[];

    beforeEach(async () => {
      scan = await global.createTestScan(repository.id);
      issues = await Promise.all([
        global.createTestIssue(scan.id, { 
          type: 'missing_alt_text',
          code: '<img src="test.jpg">',
          line: 10,
          column: 5
        }),
        global.createTestIssue(scan.id, { 
          type: 'low_contrast',
          code: '<button style="color: #888;">Click me</button>',
          line: 15,
          column: 1
        })
      ]);
    });

    it('should generate AI fixes for issues', async () => {
      const response = await global.request
        .post(`/api/scans/${scan.id}/generate-fixes`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          issueIds: issues.map(i => i.id)
        });

      expect(response.status).toBe(200);
      expect(response.body.fixes.length).toBe(2);
      expect(response.body.fixes[0]).toHaveProperty('fixedCode');
      expect(response.body.fixes[0]).toHaveProperty('confidence');
      expect(response.body.fixes[0]).toHaveProperty('consensus');
    });

    it('should apply fixes to repository', async () => {
      const fixes = [
        {
          issueId: issues[0].id,
          fixedCode: '<img src="test.jpg" alt="Descriptive alt text">',
          confidence: 0.9
        }
      ];

      const response = await global.request
        .post(`/api/repositories/${repository.id}/apply-fixes`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          fixes,
          createPullRequest: true,
          branch: 'accessibility-fixes'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('pullRequestUrl');
      expect(response.body.appliedFixes.length).toBe(1);
    });

    it('should handle fix validation and quality checks', async () => {
      const response = await global.request
        .post(`/api/fixes/validate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          originalCode: '<img src="test.jpg">',
          fixedCode: '<img src="test.jpg" alt="Good description">',
          issueType: 'missing_alt_text'
        });

      expect(response.status).toBe(200);
      expect(response.body.validation.isValid).toBe(true);
      expect(response.body.validation.score).toBeGreaterThan(0.8);
    });
  });

  describe('Pull Request Integration', () => {
    it('should create pull request with fixes', async () => {
      const response = await global.request
        .post(`/api/repositories/${repository.id}/pull-requests`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Fix accessibility issues',
          description: 'Automated fixes for accessibility violations',
          fixes: [
            {
              filePath: 'src/components/Header.tsx',
              changes: [
                {
                  line: 10,
                  original: '<img src="logo.png">',
                  fixed: '<img src="logo.png" alt="Company Logo">'
                }
              ]
            }
          ]
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('pullRequestUrl');
      expect(response.body.pullRequest.title).toContain('accessibility');
    });

    it('should update pull request status', async () => {
      const pr = {
        id: 'pr-123',
        status: 'open',
        url: 'https://github.com/test/repo/pull/123'
      };

      const response = await global.request
        .put(`/api/pull-requests/${pr.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'merged',
          mergedAt: new Date().toISOString()
        });

      expect(response.status).toBe(200);
      expect(response.body.pullRequest.status).toBe('merged');
    });
  });

  describe('Analytics and Reporting', () => {
    beforeEach(async () => {
      // Create test data for analytics
      const scans = await Promise.all([
        global.createTestScan(repository.id, { 
          status: 'completed', 
          issuesFound: 5,
          completedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
        }),
        global.createTestScan(repository.id, { 
          status: 'completed', 
          issuesFound: 3,
          completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
        }),
        global.createTestScan(repository.id, { 
          status: 'completed', 
          issuesFound: 1,
          completedAt: new Date() // today
        })
      ]);

      // Create issues for the scans
      for (const scan of scans) {
        for (let i = 0; i < scan.issuesFound; i++) {
          await global.createTestIssue(scan.id, {
            type: i % 2 === 0 ? 'missing_alt_text' : 'low_contrast'
          });
        }
      }
    });

    it('should get repository analytics', async () => {
      const response = await global.request
        .get(`/api/repositories/${repository.id}/analytics`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          period: '30d'
        });

      expect(response.status).toBe(200);
      expect(response.body.analytics).toHaveProperty('totalScans');
      expect(response.body.analytics).toHaveProperty('totalIssues');
      expect(response.body.analytics).toHaveProperty('issuesTrend');
      expect(response.body.analytics.totalScans).toBeGreaterThanOrEqual(3);
    });

    it('should generate accessibility report', async () => {
      const response = await global.request
        .get(`/api/repositories/${repository.id}/report`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          format: 'json',
          includeFixed: true
        });

      expect(response.status).toBe(200);
      expect(response.body.report).toHaveProperty('summary');
      expect(response.body.report).toHaveProperty('issueBreakdown');
      expect(response.body.report).toHaveProperty('wcagCompliance');
    });

    it('should export report in different formats', async () => {
      const response = await global.request
        .get(`/api/repositories/${repository.id}/report`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          format: 'csv'
        });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/csv');
    });
  });

  describe('User Settings and Preferences', () => {
    it('should get user profile', async () => {
      const response = await global.request
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.user.id).toBe(user.id);
      expect(response.body.user.email).toBe(user.email);
    });

    it('should update notification preferences', async () => {
      const preferences = {
        emailNotifications: true,
        scanCompletionEmails: false,
        weeklyReports: true
      };

      const response = await global.request
        .put('/api/user/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ preferences });

      expect(response.status).toBe(200);
      expect(response.body.preferences.emailNotifications).toBe(true);
    });

    it('should manage API keys', async () => {
      const response = await global.request
        .post('/api/user/api-keys')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test API Key',
          permissions: ['read', 'scan']
        });

      expect(response.status).toBe(201);
      expect(response.body.apiKey).toHaveProperty('key');
      expect(response.body.apiKey.name).toBe('Test API Key');
    });
  });

  describe('Webhooks and Events', () => {
    it('should handle GitHub webhook events', async () => {
      const webhookPayload = {
        action: 'opened',
        pull_request: {
          id: 123,
          number: 1,
          title: 'Test PR',
          head: {
            sha: 'abc123'
          }
        },
        repository: {
          full_name: repository.fullName
        }
      };

      const response = await global.request
        .post('/api/webhooks/github')
        .set('X-GitHub-Event', 'pull_request')
        .set('X-Hub-Signature-256', 'sha256=test-signature')
        .send(webhookPayload);

      expect(response.status).toBe(200);
    });

    it('should trigger scan on push events', async () => {
      const pushPayload = {
        ref: 'refs/heads/main',
        commits: [
          {
            id: 'abc123',
            message: 'Update accessibility features'
          }
        ],
        repository: {
          full_name: repository.fullName
        }
      };

      const response = await global.request
        .post('/api/webhooks/github')
        .set('X-GitHub-Event', 'push')
        .send(pushPayload);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('scanTriggered');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed requests', async () => {
      const response = await global.request
        .post('/api/repositories')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          invalidField: 'test'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle unauthorized access to resources', async () => {
      const otherUser = await global.createTestUser({
        email: 'other@example.com',
        githubId: '654321'
      });
      const otherRepo = await global.createTestRepository(otherUser.id);

      const response = await global.request
        .get(`/api/repositories/${otherRepo.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(403);
    });

    it('should handle rate limiting', async () => {
      // Make multiple rapid requests to trigger rate limiting
      const requests = Array.from({ length: 20 }, () =>
        global.request
          .get('/api/repositories')
          .set('Authorization', `Bearer ${authToken}`)
      );

      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(r => r.status === 429);

      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should handle service unavailability gracefully', async () => {
      // This would test fallback mechanisms when external services are down
      const response = await global.request
        .post(`/api/scans/${repository.id}/generate-fixes`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          issueIds: ['non-existent-id']
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('not found');
    });
  });
});