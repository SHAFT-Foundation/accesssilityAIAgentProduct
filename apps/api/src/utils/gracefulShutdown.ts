import { Logger } from './logger';
import { EventEmitter } from 'events';

interface ShutdownHandler {
  name: string;
  handler: () => Promise<void>;
  timeout: number;
  priority: number;
}

interface ShutdownOptions {
  signals: string[];
  timeout: number;
  forceExitTimeout: number;
  logger?: Logger;
}

export class GracefulShutdown extends EventEmitter {
  private logger: Logger;
  private handlers: ShutdownHandler[] = [];
  private isShuttingDown: boolean = false;
  private options: ShutdownOptions;
  private signalListeners: Map<string, () => void> = new Map();

  constructor(options: Partial<ShutdownOptions> = {}) {
    super();
    
    this.options = {
      signals: ['SIGTERM', 'SIGINT', 'SIGUSR2'],
      timeout: 30000, // 30 seconds
      forceExitTimeout: 35000, // 35 seconds
      ...options,
    };
    
    this.logger = options.logger || new Logger('GracefulShutdown');
    this.setupSignalHandlers();
  }

  private setupSignalHandlers(): void {
    this.options.signals.forEach(signal => {
      const listener = () => {
        this.logger.info(`Received ${signal}, initiating graceful shutdown`);
        this.shutdown(signal);
      };
      
      process.on(signal, listener);
      this.signalListeners.set(signal, listener);
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      this.logger.error('Uncaught exception, initiating emergency shutdown', { error });
      this.emergencyShutdown('uncaughtException', error);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      this.logger.error('Unhandled promise rejection, initiating emergency shutdown', { 
        reason,
        promise: promise.toString(),
      });
      this.emergencyShutdown('unhandledRejection', reason);
    });
  }

  addHandler(
    name: string,
    handler: () => Promise<void>,
    timeout: number = 10000,
    priority: number = 0
  ): void {
    this.handlers.push({
      name,
      handler,
      timeout,
      priority,
    });

    // Sort handlers by priority (higher priority first)
    this.handlers.sort((a, b) => b.priority - a.priority);
    
    this.logger.debug(`Added shutdown handler: ${name}`, { 
      timeout, 
      priority,
      totalHandlers: this.handlers.length,
    });
  }

  removeHandler(name: string): void {
    this.handlers = this.handlers.filter(h => h.name !== name);
    this.logger.debug(`Removed shutdown handler: ${name}`);
  }

  async shutdown(signal?: string): Promise<void> {
    if (this.isShuttingDown) {
      this.logger.warn('Shutdown already in progress, ignoring duplicate signal');
      return;
    }

    this.isShuttingDown = true;
    const startTime = Date.now();
    
    this.logger.info('Starting graceful shutdown', {
      signal,
      handlersCount: this.handlers.length,
      timeout: this.options.timeout,
    });

    this.emit('shutdown:start', { signal });

    // Set up force exit timeout
    const forceExitTimer = setTimeout(() => {
      this.logger.error('Force exit timeout reached, terminating process');
      this.emit('shutdown:force_exit');
      process.exit(1);
    }, this.options.forceExitTimeout);

    try {
      // Execute shutdown handlers
      await this.executeHandlers();
      
      const duration = Date.now() - startTime;
      this.logger.info('Graceful shutdown completed successfully', { 
        duration,
        handlersExecuted: this.handlers.length,
      });
      
      this.emit('shutdown:complete', { duration });
      
      // Clear the force exit timer
      clearTimeout(forceExitTimer);
      
      // Exit gracefully
      process.exit(0);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('Graceful shutdown failed', { error, duration });
      
      this.emit('shutdown:error', { error, duration });
      
      // Clear the force exit timer
      clearTimeout(forceExitTimer);
      
      // Exit with error code
      process.exit(1);
    }
  }

