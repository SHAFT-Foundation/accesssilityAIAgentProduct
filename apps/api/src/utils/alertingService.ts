import { Logger } from './logger';
import { MetricsCollector } from './metrics';
import { EventEmitter } from 'events';

interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  source: string;
  timestamp: number;
  metadata: Record<string, any>;
  status: AlertStatus;
  resolvedAt?: number;
  acknowledgedAt?: number;
  acknowledgedBy?: string;
}

interface AlertRule {
  id: string;
  name: string;
  condition: AlertCondition;
  severity: AlertSeverity;
  enabled: boolean;
  cooldownMs: number;
  destinations: AlertDestination[];
  tags: string[];
}

interface AlertCondition {
  type: 'threshold' | 'anomaly' | 'pattern' | 'custom';
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'ne' | 'gte' | 'lte';
  value: number;
  duration?: number;
  customCheck?: (data: any) => boolean;
}

interface AlertDestination {
  type: 'email' | 'slack' | 'webhook' | 'pagerduty' | 'log';
  config: Record<string, any>;
  enabled: boolean;
}

type AlertType = 'system' | 'security' | 'performance' | 'business' | 'custom';
type AlertSeverity = 'critical' | 'warning' | 'info';
type AlertStatus = 'active' | 'resolved' | 'acknowledged' | 'suppressed';

export class AlertingService extends EventEmitter {
  private logger: Logger;
  private metrics: MetricsCollector;
  private alerts: Map<string, Alert> = new Map();
  private rules: Map<string, AlertRule> = new Map();
  private cooldowns: Map<string, number> = new Map();
  private suppressions: Map<string, number> = new Map();
  private channels: Map<string, AlertChannel> = new Map();

  constructor() {
    super();
    this.logger = new Logger('AlertingService');
    this.metrics = new MetricsCollector('alerting');
    
    this.initializeDefaultRules();
    this.initializeChannels();
    this.startPeriodicCleanup();
  }

  private initializeDefaultRules(): void {
    // System health alerts
    this.addRule({
      id: 'high-memory-usage',
      name: 'High Memory Usage',
      condition: {
        type: 'threshold',
        metric: 'memory.usage_percent',
        operator: 'gt',
        value: 85,
        duration: 300000, // 5 minutes
      },
      severity: 'warning',
      enabled: true,
      cooldownMs: 900000, // 15 minutes
      destinations: [
        { type: 'slack', config: { channel: '#alerts' }, enabled: true },
        { type: 'log', config: {}, enabled: true },
      ],
      tags: ['system', 'memory'],
    });

    this.addRule({
      id: 'critical-memory-usage',
      name: 'Critical Memory Usage',
      condition: {
        type: 'threshold',
        metric: 'memory.usage_percent',
        operator: 'gt',
        value: 95,
      },
      severity: 'critical',
      enabled: true,
      cooldownMs: 300000, // 5 minutes
      destinations: [
        { type: 'pagerduty', config: { service_key: process.env.PAGERDUTY_SERVICE_KEY }, enabled: true },
        { type: 'slack', config: { channel: '#critical-alerts' }, enabled: true },
        { type: 'email', config: { recipients: ['ops@company.com'] }, enabled: true },
      ],
      tags: ['system', 'memory', 'critical'],
    });

    // Error rate alerts
    this.addRule({
      id: 'high-error-rate',
      name: 'High Error Rate',
      condition: {
        type: 'threshold',
        metric: 'http.error_rate',
        operator: 'gt',
        value: 5,
        duration: 180000, // 3 minutes
      },
      severity: 'warning',
      enabled: true,
      cooldownMs: 600000, // 10 minutes
      destinations: [
        { type: 'slack', config: { channel: '#alerts' }, enabled: true },
      ],
      tags: ['performance', 'errors'],
    });

    // AI service alerts
    this.addRule({
      id: 'ai-service-failure',
      name: 'AI Service High Failure Rate',
      condition: {
        type: 'threshold',
        metric: 'ai.failure_rate',
        operator: 'gt',
        value: 20,
        duration: 300000, // 5 minutes
      },
      severity: 'critical',
      enabled: true,
      cooldownMs: 600000, // 10 minutes
      destinations: [
        { type: 'slack', config: { channel: '#ai-alerts' }, enabled: true },
        { type: 'webhook', config: { url: process.env.AI_ALERT_WEBHOOK }, enabled: true },
      ],
      tags: ['ai', 'external'],
    });

    // Security alerts
    this.addRule({
      id: 'security-breach-attempt',
      name: 'Security Breach Attempt',
      condition: {
        type: 'custom',
        metric: 'security.breach_attempts',
        operator: 'gt',
        value: 0,
        customCheck: (data) => this.detectSecurityBreach(data),
      },
      severity: 'critical',
      enabled: true,
      cooldownMs: 0, // No cooldown for security alerts
      destinations: [
        { type: 'pagerduty', config: { service_key: process.env.SECURITY_PAGERDUTY_KEY }, enabled: true },
        { type: 'email', config: { recipients: ['security@company.com'] }, enabled: true },
        { type: 'slack', config: { channel: '#security-alerts' }, enabled: true },
      ],
      tags: ['security', 'breach'],
    });

    // Business logic alerts
    this.addRule({
      id: 'scan-queue-backlog',
      name: 'Scan Queue Backlog',
      condition: {
        type: 'threshold',
        metric: 'queue.depth',
        operator: 'gt',
        value: 1000,
        duration: 600000, // 10 minutes
      },
      severity: 'warning',
      enabled: true,
      cooldownMs: 1800000, // 30 minutes
      destinations: [
        { type: 'slack', config: { channel: '#operations' }, enabled: true },
      ],
      tags: ['business', 'queue'],
    });
  }

