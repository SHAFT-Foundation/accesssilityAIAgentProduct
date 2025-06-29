import { Router, Request, Response } from 'express';
import { authenticateSession } from '../middleware/auth';
import { asyncHandler } from '../middleware/error-handler';
import { prisma } from '../db/prisma';
import { logger } from '../utils/logger';
import { z } from 'zod';
import { scanQueue } from '../services/queue';

const router = Router();

// Validation schemas
const createScanSchema = z.object({
  url: z.string().url('Invalid URL format'),
  repositoryId: z.string().optional(),
  metadata: z.object({
    browser: z.enum(['chromium', 'firefox', 'webkit']).default('chromium'),
    viewport: z.object({
      width: z.number().min(320).max(3840).default(1920),
      height: z.number().min(240).max(2160).default(1080),
    }).optional(),
    scanOptions: z.object({
      includeExperimental: z.boolean().default(false),
      level: z.enum(['A', 'AA', 'AAA']).default('AA'),
      tags: z.array(z.string()).default(['wcag2a', 'wcag2aa']),
      timeout: z.number().min(5000).max(60000).default(30000),
    }).optional(),
  }).optional(),
});

const updateScanSchema = z.object({
  status: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']).optional(),
  errorMessage: z.string().optional(),
});

// Get all scans for the authenticated user
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
    const where: any = { userId: user.id };
    if (status) {
      where.status = status;
    }
    if (repositoryId) {
      where.repositoryId = repositoryId;
    }

    // Get scans with pagination
    const [scans, total] = await Promise.all([
      prisma.scan.findMany({
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
      prisma.scan.count({ where }),
    ]);

    // Calculate scan statistics
    const scansWithStats = scans.map(scan => {
      const issueStats = scan.issues.reduce((acc, issue) => {
        acc[issue.severity] = (acc[issue.severity] || 0) + 1;
        acc[issue.status] = (acc[issue.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const duration = scan.startedAt && scan.completedAt 
        ? scan.completedAt.getTime() - scan.startedAt.getTime()
        : null;

      return {
        ...scan,
        stats: {
          totalIssues: scan._count.issues,
          criticalIssues: issueStats.CRITICAL || 0,
          majorIssues: issueStats.MAJOR || 0,
          minorIssues: issueStats.MINOR || 0,
          blockerIssues: issueStats.BLOCKER || 0,
          openIssues: issueStats.OPEN || 0,
          resolvedIssues: issueStats.RESOLVED || 0,
          duration,
        },
      };
    });

    res.json({
      scans: scansWithStats,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  })
);

// Get a specific scan by ID
router.get('/:id',
  authenticateSession,
  asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as any;
    const { id } = req.params;

    const scan = await prisma.scan.findFirst({
      where: {
        id,
        userId: user.id, // Ensure user owns this scan
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
            pullRequests: {
              select: {
                id: true,
                githubPrNumber: true,
                status: true,
                title: true,
              },
            },
          },
        },
      },
    });

    if (!scan) {
      return res.status(404).json({ error: 'Scan not found' });
    }

    // Calculate detailed statistics
    const issueStats = scan.issues.reduce((acc, issue) => {
      // By severity
      acc.bySeverity[issue.severity] = (acc.bySeverity[issue.severity] || 0) + 1;
      
      // By status
      acc.byStatus[issue.status] = (acc.byStatus[issue.status] || 0) + 1;
      
      // By type
      acc.byType[issue.type] = (acc.byType[issue.type] || 0) + 1;
      
      // By WCAG criteria
      acc.byWcag[issue.wcagCriteria] = (acc.byWcag[issue.wcagCriteria] || 0) + 1;

      return acc;
    }, {
      bySeverity: {} as Record<string, number>,
      byStatus: {} as Record<string, number>,
      byType: {} as Record<string, number>,
      byWcag: {} as Record<string, number>,
    });

    const duration = scan.startedAt && scan.completedAt 
      ? scan.completedAt.getTime() - scan.startedAt.getTime()
      : null;

    res.json({
      ...scan,
      stats: {
        totalIssues: scan.issues.length,
        duration,
        ...issueStats,
      },
    });
  })
);

// Create a new scan
router.post('/',
  authenticateSession,
  asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as any;
    
    const validatedData = createScanSchema.parse(req.body);

    // Check PR quota
    if (user.prUsed >= user.prQuota) {
      return res.status(403).json({
        error: 'PR quota exceeded',
        details: {
          used: user.prUsed,
          quota: user.prQuota,
          resetDate: user.lastQuotaReset,
        },
      });
    }

    // If repositoryId is provided, verify user owns it
    if (validatedData.repositoryId) {
      const repository = await prisma.repository.findFirst({
        where: {
          id: validatedData.repositoryId,
          userId: user.id,
        },
      });

      if (!repository) {
        return res.status(404).json({ error: 'Repository not found' });
      }
    }

    // Create the scan
    const scan = await prisma.scan.create({
      data: {
        url: validatedData.url,
        repositoryId: validatedData.repositoryId,
        userId: user.id,
        status: 'PENDING',
        metadata: validatedData.metadata || {},
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

    // Add scan to queue for processing
    try {
      await scanQueue.add('accessibility-scan', {
        scanId: scan.id,
        url: scan.url,
        userId: user.id,
        repositoryId: scan.repositoryId,
        metadata: scan.metadata,
      }, {
        delay: 1000, // 1 second delay
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      });

      logger.info('Scan queued for processing', {
        scanId: scan.id,
        userId: user.id,
        url: scan.url,
      });
    } catch (error) {
      logger.error('Failed to queue scan for processing:', error);
      
      // Update scan status to failed
      await prisma.scan.update({
        where: { id: scan.id },
        data: {
          status: 'FAILED',
          errorMessage: 'Failed to queue scan for processing',
        },
      });

      return res.status(500).json({ 
        error: 'Failed to queue scan for processing' 
      });
    }

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'scan_created',
        entityType: 'scan',
        entityId: scan.id,
        metadata: {
          url: scan.url,
          repositoryName: scan.repository?.fullName,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      },
    });

    res.status(201).json(scan);
  })
);

