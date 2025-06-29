import Bull from 'bull';
import { queueRedis } from './redis';
import { logger } from '../utils/logger';

// Queue configuration
const queueOptions = {
  redis: queueRedis,
  defaultJobOptions: {
    removeOnComplete: 10, // Keep last 10 completed jobs
    removeOnFail: 50,     // Keep last 50 failed jobs
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
  settings: {
    stalledInterval: 30 * 1000,    // 30 seconds
    maxStalledCount: 1,
  },
};

// Scan queue for processing website scans
export const scanQueue = new Bull('scan-queue', queueOptions);

// PR queue for generating pull requests
export const prQueue = new Bull('pr-queue', queueOptions);

// Email queue for sending notifications
export const emailQueue = new Bull('email-queue', queueOptions);

// Dead letter queue for failed jobs
export const deadLetterQueue = new Bull('dead-letter-queue', {
  ...queueOptions,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 100,
    attempts: 1, // No retries for dead letter queue
  },
});

// Job types
export interface ScanJob {
  scanId: string;
  url: string;
  userId: string;
  repositoryId?: string;
  options?: {
    wcagLevel?: 'A' | 'AA' | 'AAA';
    includeWarnings?: boolean;
    maxPages?: number;
  };
}

export interface PRJob {
  issueIds: string[];
  repositoryId: string;
  userId: string;
  branchName: string;
  options?: {
    groupSimilar?: boolean;
    runTests?: boolean;
  };
}

export interface EmailJob {
  to: string;
  template: string;
  data: Record<string, any>;
  userId?: string;
}

export interface DeadLetterJob {
  originalQueue: string;
  originalJobId: string;
  failedAt: Date;
  attempts: number;
  error: string;
  data: any;
}

// Queue event handlers
scanQueue.on('completed', (job, result) => {
  logger.info(`Scan job ${job.id} completed`, { scanId: job.data.scanId, result });
});

scanQueue.on('failed', async (job, err) => {
  logger.error(`Scan job ${job.id} failed`, { 
    scanId: job.data.scanId, 
    error: err.message,
    attempts: job.attemptsMade 
  });
  
  // Move to dead letter queue if max attempts reached
  if (job.attemptsMade >= (job.opts.attempts || 3)) {
    await deadLetterQueue.add('failed-scan', {
      originalQueue: 'scan-queue',
      originalJobId: job.id,
      failedAt: new Date(),
      attempts: job.attemptsMade,
      error: err.message,
      data: job.data,
    });
  }
});

prQueue.on('completed', (job, result) => {
  logger.info(`PR job ${job.id} completed`, { issueIds: job.data.issueIds, result });
});

prQueue.on('failed', async (job, err) => {
  logger.error(`PR job ${job.id} failed`, { 
    issueIds: job.data.issueIds, 
    error: err.message,
    attempts: job.attemptsMade 
  });
  
  if (job.attemptsMade >= (job.opts.attempts || 3)) {
    await deadLetterQueue.add('failed-pr', {
      originalQueue: 'pr-queue',
      originalJobId: job.id,
      failedAt: new Date(),
      attempts: job.attemptsMade,
      error: err.message,
      data: job.data,
    });
  }
});

emailQueue.on('completed', (job) => {
  logger.info(`Email job ${job.id} completed`, { to: job.data.to, template: job.data.template });
});

emailQueue.on('failed', async (job, err) => {
  logger.error(`Email job ${job.id} failed`, { 
    to: job.data.to, 
    template: job.data.template,
    error: err.message 
  });
  
  if (job.attemptsMade >= (job.opts.attempts || 3)) {
    await deadLetterQueue.add('failed-email', {
      originalQueue: 'email-queue',
      originalJobId: job.id,
      failedAt: new Date(),
      attempts: job.attemptsMade,
      error: err.message,
      data: job.data,
    });
  }
});

// Queue health check
export async function checkQueueHealth(): Promise<{
  scan: boolean;
  pr: boolean;
  email: boolean;
  deadLetter: boolean;
}> {
  try {
    const [scanWaiting, prWaiting, emailWaiting, dlWaiting] = await Promise.all([
      scanQueue.waiting(),
      prQueue.waiting(),
      emailQueue.waiting(),
      deadLetterQueue.waiting(),
    ]);

    return {
      scan: true,
      pr: true,
      email: true,
      deadLetter: true,
    };
  } catch (error) {
    logger.error('Queue health check failed', error);
    return {
      scan: false,
      pr: false,
      email: false,
      deadLetter: false,
    };
  }
}

// Graceful shutdown
export async function closeQueues(): Promise<void> {
  try {
    await Promise.all([
      scanQueue.close(),
      prQueue.close(),
      emailQueue.close(),
      deadLetterQueue.close(),
    ]);
    logger.info('All queues closed');
  } catch (error) {
    logger.error('Error closing queues', error);
  }
}

// Add jobs helper functions
export const addScanJob = (data: ScanJob, options?: Bull.JobOptions) => 
  scanQueue.add('scan-website', data, options);

export const addPRJob = (data: PRJob, options?: Bull.JobOptions) => 
  prQueue.add('generate-pr', data, options);

export const addEmailJob = (data: EmailJob, options?: Bull.JobOptions) => 
  emailQueue.add('send-email', data, options);

// Retry failed jobs from dead letter queue
export async function retryDeadLetterJob(jobId: string): Promise<void> {
  const job = await deadLetterQueue.getJob(jobId);
  if (!job) {
    throw new Error(`Dead letter job ${jobId} not found`);
  }

  const deadLetterData = job.data as DeadLetterJob;
  
  switch (deadLetterData.originalQueue) {
    case 'scan-queue':
      await addScanJob(deadLetterData.data);
      break;
    case 'pr-queue':
      await addPRJob(deadLetterData.data);
      break;
    case 'email-queue':
      await addEmailJob(deadLetterData.data);
      break;
    default:
      throw new Error(`Unknown original queue: ${deadLetterData.originalQueue}`);
  }

  await job.remove();
  logger.info(`Retried dead letter job ${jobId} from ${deadLetterData.originalQueue}`);
}