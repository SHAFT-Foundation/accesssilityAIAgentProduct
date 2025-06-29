import puppeteer, { Browser, Page } from 'puppeteer';
import { ContainerManager } from './containerManager';
import { WCAGRuleEngine } from './wcagRuleEngine';
import { ScanJob, ScanResult, ScanMetrics, ScreenshotData, ContainerConfig } from '../types/scan';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export class ScanExecutor {
  private containerManager: ContainerManager;
  private ruleEngine: WCAGRuleEngine;

  constructor() {
    this.containerManager = new ContainerManager();
    this.ruleEngine = new WCAGRuleEngine();
  }

  async executeScan(job: ScanJob): Promise<ScanResult> {
    const startTime = Date.now();
    let containerId: string | null = null;

    try {
      logger.info(`Starting scan for ${job.url}`, {
        jobId: job.id,
        url: job.url,
        userId: job.userId,
      });

      // Create secure container for scanning
      containerId = await this.createScanContainer(job);

      // Execute scan in container
      const result = await this.runScanInContainer(containerId, job);

      logger.info(`Scan completed for ${job.url}`, {
        jobId: job.id,
        duration: Date.now() - startTime,
        issueCount: result.issues.length,
      });

      return result;
    } catch (error) {
      logger.error(`Scan failed for ${job.url}`, {
        jobId: job.id,
        error: error.message,
        duration: Date.now() - startTime,
      });

      return {
        jobId: job.id,
        url: job.url,
        status: 'failed',
        issues: [],
        metrics: this.createFailedMetrics(startTime),
        error: error.message,
        completedAt: new Date(),
      };
    } finally {
      // Always clean up container
      if (containerId) {
        await this.containerManager.cleanupContainer(containerId, 'scan_completed');
      }
    }
  }

  private async createScanContainer(job: ScanJob): Promise<string> {
    const config: ContainerConfig = {
      image: 'accessibility-scanner:latest',
      memory: '1024m',
      cpu: '50%',
      networkMode: 'isolated',
      removeOnExit: true,
      timeout: job.options.timeout || 60000,
      volumes: [
        {
          host: '/tmp/scan-results',
          container: '/app/results',
          readonly: false,
        },
      ],
      environment: {
        SCAN_URL: job.url,
        SCAN_JOB_ID: job.id,
        VIEWPORT_WIDTH: job.options.viewport.width.toString(),
        VIEWPORT_HEIGHT: job.options.viewport.height.toString(),
        USER_AGENT: job.options.userAgent || 'AccessibilityScanner/1.0',
        TIMEOUT: job.options.timeout.toString(),
        INCLUDE_HIDDEN: job.options.includeHidden.toString(),
        NODE_ENV: 'production',
      },
    };

    return await this.containerManager.createSecureContainer(config);
  }

  private async runScanInContainer(containerId: string, job: ScanJob): Promise<ScanResult> {
    const startTime = Date.now();
    
    // Launch Puppeteer in the container
    const browser = await this.launchSecureBrowser(containerId);
    
    try {
      const page = await browser.newPage();
      
      // Configure page security
      await this.configurePagSecurity(page, job);
      
      // Navigate to target URL
      await this.navigateToPage(page, job);
      
      // Run accessibility rules
      const issues = await this.ruleEngine.runAllRules(
        page,
        job.options.includeRules,
        job.options.excludeRules
      );
      
      // Capture screenshots if needed
      const screenshots = await this.captureScreenshots(page, job);
      
      // Calculate metrics
      const metrics = await this.calculateMetrics(page, startTime, issues);
      
      return {
        jobId: job.id,
        url: job.url,
        status: 'completed',
        issues,
        metrics,
        screenshots,
        completedAt: new Date(),
      };
    } finally {
      await browser.close();
    }
  }

  private async launchSecureBrowser(containerId: string): Promise<Browser> {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: [
        // Security flags
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        
        // Privacy flags
        '--disable-sync',
        '--disable-translate',
        '--disable-extensions',
        '--disable-default-apps',
        '--disable-component-extensions-with-background-pages',
        
        // Network restrictions
        '--disable-background-networking',
        '--disable-client-side-phishing-detection',
        '--disable-default-browser-check',
        '--disable-hang-monitor',
        '--disable-prompt-on-repost',
        
        // Resource limits
        '--memory-pressure-off',
        '--max_old_space_size=512',
        
        // Container-specific
        '--single-process',
        '--no-crash-upload',
      ],
      executablePath: process.env.CHROME_EXECUTABLE_PATH,
      timeout: 30000,
    });

    // Monitor browser process
    browser.process()?.on('error', (error) => {
      logger.error(`Browser process error in container ${containerId}`, {
        containerId,
        error: error.message,
      });
    });

    return browser;
  }

  private async configurePagSecurity(page: Page, job: ScanJob): Promise<void> {
    // Set viewport
    await page.setViewport({
      width: job.options.viewport.width,
      height: job.options.viewport.height,
      deviceScaleFactor: 1,
    });

    // Set user agent
    if (job.options.userAgent) {
      await page.setUserAgent(job.options.userAgent);
    }

    // Block unnecessary resources to reduce attack surface
    await page.setRequestInterception(true);
    
    page.on('request', (request) => {
      const resourceType = request.resourceType();
      const url = request.url();

      // Block potentially dangerous resources
      if (resourceType === 'websocket' || 
          resourceType === 'eventsource' ||
          url.includes('data:') ||
          url.includes('blob:')) {
        request.abort();
        return;
      }

      // Block third-party tracking
      if (url.includes('analytics') || 
          url.includes('tracking') ||
          url.includes('facebook.com') ||
          url.includes('google-analytics.com')) {
        request.abort();
        return;
      }

      request.continue();
    });

    // Handle security errors
    page.on('error', (error) => {
      logger.warn(`Page error during scan`, {
        jobId: job.id,
        url: job.url,
        error: error.message,
      });
    });

    page.on('pageerror', (error) => {
      logger.warn(`Page JavaScript error during scan`, {
        jobId: job.id,
        url: job.url,
        error: error.message,
      });
    });

    // Set timeouts
    page.setDefaultTimeout(job.options.timeout);
    page.setDefaultNavigationTimeout(job.options.timeout);
  }

  private async navigateToPage(page: Page, job: ScanJob): Promise<void> {
    try {
      const response = await page.goto(job.url, {
        waitUntil: 'networkidle0',
        timeout: job.options.timeout,
      });

      if (!response) {
        throw new Error('No response received from target URL');
      }

      const status = response.status();
      if (status >= 400) {
        throw new Error(`HTTP ${status}: ${response.statusText()}`);
      }

      // Wait for additional selector if specified
      if (job.options.waitForSelector) {
        await page.waitForSelector(job.options.waitForSelector, {
          timeout: 10000,
        });
      }

      // Allow page to settle
      await page.waitForTimeout(2000);

      logger.debug(`Page loaded successfully`, {
        jobId: job.id,
        url: job.url,
        status,
        title: await page.title(),
      });
    } catch (error) {
      throw new Error(`Failed to navigate to ${job.url}: ${error.message}`);
    }
  }

  private async captureScreenshots(page: Page, job: ScanJob): Promise<ScreenshotData[]> {
    const screenshots: ScreenshotData[] = [];

    try {
      // Full page screenshot
      const fullPageBuffer = await page.screenshot({
        fullPage: true,
        type: 'png',
        quality: 80,
      });

      screenshots.push({
        type: 'full',
        base64: fullPageBuffer.toString('base64'),
        metadata: {
          viewport: job.options.viewport,
          devicePixelRatio: 1,
          timestamp: new Date(),
        },
      });

      // Viewport screenshot
      const viewportBuffer = await page.screenshot({
        fullPage: false,
        type: 'png',
        quality: 80,
      });

      screenshots.push({
        type: 'element',
        base64: viewportBuffer.toString('base64'),
        metadata: {
          viewport: job.options.viewport,
          devicePixelRatio: 1,
          timestamp: new Date(),
        },
      });
    } catch (error) {
      logger.warn(`Failed to capture screenshots`, {
        jobId: job.id,
        error: error.message,
      });
    }

    return screenshots;
  }

  private async calculateMetrics(page: Page, startTime: number, issues: any[]): Promise<ScanMetrics> {
    const endTime = Date.now();
    const scanDuration = endTime - startTime;

    try {
      const pageMetrics = await page.evaluate(() => {
        return {
          totalElements: document.querySelectorAll('*').length,
          renderTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
          memoryUsage: (performance as any).memory ? {
            peak: (performance as any).memory.usedJSHeapSize,
            average: (performance as any).memory.totalJSHeapSize,
          } : { peak: 0, average: 0 },
        };
      });

      const issuesBySeverity = issues.reduce((acc, issue) => {
        acc[issue.severity] = (acc[issue.severity] || 0) + 1;
        return acc;
      }, {});

      const issuesByType = issues.reduce((acc, issue) => {
        acc[issue.type] = (acc[issue.type] || 0) + 1;
        return acc;
      }, {});

      return {
        totalElements: pageMetrics.totalElements,
        totalIssues: issues.length,
        issuesBySeverity,
        issuesByType,
        scanDuration,
        renderTime: pageMetrics.renderTime,
        ruleExecutionTimes: {}, // Would be populated by rule engine
        memoryUsage: pageMetrics.memoryUsage,
      };
    } catch (error) {
      logger.warn(`Failed to calculate metrics`, {
        error: error.message,
      });

      return {
        totalElements: 0,
        totalIssues: issues.length,
        issuesBySeverity: {},
        issuesByType: {},
        scanDuration,
        renderTime: 0,
        ruleExecutionTimes: {},
        memoryUsage: { peak: 0, average: 0 },
      };
    }
  }

  private createFailedMetrics(startTime: number): ScanMetrics {
    return {
      totalElements: 0,
      totalIssues: 0,
      issuesBySeverity: {},
      issuesByType: {},
      scanDuration: Date.now() - startTime,
      renderTime: 0,
      ruleExecutionTimes: {},
      memoryUsage: { peak: 0, average: 0 },
    };
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down scan executor');
    await this.containerManager.shutdown();
  }
}