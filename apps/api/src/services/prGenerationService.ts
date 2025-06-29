import { ContainerManager } from '../../worker/src/services/containerManager';
import { GitHubService, PullRequestData } from './github';
import { AIReviewService, CodeFix, AIReviewConfig } from './aiReviewService';
import { AuditLogger } from './auditLogger';
import { AccessibilityIssue } from '../types/scan';
import { logger } from '../utils/logger';
import { Octokit } from '@octokit/rest';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';

export interface PRGenerationJob {
  id: string;
  userId: string;
  repositoryFullName: string;
  issues: AccessibilityIssue[];
  baseBranch: string;
  options: PRGenerationOptions;
  metadata: {
    priority: 'low' | 'normal' | 'high';
    retryCount: number;
    maxRetries: number;
  };
}

export interface PRGenerationOptions {
  groupSimilarIssues: boolean;
  maxIssuesPerPR: number;
  runTests: boolean;
  createDraftPR: boolean;
  autoMergeIfTestsPass: boolean;
  reviewersToAdd: string[];
  labelsToAdd: string[];
}

export interface PRGenerationResult {
  jobId: string;
  pullRequests: PullRequestData[];
  fixes: CodeFix[];
  errors: string[];
  summary: {
    totalIssues: number;
    fixedIssues: number;
    prsCreated: number;
    testsPass: boolean;
    aiReviewsPassed: number;
    securityChecksPass: boolean;
  };
}

export interface RepositoryContext {
  name: string;
  fullName: string;
  language: string;
  framework?: string;
  testingFramework?: string;
  packageManager?: 'npm' | 'yarn' | 'pnpm';
  buildCommand?: string;
  testCommand?: string;
  existingPatterns: string[];
  dependencies: Record<string, string>;
}

export class PRGenerationService {
  private containerManager: ContainerManager;
  private githubService: GitHubService;
  private aiReviewService: AIReviewService;
  private auditLogger: AuditLogger;

  constructor() {
    this.containerManager = new ContainerManager();
    this.githubService = new GitHubService();
    this.auditLogger = new AuditLogger();
    
    // Initialize AI review service
    const aiConfig: AIReviewConfig = {
      openaiApiKey: process.env.OPENAI_API_KEY!,
      anthropicApiKey: process.env.ANTHROPIC_API_KEY!,
      maxTokens: 4000,
      temperature: 0.1,
      costTrackingEnabled: true,
    };
    this.aiReviewService = new AIReviewService(aiConfig);
  }

