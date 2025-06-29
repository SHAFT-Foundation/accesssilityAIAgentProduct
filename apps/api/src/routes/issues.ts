import { Router, Request, Response } from 'express';
import { authenticateSession } from '../middleware/auth';
import { asyncHandler } from '../middleware/error-handler';
import { prisma } from '../db/prisma';
import { logger } from '../utils/logger';
import { z } from 'zod';

const router = Router();

// Validation schemas
const createIssueSchema = z.object({
  scanId: z.string(),
  type: z.string().min(1),
  severity: z.enum(['BLOCKER', 'CRITICAL', 'MAJOR', 'MINOR']),
  wcagCriteria: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  location: z.object({
    file: z.string().optional(),
    line: z.number().optional(),
    column: z.number().optional(),
    selector: z.string().optional(),
    xpath: z.string().optional(),
  }),
  suggestedFix: z.string().min(1),
  groupHash: z.string().optional(),
  screenshot: z.string().url().optional(),
});

const updateIssueSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'IGNORED']).optional(),
  suggestedFix: z.string().optional(),
});

const bulkUpdateSchema = z.object({
  issueIds: z.array(z.string()).min(1),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'IGNORED']),
});

// Get all issues for the authenticated user
router.get('/',
  authenticateSession,
  asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as any;
    const {
      page = '1',
      limit = '20',
      status,
      severity,
      type,
      wcagCriteria,
      scanId,
      repositoryId,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search,
    } = req.query as any;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = {
      scan: {
        userId: user.id,
      },
    };

    if (status) {
      where.status = status;
    }
    if (severity) {
      where.severity = severity;
    }
    if (type) {
      where.type = type;
    }
    if (wcagCriteria) {
      where.wcagCriteria = wcagCriteria;
    }
    if (scanId) {
      where.scanId = scanId;
    }
    if (repositoryId) {
      where.scan.repositoryId = repositoryId;
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { type: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get issues with pagination
    const [issues, total] = await Promise.all([
      prisma.issue.findMany({
        where,
        include: {
          scan: {
            select: {
              id: true,
              url: true,
              status: true,
              createdAt: true,
              repository: {
                select: {
                  id: true,
                  name: true,
                  fullName: true,
                  owner: true,
                },
              },
            },
          },
          pullRequests: {
            select: {
              id: true,
              githubPrNumber: true,
              status: true,
              title: true,
              branch: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: offset,
        take: limitNum,
      }),
      prisma.issue.count({ where }),
    ]);

    res.json({
      issues,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  })
);

// Get a specific issue by ID
router.get('/:id',
  authenticateSession,
  asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as any;
    const { id } = req.params;

    const issue = await prisma.issue.findFirst({
      where: {
        id,
        scan: {
          userId: user.id, // Ensure user owns this issue through scan ownership
        },
      },
      include: {
        scan: {
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
        },
        pullRequests: {
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
        },
      },
    });

    if (!issue) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    res.json(issue);
  })
);

// Create a new issue (typically called by scan processing jobs)
router.post('/',
  authenticateSession,
  asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as any;
    
    const validatedData = createIssueSchema.parse(req.body);

    // Verify the scan belongs to the user
    const scan = await prisma.scan.findFirst({
      where: {
        id: validatedData.scanId,
        userId: user.id,
      },
    });

    if (!scan) {
      return res.status(404).json({ error: 'Scan not found' });
    }

    // Create the issue
    const issue = await prisma.issue.create({
      data: validatedData,
      include: {
        scan: {
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
        },
      },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'issue_created',
        entityType: 'issue',
        entityId: issue.id,
        metadata: {
          scanId: issue.scanId,
          type: issue.type,
          severity: issue.severity,
          wcagCriteria: issue.wcagCriteria,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      },
    });

    logger.info('Issue created', {
      userId: user.id,
      issueId: issue.id,
      scanId: issue.scanId,
      type: issue.type,
      severity: issue.severity,
    });

    res.status(201).json(issue);
  })
);

// Update an issue
router.patch('/:id',
  authenticateSession,
  asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as any;
    const { id } = req.params;
    
    const validatedData = updateIssueSchema.parse(req.body);

    // Check if issue exists and user owns it through scan ownership
    const existingIssue = await prisma.issue.findFirst({
      where: {
        id,
        scan: {
          userId: user.id,
        },
      },
    });

    if (!existingIssue) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    // Update the issue
    const issue = await prisma.issue.update({
      where: { id },
      data: validatedData,
      include: {
        scan: {
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
        },
        pullRequests: {
          select: {
            id: true,
            githubPrNumber: true,
            status: true,
            title: true,
            branch: true,
          },
        },
      },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'issue_updated',
        entityType: 'issue',
        entityId: issue.id,
        metadata: {
          changes: validatedData,
          previousStatus: existingIssue.status,
          newStatus: issue.status,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      },
    });

    logger.info('Issue updated', {
      userId: user.id,
      issueId: issue.id,
      changes: validatedData,
    });

    res.json(issue);
  })
);

// Bulk update issues
router.patch('/bulk/update',
  authenticateSession,
  asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as any;
    
    const validatedData = bulkUpdateSchema.parse(req.body);

    // Verify all issues belong to the user
    const issues = await prisma.issue.findMany({
      where: {
        id: { in: validatedData.issueIds },
        scan: {
          userId: user.id,
        },
      },
      select: { id: true, status: true },
    });

    if (issues.length !== validatedData.issueIds.length) {
      return res.status(404).json({ 
        error: 'One or more issues not found or not accessible' 
      });
    }

    // Update all issues
    const updatedIssues = await prisma.issue.updateMany({
      where: {
        id: { in: validatedData.issueIds },
      },
      data: {
        status: validatedData.status,
      },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'issues_bulk_updated',
        entityType: 'issue',
        metadata: {
          issueIds: validatedData.issueIds,
          status: validatedData.status,
          count: updatedIssues.count,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      },
    });

    logger.info('Issues bulk updated', {
      userId: user.id,
      issueIds: validatedData.issueIds,
      status: validatedData.status,
      count: updatedIssues.count,
    });

    res.json({
      success: true,
      message: `${updatedIssues.count} issues updated successfully`,
      updatedCount: updatedIssues.count,
    });
  })
);

