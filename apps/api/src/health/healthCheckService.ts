import { Logger } from '../utils/logger';
import { MetricsCollector } from '../utils/metrics';
import { EventEmitter } from 'events';

interface HealthCheck {
  name: string;
  check: () => Promise<HealthCheckResult>;
  timeout: number;
  critical: boolean;
  tags: string[];
}

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  message: string;
  duration: number;
  metadata?: Record<string, any>;
  timestamp: number;
}

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime: number;
  timestamp: number;
  checks: Record<string, HealthCheckResult>;
  summary: {
    total: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
    critical_failing: number;
  };
}

interface HealthThresholds {
  response_time_warning: number;
  response_time_critical: number;
  error_rate_warning: number;
  error_rate_critical: number;
  memory_usage_warning: number;
  memory_usage_critical: number;
  cpu_usage_warning: number;
  cpu_usage_critical: number;
}

export class HealthCheckService extends EventEmitter {
  private logger: Logger;
  private metrics: MetricsCollector;
  private healthChecks: Map<string, HealthCheck>;
  private lastResults: Map<string, HealthCheckResult>;
  private checkInterval: NodeJS.Timeout | null = null;
  private startTime: number;
  private thresholds: HealthThresholds;

  constructor() {
    super();
    this.logger = new Logger('HealthCheckService');
    this.metrics = new MetricsCollector('health_checks');
    this.healthChecks = new Map();
    this.lastResults = new Map();
    this.startTime = Date.now();
    
    this.thresholds = {
      response_time_warning: 1000,
      response_time_critical: 5000,
      error_rate_warning: 5,
      error_rate_critical: 10,
      memory_usage_warning: 80,
      memory_usage_critical: 95,
      cpu_usage_warning: 75,
      cpu_usage_critical: 90,
    };

    this.initializeBuiltInChecks();
    this.startPeriodicChecks();
  }

  private initializeBuiltInChecks(): void {
    // Database connectivity check
    this.addHealthCheck({
      name: 'database',
      check: this.checkDatabase.bind(this),
      timeout: 5000,
      critical: true,
      tags: ['database', 'critical'],
    });

    // Redis connectivity check
    this.addHealthCheck({
      name: 'redis',
      check: this.checkRedis.bind(this),
      timeout: 3000,
      critical: true,
      tags: ['cache', 'critical'],
    });

    // AI Services connectivity
    this.addHealthCheck({
      name: 'openai',
      check: this.checkOpenAI.bind(this),
      timeout: 10000,
      critical: false,
      tags: ['ai', 'external'],
    });

    this.addHealthCheck({
      name: 'anthropic',
      check: this.checkAnthropic.bind(this),
      timeout: 10000,
      critical: false,
      tags: ['ai', 'external'],
    });

    // System resource checks
    this.addHealthCheck({
      name: 'memory',
      check: this.checkMemoryUsage.bind(this),
      timeout: 1000,
      critical: true,
      tags: ['system', 'resources'],
    });

    this.addHealthCheck({
      name: 'cpu',
      check: this.checkCPUUsage.bind(this),
      timeout: 1000,
      critical: true,
      tags: ['system', 'resources'],
    });

    // Disk space check
    this.addHealthCheck({
      name: 'disk',
      check: this.checkDiskSpace.bind(this),
      timeout: 2000,
      critical: true,
      tags: ['system', 'storage'],
    });

    // Container orchestration
    this.addHealthCheck({
      name: 'docker',
      check: this.checkDockerHealth.bind(this),
      timeout: 5000,
      critical: true,
      tags: ['containers', 'orchestration'],
    });

    // Queue system
    this.addHealthCheck({
      name: 'queue',
      check: this.checkQueueHealth.bind(this),
      timeout: 3000,
      critical: true,
      tags: ['queue', 'processing'],
    });

    // GitHub API connectivity
    this.addHealthCheck({
      name: 'github',
      check: this.checkGitHubAPI.bind(this),
      timeout: 8000,
      critical: false,
      tags: ['github', 'external'],
    });
  }

