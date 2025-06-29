import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { OTLPTraceExporter } from '@opentelemetry/exporter-otlp-http';
import { BatchSpanProcessor, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { trace, context, SpanStatusCode, SpanKind } from '@opentelemetry/api';
import { Logger } from '../utils/logger';

interface TelemetryConfig {
  serviceName: string;
  serviceVersion: string;
  environment: string;
  jaegerEndpoint?: string;
  otlpEndpoint?: string;
  sampleRate: number;
  enabledInstrumentations: string[];
}

interface SpanContext {
  operationName: string;
  tags?: Record<string, string | number | boolean>;
  kind?: SpanKind;
  parentSpan?: any;
}

interface TraceMetadata {
  userId?: string;
  organizationId?: string;
  sessionId?: string;
  requestId?: string;
  correlationId?: string;
}

export class TelemetryService {
  private sdk: NodeSDK | null = null;
  private tracer: any;
  private logger: Logger;
  private config: TelemetryConfig;
  private initialized: boolean = false;

  constructor(config?: Partial<TelemetryConfig>) {
    this.logger = new Logger('TelemetryService');
    
    this.config = {
      serviceName: process.env.SERVICE_NAME || 'accessibility-scanner-api',
      serviceVersion: process.env.SERVICE_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      jaegerEndpoint: process.env.JAEGER_ENDPOINT,
      otlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
      sampleRate: parseFloat(process.env.OTEL_TRACE_SAMPLE_RATE || '1.0'),
      enabledInstrumentations: [
        'http',
        'https',
        'express',
        'fs',
        'dns',
        'net',
        'redis',
        'pg',
        'mysql',
        'mongodb',
      ],
      ...config,
    };
  }

  initialize(): void {
    if (this.initialized) {
      this.logger.warn('Telemetry service already initialized');
      return;
    }

    try {
      // Configure resource
      const resource = new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: this.config.serviceName,
        [SemanticResourceAttributes.SERVICE_VERSION]: this.config.serviceVersion,
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: this.config.environment,
        [SemanticResourceAttributes.SERVICE_INSTANCE_ID]: process.pid.toString(),
        [SemanticResourceAttributes.HOST_NAME]: require('os').hostname(),
      });

      // Configure exporters
      const exporters = this.createExporters();
      
      // Configure span processors
      const spanProcessors = exporters.map(exporter => 
        new BatchSpanProcessor(exporter, {
          maxQueueSize: 1000,
          maxExportBatchSize: 100,
          scheduledDelayMillis: 1000,
        })
      );

      // Configure SDK
      this.sdk = new NodeSDK({
        resource,
        spanProcessors,
        instrumentations: [
          getNodeAutoInstrumentations({
            '@opentelemetry/instrumentation-fs': {
              enabled: this.config.enabledInstrumentations.includes('fs'),
            },
            '@opentelemetry/instrumentation-http': {
              enabled: this.config.enabledInstrumentations.includes('http'),
              requestHook: this.httpRequestHook.bind(this),
              responseHook: this.httpResponseHook.bind(this),
            },
            '@opentelemetry/instrumentation-express': {
              enabled: this.config.enabledInstrumentations.includes('express'),
            },
            '@opentelemetry/instrumentation-redis': {
              enabled: this.config.enabledInstrumentations.includes('redis'),
            },
            '@opentelemetry/instrumentation-pg': {
              enabled: this.config.enabledInstrumentations.includes('pg'),
            },
          }),
        ],
      });

      // Start SDK
      this.sdk.start();
      
      // Get tracer
      this.tracer = trace.getTracer(this.config.serviceName, this.config.serviceVersion);
      
      this.initialized = true;
      
      this.logger.info('Telemetry service initialized', {
        serviceName: this.config.serviceName,
        serviceVersion: this.config.serviceVersion,
        environment: this.config.environment,
        exporters: exporters.length,
      });
    } catch (error) {
      this.logger.error('Failed to initialize telemetry service', { error });
      throw error;
    }
  }

  private createExporters(): any[] {
    const exporters: any[] = [];

    // Jaeger exporter
    if (this.config.jaegerEndpoint) {
      exporters.push(new JaegerExporter({
        endpoint: this.config.jaegerEndpoint,
      }));
    }

    // OTLP exporter (for services like Honeycomb, Datadog, etc.)
    if (this.config.otlpEndpoint) {
      exporters.push(new OTLPTraceExporter({
        url: this.config.otlpEndpoint,
        headers: {
          'x-honeycomb-team': process.env.HONEYCOMB_API_KEY || '',
        },
      }));
    }

    // Console exporter for development
    if (this.config.environment === 'development' && exporters.length === 0) {
      const { ConsoleSpanExporter } = require('@opentelemetry/sdk-trace-node');
      exporters.push(new ConsoleSpanExporter());
    }

    return exporters;
  }

  async startSpan<T>(
    spanContext: SpanContext,
    operation: (span: any) => Promise<T>,
    metadata?: TraceMetadata
  ): Promise<T> {
    if (!this.initialized || !this.tracer) {
      this.logger.warn('Telemetry not initialized, executing without tracing');
      return operation(null);
    }

    const span = this.tracer.startSpan(spanContext.operationName, {
      kind: spanContext.kind || SpanKind.INTERNAL,
      parent: spanContext.parentSpan,
    });

    // Add tags/attributes
    if (spanContext.tags) {
      Object.entries(spanContext.tags).forEach(([key, value]) => {
        span.setAttributes({ [key]: value });
      });
    }

    // Add metadata
    if (metadata) {
      Object.entries(metadata).forEach(([key, value]) => {
        if (value) {
          span.setAttributes({ [key]: value });
        }
      });
    }

    try {
      const result = await context.with(trace.setSpan(context.active(), span), () =>
        operation(span)
      );

      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
      });

      span.recordException(error instanceof Error ? error : new Error(String(error)));
      throw error;
    } finally {
      span.end();
    }
  }

  // High-level tracing helpers for common operations
  async traceAccessibilityScan<T>(
    repositoryId: string,
    operation: (span: any) => Promise<T>
  ): Promise<T> {
    return this.startSpan(
      {
        operationName: 'accessibility.scan',
        tags: {
          'scan.repository_id': repositoryId,
          'scan.type': 'full',
        },
        kind: SpanKind.SERVER,
      },
      operation,
      { correlationId: `scan-${repositoryId}-${Date.now()}` }
    );
  }

  async traceAIOperation<T>(
    provider: string,
    model: string,
    operationType: string,
    operation: (span: any) => Promise<T>
  ): Promise<T> {
    return this.startSpan(
      {
        operationName: `ai.${operationType}`,
        tags: {
          'ai.provider': provider,
          'ai.model': model,
          'ai.operation_type': operationType,
        },
        kind: SpanKind.CLIENT,
      },
      operation
    );
  }

  async traceGitHubOperation<T>(
    operationType: string,
    repositoryFullName: string,
    operation: (span: any) => Promise<T>
  ): Promise<T> {
    return this.startSpan(
      {
        operationName: `github.${operationType}`,
        tags: {
          'github.operation': operationType,
          'github.repository': repositoryFullName,
        },
        kind: SpanKind.CLIENT,
      },
      operation
    );
  }

  async traceContainerOperation<T>(
    operationType: string,
    containerId: string,
    operation: (span: any) => Promise<T>
  ): Promise<T> {
    return this.startSpan(
      {
        operationName: `container.${operationType}`,
        tags: {
          'container.operation': operationType,
          'container.id': containerId,
        },
        kind: SpanKind.INTERNAL,
      },
      operation
    );
  }

  async traceDatabaseOperation<T>(
    operationType: string,
    tableName: string,
    operation: (span: any) => Promise<T>
  ): Promise<T> {
    return this.startSpan(
      {
        operationName: `db.${operationType}`,
        tags: {
          'db.operation': operationType,
          'db.table': tableName,
          'db.system': 'postgresql',
        },
        kind: SpanKind.CLIENT,
      },
      operation
    );
  }

  async traceQueueOperation<T>(
    operationType: string,
    queueName: string,
    operation: (span: any) => Promise<T>
  ): Promise<T> {
    return this.startSpan(
      {
        operationName: `queue.${operationType}`,
        tags: {
          'queue.operation': operationType,
          'queue.name': queueName,
          'queue.system': 'redis',
        },
        kind: SpanKind.PRODUCER,
      },
      operation
    );
  }

  // Custom span creation for manual instrumentation
  createSpan(name: string, tags?: Record<string, any>): any {
    if (!this.tracer) {
      return null;
    }

    const span = this.tracer.startSpan(name);
    
    if (tags) {
      span.setAttributes(tags);
    }

    return span;
  }

  // Get current active span
  getActiveSpan(): any {
    return trace.getActiveSpan();
  }

  // Add event to current span
  addEvent(name: string, attributes?: Record<string, any>): void {
    const span = this.getActiveSpan();
    if (span) {
      span.addEvent(name, attributes);
    }
  }

  // Set attribute on current span
  setAttribute(key: string, value: string | number | boolean): void {
    const span = this.getActiveSpan();
    if (span) {
      span.setAttributes({ [key]: value });
    }
  }

  // Record exception on current span
  recordException(error: Error): void {
    const span = this.getActiveSpan();
    if (span) {
      span.recordException(error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message,
      });
    }
  }

  // HTTP instrumentation hooks
  private httpRequestHook(span: any, request: any): void {
    // Add custom attributes to HTTP request spans
    span.setAttributes({
      'http.request_size': request.headers['content-length'] || 0,
      'http.user_agent': request.headers['user-agent'] || '',
    });

    // Extract correlation ID from headers
    const correlationId = request.headers['x-correlation-id'];
    if (correlationId) {
      span.setAttributes({ 'correlation.id': correlationId });
    }
  }

  private httpResponseHook(span: any, response: any): void {
    // Add custom attributes to HTTP response spans
    span.setAttributes({
      'http.response_size': response.headers['content-length'] || 0,
    });
  }

  // Middleware for Express to add request tracing
  getExpressMiddleware() {
    return (req: any, res: any, next: any) => {
      const span = this.getActiveSpan();
      
      if (span) {
        // Add request metadata
        span.setAttributes({
          'http.route': req.route?.path || req.path,
          'user.id': req.user?.id,
          'organization.id': req.user?.organizationId,
          'request.id': req.id || req.headers['x-request-id'],
        });

        // Set correlation ID
        const correlationId = req.headers['x-correlation-id'] || 
                             req.id || 
                             `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        span.setAttributes({ 'correlation.id': correlationId });
        res.setHeader('x-correlation-id', correlationId);
      }

      next();
    };
  }

  // Get trace context for propagation
  getTraceContext(): Record<string, string> {
    const span = this.getActiveSpan();
    if (!span) {
      return {};
    }

    const spanContext = span.spanContext();
    return {
      'x-trace-id': spanContext.traceId,
      'x-span-id': spanContext.spanId,
      'x-trace-flags': spanContext.traceFlags.toString(),
    };
  }

  // Create child spans for parallel operations
  async runInParallel<T>(
    operations: Array<{
      name: string;
      operation: (span: any) => Promise<T>;
      tags?: Record<string, any>;
    }>
  ): Promise<T[]> {
    const promises = operations.map(({ name, operation, tags }) =>
      this.startSpan(
        {
          operationName: name,
          tags,
          kind: SpanKind.INTERNAL,
        },
        operation
      )
    );

    return Promise.all(promises);
  }

  // Distributed tracing helper for external service calls
  async traceExternalCall<T>(
    serviceName: string,
    operation: (headers: Record<string, string>) => Promise<T>
  ): Promise<T> {
    return this.startSpan(
      {
        operationName: `external.${serviceName}`,
        tags: {
          'external.service': serviceName,
          'span.kind': 'client',
        },
        kind: SpanKind.CLIENT,
      },
      async (span) => {
        // Inject trace context into headers for propagation
        const headers = this.getTraceContext();
        return operation(headers);
      }
    );
  }

  // Get telemetry metrics
  getMetrics(): Record<string, any> {
    return {
      initialized: this.initialized,
      serviceName: this.config.serviceName,
      environment: this.config.environment,
      activeSpans: trace.getActiveSpan() ? 1 : 0,
      sampleRate: this.config.sampleRate,
    };
  }

  async shutdown(): Promise<void> {
    if (this.sdk) {
      try {
        await this.sdk.shutdown();
        this.initialized = false;
        this.logger.info('Telemetry service shutdown complete');
      } catch (error) {
        this.logger.error('Error shutting down telemetry service', { error });
      }
    }
  }
}