  private initializeChannels(): void {
    // Slack channel
    this.channels.set('slack', new SlackChannel({
      webhook_url: process.env.SLACK_WEBHOOK_URL,
      bot_token: process.env.SLACK_BOT_TOKEN,
    }));

    // Email channel
    this.channels.set('email', new EmailChannel({
      smtp_host: process.env.SMTP_HOST,
      smtp_port: parseInt(process.env.SMTP_PORT || '587'),
      smtp_user: process.env.SMTP_USER,
      smtp_pass: process.env.SMTP_PASS,
      from: process.env.ALERT_FROM_EMAIL,
    }));

    // PagerDuty channel
    this.channels.set('pagerduty', new PagerDutyChannel({
      integration_key: process.env.PAGERDUTY_INTEGRATION_KEY,
    }));

    // Webhook channel
    this.channels.set('webhook', new WebhookChannel({}));

    // Log channel
    this.channels.set('log', new LogChannel(this.logger));
  }

  addRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule);
    this.logger.info(`Added alert rule: ${rule.name}`, {
      id: rule.id,
      severity: rule.severity,
      enabled: rule.enabled,
    });
  }

  removeRule(ruleId: string): void {
    this.rules.delete(ruleId);
    this.logger.info(`Removed alert rule: ${ruleId}`);
  }

  updateRule(ruleId: string, updates: Partial<AlertRule>): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      Object.assign(rule, updates);
      this.logger.info(`Updated alert rule: ${ruleId}`, { updates });
    }
  }

  async checkConditions(metrics: Record<string, number>): Promise<void> {
    for (const [ruleId, rule] of this.rules.entries()) {
      if (!rule.enabled) continue;

      // Check cooldown
      if (this.isInCooldown(ruleId)) continue;

      try {
        const shouldAlert = await this.evaluateCondition(rule.condition, metrics);
        
        if (shouldAlert) {
          await this.triggerAlert(rule, metrics);
        }
      } catch (error) {
        this.logger.error(`Error evaluating alert rule: ${ruleId}`, { error });
      }
    }
  }

  private async evaluateCondition(condition: AlertCondition, metrics: Record<string, number>): Promise<boolean> {
    const metricValue = metrics[condition.metric];
    
    if (metricValue === undefined) {
      return false;
    }

    // Handle custom conditions
    if (condition.type === 'custom' && condition.customCheck) {
      return condition.customCheck(metrics);
    }

    // Evaluate threshold condition
    let result = false;
    switch (condition.operator) {
      case 'gt':
        result = metricValue > condition.value;
        break;
      case 'gte':
        result = metricValue >= condition.value;
        break;
      case 'lt':
        result = metricValue < condition.value;
        break;
      case 'lte':
        result = metricValue <= condition.value;
        break;
      case 'eq':
        result = metricValue === condition.value;
        break;
      case 'ne':
        result = metricValue !== condition.value;
        break;
    }

    // For duration-based conditions, track how long condition has been true
    if (condition.duration && result) {
      const key = `${condition.metric}_duration`;
      const startTime = this.suppressions.get(key) || Date.now();
      this.suppressions.set(key, startTime);
      
      return (Date.now() - startTime) >= condition.duration;
    }

    // Clear duration tracking if condition is false
    if (!result && condition.duration) {
      this.suppressions.delete(`${condition.metric}_duration`);
    }

    return result;
  }

  private async triggerAlert(rule: AlertRule, metrics: Record<string, number>): Promise<void> {
    const alert: Alert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: this.inferAlertType(rule),
      severity: rule.severity,
      title: rule.name,
      description: this.generateAlertDescription(rule, metrics),
      source: 'alerting-service',
      timestamp: Date.now(),
      metadata: {
        rule_id: rule.id,
        metrics,
        tags: rule.tags,
      },
      status: 'active',
    };

    this.alerts.set(alert.id, alert);
    
    this.logger.warn(`Alert triggered: ${alert.title}`, {
      id: alert.id,
      severity: alert.severity,
      rule_id: rule.id,
    });

    // Record metrics
    this.metrics.recordAlert(alert.severity, rule.id);

    // Emit event
    this.emit('alert:triggered', alert);

    // Send notifications
    await this.sendNotifications(alert, rule.destinations);

    // Set cooldown
    this.setCooldown(rule.id, rule.cooldownMs);
  }

  private async sendNotifications(alert: Alert, destinations: AlertDestination[]): Promise<void> {
    const promises = destinations
      .filter(dest => dest.enabled)
      .map(async destination => {
        try {
          const channel = this.channels.get(destination.type);
          if (channel) {
            await channel.send(alert, destination.config);
            this.logger.debug(`Alert sent via ${destination.type}`, { alert_id: alert.id });
          } else {
            this.logger.warn(`Alert channel not found: ${destination.type}`);
          }
        } catch (error) {
          this.logger.error(`Failed to send alert via ${destination.type}`, {
            alert_id: alert.id,
            error,
          });
        }
      });

    await Promise.allSettled(promises);
  }

  private generateAlertDescription(rule: AlertRule, metrics: Record<string, number>): string {
    const condition = rule.condition;
    const value = metrics[condition.metric];
    
    return `${condition.metric} is ${value} (threshold: ${condition.operator} ${condition.value})`;
  }

  private inferAlertType(rule: AlertRule): AlertType {
    if (rule.tags.includes('security')) return 'security';
    if (rule.tags.includes('system')) return 'system';
    if (rule.tags.includes('performance')) return 'performance';
    if (rule.tags.includes('business')) return 'business';
    return 'custom';
  }

  private detectSecurityBreach(data: any): boolean {
    // Custom security breach detection logic
    const suspiciousPatterns = [
      'sql injection',
      'xss attempt',
      'unauthorized access',
      'brute force',
    ];
    
    const logMessage = data.message?.toLowerCase() || '';
    return suspiciousPatterns.some(pattern => logMessage.includes(pattern));
  }

  private isInCooldown(ruleId: string): boolean {
    const cooldownEnd = this.cooldowns.get(ruleId);
    return cooldownEnd ? Date.now() < cooldownEnd : false;
  }

  private setCooldown(ruleId: string, cooldownMs: number): void {
    if (cooldownMs > 0) {
      this.cooldowns.set(ruleId, Date.now() + cooldownMs);
    }
  }

  // Alert management methods
  acknowledgeAlert(alertId: string, userId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (alert && alert.status === 'active') {
      alert.status = 'acknowledged';
      alert.acknowledgedAt = Date.now();
      alert.acknowledgedBy = userId;
      
      this.logger.info(`Alert acknowledged: ${alertId}`, { userId });
      this.emit('alert:acknowledged', alert);
      
      return true;
    }
    return false;
  }

  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (alert && alert.status !== 'resolved') {
      alert.status = 'resolved';
      alert.resolvedAt = Date.now();
      
      this.logger.info(`Alert resolved: ${alertId}`);
      this.emit('alert:resolved', alert);
      
      return true;
    }
    return false;
  }

  suppressAlert(alertId: string, durationMs: number): boolean {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.status = 'suppressed';
      this.suppressions.set(alertId, Date.now() + durationMs);
      
      this.logger.info(`Alert suppressed: ${alertId}`, { durationMs });
      this.emit('alert:suppressed', alert);
      
      return true;
    }
    return false;
  }

  // Query methods
  getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values()).filter(alert => alert.status === 'active');
  }

  getAlertHistory(hours: number = 24): Alert[] {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    return Array.from(this.alerts.values()).filter(alert => alert.timestamp >= cutoff);
  }

  getAlertsByRule(ruleId: string): Alert[] {
    return Array.from(this.alerts.values()).filter(
      alert => alert.metadata.rule_id === ruleId
    );
  }

  getAlertsBySeverity(severity: AlertSeverity): Alert[] {
    return Array.from(this.alerts.values()).filter(alert => alert.severity === severity);
  }

  // Statistics
  getAlertStatistics(hours: number = 24): Record<string, any> {
    const alerts = this.getAlertHistory(hours);
    
    const bySeverity = alerts.reduce((acc, alert) => {
      acc[alert.severity] = (acc[alert.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byType = alerts.reduce((acc, alert) => {
      acc[alert.type] = (acc[alert.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byStatus = alerts.reduce((acc, alert) => {
      acc[alert.status] = (acc[alert.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: alerts.length,
      active: alerts.filter(a => a.status === 'active').length,
      bySeverity,
      byType,
      byStatus,
      topRules: this.getTopAlertingRules(alerts, 5),
    };
  }

  private getTopAlertingRules(alerts: Alert[], limit: number): Array<{ rule_id: string; count: number }> {
    const ruleCounts = alerts.reduce((acc, alert) => {
      const ruleId = alert.metadata.rule_id;
      acc[ruleId] = (acc[ruleId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(ruleCounts)
      .map(([rule_id, count]) => ({ rule_id, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  // Maintenance
  private startPeriodicCleanup(): void {
    setInterval(() => {
      this.cleanupOldAlerts();
      this.cleanupExpiredSuppressions();
      this.cleanupExpiredCooldowns();
    }, 300000); // Every 5 minutes
  }

  private cleanupOldAlerts(): void {
    const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days
    
    for (const [alertId, alert] of this.alerts.entries()) {
      if (alert.timestamp < cutoff && alert.status === 'resolved') {
        this.alerts.delete(alertId);
      }
    }
  }

  private cleanupExpiredSuppressions(): void {
    const now = Date.now();
    
    for (const [key, expiry] of this.suppressions.entries()) {
      if (now >= expiry) {
        this.suppressions.delete(key);
      }
    }
  }

  private cleanupExpiredCooldowns(): void {
    const now = Date.now();
    
    for (const [ruleId, expiry] of this.cooldowns.entries()) {
      if (now >= expiry) {
        this.cooldowns.delete(ruleId);
      }
    }
  }

  // Configuration
  enableRule(ruleId: string): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = true;
      this.logger.info(`Enabled alert rule: ${ruleId}`);
    }
  }

  disableRule(ruleId: string): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = false;
      this.logger.info(`Disabled alert rule: ${ruleId}`);
    }
  }

  getRules(): AlertRule[] {
    return Array.from(this.rules.values());
  }

  getStatus(): Record<string, any> {
    return {
      rules: {
        total: this.rules.size,
        enabled: Array.from(this.rules.values()).filter(r => r.enabled).length,
      },
      alerts: {
        total: this.alerts.size,
        active: this.getActiveAlerts().length,
      },
      cooldowns: this.cooldowns.size,
      suppressions: this.suppressions.size,
      channels: Array.from(this.channels.keys()),
    };
  }

  async shutdown(): Promise<void> {
    await this.metrics.flush();
    this.removeAllListeners();
  }
}

// Alert channel implementations
abstract class AlertChannel {
  abstract send(alert: Alert, config: Record<string, any>): Promise<void>;
}

class SlackChannel extends AlertChannel {
  constructor(private config: any) {
    super();
  }

  async send(alert: Alert, config: Record<string, any>): Promise<void> {
    // Implementation would use Slack API or webhook
    const message = this.formatSlackMessage(alert);
    console.log(`[SLACK] ${config.channel}: ${message}`);
  }

  private formatSlackMessage(alert: Alert): string {
    const emoji = alert.severity === 'critical' ? '🚨' : alert.severity === 'warning' ? '⚠️' : 'ℹ️';
    return `${emoji} *${alert.title}*\n${alert.description}\nSeverity: ${alert.severity}`;
  }
}

class EmailChannel extends AlertChannel {
  constructor(private config: any) {
    super();
  }

  async send(alert: Alert, config: Record<string, any>): Promise<void> {
    // Implementation would use nodemailer or similar
    const subject = `[${alert.severity.toUpperCase()}] ${alert.title}`;
    const body = this.formatEmailBody(alert);
    console.log(`[EMAIL] To: ${config.recipients?.join(', ')}\nSubject: ${subject}\nBody: ${body}`);
  }

  private formatEmailBody(alert: Alert): string {
    return `
Alert: ${alert.title}
Severity: ${alert.severity}
Time: ${new Date(alert.timestamp).toISOString()}
Description: ${alert.description}

Metadata: ${JSON.stringify(alert.metadata, null, 2)}
    `.trim();
  }
}

class PagerDutyChannel extends AlertChannel {
  constructor(private config: any) {
    super();
  }

  async send(alert: Alert, config: Record<string, any>): Promise<void> {
    // Implementation would use PagerDuty Events API
    const payload = {
      routing_key: config.service_key,
      event_action: 'trigger',
      dedup_key: alert.id,
      payload: {
        summary: alert.title,
        severity: alert.severity,
        source: alert.source,
        custom_details: alert.metadata,
      },
    };
    console.log(`[PAGERDUTY] ${JSON.stringify(payload)}`);
  }
}

class WebhookChannel extends AlertChannel {
  async send(alert: Alert, config: Record<string, any>): Promise<void> {
    // Implementation would make HTTP POST request
    const payload = {
      alert_id: alert.id,
      title: alert.title,
      severity: alert.severity,
      description: alert.description,
      timestamp: alert.timestamp,
      metadata: alert.metadata,
    };
    console.log(`[WEBHOOK] ${config.url}: ${JSON.stringify(payload)}`);
  }
}

class LogChannel extends AlertChannel {
  constructor(private logger: Logger) {
    super();
  }

  async send(alert: Alert, config: Record<string, any>): Promise<void> {
    this.logger.warn(`ALERT: ${alert.title}`, {
      id: alert.id,
      severity: alert.severity,
      description: alert.description,
      metadata: alert.metadata,
    });
  }
}