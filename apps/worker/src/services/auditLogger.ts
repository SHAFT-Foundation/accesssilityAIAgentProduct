import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  category: 'auth' | 'scan' | 'data' | 'security' | 'system';
  source: 'api' | 'worker' | 'webhook' | 'system';
  outcome: 'success' | 'failure' | 'pending';
  metadata?: Record<string, any>;
}

export interface SecurityAuditEntry {
  id: string;
  timestamp: Date;
  containerId: string;
  action: string;
  details: Record<string, any>;
  severity: 'info' | 'warning' | 'error' | 'critical';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  mitigated: boolean;
  remediationRequired: boolean;
}

export class AuditLogger {
  private prisma: PrismaClient;
  private retentionDays: number;

  constructor() {
    this.prisma = new PrismaClient();
    this.retentionDays = parseInt(process.env.AUDIT_RETENTION_DAYS || '2555'); // 7 years default
    this.startRetentionCleanup();
  }

  async logUserAction(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
    try {
      const auditEntry: AuditLogEntry = {
        id: uuidv4(),
        timestamp: new Date(),
        ...entry,
      };

      // Store in database for compliance
      await this.prisma.auditLog.create({
        data: {
          id: auditEntry.id,
          timestamp: auditEntry.timestamp,
          userId: auditEntry.userId,
          action: auditEntry.action,
          resource: auditEntry.resource,
          resourceId: auditEntry.resourceId,
          details: auditEntry.details,
          ipAddress: auditEntry.ipAddress,
          userAgent: auditEntry.userAgent,
          sessionId: auditEntry.sessionId,
          severity: auditEntry.severity,
          category: auditEntry.category,
          source: auditEntry.source,
          outcome: auditEntry.outcome,
          metadata: auditEntry.metadata,
        },
      });

      // Log to application logs for monitoring
      logger.info('User action audited', {
        auditId: auditEntry.id,
        userId: auditEntry.userId,
        action: auditEntry.action,
        resource: auditEntry.resource,
        outcome: auditEntry.outcome,
        severity: auditEntry.severity,
      });

      // Alert on critical security events
      if (auditEntry.severity === 'critical' || auditEntry.category === 'security') {
        await this.triggerSecurityAlert(auditEntry);
      }
    } catch (error) {
      logger.error('Failed to log audit entry', {
        error: error.message,
        userId: entry.userId,
        action: entry.action,
      });
      
      // Don't throw - audit logging failures shouldn't break core functionality
      // But log to a separate error tracking system
      this.logAuditFailure(entry, error);
    }
  }

  async logSecurityEvent(entry: Omit<SecurityAuditEntry, 'id' | 'timestamp'>): Promise<void> {
    try {
      const securityEntry: SecurityAuditEntry = {
        id: uuidv4(),
        timestamp: new Date(),
        ...entry,
      };

      // Store security events separately for SOC compliance
      await this.prisma.securityAuditLog.create({
        data: {
          id: securityEntry.id,
          timestamp: securityEntry.timestamp,
          containerId: securityEntry.containerId,
          action: securityEntry.action,
          details: securityEntry.details,
          severity: securityEntry.severity,
          riskLevel: securityEntry.riskLevel,
          mitigated: securityEntry.mitigated,
          remediationRequired: securityEntry.remediationRequired,
        },
      });

      logger.warn('Security event logged', {
        securityAuditId: securityEntry.id,
        containerId: securityEntry.containerId,
        action: securityEntry.action,
        riskLevel: securityEntry.riskLevel,
        mitigated: securityEntry.mitigated,
      });

      // Immediate alerting for high-risk events
      if (securityEntry.riskLevel === 'critical' || securityEntry.riskLevel === 'high') {
        await this.triggerSecurityIncident(securityEntry);
      }
    } catch (error) {
      logger.error('Failed to log security audit entry', {
        error: error.message,
        containerId: entry.containerId,
        action: entry.action,
      });
    }
  }

