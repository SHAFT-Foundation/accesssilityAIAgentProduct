import { Octokit } from '@octokit/rest';
import { createAppAuth } from '@octokit/auth-app';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { AuditLogger } from './auditLogger';

export interface GitHubRepository {
  id: number;
  name: string;
  fullName: string;
  private: boolean;
  defaultBranch: string;
  permissions: {
    admin: boolean;
    push: boolean;
    pull: boolean;
  };
  owner: {
    login: string;
    type: 'User' | 'Organization';
  };
}

export interface GitHubInstallation {
  id: string;
  userId: string;
  githubInstallationId: number;
  permissions: string[];
  repositories: string[];
  encryptedToken: string;
  tokenExpiresAt: Date;
  createdAt: Date;
  lastUsedAt: Date;
}

export interface PullRequestData {
  number: number;
  title: string;
  body: string;
  head: string;
  base: string;
  url: string;
  state: 'open' | 'closed' | 'merged';
  mergeable: boolean | null;
}

export class GitHubService {
  private prisma: PrismaClient;
  private auditLogger: AuditLogger;
  private encryptionKey: string;
  private appId: string;
  private privateKey: string;
  private webhookSecret: string;

  constructor() {
    this.prisma = new PrismaClient();
    this.auditLogger = new AuditLogger();
    this.encryptionKey = process.env.GITHUB_ENCRYPTION_KEY!;
    this.appId = process.env.GITHUB_APP_ID!;
    this.privateKey = process.env.GITHUB_PRIVATE_KEY!;
    this.webhookSecret = process.env.GITHUB_WEBHOOK_SECRET!;

    if (!this.encryptionKey || !this.appId || !this.privateKey) {
      throw new Error('Missing required GitHub configuration');
    }
  }

  /**
   * Create OAuth URL for GitHub App installation
   */
  getInstallationUrl(userId: string, state?: string): string {
    const params = new URLSearchParams({
      client_id: this.appId,
      state: state || userId,
      redirect_uri: process.env.GITHUB_REDIRECT_URI!,
    });

    return `https://github.com/apps/${process.env.GITHUB_APP_NAME}/installations/new?${params}`;
  }

  /**
   * Handle GitHub App installation callback
   */
  async handleInstallation(
    userId: string,
    installationId: number,
    setupAction: string,
    repositorySelection: string,
    repositories?: any[]
  ): Promise<GitHubInstallation> {
    try {
      logger.info('Processing GitHub installation', {
        userId,
        installationId,
        setupAction,
        repositorySelection,
        repositoryCount: repositories?.length || 0,
      });

      // Get installation token
      const { token, expiresAt } = await this.getInstallationToken(installationId);

      // Get installation details
      const octokit = new Octokit({ auth: token });
      const installation = await octokit.rest.apps.getInstallation({
        installation_id: installationId,
      });

      // Get accessible repositories
      const repoData = await octokit.rest.apps.listReposAccessibleToInstallation();
      const accessibleRepos = repoData.data.repositories.map(repo => repo.full_name);

      // Encrypt and store the token
      const encryptedToken = this.encryptToken(token);

      // Store installation in database
      const githubInstallation = await this.prisma.githubInstallation.create({
        data: {
          id: `github_${installationId}`,
          userId,
          githubInstallationId: installationId,
          permissions: installation.data.permissions ? Object.keys(installation.data.permissions) : [],
          repositories: accessibleRepos,
          encryptedToken,
          tokenExpiresAt: expiresAt,
          lastUsedAt: new Date(),
        },
      });

      // Log successful installation
      await this.auditLogger.logUserAction({
        userId,
        action: 'github_installation_created',
        resource: 'github_installation',
        resourceId: githubInstallation.id,
        details: {
          installationId,
          permissions: installation.data.permissions,
          repositoryCount: accessibleRepos.length,
          repositorySelection,
        },
        severity: 'info',
        category: 'auth',
        source: 'api',
        outcome: 'success',
      });

      logger.info('GitHub installation stored successfully', {
        userId,
        installationId,
        repositoryCount: accessibleRepos.length,
      });

      return {
        id: githubInstallation.id,
        userId: githubInstallation.userId,
        githubInstallationId: githubInstallation.githubInstallationId,
        permissions: githubInstallation.permissions,
        repositories: githubInstallation.repositories,
        encryptedToken: githubInstallation.encryptedToken,
        tokenExpiresAt: githubInstallation.tokenExpiresAt,
        createdAt: githubInstallation.createdAt,
        lastUsedAt: githubInstallation.lastUsedAt,
      };
    } catch (error) {
      logger.error('Failed to handle GitHub installation', {
        userId,
        installationId,
        error: error.message,
      });

      await this.auditLogger.logUserAction({
        userId,
        action: 'github_installation_failed',
        resource: 'github_installation',
        details: {
          installationId,
          error: error.message,
        },
        severity: 'error',
        category: 'auth',
        source: 'api',
        outcome: 'failure',
      });

      throw error;
    }
  }

