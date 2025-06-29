import { Redis } from '@upstash/redis';
import { ScanJob, ScanResult } from '../types/scan';
import { ScanExecutor } from './scanExecutor';
import { AuditLogger } from './auditLogger';
import { ResultStorage } from './resultStorage';
import { logger } from '../utils/logger';

export interface QueueConfig {
  redisUrl: string;
  redisToken: string;
  maxConcurrency: number;
  retryAttempts: number;
  retryBackoffMs: number;
  deadLetterQueue: string;
  processingTimeout: number;
}

export class QueueProcessor {
  private redis: Redis;
  private scanExecutor: ScanExecutor;
  private auditLogger: AuditLogger;
  private resultStorage: ResultStorage;
  private config: QueueConfig;
  private isProcessing: boolean = false;
  private activeJobs: Map<string, NodeJS.Timeout> = new Map();
  private processingPromises: Set<Promise<void>> = new Set();

  constructor(config: QueueConfig) {
    this.config = config;
    this.redis = new Redis({
      url: config.redisUrl,
      token: config.redisToken,
    });
    this.scanExecutor = new ScanExecutor();
    this.auditLogger = new AuditLogger();
    this.resultStorage = new ResultStorage();
  }

  async start(): Promise<void> {
    logger.info('Starting queue processor', {
      maxConcurrency: this.config.maxConcurrency,
      deadLetterQueue: this.config.deadLetterQueue,
    });

    this.isProcessing = true;
    
    // Start processing jobs
    for (let i = 0; i < this.config.maxConcurrency; i++) {
      this.processJobsWorker();
    }

    // Start health check
    this.startHealthCheck();

    logger.info('Queue processor started successfully');
  }

  async stop(): Promise<void> {
    logger.info('Stopping queue processor');
    
    this.isProcessing = false;
    
    // Cancel active job timeouts
    for (const [jobId, timeout] of this.activeJobs) {
      clearTimeout(timeout);
      logger.warn(`Cancelled timeout for job ${jobId} during shutdown`);
    }
    this.activeJobs.clear();

    // Wait for active jobs to complete
    if (this.processingPromises.size > 0) {
      logger.info(`Waiting for ${this.processingPromises.size} active jobs to complete`);
      await Promise.allSettled(this.processingPromises);
    }

    // Cleanup services
    await this.scanExecutor.shutdown();
    await this.auditLogger.shutdown();

    logger.info('Queue processor stopped');
  }

  async enqueueJob(job: ScanJob): Promise<void> {
    try {
      const jobData = JSON.stringify(job);
      
      // Add to processing queue with priority
      const priority = this.getJobPriority(job);
      await this.redis.zadd('scan_jobs', { score: priority, member: jobData });

      // Track job in audit log
      await this.auditLogger.logScanActivity(
        job.userId,
        job.id,
        'job_enqueued',
        {
          url: job.url,
          priority,
          options: job.options,
        }
      );

      logger.info(`Job enqueued successfully`, {
        jobId: job.id,
        userId: job.userId,
        url: job.url,
        priority,
      });
    } catch (error) {
      logger.error(`Failed to enqueue job`, {
        jobId: job.id,
        error: error.message,
      });
      throw error;
    }
  }

  async getQueueStats(): Promise<{
    pending: number;
    processing: number;
    deadLetter: number;
    completed: number;
    failed: number;
  }> {
    try {
      const [pending, processing, deadLetter] = await Promise.all([
        this.redis.zcard('scan_jobs'),
        this.redis.scard('processing_jobs'),
        this.redis.llen(this.config.deadLetterQueue),
      ]);

      // Get completed/failed counts from storage
      const stats = await this.resultStorage.getJobStats();

      return {
        pending: pending || 0,
        processing: processing || 0,
        deadLetter: deadLetter || 0,
        completed: stats.completed,
        failed: stats.failed,
      };
    } catch (error) {
      logger.error('Failed to get queue stats', {
        error: error.message,
      });
      return {
        pending: 0,
        processing: 0,
        deadLetter: 0,
        completed: 0,
        failed: 0,
      };
    }
  }

