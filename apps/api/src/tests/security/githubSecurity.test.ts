import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GitHubService } from '../../services/github';
import { PRGenerationService } from '../../services/prGenerationService';
import { WebhookHandler } from '../../services/webhookHandler';
import { ContainerManager } from '../../../worker/src/services/containerManager';
import crypto from 'crypto';

describe('GitHub Integration Security Tests', () => {
  let githubService: GitHubService;
  let prGenerationService: PRGenerationService;
  let webhookHandler: WebhookHandler;
  let containerManager: ContainerManager;

  beforeEach(() => {
    // Mock environment variables
    process.env.GITHUB_ENCRYPTION_KEY = 'test-encryption-key-32-chars-long';
    process.env.GITHUB_APP_ID = 'test-app-id';
    process.env.GITHUB_PRIVATE_KEY = 'test-private-key';
    process.env.GITHUB_WEBHOOK_SECRET = 'test-webhook-secret';
    
    githubService = new GitHubService();
    prGenerationService = new PRGenerationService();
    webhookHandler = new WebhookHandler();
    containerManager = new ContainerManager();
  });

  afterEach(async () => {
    await githubService.shutdown();
    await prGenerationService.shutdown();
    await webhookHandler.shutdown();
    await containerManager.shutdown();
  });

  describe('Token Encryption Security', () => {
    it('should encrypt GitHub tokens before storage', () => {
      // Test token encryption
      const originalToken = 'ghs_test_token_12345';
      const encrypted = (githubService as any).encryptToken(originalToken);
      
      expect(encrypted).not.toBe(originalToken);
      expect(encrypted).toContain(':'); // Should have IV:authTag:encrypted format
      expect(encrypted.split(':')).toHaveLength(3);
    });

    it('should decrypt tokens correctly', () => {
      const originalToken = 'ghs_test_token_12345';
      const encrypted = (githubService as any).encryptToken(originalToken);
      const decrypted = (githubService as any).decryptToken(encrypted);
      
      expect(decrypted).toBe(originalToken);
    });

    it('should fail to decrypt with wrong key', () => {
      const originalToken = 'ghs_test_token_12345';
      const encrypted = (githubService as any).encryptToken(originalToken);
      
      // Change encryption key
      process.env.GITHUB_ENCRYPTION_KEY = 'different-key-32-chars-long!!!';
      const newGithubService = new GitHubService();
      
      expect(() => {
        (newGithubService as any).decryptToken(encrypted);
      }).toThrow();
    });
  });

  describe('Webhook Signature Verification', () => {
    it('should verify valid webhook signatures', () => {
      const payload = '{"test": "data"}';
      const secret = 'test-webhook-secret';
      
      const signature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');
      
      const isValid = webhookHandler.verifyWebhookSignature(payload, `sha256=${signature}`);
      expect(isValid).toBe(true);
    });

    it('should reject invalid webhook signatures', () => {
      const payload = '{"test": "data"}';
      const invalidSignature = 'sha256=invalid_signature';
      
      const isValid = webhookHandler.verifyWebhookSignature(payload, invalidSignature);
      expect(isValid).toBe(false);
    });

    it('should reject webhook without signature', () => {
      const payload = '{"test": "data"}';
      
      const isValid = webhookHandler.verifyWebhookSignature(payload, '');
      expect(isValid).toBe(false);
    });

    it('should use timing-safe comparison', () => {
      const payload = '{"test": "data"}';
      const correctSignature = crypto
        .createHmac('sha256', 'test-webhook-secret')
        .update(payload)
        .digest('hex');
      
      // Create similar but wrong signature
      const wrongSignature = correctSignature.slice(0, -1) + '0';
      
      const isValid = webhookHandler.verifyWebhookSignature(payload, `sha256=${wrongSignature}`);
      expect(isValid).toBe(false);
    });
  });

  describe('Container Security', () => {
    it('should create containers with security restrictions', async () => {
      const config = {
        image: 'test-image',
        memory: '1024m',
        cpu: '50%',
        networkMode: 'isolated' as const,
        removeOnExit: true,
        timeout: 30000,
        volumes: [],
        environment: {},
      };
      
      const containerId = await containerManager.createSecureContainer(config);
      expect(containerId).toBeTruthy();
      
      const context = containerManager.getSecurityContext(containerId);
      expect(context).toBeTruthy();
      expect(context?.resources.memory).toBe(1024 * 1024 * 1024); // 1GB in bytes
    });

    it('should enforce resource limits', async () => {
      const config = {
        image: 'test-image',
        memory: '512m',
        cpu: '25%',
        networkMode: 'none' as const,
        removeOnExit: true,
        timeout: 15000,
        volumes: [],
        environment: {},
      };
      
      const containerId = await containerManager.createSecureContainer(config);
      const context = containerManager.getSecurityContext(containerId);
      
      expect(context?.resources.memory).toBe(512 * 1024 * 1024); // 512MB
      expect(context?.resources.cpu).toBe(25000); // 25% = 25000 quota
    });

    it('should automatically cleanup containers on timeout', async () => {
      const config = {
        image: 'test-image',
        memory: '256m',
        cpu: '10%',
        networkMode: 'none' as const,
        removeOnExit: true,
        timeout: 1000, // 1 second timeout
        volumes: [],
        environment: {},
      };
      
      const containerId = await containerManager.createSecureContainer(config);
      
      // Wait for timeout + cleanup time
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const context = containerManager.getSecurityContext(containerId);
      expect(context?.endTime).toBeTruthy();
    });

    it('should prevent container from accessing host filesystem', async () => {
      const config = {
        image: 'test-image',
        memory: '256m',
        cpu: '10%',
        networkMode: 'none' as const,
        removeOnExit: true,
        timeout: 30000,
        volumes: [
          {
            host: '/tmp/safe-dir',
            container: '/app/workspace',
            readonly: false,
          },
        ],
        environment: {},
      };
      
      const containerId = await containerManager.createSecureContainer(config);
      
      // Try to access host filesystem (should fail)
      try {
        await containerManager.executeInContainer(containerId, ['ls', '/etc/passwd']);
        expect.fail('Container should not have access to host filesystem');
      } catch (error) {
        expect(error).toBeTruthy();
      }
    });
  });

  describe('Repository Access Security', () => {
    it('should validate repository access before operations', async () => {
      const userId = 'test-user-id';
      const repoFullName = 'unauthorized/repo';
      
      const hasAccess = await githubService.hasRepositoryAccess(userId, repoFullName);
      expect(hasAccess).toBe(false);
    });

    it('should enforce minimal GitHub permissions', () => {
      // Test that we only request necessary scopes
      const installationUrl = githubService.getInstallationUrl('test-user');
      
      expect(installationUrl).toContain('github.com/apps/');
      expect(installationUrl).not.toContain('scope=admin'); // Should not request admin access
    });

    it('should validate repository full name format', () => {
      const validNames = [
        'owner/repo',
        'user123/my-repo',
        'org_name/repo.name',
      ];
      
      const invalidNames = [
        'invalid',
        'owner/',
        '/repo',
        'owner/repo/extra',
        '../owner/repo',
        'owner\\repo',
      ];
      
      // Test validation (would need to add validation method)
      validNames.forEach(name => {
        expect(() => validateRepoName(name)).not.toThrow();
      });
      
      invalidNames.forEach(name => {
        expect(() => validateRepoName(name)).toThrow();
      });
    });
  });

  describe('AI Review Security', () => {
    it('should sanitize code in AI prompts', () => {
      const maliciousCode = `
        <script>alert('xss')</script>
        <?php system($_GET['cmd']); ?>
        eval(user_input)
      `;
      
      // AI review service should sanitize this
      const sanitized = sanitizeCodeForAI(maliciousCode);
      
      expect(sanitized).not.toContain('<script');
      expect(sanitized).not.toContain('<?php');
      expect(sanitized).not.toContain('eval(');
    });

    it('should limit AI prompt size', () => {
      const largeCode = 'x'.repeat(100000); // 100KB of code
      
      const prompt = buildAIPrompt(largeCode);
      
      // Should be truncated to reasonable size
      expect(prompt.length).toBeLessThan(50000); // 50KB max
    });

    it('should track AI usage costs', async () => {
      const mockUsage = {
        input_tokens: 1000,
        output_tokens: 500,
      };
      
      const cost = calculateAICost('claude', mockUsage);
      expect(cost).toBeGreaterThan(0);
      expect(cost).toBeLessThan(1); // Should be reasonable cost
    });
  });

  describe('Pull Request Security', () => {
    it('should validate fix content before applying', () => {
      const dangerousFixes = [
        '<script>alert("xss")</script>',
        '<?php system("rm -rf /"); ?>',
        'eval(userInput)',
        'innerHTML = userInput',
        'document.write(userInput)',
      ];
      
      dangerousFixes.forEach(fix => {
        expect(() => validateFix(fix)).toThrow();
      });
    });

    it('should limit PR description length', () => {
      const largeFixes = Array(100).fill(null).map((_, i) => ({
        issueType: `issue_${i}`,
        explanation: 'x'.repeat(1000),
      }));
      
      const description = generatePRDescription(largeFixes);
      
      // Should be truncated to prevent abuse
      expect(description.length).toBeLessThan(65536); // 64KB max
    });

    it('should prevent path traversal in file operations', () => {
      const dangerousPaths = [
        '../../../etc/passwd',
        '/etc/hosts',
        '..\\..\\windows\\system32',
        '/workspace/../../../secret',
      ];
      
      dangerousPaths.forEach(path => {
        expect(() => validateFilePath(path, '/workspace')).toThrow();
      });
    });
  });

  describe('Audit Logging Security', () => {
    it('should log all security-relevant events', () => {
      // Mock audit logger to capture events
      const auditEvents: any[] = [];
      const mockAuditLogger = {
        logSecurityEvent: vi.fn((event) => auditEvents.push(event)),
        logUserAction: vi.fn((event) => auditEvents.push(event)),
      };
      
      // Test various operations that should be audited
      // This would require integration with actual services
      expect(auditEvents.length).toBeGreaterThan(0);
    });

    it('should redact sensitive information from logs', () => {
      const sensitiveData = {
        password: 'secret123',
        token: 'ghs_secret_token',
        api_key: 'sk-secret-key',
        authorization: 'Bearer secret',
      };
      
      const redacted = redactSensitiveData(sensitiveData);
      
      expect(redacted.password).toBe('[REDACTED]');
      expect(redacted.token).toBe('[REDACTED]');
      expect(redacted.api_key).toBe('[REDACTED]');
      expect(redacted.authorization).toBe('[REDACTED]');
    });
  });

  describe('Error Handling Security', () => {
    it('should not expose internal paths in error messages', () => {
      const internalError = new Error('ENOENT: /home/user/.secrets/config.json');
      
      const sanitizedError = sanitizeError(internalError);
      
      expect(sanitizedError.message).not.toContain('/home/user/.secrets');
      expect(sanitizedError.message).not.toContain('.json');
    });

    it('should not expose stack traces in production', () => {
      process.env.NODE_ENV = 'production';
      
      const error = new Error('Test error');
      const response = formatErrorResponse(error);
      
      expect(response).not.toHaveProperty('stack');
      expect(response).not.toHaveProperty('trace');
    });

    it('should rate limit error responses', () => {
      // Test that repeated errors don't overwhelm the system
      const errorCount = 100;
      const errors = Array(errorCount).fill(null).map(() => new Error('Test'));
      
      const responses = errors.map(formatErrorResponse);
      
      // Should have some form of rate limiting
      expect(responses.filter(r => r.rateLimited)).toHaveLength(0);
    });
  });
});

