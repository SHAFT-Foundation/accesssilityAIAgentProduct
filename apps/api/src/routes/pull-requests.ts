import { Router, Request, Response } from 'express';
import { authenticateSession } from '../middleware/auth';
import { asyncHandler } from '../middleware/error-handler';
import { prisma } from '../db/prisma';
import { logger } from '../utils/logger';
import { z } from 'zod';
import { Octokit } from 'octokit';
import { config } from '../config';

const router = Router();

// Validation schemas
const createPullRequestSchema = z.object({
  repositoryId: z.string(),
  githubPrNumber: z.number(),
  branch: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
  issueIds: z.array(z.string()).optional(),
  diffUrl: z.string().url().optional(),
});

const updatePullRequestSchema = z.object({
  status: z.enum(['OPEN', 'MERGED', 'CLOSED']).optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  mergedAt: z.string().datetime().optional(),
  closedAt: z.string().datetime().optional(),
});

const webhookEventSchema = z.object({
  action: z.enum(['opened', 'closed', 'reopened', 'synchronize']),
  number: z.number(),
  pull_request: z.object({
    id: z.number(),
    number: z.number(),
    state: z.enum(['open', 'closed']),
    merged: z.boolean(),
    merged_at: z.string().nullable(),
    closed_at: z.string().nullable(),
    title: z.string(),
    body: z.string().nullable(),
    head: z.object({
      ref: z.string(),
      sha: z.string(),
    }),
    base: z.object({
      ref: z.string(),
    }),
    diff_url: z.string().url(),
  }),
  repository: z.object({
    id: z.number(),
    full_name: z.string(),
  }),
});

