import { Logger } from './logger';
import { MetricsCollector } from './metrics';
import { EventEmitter } from 'events';

interface RecoveryStrategy {
  name: string;
  condition: (error: Error, context: ErrorContext) => boolean;
  action: (error: Error, context: ErrorContext) => Promise<RecoveryResult>;
  maxAttempts: number;
  backoffMs: number;
  priority: number;
}

interface ErrorContext {
  operation: string;
  service: string;
  userId?: string;
  requestId?: string;
  metadata?: Record<string, any>;
  attemptCount: number;
  lastAttempt: number;
}

interface RecoveryResult {
  success: boolean;
  action: string;
  message: string;
  shouldRetry: boolean;
  retryDelayMs?: number;
  metadata?: Record<string, any>;
}

interface CircuitBreakerState {
  isOpen: boolean;
  failureCount: number;
  lastFailureTime: number;
  nextAttemptTime: number;
}

export class ErrorRecoveryService extends EventEmitter {
  private logger: Logger;
  private metrics: MetricsCollector;
  private strategies: RecoveryStrategy[] = [];
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private recoveryAttempts: Map<string, ErrorContext> = new Map();
  private healthChecks: Map<string, () => Promise<boolean>> = new Map();

  constructor() {
    super();
    this.logger = new Logger('ErrorRecoveryService');
    this.metrics = new MetricsCollector('error_recovery');
    
    this.initializeDefaultStrategies();
    this.startPeriodicMaintenance();
  }

  private initializeDefaultStrategies(): void {
    // Database connection recovery
    this.addStrategy({
      name: 'database-reconnect',
      condition: (error) => this.isDatabaseError(error),
      action: this.recoverDatabaseConnection.bind(this),
      maxAttempts: 5,
      backoffMs: 2000,
      priority: 100,
    });

    // Redis connection recovery
    this.addStrategy({
      name: 'redis-reconnect',
      condition: (error) => this.isRedisError(error),
      action: this.recoverRedisConnection.bind(this),
      maxAttempts: 3,
      backoffMs: 1000,
      priority: 90,
    });

    // AI service rate limit recovery
    this.addStrategy({
      name: 'ai-rate-limit-backoff',
      condition: (error) => this.isRateLimitError(error),
      action: this.recoverFromRateLimit.bind(this),
      maxAttempts: 3,
      backoffMs: 5000,
      priority: 80,
    });

    // GitHub API recovery
    this.addStrategy({
      name: 'github-api-recovery',
      condition: (error) => this.isGitHubError(error),
      action: this.recoverGitHubAPI.bind(this),
      maxAttempts: 3,
      backoffMs: 3000,
      priority: 70,
    });

    // Container orchestration recovery
    this.addStrategy({
      name: 'container-recovery',
      condition: (error) => this.isContainerError(error),
      action: this.recoverContainer.bind(this),
      maxAttempts: 2,
      backoffMs: 5000,
      priority: 60,
    });

    // Memory pressure recovery
    this.addStrategy({
      name: 'memory-pressure-recovery',
      condition: (error) => this.isMemoryError(error),
      action: this.recoverFromMemoryPressure.bind(this),
      maxAttempts: 1,
      backoffMs: 0,
      priority: 110,
    });

    // Generic timeout recovery
    this.addStrategy({
      name: 'timeout-recovery',
      condition: (error) => this.isTimeoutError(error),
      action: this.recoverFromTimeout.bind(this),
      maxAttempts: 2,
      backoffMs: 1000,
      priority: 50,
    });
  }

  addStrategy(strategy: RecoveryStrategy): void {
    this.strategies.push(strategy);
    this.strategies.sort((a, b) => b.priority - a.priority);
    
    this.logger.info(`Added recovery strategy: ${strategy.name}`, {
      priority: strategy.priority,
      maxAttempts: strategy.maxAttempts,
    });
  }

