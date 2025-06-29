import { Logger } from '../utils/logger';
import { MetricsCollector } from '../utils/metrics';
import { EventEmitter } from 'events';

interface PerformanceMetrics {
  provider: string;
  model: string;
  operationType: string;
  latency: number;
  tokenUsage: {
    input: number;
    output: number;
    images?: number;
  };
  cost: number;
  timestamp: number;
  success: boolean;
  errorType?: string;
  retryCount: number;
  userId?: string;
  qualityScore?: number;
}

interface ModelPerformanceStats {
  averageLatency: number;
  successRate: number;
  averageCost: number;
  averageQuality: number;
  totalRequests: number;
  errorBreakdown: Record<string, number>;
  latencyPercentiles: {
    p50: number;
    p95: number;
    p99: number;
  };
  costEfficiency: number;
  reliabilityScore: number;
}

interface PerformanceAlert {
  type: 'latency' | 'error_rate' | 'cost' | 'quality';
  severity: 'warning' | 'critical';
  provider: string;
  model: string;
  currentValue: number;
  threshold: number;
  timestamp: number;
  details: string;
}

interface PerformanceThresholds {
  latency: {
    warning: number;
    critical: number;
  };
  errorRate: {
    warning: number;
    critical: number;
  };
  cost: {
    warning: number;
    critical: number;
  };
  quality: {
    warning: number;
    critical: number;
  };
}

interface ModelComparison {
  models: string[];
  comparison: {
    latency: Record<string, number>;
    cost: Record<string, number>;
    quality: Record<string, number>;
    reliability: Record<string, number>;
  };
  recommendation: ModelRecommendation;
}

interface ModelRecommendation {
  bestOverall: string;
  fastestResponse: string;
  mostCostEffective: string;
  highestQuality: string;
  mostReliable: string;
  reasoning: string;
}

export class AIPerformanceMonitor extends EventEmitter {
  private logger: Logger;
  private metrics: MetricsCollector;
  private performanceData: PerformanceMetrics[];
  private alerts: PerformanceAlert[];
  private thresholds: Map<string, PerformanceThresholds>;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private lastAnalysis: number = 0;

  constructor() {
    super();
    this.logger = new Logger('AIPerformanceMonitor');
    this.metrics = new MetricsCollector('ai_performance');
    this.performanceData = [];
    this.alerts = [];
    this.thresholds = new Map();
    
    this.initializeThresholds();
    this.startMonitoring();
  }

  private initializeThresholds(): void {
    // OpenAI GPT-4 thresholds
    this.thresholds.set('openai-gpt-4', {
      latency: { warning: 5000, critical: 10000 }, // ms
      errorRate: { warning: 5, critical: 10 }, // percentage
      cost: { warning: 0.10, critical: 0.20 }, // per request
      quality: { warning: 0.7, critical: 0.5 }, // score 0-1
    });

    // OpenAI GPT-3.5 thresholds
    this.thresholds.set('openai-gpt-3.5', {
      latency: { warning: 3000, critical: 6000 },
      errorRate: { warning: 3, critical: 8 },
      cost: { warning: 0.01, critical: 0.05 },
      quality: { warning: 0.6, critical: 0.4 },
    });

    // Anthropic Claude thresholds
    this.thresholds.set('anthropic-claude', {
      latency: { warning: 4000, critical: 8000 },
      errorRate: { warning: 4, critical: 9 },
      cost: { warning: 0.08, critical: 0.15 },
      quality: { warning: 0.75, critical: 0.55 },
    });
  }

  recordPerformance(metrics: PerformanceMetrics): void {
    // Add timestamp if not provided
    if (!metrics.timestamp) {
      metrics.timestamp = Date.now();
    }

    this.performanceData.push(metrics);
    
    // Record to metrics collector
    this.metrics.recordPerformance(
      metrics.provider,
      metrics.model,
      metrics.operationType,
      {
        latency: metrics.latency,
        success: metrics.success,
        cost: metrics.cost,
        retryCount: metrics.retryCount,
        qualityScore: metrics.qualityScore || 0,
      }
    );

    // Check for immediate alerts
    this.checkPerformanceAlerts(metrics);

    // Emit performance event
    this.emit('performance_recorded', metrics);

    // Keep only recent data (last 7 days)
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    this.performanceData = this.performanceData.filter(data => data.timestamp >= cutoff);
  }

