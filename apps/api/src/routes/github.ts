import express from 'express';
import { GitHubService } from '../services/github';
import { PRGenerationService, PRGenerationJob } from '../services/prGenerationService';
import { WebhookHandler } from '../services/webhookHandler';
import { requireAuth } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { AuditLogger } from '../services/auditLogger';
import { logger } from '../utils/logger';
import { z } from 'zod';

const router = express.Router();
const githubService = new GitHubService();
const prGenerationService = new PRGenerationService();
const webhookHandler = new WebhookHandler();
const auditLogger = new AuditLogger();

// Validation schemas
const createPRJobSchema = z.object({
  repositoryFullName: z.string().regex(/^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/),
  issueIds: z.array(z.string()).min(1).max(50),
  baseBranch: z.string().min(1).max(100).default('main'),
  options: z.object({
    groupSimilarIssues: z.boolean().default(true),
    maxIssuesPerPR: z.number().min(1).max(20).default(5),
    runTests: z.boolean().default(true),
    createDraftPR: z.boolean().default(false),
    autoMergeIfTestsPass: z.boolean().default(false),
    reviewersToAdd: z.array(z.string()).max(10).default([]),
    labelsToAdd: z.array(z.string()).max(10).default(['accessibility', 'automated-fix']),
  }).default({}),
});

/**
 * GET /api/github/auth-url
 * Get GitHub App installation URL
 */
router.get('/auth-url', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const state = req.query.state as string;

    const authUrl = githubService.getInstallationUrl(userId, state);

    await auditLogger.logUserAction({
      userId,
      action: 'github_auth_url_requested',
      resource: 'github_auth',
      details: { state },
      severity: 'info',
      category: 'auth',
      source: 'api',
      outcome: 'success',
    });

    res.json({ authUrl });
  } catch (error) {
    logger.error('Failed to get GitHub auth URL', {
      userId: req.user?.id,
      error: error.message,
    });
    res.status(500).json({ error: 'Failed to get authorization URL' });
  }
});

/**
 * GET /api/github/installations
 * Get user's GitHub installations
 */
router.get('/installations', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const installations = await githubService.getUserInstallations(userId);

    res.json({ installations });
  } catch (error) {
    logger.error('Failed to get GitHub installations', {
      userId: req.user?.id,
      error: error.message,
    });
    res.status(500).json({ error: 'Failed to get installations' });
  }
});

/**
 * GET /api/github/repositories
 * Get accessible repositories for user
 */
router.get('/repositories', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const installationId = req.query.installationId as string;

    const repositories = await githubService.getAccessibleRepositories(userId, installationId);

    res.json({ repositories });
  } catch (error) {
    logger.error('Failed to get accessible repositories', {
      userId: req.user?.id,
      error: error.message,
    });
    res.status(500).json({ error: 'Failed to get repositories' });
  }
});

/**
 * GET /api/github/repositories/:owner/:repo
 * Get specific repository details
 */
router.get('/repositories/:owner/:repo', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { owner, repo } = req.params;
    const repoFullName = `${owner}/${repo}`;

    const repository = await githubService.getRepository(userId, repoFullName);

    if (!repository) {
      return res.status(404).json({ error: 'Repository not found or no access' });
    }

    res.json({ repository });
  } catch (error) {
    logger.error('Failed to get repository details', {
      userId: req.user?.id,
      repository: `${req.params.owner}/${req.params.repo}`,
      error: error.message,
    });
    res.status(500).json({ error: 'Failed to get repository details' });
  }
});

/**
 * POST /api/github/repositories/:owner/:repo/accessibility-fixes
 * Generate pull requests with accessibility fixes
 */