  async handleError(error: Error, context: ErrorContext): Promise<RecoveryResult> {
    const contextKey = `${context.service}-${context.operation}`;
    
    // Update attempt tracking
    const existingContext = this.recoveryAttempts.get(contextKey);
    if (existingContext) {
      context.attemptCount = existingContext.attemptCount + 1;
    } else {
      context.attemptCount = 1;
    }
    
    context.lastAttempt = Date.now();
    this.recoveryAttempts.set(contextKey, context);

    this.logger.error('Handling error for recovery', {
      error: error.message,
      context,
      attemptCount: context.attemptCount,
    });

    // Check circuit breaker
    if (this.isCircuitOpen(contextKey)) {
      return {
        success: false,
        action: 'circuit-breaker-open',
        message: 'Circuit breaker is open, not attempting recovery',
        shouldRetry: false,
      };
    }

    // Find applicable recovery strategy
    const strategy = this.findStrategy(error, context);
    if (!strategy) {
      this.recordFailure(contextKey);
      return {
        success: false,
        action: 'no-strategy',
        message: 'No recovery strategy found for this error',
        shouldRetry: false,
      };
    }

    // Check if max attempts exceeded
    if (context.attemptCount > strategy.maxAttempts) {
      this.recordFailure(contextKey);
      return {
        success: false,
        action: 'max-attempts-exceeded',
        message: `Maximum recovery attempts (${strategy.maxAttempts}) exceeded`,
        shouldRetry: false,
      };
    }

    try {
      this.logger.info(`Attempting recovery with strategy: ${strategy.name}`, {
        context,
        attemptCount: context.attemptCount,
      });

      this.emit('recovery:attempt', { strategy: strategy.name, context, error });

      const result = await strategy.action(error, context);
      
      if (result.success) {
        this.recordSuccess(contextKey);
        this.recoveryAttempts.delete(contextKey);
        
        this.logger.info(`Recovery successful: ${strategy.name}`, {
          context,
          result,
        });
        
        this.emit('recovery:success', { strategy: strategy.name, context, result });
        this.metrics.recordRecoverySuccess(strategy.name);
      } else {
        this.logger.warn(`Recovery failed: ${strategy.name}`, {
          context,
          result,
        });
        
        this.emit('recovery:failure', { strategy: strategy.name, context, result });
        this.metrics.recordRecoveryFailure(strategy.name);
      }

      return result;
    } catch (recoveryError) {
      this.recordFailure(contextKey);
      
      const errorMessage = recoveryError instanceof Error ? recoveryError.message : 'Unknown error';
      
      this.logger.error(`Recovery strategy failed: ${strategy.name}`, {
        error: errorMessage,
        context,
      });
      
      this.emit('recovery:error', { strategy: strategy.name, context, error: recoveryError });
      this.metrics.recordRecoveryError(strategy.name);

      return {
        success: false,
        action: 'strategy-error',
        message: `Recovery strategy failed: ${errorMessage}`,
        shouldRetry: context.attemptCount < strategy.maxAttempts,
        retryDelayMs: strategy.backoffMs * Math.pow(2, context.attemptCount - 1),
      };
    }
  }

  private findStrategy(error: Error, context: ErrorContext): RecoveryStrategy | null {
    return this.strategies.find(strategy => strategy.condition(error, context)) || null;
  }

