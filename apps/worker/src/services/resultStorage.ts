import { PrismaClient } from '@prisma/client';
import { ScanResult, AccessibilityIssue } from '../types/scan';
import { AuditLogger } from './auditLogger';
import { logger } from '../utils/logger';

export interface StorageConfig {
  retentionDays: number;
  maxResultSize: number;
  compressionEnabled: boolean;
}

export class ResultStorage {
  private prisma: PrismaClient;
  private auditLogger: AuditLogger;
  private config: StorageConfig;

  constructor(config?: Partial<StorageConfig>) {
    this.prisma = new PrismaClient();
    this.auditLogger = new AuditLogger();
    this.config = {
      retentionDays: parseInt(process.env.RESULT_RETENTION_DAYS || '365'), // 1 year default
      maxResultSize: parseInt(process.env.MAX_RESULT_SIZE || '10485760'), // 10MB default
      compressionEnabled: process.env.COMPRESSION_ENABLED === 'true',
      ...config,
    };

    this.startRetentionCleanup();
  }

  async storeResult(result: ScanResult): Promise<void> {
    try {
      logger.info(`Storing scan result`, {
        jobId: result.jobId,
        url: result.url,
        status: result.status,
        issueCount: result.issues.length,
      });

      // Validate result size
      const resultSize = JSON.stringify(result).length;
      if (resultSize > this.config.maxResultSize) {
        throw new Error(`Result size ${resultSize} exceeds maximum allowed size ${this.config.maxResultSize}`);
      }

      // Sanitize issues (ensure no source code is stored)
      const sanitizedIssues = this.sanitizeIssues(result.issues);

      // Start transaction for data integrity
      await this.prisma.$transaction(async (tx) => {
        // Store scan result
        const scanResult = await tx.scanResult.create({
          data: {
            id: result.jobId,
            url: result.url,
            status: result.status,
            errorMessage: result.error,
            completedAt: result.completedAt,
            metrics: {
              totalElements: result.metrics.totalElements,
              totalIssues: result.metrics.totalIssues,
              issuesBySeverity: result.metrics.issuesBySeverity,
              issuesByType: result.metrics.issuesByType,
              scanDuration: result.metrics.scanDuration,
              renderTime: result.metrics.renderTime,
              ruleExecutionTimes: result.metrics.ruleExecutionTimes,
              memoryUsage: result.metrics.memoryUsage,
              performanceScore: result.metrics.performanceScore,
            },
            screenshotCount: result.screenshots?.length || 0,
          },
        });

        // Store issues
        if (sanitizedIssues.length > 0) {
          await tx.accessibilityIssue.createMany({
            data: sanitizedIssues.map(issue => ({
              id: issue.id,
              scanResultId: result.jobId,
              type: issue.type,
              severity: issue.severity,
              wcagCriteria: issue.wcagCriteria,
              title: issue.title,
              description: issue.description,
              impact: issue.impact,
              selector: issue.selector,
              xpath: issue.xpath,
              html: this.sanitizeHtml(issue.html),
              fix: {
                type: issue.fix.type,
                description: issue.fix.description,
                suggestedCode: this.sanitizeCode(issue.fix.suggestedCode),
                explanation: issue.fix.explanation,
                confidence: issue.fix.confidence,
              },
              context: {
                pageTitle: issue.context.pageTitle,
                pageUrl: issue.context.pageUrl,
                elementRole: issue.context.elementRole,
                parentElements: issue.context.parentElements,
                nearbyText: this.sanitizeText(issue.context.nearbyText),
                imageInfo: issue.context.imageInfo,
              },
            })),
          });
        }

        // Store screenshots separately (if any)
        if (result.screenshots && result.screenshots.length > 0) {
          await this.storeScreenshots(result.jobId, result.screenshots);
        }
      });

      // Log successful storage
      await this.auditLogger.logDataAccess(
        'system', // System user for worker operations
        'scan_result',
        result.jobId,
        'write',
        {
          url: result.url,
          status: result.status,
          issueCount: sanitizedIssues.length,
          resultSize,
        }
      );

      logger.info(`Scan result stored successfully`, {
        jobId: result.jobId,
        issueCount: sanitizedIssues.length,
        resultSize,
      });
    } catch (error) {
      logger.error(`Failed to store scan result`, {
        jobId: result.jobId,
        url: result.url,
        error: error.message,
      });

      // Log failed storage attempt
      await this.auditLogger.logDataAccess(
        'system',
        'scan_result',
        result.jobId,
        'write',
        {
          url: result.url,
          error: error.message,
        }
      );

      throw error;
    }
  }

