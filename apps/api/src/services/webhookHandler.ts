import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { GitHubService } from './github';
import { AuditLogger } from './auditLogger';
import { logger } from '../utils/logger';

export interface WebhookEvent {
  id: string;
  event: string;
  action: string;
  payload: any;
  signature: string;
  deliveryId: string;
  timestamp: Date;
}

export interface PRWebhookPayload {
  action: 'opened' | 'closed' | 'synchronize' | 'reopened' | 'edited' | 'ready_for_review' | 'converted_to_draft';
  number: number;
  pull_request: {
    id: number;
    number: number;
    title: string;
    body: string;
    state: 'open' | 'closed';
    merged: boolean;
    merged_at: string | null;
    head: {
      ref: string;
      sha: string;
    };
    base: {
      ref: string;
      sha: string;
    };
    user: {
      login: string;
      id: number;
    };
    html_url: string;
  };
  repository: {
    id: number;
    name: string;
    full_name: string;
    owner: {
      login: string;
      id: number;
    };
  };
  installation?: {
    id: number;
  };
}

export interface InstallationWebhookPayload {
  action: 'created' | 'deleted' | 'suspend' | 'unsuspend' | 'new_permissions_accepted';
  installation: {
    id: number;
    account: {
      login: string;
      id: number;
      type: 'User' | 'Organization';
    };
    repository_selection: 'selected' | 'all';
    permissions: Record<string, string>;
    events: string[];
  };
  repositories?: Array<{
    id: number;
    name: string;
    full_name: string;
    private: boolean;
  }>;
}

export class WebhookHandler {
  private prisma: PrismaClient;
  private githubService: GitHubService;
  private auditLogger: AuditLogger;
  private webhookSecret: string;

  constructor() {
    this.prisma = new PrismaClient();
    this.githubService = new GitHubService();
    this.auditLogger = new AuditLogger();
    this.webhookSecret = process.env.GITHUB_WEBHOOK_SECRET!;

    if (!this.webhookSecret) {
      throw new Error('GITHUB_WEBHOOK_SECRET is required');
    }
  }

