import { Logger } from '../utils/logger';
import { MetricsCollector } from '../utils/metrics';
import { EventEmitter } from 'events';

interface CostConfig {
  provider: string;
  model: string;
  inputCostPer1000: number;
  outputCostPer1000: number;
  imageCostPer1000?: number;
  dailyBudget: number;
  monthlyBudget: number;
  alertThresholds: {
    daily: number[];
    monthly: number[];
  };
}

interface UsageRecord {
  timestamp: number;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  imageTokens?: number;
  cost: number;
  operationType: string;
  userId?: string;
  organizationId?: string;
}

interface BudgetAlert {
  type: 'daily' | 'monthly';
  threshold: number;
  currentUsage: number;
  budget: number;
  provider: string;
  timestamp: number;
}

interface CostSummary {
  totalCost: number;
  dailyCost: number;
  monthlyCost: number;
  tokenUsage: {
    input: number;
    output: number;
    images?: number;
  };
  providerBreakdown: Record<string, number>;
  modelBreakdown: Record<string, number>;
  operationBreakdown: Record<string, number>;
}

interface CostOptimization {
  recommendations: CostRecommendation[];
  potentialSavings: number;
  optimizationScore: number;
}

interface CostRecommendation {
  type: 'model_switch' | 'prompt_optimization' | 'caching' | 'batch_processing';
  description: string;
  potentialSaving: number;
  difficulty: 'easy' | 'medium' | 'hard';
  implementation: string;
}

export class CostTracker extends EventEmitter {
  private logger: Logger;
  private metrics: MetricsCollector;
  private costConfigs: Map<string, CostConfig>;
  private usageRecords: UsageRecord[];
  private budgetAlerts: BudgetAlert[];
  private lastFlush: number;
  private flushInterval: number = 60000; // 1 minute

  constructor() {
    super();
    this.logger = new Logger('CostTracker');
    this.metrics = new MetricsCollector('cost_tracking');
    this.costConfigs = new Map();
    this.usageRecords = [];
    this.budgetAlerts = [];
    this.lastFlush = Date.now();
    
    this.initializeCostConfigs();
    this.startPeriodicFlush();
  }

  private initializeCostConfigs(): void {
    // OpenAI GPT-4 Turbo
    this.costConfigs.set('openai-gpt-4-turbo', {
      provider: 'openai',
      model: 'gpt-4-turbo-preview',
      inputCostPer1000: 10.00,
      outputCostPer1000: 30.00,
      dailyBudget: 100.00,
      monthlyBudget: 2000.00,
      alertThresholds: {
        daily: [50, 75, 90],
        monthly: [50, 75, 90],
      },
    });

    // OpenAI GPT-3.5 Turbo
    this.costConfigs.set('openai-gpt-3.5-turbo', {
      provider: 'openai',
      model: 'gpt-3.5-turbo',
      inputCostPer1000: 0.50,
      outputCostPer1000: 1.50,
      dailyBudget: 50.00,
      monthlyBudget: 1000.00,
      alertThresholds: {
        daily: [60, 80, 95],
        monthly: [60, 80, 95],
      },
    });

    // OpenAI GPT-4 Vision
    this.costConfigs.set('openai-gpt-4-vision', {
      provider: 'openai',
      model: 'gpt-4-vision-preview',
      inputCostPer1000: 10.00,
      outputCostPer1000: 30.00,
      imageCostPer1000: 85.00, // Per 1000 image tokens
      dailyBudget: 150.00,
      monthlyBudget: 3000.00,
      alertThresholds: {
        daily: [50, 75, 90],
        monthly: [50, 75, 90],
      },
    });

    // Anthropic Claude 3.5 Sonnet
    this.costConfigs.set('anthropic-claude-3-5-sonnet', {
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-20241022',
      inputCostPer1000: 3.00,
      outputCostPer1000: 15.00,
      dailyBudget: 75.00,
      monthlyBudget: 1500.00,
      alertThresholds: {
        daily: [60, 80, 95],
        monthly: [60, 80, 95],
      },
    });

    // Anthropic Claude 3 Haiku (for cheaper operations)
    this.costConfigs.set('anthropic-claude-3-haiku', {
      provider: 'anthropic',
      model: 'claude-3-haiku-20240307',
      inputCostPer1000: 0.25,
      outputCostPer1000: 1.25,
      dailyBudget: 25.00,
      monthlyBudget: 500.00,
      alertThresholds: {
        daily: [70, 85, 95],
        monthly: [70, 85, 95],
      },
    });
  }