  /**
   * Get user's GitHub installations
   */
  async getUserInstallations(userId: string): Promise<GitHubInstallation[]> {
    try {
      const installations = await this.prisma.githubInstallation.findMany({
        where: { userId },
        orderBy: { lastUsedAt: 'desc' },
      });

      return installations.map(installation => ({
        id: installation.id,
        userId: installation.userId,
        githubInstallationId: installation.githubInstallationId,
        permissions: installation.permissions,
        repositories: installation.repositories,
        encryptedToken: installation.encryptedToken,
        tokenExpiresAt: installation.tokenExpiresAt,
        createdAt: installation.createdAt,
        lastUsedAt: installation.lastUsedAt,
      }));
    } catch (error) {
      logger.error('Failed to get user GitHub installations', {
        userId,
        error: error.message,
      });
      return [];
    }
  }

  /**
   * Get accessible repositories for a user
   */
  async getAccessibleRepositories(userId: string, installationId?: string): Promise<GitHubRepository[]> {
    try {
      const installations = installationId 
        ? await this.prisma.githubInstallation.findMany({ where: { userId, id: installationId } })
        : await this.prisma.githubInstallation.findMany({ where: { userId } });

      if (installations.length === 0) {
        return [];
      }

      const allRepos: GitHubRepository[] = [];

      for (const installation of installations) {
        try {
          const token = await this.getValidToken(installation);
          const octokit = new Octokit({ auth: token });

          const repoData = await octokit.rest.apps.listReposAccessibleToInstallation();
          
          const repos = repoData.data.repositories.map(repo => ({
            id: repo.id,
            name: repo.name,
            fullName: repo.full_name,
            private: repo.private,
            defaultBranch: repo.default_branch,
            permissions: {
              admin: repo.permissions?.admin || false,
              push: repo.permissions?.push || false,
              pull: repo.permissions?.pull || false,
            },
            owner: {
              login: repo.owner.login,
              type: repo.owner.type as 'User' | 'Organization',
            },
          }));

          allRepos.push(...repos);

          // Update last used timestamp
          await this.prisma.githubInstallation.update({
            where: { id: installation.id },
            data: { lastUsedAt: new Date() },
          });
        } catch (installationError) {
          logger.warn('Failed to get repositories for installation', {
            userId,
            installationId: installation.id,
            error: installationError.message,
          });
        }
      }

      // Log repository access
      await this.auditLogger.logDataAccess(
        userId,
        'github_repositories',
        'list',
        'read',
        {
          repositoryCount: allRepos.length,
          installationCount: installations.length,
        }
      );

      return allRepos;
    } catch (error) {
      logger.error('Failed to get accessible repositories', {
        userId,
        error: error.message,
      });
      return [];
    }
  }