  private async executeHandlers(): Promise<void> {
    const results: Array<{ name: string; success: boolean; duration: number; error?: Error }> = [];
    
    for (const { name, handler, timeout } of this.handlers) {
      const startTime = Date.now();
      
      try {
        this.logger.info(`Executing shutdown handler: ${name}`, { timeout });
        this.emit('shutdown:handler_start', { name });
        
        // Execute handler with timeout
        await this.executeWithTimeout(handler, timeout, name);
        
        const duration = Date.now() - startTime;
        results.push({ name, success: true, duration });
        
        this.logger.info(`Shutdown handler completed: ${name}`, { duration });
        this.emit('shutdown:handler_complete', { name, duration });
        
      } catch (error) {
        const duration = Date.now() - startTime;
        const err = error instanceof Error ? error : new Error(String(error));
        
        results.push({ name, success: false, duration, error: err });
        
        this.logger.error(`Shutdown handler failed: ${name}`, { 
          error: err.message,
          duration,
        });
        
        this.emit('shutdown:handler_error', { name, error: err, duration });
        
        // Continue with other handlers even if one fails
      }
    }

    // Log summary
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    this.logger.info('Shutdown handlers summary', {
      total: results.length,
      successful,
      failed,
      results: results.map(r => ({
        name: r.name,
        success: r.success,
        duration: r.duration,
      })),
    });

    // Fail if any critical handlers failed
    if (failed > 0) {
      const failedHandlers = results.filter(r => !r.success);
      throw new Error(`${failed} shutdown handler(s) failed: ${failedHandlers.map(h => h.name).join(', ')}`);
    }
  }