  async trackUsage(
    provider: string,
    model: string,
    usage: {
      input_tokens: number;
      output_tokens: number;
      image_tokens?: number;
    },
    context: {
      operationType: string;
      userId?: string;
      organizationId?: string;
    } = { operationType: 'unknown' }
  ): Promise<number> {
    const configKey = `${provider}-${model.replace(/[^a-z0-9-]/gi, '-')}`;
    const config = this.costConfigs.get(configKey);
    
    if (!config) {
      this.logger.warn(`No cost configuration found for ${provider}-${model}`);
      return 0;
    }

    // Calculate cost
    const inputCost = (usage.input_tokens / 1000) * config.inputCostPer1000;
    const outputCost = (usage.output_tokens / 1000) * config.outputCostPer1000;
    const imageCost = usage.image_tokens && config.imageCostPer1000 ? 
      (usage.image_tokens / 1000) * config.imageCostPer1000 : 0;
    
    const totalCost = inputCost + outputCost + imageCost;

    // Create usage record
    const usageRecord: UsageRecord = {
      timestamp: Date.now(),
      provider,
      model,
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
      imageTokens: usage.image_tokens,
      cost: totalCost,
      operationType: context.operationType,
      userId: context.userId,
      organizationId: context.organizationId,
    };

    this.usageRecords.push(usageRecord);

    // Record metrics
    this.metrics.recordCost(provider, model, totalCost);
    this.metrics.recordTokenUsage(provider, model, usage.input_tokens, usage.output_tokens);

    // Check budget alerts
    await this.checkBudgetAlerts(config, totalCost);

    // Emit cost tracking event
    this.emit('usage_tracked', {
      provider,
      model,
      cost: totalCost,
      tokens: usage,
      operationType: context.operationType,
    });

    // Periodic flush
    if (Date.now() - this.lastFlush > this.flushInterval) {
      await this.flush();
    }

    return totalCost;
  }

  private async checkBudgetAlerts(config: CostConfig, newCost: number): Promise<void> {
    const now = Date.now();
    const dailyUsage = this.getDailyUsage(config.provider, config.model);
    const monthlyUsage = this.getMonthlyUsage(config.provider, config.model);

    // Check daily budget alerts
    for (const threshold of config.alertThresholds.daily) {
      const thresholdAmount = (config.dailyBudget * threshold) / 100;
      
      if (dailyUsage >= thresholdAmount && dailyUsage - newCost < thresholdAmount) {
        const alert: BudgetAlert = {
          type: 'daily',
          threshold,
          currentUsage: dailyUsage,
          budget: config.dailyBudget,
          provider: config.provider,
          timestamp: now,
        };
        
        this.budgetAlerts.push(alert);
        this.emit('budget_alert', alert);
        
        this.logger.warn(`Daily budget alert: ${threshold}% threshold reached`, {
          provider: config.provider,
          model: config.model,
          usage: dailyUsage,
          budget: config.dailyBudget,
        });
      }
    }

    // Check monthly budget alerts
    for (const threshold of config.alertThresholds.monthly) {
      const thresholdAmount = (config.monthlyBudget * threshold) / 100;
      
      if (monthlyUsage >= thresholdAmount && monthlyUsage - newCost < thresholdAmount) {
        const alert: BudgetAlert = {
          type: 'monthly',
          threshold,
          currentUsage: monthlyUsage,
          budget: config.monthlyBudget,
          provider: config.provider,
          timestamp: now,
        };
        
        this.budgetAlerts.push(alert);
        this.emit('budget_alert', alert);
        
        this.logger.warn(`Monthly budget alert: ${threshold}% threshold reached`, {
          provider: config.provider,
          model: config.model,
          usage: monthlyUsage,
          budget: config.monthlyBudget,
        });
      }
    }

    // Check for budget exceeded
    if (dailyUsage > config.dailyBudget) {
      this.emit('budget_exceeded', {
        type: 'daily',
        provider: config.provider,
        model: config.model,
        usage: dailyUsage,
        budget: config.dailyBudget,
      });
    }

    if (monthlyUsage > config.monthlyBudget) {
      this.emit('budget_exceeded', {
        type: 'monthly',
        provider: config.provider,
        model: config.model,
        usage: monthlyUsage,
        budget: config.monthlyBudget,
      });
    }
  }