  getModelStats(
    provider: string,
    model: string,
    timeframe: '1h' | '24h' | '7d' | '30d' = '24h'
  ): ModelPerformanceStats {
    const timeframeMs = this.parseTimeframe(timeframe);
    const cutoff = Date.now() - timeframeMs;
    
    const modelData = this.performanceData.filter(data =>
      data.provider === provider &&
      data.model === model &&
      data.timestamp >= cutoff
    );

    if (modelData.length === 0) {
      return this.getEmptyStats();
    }

    const latencies = modelData.map(d => d.latency).sort((a, b) => a - b);
    const successCount = modelData.filter(d => d.success).length;
    const totalCost = modelData.reduce((sum, d) => sum + d.cost, 0);
    const qualityScores = modelData
      .filter(d => d.qualityScore !== undefined)
      .map(d => d.qualityScore!);

    // Calculate error breakdown
    const errorBreakdown: Record<string, number> = {};
    modelData.filter(d => !d.success).forEach(d => {
      const errorType = d.errorType || 'unknown';
      errorBreakdown[errorType] = (errorBreakdown[errorType] || 0) + 1;
    });

    return {
      averageLatency: latencies.reduce((sum, l) => sum + l, 0) / latencies.length,
      successRate: (successCount / modelData.length) * 100,
      averageCost: totalCost / modelData.length,
      averageQuality: qualityScores.length > 0 ? 
        qualityScores.reduce((sum, q) => sum + q, 0) / qualityScores.length : 0,
      totalRequests: modelData.length,
      errorBreakdown,
      latencyPercentiles: {
        p50: latencies[Math.floor(latencies.length * 0.5)] || 0,
        p95: latencies[Math.floor(latencies.length * 0.95)] || 0,
        p99: latencies[Math.floor(latencies.length * 0.99)] || 0,
      },
      costEfficiency: this.calculateCostEfficiency(modelData),
      reliabilityScore: this.calculateReliabilityScore(modelData),
    };
  }

  compareModels(
    models: Array<{ provider: string; model: string }>,
    timeframe: '1h' | '24h' | '7d' | '30d' = '24h'
  ): ModelComparison {
    const modelStats = models.map(({ provider, model }) => ({
      key: `${provider}-${model}`,
      stats: this.getModelStats(provider, model, timeframe),
    }));

    const comparison = {
      latency: {},
      cost: {},
      quality: {},
      reliability: {},
    } as ModelComparison['comparison'];

    modelStats.forEach(({ key, stats }) => {
      comparison.latency[key] = stats.averageLatency;
      comparison.cost[key] = stats.averageCost;
      comparison.quality[key] = stats.averageQuality;
      comparison.reliability[key] = stats.reliabilityScore;
    });

    const recommendation = this.generateRecommendation(modelStats);

    return {
      models: models.map(m => `${m.provider}-${m.model}`),
      comparison,
      recommendation,
    };
  }

  getPerformanceAlerts(severity?: 'warning' | 'critical'): PerformanceAlert[] {
    const recentAlerts = this.alerts.filter(alert => 
      Date.now() - alert.timestamp < 24 * 60 * 60 * 1000 // Last 24 hours
    );

    if (severity) {
      return recentAlerts.filter(alert => alert.severity === severity);
    }

    return recentAlerts;
  }