  async logScanActivity(
    userId: string,
    scanId: string,
    action: string,
    details: Record<string, any>,
    outcome: 'success' | 'failure' | 'pending' = 'success'
  ): Promise<void> {
    await this.logUserAction({
      userId,
      action,
      resource: 'scan',
      resourceId: scanId,
      details,
      severity: outcome === 'failure' ? 'error' : 'info',
      category: 'scan',
      source: 'worker',
      outcome,
    });
  }

  async logDataAccess(
    userId: string,
    dataType: string,
    dataId: string,
    action: 'read' | 'write' | 'delete',
    details: Record<string, any> = {}
  ): Promise<void> {
    await this.logUserAction({
      userId,
      action: `data_${action}`,
      resource: dataType,
      resourceId: dataId,
      details,
      severity: action === 'delete' ? 'warning' : 'info',
      category: 'data',
      source: 'api',
      outcome: 'success',
    });
  }

  async logAuthentication(
    userId: string,
    action: 'login' | 'logout' | 'password_reset' | 'mfa_challenge',
    outcome: 'success' | 'failure',
    ipAddress?: string,
    userAgent?: string,
    sessionId?: string,
    details: Record<string, any> = {}
  ): Promise<void> {
    await this.logUserAction({
      userId,
      action: `auth_${action}`,
      resource: 'authentication',
      details,
      ipAddress,
      userAgent,
      sessionId,
      severity: outcome === 'failure' ? 'warning' : 'info',
      category: 'auth',
      source: 'api',
      outcome,
    });
  }

  async logContainerActivity(
    containerId: string,
    action: string,
    details: Record<string, any>,
    riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low'
  ): Promise<void> {
    const severity = this.mapRiskToSeverity(riskLevel);
    
    await this.logSecurityEvent({
      containerId,
      action,
      details,
      severity,
      riskLevel,
      mitigated: false, // Will be updated when mitigation is applied
      remediationRequired: riskLevel === 'high' || riskLevel === 'critical',
    });
  }

  async getAuditTrail(
    userId?: string,
    resource?: string,
    startDate?: Date,
    endDate?: Date,
    limit: number = 100
  ): Promise<AuditLogEntry[]> {
    const where: any = {};
    
    if (userId) where.userId = userId;
    if (resource) where.resource = resource;
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = startDate;
      if (endDate) where.timestamp.lte = endDate;
    }

