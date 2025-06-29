import winston from 'winston';
import { EventEmitter } from 'events';

interface LogContext {
  userId?: string;
  requestId?: string;
  sessionId?: string;
  organizationId?: string;
  operationId?: string;
  traceId?: string;
  spanId?: string;
  correlationId?: string;
  component?: string;
  service?: string;
  [key: string]: any;
}

interface LogEntry {
  level: string;
  message: string;
  timestamp: string;
  context: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

interface LoggerConfig {
  level: string;
  service: string;
  environment: string;
  enableConsole: boolean;
  enableFile: boolean;
  enableJson: boolean;
  filePath?: string;
  maxFiles?: number;
  maxSize?: string;
  sensitiveFields: string[];
}

export class Logger extends EventEmitter {
  private winston: winston.Logger;
  private config: LoggerConfig;
  private context: LogContext = {};
  private sensitiveFieldRegex: RegExp;

  constructor(component?: string, config?: Partial<LoggerConfig>) {
    super();
    
    this.config = {
      level: process.env.LOG_LEVEL || 'info',
      service: process.env.SERVICE_NAME || 'accessibility-scanner',
      environment: process.env.NODE_ENV || 'development',
      enableConsole: process.env.LOG_CONSOLE !== 'false',
      enableFile: process.env.LOG_FILE === 'true',
      enableJson: process.env.LOG_JSON === 'true',
      filePath: process.env.LOG_FILE_PATH || './logs/app.log',
      maxFiles: parseInt(process.env.LOG_MAX_FILES || '5'),
      maxSize: process.env.LOG_MAX_SIZE || '10m',
      sensitiveFields: [
        'password',
        'token',
        'secret',
        'key',
        'authorization',
        'cookie',
        'credit_card',
        'ssn',
        'email',
        'phone',
      ],
      ...config,
    };

    if (component) {
      this.context.component = component;
    }

    this.sensitiveFieldRegex = new RegExp(
      `\\b(${this.config.sensitiveFields.join('|')})\\b`,
      'i'
    );

    this.winston = this.createWinstonLogger();
  }

