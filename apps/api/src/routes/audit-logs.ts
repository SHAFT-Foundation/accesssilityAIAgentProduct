import { Router, Request, Response } from 'express';
import { authenticateSession } from '../middleware/auth';
import { asyncHandler } from '../middleware/error-handler';
import { prisma } from '../db/prisma';
import { logger } from '../utils/logger';
import { z } from 'zod';

const router = Router();

// Validation schemas
const auditLogQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).default('1'),
  limit: z.string().regex(/^\d+$/).default('20'),
  action: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  sortBy: z.enum(['createdAt', 'action', 'entityType']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

const createAuditLogSchema = z.object({
  action: z.string().min(1),
  entityType: z.string().min(1),
  entityId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
});

// Audit log actions enum for better type safety
export const AUDIT_ACTIONS = {
  // Authentication
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
  USER_REGISTER: 'user_register',
  PASSWORD_RESET_REQUEST: 'password_reset_request',
  PASSWORD_RESET_COMPLETE: 'password_reset_complete',
  SESSION_CREATED: 'session_created',
  SESSION_DESTROYED: 'session_destroyed',
  
  // Repository management
  REPOSITORY_ADDED: 'repository_added',
  REPOSITORY_UPDATED: 'repository_updated',
  REPOSITORY_REMOVED: 'repository_removed',
  REPOSITORY_SYNCED: 'repository_synced',
  
  // Scan management
  SCAN_CREATED: 'scan_created',
  SCAN_STARTED: 'scan_started',
  SCAN_COMPLETED: 'scan_completed',
  SCAN_FAILED: 'scan_failed',
  SCAN_CANCELLED: 'scan_cancelled',
  SCAN_DELETED: 'scan_deleted',
  
  // Issue management
  ISSUE_CREATED: 'issue_created',
  ISSUE_UPDATED: 'issue_updated',
  ISSUE_RESOLVED: 'issue_resolved',
  ISSUE_IGNORED: 'issue_ignored',
  ISSUE_DELETED: 'issue_deleted',
  ISSUES_BULK_UPDATED: 'issues_bulk_updated',
  
  // Pull request management
  PR_CREATED: 'pr_created',
  PR_UPDATED: 'pr_updated',
  PR_MERGED: 'pr_merged',
  PR_CLOSED: 'pr_closed',
  PR_REOPENED: 'pr_reopened',
  PR_OPENED_WEBHOOK: 'pr_opened_webhook',
  PR_MERGED_WEBHOOK: 'pr_merged_webhook',
  PR_CLOSED_WEBHOOK: 'pr_closed_webhook',
  PR_REOPENED_WEBHOOK: 'pr_reopened_webhook',
  
  // Subscription and billing
  SUBSCRIPTION_CREATED: 'subscription_created',
  SUBSCRIPTION_UPDATED: 'subscription_updated',
  SUBSCRIPTION_CANCELLED: 'subscription_cancelled',
  SUBSCRIPTION_CHANGED: 'subscription_changed',
  PAYMENT_SUCCESS: 'payment_success',
  PAYMENT_FAILED: 'payment_failed',
  
  // Account management
  ACCOUNT_UPDATED: 'account_updated',
  ACCOUNT_DELETED: 'account_deleted',
  EMAIL_CHANGED: 'email_changed',
  PASSWORD_CHANGED: 'password_changed',
  
  // Settings and preferences
  SETTINGS_UPDATED: 'settings_updated',
  NOTIFICATION_PREFERENCES_UPDATED: 'notification_preferences_updated',
  
  // API and integration
  API_KEY_CREATED: 'api_key_created',
  API_KEY_REVOKED: 'api_key_revoked',
  WEBHOOK_CONFIGURED: 'webhook_configured',
  INTEGRATION_CONNECTED: 'integration_connected',
  INTEGRATION_DISCONNECTED: 'integration_disconnected',
  
  // Security events
  SUSPICIOUS_LOGIN_ATTEMPT: 'suspicious_login_attempt',
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
  UNAUTHORIZED_ACCESS_ATTEMPT: 'unauthorized_access_attempt',
  
  // Data export and privacy
  DATA_EXPORT_REQUEST: 'data_export_request',
  DATA_EXPORT_COMPLETED: 'data_export_completed',
  DATA_DELETION_REQUEST: 'data_deletion_request',
  DATA_DELETION_COMPLETED: 'data_deletion_completed',
} as const;

// Get audit logs for the authenticated user
router.get('/',
  authenticateSession,
  asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as any;
    const query = auditLogQuerySchema.parse(req.query);

    const pageNum = parseInt(query.page);
    const limitNum = parseInt(query.limit);
    const offset = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = { userId: user.id };

    if (query.action) {
      where.action = { contains: query.action, mode: 'insensitive' };
    }
    if (query.entityType) {
      where.entityType = query.entityType;
    }
    if (query.entityId) {
      where.entityId = query.entityId;
    }
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        where.createdAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.createdAt.lte = new Date(query.endDate);
      }
    }

    // Get audit logs with pagination
    const [auditLogs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { [query.sortBy]: query.sortOrder },
        skip: offset,
        take: limitNum,
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({
      auditLogs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  })
);

// Get a specific audit log by ID
router.get('/:id',
  authenticateSession,
  asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as any;
    const { id } = req.params;

    const auditLog = await prisma.auditLog.findFirst({
      where: {
        id,
        userId: user.id, // Ensure user owns this audit log
      },
    });

    if (!auditLog) {
      return res.status(404).json({ error: 'Audit log not found' });
    }

    res.json(auditLog);
  })
);

