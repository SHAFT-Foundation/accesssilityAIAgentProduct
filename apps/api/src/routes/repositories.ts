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
const createRepositorySchema = z.object({
  githubId: z.number(),
  name: z.string().min(1),
  owner: z.string().min(1),
  fullName: z.string().min(1),
  installationId: z.number(),
});

const updateRepositorySchema = z.object({
  isActive: z.boolean().optional(),
});

// Get all repositories for the authenticated user
router.get('/', 
  authenticateSession,
  asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as any;
    
    const repositories = await prisma.repository.findMany({
      where: { userId: user.id },
      include: {
        scans: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            completedAt: true,
            url: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 5, // Last 5 scans
        },
        pullRequests: {
          select: {
            id: true,
            githubPrNumber: true,
            status: true,
            title: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 5, // Last 5 PRs
        },
        _count: {
          select: {
            scans: true,
            pullRequests: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate stats for each repository
    const repositoriesWithStats = await Promise.all(
      repositories.map(async (repo) => {
        const totalIssues = await prisma.issue.count({
          where: {
            scan: {
              repositoryId: repo.id,
            },
          },
        });

        const openIssues = await prisma.issue.count({
          where: {
            scan: {
              repositoryId: repo.id,
            },
            status: 'OPEN',
          },
        });

        const resolvedIssues = await prisma.issue.count({
          where: {
            scan: {
              repositoryId: repo.id,
            },
            status: 'RESOLVED',
          },
        });

        return {
          ...repo,
          stats: {
            totalScans: repo._count.scans,
            totalPullRequests: repo._count.pullRequests,
            totalIssues,
            openIssues,
            resolvedIssues,
            lastScanAt: repo.scans[0]?.createdAt || null,
          },
        };
      })
    );

    res.json({
      repositories: repositoriesWithStats,
      total: repositories.length,
    });
  })
);

// Get a specific repository by ID
router.get('/:id',
  authenticateSession,
  asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as any;
    const { id } = req.params;

    const repository = await prisma.repository.findFirst({
      where: { 
        id,
        userId: user.id, // Ensure user owns this repository
      },
      include: {
        scans: {
          include: {
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
          },
          orderBy: { createdAt: 'desc' },
        },
        pullRequests: {
          include: {
            issues: {
              select: {
                id: true,
                type: true,
                severity: true,
                title: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!repository) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    // Calculate detailed stats
    const issueStats = await prisma.issue.groupBy({
      by: ['severity', 'status'],
      where: {
        scan: {
          repositoryId: repository.id,
        },
      },
      _count: true,
    });

    const stats = {
      totalScans: repository.scans.length,
      totalPullRequests: repository.pullRequests.length,
      issuesByStatus: issueStats.reduce((acc, stat) => {
        if (!acc[stat.status]) acc[stat.status] = 0;
        acc[stat.status] += stat._count;
        return acc;
      }, {} as Record<string, number>),
      issuesBySeverity: issueStats.reduce((acc, stat) => {
        if (!acc[stat.severity]) acc[stat.severity] = 0;
        acc[stat.severity] += stat._count;
        return acc;
      }, {} as Record<string, number>),
      lastScanAt: repository.scans[0]?.createdAt || null,
      lastPrAt: repository.pullRequests[0]?.createdAt || null,
    };

    res.json({
      ...repository,
      stats,
    });
  })
);

// Create a new repository
router.post('/',
  authenticateSession,
  asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as any;
    
    const validatedData = createRepositorySchema.parse(req.body);

    // Check if repository already exists
    const existingRepo = await prisma.repository.findFirst({
      where: {
        OR: [
          { githubId: validatedData.githubId },
          { 
            fullName: validatedData.fullName,
            userId: user.id,
          },
        ],
      },
    });

    if (existingRepo) {
      if (existingRepo.userId === user.id) {
        return res.status(409).json({ 
          error: 'Repository already exists in your account' 
        });
      } else {
        return res.status(409).json({ 
          error: 'Repository is already registered by another user' 
        });
      }
    }

    // Verify user has access to this repository via GitHub
    try {
      const octokit = new Octokit({
        auth: user.githubAccessToken || config.githubAccessToken,
      });

      const { data: repo } = await octokit.rest.repos.get({
        owner: validatedData.owner,
        repo: validatedData.name,
      });

      // Verify the GitHub data matches
      if (repo.id !== validatedData.githubId || repo.full_name !== validatedData.fullName) {
        return res.status(400).json({ 
          error: 'Repository data mismatch with GitHub' 
        });
      }
    } catch (error) {
      logger.error('GitHub API error when verifying repository:', error);
      return res.status(400).json({ 
        error: 'Unable to verify repository access on GitHub' 
      });
    }

    // Create the repository
    const repository = await prisma.repository.create({
      data: {
        ...validatedData,
        userId: user.id,
      },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'repository_added',
        entityType: 'repository',
        entityId: repository.id,
        metadata: {
          repositoryName: repository.fullName,
          githubId: repository.githubId,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      },
    });

    logger.info('Repository added', {
      userId: user.id,
      repositoryId: repository.id,
      repositoryName: repository.fullName,
    });

    res.status(201).json(repository);
  })
);

// Update repository settings
router.patch('/:id',
  authenticateSession,
  asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as any;
    const { id } = req.params;
    
    const validatedData = updateRepositorySchema.parse(req.body);

    // Check if repository exists and user owns it
    const existingRepo = await prisma.repository.findFirst({
      where: { 
        id,
        userId: user.id,
      },
    });

    if (!existingRepo) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    // Update the repository
    const repository = await prisma.repository.update({
      where: { id },
      data: validatedData,
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'repository_updated',
        entityType: 'repository',
        entityId: repository.id,
        metadata: {
          repositoryName: repository.fullName,
          changes: validatedData,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      },
    });

    logger.info('Repository updated', {
      userId: user.id,
      repositoryId: repository.id,
      changes: validatedData,
    });

    res.json(repository);
  })
);

// Delete/remove repository
router.delete('/:id',
  authenticateSession,
  asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as any;
    const { id } = req.params;

    // Check if repository exists and user owns it
    const existingRepo = await prisma.repository.findFirst({
      where: { 
        id,
        userId: user.id,
      },
      include: {
        _count: {
          select: {
            scans: true,
            pullRequests: true,
          },
        },
      },
    });

    if (!existingRepo) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    // Delete the repository (cascading deletes will handle related data)
    await prisma.repository.delete({
      where: { id },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'repository_removed',
        entityType: 'repository',
        entityId: id,
        metadata: {
          repositoryName: existingRepo.fullName,
          scansDeleted: existingRepo._count.scans,
          pullRequestsDeleted: existingRepo._count.pullRequests,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      },
    });

    logger.info('Repository removed', {
      userId: user.id,
      repositoryId: id,
      repositoryName: existingRepo.fullName,
      scansDeleted: existingRepo._count.scans,
    });

    res.json({ 
      success: true, 
      message: 'Repository removed successfully' 
    });
  })
);

// Get repository GitHub information (for syncing)
router.get('/:id/github-info',
  authenticateSession,
  asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as any;
    const { id } = req.params;

    // Check if repository exists and user owns it
    const repository = await prisma.repository.findFirst({
      where: { 
        id,
        userId: user.id,
      },
    });

    if (!repository) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    try {
      const octokit = new Octokit({
        auth: user.githubAccessToken || config.githubAccessToken,
      });

      const { data: repo } = await octokit.rest.repos.get({
        owner: repository.owner,
        repo: repository.name,
      });

      // Get recent branches
      const { data: branches } = await octokit.rest.repos.listBranches({
        owner: repository.owner,
        repo: repository.name,
        per_page: 10,
      });

      // Get recent commits
      const { data: commits } = await octokit.rest.repos.listCommits({
        owner: repository.owner,
        repo: repository.name,
        per_page: 10,
      });

      res.json({
        repository: {
          id: repo.id,
          name: repo.name,
          fullName: repo.full_name,
          private: repo.private,
          description: repo.description,
          language: repo.language,
          defaultBranch: repo.default_branch,
          createdAt: repo.created_at,
          updatedAt: repo.updated_at,
          pushedAt: repo.pushed_at,
          size: repo.size,
          stargazersCount: repo.stargazers_count,
          watchersCount: repo.watchers_count,
          forksCount: repo.forks_count,
          openIssuesCount: repo.open_issues_count,
          homepage: repo.homepage,
          topics: repo.topics,
        },
        branches: branches.map(branch => ({
          name: branch.name,
          sha: branch.commit.sha,
          protected: branch.protected,
        })),
        recentCommits: commits.map(commit => ({
          sha: commit.sha,
          message: commit.commit.message,
          author: commit.commit.author,
          date: commit.commit.author?.date,
          url: commit.html_url,
        })),
      });
    } catch (error) {
      logger.error('GitHub API error when fetching repository info:', error);
      res.status(500).json({ 
        error: 'Unable to fetch repository information from GitHub' 
      });
    }
  })
);

export { router as repositoriesRoutes };