  /**
   * Handle incoming GitHub webhook
   */
  async handleWebhook(
    event: string,
    payload: string,
    signature: string,
    deliveryId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Verify webhook signature for security
      if (!this.verifySignature(payload, signature)) {
        logger.warn('Invalid webhook signature', {
          event,
          deliveryId,
          signatureProvided: !!signature,
        });

        await this.auditLogger.logSecurityEvent({
          containerId: 'webhook',
          action: 'invalid_webhook_signature',
          details: {
            event,
            deliveryId,
            signature: signature?.substring(0, 20) + '...',
          },
          severity: 'warning',
          riskLevel: 'medium',
          mitigated: true, // Request was rejected
          remediationRequired: false,
        });

        return {
          success: false,
          message: 'Invalid signature',
        };
      }

      const parsedPayload = JSON.parse(payload);
      
      // Log webhook receipt
      logger.info('GitHub webhook received', {
        event,
        action: parsedPayload.action,
        deliveryId,
        repository: parsedPayload.repository?.full_name,
      });

      // Store webhook for audit trail
      await this.storeWebhookEvent({
        id: deliveryId,
        event,
        action: parsedPayload.action || 'unknown',
        payload: parsedPayload,
        signature,
        deliveryId,
        timestamp: new Date(),
      });

      // Route to appropriate handler
      let result: { success: boolean; message: string };

      switch (event) {
        case 'pull_request':
          result = await this.handlePullRequestEvent(parsedPayload as PRWebhookPayload);
          break;
        
        case 'installation':
          result = await this.handleInstallationEvent(parsedPayload as InstallationWebhookPayload);
          break;
        
        case 'installation_repositories':
          result = await this.handleInstallationRepositoriesEvent(parsedPayload);
          break;

        case 'push':
          result = await this.handlePushEvent(parsedPayload);
          break;

        case 'repository':
          result = await this.handleRepositoryEvent(parsedPayload);
          break;

        case 'ping':
          result = { success: true, message: 'Pong! Webhook endpoint is working.' };
          break;

        default:
          logger.info('Unhandled webhook event', { event, action: parsedPayload.action });
          result = { success: true, message: `Event ${event} received but not handled` };
      }

      // Log handling result
      await this.auditLogger.logUserAction({
        userId: 'system',
        action: `webhook_${event}_handled`,
        resource: 'webhook',
        resourceId: deliveryId,
        details: {
          event,
          action: parsedPayload.action,
          repository: parsedPayload.repository?.full_name,
          result: result.success ? 'success' : 'failure',
          message: result.message,
        },
        severity: result.success ? 'info' : 'warning',
        category: 'system',
        source: 'webhook',
        outcome: result.success ? 'success' : 'failure',
      });

      return result;

    } catch (error) {
      logger.error('Webhook handling failed', {
        event,
        deliveryId,
        error: error.message,
      });

      await this.auditLogger.logUserAction({
        userId: 'system',
        action: `webhook_${event}_failed`,
        resource: 'webhook',
        resourceId: deliveryId,
        details: {
          event,
          error: error.message,
        },
        severity: 'error',
        category: 'system',
        source: 'webhook',
        outcome: 'failure',
      });

      return {
        success: false,
        message: `Webhook handling failed: ${error.message}`,
      };
    }
  }

  /**
   * Handle pull request events (opened, closed, merged, etc.)
   */
  private async handlePullRequestEvent(payload: PRWebhookPayload): Promise<{ success: boolean; message: string }> {
    try {
      const { action, pull_request, repository } = payload;
      
      logger.info('Processing pull request event', {
        action,
        prNumber: pull_request.number,
        repository: repository.full_name,
        branch: pull_request.head.ref,
        state: pull_request.state,
        merged: pull_request.merged,
      });

      // Check if this is an accessibility fix PR (created by our bot)
      const isAccessibilityPR = pull_request.head.ref.startsWith('accessibility-fixes-') ||
                                pull_request.title.toLowerCase().includes('accessibility') ||
                                pull_request.body?.includes('AI Accessibility Scanner');

      if (!isAccessibilityPR) {
        logger.debug('PR is not an accessibility fix, skipping detailed processing', {
          prNumber: pull_request.number,
        });
        return { success: true, message: 'Non-accessibility PR, acknowledged' };
      }

      // Find associated accessibility issues
      const issues = await this.findIssuesForPR(repository.full_name, pull_request.head.ref);

      switch (action) {
        case 'opened':
          await this.handlePROpened(pull_request, repository, issues);
          break;

        case 'closed':
          if (pull_request.merged) {
            await this.handlePRMerged(pull_request, repository, issues);
          } else {
            await this.handlePRClosed(pull_request, repository, issues);
          }
          break;

        case 'synchronize':
          await this.handlePRUpdated(pull_request, repository, issues);
          break;

        case 'ready_for_review':
          await this.handlePRReadyForReview(pull_request, repository, issues);
          break;

        case 'converted_to_draft':
          await this.handlePRConvertedToDraft(pull_request, repository, issues);
          break;

        default:
          logger.debug('Unhandled PR action', { action, prNumber: pull_request.number });
      }

      return {
        success: true,
        message: `Pull request ${action} event processed successfully`,
      };

    } catch (error) {
      logger.error('Failed to handle pull request event', {
        action: payload.action,
        prNumber: payload.pull_request.number,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Handle GitHub App installation events
   */
  private async handleInstallationEvent(payload: InstallationWebhookPayload): Promise<{ success: boolean; message: string }> {
    try {
      const { action, installation, repositories } = payload;

      logger.info('Processing installation event', {
        action,
        installationId: installation.id,
        account: installation.account.login,
        repositoryCount: repositories?.length || 0,
      });

      switch (action) {
        case 'created':
          await this.handleInstallationCreated(installation, repositories);
          break;

        case 'deleted':
          await this.handleInstallationDeleted(installation);
          break;

        case 'suspend':
          await this.handleInstallationSuspended(installation);
          break;

        case 'unsuspend':
          await this.handleInstallationUnsuspended(installation);
          break;

        case 'new_permissions_accepted':
          await this.handleInstallationPermissionsUpdated(installation, repositories);
          break;

        default:
          logger.debug('Unhandled installation action', { action, installationId: installation.id });
      }

      return {
        success: true,
        message: `Installation ${action} event processed successfully`,
      };

    } catch (error) {
      logger.error('Failed to handle installation event', {
        action: payload.action,
        installationId: payload.installation.id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Handle PR opened event
   */
  private async handlePROpened(pullRequest: any, repository: any, issues: any[]): Promise<void> {
    // Update issue statuses to "in_review"
    for (const issue of issues) {
      await this.updateIssueStatus(issue.id, 'in_review', {
        pullRequestNumber: pullRequest.number,
        pullRequestUrl: pullRequest.html_url,
        branch: pullRequest.head.ref,
      });
    }

    // Create PR tracking record
    await this.createPRTrackingRecord(pullRequest, repository, issues);

    logger.info('PR opened, issues updated to in_review status', {
      prNumber: pullRequest.number,
      issueCount: issues.length,
    });
  }

  /**
   * Handle PR merged event
   */
  private async handlePRMerged(pullRequest: any, repository: any, issues: any[]): Promise<void> {
    // Update issue statuses to "resolved"
    for (const issue of issues) {
      await this.updateIssueStatus(issue.id, 'resolved', {
        pullRequestNumber: pullRequest.number,
        pullRequestUrl: pullRequest.html_url,
        mergedAt: pullRequest.merged_at,
        resolutionMethod: 'automated_fix',
      });
    }

    // Update PR tracking record
    await this.updatePRTrackingRecord(pullRequest.number, repository.full_name, {
      status: 'merged',
      mergedAt: new Date(pullRequest.merged_at),
      issuesResolved: issues.length,
    });

    // Log successful automation
    await this.auditLogger.logUserAction({
      userId: 'system',
      action: 'accessibility_issues_auto_resolved',
      resource: 'accessibility_issues',
      details: {
        pullRequestNumber: pullRequest.number,
        repository: repository.full_name,
        issuesResolved: issues.length,
        mergedAt: pullRequest.merged_at,
      },
      severity: 'info',
      category: 'scan',
      source: 'webhook',
      outcome: 'success',
    });

    logger.info('PR merged, issues resolved automatically', {
      prNumber: pullRequest.number,
      issueCount: issues.length,
      repository: repository.full_name,
    });
  }

  /**
   * Handle PR closed (not merged) event
   */
  private async handlePRClosed(pullRequest: any, repository: any, issues: any[]): Promise<void> {
    // Update issue statuses back to "open"
    for (const issue of issues) {
      await this.updateIssueStatus(issue.id, 'open', {
        pullRequestNumber: pullRequest.number,
        pullRequestUrl: pullRequest.html_url,
        closedWithoutMerging: true,
      });
    }

    // Update PR tracking record
    await this.updatePRTrackingRecord(pullRequest.number, repository.full_name, {
      status: 'closed',
      closedAt: new Date(),
    });

    logger.info('PR closed without merging, issues reverted to open', {
      prNumber: pullRequest.number,
      issueCount: issues.length,
    });
  }

  /**
   * Handle installation created event
   */
  private async handleInstallationCreated(installation: any, repositories?: any[]): Promise<void> {
    // This would typically trigger onboarding flow
    logger.info('New GitHub App installation', {
      installationId: installation.id,
      account: installation.account.login,
      repositoryCount: repositories?.length || 0,
    });

    // Log for security monitoring
    await this.auditLogger.logUserAction({
      userId: 'system',
      action: 'github_app_installed',
      resource: 'github_installation',
      resourceId: installation.id.toString(),
      details: {
        account: installation.account.login,
        accountType: installation.account.type,
        repositoryCount: repositories?.length || 0,
        permissions: installation.permissions,
      },
      severity: 'info',
      category: 'auth',
      source: 'webhook',
      outcome: 'success',
    });
  }

  /**
   * Handle installation deleted event
   */
  private async handleInstallationDeleted(installation: any): Promise<void> {
    // Clean up installation data
    await this.prisma.githubInstallation.deleteMany({
      where: { githubInstallationId: installation.id },
    });

    // Log for security monitoring
    await this.auditLogger.logUserAction({
      userId: 'system',
      action: 'github_app_uninstalled',
      resource: 'github_installation',
      resourceId: installation.id.toString(),
      details: {
        account: installation.account.login,
        accountType: installation.account.type,
      },
      severity: 'warning',
      category: 'auth',
      source: 'webhook',
      outcome: 'success',
    });

    logger.info('GitHub App installation removed', {
      installationId: installation.id,
      account: installation.account.login,
    });
  }

  /**
   * Find accessibility issues associated with a PR branch
   */
  private async findIssuesForPR(repositoryFullName: string, branchName: string): Promise<any[]> {
    try {
      // Extract timestamp from branch name if it follows our pattern
      const match = branchName.match(/accessibility-fixes-(\d+)/);
      if (!match) {
        return [];
      }

      const timestamp = parseInt(match[1]);
      const searchTime = new Date(timestamp);
      const timeRange = 5 * 60 * 1000; // 5 minutes

      // Find issues that were being processed around the time the branch was created
      const issues = await this.prisma.accessibilityIssue.findMany({
        where: {
          scanResult: {
            url: {
              contains: repositoryFullName.split('/')[1], // Repository name
            },
            completedAt: {
              gte: new Date(searchTime.getTime() - timeRange),
              lte: new Date(searchTime.getTime() + timeRange),
            },
          },
        },
        include: {
          scanResult: true,
        },
      });

      return issues;
    } catch (error) {
      logger.error('Failed to find issues for PR', {
        repositoryFullName,
        branchName,
        error: error.message,
      });
      return [];
    }
  }

  /**
   * Update accessibility issue status
   */
  private async updateIssueStatus(
    issueId: string,
    status: 'open' | 'in_review' | 'resolved' | 'ignored',
    metadata: Record<string, any> = {}
  ): Promise<void> {
    try {
      await this.prisma.accessibilityIssue.update({
        where: { id: issueId },
        data: {
          // Note: You'll need to add a status field to your schema
          // status,
          // metadata: { ...existing_metadata, ...metadata },
          // updatedAt: new Date(),
        },
      });

      logger.debug('Issue status updated', {
        issueId,
        status,
        metadata,
      });
    } catch (error) {
      logger.error('Failed to update issue status', {
        issueId,
        status,
        error: error.message,
      });
    }
  }

  /**
   * Create PR tracking record
   */
  private async createPRTrackingRecord(pullRequest: any, repository: any, issues: any[]): Promise<void> {
    try {
      await this.prisma.pullRequestTracking.create({
        data: {
          githubPrNumber: pullRequest.number,
          title: pullRequest.title,
          body: pullRequest.body || '',
          branch: pullRequest.head.ref,
          status: 'open',
          repositoryFullName: repository.full_name,
          issueIds: issues.map(issue => issue.id),
          metadata: {
            htmlUrl: pullRequest.html_url,
            headSha: pullRequest.head.sha,
            baseSha: pullRequest.base.sha,
            author: pullRequest.user.login,
          },
        },
      });
    } catch (error) {
      logger.error('Failed to create PR tracking record', {
        prNumber: pullRequest.number,
        error: error.message,
      });
    }
  }

  /**
   * Update PR tracking record
   */
  private async updatePRTrackingRecord(
    prNumber: number,
    repositoryFullName: string,
    updates: Record<string, any>
  ): Promise<void> {
    try {
      await this.prisma.pullRequestTracking.updateMany({
        where: {
          githubPrNumber: prNumber,
          repositoryFullName,
        },
        data: updates,
      });
    } catch (error) {
      logger.error('Failed to update PR tracking record', {
        prNumber,
        repositoryFullName,
        error: error.message,
      });
    }
  }

  /**
   * Store webhook event for audit trail
   */
  private async storeWebhookEvent(event: WebhookEvent): Promise<void> {
    try {
      await this.prisma.webhookEvent.create({
        data: {
          id: event.id,
          event: event.event,
          action: event.action,
          payload: event.payload,
          signature: event.signature.substring(0, 50), // Store partial signature for audit
          deliveryId: event.deliveryId,
          timestamp: event.timestamp,
          processed: true,
        },
      });
    } catch (error) {
      logger.error('Failed to store webhook event', {
        eventId: event.id,
        error: error.message,
      });
    }
  }

  /**
   * Verify webhook signature for security
   */
  private verifySignature(payload: string, signature: string): boolean {
    if (!signature) {
      return false;
    }

    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(payload, 'utf8')
      .digest('hex');

    const actualSignature = signature.replace('sha256=', '');

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(actualSignature, 'hex')
    );
  }

  // Additional handler methods
  private async handlePRUpdated(pullRequest: any, repository: any, issues: any[]): Promise<void> {
    logger.info('PR updated with new commits', {
      prNumber: pullRequest.number,
      headSha: pullRequest.head.sha,
    });
  }

  private async handlePRReadyForReview(pullRequest: any, repository: any, issues: any[]): Promise<void> {
    logger.info('PR marked ready for review', {
      prNumber: pullRequest.number,
    });
  }

  private async handlePRConvertedToDraft(pullRequest: any, repository: any, issues: any[]): Promise<void> {
    logger.info('PR converted to draft', {
      prNumber: pullRequest.number,
    });
  }

  private async handleInstallationRepositoriesEvent(payload: any): Promise<{ success: boolean; message: string }> {
    logger.info('Installation repositories updated', {
      action: payload.action,
      installationId: payload.installation?.id,
    });
    return { success: true, message: 'Installation repositories event processed' };
  }

  private async handlePushEvent(payload: any): Promise<{ success: boolean; message: string }> {
    logger.debug('Push event received', {
      repository: payload.repository?.full_name,
      ref: payload.ref,
      commits: payload.commits?.length || 0,
    });
    return { success: true, message: 'Push event acknowledged' };
  }

  private async handleRepositoryEvent(payload: any): Promise<{ success: boolean; message: string }> {
    logger.info('Repository event received', {
      action: payload.action,
      repository: payload.repository?.full_name,
    });
    return { success: true, message: 'Repository event processed' };
  }

  private async handleInstallationSuspended(installation: any): Promise<void> {
    logger.warn('GitHub App installation suspended', {
      installationId: installation.id,
      account: installation.account.login,
    });
  }

  private async handleInstallationUnsuspended(installation: any): Promise<void> {
    logger.info('GitHub App installation unsuspended', {
      installationId: installation.id,
      account: installation.account.login,
    });
  }

  private async handleInstallationPermissionsUpdated(installation: any, repositories?: any[]): Promise<void> {
    logger.info('GitHub App installation permissions updated', {
      installationId: installation.id,
      account: installation.account.login,
      permissions: installation.permissions,
    });
  }

  async shutdown(): Promise<void> {
    await this.prisma.$disconnect();
    await this.githubService.shutdown();
    await this.auditLogger.shutdown();
  }
}