// Get all pull requests for the authenticated user
router.get('/',
  authenticateSession,
  asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as any;
    const {
      page = '1',
      limit = '20',
      status,
      repositoryId,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query as any;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = {
      repository: {
        userId: user.id,
      },
    };

    if (status) {
      where.status = status;
    }
    if (repositoryId) {
      where.repositoryId = repositoryId;
    }

    // Get pull requests with pagination
    const [pullRequests, total] = await Promise.all([
      prisma.pullRequest.findMany({
        where,
        include: {
          repository: {
            select: {
              id: true,
              name: true,
              fullName: true,
              owner: true,
            },
          },
          issues: {
            select: {
              id: true,
              type: true,
              severity: true,
              status: true,
              wcagCriteria: true,
              title: true,
            },
          },
          _count: {
            select: {
              issues: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: offset,
        take: limitNum,
      }),
      prisma.pullRequest.count({ where }),
    ]);

    // Calculate statistics for each PR
    const pullRequestsWithStats = pullRequests.map(pr => {
      const issueStats = pr.issues.reduce((acc, issue) => {
        acc[issue.severity] = (acc[issue.severity] || 0) + 1;
        acc[issue.status] = (acc[issue.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        ...pr,
        stats: {
          totalIssues: pr._count.issues,
          criticalIssues: issueStats.CRITICAL || 0,
          majorIssues: issueStats.MAJOR || 0,
          minorIssues: issueStats.MINOR || 0,
          blockerIssues: issueStats.BLOCKER || 0,
          openIssues: issueStats.OPEN || 0,
          resolvedIssues: issueStats.RESOLVED || 0,
        },
      };
    });

    res.json({
      pullRequests: pullRequestsWithStats,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  })
);

// Get a specific pull request by ID
router.get('/:id',
  authenticateSession,
  asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as any;
    const { id } = req.params;

    const pullRequest = await prisma.pullRequest.findFirst({
      where: {
        id,
        repository: {
          userId: user.id, // Ensure user owns this PR through repository ownership
        },
      },
      include: {
        repository: {
          select: {
            id: true,
            name: true,
            fullName: true,
            owner: true,
          },
        },
        issues: {
          include: {
            scan: {
              select: {
                id: true,
                url: true,
                status: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    if (!pullRequest) {
      return res.status(404).json({ error: 'Pull request not found' });
    }

    // Get GitHub information if possible
    let githubInfo = null;
    try {
      const octokit = new Octokit({
        auth: user.githubAccessToken || config.githubAccessToken,
      });

      const { data: pr } = await octokit.rest.pulls.get({
        owner: pullRequest.repository.owner,
        repo: pullRequest.repository.name,
        pull_number: pullRequest.githubPrNumber,
      });

      githubInfo = {
        state: pr.state,
        merged: pr.merged,
        mergeable: pr.mergeable,
        mergeable_state: pr.mergeable_state,
        additions: pr.additions,
        deletions: pr.deletions,
        changed_files: pr.changed_files,
        commits: pr.commits,
        comments: pr.comments,
        review_comments: pr.review_comments,
        html_url: pr.html_url,
        user: {
          login: pr.user?.login,
          avatar_url: pr.user?.avatar_url,
        },
      };
    } catch (error) {
      logger.warn('Failed to fetch GitHub PR info:', error);
    }

    res.json({
      ...pullRequest,
      githubInfo,
    });
  })
);

// Create a new pull request
router.post('/',
  authenticateSession,
  asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as any;
    
    const validatedData = createPullRequestSchema.parse(req.body);

    // Verify the repository belongs to the user
    const repository = await prisma.repository.findFirst({
      where: {
        id: validatedData.repositoryId,
        userId: user.id,
      },
    });

    if (!repository) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    // Check if PR already exists
    const existingPR = await prisma.pullRequest.findFirst({
      where: {
        repositoryId: validatedData.repositoryId,
        githubPrNumber: validatedData.githubPrNumber,
      },
    });

    if (existingPR) {
      return res.status(409).json({ 
        error: 'Pull request already exists',
        existingPR: existingPR.id,
      });
    }

    // Create the pull request
    const pullRequest = await prisma.pullRequest.create({
      data: {
        repositoryId: validatedData.repositoryId,
        githubPrNumber: validatedData.githubPrNumber,
        branch: validatedData.branch,
        title: validatedData.title,
        description: validatedData.description,
        diffUrl: validatedData.diffUrl,
        status: 'OPEN',
      },
      include: {
        repository: {
          select: {
            id: true,
            name: true,
            fullName: true,
            owner: true,
          },
        },
      },
    });

    // Link issues to the pull request if provided
    if (validatedData.issueIds && validatedData.issueIds.length > 0) {
      // Verify all issues belong to the user
      const issues = await prisma.issue.findMany({
        where: {
          id: { in: validatedData.issueIds },
          scan: {
            userId: user.id,
          },
        },
      });

      if (issues.length === validatedData.issueIds.length) {
        await prisma.pullRequest.update({
          where: { id: pullRequest.id },
          data: {
            issues: {
              connect: validatedData.issueIds.map(id => ({ id })),
            },
          },
        });
      }
    }

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'pr_created',
        entityType: 'pull_request',
        entityId: pullRequest.id,
        metadata: {
          repositoryName: repository.fullName,
          prNumber: pullRequest.githubPrNumber,
          branch: pullRequest.branch,
          issuesCount: validatedData.issueIds?.length || 0,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      },
    });

    logger.info('Pull request created', {
      userId: user.id,
      pullRequestId: pullRequest.id,
      repositoryName: repository.fullName,
      prNumber: pullRequest.githubPrNumber,
    });

    res.status(201).json(pullRequest);
  })
);

// Update pull request
router.patch('/:id',
  authenticateSession,
  asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as any;
    const { id } = req.params;
    
    const validatedData = updatePullRequestSchema.parse(req.body);

    // Check if PR exists and user owns it through repository ownership
    const existingPR = await prisma.pullRequest.findFirst({
      where: {
        id,
        repository: {
          userId: user.id,
        },
      },
    });

    if (!existingPR) {
      return res.status(404).json({ error: 'Pull request not found' });
    }

    // Prepare update data
    const updateData: any = { ...validatedData };
    
    // Convert datetime strings to Date objects
    if (validatedData.mergedAt) {
      updateData.mergedAt = new Date(validatedData.mergedAt);
    }
    if (validatedData.closedAt) {
      updateData.closedAt = new Date(validatedData.closedAt);
    }

    // Update the pull request
    const pullRequest = await prisma.pullRequest.update({
      where: { id },
      data: updateData,
      include: {
        repository: {
          select: {
            id: true,
            name: true,
            fullName: true,
            owner: true,
          },
        },
        issues: {
          select: {
            id: true,
            type: true,
            severity: true,
            status: true,
            title: true,
          },
        },
      },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'pr_updated',
        entityType: 'pull_request',
        entityId: pullRequest.id,
        metadata: {
          changes: validatedData,
          previousStatus: existingPR.status,
          newStatus: pullRequest.status,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      },
    });

    logger.info('Pull request updated', {
      userId: user.id,
      pullRequestId: pullRequest.id,
      changes: validatedData,
    });

    res.json(pullRequest);
  })
);

// GitHub webhook handler for pull request events
router.post('/webhook/github',
  asyncHandler(async (req: Request, res: Response) => {
    const signature = req.get('X-Hub-Signature-256');
    const event = req.get('X-GitHub-Event');
    
    // TODO: Verify webhook signature
    // const isValid = verifyGitHubSignature(JSON.stringify(req.body), signature, config.githubWebhookSecret);
    // if (!isValid) {
    //   return res.status(401).json({ error: 'Invalid signature' });
    // }

    if (event !== 'pull_request') {
      return res.status(200).json({ message: 'Event not handled' });
    }

    try {
      const validatedData = webhookEventSchema.parse(req.body);
      
      // Find the repository
      const repository = await prisma.repository.findFirst({
        where: {
          githubId: validatedData.repository.id,
        },
      });

      if (!repository) {
        logger.warn('Webhook received for unknown repository', {
          githubId: validatedData.repository.id,
          fullName: validatedData.repository.full_name,
        });
        return res.status(200).json({ message: 'Repository not found' });
      }

      // Find existing pull request
      let pullRequest = await prisma.pullRequest.findFirst({
        where: {
          repositoryId: repository.id,
          githubPrNumber: validatedData.number,
        },
      });

      // Handle different actions
      switch (validatedData.action) {
        case 'opened':
          if (!pullRequest) {
            pullRequest = await prisma.pullRequest.create({
              data: {
                repositoryId: repository.id,
                githubPrNumber: validatedData.pull_request.number,
                branch: validatedData.pull_request.head.ref,
                title: validatedData.pull_request.title,
                description: validatedData.pull_request.body || '',
                diffUrl: validatedData.pull_request.diff_url,
                status: 'OPEN',
              },
            });

            await prisma.auditLog.create({
              data: {
                userId: repository.userId,
                action: 'pr_opened_webhook',
                entityType: 'pull_request',
                entityId: pullRequest.id,
                metadata: {
                  prNumber: validatedData.pull_request.number,
                  branch: validatedData.pull_request.head.ref,
                  action: validatedData.action,
                },
              },
            });
          }
          break;

        case 'closed':
          if (pullRequest) {
            const status = validatedData.pull_request.merged ? 'MERGED' : 'CLOSED';
            const updateData: any = { status };
            
            if (validatedData.pull_request.merged_at) {
              updateData.mergedAt = new Date(validatedData.pull_request.merged_at);
            }
            if (validatedData.pull_request.closed_at) {
              updateData.closedAt = new Date(validatedData.pull_request.closed_at);
            }

            await prisma.pullRequest.update({
              where: { id: pullRequest.id },
              data: updateData,
            });

            await prisma.auditLog.create({
              data: {
                userId: repository.userId,
                action: `pr_${status.toLowerCase()}_webhook`,
                entityType: 'pull_request',
                entityId: pullRequest.id,
                metadata: {
                  prNumber: validatedData.pull_request.number,
                  merged: validatedData.pull_request.merged,
                  action: validatedData.action,
                },
              },
            });
          }
          break;

        case 'reopened':
          if (pullRequest) {
            await prisma.pullRequest.update({
              where: { id: pullRequest.id },
              data: {
                status: 'OPEN',
                mergedAt: null,
                closedAt: null,
              },
            });

            await prisma.auditLog.create({
              data: {
                userId: repository.userId,
                action: 'pr_reopened_webhook',
                entityType: 'pull_request',
                entityId: pullRequest.id,
                metadata: {
                  prNumber: validatedData.pull_request.number,
                  action: validatedData.action,
                },
              },
            });
          }
          break;

        case 'synchronize':
          // Update PR title/description if changed
          if (pullRequest) {
            await prisma.pullRequest.update({
              where: { id: pullRequest.id },
              data: {
                title: validatedData.pull_request.title,
                description: validatedData.pull_request.body || '',
              },
            });
          }
          break;
      }

      logger.info('GitHub webhook processed', {
        event,
        action: validatedData.action,
        repository: validatedData.repository.full_name,
        prNumber: validatedData.number,
      });

      res.status(200).json({ message: 'Webhook processed successfully' });
    } catch (error) {
      logger.error('GitHub webhook processing failed:', error);
      res.status(400).json({ error: 'Invalid webhook payload' });
    }
  })
);

// Get pull request statistics
router.get('/statistics/overview',
  authenticateSession,
  asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as any;
    const { period = '30d', repositoryId } = req.query as any;

    // Calculate date range
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Build base where clause
    const baseWhere: any = {
      repository: {
        userId: user.id,
      },
    };

    if (repositoryId) {
      baseWhere.repositoryId = repositoryId;
    }

    const recentWhere = {
      ...baseWhere,
      createdAt: { gte: startDate },
    };

    // Get statistics
    const [
      totalPRs,
      recentPRs,
      prsByStatus,
      mergedPRs,
      closedPRs,
    ] = await Promise.all([
      // Total PRs
      prisma.pullRequest.count({ where: baseWhere }),
      
      // Recent PRs
      prisma.pullRequest.count({ where: recentWhere }),
      
      // PRs by status
      prisma.pullRequest.groupBy({
        by: ['status'],
        where: baseWhere,
        _count: true,
      }),
      
      // Merged PRs in period
      prisma.pullRequest.count({
        where: {
          ...recentWhere,
          status: 'MERGED',
        },
      }),
      
      // Closed PRs in period
      prisma.pullRequest.count({
        where: {
          ...recentWhere,
          status: 'CLOSED',
        },
      }),
    ]);

    // Calculate merge rate
    const mergeRate = recentPRs > 0 ? (mergedPRs / recentPRs) * 100 : 0;

    res.json({
      period,
      repositoryId,
      totalPRs,
      recentPRs,
      mergedPRs,
      closedPRs,
      mergeRate: Math.round(mergeRate * 100) / 100,
      prsByStatus: prsByStatus.reduce((acc, item) => {
        acc[item.status] = item._count;
        return acc;
      }, {} as Record<string, number>),
    });
  })
);

export { router as pullRequestsRoutes };