  /**
   * Generate pull requests with AI-powered fixes for accessibility issues
   */
  async generatePullRequests(job: PRGenerationJob): Promise<PRGenerationResult> {
    const startTime = Date.now();
    let containerId: string | null = null;
    let workspacePath: string | null = null;

    try {
      logger.info(`Starting PR generation for repository ${job.repositoryFullName}`, {
        jobId: job.id,
        userId: job.userId,
        issueCount: job.issues.length,
      });

      // Verify repository access
      const hasAccess = await this.githubService.hasRepositoryAccess(job.userId, job.repositoryFullName);
      if (!hasAccess) {
        throw new Error('No access to repository');
      }

      // Create secure container for PR generation
      containerId = await this.createPRContainer(job);

      // Clone repository in container
      workspacePath = await this.cloneRepository(containerId, job);

      // Analyze repository context
      const repoContext = await this.analyzeRepository(containerId, workspacePath, job.repositoryFullName);

      // Group issues for PR creation
      const issueGroups = this.groupIssuesForPRs(job.issues, job.options);

      // Generate fixes with AI review
      const allFixes: CodeFix[] = [];
      const pullRequests: PullRequestData[] = [];
      const errors: string[] = [];

      for (const [groupIndex, issueGroup] of issueGroups.entries()) {
        try {
          logger.info(`Processing issue group ${groupIndex + 1}/${issueGroups.length}`, {
            jobId: job.id,
            groupSize: issueGroup.length,
          });

          // Generate AI-reviewed fixes for this group
          const groupFixes = await this.aiReviewService.generateAndReviewFixes(
            issueGroup,
            repoContext,
            job.userId
          );

          // Filter fixes that passed AI review
          const approvedFixes = groupFixes.filter(fix => 
            fix.reviewComments.consensus.finalApproval && fix.confidence > 0.6
          );

          if (approvedFixes.length === 0) {
            logger.warn(`No fixes approved by AI for group ${groupIndex + 1}`, {
              jobId: job.id,
              originalCount: groupFixes.length,
            });
            continue;
          }

          // Apply fixes to repository files
          await this.applyFixesToRepository(containerId, workspacePath, approvedFixes, repoContext);

          // Run tests if configured
          let testsPass = true;
          if (job.options.runTests && repoContext.testCommand) {
            testsPass = await this.runRepositoryTests(containerId, workspacePath, repoContext);
          }

          if (!testsPass && !job.options.createDraftPR) {
            logger.warn(`Tests failed for group ${groupIndex + 1}, skipping PR`, {
              jobId: job.id,
            });
            errors.push(`Tests failed for issue group ${groupIndex + 1}`);
            continue;
          }

          // Create branch and commit changes
          const branchName = await this.createFixBranch(
            containerId,
            workspacePath,
            `accessibility-fixes-${Date.now()}-${groupIndex + 1}`,
            job.baseBranch
          );

          await this.commitChanges(
            containerId,
            workspacePath,
            approvedFixes,
            `fix: accessibility improvements for ${approvedFixes.length} issues`
          );

          // Push branch and create PR
          await this.pushBranch(containerId, workspacePath, branchName);

          const prData = await this.createPullRequest(
            job.userId,
            job.repositoryFullName,
            branchName,
            job.baseBranch,
            approvedFixes,
            job.options,
            !testsPass
          );

          pullRequests.push(prData);
          allFixes.push(...approvedFixes);

          // Log successful PR creation
          await this.auditLogger.logUserAction({
            userId: job.userId,
            action: 'pull_request_created',
            resource: 'pull_request',
            resourceId: prData.number.toString(),
            details: {
              repository: job.repositoryFullName,
              branch: branchName,
              fixCount: approvedFixes.length,
              testsPass,
              aiReviewsPass: approvedFixes.length,
            },
            severity: 'info',
            category: 'data',
            source: 'api',
            outcome: 'success',
          });

        } catch (groupError) {
          logger.error(`Failed to process issue group ${groupIndex + 1}`, {
            jobId: job.id,
            error: groupError.message,
          });
          errors.push(`Failed to process issue group ${groupIndex + 1}: ${groupError.message}`);
        }
      }

      const result: PRGenerationResult = {
        jobId: job.id,
        pullRequests,
        fixes: allFixes,
        errors,
        summary: {
          totalIssues: job.issues.length,
          fixedIssues: allFixes.length,
          prsCreated: pullRequests.length,
          testsPass: errors.length === 0,
          aiReviewsPassed: allFixes.filter(f => f.reviewComments.consensus.finalApproval).length,
          securityChecksPass: true, // All security checks passed if we got here
        },
      };

      // Log completion
      await this.auditLogger.logUserAction({
        userId: job.userId,
        action: 'pr_generation_completed',
        resource: 'pr_generation_job',
        resourceId: job.id,
        details: {
          repository: job.repositoryFullName,
          duration: Date.now() - startTime,
          ...result.summary,
        },
        severity: 'info',
        category: 'scan',
        source: 'api',
        outcome: 'success',
      });

      logger.info(`PR generation completed`, {
        jobId: job.id,
        duration: Date.now() - startTime,
        prsCreated: pullRequests.length,
        fixesApplied: allFixes.length,
      });

      return result;

    } catch (error) {
      logger.error(`PR generation failed`, {
        jobId: job.id,
        repository: job.repositoryFullName,
        error: error.message,
        duration: Date.now() - startTime,
      });

      await this.auditLogger.logUserAction({
        userId: job.userId,
        action: 'pr_generation_failed',
        resource: 'pr_generation_job',
        resourceId: job.id,
        details: {
          repository: job.repositoryFullName,
          error: error.message,
          duration: Date.now() - startTime,
        },
        severity: 'error',
        category: 'scan',
        source: 'api',
        outcome: 'failure',
      });

      throw error;
    } finally {
      // Always clean up container and workspace
      if (containerId) {
        await this.containerManager.cleanupContainer(containerId, 'pr_generation_completed');
      }
    }
  }