  async getResult(jobId: string, userId?: string): Promise<ScanResult | null> {
    try {
      const scanResult = await this.prisma.scanResult.findUnique({
        where: { id: jobId },
        include: {
          issues: true,
        },
      });

      if (!scanResult) {
        return null;
      }

      // Log data access
      if (userId) {
        await this.auditLogger.logDataAccess(
          userId,
          'scan_result',
          jobId,
          'read',
          {
            url: scanResult.url,
            issueCount: scanResult.issues.length,
          }
        );
      }

      // Convert database result to ScanResult format
      const result: ScanResult = {
        jobId: scanResult.id,
        url: scanResult.url,
        status: scanResult.status as 'completed' | 'failed' | 'timeout',
        issues: scanResult.issues.map(issue => ({
          id: issue.id,
          type: issue.type as any,
          severity: issue.severity as any,
          wcagCriteria: issue.wcagCriteria,
          title: issue.title,
          description: issue.description,
          impact: issue.impact,
          selector: issue.selector,
          xpath: issue.xpath || undefined,
          html: issue.html,
          fix: issue.fix as any,
          context: issue.context as any,
        })),
        metrics: scanResult.metrics as any,
        error: scanResult.errorMessage || undefined,
        completedAt: scanResult.completedAt,
      };

      // Add screenshots if they exist
      const screenshots = await this.getScreenshots(jobId);
      if (screenshots.length > 0) {
        result.screenshots = screenshots;
      }

      return result;
    } catch (error) {
      logger.error(`Failed to get scan result`, {
        jobId,
        error: error.message,
      });
      return null;
    }
  }

  async getResultsByUser(
    userId: string,
    limit: number = 50,
    offset: number = 0,
    status?: 'completed' | 'failed' | 'timeout'
  ): Promise<{
    results: ScanResult[];
    total: number;
  }> {
    try {
      const where: any = {};
      if (status) {
        where.status = status;
      }

      const [scanResults, total] = await Promise.all([
        this.prisma.scanResult.findMany({
          where,
          include: {
            issues: {
              select: {
                id: true,
                type: true,
                severity: true,
                wcagCriteria: true,
                title: true,
              },
            },
          },
          orderBy: { completedAt: 'desc' },
          skip: offset,
          take: limit,
        }),
        this.prisma.scanResult.count({ where }),
      ]);

      // Log bulk data access
      await this.auditLogger.logDataAccess(
        userId,
        'scan_results',
        'bulk',
        'read',
        {
          resultCount: scanResults.length,
          total,
          limit,
          offset,
          status,
        }
      );

      const results = scanResults.map(scanResult => ({
        jobId: scanResult.id,
        url: scanResult.url,
        status: scanResult.status as 'completed' | 'failed' | 'timeout',
        issues: scanResult.issues as any[],
        metrics: scanResult.metrics as any,
        error: scanResult.errorMessage || undefined,
        completedAt: scanResult.completedAt,
      }));

      return { results, total };
    } catch (error) {
      logger.error(`Failed to get user scan results`, {
        userId,
        error: error.message,
      });
      return { results: [], total: 0 };
    }
  }

  async deleteResult(jobId: string, userId: string): Promise<boolean> {
    try {
      // Delete screenshots first
      await this.deleteScreenshots(jobId);

      // Delete scan result and issues (cascade)
      await this.prisma.scanResult.delete({
        where: { id: jobId },
      });

      // Log deletion
      await this.auditLogger.logDataAccess(
        userId,
        'scan_result',
        jobId,
        'delete',
        { reason: 'user_requested' }
      );

      logger.info(`Scan result deleted`, {
        jobId,
        userId,
      });

      return true;
    } catch (error) {
      logger.error(`Failed to delete scan result`, {
        jobId,
        userId,
        error: error.message,
      });
      return false;
    }
  }

  async getJobStats(): Promise<{
    completed: number;
    failed: number;
    total: number;
  }> {
    try {
      const [completed, failed, total] = await Promise.all([
        this.prisma.scanResult.count({ where: { status: 'completed' } }),
        this.prisma.scanResult.count({ where: { status: 'failed' } }),
        this.prisma.scanResult.count(),
      ]);

      return { completed, failed, total };
    } catch (error) {
      logger.error('Failed to get job stats', {
        error: error.message,
      });
      return { completed: 0, failed: 0, total: 0 };
    }
  }