  getCostSummary(
    timeframe: 'daily' | 'weekly' | 'monthly' | 'all' = 'daily',
    provider?: string
  ): CostSummary {
    const filteredRecords = this.getFilteredRecords(timeframe, provider);
    
    const totalCost = filteredRecords.reduce((sum, record) => sum + record.cost, 0);
    const dailyCost = this.getDailyUsage(provider);
    const monthlyCost = this.getMonthlyUsage(provider);
    
    const tokenUsage = filteredRecords.reduce(
      (acc, record) => ({
        input: acc.input + record.inputTokens,
        output: acc.output + record.outputTokens,
        images: acc.images + (record.imageTokens || 0),
      }),
      { input: 0, output: 0, images: 0 }
    );

    const providerBreakdown = this.calculateProviderBreakdown(filteredRecords);
    const modelBreakdown = this.calculateModelBreakdown(filteredRecords);
    const operationBreakdown = this.calculateOperationBreakdown(filteredRecords);

    return {
      totalCost,
      dailyCost,
      monthlyCost,
      tokenUsage,
      providerBreakdown,
      modelBreakdown,
      operationBreakdown,
    };
  }

  getCostOptimizations(): CostOptimization {
    const recommendations: CostRecommendation[] = [];
    let potentialSavings = 0;

    // Analyze usage patterns for optimization opportunities
    const recentRecords = this.getFilteredRecords('weekly');
    
    // Check for expensive model usage that could use cheaper alternatives
    const expensiveModelUsage = recentRecords.filter(record => 
      record.model.includes('gpt-4') && record.operationType === 'simple_task'
    );
    
    if (expensiveModelUsage.length > 0) {
      const savings = expensiveModelUsage.reduce((sum, record) => {
        const expensiveCost = record.cost;
        const cheaperCost = this.calculateCheaperModelCost(record);
        return sum + (expensiveCost - cheaperCost);
      }, 0);
      
      recommendations.push({
        type: 'model_switch',
        description: 'Switch simple tasks from GPT-4 to GPT-3.5 Turbo',
        potentialSaving: savings,
        difficulty: 'easy',
        implementation: 'Update model selection logic for simple operations',
      });
      
      potentialSavings += savings;
    }

    // Check for prompt optimization opportunities
    const longPromptRecords = recentRecords.filter(record => 
      record.inputTokens > 2000
    );
    
    if (longPromptRecords.length > 0) {
      const savings = longPromptRecords.reduce((sum, record) => 
        sum + (record.inputTokens * 0.3 * this.getInputCostPerToken(record.provider, record.model)), 0
      );
      
      recommendations.push({
        type: 'prompt_optimization',
        description: 'Optimize long prompts to reduce input token usage',
        potentialSaving: savings,
        difficulty: 'medium',
        implementation: 'Review and shorten prompts, use templates',
      });
      
      potentialSavings += savings;
    }

    // Check for caching opportunities
    const duplicateOperations = this.findDuplicateOperations(recentRecords);
    
    if (duplicateOperations.length > 0) {
      const savings = duplicateOperations.reduce((sum, op) => sum + op.potentialSaving, 0);
      
      recommendations.push({
        type: 'caching',
        description: 'Implement caching for repeated operations',
        potentialSaving: savings,
        difficulty: 'medium',
        implementation: 'Add Redis cache for similar requests',
      });
      
      potentialSavings += savings;
    }

    // Check for batch processing opportunities
    const batchableOperations = this.findBatchableOperations(recentRecords);
    
    if (batchableOperations.length > 0) {
      const savings = batchableOperations.reduce((sum, op) => sum + op.potentialSaving, 0);
      
      recommendations.push({
        type: 'batch_processing',
        description: 'Batch similar operations to reduce API calls',
        potentialSaving: savings,
        difficulty: 'hard',
        implementation: 'Implement request batching system',
      });
      
      potentialSavings += savings;
    }

    const optimizationScore = this.calculateOptimizationScore(recommendations, potentialSavings);

    return {
      recommendations: recommendations.sort((a, b) => b.potentialSaving - a.potentialSaving),
      potentialSavings,
      optimizationScore,
    };
  }

