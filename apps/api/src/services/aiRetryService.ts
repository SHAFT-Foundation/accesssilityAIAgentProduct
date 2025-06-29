import { Logger } from '../utils/logger';
import { MetricsCollector } from '../utils/metrics';
import { EventEmitter } from 'events';

interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitterMax: number;
  retryableErrors: string[];
  timeoutMs: number;
}

interface RetryContext {
  attempt: number;
  lastError?: Error;
  totalElapsed: number;
  startTime: number;
  operationId: string;
}

interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringWindow: number;
}

interface RateLimitConfig {
  tokensPerSecond: number;
  burstSize: number;
  provider: string;
}

export class AIRetryService extends EventEmitter {
  private logger: Logger;
  private metrics: MetricsCollector;
  private circuitBreakers: Map<string, CircuitBreakerState>;
  private rateLimiters: Map<string, RateLimiter>;
  private retryConfigs: Map<string, RetryConfig>;

  constructor() {
    super();
    this.logger = new Logger('AIRetryService');
    this.metrics = new MetricsCollector('ai_retry');
    this.circuitBreakers = new Map();
    this.rateLimiters = new Map();
    this.retryConfigs = new Map();
    
    this.initializeConfigs();
  }

  private initializeConfigs(): void {
    // OpenAI configuration
    this.retryConfigs.set('openai', {
      maxAttempts: 5,
      baseDelay: 1000,
      maxDelay: 60000,
      backoffMultiplier: 2,
      jitterMax: 1000,
      retryableErrors: [
        'rate_limit_exceeded',
        'timeout',
        'connection_error',
        'internal_error',
        'overloaded',
      ],
      timeoutMs: 30000,
    });

    // Anthropic configuration
    this.retryConfigs.set('anthropic', {
      maxAttempts: 5,
      baseDelay: 1500,
      maxDelay: 90000,
      backoffMultiplier: 2.5,
      jitterMax: 1500,
      retryableErrors: [
        'rate_limit_exceeded',
        'timeout',
        'connection_error',
        'internal_error',
        'overloaded',
      ],
      timeoutMs: 45000,
    });

    // Initialize circuit breakers
    this.circuitBreakers.set('openai', new CircuitBreakerState({
      failureThreshold: 5,
      recoveryTimeout: 60000,
      monitoringWindow: 300000, // 5 minutes
    }));

    this.circuitBreakers.set('anthropic', new CircuitBreakerState({
      failureThreshold: 3,
      recoveryTimeout: 90000,
      monitoringWindow: 300000,
    }));

    // Initialize rate limiters
    this.rateLimiters.set('openai', new RateLimiter({
      tokensPerSecond: 10,
      burstSize: 20,
      provider: 'openai',
    }));

    this.rateLimiters.set('anthropic', new RateLimiter({
      tokensPerSecond: 5,
      burstSize: 10,
      provider: 'anthropic',
    }));
  }

  async executeWithRetry<T>(
    provider: string,
    operation: () => Promise<T>,
    context: {
      operationId: string;
      operationType: string;
      metadata?: Record<string, any>;
    }
  ): Promise<T> {
    const config = this.retryConfigs.get(provider);
    if (!config) {
      throw new Error(`No retry configuration found for provider: ${provider}`);
    }

    const circuitBreaker = this.circuitBreakers.get(provider);
    if (!circuitBreaker) {
      throw new Error(`No circuit breaker found for provider: ${provider}`);
    }

    const rateLimiter = this.rateLimiters.get(provider);
    if (!rateLimiter) {
      throw new Error(`No rate limiter found for provider: ${provider}`);
    }

    // Check circuit breaker state
    if (circuitBreaker.state === 'open') {
      const error = new Error(`Circuit breaker is open for provider: ${provider}`);
      this.metrics.recordCircuitBreakerOpen(provider);
      throw error;
    }

    const retryContext: RetryContext = {
      attempt: 0,
      totalElapsed: 0,
      startTime: Date.now(),
      operationId: context.operationId,
    };

    // Apply rate limiting
    await rateLimiter.waitForToken();

    return this.executeWithRetryInternal(
      provider,
      operation,
      config,
      circuitBreaker,
      retryContext,
      context
    );
  }