  async getIssueStatistics(
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalIssues: number;
    issuesBySeverity: Record<string, number>;
    issuesByType: Record<string, number>;
    issuesByWcag: Record<string, number>;
    resolutionTrends: Array<{
      date: string;
      created: number;
      resolved: number;
    }>;
  }> {
    try {
      const where: any = {};
      if (startDate || endDate) {
        where.scanResult = {};
        if (startDate) where.scanResult.completedAt = { gte: startDate };
        if (endDate) where.scanResult.completedAt = { ...where.scanResult.completedAt, lte: endDate };
      }

      const issues = await this.prisma.accessibilityIssue.findMany({
        where,
        include: {
          scanResult: {
            select: { completedAt: true },
          },
        },
      });

      const stats = {
        totalIssues: issues.length,
        issuesBySeverity: {} as Record<string, number>,
        issuesByType: {} as Record<string, number>,
        issuesByWcag: {} as Record<string, number>,
        resolutionTrends: [] as Array<{ date: string; created: number; resolved: number }>,
      };

      // Aggregate statistics
      for (const issue of issues) {
        stats.issuesBySeverity[issue.severity] = (stats.issuesBySeverity[issue.severity] || 0) + 1;
        stats.issuesByType[issue.type] = (stats.issuesByType[issue.type] || 0) + 1;
        stats.issuesByWcag[issue.wcagCriteria] = (stats.issuesByWcag[issue.wcagCriteria] || 0) + 1;
      }

      return stats;
    } catch (error) {
      logger.error('Failed to get issue statistics', {
        error: error.message,
      });
      return {
        totalIssues: 0,
        issuesBySeverity: {},
        issuesByType: {},
        issuesByWcag: {},
        resolutionTrends: [],
      };
    }
  }

  private sanitizeIssues(issues: AccessibilityIssue[]): AccessibilityIssue[] {
    return issues.map(issue => ({
      ...issue,
      html: this.sanitizeHtml(issue.html),
      fix: {
        ...issue.fix,
        suggestedCode: this.sanitizeCode(issue.fix.suggestedCode),
      },
      context: {
        ...issue.context,
        nearbyText: this.sanitizeText(issue.context.nearbyText),
      },
    }));
  }

  private sanitizeHtml(html: string): string {
    // Remove any potentially sensitive content from HTML
    // Limit to 500 characters to prevent storage bloat
    return html.substring(0, 500);
  }

  private sanitizeCode(code: string): string {
    // Ensure no source code secrets are included in suggested fixes
    // This is just a basic implementation - would be more sophisticated in production
    const sensitivePatterns = [
      /api[_-]?key["\s]*[:=]["\s]*[a-zA-Z0-9]+/gi,
      /password["\s]*[:=]["\s]*[a-zA-Z0-9]+/gi,
      /secret["\s]*[:=]["\s]*[a-zA-Z0-9]+/gi,
      /token["\s]*[:=]["\s]*[a-zA-Z0-9]+/gi,
    ];

    let sanitized = code;
    for (const pattern of sensitivePatterns) {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    }

    return sanitized.substring(0, 1000); // Limit size
  }

  private sanitizeText(text?: string): string | undefined {
    if (!text) return undefined;
    return text.substring(0, 200); // Limit nearby text size
  }

  private async storeScreenshots(jobId: string, screenshots: any[]): Promise<void> {
    // In production, screenshots would be stored in object storage (S3, etc.)
    // For now, we'll just track that they exist
    try {
      await this.prisma.scanResult.update({
        where: { id: jobId },
        data: { screenshotCount: screenshots.length },
      });
    } catch (error) {
      logger.error('Failed to store screenshot metadata', {
        jobId,
        error: error.message,
      });
    }
  }

  private async getScreenshots(jobId: string): Promise<any[]> {
    // Would retrieve from object storage in production
    return [];
  }

  private async deleteScreenshots(jobId: string): Promise<void> {
    // Would delete from object storage in production
    logger.debug('Screenshot cleanup skipped (not implemented)', { jobId });
  }

  private startRetentionCleanup(): void {
    // Clean up old results based on retention policy
    setInterval(async () => {
      try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

        const deletedCount = await this.prisma.scanResult.deleteMany({
          where: {
            completedAt: {
              lt: cutoffDate,
            },
          },
        });

        if (deletedCount.count > 0) {
          logger.info('Cleaned up old scan results', {
            deletedCount: deletedCount.count,
            cutoffDate,
          });

          // Log retention cleanup
          await this.auditLogger.logDataAccess(
            'system',
            'scan_results',
            'retention_cleanup',
            'delete',
            {
              deletedCount: deletedCount.count,
              cutoffDate,
              retentionDays: this.config.retentionDays,
            }
          );
        }
      } catch (error) {
        logger.error('Failed to clean up old scan results', {
          error: error.message,
        });
      }
    }, 24 * 60 * 60 * 1000); // Run daily
  }

  async shutdown(): Promise<void> {
    await this.prisma.$disconnect();
  }
}