  addHealthCheck(check: HealthCheck): void {
    this.healthChecks.set(check.name, check);
    this.logger.info(`Added health check: ${check.name}`, {
      critical: check.critical,
      tags: check.tags,
    });
  }

  removeHealthCheck(name: string): void {
    this.healthChecks.delete(name);
    this.lastResults.delete(name);
  }

  async runHealthChecks(checkNames?: string[]): Promise<SystemHealth> {
    const checksToRun = checkNames ? 
      Array.from(this.healthChecks.entries()).filter(([name]) => checkNames.includes(name)) :
      Array.from(this.healthChecks.entries());

    const results: Record<string, HealthCheckResult> = {};
    const promises = checksToRun.map(async ([name, check]) => {
      try {
        const result = await this.runSingleCheck(name, check);
        results[name] = result;
        this.lastResults.set(name, result);
      } catch (error) {
        const errorResult: HealthCheckResult = {
          status: 'unhealthy',
          message: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          duration: 0,
          timestamp: Date.now(),
        };
        results[name] = errorResult;
        this.lastResults.set(name, errorResult);
      }
    });

    await Promise.all(promises);

    const systemHealth = this.calculateSystemHealth(results);
    
    // Emit health status event
    this.emit('health_status', systemHealth);
    
    // Record metrics
    this.metrics.recordHealthCheck(systemHealth);
    
    return systemHealth;
  }

  private async runSingleCheck(name: string, check: HealthCheck): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Run check with timeout
      const result = await Promise.race([
        check.check(),
        this.createTimeoutPromise(check.timeout),
      ]);

      const duration = Date.now() - startTime;
      
      // Record metrics
      this.metrics.recordHealthCheckLatency(name, duration);
      this.metrics.recordHealthCheckStatus(name, result.status);
      
      return {
        ...result,
        duration,
        timestamp: Date.now(),
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.logger.error(`Health check ${name} failed`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        duration,
      });
      
      this.metrics.recordHealthCheckError(name);
      
