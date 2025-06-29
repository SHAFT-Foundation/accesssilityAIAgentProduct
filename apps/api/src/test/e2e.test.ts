import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import './e2e-setup';

describe('End-to-End Tests', () => {
  describe('Complete User Journey', () => {
    it('should handle complete user onboarding and first scan', async () => {
      // Step 1: User authentication via GitHub OAuth
      const authResponse = await global.request
        .post('/api/auth/github')
        .send({
          code: 'mock_github_oauth_code',
          state: 'secure_state_token'
        });

      expect(authResponse.status).toBe(200);
      expect(authResponse.body).toHaveProperty('token');
      expect(authResponse.body).toHaveProperty('user');

      const { token, user } = authResponse.body;
      const authenticatedRequest = global.request.set('Authorization', `Bearer ${token}`);

      // Step 2: Connect first repository
      const repoResponse = await authenticatedRequest
        .post('/api/repositories')
        .send({
          name: 'my-accessibility-project',
          fullName: 'testuser/my-accessibility-project',
          url: 'https://github.com/testuser/my-accessibility-project',
          private: false,
          defaultBranch: 'main'
        });

      expect(repoResponse.status).toBe(201);
      const repository = repoResponse.body.repository;

      // Step 3: Configure repository settings
      const configResponse = await authenticatedRequest
        .put(`/api/repositories/${repository.id}`)
        .send({
          scanOnPush: true,
          autoCreatePRs: true,
          scanSettings: {
            wcagLevel: 'AA',
            includeWarnings: true,
            excludePaths: ['node_modules/', 'dist/', '*.test.js']
          },
          notificationSettings: {
            email: true,
            slack: false
          }
        });

      expect(configResponse.status).toBe(200);
      expect(configResponse.body.repository.scanOnPush).toBe(true);

      // Step 4: Trigger initial scan
      const scanResponse = await authenticatedRequest
        .post(`/api/repositories/${repository.id}/scan`)
        .send({
          branch: 'main',
          scanType: 'full',
          targetUrl: 'https://my-accessibility-project.netlify.app'
        });

      expect(scanResponse.status).toBe(202);
      const scanId = scanResponse.body.scanId;

      // Step 5: Monitor scan progress
      let scanStatus = 'in_progress';
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds timeout

      while (scanStatus !== 'completed' && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const statusResponse = await authenticatedRequest
          .get(`/api/scans/${scanId}`);
        
        expect(statusResponse.status).toBe(200);
        scanStatus = statusResponse.body.scan.status;
        attempts++;
      }

      expect(scanStatus).toBe('completed');

      // Step 6: Review scan results
      const resultsResponse = await authenticatedRequest
        .get(`/api/scans/${scanId}/results`);

      expect(resultsResponse.status).toBe(200);
      expect(resultsResponse.body.scan.status).toBe('completed');
      expect(resultsResponse.body.issues).toBeDefined();
      expect(Array.isArray(resultsResponse.body.issues)).toBe(true);

      // Step 7: Generate AI fixes for critical issues
      const criticalIssues = resultsResponse.body.issues.filter(
        (issue: any) => issue.severity === 'error'
      );

      if (criticalIssues.length > 0) {
        const fixesResponse = await authenticatedRequest
          .post(`/api/scans/${scanId}/generate-fixes`)
          .send({
            issueIds: criticalIssues.map((issue: any) => issue.id),
            useConsensus: true,
            minConfidence: 0.8
          });

        expect(fixesResponse.status).toBe(200);
        expect(fixesResponse.body.fixes.length).toBeGreaterThan(0);

        // Step 8: Apply high-confidence fixes
        const highConfidenceFixes = fixesResponse.body.fixes.filter(
          (fix: any) => fix.confidence >= 0.8
        );

        if (highConfidenceFixes.length > 0) {
          const applyResponse = await authenticatedRequest
            .post(`/api/repositories/${repository.id}/apply-fixes`)
            .send({
              fixes: highConfidenceFixes,
              createPullRequest: true,
              branch: 'accessibility-improvements',
              prTitle: 'Automated Accessibility Improvements',
              prDescription: 'This PR contains automated fixes for accessibility issues detected by the AI scanner.'
            });

          expect(applyResponse.status).toBe(200);
          expect(applyResponse.body).toHaveProperty('pullRequestUrl');
          expect(applyResponse.body.appliedFixes.length).toBe(highConfidenceFixes.length);
        }
      }

      // Step 9: Verify user dashboard shows updated data
      const dashboardResponse = await authenticatedRequest
        .get('/api/user/dashboard');

      expect(dashboardResponse.status).toBe(200);
      expect(dashboardResponse.body.repositories.length).toBe(1);
      expect(dashboardResponse.body.recentScans.length).toBeGreaterThan(0);
      expect(dashboardResponse.body.totalIssues).toBeGreaterThanOrEqual(0);
    });
  });

  describe('GitHub Integration Workflow', () => {
    let authData: any;

    beforeAll(async () => {
      authData = await global.createAuthenticatedUser();
    });

    it('should handle GitHub webhook events end-to-end', async () => {
      const { user, token, request } = authData;

      // Create repository
      const repository = await global.createTestRepository(user.id, {
        name: 'webhook-test-repo',
        fullName: 'testuser/webhook-test-repo',
        scanOnPush: true
      });

      // Simulate GitHub push webhook
      const pushPayload = {
        ref: 'refs/heads/main',
        commits: [
          {
            id: 'abc123def456',
            message: 'Update accessibility features in header component',
            modified: ['src/components/Header.tsx', 'src/styles/header.css'],
            added: ['src/components/AccessibleButton.tsx']
          }
        ],
        repository: {
          id: 12345,
          full_name: repository.fullName,
          clone_url: repository.url
        },
        pusher: {
          name: 'testuser',
          email: 'test@example.com'
        }
      };

      const webhookResponse = await global.request
        .post('/api/webhooks/github')
        .set('X-GitHub-Event', 'push')
        .set('X-Hub-Signature-256', 'sha256=mock_signature')
        .set('Content-Type', 'application/json')
        .send(pushPayload);

      expect(webhookResponse.status).toBe(200);
      expect(webhookResponse.body.scanTriggered).toBe(true);
      expect(webhookResponse.body).toHaveProperty('scanId');

      // Verify scan was created
      const scanId = webhookResponse.body.scanId;
      const scanResponse = await request
        .get(`/api/scans/${scanId}`);

      expect(scanResponse.status).toBe(200);
      expect(scanResponse.body.scan.repositoryId).toBe(repository.id);
      expect(scanResponse.body.scan.triggerType).toBe('webhook');
      expect(scanResponse.body.scan.commit).toBe('abc123def456');
    });

    it('should handle pull request webhook events', async () => {
      const { user, request } = authData;

      const repository = await global.createTestRepository(user.id, {
        autoCreatePRs: true
      });

      // Simulate GitHub PR opened webhook
      const prPayload = {
        action: 'opened',
        number: 42,
        pull_request: {
          id: 987654321,
          number: 42,
          title: 'Add new feature',
          body: 'This PR adds a new feature to the application',
          head: {
            ref: 'feature-branch',
            sha: 'feature123abc'
          },
          base: {
            ref: 'main',
            sha: 'main456def'
          },
          html_url: 'https://github.com/testuser/repo/pull/42'
        },
        repository: {
          full_name: repository.fullName
        }
      };

      const webhookResponse = await global.request
        .post('/api/webhooks/github')
        .set('X-GitHub-Event', 'pull_request')
        .set('X-Hub-Signature-256', 'sha256=mock_signature')
        .send(prPayload);

      expect(webhookResponse.status).toBe(200);
      expect(webhookResponse.body.scanTriggered).toBe(true);

      // Verify PR-specific scan was created
      const scanResponse = await request
        .get(`/api/scans/${webhookResponse.body.scanId}`);

      expect(scanResponse.status).toBe(200);
      expect(scanResponse.body.scan.triggerType).toBe('pull_request');
      expect(scanResponse.body.scan.pullRequestNumber).toBe(42);
    });
  });

  describe('AI-Powered Accessibility Review Workflow', () => {
    let authData: any;
    let repository: any;

    beforeAll(async () => {
      authData = await global.createAuthenticatedUser();
      repository = await global.createTestRepository(authData.user.id);
    });

    it('should perform comprehensive AI review and consensus', async () => {
      const { request } = authData;

      // Create a scan with complex accessibility issues
      const scan = await global.createTestScan(repository.id, {
        status: 'completed',
        issuesFound: 5
      });

      const complexIssues = await Promise.all([
        // Image accessibility issue
        global.createTestIssue(scan.id, {
          type: 'missing_alt_text',
          code: '<img src="product-hero.jpg" class="hero-image">',
          filePath: 'src/pages/Home.tsx',
          line: 23,
          column: 8,
          description: 'Hero image missing alternative text'
        }),
        // Color contrast issue
        global.createTestIssue(scan.id, {
          type: 'low_contrast',
          code: '<button class="cta-button" style="background: #ff6b6b; color: #ffffff;">',
          filePath: 'src/components/CallToAction.tsx',
          line: 15,
          column: 12,
          description: 'Button has insufficient color contrast'
        }),
        // Form accessibility issue
        global.createTestIssue(scan.id, {
          type: 'missing_label',
          code: '<input type="email" name="newsletter" placeholder="Enter your email">',
          filePath: 'src/components/Newsletter.tsx',
          line: 8,
          column: 6,
          description: 'Input field missing accessible label'
        }),
        // Interactive element issue
        global.createTestIssue(scan.id, {
          type: 'missing_focus_indicator',
          code: '<div class="clickable-card" onclick="navigateToProduct()">',
          filePath: 'src/components/ProductCard.tsx',
          line: 35,
          column: 4,
          description: 'Interactive element missing focus indicator'
        }),
        // Heading structure issue
        global.createTestIssue(scan.id, {
          type: 'invalid_heading_structure',
          code: '<h1>Page Title</h1>\n<h3>Section Title</h3>',
          filePath: 'src/pages/About.tsx',
          line: 12,
          column: 0,
          description: 'Heading structure skips from h1 to h3'
        })
      ]);

      // Generate AI-powered fixes with consensus
      const fixesResponse = await request
        .post(`/api/scans/${scan.id}/generate-fixes`)
        .send({
          issueIds: complexIssues.map(issue => issue.id),
          useConsensus: true,
          reviewDepth: 'thorough',
          considerContext: true,
          includeExplanations: true
        });

      expect(fixesResponse.status).toBe(200);
      expect(fixesResponse.body.fixes.length).toBe(5);

      // Verify each fix has proper AI consensus data
      fixesResponse.body.fixes.forEach((fix: any) => {
        expect(fix).toHaveProperty('originalCode');
        expect(fix).toHaveProperty('fixedCode');
        expect(fix).toHaveProperty('explanation');
        expect(fix).toHaveProperty('confidence');
        expect(fix).toHaveProperty('consensus');
        
        expect(fix.consensus).toHaveProperty('claudeReview');
        expect(fix.consensus).toHaveProperty('chatgptReview');
        expect(fix.consensus).toHaveProperty('agreement');
        expect(fix.consensus).toHaveProperty('finalConfidence');
        
        expect(fix.confidence).toBeGreaterThan(0);
        expect(fix.confidence).toBeLessThanOrEqual(1);
      });

      // Validate fixes by applying them
      const validationResponse = await request
        .post('/api/fixes/validate-batch')
        .send({
          fixes: fixesResponse.body.fixes
        });

      expect(validationResponse.status).toBe(200);
      expect(validationResponse.body.validationResults.length).toBe(5);

      // Apply high-confidence fixes
      const highConfidenceFixes = fixesResponse.body.fixes.filter(
        (fix: any) => fix.confidence >= 0.8
      );

      if (highConfidenceFixes.length > 0) {
        const applyResponse = await request
          .post(`/api/repositories/${repository.id}/apply-fixes`)
          .send({
            fixes: highConfidenceFixes,
            createPullRequest: true,
            branch: 'ai-accessibility-fixes',
            commitMessage: 'feat: AI-powered accessibility improvements\n\nAutomated fixes generated by dual-AI review system with high confidence scores.',
            prTitle: 'AI-Generated Accessibility Improvements',
            prDescription: `## Accessibility Improvements\n\nThis PR contains ${highConfidenceFixes.length} AI-generated accessibility fixes with high confidence scores.\n\n### Fixes Applied:\n${highConfidenceFixes.map((fix: any, index: number) => `${index + 1}. ${fix.explanation}`).join('\n')}\n\n### AI Review Details:\n- Generated using Claude 3.5 Sonnet and GPT-4\n- Consensus-based approach for high accuracy\n- All fixes have confidence scores ≥ 80%`
          });

        expect(applyResponse.status).toBe(200);
        expect(applyResponse.body).toHaveProperty('pullRequestUrl');
        expect(applyResponse.body.appliedFixes.length).toBe(highConfidenceFixes.length);
      }
    });

    it('should handle AI service degradation gracefully', async () => {
      const { request } = authData;

      // Simulate AI service issues
      process.env.SIMULATE_AI_DEGRADATION = 'true';

      const scan = await global.createTestScan(repository.id);
      const issue = await global.createTestIssue(scan.id);

      const fixesResponse = await request
        .post(`/api/scans/${scan.id}/generate-fixes`)
        .send({
          issueIds: [issue.id],
          fallbackToRules: true,
          maxRetries: 2
        });

      expect(fixesResponse.status).toBe(200);
      expect(fixesResponse.body.fixes.length).toBe(1);
      
      const fix = fixesResponse.body.fixes[0];
      expect(fix).toHaveProperty('fallback');
      expect(fix.fallback).toBe(true);
      expect(fix.confidence).toBeLessThan(0.7); // Lower confidence for rule-based fixes

      // Clean up
      delete process.env.SIMULATE_AI_DEGRADATION;
    });
  });

  describe('Performance and Scalability', () => {
    let authData: any;

    beforeAll(async () => {
      authData = await global.createAuthenticatedUser();
    });

    it('should handle large repository scans efficiently', async () => {
      const { user, request } = authData;

      // Create repository with large scan configuration
      const largeRepo = await global.createTestRepository(user.id, {
        name: 'large-enterprise-app',
        scanSettings: {
          maxFiles: 1000,
          maxIssuesPerScan: 500,
          timeoutMinutes: 30
        }
      });

      const startTime = Date.now();

      // Initiate large scan
      const scanResponse = await request
        .post(`/api/repositories/${largeRepo.id}/scan`)
        .send({
          branch: 'main',
          scanType: 'comprehensive',
          includeSubdirectories: true,
          maxDepth: 10
        });

      expect(scanResponse.status).toBe(202);
      const scanId = scanResponse.body.scanId;

      // Monitor scan performance
      let scanCompleted = false;
      let scanDuration = 0;
      const maxWaitTime = 60000; // 1 minute max

      while (!scanCompleted && scanDuration < maxWaitTime) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const statusResponse = await request
          .get(`/api/scans/${scanId}`);
        
        scanDuration = Date.now() - startTime;
        
        if (statusResponse.body.scan.status === 'completed') {
          scanCompleted = true;
        }
      }

      expect(scanCompleted).toBe(true);
      expect(scanDuration).toBeLessThan(maxWaitTime);

      // Verify scan results
      const resultsResponse = await request
        .get(`/api/scans/${scanId}/results`);

      expect(resultsResponse.status).toBe(200);
      expect(resultsResponse.body.scan.status).toBe('completed');
      expect(resultsResponse.body.scan.performance).toBeDefined();
      expect(resultsResponse.body.scan.performance.scanDuration).toBeGreaterThan(0);
    });

    it('should handle concurrent user operations', async () => {
      const users = await Promise.all([
        global.createAuthenticatedUser(),
        global.createAuthenticatedUser(),
        global.createAuthenticatedUser()
      ]);

      // Each user performs operations concurrently
      const operations = users.map(async (userData, index) => {
        const { user, request } = userData;
        
        // Create repository
        const repo = await global.createTestRepository(user.id, {
          name: `concurrent-repo-${index}`
        });

        // Start scan
        const scanResponse = await request
          .post(`/api/repositories/${repo.id}/scan`)
          .send({ branch: 'main' });

        expect(scanResponse.status).toBe(202);
        return scanResponse.body.scanId;
      });

      const scanIds = await Promise.all(operations);
      expect(scanIds.length).toBe(3);
      
      // Verify all scans are running independently
      const statusChecks = scanIds.map(scanId =>
        users[0].request.get(`/api/scans/${scanId}`)
      );

      const statuses = await Promise.all(statusChecks);
      statuses.forEach(status => {
        expect(['in_progress', 'queued', 'completed']).toContain(
          status.body.scan.status
        );
      });
    });
  });

  describe('Security and Authorization', () => {
    it('should enforce proper access controls', async () => {
      // Create two separate users
      const user1 = await global.createAuthenticatedUser();
      const user2 = await global.createAuthenticatedUser();

      // User 1 creates a private repository
      const privateRepo = await global.createTestRepository(user1.user.id, {
        name: 'private-repo',
        private: true
      });

      // User 2 attempts to access User 1's private repository
      const unauthorizedResponse = await user2.request
        .get(`/api/repositories/${privateRepo.id}`);

      expect(unauthorizedResponse.status).toBe(403);

      // User 2 attempts to scan User 1's repository
      const scanAttempt = await user2.request
        .post(`/api/repositories/${privateRepo.id}/scan`)
        .send({ branch: 'main' });

      expect(scanAttempt.status).toBe(403);

      // Verify User 1 can still access their own repository
      const authorizedResponse = await user1.request
        .get(`/api/repositories/${privateRepo.id}`);

      expect(authorizedResponse.status).toBe(200);
      expect(authorizedResponse.body.repository.id).toBe(privateRepo.id);
    });

    it('should validate and sanitize all inputs', async () => {
      const { request } = await global.createAuthenticatedUser();

      // Test SQL injection attempts
      const maliciousInputs = [
        "'; DROP TABLE users; --",
        '<script>alert("xss")</script>',
        '${process.env.SECRET_KEY}',
        '../../../etc/passwd'
      ];

      for (const maliciousInput of maliciousInputs) {
        const response = await request
          .post('/api/repositories')
          .send({
            name: maliciousInput,
            fullName: `test/${maliciousInput}`,
            url: `https://github.com/test/${maliciousInput}`
          });

        // Should either reject with 400 or sanitize the input
        if (response.status === 201) {
          // If accepted, verify input was sanitized
          expect(response.body.repository.name).not.toBe(maliciousInput);
        } else {
          expect(response.status).toBe(400);
        }
      }
    });

    it('should handle rate limiting correctly', async () => {
      const { request } = await global.createAuthenticatedUser();

      // Make rapid requests to trigger rate limiting
      const rapidRequests = Array.from({ length: 50 }, () =>
        request.get('/api/user/profile')
      );

      const responses = await Promise.all(rapidRequests);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);

      // Verify rate limit headers are present
      const rateLimitedResponse = rateLimitedResponses[0];
      expect(rateLimitedResponse.headers).toHaveProperty('x-ratelimit-limit');
      expect(rateLimitedResponse.headers).toHaveProperty('x-ratelimit-remaining');
      expect(rateLimitedResponse.headers).toHaveProperty('x-ratelimit-reset');
    });
  });

  describe('Error Recovery and Resilience', () => {
    let authData: any;

    beforeAll(async () => {
      authData = await global.createAuthenticatedUser();
    });

    it('should recover from database connection issues', async () => {
      const { request } = authData;

      // Simulate database connection issue
      process.env.SIMULATE_DB_ERROR = 'connection_timeout';

      const response = await request
        .get('/api/repositories')
        .retry(3); // Should retry on database errors

      // Should either succeed after retry or return appropriate error
      expect([200, 503]).toContain(response.status);

      if (response.status === 503) {
        expect(response.body.error).toContain('temporarily unavailable');
      }

      // Clean up
      delete process.env.SIMULATE_DB_ERROR;
    });

    it('should handle external service failures gracefully', async () => {
      const { user, request } = authData;

      const repository = await global.createTestRepository(user.id);
      const scan = await global.createTestScan(repository.id);
      const issue = await global.createTestIssue(scan.id);

      // Simulate external service failures
      process.env.SIMULATE_GITHUB_API_ERROR = 'true';
      process.env.SIMULATE_AI_API_ERROR = 'true';

      const fixesResponse = await request
        .post(`/api/scans/${scan.id}/generate-fixes`)
        .send({
          issueIds: [issue.id],
          enableFallbacks: true
        });

      // Should still provide some response, even if degraded
      expect([200, 206, 503]).toContain(fixesResponse.status);

      if (fixesResponse.status === 200) {
        expect(fixesResponse.body.fixes[0]).toHaveProperty('fallback');
        expect(fixesResponse.body.fixes[0].fallback).toBe(true);
      }

      // Clean up
      delete process.env.SIMULATE_GITHUB_API_ERROR;
      delete process.env.SIMULATE_AI_API_ERROR;
    });
  });
});