  private getDailyUsage(provider?: string, model?: string): number {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    
    return this.usageRecords
      .filter(record => {
        const matchesTime = record.timestamp >= startOfDay.getTime();
        const matchesProvider = !provider || record.provider === provider;
        const matchesModel = !model || record.model === model;
        return matchesTime && matchesProvider && matchesModel;
      })
      .reduce((sum, record) => sum + record.cost, 0);
  }

  private getMonthlyUsage(provider?: string, model?: string): number {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    return this.usageRecords
      .filter(record => {
        const matchesTime = record.timestamp >= startOfMonth.getTime();
        const matchesProvider = !provider || record.provider === provider;
        const matchesModel = !model || record.model === model;
        return matchesTime && matchesProvider && matchesModel;
      })
      .reduce((sum, record) => sum + record.cost, 0);
  }

  private getFilteredRecords(timeframe: string, provider?: string): UsageRecord[] {
    const now = Date.now();
    let cutoff = 0;
    
    switch (timeframe) {
      case 'daily':
        cutoff = now - 24 * 60 * 60 * 1000;
        break;
      case 'weekly':
        cutoff = now - 7 * 24 * 60 * 60 * 1000;
        break;
      case 'monthly':
        cutoff = now - 30 * 24 * 60 * 60 * 1000;
        break;
      case 'all':
      default:
        cutoff = 0;
        break;
    }
    
    return this.usageRecords.filter(record => {
      const matchesTime = record.timestamp >= cutoff;
      const matchesProvider = !provider || record.provider === provider;
      return matchesTime && matchesProvider;
    });
  }

  private calculateProviderBreakdown(records: UsageRecord[]): Record<string, number> {
    return records.reduce((acc, record) => {
      acc[record.provider] = (acc[record.provider] || 0) + record.cost;
      return acc;
    }, {} as Record<string, number>);
  }

  private calculateModelBreakdown(records: UsageRecord[]): Record<string, number> {
    return records.reduce((acc, record) => {
      acc[record.model] = (acc[record.model] || 0) + record.cost;
      return acc;
    }, {} as Record<string, number>);
  }

  private calculateOperationBreakdown(records: UsageRecord[]): Record<string, number> {
    return records.reduce((acc, record) => {
      acc[record.operationType] = (acc[record.operationType] || 0) + record.cost;
      return acc;
    }, {} as Record<string, number>);
  }

  private calculateCheaperModelCost(record: UsageRecord): number {
    // Estimate cost if using GPT-3.5 instead of GPT-4
    const gpt35Config = this.costConfigs.get('openai-gpt-3.5-turbo');
    if (!gpt35Config) return record.cost;
    
    const inputCost = (record.inputTokens / 1000) * gpt35Config.inputCostPer1000;
    const outputCost = (record.outputTokens / 1000) * gpt35Config.outputCostPer1000;
    
    return inputCost + outputCost;
  }