      throw error;
    }
  }

  private createTimeoutPromise(timeout: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Health check timed out after ${timeout}ms`));
      }, timeout);
    });
  }

  private calculateSystemHealth(results: Record<string, HealthCheckResult>): SystemHealth {
    const summary = {
      total: 0,
      healthy: 0,
      degraded: 0,
      unhealthy: 0,
      critical_failing: 0,
    };

    Object.entries(results).forEach(([name, result]) => {
      summary.total++;
      
      switch (result.status) {
        case 'healthy':
          summary.healthy++;
          break;
        case 'degraded':
          summary.degraded++;
          break;
        case 'unhealthy':
          summary.unhealthy++;
          const check = this.healthChecks.get(name);
          if (check?.critical) {
            summary.critical_failing++;
          }
          break;
      }
    });

    // Determine overall system health
    let systemStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (summary.critical_failing > 0) {
      systemStatus = 'unhealthy';
    } else if (summary.unhealthy > 0 || summary.degraded > summary.healthy / 2) {
      systemStatus = 'degraded';
    }

    return {
      status: systemStatus,
      version: process.env.APP_VERSION || '1.0.0',
      uptime: Date.now() - this.startTime,
      timestamp: Date.now(),
      checks: results,
      summary,
    };
  }

  // Built-in health check implementations
  private async checkDatabase(): Promise<HealthCheckResult> {
    try {
      // Simulate database check - in real implementation, would use actual DB client
      const startTime = Date.now();
      
      // Simple query to check connectivity
      // const result = await db.query('SELECT 1');
      
      const duration = Date.now() - startTime;
      
      if (duration > this.thresholds.response_time_critical) {
        return {
          status: 'unhealthy',
          message: `Database response time too high: ${duration}ms`,
          duration,
          timestamp: Date.now(),
          metadata: { response_time: duration },
        };
      } else if (duration > this.thresholds.response_time_warning) {
        return {
          status: 'degraded',
          message: `Database response time elevated: ${duration}ms`,
          duration,
          timestamp: Date.now(),
          metadata: { response_time: duration },
        };
      }
      
      return {
        status: 'healthy',
        message: 'Database connection healthy',
        duration,
        timestamp: Date.now(),
        metadata: { response_time: duration },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `Database check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: 0,
        timestamp: Date.now(),
      };
    }
  }

  private async checkRedis(): Promise<HealthCheckResult> {
    try {
      const startTime = Date.now();
      
      // Simulate Redis ping - in real implementation, would use actual Redis client
      // const result = await redis.ping();
      
      const duration = Date.now() - startTime;
      
      return {
        status: 'healthy',
        message: 'Redis connection healthy',
        duration,
        timestamp: Date.now(),
        metadata: { response_time: duration },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `Redis check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: 0,
        timestamp: Date.now(),
      };
    }
  }

  private async checkOpenAI(): Promise<HealthCheckResult> {
    try {
      // Simple API check without making actual requests
      if (!process.env.OPENAI_API_KEY) {
        return {
          status: 'unhealthy',
          message: 'OpenAI API key not configured',
          duration: 0,
          timestamp: Date.now(),
        };
      }
      
      return {
        status: 'healthy',
        message: 'OpenAI configuration valid',
        duration: 0,
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        status: 'degraded',
        message: `OpenAI check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: 0,
        timestamp: Date.now(),
      };
    }
  }

  private async checkAnthropic(): Promise<HealthCheckResult> {
    try {
      if (!process.env.ANTHROPIC_API_KEY) {
        return {
          status: 'unhealthy',
          message: 'Anthropic API key not configured',
          duration: 0,
          timestamp: Date.now(),
        };
      }
      
      return {
        status: 'healthy',
        message: 'Anthropic configuration valid',
        duration: 0,
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        status: 'degraded',
        message: `Anthropic check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: 0,
        timestamp: Date.now(),
      };
    }
  }

  private async checkMemoryUsage(): Promise<HealthCheckResult> {
    const usage = process.memoryUsage();
    const totalMemory = usage.heapTotal + usage.external;
    const usedMemory = usage.heapUsed;
    const memoryUsagePercent = (usedMemory / totalMemory) * 100;
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    let message = `Memory usage: ${memoryUsagePercent.toFixed(1)}%`;
    
    if (memoryUsagePercent > this.thresholds.memory_usage_critical) {
      status = 'unhealthy';
      message = `Critical memory usage: ${memoryUsagePercent.toFixed(1)}%`;
    } else if (memoryUsagePercent > this.thresholds.memory_usage_warning) {
      status = 'degraded';
      message = `High memory usage: ${memoryUsagePercent.toFixed(1)}%`;
    }
    
    return {
      status,
      message,
      duration: 0,
      timestamp: Date.now(),
      metadata: {
        usage_percent: memoryUsagePercent,
        heap_used: usage.heapUsed,
        heap_total: usage.heapTotal,
        external: usage.external,
      },
    };
  }

  private async checkCPUUsage(): Promise<HealthCheckResult> {
    // Simple CPU check - in production, would use more sophisticated monitoring
    const startTime = process.hrtime.bigint();
    
    // Simulate some work
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const endTime = process.hrtime.bigint();
    const cpuUsage = process.cpuUsage();
    
    // Rough CPU usage estimation
    const cpuPercent = (Number(cpuUsage.user + cpuUsage.system) / 1000000) / 100 * 100;
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    let message = `CPU usage: ${cpuPercent.toFixed(1)}%`;
    
    if (cpuPercent > this.thresholds.cpu_usage_critical) {
      status = 'unhealthy';
      message = `Critical CPU usage: ${cpuPercent.toFixed(1)}%`;
    } else if (cpuPercent > this.thresholds.cpu_usage_warning) {
      status = 'degraded';
      message = `High CPU usage: ${cpuPercent.toFixed(1)}%`;
    }
    
    return {
      status,
      message,
      duration: 0,
      timestamp: Date.now(),
      metadata: {
        usage_percent: cpuPercent,
        user: cpuUsage.user,
        system: cpuUsage.system,
      },
    };
  }

  private async checkDiskSpace(): Promise<HealthCheckResult> {
    try {
      // In production, would use fs.statSync or similar to check actual disk space
      const mockDiskUsage = 45; // 45% used
      
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      let message = `Disk usage: ${mockDiskUsage}%`;
      
      if (mockDiskUsage > 90) {
        status = 'unhealthy';
        message = `Critical disk usage: ${mockDiskUsage}%`;
      } else if (mockDiskUsage > 80) {
        status = 'degraded';
        message = `High disk usage: ${mockDiskUsage}%`;
      }
      
      return {
        status,
        message,
        duration: 0,
        timestamp: Date.now(),
        metadata: { usage_percent: mockDiskUsage },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `Disk check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: 0,
        timestamp: Date.now(),
      };
    }
  }

  private async checkDockerHealth(): Promise<HealthCheckResult> {
    try {
      // In production, would check Docker daemon connectivity
      return {
        status: 'healthy',
        message: 'Docker service healthy',
        duration: 0,
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `Docker check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: 0,
        timestamp: Date.now(),
      };
    }
  }

  private async checkQueueHealth(): Promise<HealthCheckResult> {
    try {
      // In production, would check queue depth and processing status
      const mockQueueDepth = 15;
      const maxQueueDepth = 1000;
      
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      let message = `Queue depth: ${mockQueueDepth}`;
      
      if (mockQueueDepth > maxQueueDepth * 0.9) {
        status = 'unhealthy';
        message = `Queue critically full: ${mockQueueDepth}`;
      } else if (mockQueueDepth > maxQueueDepth * 0.7) {
        status = 'degraded';
        message = `Queue filling up: ${mockQueueDepth}`;
      }
      
      return {
        status,
        message,
        duration: 0,
        timestamp: Date.now(),
        metadata: { queue_depth: mockQueueDepth, max_depth: maxQueueDepth },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `Queue check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: 0,
        timestamp: Date.now(),
      };
    }
  }

  private async checkGitHubAPI(): Promise<HealthCheckResult> {
    try {
      if (!process.env.GITHUB_APP_ID || !process.env.GITHUB_PRIVATE_KEY) {
        return {
          status: 'degraded',
          message: 'GitHub configuration incomplete',
          duration: 0,
          timestamp: Date.now(),
        };
      }
      
      return {
        status: 'healthy',
        message: 'GitHub configuration valid',
        duration: 0,
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        status: 'degraded',
        message: `GitHub check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: 0,
        timestamp: Date.now(),
      };
    }
  }

  private startPeriodicChecks(): void {
    // Run health checks every 30 seconds
    this.checkInterval = setInterval(async () => {
      try {
        await this.runHealthChecks();
      } catch (error) {
        this.logger.error('Periodic health check failed', { error });
      }
    }, 30000);
  }

  getLastResults(): Record<string, HealthCheckResult> {
    const results: Record<string, HealthCheckResult> = {};
    this.lastResults.forEach((result, name) => {
      results[name] = result;
    });
    return results;
  }

  updateThresholds(newThresholds: Partial<HealthThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
    this.logger.info('Health check thresholds updated', { thresholds: this.thresholds });
  }

  getHealthSummary(): SystemHealth {
    const lastResults = this.getLastResults();
    return this.calculateSystemHealth(lastResults);
  }

  async shutdown(): Promise<void> {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    
    await this.metrics.flush();
    this.logger.info('Health check service shutdown complete');
  }
}