router.post(
  '/repositories/:owner/:repo/accessibility-fixes',
  requireAuth,
  validateRequest(createPRJobSchema),
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { owner, repo } = req.params;
      const repoFullName = `${owner}/${repo}`;
      const { issueIds, baseBranch, options } = req.body;

      // Verify repository access
      const hasAccess = await githubService.hasRepositoryAccess(userId, repoFullName);
      if (!hasAccess) {
        return res.status(403).json({ error: 'No access to repository' });
      }

      // Get accessibility issues
      const issues = await getAccessibilityIssues(issueIds);
      if (issues.length === 0) {
        return res.status(404).json({ error: 'No accessibility issues found' });
      }

      // Create PR generation job
      const job: PRGenerationJob = {
        id: `pr_job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        repositoryFullName: repoFullName,
        issues,
        baseBranch,
        options: {
          groupSimilarIssues: true,
          maxIssuesPerPR: 5,
          runTests: true,
          createDraftPR: false,
          autoMergeIfTestsPass: false,
          reviewersToAdd: [],
          labelsToAdd: ['accessibility', 'automated-fix'],
          ...options,
        },
        metadata: {
          priority: 'normal',
          retryCount: 0,
          maxRetries: 3,
        },
      };

      // Start PR generation (async)
      const result = await prGenerationService.generatePullRequests(job);

      // Log successful PR generation
      await auditLogger.logUserAction({
        userId,
        action: 'accessibility_prs_generated',
        resource: 'pull_requests',
        details: {
          repository: repoFullName,
          jobId: job.id,
          issueCount: issues.length,
          prCount: result.pullRequests.length,
          summary: result.summary,
        },
        severity: 'info',
        category: 'scan',
        source: 'api',
        outcome: 'success',
      });

      res.json({
        success: true,
        jobId: job.id,
        result,
      });

    } catch (error) {
      logger.error('Failed to generate accessibility fixes', {
        userId: req.user?.id,
        repository: `${req.params.owner}/${req.params.repo}`,
        error: error.message,
      });

      await auditLogger.logUserAction({
        userId: req.user.id,
        action: 'accessibility_prs_generation_failed',
        resource: 'pull_requests',
        details: {
          repository: `${req.params.owner}/${req.params.repo}`,
          error: error.message,
        },
        severity: 'error',
        category: 'scan',
        source: 'api',
        outcome: 'failure',
      });

      res.status(500).json({ 
        error: 'Failed to generate accessibility fixes',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

/**
 * GET /api/github/repositories/:owner/:repo/branches
 * Get repository branches
 */
router.get('/repositories/:owner/:repo/branches', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { owner, repo } = req.params;
    const repoFullName = `${owner}/${repo}`;

    // Verify access
    const hasAccess = await githubService.hasRepositoryAccess(userId, repoFullName);
    if (!hasAccess) {
      return res.status(403).json({ error: 'No access to repository' });
    }

    // Get repository details which includes default branch
    const repository = await githubService.getRepository(userId, repoFullName);
    if (!repository) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    // For now, return the default branch
    // In production, you'd fetch all branches from GitHub API
    res.json({
      branches: [
        {
          name: repository.defaultBranch,
          protected: true,
          isDefault: true,
        },
      ],
    });

  } catch (error) {
    logger.error('Failed to get repository branches', {
      userId: req.user?.id,
      repository: `${req.params.owner}/${req.params.repo}`,
      error: error.message,
    });
    res.status(500).json({ error: 'Failed to get repository branches' });
  }
});

/**
 * POST /api/github/webhooks
 * Handle GitHub webhooks (no auth required, signature verified)
 */
router.post('/webhooks', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['x-hub-signature-256'] as string;
    const event = req.headers['x-github-event'] as string;
    const deliveryId = req.headers['x-github-delivery'] as string;
    const payload = req.body.toString();

    if (!signature || !event || !deliveryId) {
      logger.warn('Invalid webhook request - missing headers', {
        hasSignature: !!signature,
        hasEvent: !!event,
        hasDeliveryId: !!deliveryId,
      });
      return res.status(400).json({ error: 'Missing required headers' });
    }

    // Handle the webhook
    const result = await webhookHandler.handleWebhook(event, payload, signature, deliveryId);

    if (result.success) {
      res.status(200).json({ message: result.message });
    } else {
      res.status(400).json({ error: result.message });
    }

  } catch (error) {
    logger.error('Webhook handling failed', {
      event: req.headers['x-github-event'],
      deliveryId: req.headers['x-github-delivery'],
      error: error.message,
    });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * GET /api/github/webhooks/health
 * Webhook health check endpoint
 */
router.get('/webhooks/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'github-webhooks',
  });
});

/**
 * Helper function to get accessibility issues
 */
async function getAccessibilityIssues(issueIds: string[]): Promise<any[]> {
  try {
    // This would query your database for accessibility issues
    // For now, return mock data based on issue IDs
    const mockIssues = issueIds.map(id => ({
      id,
      type: 'missing_alt_text',
      severity: 'critical',
      wcagCriteria: '1.1.1',
      title: 'Image missing alt text',
      description: 'This image does not have alternative text for screen readers',
      impact: 'Screen reader users cannot understand the content',
      selector: 'img:nth-of-type(1)',
      html: '<img src="example.jpg">',
      fix: {
        type: 'attribute',
        description: 'Add alt text to image',
        suggestedCode: '<img src="example.jpg" alt="Descriptive alt text">',
        explanation: 'Alt text provides a text alternative for images',
        confidence: 0.9,
      },
      context: {
        pageTitle: 'Example Page',
        pageUrl: 'https://example.com',
        parentElements: ['div', 'section'],
      },
    }));

    return mockIssues;
  } catch (error) {
    logger.error('Failed to get accessibility issues', {
      issueIds,
      error: error.message,
    });
    return [];
  }
}

// Error handling middleware for this router
router.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('GitHub API error', {
    path: req.path,
    method: req.method,
    error: error.message,
    userId: req.user?.id,
  });

  res.status(500).json({
    error: 'Internal server error',
    path: req.path,
    timestamp: new Date().toISOString(),
  });
});

export default router;