  getPerformanceTrends(
    provider: string,
    model: string,
    metric: 'latency' | 'cost' | 'quality' | 'success_rate',
    timeframe: '1h' | '24h' | '7d' | '30d' = '24h'
  ): Array<{ timestamp: number; value: number }> {
    const timeframeMs = this.parseTimeframe(timeframe);
    const cutoff = Date.now() - timeframeMs;
    
    const modelData = this.performanceData.filter(data =>
      data.provider === provider &&
      data.model === model &&
      data.timestamp >= cutoff
    );

    // Group by time buckets (e.g., hourly for 24h timeframe)
    const bucketSize = this.getBucketSize(timeframe);
    const buckets = new Map<number, PerformanceMetrics[]>();

    modelData.forEach(data => {
      const bucketKey = Math.floor(data.timestamp / bucketSize) * bucketSize;
      if (!buckets.has(bucketKey)) {
        buckets.set(bucketKey, []);
      }
      buckets.get(bucketKey)!.push(data);
    });

    return Array.from(buckets.entries())
      .map(([timestamp, data]) => ({
        timestamp,
        value: this.calculateMetricValue(data, metric),
      }))
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  private checkPerformanceAlerts(metrics: PerformanceMetrics): void {
    const thresholdKey = `${metrics.provider}-${metrics.model.split('-')[0]}`;
    const thresholds = this.thresholds.get(thresholdKey);
    
    if (!thresholds) return;

    // Check latency alerts
    if (metrics.latency > thresholds.latency.critical) {
      this.createAlert('latency', 'critical', metrics, thresholds.latency.critical);
    } else if (metrics.latency > thresholds.latency.warning) {
      this.createAlert('latency', 'warning', metrics, thresholds.latency.warning);
    }

    // Check cost alerts
    if (metrics.cost > thresholds.cost.critical) {
      this.createAlert('cost', 'critical', metrics, thresholds.cost.critical);
    } else if (metrics.cost > thresholds.cost.warning) {
      this.createAlert('cost', 'warning', metrics, thresholds.cost.warning);
    }

    // Check quality alerts
    if (metrics.qualityScore !== undefined) {
      if (metrics.qualityScore < thresholds.quality.critical) {
        this.createAlert('quality', 'critical', metrics, thresholds.quality.critical);
      } else if (metrics.qualityScore < thresholds.quality.warning) {
        this.createAlert('quality', 'warning', metrics, thresholds.quality.warning);
      }
    }

    // Check error rate (calculated from recent data)
    this.checkErrorRateAlerts(metrics, thresholds);
  }

  private checkErrorRateAlerts(metrics: PerformanceMetrics, thresholds: PerformanceThresholds): void {
    const recentWindow = 10 * 60 * 1000; // 10 minutes
    const cutoff = Date.now() - recentWindow;
    
    const recentData = this.performanceData.filter(data =>
      data.provider === metrics.provider &&
      data.model === metrics.model &&
      data.timestamp >= cutoff
    );

    if (recentData.length < 5) return; // Need minimum data points

    const errorRate = (recentData.filter(d => !d.success).length / recentData.length) * 100;

    if (errorRate > thresholds.errorRate.critical) {
      this.createAlert('error_rate', 'critical', metrics, thresholds.errorRate.critical, `Error rate: ${errorRate.toFixed(1)}%`);
    } else if (errorRate > thresholds.errorRate.warning) {
      this.createAlert('error_rate', 'warning', metrics, thresholds.errorRate.warning, `Error rate: ${errorRate.toFixed(1)}%`);
    }
  }

  private createAlert(
    type: PerformanceAlert['type'],
    severity: PerformanceAlert['severity'],
    metrics: PerformanceMetrics,
    threshold: number,
    customDetails?: string
  ): void {
    const alert: PerformanceAlert = {
      type,
      severity,
      provider: metrics.provider,
      model: metrics.model,
      currentValue: this.getMetricValue(metrics, type),
      threshold,
      timestamp: Date.now(),
      details: customDetails || `${type} exceeded threshold`,
    };

    this.alerts.push(alert);
    this.emit('performance_alert', alert);

    this.logger.warn(`Performance alert: ${type} ${severity}`, {
      provider: metrics.provider,
      model: metrics.model,
      currentValue: alert.currentValue,
      threshold,
    });
  }

  private getMetricValue(metrics: PerformanceMetrics, type: PerformanceAlert['type']): number {
    switch (type) {
      case 'latency':
        return metrics.latency;
      case 'cost':
        return metrics.cost;
      case 'quality':
        return metrics.qualityScore || 0;
      case 'error_rate':
        return metrics.success ? 0 : 100;
      default:
        return 0;
    }
  }

  private calculateCostEfficiency(data: PerformanceMetrics[]): number {
    if (data.length === 0) return 0;
    
    const avgCost = data.reduce((sum, d) => sum + d.cost, 0) / data.length;
    const avgQuality = data
      .filter(d => d.qualityScore !== undefined)
      .reduce((sum, d) => sum + d.qualityScore!, 0) / data.length;
    
    // Higher quality per dollar is better efficiency
    return avgQuality / avgCost;
  }

  private calculateReliabilityScore(data: PerformanceMetrics[]): number {
    if (data.length === 0) return 0;
    
    const successRate = (data.filter(d => d.success).length / data.length) * 100;
    const avgRetryCount = data.reduce((sum, d) => sum + d.retryCount, 0) / data.length;
    
    // Penalize high retry counts
    const retryPenalty = Math.min(avgRetryCount * 10, 50);
    
    return Math.max(0, successRate - retryPenalty);
  }

  private generateRecommendation(
    modelStats: Array<{ key: string; stats: ModelPerformanceStats }>
  ): ModelRecommendation {
    if (modelStats.length === 0) {
      return {
        bestOverall: 'none',
        fastestResponse: 'none',
        mostCostEffective: 'none',
        highestQuality: 'none',
        mostReliable: 'none',
        reasoning: 'No data available for comparison',
      };
    }

    const fastestResponse = modelStats.reduce((best, current) =>
      current.stats.averageLatency < best.stats.averageLatency ? current : best
    ).key;

    const mostCostEffective = modelStats.reduce((best, current) =>
      current.stats.costEfficiency > best.stats.costEfficiency ? current : best
    ).key;

    const highestQuality = modelStats.reduce((best, current) =>
      current.stats.averageQuality > best.stats.averageQuality ? current : best
    ).key;

    const mostReliable = modelStats.reduce((best, current) =>
      current.stats.reliabilityScore > best.stats.reliabilityScore ? current : best
    ).key;

    // Calculate overall score (weighted combination)
    const bestOverall = modelStats.reduce((best, current) => {
      const currentScore = this.calculateOverallScore(current.stats);
      const bestScore = this.calculateOverallScore(best.stats);
      return currentScore > bestScore ? current : best;
    }).key;

    return {
      bestOverall,
      fastestResponse,
      mostCostEffective,
      highestQuality,
      mostReliable,
      reasoning: this.generateRecommendationReasoning(modelStats, {
        bestOverall,
        fastestResponse,
        mostCostEffective,
        highestQuality,
        mostReliable,
      }),
    };
  }

  private calculateOverallScore(stats: ModelPerformanceStats): number {
    // Weighted scoring: reliability 40%, cost efficiency 25%, quality 20%, latency 15%
    const reliabilityScore = stats.reliabilityScore / 100;
    const costEfficiencyScore = Math.min(stats.costEfficiency * 10, 1); // Normalize
    const qualityScore = stats.averageQuality;
    const latencyScore = Math.max(0, 1 - (stats.averageLatency / 10000)); // Normalize to 0-1
    
    return (reliabilityScore * 0.4) + 
           (costEfficiencyScore * 0.25) + 
           (qualityScore * 0.2) + 
           (latencyScore * 0.15);
  }

  private generateRecommendationReasoning(
    modelStats: Array<{ key: string; stats: ModelPerformanceStats }>,
    recommendations: Omit<ModelRecommendation, 'reasoning'>
  ): string {
    const reasons: string[] = [];
    
    if (recommendations.bestOverall === recommendations.mostReliable) {
      reasons.push('High reliability is the key factor');
    }
    
    if (recommendations.bestOverall === recommendations.mostCostEffective) {
      reasons.push('Cost efficiency provides the best value');
    }
    
    if (recommendations.fastestResponse !== recommendations.bestOverall) {
      reasons.push('Speed vs quality/cost tradeoff considered');
    }
    
    return reasons.length > 0 ? reasons.join('. ') : 'Balanced performance across all metrics';
  }

  private getEmptyStats(): ModelPerformanceStats {
    return {
      averageLatency: 0,
      successRate: 0,
      averageCost: 0,
      averageQuality: 0,
      totalRequests: 0,
      errorBreakdown: {},
      latencyPercentiles: { p50: 0, p95: 0, p99: 0 },
      costEfficiency: 0,
      reliabilityScore: 0,
    };
  }

  private parseTimeframe(timeframe: string): number {
    switch (timeframe) {
      case '1h': return 60 * 60 * 1000;
      case '24h': return 24 * 60 * 60 * 1000;
      case '7d': return 7 * 24 * 60 * 60 * 1000;
      case '30d': return 30 * 24 * 60 * 60 * 1000;
      default: return 24 * 60 * 60 * 1000;
    }
  }

  private getBucketSize(timeframe: string): number {
    switch (timeframe) {
      case '1h': return 5 * 60 * 1000; // 5 minute buckets
      case '24h': return 60 * 60 * 1000; // 1 hour buckets
      case '7d': return 6 * 60 * 60 * 1000; // 6 hour buckets
      case '30d': return 24 * 60 * 60 * 1000; // 1 day buckets
      default: return 60 * 60 * 1000;
    }
  }

  private calculateMetricValue(data: PerformanceMetrics[], metric: string): number {
    if (data.length === 0) return 0;
    
    switch (metric) {
      case 'latency':
        return data.reduce((sum, d) => sum + d.latency, 0) / data.length;
      case 'cost':
        return data.reduce((sum, d) => sum + d.cost, 0) / data.length;
      case 'quality':
        const qualityData = data.filter(d => d.qualityScore !== undefined);
        return qualityData.length > 0 ? 
          qualityData.reduce((sum, d) => sum + d.qualityScore!, 0) / qualityData.length : 0;
      case 'success_rate':
        return (data.filter(d => d.success).length / data.length) * 100;
      default:
        return 0;
    }
  }

  private startMonitoring(): void {
    // Run performance analysis every 5 minutes
    this.monitoringInterval = setInterval(() => {
      this.runPerformanceAnalysis();
    }, 5 * 60 * 1000);
  }

  private runPerformanceAnalysis(): void {
    const now = Date.now();
    
    // Skip if we just ran analysis
    if (now - this.lastAnalysis < 4 * 60 * 1000) return;
    
    this.lastAnalysis = now;
    
    // Analyze each provider/model combination
    const combinations = new Set<string>();
    this.performanceData.forEach(data => {
      combinations.add(`${data.provider}-${data.model}`);
    });
    
    combinations.forEach(combination => {
      const [provider, model] = combination.split('-', 2);
      const stats = this.getModelStats(provider, model, '1h');
      
      // Emit performance summary
      this.emit('performance_summary', {
        provider,
        model,
        stats,
        timestamp: now,
      });
    });
  }

  updateThresholds(
    provider: string,
    model: string,
    thresholds: Partial<PerformanceThresholds>
  ): void {
    const key = `${provider}-${model.split('-')[0]}`;
    const existing = this.thresholds.get(key) || this.getDefaultThresholds();
    
    this.thresholds.set(key, { ...existing, ...thresholds });
  }

  private getDefaultThresholds(): PerformanceThresholds {
    return {
      latency: { warning: 5000, critical: 10000 },
      errorRate: { warning: 5, critical: 10 },
      cost: { warning: 0.10, critical: 0.20 },
      quality: { warning: 0.7, critical: 0.5 },
    };
  }

  getHealthStatus(): Record<string, any> {
    const recentAlerts = this.getPerformanceAlerts();
    const criticalAlerts = recentAlerts.filter(a => a.severity === 'critical');
    
    return {
      status: criticalAlerts.length > 0 ? 'critical' : 
              recentAlerts.length > 0 ? 'warning' : 'healthy',
      totalAlerts: recentAlerts.length,
      criticalAlerts: criticalAlerts.length,
      dataPoints: this.performanceData.length,
      monitoringActive: this.monitoringInterval !== null,
      lastAnalysis: this.lastAnalysis,
    };
  }

  async shutdown(): Promise<void> {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    await this.metrics.flush();
    
    this.logger.info('AI Performance Monitor shutdown complete');
  }
}