// Create a new audit log entry (typically called by other services)
router.post('/',
  authenticateSession,
  asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as any;
    
    const validatedData = createAuditLogSchema.parse(req.body);

    // Create the audit log
    const auditLog = await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: validatedData.action,
        entityType: validatedData.entityType,
        entityId: validatedData.entityId,
        metadata: validatedData.metadata,
        ipAddress: validatedData.ipAddress || req.ip,
        userAgent: validatedData.userAgent || req.get('User-Agent'),
      },
    });

    logger.info('Audit log created', {
      auditLogId: auditLog.id,
      userId: user.id,
      action: auditLog.action,
      entityType: auditLog.entityType,
      entityId: auditLog.entityId,
    });

    res.status(201).json(auditLog);
  })
);

// Get audit log statistics and analytics
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

    const where = {
      userId: user.id,
      createdAt: { gte: startDate },
    };

    // Get statistics
    const [
      totalLogs,
      logsByAction,
      logsByEntityType,
      recentActivity,
      securityEvents,
    ] = await Promise.all([
      // Total logs in period
      prisma.auditLog.count({ where }),
      
      // Logs by action
      prisma.auditLog.groupBy({
        by: ['action'],
        where,
        _count: true,
        orderBy: { _count: { action: 'desc' } },
        take: 10, // Top 10 actions
      }),
      
      // Logs by entity type
      prisma.auditLog.groupBy({
        by: ['entityType'],
        where,
        _count: true,
        orderBy: { _count: { entityType: 'desc' } },
      }),
      
      // Recent activity (last 24 hours)
      prisma.auditLog.count({
        where: {
          userId: user.id,
          createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
        },
      }),
      
      // Security-related events
      prisma.auditLog.count({
        where: {
          userId: user.id,
          action: {
            in: [
              AUDIT_ACTIONS.SUSPICIOUS_LOGIN_ATTEMPT,
              AUDIT_ACTIONS.RATE_LIMIT_EXCEEDED,
              AUDIT_ACTIONS.UNAUTHORIZED_ACCESS_ATTEMPT,
              AUDIT_ACTIONS.PASSWORD_RESET_REQUEST,
              AUDIT_ACTIONS.SESSION_DESTROYED,
            ],
          },
          createdAt: { gte: startDate },
        },
      }),
    ]);

    // Get activity timeline (daily breakdown)
    const activityTimeline = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('day', "createdAt") as date,
        COUNT(*)::int as count
      FROM "audit_logs" 
      WHERE "userId" = ${user.id} 
        AND "createdAt" >= ${startDate}
      GROUP BY DATE_TRUNC('day', "createdAt")
      ORDER BY date DESC
    ` as Array<{ date: Date; count: number }>;

    res.json({
      period,
      totalLogs,
      recentActivity,
      securityEvents,
      topActions: logsByAction.map(item => ({
        action: item.action,
        count: item._count,
      })),
      entityBreakdown: logsByEntityType.reduce((acc, item) => {
        acc[item.entityType] = item._count;
        return acc;
      }, {} as Record<string, number>),
      activityTimeline: activityTimeline.map(item => ({
        date: item.date.toISOString().split('T')[0],
        count: item.count,
      })),
    });
  })
);

// Get audit logs by entity (e.g., all logs for a specific scan)
router.get('/entity/:entityType/:entityId',
  authenticateSession,
  asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as any;
    const { entityType, entityId } = req.params;
    const {
      page = '1',
      limit = '20',
      sortOrder = 'desc',
    } = req.query as any;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    // Get audit logs for specific entity
    const [auditLogs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: {
          userId: user.id,
          entityType,
          entityId,
        },
        orderBy: { createdAt: sortOrder as 'asc' | 'desc' },
        skip: offset,
        take: limitNum,
      }),
      prisma.auditLog.count({
        where: {
          userId: user.id,
          entityType,
          entityId,
        },
      }),
    ]);

    res.json({
      entityType,
      entityId,
      auditLogs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  })
);

// Export audit logs (for compliance)
router.get('/export/csv',
  authenticateSession,
  asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as any;
    const { startDate, endDate } = req.query as any;

    // Build where clause
    const where: any = { userId: user.id };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    // Get all audit logs for export
    const auditLogs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    // Generate CSV content
    const csvHeaders = [
      'Timestamp',
      'Action',
      'Entity Type',
      'Entity ID',
      'IP Address',
      'User Agent',
      'Metadata',
    ];

    const csvRows = auditLogs.map(log => [
      log.createdAt.toISOString(),
      log.action,
      log.entityType,
      log.entityId || '',
      log.ipAddress || '',
      log.userAgent || '',
      JSON.stringify(log.metadata || {}),
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => 
        row.map(field => `"${field?.toString().replace(/"/g, '""') || ''}"`).join(',')
      ),
    ].join('\n');

    // Log the export action
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: AUDIT_ACTIONS.DATA_EXPORT_REQUEST,
        entityType: 'audit_log',
        metadata: {
          exportType: 'csv',
          recordCount: auditLogs.length,
          dateRange: { startDate, endDate },
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      },
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${user.id}-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csvContent);
  })
);

// Utility function to create audit log (for use by other services)
export async function createAuditLog(
  userId: string,
  action: string,
  entityType: string,
  entityId?: string,
  metadata?: Record<string, unknown>,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        metadata,
        ipAddress,
        userAgent,
      },
    });
  } catch (error) {
    logger.error('Failed to create audit log:', error);
    // Don't throw error to avoid breaking the main operation
  }
}

export { router as auditLogsRoutes };