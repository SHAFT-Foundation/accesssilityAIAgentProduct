import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import './integration-setup';

describe('End-to-End Workflow Integration Tests', () => {
  let testData: any;

  beforeAll(async () => {
    testData = await global.createCompleteWorkflow();
  });

  describe('Complete Accessibility Scanning Workflow', () => {
    it('should execute full scan-to-fix workflow', async () => {
      const { user, repository, token, request } = testData;

      // Step 1: Initiate scan
      const scanResponse = await request
        .post(`/api/repositories/${repository.id}/scan`)
        .send({
          branch: 'main',
          targetUrl: 'https://example.com'
        });

      expect(scanResponse.status).toBe(202);
      const scanId = scanResponse.body.scanId;

      // Step 2: Wait for scan completion (simulate)
      await global.testPrisma.scan.update({
        where: { id: scanId },
        data: {
          status: 'completed',
          issuesFound: 3,
          completedAt: new Date()
        }
      });

      // Step 3: Verify scan results
      const resultsResponse = await request
        .get(`/api/scans/${scanId}/results`);

      expect(resultsResponse.status).toBe(200);
      expect(resultsResponse.body.scan.status).toBe('completed');

      // Step 4: Generate AI fixes
      const fixesResponse = await request
        .post(`/api/scans/${scanId}/generate-fixes`)
        .send({
          issueIds: resultsResponse.body.issues.map((i: any) => i.id)
        });

      expect(fixesResponse.status).toBe(200);
      expect(fixesResponse.body.fixes.length).toBeGreaterThan(0);

      // Step 5: Apply fixes and create PR
      const applyResponse = await request
        .post(`/api/repositories/${repository.id}/apply-fixes`)
        .send({
          fixes: fixesResponse.body.fixes,
          createPullRequest: true,
          branch: 'auto-accessibility-fixes'
        });

      expect(applyResponse.status).toBe(200);
      expect(applyResponse.body).toHaveProperty('pullRequestUrl');
    });

    it('should handle partial fix application', async () => {
      const { repository, request } = testData;

      // Create a scan with mixed fix qualities
      const scan = await global.createTestScan(repository.id);
      const issues = await Promise.all([
        global.createTestIssue(scan.id, { 
          type: 'missing_alt_text',
          confidence: 0.9 
        }),
        global.createTestIssue(scan.id, { 
          type: 'low_contrast',
          confidence: 0.3 // Low confidence fix
        }),
        global.createTestIssue(scan.id, { 
          type: 'missing_label',
          confidence: 0.8 
        })
      ]);

      // Generate fixes
      const fixesResponse = await request
        .post(`/api/scans/${scan.id}/generate-fixes`)
        .send({
          issueIds: issues.map(i => i.id),
          minConfidence: 0.7 // Only apply high-confidence fixes
        });

      expect(fixesResponse.status).toBe(200);
      
      // Should only include fixes above confidence threshold
      const highConfidenceFixes = fixesResponse.body.fixes.filter(
        (f: any) => f.confidence >= 0.7
      );
      expect(highConfidenceFixes.length).toBe(2);

      // Apply only high-confidence fixes
      const applyResponse = await request
        .post(`/api/repositories/${repository.id}/apply-fixes`)
        .send({
          fixes: highConfidenceFixes,
          createPullRequest: true
        });

      expect(applyResponse.status).toBe(200);
      expect(applyResponse.body.appliedFixes.length).toBe(2);
      expect(applyResponse.body.skippedFixes.length).toBe(1);
    });
  });

  describe('Repository Integration Workflow', () => {
    it('should handle new repository onboarding', async () => {
      const { user, token, request } = testData;

      // Step 1: Connect new repository
      const repoData = {
        name: 'new-accessibility-project',
        fullName: 'test-user/new-accessibility-project',
        url: 'https://github.com/test-user/new-accessibility-project',
        private: false,
        defaultBranch: 'main'
      };

      const connectResponse = await request
        .post('/api/repositories')
        .send(repoData);

      expect(connectResponse.status).toBe(201);
      const newRepo = connectResponse.body.repository;

      // Step 2: Configure scanning preferences
      const configResponse = await request
        .put(`/api/repositories/${newRepo.id}`)
        .send({
          scanOnPush: true,
          autoCreatePRs: true,
          scanSettings: {
            includeWarnings: true,
            wcagLevel: 'AA',
            excludePaths: ['node_modules/', 'dist/']
          }
        });

      expect(configResponse.status).toBe(200);
      expect(configResponse.body.repository.scanOnPush).toBe(true);

      // Step 3: Perform initial scan
      const initialScanResponse = await request
        .post(`/api/repositories/${newRepo.id}/scan`)
        .send({
          branch: 'main',
          scanType: 'full'
        });

      expect(initialScanResponse.status).toBe(202);

      // Step 4: Verify webhook setup
      const webhookResponse = await request
        .get(`/api/repositories/${newRepo.id}/webhooks`);

      expect(webhookResponse.status).toBe(200);
      expect(webhookResponse.body.webhooks.length).toBeGreaterThan(0);
    });

    it('should handle repository settings updates', async () => {
      const { repository, request } = testData;

      // Update multiple settings at once
      const updateResponse = await request
        .put(`/api/repositories/${repository.id}`)
        .send({
          scanOnPush: false,
          autoCreatePRs: true,
          notificationSettings: {
            email: true,
            slack: false,
            webhook: 'https://example.com/webhook'
          },
          scanSettings: {
            wcagLevel: 'AAA',
            includeWarnings: false,
            customRules: ['custom-rule-1', 'custom-rule-2']
          }
        });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.repository.scanOnPush).toBe(false);
      expect(updateResponse.body.repository.scanSettings.wcagLevel).toBe('AAA');
    });
  });

  describe('AI Review and Consensus Workflow', () => {
    it('should demonstrate AI consensus mechanism', async () => {
      const { repository, request } = testData;

      // Create issues with different complexity levels
      const scan = await global.createTestScan(repository.id);
      const complexIssue = await global.createTestIssue(scan.id, {
        type: 'complex_table_structure',
        code: '<table><tr><td>Data</td></tr></table>',
        description: 'Complex table requiring multiple accessibility improvements'
      });

      // Generate fixes with AI review
      const fixesResponse = await request
        .post(`/api/scans/${scan.id}/generate-fixes`)
        .send({
          issueIds: [complexIssue.id],
          useConsensus: true,
          reviewDepth: 'thorough'
        });

      expect(fixesResponse.status).toBe(200);
      const fix = fixesResponse.body.fixes[0];

      // Verify consensus data
      expect(fix).toHaveProperty('consensus');
      expect(fix.consensus).toHaveProperty('claudeReview');
      expect(fix.consensus).toHaveProperty('chatgptReview');
      expect(fix.consensus).toHaveProperty('agreement');
      expect(fix.consensus).toHaveProperty('finalConfidence');

      // High agreement should result in high confidence
      if (fix.consensus.agreement === 'high') {
        expect(fix.confidence).toBeGreaterThan(0.8);
      }
    });

    it('should handle AI disagreement and escalation', async () => {
      const { repository, request } = testData;

      const scan = await global.createTestScan(repository.id);
      const ambiguousIssue = await global.createTestIssue(scan.id, {
        type: 'ambiguous_context',
        code: '<div onclick="handleClick()">Click here</div>',
        description: 'Interactive element with unclear purpose'
      });

      const fixesResponse = await request
        .post(`/api/scans/${scan.id}/generate-fixes`)
        .send({
          issueIds: [ambiguousIssue.id],
          useConsensus: true
        });

      expect(fixesResponse.status).toBe(200);
      const fix = fixesResponse.body.fixes[0];

      // When AIs disagree, should flag for human review
      if (fix.consensus.agreement === 'low') {
        expect(fix.status).toBe('requires_review');
        expect(fix).toHaveProperty('conflictReasons');
        expect(fix.confidence).toBeLessThan(0.6);
      }
    });
  });

  describe('Cost Tracking and Optimization Workflow', () => {
    it('should track AI usage costs across workflow', async () => {
      const { user, repository, request } = testData;

      // Perform multiple AI operations
      const scan = await global.createTestScan(repository.id);
      const issues = await Promise.all([
        global.createTestIssue(scan.id, { type: 'missing_alt_text' }),
        global.createTestIssue(scan.id, { type: 'low_contrast' }),
        global.createTestIssue(scan.id, { type: 'missing_label' })
      ]);

      // Generate fixes (uses AI)
      await request
        .post(`/api/scans/${scan.id}/generate-fixes`)
        .send({
          issueIds: issues.map(i => i.id)
        });

      // Check cost tracking
      const costResponse = await request
        .get(`/api/user/usage-stats`)
        .query({
          period: '24h'
        });

      expect(costResponse.status).toBe(200);
      expect(costResponse.body.usage).toHaveProperty('aiCalls');
      expect(costResponse.body.usage).toHaveProperty('tokenUsage');
      expect(costResponse.body.usage).toHaveProperty('estimatedCost');
      expect(costResponse.body.usage.aiCalls.total).toBeGreaterThan(0);
    });

    it('should respect usage limits and quotas', async () => {
      const { request } = testData;

      // Update user to have low quota
      await global.testPrisma.user.update({
        where: { id: testData.user.id },
        data: {
          plan: 'free',
          monthlyQuota: 100,
          currentUsage: 95 // Near limit
        }
      });

      const scan = await global.createTestScan(testData.repository.id);
      const issues = await Promise.all(
        Array.from({ length: 10 }, (_, i) => 
          global.createTestIssue(scan.id, { type: 'missing_alt_text' })
        )
      );

      // Attempt to generate fixes that would exceed quota
      const fixesResponse = await request
        .post(`/api/scans/${scan.id}/generate-fixes`)
        .send({
          issueIds: issues.map(i => i.id)
        });

      // Should either limit the request or return quota exceeded
      expect([200, 402]).toContain(fixesResponse.status);
      
      if (fixesResponse.status === 402) {
        expect(fixesResponse.body.error).toContain('quota');
      } else {
        // Should process only what fits within quota
        expect(fixesResponse.body.fixes.length).toBeLessThan(issues.length);
      }
    });
  });

  describe('Performance and Scalability Workflow', () => {
    it('should handle bulk operations efficiently', async () => {
      const { repository, request } = testData;

      // Create a large scan with many issues
      const scan = await global.createTestScan(repository.id);
      const issues = await Promise.all(
        Array.from({ length: 50 }, (_, i) => 
          global.createTestIssue(scan.id, { 
            type: i % 3 === 0 ? 'missing_alt_text' : 
                  i % 3 === 1 ? 'low_contrast' : 'missing_label',
            element: `<element-${i}>Content</element-${i}>`
          })
        )
      );

      const startTime = Date.now();

      // Process all issues
      const fixesResponse = await request
        .post(`/api/scans/${scan.id}/generate-fixes`)
        .send({
          issueIds: issues.map(i => i.id),
          batchSize: 10 // Process in batches
        });

      const duration = Date.now() - startTime;

      expect(fixesResponse.status).toBe(200);
      expect(fixesResponse.body.fixes.length).toBe(50);
      expect(duration).toBeLessThan(60000); // Should complete within 1 minute
    });

    it('should handle concurrent scans', async () => {
      const { user, request } = testData;

      // Create multiple repositories
      const repositories = await Promise.all([
        global.createTestRepository(user.id, { name: 'repo-1' }),
        global.createTestRepository(user.id, { name: 'repo-2' }),
        global.createTestRepository(user.id, { name: 'repo-3' })
      ]);

      // Start concurrent scans
      const scanPromises = repositories.map(repo =>
        request
          .post(`/api/repositories/${repo.id}/scan`)
          .send({
            branch: 'main',
            targetUrl: `https://example-${repo.name}.com`
          })
      );

      const scanResponses = await Promise.all(scanPromises);

      // All scans should start successfully
      scanResponses.forEach(response => {
        expect(response.status).toBe(202);
        expect(response.body).toHaveProperty('scanId');
      });

      // Verify all scans are tracked
      const statusPromises = scanResponses.map(response =>
        request.get(`/api/scans/${response.body.scanId}`)
      );

      const statusResponses = await Promise.all(statusPromises);
      statusResponses.forEach(response => {
        expect(response.status).toBe(200);
        expect(['in_progress', 'queued', 'completed']).toContain(
          response.body.scan.status
        );
      });
    });
  });

  describe('Error Recovery and Resilience Workflow', () => {
    it('should recover from partial failures', async () => {
      const { repository, request } = testData;

      const scan = await global.createTestScan(repository.id);
      const issues = await Promise.all([
        global.createTestIssue(scan.id, { type: 'missing_alt_text' }),
        global.createTestIssue(scan.id, { type: 'invalid_issue_type' }), // This should fail
        global.createTestIssue(scan.id, { type: 'low_contrast' })
      ]);

      // Attempt to generate fixes with one invalid issue
      const fixesResponse = await request
        .post(`/api/scans/${scan.id}/generate-fixes`)
        .send({
          issueIds: issues.map(i => i.id),
          continueOnError: true
        });

      expect(fixesResponse.status).toBe(200);
      // Should successfully process valid issues despite one failure
      expect(fixesResponse.body.fixes.length).toBe(2);
      expect(fixesResponse.body.errors.length).toBe(1);
      expect(fixesResponse.body.errors[0]).toHaveProperty('issueId');
      expect(fixesResponse.body.errors[0]).toHaveProperty('error');
    });

    it('should handle external service failures gracefully', async () => {
      const { repository, request } = testData;

      // Simulate external service unavailability
      process.env.SIMULATE_AI_SERVICE_FAILURE = 'true';

      const scan = await global.createTestScan(repository.id);
      const issue = await global.createTestIssue(scan.id);

      const fixesResponse = await request
        .post(`/api/scans/${scan.id}/generate-fixes`)
        .send({
          issueIds: [issue.id],
          fallbackToRules: true
        });

      // Should fall back to rule-based fixes when AI services fail
      expect(fixesResponse.status).toBe(200);
      expect(fixesResponse.body.fixes.length).toBe(1);
      expect(fixesResponse.body.fixes[0]).toHaveProperty('fallback');
      expect(fixesResponse.body.fixes[0].fallback).toBe(true);

      // Clean up
      delete process.env.SIMULATE_AI_SERVICE_FAILURE;
    });
  });
});