  private async executeWithTimeout(
    handler: () => Promise<void>,
    timeout: number,
    name: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Shutdown handler '${name}' timed out after ${timeout}ms`));
      }, timeout);

      handler()
        .then(() => {
          clearTimeout(timer);
          resolve();
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  private emergencyShutdown(reason: string, error?: any): void {
    this.logger.error('Emergency shutdown initiated', { reason, error });
    
    this.emit('shutdown:emergency', { reason, error });
    
    // Try to cleanup critical resources quickly
    setTimeout(() => {
      this.logger.error('Emergency shutdown timeout, forcing exit');
      process.exit(1);
    }, 5000);

    // Attempt quick cleanup
    this.quickCleanup()
      .then(() => {
        this.logger.info('Emergency cleanup completed');
        process.exit(1);
      })
      .catch((cleanupError) => {
        this.logger.error('Emergency cleanup failed', { cleanupError });
        process.exit(1);
      });
  }

  private async quickCleanup(): Promise<void> {
    // Execute only the highest priority handlers with short timeouts
    const criticalHandlers = this.handlers
      .filter(h => h.priority >= 100) // Only critical handlers
      .slice(0, 3); // Maximum 3 handlers

    const promises = criticalHandlers.map(async ({ name, handler }) => {
      try {
        await this.executeWithTimeout(handler, 2000, name); // 2 second timeout
        this.logger.debug(`Emergency cleanup handler completed: ${name}`);
      } catch (error) {
        this.logger.warn(`Emergency cleanup handler failed: ${name}`, { error });
      }
    });

    await Promise.allSettled(promises);
  }

  // Utility methods for common shutdown tasks
  createDatabaseHandler(db: any, name: string = 'database'): () => Promise<void> {
    return async () => {
      this.logger.info(`Closing ${name} connections`);
      
      if (db && typeof db.close === 'function') {
        await db.close();
      } else if (db && typeof db.end === 'function') {
        await db.end();
      } else if (db && typeof db.disconnect === 'function') {
        await db.disconnect();
      }
      
      this.logger.info(`${name} connections closed`);
    };
  }

  createServerHandler(server: any, name: string = 'http-server'): () => Promise<void> {
    return async () => {
      this.logger.info(`Closing ${name}`);
      
      return new Promise<void>((resolve, reject) => {
        if (!server || typeof server.close !== 'function') {
          resolve();
          return;
        }

        server.close((error: any) => {
          if (error) {
            reject(error);
          } else {
            this.logger.info(`${name} closed`);
            resolve();
          }
        });
      });
    };
  }

  createRedisHandler(redis: any, name: string = 'redis'): () => Promise<void> {
    return async () => {
      this.logger.info(`Disconnecting from ${name}`);
      
      if (redis && typeof redis.disconnect === 'function') {
        await redis.disconnect();
      } else if (redis && typeof redis.quit === 'function') {
        await redis.quit();
      }
      
      this.logger.info(`${name} disconnected`);
    };
  }

  createWorkerHandler(worker: any, name: string = 'worker'): () => Promise<void> {
    return async () => {
      this.logger.info(`Stopping ${name}`);
      
      if (worker && typeof worker.close === 'function') {
        await worker.close();
      } else if (worker && typeof worker.stop === 'function') {
        await worker.stop();
      } else if (worker && typeof worker.terminate === 'function') {
        await worker.terminate();
      }
      
      this.logger.info(`${name} stopped`);
    };
  }

  createCustomHandler(
    name: string,
    cleanupFunction: () => Promise<void> | void
  ): () => Promise<void> {
    return async () => {
      this.logger.info(`Executing custom cleanup: ${name}`);
      await cleanupFunction();
      this.logger.info(`Custom cleanup completed: ${name}`);
    };
  }

  // Get shutdown status
  isGracefullyShuttingDown(): boolean {
    return this.isShuttingDown;
  }

  // Clean up signal listeners
  removeSignalHandlers(): void {
    this.signalListeners.forEach((listener, signal) => {
      process.removeListener(signal, listener);
    });
    this.signalListeners.clear();
  }

  // Cleanup method for manual shutdown
  async cleanup(): Promise<void> {
    this.removeSignalHandlers();
    this.removeAllListeners();
  }
}

// Singleton instance for global use
let globalShutdownManager: GracefulShutdown | null = null;

export function createShutdownManager(options?: Partial<ShutdownOptions>): GracefulShutdown {
  if (globalShutdownManager) {
    throw new Error('Shutdown manager already exists. Use getShutdownManager() to access it.');
  }
  
  globalShutdownManager = new GracefulShutdown(options);
  return globalShutdownManager;
}

export function getShutdownManager(): GracefulShutdown {
  if (!globalShutdownManager) {
    throw new Error('Shutdown manager not initialized. Call createShutdownManager() first.');
  }
  
  return globalShutdownManager;
}

// Utility function to setup common shutdown handlers
export function setupCommonShutdownHandlers(
  services: {
    server?: any;
    database?: any;
    redis?: any;
    workers?: any[];
    customCleanup?: () => Promise<void> | void;
  }
): void {
  const shutdownManager = getShutdownManager();
  
  // HTTP Server (highest priority for user experience)
  if (services.server) {
    shutdownManager.addHandler(
      'http-server',
      shutdownManager.createServerHandler(services.server),
      15000,
      200
    );
  }
  
  // Workers (high priority to finish current jobs)
  if (services.workers && services.workers.length > 0) {
    services.workers.forEach((worker, index) => {
      shutdownManager.addHandler(
        `worker-${index}`,
        shutdownManager.createWorkerHandler(worker, `worker-${index}`),
        20000,
        150
      );
    });
  }
  
  // Database connections (medium priority)
  if (services.database) {
    shutdownManager.addHandler(
      'database',
      shutdownManager.createDatabaseHandler(services.database),
      10000,
      100
    );
  }
  
  // Redis connections (medium priority)
  if (services.redis) {
    shutdownManager.addHandler(
      'redis',
      shutdownManager.createRedisHandler(services.redis),
      5000,
      100
    );
  }
  
  // Custom cleanup (low priority)
  if (services.customCleanup) {
    shutdownManager.addHandler(
      'custom-cleanup',
      shutdownManager.createCustomHandler('custom-cleanup', services.customCleanup),
      5000,
      50
    );
  }
}