  private getInputCostPerToken(provider: string, model: string): number {
    const configKey = `${provider}-${model.replace(/[^a-z0-9-]/gi, '-')}`;
    const config = this.costConfigs.get(configKey);
    return config ? config.inputCostPer1000 / 1000 : 0;
  }

  private findDuplicateOperations(records: UsageRecord[]): Array<{ potentialSaving: number }> {
    // Simplified duplicate detection
    const operations = new Map<string, UsageRecord[]>();
    
    records.forEach(record => {
      const key = `${record.operationType}-${record.inputTokens}`;
      if (!operations.has(key)) {
        operations.set(key, []);
      }
      operations.get(key)!.push(record);
    });
    
    return Array.from(operations.values())
      .filter(ops => ops.length > 1)
      .map(ops => ({
        potentialSaving: ops.slice(1).reduce((sum, record) => sum + record.cost, 0),
      }));
  }

  private findBatchableOperations(records: UsageRecord[]): Array<{ potentialSaving: number }> {
    // Simplified batch detection
    const batchableTypes = ['accessibility_scan', 'image_analysis', 'content_review'];
    
    return batchableTypes.map(type => {
      const typeRecords = records.filter(record => record.operationType === type);
      const potentialSaving = typeRecords.length > 5 ? 
        typeRecords.reduce((sum, record) => sum + record.cost * 0.15, 0) : 0;
      
      return { potentialSaving };
    }).filter(op => op.potentialSaving > 0);
  }

  private calculateOptimizationScore(
    recommendations: CostRecommendation[],
    potentialSavings: number
  ): number {
    const currentMonthlyCost = this.getMonthlyUsage();
    if (currentMonthlyCost === 0) return 100;
    
    const savingsPercentage = (potentialSavings / currentMonthlyCost) * 100;
    const implementationDifficulty = recommendations.reduce((acc, rec) => {
      const difficultyScore = rec.difficulty === 'easy' ? 1 : rec.difficulty === 'medium' ? 2 : 3;
      return acc + difficultyScore;
    }, 0) / recommendations.length;
    
    // Score from 0-100, higher is better
    return Math.min(100, savingsPercentage * 2 - implementationDifficulty * 5);
  }

  updateBudget(provider: string, model: string, dailyBudget: number, monthlyBudget: number): void {
    const configKey = `${provider}-${model.replace(/[^a-z0-9-]/gi, '-')}`;
    const config = this.costConfigs.get(configKey);
    
    if (config) {
      config.dailyBudget = dailyBudget;
      config.monthlyBudget = monthlyBudget;
      this.costConfigs.set(configKey, config);
    }
  }

  getRecentAlerts(hours: number = 24): BudgetAlert[] {
    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    return this.budgetAlerts.filter(alert => alert.timestamp >= cutoff);
  }

  private startPeriodicFlush(): void {
    setInterval(async () => {
      try {
        await this.flush();
      } catch (error) {
        this.logger.error('Periodic flush failed', { error });
      }
    }, this.flushInterval);
  }

  async flush(): Promise<void> {
    // In a real implementation, this would save to database
    this.logger.info(`Flushing ${this.usageRecords.length} usage records`);
    
    // Keep only recent records in memory (last 7 days)
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    this.usageRecords = this.usageRecords.filter(record => record.timestamp >= cutoff);
    
    // Keep only recent alerts (last 30 days)
    const alertCutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    this.budgetAlerts = this.budgetAlerts.filter(alert => alert.timestamp >= alertCutoff);
    
    this.lastFlush = Date.now();
    
    // Flush metrics
    await this.metrics.flush();
  }

  async shutdown(): Promise<void> {
    await this.flush();
  }
}