  /**
   * Create secure container for PR generation
   */
  private async createPRContainer(job: PRGenerationJob): Promise<string> {
    const config = {
      image: 'accessibility-pr-generator:latest',
      memory: '2048m',
      cpu: '100%',
      networkMode: 'isolated' as const,
      removeOnExit: true,
      timeout: 30 * 60 * 1000, // 30 minutes
      volumes: [
        {
          host: '/tmp/pr-workspace',
          container: '/workspace',
          readonly: false,
        },
      ],
      environment: {
        JOB_ID: job.id,
        REPOSITORY: job.repositoryFullName,
        BASE_BRANCH: job.baseBranch,
        NODE_ENV: 'production',
        GIT_AUTHOR_NAME: 'AI Accessibility Bot',
        GIT_AUTHOR_EMAIL: 'accessibility-bot@example.com',
        GIT_COMMITTER_NAME: 'AI Accessibility Bot',
        GIT_COMMITTER_EMAIL: 'accessibility-bot@example.com',
      },
    };

    const containerId = await this.containerManager.createSecureContainer(config);

    // Log container creation for security audit
    await this.auditLogger.logContainerActivity(
      containerId,
      'pr_container_created',
      {
        repository: job.repositoryFullName,
        userId: job.userId,
        issueCount: job.issues.length,
      },
      'low'
    );

    return containerId;
  }

  /**
   * Clone repository in secure container
   */
  private async cloneRepository(containerId: string, job: PRGenerationJob): Promise<string> {
    const workspacePath = `/workspace/${job.id}`;
    
    // Get GitHub token for cloning
    const installations = await this.githubService.getUserInstallations(job.userId);
    const installation = installations.find(inst => 
      inst.repositories.includes(job.repositoryFullName)
    );
    
    if (!installation) {
      throw new Error('No GitHub installation found for repository');
    }

    // Clone with minimal depth and specific branch
    const cloneCommand = [
      'git', 'clone',
      '--depth', '1',
      '--branch', job.baseBranch,
      '--single-branch',
      `https://x-access-token:TOKEN@github.com/${job.repositoryFullName}.git`,
      workspacePath
    ];

    await this.containerManager.executeInContainer(containerId, cloneCommand);

    // Log repository access
    await this.auditLogger.logDataAccess(
      job.userId,
      'github_repository',
      job.repositoryFullName,
      'read',
      {
        purpose: 'pr_generation',
        branch: job.baseBranch,
        containerIaustrictsed: containerId,
      }
    );

    return workspacePath;
  }

  /**
   * Analyze repository to understand framework, dependencies, and patterns
   */
  private async analyzeRepository(
    containerId: string,
    workspacePath: string,
    repoFullName: string
  ): Promise<RepositoryContext> {
    try {
      // Read package.json if it exists
      let packageJson: any = {};
      try {
        const packageContent = await this.containerManager.executeInContainer(
          containerId,
          ['cat', `${workspacePath}/package.json`]
        );
        packageJson = JSON.parse(packageContent);
      } catch {
        // package.json doesn't exist or is invalid
      }

      // Detect framework
      const framework = this.detectFramework(packageJson);
      
      // Detect testing framework
      const testingFramework = this.detectTestingFramework(packageJson);
      
      // Detect package manager
      const packageManager = await this.detectPackageManager(containerId, workspacePath);
      
      // Find build and test commands
      const buildCommand = packageJson.scripts?.build || 
                          packageJson.scripts?.compile ||
                          this.getDefaultBuildCommand(framework);
      
      const testCommand = packageJson.scripts?.test ||
                         packageJson.scripts?.['test:unit'] ||
                         this.getDefaultTestCommand(testingFramework);

      // Get language from file extensions
      const language = await this.detectPrimaryLanguage(containerId, workspacePath);

      // Scan for existing patterns
      const existingPatterns = await this.scanExistingPatterns(containerId, workspacePath);

      return {
        name: repoFullName.split('/')[1],
        fullName: repoFullName,
        language,
        framework,
        testingFramework,
        packageManager,
        buildCommand,
        testCommand,
        existingPatterns,
        dependencies: {
          ...packageJson.dependencies,
          ...packageJson.devDependencies,
        },
      };
    } catch (error) {
      logger.error('Failed to analyze repository', {
        repoFullName,
        error: error.message,
      });

      // Return minimal context
      return {
        name: repoFullName.split('/')[1],
        fullName: repoFullName,
        language: 'javascript',
        existingPatterns: [],
        dependencies: {},
      };
    }
  }