  private async executeWithRetryInternal<T>(
    provider: string,
    operation: () => Promise<T>,
    config: RetryConfig,
    circuitBreaker: CircuitBreakerState,
    retryContext: RetryContext,
    context: {
      operationId: string;
      operationType: string;
      metadata?: Record<string, any>;
    }
  ): Promise<T> {
    while (retryContext.attempt < config.maxAttempts) {
      retryContext.attempt++;
      
      try {
        // Set operation timeout
        const result = await this.withTimeout(operation(), config.timeoutMs);
        
        // Success - reset circuit breaker
        circuitBreaker.recordSuccess();
        
        // Record metrics
        this.metrics.recordRetrySuccess(provider, retryContext.attempt);
        this.metrics.recordLatency(
          `${provider}_${context.operationType}`,
          Date.now() - retryContext.startTime
        );
        
        // Emit success event
        this.emit('operation_success', {
          provider,
          operationId: context.operationId,
          attempts: retryContext.attempt,
          duration: Date.now() - retryContext.startTime,
        });
        
        return result;
      } catch (error) {
        const err = error as Error;
        retryContext.lastError = err;
        retryContext.totalElapsed = Date.now() - retryContext.startTime;
        
        // Check if error is retryable
        if (!this.isRetryableError(err, config)) {
          // Non-retryable error - fail immediately
          circuitBreaker.recordFailure();
          this.metrics.recordNonRetryableError(provider, err.message);
          
          this.emit('operation_failed', {
            provider,
            operationId: context.operationId,
            error: err.message,
            attempts: retryContext.attempt,
            reason: 'non_retryable',
          });
          
          throw err;
        }
        
        // Check if we've exceeded max attempts
        if (retryContext.attempt >= config.maxAttempts) {
          circuitBreaker.recordFailure();
          this.metrics.recordMaxAttemptsExceeded(provider);
          
          this.emit('operation_failed', {
            provider,
            operationId: context.operationId,
            error: err.message,
            attempts: retryContext.attempt,
            reason: 'max_attempts_exceeded',
          });
          
          throw new Error(
            `Maximum retry attempts (${config.maxAttempts}) exceeded for ${provider}. Last error: ${err.message}`
          );
        }
        
        // Calculate delay for next attempt
        const delay = this.calculateDelay(config, retryContext);
        
        // Log retry attempt
        this.logger.warn(`Retry attempt ${retryContext.attempt} for ${provider}`, {
          operationId: context.operationId,
          error: err.message,
          nextRetryIn: delay,
          totalElapsed: retryContext.totalElapsed,
        });
        
        // Record retry metrics
        this.metrics.recordRetryAttempt(provider, retryContext.attempt, err.message);
        
        // Emit retry event
        this.emit('retry_attempt', {
          provider,
          operationId: context.operationId,
          attempt: retryContext.attempt,
          error: err.message,
          delay,
        });
        
        // Wait before next attempt
        await this.sleep(delay);
        
        // Check if we should increase rate limit delay
        if (this.isRateLimitError(err)) {
          const rateLimiter = this.rateLimiters.get(provider)!;
          rateLimiter.handleRateLimit(err);
        }
      }
    }
    
    // This should never be reached due to the max attempts check above
    throw retryContext.lastError || new Error('Unknown retry error');
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      promise
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  private isRetryableError(error: Error, config: RetryConfig): boolean {
    const errorMessage = error.message.toLowerCase();
    
    return config.retryableErrors.some(retryableError =>
      errorMessage.includes(retryableError.toLowerCase())
    );
  }

  private isRateLimitError(error: Error): boolean {
    const errorMessage = error.message.toLowerCase();
    return errorMessage.includes('rate_limit') || 
           errorMessage.includes('rate limit') ||
           errorMessage.includes('too many requests');
  }

  private calculateDelay(config: RetryConfig, context: RetryContext): number {
    // Exponential backoff with jitter
    const exponentialDelay = config.baseDelay * Math.pow(config.backoffMultiplier, context.attempt - 1);
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * config.jitterMax;
    
    // Cap at max delay
    const delay = Math.min(exponentialDelay + jitter, config.maxDelay);
    
    return Math.round(delay);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Public methods for configuration updates
  updateRetryConfig(provider: string, config: Partial<RetryConfig>): void {
    const existingConfig = this.retryConfigs.get(provider);
    if (existingConfig) {
      this.retryConfigs.set(provider, { ...existingConfig, ...config });
    }
  }

  updateCircuitBreakerConfig(provider: string, config: Partial<CircuitBreakerConfig>): void {
    const circuitBreaker = this.circuitBreakers.get(provider);
    if (circuitBreaker) {
      circuitBreaker.updateConfig(config);
    }
  }

  updateRateLimitConfig(provider: string, config: Partial<RateLimitConfig>): void {
    const rateLimiter = this.rateLimiters.get(provider);
    if (rateLimiter) {
      rateLimiter.updateConfig(config);
    }
  }

  // Health check methods
  getHealthStatus(): Record<string, any> {
    const status: Record<string, any> = {};
    
    for (const [provider, circuitBreaker] of this.circuitBreakers) {
      const rateLimiter = this.rateLimiters.get(provider);
      
      status[provider] = {
        circuitBreaker: {
          state: circuitBreaker.state,
          failureCount: circuitBreaker.failureCount,
          lastFailureTime: circuitBreaker.lastFailureTime,
        },
        rateLimiter: {
          tokensRemaining: rateLimiter?.tokensRemaining || 0,
          nextRefill: rateLimiter?.nextRefill || 0,
        },
        metrics: this.metrics.getProviderMetrics(provider),
      };
    }
    
    return status;
  }

  // Graceful shutdown
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down AI Retry Service');
    
    // Wait for any pending operations
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Clear all timers and states
    this.circuitBreakers.clear();
    this.rateLimiters.clear();
    this.retryConfigs.clear();
    
    await this.metrics.flush();
  }
}

class CircuitBreakerState {
  public state: 'closed' | 'open' | 'half-open' = 'closed';
  public failureCount: number = 0;
  public lastFailureTime: number = 0;
  public nextAttemptTime: number = 0;
  