// Update scan (typically for status updates from processing jobs)
router.patch('/:id',
  authenticateSession,
  asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as any;
    const { id } = req.params;
    
    const validatedData = updateScanSchema.parse(req.body);

    // Check if scan exists and user owns it
    const existingScan = await prisma.scan.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!existingScan) {
      return res.status(404).json({ error: 'Scan not found' });
    }

    // Prepare update data
    const updateData: any = { ...validatedData };

    // Set timestamps based on status
    if (validatedData.status === 'PROCESSING' && !existingScan.startedAt) {
      updateData.startedAt = new Date();
    } else if (validatedData.status === 'COMPLETED' || validatedData.status === 'FAILED') {
      if (!updateData.completedAt) {
        updateData.completedAt = new Date();
      }
    }

    // Update the scan
    const scan = await prisma.scan.update({
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
      },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'scan_updated',
        entityType: 'scan',
        entityId: scan.id,
        metadata: {
          changes: validatedData,
          status: scan.status,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      },
    });

    logger.info('Scan updated', {
      userId: user.id,
      scanId: scan.id,
      status: scan.status,
      changes: validatedData,
    });

    res.json(scan);
  })
);

// Cancel a scan
router.post('/:id/cancel',
  authenticateSession,
  asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as any;
    const { id } = req.params;

    // Check if scan exists and user owns it
    const existingScan = await prisma.scan.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!existingScan) {
      return res.status(404).json({ error: 'Scan not found' });
    }

    // Can only cancel pending or processing scans
    if (!['PENDING', 'PROCESSING'].includes(existingScan.status)) {
      return res.status(400).json({ 
        error: 'Can only cancel pending or processing scans',
        currentStatus: existingScan.status,
      });
    }

    // Update scan status to failed with cancellation message
    const scan = await prisma.scan.update({
      where: { id },
      data: {
        status: 'FAILED',
        errorMessage: 'Cancelled by user',
        completedAt: new Date(),
      },
    });

    // TODO: Cancel the job in the queue if it's still pending

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'scan_cancelled',
        entityType: 'scan',
        entityId: scan.id,
        metadata: {
          previousStatus: existingScan.status,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      },
    });

    logger.info('Scan cancelled', {
      userId: user.id,
      scanId: scan.id,
      previousStatus: existingScan.status,
    });

    res.json({
      success: true,
      message: 'Scan cancelled successfully',
      scan,
    });
  })
);

// Delete a scan
router.delete('/:id',
  authenticateSession,
  asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as any;
    const { id } = req.params;

    // Check if scan exists and user owns it
    const existingScan = await prisma.scan.findFirst({
      where: {
        id,
        userId: user.id,
      },
      include: {
        _count: {
          select: {
            issues: true,
          },
        },
      },
    });

    if (!existingScan) {
      return res.status(404).json({ error: 'Scan not found' });
    }

    // Delete the scan (cascading deletes will handle issues)
    await prisma.scan.delete({
      where: { id },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'scan_deleted',
        entityType: 'scan',
        entityId: id,
        metadata: {
          url: existingScan.url,
          status: existingScan.status,
          issuesDeleted: existingScan._count.issues,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      },
    });

    logger.info('Scan deleted', {
      userId: user.id,
      scanId: id,
      issuesDeleted: existingScan._count.issues,
    });

    res.json({
      success: true,
      message: 'Scan deleted successfully',
    });
  })
);

// Get scan statistics for user
router.get('/statistics/overview',
  authenticateSession,
  asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as any;
    const { period = '30d' } = req.query as any;

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

    // Get scan statistics
    const [
      totalScans,
      recentScans,
      scansByStatus,
      totalIssues,
      issuesBySeverity,
    ] = await Promise.all([
      // Total scans
      prisma.scan.count({
        where: { userId: user.id },
      }),
      
      // Recent scans
      prisma.scan.count({
        where: {
          userId: user.id,
          createdAt: { gte: startDate },
        },
      }),
      
      // Scans by status
      prisma.scan.groupBy({
        by: ['status'],
        where: { userId: user.id },
        _count: true,
      }),
      
      // Total issues
      prisma.issue.count({
        where: {
          scan: { userId: user.id },
        },
      }),
      
      // Issues by severity
      prisma.issue.groupBy({
        by: ['severity'],
        where: {
          scan: { userId: user.id },
        },
        _count: true,
      }),
    ]);

    res.json({
      period,
      totalScans,
      recentScans,
      scansByStatus: scansByStatus.reduce((acc, item) => {
        acc[item.status] = item._count;
        return acc;
      }, {} as Record<string, number>),
      totalIssues,
      issuesBySeverity: issuesBySeverity.reduce((acc, item) => {
        acc[item.severity] = item._count;
        return acc;
      }, {} as Record<string, number>),
    });
  })
);

export { router as scansRoutes };