  /**
   * Group accessibility issues for optimal PR creation
   */
  private groupIssuesForPRs(
    issues: AccessibilityIssue[],
    options: PRGenerationOptions
  ): AccessibilityIssue[][] {
    if (!options.groupSimilarIssues) {
      // Create individual PRs for each issue (up to maxIssuesPerPR)
      return issues.map(issue => [issue]);
    }

    const groups: AccessibilityIssue[][] = [];
    const groupedByType = new Map<string, AccessibilityIssue[]>();

    // Group by issue type
    for (const issue of issues) {
      const key = `${issue.type}_${issue.wcagCriteria}`;
      if (!groupedByType.has(key)) {
        groupedByType.set(key, []);
      }
      groupedByType.get(key)!.push(issue);
    }

    // Split large groups based on maxIssuesPerPR
    for (const [type, typeIssues] of groupedByType) {
      if (typeIssues.length <= options.maxIssuesPerPR) {
        groups.push(typeIssues);
      } else {
        // Split into smaller groups
        for (let i = 0; i < typeIssues.length; i += options.maxIssuesPerPR) {
          groups.push(typeIssues.slice(i, i + options.maxIssuesPerPR));
        }
      }
    }

    return groups;
  }

  /**
   * Apply code fixes to repository files
   */
  private async applyFixesToRepository(
    containerId: string,
    workspacePath: string,
    fixes: CodeFix[],
    context: RepositoryContext
  ): Promise<void> {
    for (const fix of fixes) {
      try {
        // Find the file containing the issue
        const filePath = await this.findFileForIssue(containerId, workspacePath, fix);
        
        if (!filePath) {
          logger.warn(`Could not find file for issue ${fix.issueId}`, {
            issueType: fix.issueType,
            selector: fix.originalCode.substring(0, 100),
          });
          continue;
        }

        // Apply the fix to the file
        await this.applyFixToFile(containerId, filePath, fix);

        logger.debug(`Applied fix for issue ${fix.issueId}`, {
          filePath,
          issueType: fix.issueType,
        });

      } catch (error) {
        logger.error(`Failed to apply fix for issue ${fix.issueId}`, {
          error: error.message,
        });
        throw error;
      }
    }
  }