// Delete an issue
router.delete('/:id',
  authenticateSession,
  asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as any;
    const { id } = req.params;

    // Check if issue exists and user owns it through scan ownership
    const existingIssue = await prisma.issue.findFirst({
      where: {
        id,
        scan: {
          userId: user.id,
        },
      },
      include: {
        scan: {
          select: {
            id: true,
            url: true,
          },
        },
      },
    });

    if (!existingIssue) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    // Delete the issue
    await prisma.issue.delete({
      where: { id },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'issue_deleted',
        entityType: 'issue',
        entityId: id,
        metadata: {
          scanId: existingIssue.scanId,
          type: existingIssue.type,
          severity: existingIssue.severity,
          wcagCriteria: existingIssue.wcagCriteria,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      },
    });

    logger.info('Issue deleted', {
      userId: user.id,
      issueId: id,
      type: existingIssue.type,
    });

    res.json({
      success: true,
      message: 'Issue deleted successfully',
    });
  })
);

// Get issue statistics
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
      scan: {
        userId: user.id,
      },
    };

    if (repositoryId) {
      baseWhere.scan.repositoryId = repositoryId;
    }

    const recentWhere = {
      ...baseWhere,
      createdAt: { gte: startDate },
    };

    // Get statistics
    const [
      totalIssues,
      recentIssues,
      issuesByStatus,
      issuesBySeverity,
      issuesByType,
      issuesByWcag,
      resolvedIssues,
    ] = await Promise.all([
      // Total issues
      prisma.issue.count({ where: baseWhere }),
      
      // Recent issues
      prisma.issue.count({ where: recentWhere }),
      
      // Issues by status
      prisma.issue.groupBy({
        by: ['status'],
        where: baseWhere,
        _count: true,
      }),
      
      // Issues by severity
      prisma.issue.groupBy({
        by: ['severity'],
        where: baseWhere,
        _count: true,
      }),
      
      // Issues by type
      prisma.issue.groupBy({
        by: ['type'],
        where: baseWhere,
        _count: true,
        orderBy: { _count: { type: 'desc' } },
        take: 10, // Top 10 issue types
      }),
      
      // Issues by WCAG criteria
      prisma.issue.groupBy({
        by: ['wcagCriteria'],
        where: baseWhere,
        _count: true,
        orderBy: { _count: { wcagCriteria: 'desc' } },
        take: 10, // Top 10 WCAG violations
      }),
      
      // Resolved issues in period
      prisma.issue.count({
        where: {
          ...recentWhere,
          status: 'RESOLVED',
        },
      }),
    ]);

    // Calculate resolution rate
    const resolutionRate = recentIssues > 0 ? (resolvedIssues / recentIssues) * 100 : 0;

    res.json({
      period,
      repositoryId,
      totalIssues,
      recentIssues,
      resolvedIssues,
      resolutionRate: Math.round(resolutionRate * 100) / 100,
      issuesByStatus: issuesByStatus.reduce((acc, item) => {
        acc[item.status] = item._count;
        return acc;
      }, {} as Record<string, number>),
      issuesBySeverity: issuesBySeverity.reduce((acc, item) => {
        acc[item.severity] = item._count;
        return acc;
      }, {} as Record<string, number>),
      topIssueTypes: issuesByType.map(item => ({
        type: item.type,
        count: item._count,
      })),
      topWcagViolations: issuesByWcag.map(item => ({
        criteria: item.wcagCriteria,
        count: item._count,
      })),
    });
  })
);

// Get issues grouped by type or criteria
router.get('/group/:groupBy',
  authenticateSession,
  asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as any;
    const { groupBy } = req.params;
    const { repositoryId, scanId, status } = req.query as any;

    if (!['type', 'severity', 'wcagCriteria', 'status'].includes(groupBy)) {
      return res.status(400).json({ 
        error: 'Invalid groupBy field. Must be one of: type, severity, wcagCriteria, status' 
      });
    }

    // Build where clause
    const where: any = {
      scan: {
        userId: user.id,
      },
    };

    if (repositoryId) {
      where.scan.repositoryId = repositoryId;
    }
    if (scanId) {
      where.scanId = scanId;
    }
    if (status) {
      where.status = status;
    }

    // Group issues
    const groupedIssues = await prisma.issue.groupBy({
      by: [groupBy as any],
      where,
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
    });

    // Get sample issues for each group
    const groupsWithSamples = await Promise.all(
      groupedIssues.map(async (group) => {
        const sampleIssues = await prisma.issue.findMany({
          where: {
            ...where,
            [groupBy]: group[groupBy as keyof typeof group],
          },
          select: {
            id: true,
            title: true,
            severity: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 3, // 3 sample issues per group
        });

        return {
          groupKey: group[groupBy as keyof typeof group],
          count: group._count.id,
          sampleIssues,
        };
      })
    );

    res.json({
      groupBy,
      groups: groupsWithSamples,
      totalGroups: groupedIssues.length,
      totalIssues: groupedIssues.reduce((sum, group) => sum + group._count.id, 0),
    });
  })
);

export { router as issuesRoutes };