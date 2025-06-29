export interface ScanJob {
  id: string;
  url: string;
  repositoryId?: string;
  userId: string;
  options: ScanOptions;
  metadata: ScanMetadata;
  createdAt: Date;
}

export interface ScanOptions {
  includeHidden: boolean;
  viewport: {
    width: number;
    height: number;
  };
  userAgent?: string;
  timeout: number;
  waitForSelector?: string;
  excludeSelectors?: string[];
  includeRules?: string[];
  excludeRules?: string[];
}

export interface ScanMetadata {
  source: 'dashboard' | 'api' | 'webhook';
  priority: 'low' | 'normal' | 'high';
  retryCount: number;
  maxRetries: number;
}

export interface ScanResult {
  jobId: string;
  url: string;
  status: 'completed' | 'failed' | 'timeout';
  issues: AccessibilityIssue[];
  metrics: ScanMetrics;
  screenshots?: ScreenshotData[];
  error?: string;
  completedAt: Date;
}

export interface AccessibilityIssue {
  id: string;
  type: IssueType;
  severity: 'blocker' | 'critical' | 'major' | 'minor';
  wcagCriteria: string;
  title: string;
  description: string;
  impact: string;
  selector: string;
  xpath?: string;
  html: string;
  fix: IssueFix;
  context: IssueContext;
}

export type IssueType = 
  | 'missing_alt_text'
  | 'color_contrast'
  | 'heading_structure'
  | 'form_labels'
  | 'aria_labels'
  | 'focus_management'
  | 'keyboard_navigation'
  | 'text_alternatives'
  | 'landmarks'
  | 'table_structure';

export interface IssueFix {
  type: 'attribute' | 'element' | 'style' | 'restructure';
  description: string;
  suggestedCode: string;
  explanation: string;
  confidence: number; // 0-1
}

export interface IssueContext {
  pageTitle: string;
  pageUrl: string;
  elementRole?: string;
  parentElements: string[];
  nearbyText?: string;
  imageInfo?: {
    src: string;
    dimensions: { width: number; height: number };
    fileSize?: number;
  };
}

export interface ScanMetrics {
  totalElements: number;
  totalIssues: number;
  issuesBySeverity: Record<string, number>;
  issuesByType: Record<string, number>;
  scanDuration: number;
  renderTime: number;
  ruleExecutionTimes: Record<string, number>;
  memoryUsage: {
    peak: number;
    average: number;
  };
  performanceScore?: number;
}

export interface ScreenshotData {
  type: 'full' | 'element' | 'issue';
  base64: string;
  metadata: {
    viewport: { width: number; height: number };
    devicePixelRatio: number;
    timestamp: Date;
    selector?: string;
  };
}

export interface ContainerConfig {
  image: string;
  memory: string;
  cpu: string;
  networkMode: 'none' | 'isolated';
  removeOnExit: boolean;
  timeout: number;
  volumes: VolumeMount[];
  environment: Record<string, string>;
}

export interface VolumeMount {
  host: string;
  container: string;
  readonly: boolean;
}

export interface SecurityContext {
  containerId: string;
  startTime: Date;
  endTime?: Date;
  resources: {
    memory: number;
    cpu: number;
    diskUsage: number;
  };
  networkActivity: {
    outboundRequests: number;
    blockedRequests: number;
  };
  auditLog: AuditEntry[];
}

export interface AuditEntry {
  id: string;
  timestamp: Date;
  action: string;
  details: Record<string, any>;
  severity: 'info' | 'warning' | 'error';
}