  // Error type detection methods
  private isDatabaseError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return message.includes('connection') && 
           (message.includes('database') || 
            message.includes('postgres') || 
            message.includes('mysql') ||
            message.includes('timeout') ||
            error.name === 'SequelizeConnectionError');
  }

  private isRedisError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return message.includes('redis') || 
           message.includes('connection refused') ||
           error.name === 'RedisError';
  }

  private isRateLimitError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return message.includes('rate limit') || 
           message.includes('too many requests') ||
           message.includes('quota exceeded');
  }

  private isGitHubError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return message.includes('github') ||
           message.includes('api rate limit') ||
           (message.includes('403') && message.includes('api'));
  }

  private isContainerError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return message.includes('docker') ||
           message.includes('container') ||
           message.includes('oci runtime');
  }

  private isMemoryError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return message.includes('out of memory') ||
           message.includes('heap') ||
           error.name === 'RangeError';
  }

  private isTimeoutError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return message.includes('timeout') ||
           message.includes('timed out') ||
           error.name === 'TimeoutError';
  }

  // Recovery action implementations
  private async recoverDatabaseConnection(error: Error, context: ErrorContext): Promise<RecoveryResult> {
    try {
      // Attempt to reconnect to database
      // In a real implementation, this would use the actual database client
      this.logger.info('Attempting database reconnection');
      
      // Simulate reconnection delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check if database is available
      const isHealthy = await this.checkDatabaseHealth();
      
      if (isHealthy) {
        return {
          success: true,
          action: 'database-reconnected',
          message: 'Database connection restored',
          shouldRetry: false,
        };
      } else {
        return {
          success: false,
          action: 'database-still-unhealthy',
          message: 'Database is still not responding',
          shouldRetry: true,
          retryDelayMs: 5000,
        };
      }
    } catch (recoveryError) {
      return {
        success: false,
        action: 'database-reconnect-failed',
        message: `Database reconnection failed: ${recoveryError instanceof Error ? recoveryError.message : 'Unknown error'}`,
        shouldRetry: true,
        retryDelayMs: 10000,
      };
    }
  }

  private async recoverRedisConnection(error: Error, context: ErrorContext): Promise<RecoveryResult> {
    try {
      this.logger.info('Attempting Redis reconnection');
      
      // Simulate reconnection
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const isHealthy = await this.checkRedisHealth();
      
      return {
        success: isHealthy,
        action: isHealthy ? 'redis-reconnected' : 'redis-still-unhealthy',
        message: isHealthy ? 'Redis connection restored' : 'Redis is still not responding',
        shouldRetry: !isHealthy,
        retryDelayMs: isHealthy ? undefined : 3000,
      };
    } catch (recoveryError) {
      return {
        success: false,
        action: 'redis-reconnect-failed',
        message: `Redis reconnection failed: ${recoveryError instanceof Error ? recoveryError.message : 'Unknown error'}`,
        shouldRetry: true,
        retryDelayMs: 5000,
      };
    }
  }

  private async recoverFromRateLimit(error: Error, context: ErrorContext): Promise<RecoveryResult> {
    // Extract retry-after header or estimate backoff time
    const retryAfter = this.extractRetryAfter(error.message) || 60000; // Default 1 minute
    
    this.logger.info('Handling rate limit error', {
      retryAfterMs: retryAfter,
      context,
    });

    return {
      success: true,
      action: 'rate-limit-backoff',
      message: `Backing off for ${retryAfter}ms due to rate limiting`,
      shouldRetry: true,
      retryDelayMs: retryAfter,
      metadata: { retryAfter },
    };
  }

  private async recoverGitHubAPI(error: Error, context: ErrorContext): Promise<RecoveryResult> {
    try {
      // Check GitHub API status
      const isHealthy = await this.checkGitHubHealth();
      
      if (isHealthy) {
        return {
          success: true,
          action: 'github-api-available',
          message: 'GitHub API is available, can retry',
          shouldRetry: true,
          retryDelayMs: 2000,
        };
      } else {
        return {
          success: false,
          action: 'github-api-degraded',
          message: 'GitHub API is experiencing issues',
          shouldRetry: true,
          retryDelayMs: 30000, // 30 seconds
        };
      }
    } catch (recoveryError) {
      return {
        success: false,
        action: 'github-health-check-failed',
        message: 'Unable to check GitHub API status',
        shouldRetry: true,
        retryDelayMs: 15000,
      };
    }
  }

  private async recoverContainer(error: Error, context: ErrorContext): Promise<RecoveryResult> {
    try {
      this.logger.info('Attempting container recovery');
      
      // In a real implementation, this would:
      // 1. Clean up failed containers
      // 2. Check Docker daemon health
      // 3. Restart container orchestration if needed
      
      const isDockerHealthy = await this.checkDockerHealth();
      
      return {
        success: isDockerHealthy,
        action: isDockerHealthy ? 'container-service-healthy' : 'container-service-degraded',
        message: isDockerHealthy ? 'Container service is healthy' : 'Container service needs attention',
        shouldRetry: true,
        retryDelayMs: 10000,
      };
    } catch (recoveryError) {
      return {
        success: false,
        action: 'container-recovery-failed',
        message: `Container recovery failed: ${recoveryError instanceof Error ? recoveryError.message : 'Unknown error'}`,
        shouldRetry: false,
      };
    }
  }

  private async recoverFromMemoryPressure(error: Error, context: ErrorContext): Promise<RecoveryResult> {
    try {
      this.logger.warn('Attempting memory pressure recovery');
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      // Clear any in-memory caches
      this.emit('memory:pressure', { context });
      
      // Wait a moment for cleanup
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const memoryUsage = process.memoryUsage();
      const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
      
      return {
        success: true,
        action: 'memory-cleanup-attempted',
        message: `Memory cleanup attempted, heap usage: ${heapUsedMB}MB`,
        shouldRetry: true,
        retryDelayMs: 2000,
        metadata: { heapUsedMB },
      };
    } catch (recoveryError) {
      return {
        success: false,
        action: 'memory-cleanup-failed',
        message: `Memory cleanup failed: ${recoveryError instanceof Error ? recoveryError.message : 'Unknown error'}`,
        shouldRetry: false,
      };
    }
  }

  private async recoverFromTimeout(error: Error, context: ErrorContext): Promise<RecoveryResult> {
    const timeoutIncrease = Math.min(context.attemptCount * 1000, 10000); // Max 10 seconds
    
    return {
      success: true,
      action: 'timeout-backoff',
      message: `Backing off ${timeoutIncrease}ms due to timeout`,
      shouldRetry: true,
      retryDelayMs: timeoutIncrease,
      metadata: { timeoutIncrease },
    };
  }

  // Health check methods
  private async checkDatabaseHealth(): Promise<boolean> {
    const healthCheck = this.healthChecks.get('database');
    if (healthCheck) {
      try {
        return await healthCheck();
      } catch {
        return false;
      }
    }
    
    // Default implementation - would be replaced with actual DB check
    return Math.random() > 0.3; // 70% success rate for simulation
  }

  private async checkRedisHealth(): Promise<boolean> {
    const healthCheck = this.healthChecks.get('redis');
    if (healthCheck) {
      try {
        return await healthCheck();
      } catch {
        return false;
      }
    }
    
    return Math.random() > 0.2; // 80% success rate for simulation
  }

  private async checkGitHubHealth(): Promise<boolean> {
    try {
      // In production, would check GitHub status API
      return true;
    } catch {
      return false;
    }
  }

  private async checkDockerHealth(): Promise<boolean> {
    try {
      // In production, would check Docker daemon
      return true;
    } catch {
      return false;
    }
  }

  // Circuit breaker logic
  private isCircuitOpen(key: string): boolean {
    const state = this.circuitBreakers.get(key);
    if (!state) return false;
    
    if (state.isOpen) {
      if (Date.now() >= state.nextAttemptTime) {
        // Half-open state - allow one attempt
        state.isOpen = false;
        return false;
      }
      return true;
    }
    
    return false;
  }

  private recordFailure(key: string): void {
    const state = this.circuitBreakers.get(key) || {
      isOpen: false,
      failureCount: 0,
      lastFailureTime: 0,
      nextAttemptTime: 0,
    };
    
    state.failureCount++;
    state.lastFailureTime = Date.now();
    
    // Open circuit after 5 failures
    if (state.failureCount >= 5) {
      state.isOpen = true;
      state.nextAttemptTime = Date.now() + 60000; // 1 minute
      
      this.logger.warn(`Circuit breaker opened for: ${key}`, {
        failureCount: state.failureCount,
        nextAttemptTime: state.nextAttemptTime,
      });
      
      this.emit('circuit:open', { key, state });
    }
    
    this.circuitBreakers.set(key, state);
  }

  private recordSuccess(key: string): void {
    const state = this.circuitBreakers.get(key);
    if (state) {
      state.failureCount = 0;
      state.isOpen = false;
      state.nextAttemptTime = 0;
      
      this.emit('circuit:close', { key, state });
    }
  }

  private extractRetryAfter(errorMessage: string): number | null {
    const match = errorMessage.match(/retry[_\s]?after[:\s]+(\d+)/i);
    return match ? parseInt(match[1]) * 1000 : null;
  }

  // Health check registration
  addHealthCheck(name: string, check: () => Promise<boolean>): void {
    this.healthChecks.set(name, check);
  }

  // Periodic maintenance
  private startPeriodicMaintenance(): void {
    setInterval(() => {
      this.cleanupOldAttempts();
      this.resetStaleCircuitBreakers();
    }, 60000); // Every minute
  }

  private cleanupOldAttempts(): void {
    const cutoff = Date.now() - 300000; // 5 minutes
    
    for (const [key, context] of this.recoveryAttempts.entries()) {
      if (context.lastAttempt < cutoff) {
        this.recoveryAttempts.delete(key);
      }
    }
  }

  private resetStaleCircuitBreakers(): void {
    const cutoff = Date.now() - 3600000; // 1 hour
    
    for (const [key, state] of this.circuitBreakers.entries()) {
      if (state.lastFailureTime < cutoff && state.isOpen) {
        state.isOpen = false;
        state.failureCount = 0;
        state.nextAttemptTime = 0;
        
        this.logger.info(`Reset stale circuit breaker: ${key}`);
        this.emit('circuit:reset', { key, state });
      }
    }
  }

  // Get recovery status
  getRecoveryStatus(): Record<string, any> {
    return {
      strategies: this.strategies.length,
      activeAttempts: this.recoveryAttempts.size,
      circuitBreakers: Array.from(this.circuitBreakers.entries()).map(([key, state]) => ({
        key,
        isOpen: state.isOpen,
        failureCount: state.failureCount,
      })),
      healthChecks: Array.from(this.healthChecks.keys()),
    };
  }

  async shutdown(): Promise<void> {
    await this.metrics.flush();
    this.removeAllListeners();
  }
}