  /**
   * Check if user has access to a specific repository
   */
  async hasRepositoryAccess(userId: string, repoFullName: string): Promise<boolean> {
    try {
      const installations = await this.prisma.githubInstallation.findMany({
        where: { userId },
      });

      for (const installation of installations) {
        if (installation.repositories.includes(repoFullName)) {
          // Verify access with GitHub API
          try {
            const token = await this.getValidToken(installation);
            const octokit = new Octokit({ auth: token });
            
            const [owner, repo] = repoFullName.split('/');
            await octokit.rest.repos.get({ owner, repo });
            
            return true;
          } catch (apiError) {
            logger.warn('Repository access verification failed', {
              userId,
              repoFullName,
              error: apiError.message,
            });
          }
        }
      }

      return false;
    } catch (error) {
      logger.error('Failed to check repository access', {
        userId,
        repoFullName,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Get repository details
   */
  async getRepository(userId: string, repoFullName: string): Promise<GitHubRepository | null> {
    try {
      if (!await this.hasRepositoryAccess(userId, repoFullName)) {
        throw new Error('No access to repository');
      }

      const installation = await this.getInstallationForRepo(userId, repoFullName);
      if (!installation) {
        return null;
      }

      const token = await this.getValidToken(installation);
      const octokit = new Octokit({ auth: token });
      
      const [owner, repo] = repoFullName.split('/');
      const repoData = await octokit.rest.repos.get({ owner, repo });

      return {
        id: repoData.data.id,
        name: repoData.data.name,
        fullName: repoData.data.full_name,
        private: repoData.data.private,
        defaultBranch: repoData.data.default_branch,
        permissions: {
          admin: repoData.data.permissions?.admin || false,
          push: repoData.data.permissions?.push || false,
          pull: repoData.data.permissions?.pull || false,
        },
        owner: {
          login: repoData.data.owner.login,
          type: repoData.data.owner.type as 'User' | 'Organization',
        },
      };
    } catch (error) {
      logger.error('Failed to get repository details', {
        userId,
        repoFullName,
        error: error.message,
      });
      return null;
    }
  }

  /**
   * Create a new branch for accessibility fixes
   */
  async createFixBranch(userId: string, repoFullName: string, baseBranch: string = 'main'): Promise<string> {
    try {
      const installation = await this.getInstallationForRepo(userId, repoFullName);
      if (!installation) {
        throw new Error('No installation found for repository');
      }

      const token = await this.getValidToken(installation);
      const octokit = new Octokit({ auth: token });
      
      const [owner, repo] = repoFullName.split('/');
      
      // Get base branch SHA
      const baseBranchData = await octokit.rest.repos.getBranch({
        owner,
        repo,
        branch: baseBranch,
      });

      // Create new branch with unique name
      const timestamp = Date.now();
      const branchName = `accessibility-fixes-${timestamp}`;
      
      await octokit.rest.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${branchName}`,
        sha: baseBranchData.data.commit.sha,
      });

      // Log branch creation
      await this.auditLogger.logUserAction({
        userId,
        action: 'branch_created',
        resource: 'github_branch',
        resourceId: branchName,
        details: {
          repository: repoFullName,
          baseBranch,
          sha: baseBranchData.data.commit.sha,
        },
        severity: 'info',
        category: 'data',
        source: 'api',
        outcome: 'success',
      });

      logger.info('Created accessibility fix branch', {
        userId,
        repository: repoFullName,
        branchName,
        baseBranch,
      });

      return branchName;
    } catch (error) {
      logger.error('Failed to create fix branch', {
        userId,
        repoFullName,
        baseBranch,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get installation token with automatic refresh
   */
  private async getInstallationToken(installationId: number): Promise<{ token: string; expiresAt: Date }> {
    const auth = createAppAuth({
      appId: this.appId,
      privateKey: this.privateKey,
    });

    const installationAuth = await auth({
      type: 'installation',
      installationId,
    });

    return {
      token: installationAuth.token,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
    };
  }

  /**
   * Get valid token for installation, refreshing if necessary
   */
  private async getValidToken(installation: GitHubInstallation): Promise<string> {
    // Check if token is expired or will expire soon (within 5 minutes)
    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
    
    if (installation.tokenExpiresAt <= fiveMinutesFromNow) {
      // Refresh token
      const { token, expiresAt } = await this.getInstallationToken(installation.githubInstallationId);
      const encryptedToken = this.encryptToken(token);

      // Update stored token
      await this.prisma.githubInstallation.update({
        where: { id: installation.id },
        data: {
          encryptedToken,
          tokenExpiresAt: expiresAt,
          lastUsedAt: new Date(),
        },
      });

      return token;
    }

    // Decrypt existing token
    return this.decryptToken(installation.encryptedToken);
  }

  /**
   * Get installation that has access to specific repository
   */
  private async getInstallationForRepo(userId: string, repoFullName: string): Promise<GitHubInstallation | null> {
    const installations = await this.prisma.githubInstallation.findMany({
      where: { userId },
    });

    for (const installation of installations) {
      if (installation.repositories.includes(repoFullName)) {
        return installation;
      }
    }

    return null;
  }

  /**
   * Encrypt GitHub token for secure storage
   */
  private encryptToken(token: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-gcm', this.encryptionKey);
    
    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt GitHub token for use
   */
  private decryptToken(encryptedToken: string): string {
    const [ivHex, authTagHex, encrypted] = encryptedToken.split(':');
    
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipher('aes-256-gcm', this.encryptionKey);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Verify webhook signature for security
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(payload)
      .digest('hex');
    
    const actualSignature = signature.replace('sha256=', '');
    
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(actualSignature, 'hex')
    );
  }

  async shutdown(): Promise<void> {
    await this.prisma.$disconnect();
    await this.auditLogger.shutdown();
  }
}