    const entries = await this.prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    return entries.map(entry => ({
      id: entry.id,
      timestamp: entry.timestamp,
      userId: entry.userId,
      action: entry.action,
      resource: entry.resource,
      resourceId: entry.resourceId || undefined,
      details: entry.details as Record<string, any>,
      ipAddress: entry.ipAddress || undefined,
      userAgent: entry.userAgent || undefined,
      sessionId: entry.sessionId || undefined,
      severity: entry.severity as 'info' | 'warning' | 'error' | 'critical',
      category: entry.category as 'auth' | 'scan' | 'data' | 'security' | 'system',
      source: entry.source as 'api' | 'worker' | 'webhook' | 'system',
      outcome: entry.outcome as 'success' | 'failure' | 'pending',
      metadata: entry.metadata as Record<string, any> | undefined,
    }));
  }

  async getSecurityEvents(
    containerId?: string,
    startDate?: Date,
    endDate?: Date,
    riskLevel?: 'low' | 'medium' | 'high' | 'critical',
    limit: number = 100
  ): Promise<SecurityAuditEntry[]> {
    const where: any = {};
    
    if (containerId) where.containerId = containerId;
    if (riskLevel) where.riskLevel = riskLevel;
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = startDate;
      if (endDate) where.timestamp.lte = endDate;
    }

    const entries = await this.prisma.securityAuditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    return entries.map(entry => ({
      id: entry.id,
      timestamp: entry.timestamp,
      containerId: entry.containerId,
      action: entry.action,
      details: entry.details as Record<string, any>,
      severity: entry.severity as 'info' | 'warning' | 'error' | 'critical',
      riskLevel: entry.riskLevel as 'low' | 'medium' | 'high' | 'critical',
      mitigated: entry.mitigated,
      remediationRequired: entry.remediationRequired,
    }));
  }

  async generateComplianceReport(
    startDate: Date,
    endDate: Date,
    userId?: string
  ): Promise<{
    totalEvents: number;
    eventsByCategory: Record<string, number>;
    eventsBySeverity: Record<string, number>;
    securityIncidents: number;
    dataAccessEvents: number;
    authenticationEvents: number;
    failedOperations: number;
  }> {
    const where: any = {
      timestamp: {
        gte: startDate,
        lte: endDate,
      },
    };
    
    if (userId) where.userId = userId;

    const events = await this.prisma.auditLog.findMany({ where });
    
    const report = {
      totalEvents: events.length,
      eventsByCategory: {} as Record<string, number>,
      eventsBySeverity: {} as Record<string, number>,
      securityIncidents: 0,
      dataAccessEvents: 0,
      authenticationEvents: 0,
      failedOperations: 0,
    };

    for (const event of events) {
      // Count by category
      report.eventsByCategory[event.category] = (report.eventsByCategory[event.category] || 0) + 1;
      
      // Count by severity
      report.eventsBySeverity[event.severity] = (report.eventsBySeverity[event.severity] || 0) + 1;
      
      // Count specific event types
      if (event.category === 'security') report.securityIncidents++;
      if (event.category === 'data') report.dataAccessEvents++;
      if (event.category === 'auth') report.authenticationEvents++;
      if (event.outcome === 'failure') report.failedOperations++;
    }

    return report;
  }

  private async triggerSecurityAlert(entry: AuditLogEntry): Promise<void> {
    // Send to monitoring system (Datadog, New Relic, etc.)
    logger.error('SECURITY ALERT: Critical audit event detected', {
      auditId: entry.id,
      userId: entry.userId,
      action: entry.action,
      resource: entry.resource,
      details: entry.details,
      timestamp: entry.timestamp,
    });

    // In production, this would integrate with:
    // - PagerDuty for immediate alerts
    // - Slack/Teams for team notifications
    // - SIEM system for security analysis
    // - Compliance management system
  }

  private async triggerSecurityIncident(entry: SecurityAuditEntry): Promise<void> {
    logger.error('SECURITY INCIDENT: High-risk security event detected', {
      securityAuditId: entry.id,
      containerId: entry.containerId,
      action: entry.action,
      riskLevel: entry.riskLevel,
      details: entry.details,
      timestamp: entry.timestamp,
    });

    // Auto-remediation for known issues
    if (entry.action === 'container_timeout' || entry.action === 'resource_exceeded') {
      // Container will be auto-cleaned by ContainerManager
      await this.markAsRemitigated(entry.id);
    }
  }

  private async markAsRemitigated(securityAuditId: string): Promise<void> {
    try {
      await this.prisma.securityAuditLog.update({
        where: { id: securityAuditId },
        data: { mitigated: true },
      });
    } catch (error) {
      logger.error('Failed to mark security event as mitigated', {
        securityAuditId,
        error: error.message,
      });
    }
  }

  private logAuditFailure(entry: any, error: Error): void {
    // Log to separate error tracking system
    // This ensures audit failures are tracked even if main logging fails
    console.error('AUDIT SYSTEM FAILURE', {
      timestamp: new Date().toISOString(),
      userId: entry.userId,
      action: entry.action,
      error: error.message,
      stack: error.stack,
    });
  }

  private mapRiskToSeverity(riskLevel: string): 'info' | 'warning' | 'error' | 'critical' {
    switch (riskLevel) {
      case 'critical': return 'critical';
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': 
      default: return 'info';
    }
  }

  private startRetentionCleanup(): void {
    // Clean up old audit logs based on retention policy
    setInterval(async () => {
      try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);

        const deletedCount = await this.prisma.auditLog.deleteMany({
          where: {
            timestamp: {
              lt: cutoffDate,
            },
          },
        });

        if (deletedCount.count > 0) {
          logger.info('Cleaned up old audit logs', {
            deletedCount: deletedCount.count,
            cutoffDate,
          });
        }
      } catch (error) {
        logger.error('Failed to clean up old audit logs', {
          error: error.message,
        });
      }
    }, 24 * 60 * 60 * 1000); // Run daily
  }

  async shutdown(): Promise<void> {
    await this.prisma.$disconnect();
  }
}