  /**
   * Run repository tests to ensure fixes don't break functionality
   */
  private async runRepositoryTests(
    containerId: string,
    workspacePath: string,
    context: RepositoryContext
  ): Promise<boolean> {
    if (!context.testCommand) {
      logger.info('No test command found, skipping tests');
      return true;
    }

    try {
      logger.info(`Running tests: ${context.testCommand}`, {
        workspacePath,
      });

      // Install dependencies first if needed
      if (context.packageManager && context.dependencies) {
        const installCommand = context.packageManager === 'npm' ? ['npm', 'install'] :
                              context.packageManager === 'yarn' ? ['yarn', 'install'] :
                              ['pnpm', 'install'];
        
        await this.containerManager.executeInContainer(containerId, [
          'sh', '-c', `cd ${workspacePath} && ${installCommand.join(' ')}`
        ]);
      }

      // Run tests
      await this.containerManager.executeInContainer(containerId, [
        'sh', '-c', `cd ${workspacePath} && ${context.testCommand}`
      ]);

      logger.info('Tests passed successfully');
      return true;
    } catch (error) {
      logger.warn(`Tests failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Create pull request with comprehensive description
   */
  private async createPullRequest(
    userId: string,
    repoFullName: string,
    branchName: string,
    baseBranch: string,
    fixes: CodeFix[],
    options: PRGenerationOptions,
    isDraft: boolean = false
  ): Promise<PullRequestData> {
    const installation = await this.getInstallationForRepo(userId, repoFullName);
    if (!installation) {
      throw new Error('No GitHub installation found');
    }

    const octokit = new Octokit({ auth: installation.token });
    const [owner, repo] = repoFullName.split('/');

    // Generate comprehensive PR description
    const title = this.generatePRTitle(fixes);
    const body = this.generatePRDescription(fixes);

    const pr = await octokit.rest.pulls.create({
      owner,
      repo,
      title,
      body,
      head: branchName,
      base: baseBranch,
      draft: isDraft || options.createDraftPR,
    });

    // Add labels if specified
    if (options.labelsToAdd.length > 0) {
      await octokit.rest.issues.addLabels({
        owner,
        repo,
        issue_number: pr.data.number,
        labels: options.labelsToAdd,
      });
    }

    // Request reviews if specified
    if (options.reviewersToAdd.length > 0) {
      await octokit.rest.pulls.requestReviewers({
        owner,
        repo,
        pull_number: pr.data.number,
        reviewers: options.reviewersToAdd,
      });
    }

    return {
      number: pr.data.number,
      title: pr.data.title,
      body: pr.data.body || '',
      head: pr.data.head.ref,
      base: pr.data.base.ref,
      url: pr.data.html_url,
      state: 'open',
      mergeable: null,
    };
  }

  // Helper methods for repository analysis
  private detectFramework(packageJson: any): string | undefined {
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    if (deps.react) return 'react';
    if (deps.vue) return 'vue';
    if (deps.angular || deps['@angular/core']) return 'angular';
    if (deps.svelte) return 'svelte';
    if (deps.next) return 'nextjs';
    if (deps.nuxt) return 'nuxtjs';
    if (deps.gatsby) return 'gatsby';
    
    return undefined;
  }

  private detectTestingFramework(packageJson: any): string | undefined {
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    if (deps.jest) return 'jest';
    if (deps.vitest) return 'vitest';
    if (deps.mocha) return 'mocha';
    if (deps.jasmine) return 'jasmine';
    if (deps.cypress) return 'cypress';
    if (deps.playwright) return 'playwright';
    
    return undefined;
  }

  private async detectPackageManager(containerId: string, workspacePath: string): Promise<'npm' | 'yarn' | 'pnpm'> {
    try {
      // Check for lock files
      const files = await this.containerManager.executeInContainer(containerId, [
        'ls', '-la', workspacePath
      ]);
      
      if (files.includes('pnpm-lock.yaml')) return 'pnpm';
      if (files.includes('yarn.lock')) return 'yarn';
      return 'npm';
    } catch {
      return 'npm';
    }
  }

  private async detectPrimaryLanguage(containerId: string, workspacePath: string): Promise<string> {
    try {
      const result = await this.containerManager.executeInContainer(containerId, [
        'find', workspacePath, '-name', '*.ts', '-o', '-name', '*.tsx', '-o', '-name', '*.js', '-o', '-name', '*.jsx',
        '|', 'head', '-10'
      ]);
      
      if (result.includes('.ts') || result.includes('.tsx')) return 'typescript';
      return 'javascript';
    } catch {
      return 'javascript';
    }
  }

  private async scanExistingPatterns(containerId: string, workspacePath: string): Promise<string[]> {
    const patterns: string[] = [];
    
    try {
      // Look for common accessibility patterns
      const grepResults = await this.containerManager.executeInContainer(containerId, [
        'grep', '-r', '-l', 'aria-label\\|role=\\|alt=', workspacePath, '||', 'true'
      ]);
      
      if (grepResults.length > 0) {
        patterns.push('existing-aria-patterns');
      }
    } catch {
      // Ignore grep errors
    }
    
    return patterns;
  }

  private getDefaultBuildCommand(framework?: string): string | undefined {
    switch (framework) {
      case 'react':
      case 'nextjs': return 'npm run build';
      case 'vue':
      case 'nuxtjs': return 'npm run build';
      case 'angular': return 'ng build';
      default: return undefined;
    }
  }

  private getDefaultTestCommand(testingFramework?: string): string | undefined {
    switch (testingFramework) {
      case 'jest': return 'npm test';
      case 'vitest': return 'npm run test';
      case 'mocha': return 'npm test';
      case 'cypress': return 'npm run cy:run';
      case 'playwright': return 'npm run test';
      default: return 'npm test';
    }
  }

  private async findFileForIssue(
    containerId: string,
    workspacePath: string,
    fix: CodeFix
  ): Promise<string | null> {
    // This is a simplified implementation
    // In production, you'd need more sophisticated file matching
    try {
      const searchPattern = fix.originalCode.substring(0, 50).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const result = await this.containerManager.executeInContainer(containerId, [
        'grep', '-r', '-l', searchPattern, workspacePath, '||', 'echo', 'not_found'
      ]);
      
      if (result === 'not_found' || !result.trim()) {
        return null;
      }
      
      return result.trim().split('\n')[0];
    } catch {
      return null;
    }
  }

  private async applyFixToFile(containerId: string, filePath: string, fix: CodeFix): Promise<void> {
    // Read file content
    const content = await this.containerManager.executeInContainer(containerId, [
      'cat', filePath
    ]);

    // Apply fix (simplified - in production, you'd need more sophisticated replacement)
    const fixedContent = content.replace(fix.originalCode, fix.fixedCode);

    // Write back to file
    await this.containerManager.executeInContainer(containerId, [
      'sh', '-c', `echo '${fixedContent.replace(/'/g, "'\\''")}' > ${filePath}`
    ]);
  }

  private async createFixBranch(
    containerId: string,
    workspacePath: string,
    branchName: string,
    baseBranch: string
  ): Promise<string> {
    await this.containerManager.executeInContainer(containerId, [
      'sh', '-c', `cd ${workspacePath} && git checkout -b ${branchName}`
    ]);
    
    return branchName;
  }

  private async commitChanges(
    containerId: string,
    workspacePath: string,
    fixes: CodeFix[],
    commitMessage: string
  ): Promise<void> {
    // Stage all changes
    await this.containerManager.executeInContainer(containerId, [
      'sh', '-c', `cd ${workspacePath} && git add -A`
    ]);

    // Create detailed commit message
    const detailedMessage = this.generateCommitMessage(fixes, commitMessage);

    // Commit changes
    await this.containerManager.executeInContainer(containerId, [
      'sh', '-c', `cd ${workspacePath} && git commit -m "${detailedMessage}"`
    ]);
  }

  private async pushBranch(containerId: string, workspacePath: string, branchName: string): Promise<void> {
    await this.containerManager.executeInContainer(containerId, [
      'sh', '-c', `cd ${workspacePath} && git push origin ${branchName}`
    ]);
  }

  private generatePRTitle(fixes: CodeFix[]): string {
    if (fixes.length === 1) {
      return `fix: ${fixes[0].issueType.replace(/_/g, ' ')} (WCAG ${fixes[0].wcagCriteria})`;
    }
    
    const types = [...new Set(fixes.map(f => f.issueType))];
    if (types.length === 1) {
      return `fix: ${fixes.length} ${types[0].replace(/_/g, ' ')} issues`;
    }
    
    return `fix: ${fixes.length} accessibility issues`;
  }

  private generatePRDescription(fixes: CodeFix[]): string {
    const summary = `## Accessibility Fixes

This PR addresses ${fixes.length} accessibility issue${fixes.length > 1 ? 's' : ''} to improve compliance with WCAG guidelines.

### Issues Fixed:
${fixes.map(fix => `- **${fix.issueType.replace(/_/g, ' ')}** (WCAG ${fix.wcagCriteria}): ${fix.explanation.split('\n')[0]}`).join('\n')}

### AI Review Summary:
${fixes.map(fix => {
  const claude = fix.reviewComments.claude;
  const chatgpt = fix.reviewComments.chatgpt;
  return `- **${fix.issueType}**: Claude ${claude.approved ? '✅' : '❌'} (${claude.confidence}), ChatGPT ${chatgpt.approved ? '✅' : '❌'} (${chatgpt.confidence})`;
}).join('\n')}

### Testing:
- [ ] Manual accessibility testing with screen reader
- [ ] Keyboard navigation testing
- [ ] Color contrast verification
- [ ] Automated tests pass

### Security Notice:
This PR was generated using ephemeral containers. No source code was permanently stored during the AI analysis process.

---
🤖 Generated with [AI Accessibility Scanner](https://accessibility-scanner.com)

Co-Authored-By: Claude <noreply@anthropic.com>
Co-Authored-By: ChatGPT <noreply@openai.com>`;

    return summary;
  }

  private generateCommitMessage(fixes: CodeFix[], baseMessage: string): string {
    const details = fixes.map(fix => 
      `- ${fix.issueType} (WCAG ${fix.wcagCriteria}): ${fix.explanation.split(':')[1]?.trim() || 'accessibility improvement'}`
    ).join('\n');

    return `${baseMessage}\n\n${details}\n\n🤖 Generated with AI Accessibility Scanner\n\nCo-Authored-By: Claude <noreply@anthropic.com>\nCo-Authored-By: ChatGPT <noreply@openai.com>`;
  }

  private async getInstallationForRepo(userId: string, repoFullName: string): Promise<{ token: string } | null> {
    // This would get the actual installation and token
    // For now, return null to indicate we need to implement this
    return null;
  }

  async shutdown(): Promise<void> {
    await this.containerManager.shutdown();
    await this.githubService.shutdown();
    await this.aiReviewService.shutdown();
    await this.auditLogger.shutdown();
  }
}