  private async processJobsWorker(): Promise<void> {
    while (this.isProcessing) {
      try {
        // Get next job from queue
        const jobData = await this.getNextJob();
        if (!jobData) {
          // No jobs available, wait before checking again
          await this.sleep(1000);
          continue;
        }

        const job = JSON.parse(jobData) as ScanJob;
        
        // Start processing
        const processingPromise = this.processJob(job);
        this.processingPromises.add(processingPromise);
        
        // Clean up promise when done
        processingPromise.finally(() => {
          this.processingPromises.delete(processingPromise);
        });

        await processingPromise;
      } catch (error) {
        logger.error('Error in job processing worker', {
          error: error.message,
        });
        
        // Wait before retrying to avoid tight loops
        await this.sleep(5000);
      }
    }
  }

  private async getNextJob(): Promise<string | null> {
    try {
      // Pop job with highest priority (lowest score)
      const result = await this.redis.zpopmin('scan_jobs', 1);
      
      if (!result || result.length === 0) {
        return null;
      }

      return result[0].element;
    } catch (error) {
      logger.error('Failed to get next job from queue', {
        error: error.message,
      });
      return null;
    }
  }

  private async processJob(job: ScanJob): Promise<void> {
    const startTime = Date.now();
    
    try {
      logger.info(`Processing job ${job.id}`, {
        jobId: job.id,
        userId: job.userId,
        url: job.url,
      });

      // Mark job as processing
      await this.markJobProcessing(job.id);

      // Set processing timeout
      const timeoutHandle = setTimeout(async () => {
        await this.handleJobTimeout(job.id);
      }, this.config.processingTimeout);
      
      this.activeJobs.set(job.id, timeoutHandle);

      // Execute the scan
      const result = await this.scanExecutor.executeScan(job);

      // Clear timeout
      clearTimeout(timeoutHandle);
      this.activeJobs.delete(job.id);

      // Store result (no source code, only results)
      await this.resultStorage.storeResult(result);

      // Remove from processing set
      await this.markJobCompleted(job.id);

      // Log success
      await this.auditLogger.logScanActivity(
        job.userId,
        job.id,
        'job_completed',
        {
          url: job.url,
          duration: Date.now() - startTime,
          issueCount: result.issues.length,
          status: result.status,
        },
        'success'
      );

      logger.info(`Job completed successfully`, {
        jobId: job.id,
        duration: Date.now() - startTime,
        issueCount: result.issues.length,
      });
    } catch (error) {
      // Clear timeout
      const timeoutHandle = this.activeJobs.get(job.id);
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
        this.activeJobs.delete(job.id);
      }

      // Handle job failure
      await this.handleJobFailure(job, error);

      logger.error(`Job failed`, {
        jobId: job.id,
        userId: job.userId,
        url: job.url,
        error: error.message,
        duration: Date.now() - startTime,
      });
    }
  }

  private async markJobProcessing(jobId: string): Promise<void> {
    try {
      await this.redis.sadd('processing_jobs', jobId);
      await this.redis.expire(`processing:${jobId}`, Math.ceil(this.config.processingTimeout / 1000));
    } catch (error) {
      logger.error(`Failed to mark job as processing`, {
        jobId,
        error: error.message,
      });
    }
  }

  private async markJobCompleted(jobId: string): Promise<void> {
    try {
      await this.redis.srem('processing_jobs', jobId);
      await this.redis.del(`processing:${jobId}`);
    } catch (error) {
      logger.error(`Failed to mark job as completed`, {
        jobId,
        error: error.message,
      });
    }
  }

  private async handleJobTimeout(jobId: string): Promise<void> {
    try {
      logger.warn(`Job timed out`, { jobId });

      // Remove from processing
      await this.redis.srem('processing_jobs', jobId);
      await this.redis.del(`processing:${jobId}`);

      // Create timeout result
      const timeoutResult: ScanResult = {
        jobId,
        url: 'unknown',
        status: 'timeout',
        issues: [],
        metrics: {
          totalElements: 0,
          totalIssues: 0,
          issuesBySeverity: {},
          issuesByType: {},
          scanDuration: this.config.processingTimeout,
          renderTime: 0,
          ruleExecutionTimes: {},
          memoryUsage: { peak: 0, average: 0 },
        },
        error: 'Job timed out',
        completedAt: new Date(),
      };

      await this.resultStorage.storeResult(timeoutResult);

      // Log security event
      await this.auditLogger.logContainerActivity(
        jobId,
        'job_timeout',
        {
          timeout: this.config.processingTimeout,
          reason: 'Processing exceeded maximum time limit',
        },
        'medium'
      );
    } catch (error) {
      logger.error(`Failed to handle job timeout`, {
        jobId,
        error: error.message,
      });
    }
  }

  private async handleJobFailure(job: ScanJob, error: Error): Promise<void> {
    try {
      // Remove from processing
      await this.markJobCompleted(job.id);

      // Check retry attempts
      const currentAttempts = job.metadata.retryCount || 0;
      
      if (currentAttempts < this.config.retryAttempts) {
        // Retry job with exponential backoff
        const retryJob: ScanJob = {
          ...job,
          metadata: {
            ...job.metadata,
            retryCount: currentAttempts + 1,
          },
        };

        const delay = this.config.retryBackoffMs * Math.pow(2, currentAttempts);
        
        setTimeout(async () => {
          await this.enqueueJob(retryJob);
        }, delay);

        logger.info(`Job scheduled for retry`, {
          jobId: job.id,
          attempt: currentAttempts + 1,
          delay,
        });
      } else {
        // Move to dead letter queue
        await this.moveToDeadLetterQueue(job, error);

        // Store failed result
        const failedResult: ScanResult = {
          jobId: job.id,
          url: job.url,
          status: 'failed',
          issues: [],
          metrics: {
            totalElements: 0,
            totalIssues: 0,
            issuesBySeverity: {},
            issuesByType: {},
            scanDuration: 0,
            renderTime: 0,
            ruleExecutionTimes: {},
            memoryUsage: { peak: 0, average: 0 },
          },
          error: error.message,
          completedAt: new Date(),
        };

        await this.resultStorage.storeResult(failedResult);
      }

      // Log failure
      await this.auditLogger.logScanActivity(
        job.userId,
        job.id,
        'job_failed',
        {
          url: job.url,
          error: error.message,
          retryCount: job.metadata.retryCount,
        },
        'failure'
      );
    } catch (handleError) {
      logger.error(`Failed to handle job failure`, {
        jobId: job.id,
        originalError: error.message,
        handleError: handleError.message,
      });
    }
  }

  private async moveToDeadLetterQueue(job: ScanJob, error: Error): Promise<void> {
    try {
      const deadLetterEntry = {
        job,
        error: error.message,
        timestamp: new Date(),
        attempts: job.metadata.retryCount,
      };

      await this.redis.lpush(this.config.deadLetterQueue, JSON.stringify(deadLetterEntry));

      logger.warn(`Job moved to dead letter queue`, {
        jobId: job.id,
        error: error.message,
        attempts: job.metadata.retryCount,
      });
    } catch (dlqError) {
      logger.error(`Failed to move job to dead letter queue`, {
        jobId: job.id,
        error: dlqError.message,
      });
    }
  }

  private getJobPriority(job: ScanJob): number {
    // Lower score = higher priority
    let priority = Date.now(); // Default: FIFO

    // Adjust based on job priority
    switch (job.metadata.priority) {
      case 'high':
        priority -= 1000000; // Process first
        break;
      case 'normal':
        priority -= 500000;
        break;
      case 'low':
        // Use timestamp as-is
        break;
    }

    return priority;
  }

  private startHealthCheck(): void {
    setInterval(async () => {
      try {
        const stats = await this.getQueueStats();
        
        logger.debug('Queue health check', {
          pending: stats.pending,
          processing: stats.processing,
          deadLetter: stats.deadLetter,
          activeJobs: this.activeJobs.size,
        });

        // Alert on high dead letter queue
        if (stats.deadLetter > 10) {
          logger.warn('High dead letter queue count', {
            deadLetterCount: stats.deadLetter,
          });
        }

        // Alert on stuck processing jobs
        if (this.activeJobs.size > this.config.maxConcurrency * 2) {
          logger.warn('High number of active jobs detected', {
            activeJobs: this.activeJobs.size,
            maxConcurrency: this.config.maxConcurrency,
          });
        }
      } catch (error) {
        logger.error('Health check failed', {
          error: error.message,
        });
      }
    }, 30000); // Check every 30 seconds
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}