  private config: CircuitBreakerConfig;
  private recentFailures: number[] = [];

  constructor(config: CircuitBreakerConfig) {
    this.config = config;
  }

  recordSuccess(): void {
    this.failureCount = 0;
    this.state = 'closed';
    this.recentFailures = [];
    this.nextAttemptTime = 0;
  }

  recordFailure(): void {
    const now = Date.now();
    this.failureCount++;
    this.lastFailureTime = now;
    this.recentFailures.push(now);
    
    // Clean old failures outside monitoring window
    const cutoff = now - this.config.monitoringWindow;
    this.recentFailures = this.recentFailures.filter(time => time > cutoff);
    
    // Check if we should open the circuit
    if (this.recentFailures.length >= this.config.failureThreshold) {
      this.state = 'open';
      this.nextAttemptTime = now + this.config.recoveryTimeout;
    }
  }

  canAttempt(): boolean {
    if (this.state === 'closed') {
      return true;
    }
    
    if (this.state === 'open') {
      if (Date.now() >= this.nextAttemptTime) {
        this.state = 'half-open';
        return true;
      }
      return false;
    }
    
    // half-open state
    return true;
  }

  updateConfig(config: Partial<CircuitBreakerConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

class RateLimiter {
  public tokensRemaining: number;
  public nextRefill: number;
  
  private config: RateLimitConfig;
  private lastRefill: number;

  constructor(config: RateLimitConfig) {
    this.config = config;
    this.tokensRemaining = config.burstSize;
    this.lastRefill = Date.now();
    this.nextRefill = this.lastRefill + 1000; // Next second
  }

  async waitForToken(): Promise<void> {
    this.refillTokens();
    
    while (this.tokensRemaining <= 0) {
      const waitTime = this.nextRefill - Date.now();
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      this.refillTokens();
    }
    
    this.tokensRemaining--;
  }

  private refillTokens(): void {
    const now = Date.now();
    const timeSinceRefill = now - this.lastRefill;
    
    if (timeSinceRefill >= 1000) { // Refill every second
      const tokensToAdd = Math.floor(timeSinceRefill / 1000) * this.config.tokensPerSecond;
      this.tokensRemaining = Math.min(
        this.config.burstSize,
        this.tokensRemaining + tokensToAdd
      );
      this.lastRefill = now;
      this.nextRefill = now + 1000;
    }
  }

  handleRateLimit(error: Error): void {
    // Extract retry-after header if available
    const retryAfter = this.extractRetryAfter(error.message);
    
    if (retryAfter) {
      this.nextRefill = Date.now() + retryAfter;
      this.tokensRemaining = 0;
    } else {
      // Default backoff
      this.nextRefill = Date.now() + 5000; // 5 seconds
      this.tokensRemaining = 0;
    }
  }

  private extractRetryAfter(errorMessage: string): number | null {
    const match = errorMessage.match(/retry[_\s]?after[:\s]+(\d+)/i);
    return match ? parseInt(match[1]) * 1000 : null;
  }

  updateConfig(config: Partial<RateLimitConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Adjust current tokens if burst size changed
    if (config.burstSize !== undefined) {
      this.tokensRemaining = Math.min(this.tokensRemaining, config.burstSize);
    }
  }
}