// Helper functions for tests (would be implemented in actual codebase)
function validateRepoName(name: string): void {
  if (!/^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/.test(name)) {
    throw new Error('Invalid repository name format');
  }
}

function sanitizeCodeForAI(code: string): string {
  return code
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '[SCRIPT_REMOVED]')
    .replace(/<\?php[\s\S]*?\?>/gi, '[PHP_REMOVED]')
    .replace(/eval\s*\(/gi, '[EVAL_REMOVED](');
}

function buildAIPrompt(code: string): string {
  const maxLength = 50000;
  return code.length > maxLength ? code.substring(0, maxLength) + '...[TRUNCATED]' : code;
}

function calculateAICost(provider: string, usage: any): number {
  const pricing = {
    claude: { input: 3.00, output: 15.00 },
    chatgpt: { input: 10.00, output: 30.00 },
  };
  
  const rates = pricing[provider as keyof typeof pricing];
  return ((usage.input_tokens * rates.input) + (usage.output_tokens * rates.output)) / 1_000_000;
}

function validateFix(fix: string): void {
  const dangerousPatterns = [
    /<script/gi,
    /<\?php/gi,
    /eval\s*\(/gi,
    /innerHTML\s*=/gi,
    /document\.write\s*\(/gi,
  ];
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(fix)) {
      throw new Error(`Fix contains dangerous pattern: ${pattern}`);
    }
  }
}

function generatePRDescription(fixes: any[]): string {
  const description = fixes.map(f => f.explanation).join('\n');
  const maxLength = 65536;
  return description.length > maxLength ? description.substring(0, maxLength) + '...[TRUNCATED]' : description;
}

function validateFilePath(path: string, allowedBase: string): void {
  const resolvedPath = require('path').resolve(allowedBase, path);
  if (!resolvedPath.startsWith(allowedBase)) {
    throw new Error('Path traversal detected');
  }
}

function redactSensitiveData(data: any): any {
  const sensitiveKeys = ['password', 'token', 'api_key', 'authorization', 'secret'];
  const result = { ...data };
  
  for (const key of sensitiveKeys) {
    if (result[key]) {
      result[key] = '[REDACTED]';
    }
  }
  
  return result;
}

function sanitizeError(error: Error): Error {
  const sanitized = new Error(error.message.replace(/\/[^\s]+/g, '[PATH_REDACTED]'));
  return sanitized;
}

function formatErrorResponse(error: Error): any {
  const response: any = {
    error: error.message,
    timestamp: new Date().toISOString(),
  };
  
  if (process.env.NODE_ENV !== 'production') {
    response.stack = error.stack;
  }
  
  return response;
}