  private createWinstonLogger(): winston.Logger {
    const formats: winston.Logform.Format[] = [
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      winston.format.errors({ stack: true }),
      winston.format.printf(this.createFormatter()),
    ];

    if (this.config.enableJson) {
      formats.push(winston.format.json());
    }

    const transports: winston.transport[] = [];

    // Console transport
    if (this.config.enableConsole) {
      transports.push(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize({ all: true }),
            ...formats
          ),
        })
      );
    }

    // File transport
    if (this.config.enableFile) {
      transports.push(
        new winston.transports.File({
          filename: this.config.filePath,
          maxFiles: this.config.maxFiles,
          maxsize: this.parseSize(this.config.maxSize!),
          format: winston.format.combine(...formats),
        })
      );

      // Separate error log file
      transports.push(
        new winston.transports.File({
          filename: this.config.filePath!.replace('.log', '.error.log'),
          level: 'error',
          maxFiles: this.config.maxFiles,
          maxsize: this.parseSize(this.config.maxSize!),
          format: winston.format.combine(...formats),
        })
      );
    }

    return winston.createLogger({
      level: this.config.level,
      defaultMeta: {
        service: this.config.service,
        environment: this.config.environment,
      },
      transports,
      exitOnError: false,
    });
  }

  private createFormatter(): winston.Logform.FormatWrap {
    return winston.format.printf((info) => {
      const logEntry: LogEntry = {
        level: info.level,
        message: info.message,
        timestamp: info.timestamp,
        context: this.sanitizeContext({ ...this.context, ...info }),
      };

      if (info.error) {
        logEntry.error = {
          name: info.error.name,
          message: info.error.message,
          stack: info.error.stack,
        };
      }

      if (this.config.enableJson) {
        return JSON.stringify(logEntry);
      }

      // Human-readable format
      const contextStr = Object.keys(logEntry.context).length > 0 
        ? ` ${JSON.stringify(logEntry.context)}`
        : '';
      
      const errorStr = logEntry.error 
        ? ` ERROR: ${logEntry.error.message}${logEntry.error.stack ? '\n' + logEntry.error.stack : ''}`
        : '';

      return `${logEntry.timestamp} [${logEntry.level.toUpperCase()}] ${logEntry.message}${contextStr}${errorStr}`;
    });
  }

  private sanitizeContext(context: LogContext): LogContext {
    const sanitized: LogContext = {};
    
    for (const [key, value] of Object.entries(context)) {
      if (this.isSensitiveField(key)) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'string' && this.containsSensitiveData(value)) {
        sanitized[key] = this.redactSensitiveData(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }

  private sanitizeObject(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(item => 
        typeof item === 'object' ? this.sanitizeObject(item) : item
      );
    }
    
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (this.isSensitiveField(key)) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }

  private isSensitiveField(field: string): boolean {
    return this.sensitiveFieldRegex.test(field);
  }

  private containsSensitiveData(text: string): boolean {
    // Check for common patterns
    const patterns = [
      /\b[A-Za-z0-9]{20,}\b/, // Long tokens
      /sk-[A-Za-z0-9]{32,}/, // OpenAI API keys
      /ghp_[A-Za-z0-9]{36}/, // GitHub personal access tokens
      /Bearer\s+[A-Za-z0-9-._~+/]+=*/, // Bearer tokens
      /Basic\s+[A-Za-z0-9+/]+=*/, // Basic auth
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email addresses
      /\b\d{3}-?\d{2}-?\d{4}\b/, // SSN
      /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/, // Credit card numbers
    ];
    
    return patterns.some(pattern => pattern.test(text));
  }

  private redactSensitiveData(text: string): string {
    return text
      .replace(/\b[A-Za-z0-9]{20,}\b/g, '[TOKEN_REDACTED]')
      .replace(/sk-[A-Za-z0-9]{32,}/g, '[API_KEY_REDACTED]')
      .replace(/ghp_[A-Za-z0-9]{36}/g, '[GITHUB_TOKEN_REDACTED]')
      .replace(/Bearer\s+[A-Za-z0-9-._~+/]+=*/g, 'Bearer [REDACTED]')
      .replace(/Basic\s+[A-Za-z0-9+/]+=*/g, 'Basic [REDACTED]')
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL_REDACTED]')
      .replace(/\b\d{3}-?\d{2}-?\d{4}\b/g, '[SSN_REDACTED]')
      .replace(/\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g, '[CARD_REDACTED]');
  }

  private parseSize(size: string): number {
    const match = size.match(/^(\d+)([kmg]?)$/i);
    if (!match) return 10 * 1024 * 1024; // 10MB default
    
    const value = parseInt(match[1]);
    const unit = match[2]?.toLowerCase() || '';
    
    switch (unit) {
      case 'k': return value * 1024;
      case 'm': return value * 1024 * 1024;
      case 'g': return value * 1024 * 1024 * 1024;
      default: return value;
    }
  }

  // Context management
  setContext(context: LogContext): void {
    this.context = { ...this.context, ...context };
  }

  addContext(key: string, value: any): void {
    this.context[key] = value;
  }

  removeContext(key: string): void {
    delete this.context[key];
  }

  clearContext(): void {
    this.context = {};
  }

  withContext(context: LogContext): Logger {
    const newLogger = new Logger(this.context.component, this.config);
    newLogger.setContext({ ...this.context, ...context });
    return newLogger;
  }

  // Logging methods
  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  error(message: string, context?: LogContext | Error): void {
    if (context instanceof Error) {
      this.log('error', message, { error: context });
    } else {
      this.log('error', message, context);
    }
  }

  fatal(message: string, context?: LogContext | Error): void {
    if (context instanceof Error) {
      this.log('error', message, { error: context });
    } else {
      this.log('error', message, context);
    }
    
    // Emit fatal event for alerting
    this.emit('fatal', { message, context });
  }

  private log(level: string, message: string, context?: LogContext): void {
    const logContext = { ...context };
    
    // Add trace context if available
    const traceContext = this.getTraceContext();
    if (traceContext) {
      Object.assign(logContext, traceContext);
    }

    this.winston.log(level, message, logContext);
    
    // Emit log event for real-time monitoring
    this.emit('log', {
      level,
      message,
      context: logContext,
      timestamp: new Date().toISOString(),
    });

    // Emit specific events for critical logs
    if (level === 'error' || level === 'fatal') {
      this.emit('error_log', {
        level,
        message,
        context: logContext,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Structured logging methods
  logHTTPRequest(req: any, res: any, duration?: number): void {
    const context: LogContext = {
      method: req.method,
      url: req.url,
      status_code: res.statusCode,
      user_agent: req.get('user-agent'),
      ip: req.ip || req.connection?.remoteAddress,
      duration_ms: duration,
      request_id: req.id,
      user_id: req.user?.id,
    };

    const level = res.statusCode >= 400 ? 'warn' : 'info';
    this.log(level, `HTTP ${req.method} ${req.url}`, context);
  }

  logDatabaseQuery(query: string, duration: number, result?: any): void {
    this.debug('Database query executed', {
      query: query.substring(0, 200), // Truncate long queries
      duration_ms: duration,
      rows_affected: result?.rowsAffected || result?.length,
    });
  }

  logExternalAPICall(service: string, endpoint: string, method: string, duration: number, status?: number): void {
    const context: LogContext = {
      service,
      endpoint,
      method,
      duration_ms: duration,
      status_code: status,
    };

    const level = status && status >= 400 ? 'warn' : 'info';
    this.log(level, `External API call to ${service}`, context);
  }

  logSecurityEvent(event: string, context?: LogContext): void {
    this.warn(`Security event: ${event}`, {
      ...context,
      security_event: true,
      event_type: event,
    });
    
    // Emit security event for alerting
    this.emit('security_event', { event, context });
  }

  logBusinessEvent(event: string, context?: LogContext): void {
    this.info(`Business event: ${event}`, {
      ...context,
      business_event: true,
      event_type: event,
    });
  }

  logPerformanceMetric(metric: string, value: number, unit: string, context?: LogContext): void {
    this.info(`Performance metric: ${metric}`, {
      ...context,
      metric_name: metric,
      metric_value: value,
      metric_unit: unit,
      performance_metric: true,
    });
  }

  // Utility methods
  private getTraceContext(): LogContext | null {
    // In a real implementation, this would extract trace context from OpenTelemetry
    try {
      const traceId = process.env.TRACE_ID; // Example
      const spanId = process.env.SPAN_ID;   // Example
      
      if (traceId || spanId) {
        return { traceId, spanId };
      }
    } catch (error) {
      // Ignore trace context errors
    }
    
    return null;
  }

  // Batch logging for high-volume scenarios
  private batchBuffer: LogEntry[] = [];
  private batchTimeout: NodeJS.Timeout | null = null;

  logBatch(entries: Array<{ level: string; message: string; context?: LogContext }>): void {
    entries.forEach(entry => {
      this.batchBuffer.push({
        level: entry.level,
        message: entry.message,
        timestamp: new Date().toISOString(),
        context: this.sanitizeContext({ ...this.context, ...entry.context }),
      });
    });

    if (this.batchBuffer.length >= 100) {
      this.flushBatch();
    } else if (!this.batchTimeout) {
      this.batchTimeout = setTimeout(() => this.flushBatch(), 5000);
    }
  }

  private flushBatch(): void {
    if (this.batchBuffer.length === 0) return;

    const entries = [...this.batchBuffer];
    this.batchBuffer = [];
    
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    // Log all entries
    entries.forEach(entry => {
      this.winston.log(entry.level, entry.message, entry.context);
    });

    this.emit('batch_flushed', { count: entries.length });
  }

  // Configuration methods
  setLevel(level: string): void {
    this.config.level = level;
    this.winston.level = level;
  }

  getLevel(): string {
    return this.config.level;
  }

  enableFileLogging(filePath?: string): void {
    this.config.enableFile = true;
    if (filePath) {
      this.config.filePath = filePath;
    }
    // Recreate logger with file transport
    this.winston = this.createWinstonLogger();
  }

  disableFileLogging(): void {
    this.config.enableFile = false;
    this.winston = this.createWinstonLogger();
  }

  // Stream interface for request logging
  write(message: string): void {
    this.info(message.trim());
  }

  // Cleanup
  async close(): Promise<void> {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }
    
    this.flushBatch();
    
    return new Promise<void>((resolve) => {
      this.winston.end(() => {
        this.removeAllListeners();
        resolve();
      });
    });
  }
}

// Global logger instance
let globalLogger: Logger | null = null;

export function createLogger(component?: string, config?: Partial<LoggerConfig>): Logger {
  return new Logger(component, config);
}

export function getGlobalLogger(): Logger {
  if (!globalLogger) {
    globalLogger = new Logger('global');
  }
  return globalLogger;
}

export function setGlobalLogger(logger: Logger): void {
  globalLogger = logger;
}

// Backward compatibility
export const logger = getGlobalLogger();