import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AIReviewService } from './aiReviewService';
import { OpenAI } from 'openai';
import { Anthropic } from '@anthropic-ai/sdk';

// Mock dependencies
vi.mock('openai');
vi.mock('@anthropic-ai/sdk');

describe('AIReviewService', () => {
  let aiReviewService: AIReviewService;
  let mockOpenAI: any;
  let mockAnthropic: any;

  beforeEach(() => {
    mockOpenAI = {
      chat: {
        completions: {
          create: vi.fn()
        }
      }
    };

    mockAnthropic = {
      messages: {
        create: vi.fn()
      }
    };

    (OpenAI as any).mockImplementation(() => mockOpenAI);
    (Anthropic as any).mockImplementation(() => mockAnthropic);

    aiReviewService = new AIReviewService();
  });

  describe('generateAndReviewFixes', () => {
    const mockIssues = [
      {
        id: 'issue-1',
        type: 'missing_alt_text',
        severity: 'error',
        description: 'Image missing alt text',
        element: '<img src="test.jpg">',
        selector: 'img',
        wcagCriteria: ['1.1.1'],
        code: '<img src="test.jpg">',
        line: 10,
        column: 5
      }
    ];

    const mockRepositoryContext = {
      framework: 'react',
      language: 'typescript',
      dependencies: ['react', '@types/react']
    };

    it('should generate fixes using both AI providers', async () => {
      // Mock Claude response
      mockAnthropic.messages.create.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              originalCode: '<img src="test.jpg">',
              fixedCode: '<img src="test.jpg" alt="Descriptive alt text">',
              explanation: 'Added descriptive alt text for accessibility',
              confidence: 0.9
            })
          }
        ],
        usage: {
          input_tokens: 100,
          output_tokens: 50
        }
      });

      // Mock ChatGPT response
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                review: 'approved',
                improvements: ['Consider more specific alt text'],
                confidence: 0.85
              })
            }
          }
        ],
        usage: {
          prompt_tokens: 120,
          completion_tokens: 60
        }
      });

      const fixes = await aiReviewService.generateAndReviewFixes(
        mockIssues,
        mockRepositoryContext,
        'test-user-id'
      );

      expect(fixes).toHaveLength(1);
      expect(fixes[0].originalCode).toBe('<img src="test.jpg">');
      expect(fixes[0].fixedCode).toBe('<img src="test.jpg" alt="Descriptive alt text">');
      expect(fixes[0].confidence).toBeGreaterThan(0.8);
      expect(mockAnthropic.messages.create).toHaveBeenCalledOnce();
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledOnce();
    });

    it('should handle AI service failures gracefully', async () => {
      mockAnthropic.messages.create.mockRejectedValue(new Error('Claude API error'));
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('OpenAI API error'));

      const fixes = await aiReviewService.generateAndReviewFixes(
        mockIssues,
        mockRepositoryContext,
        'test-user-id'
      );

      expect(fixes).toHaveLength(1);
      expect(fixes[0].fallback).toBe(true);
      expect(fixes[0].confidence).toBeLessThan(0.5);
    });

    it('should create consensus between AI providers', async () => {
      // Mock differing responses
      mockAnthropic.messages.create.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              originalCode: '<img src="test.jpg">',
              fixedCode: '<img src="test.jpg" alt="Image description">',
              explanation: 'Added alt text',
              confidence: 0.8
            })
          }
        ],
        usage: { input_tokens: 100, output_tokens: 50 }
      });

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                review: 'approved_with_changes',
                improvements: ['Use more descriptive alt text'],
                suggestedCode: '<img src="test.jpg" alt="Product screenshot showing dashboard">',
                confidence: 0.9
              })
            }
          }
        ],
        usage: { prompt_tokens: 120, completion_tokens: 60 }
      });

      const fixes = await aiReviewService.generateAndReviewFixes(
        mockIssues,
        mockRepositoryContext,
        'test-user-id'
      );

      expect(fixes[0].fixedCode).toBe('<img src="test.jpg" alt="Product screenshot showing dashboard">');
      expect(fixes[0].consensus).toBe('improved');
    });
  });

  describe('generateFixWithClaude', () => {
    const mockIssue = {
      id: 'issue-1',
      type: 'missing_alt_text',
      element: '<img src="test.jpg">',
      description: 'Missing alt text'
    };

    it('should generate fix using Claude', async () => {
      mockAnthropic.messages.create.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              originalCode: '<img src="test.jpg">',
              fixedCode: '<img src="test.jpg" alt="Meaningful description">',
              explanation: 'Added descriptive alt text',
              confidence: 0.9
            })
          }
        ],
        usage: { input_tokens: 100, output_tokens: 50 }
      });

      const fix = await (aiReviewService as any).generateFixWithClaude(
        mockIssue,
        { framework: 'react' },
        'test-user-id'
      );

      expect(fix.fixedCode).toBe('<img src="test.jpg" alt="Meaningful description">');
      expect(fix.confidence).toBe(0.9);
      expect(fix.provider).toBe('claude');
    });

    it('should handle malformed JSON response', async () => {
      mockAnthropic.messages.create.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: 'Invalid JSON response'
          }
        ],
        usage: { input_tokens: 100, output_tokens: 50 }
      });

      const fix = await (aiReviewService as any).generateFixWithClaude(
        mockIssue,
        { framework: 'react' },
        'test-user-id'
      );

      expect(fix.fallback).toBe(true);
      expect(fix.confidence).toBeLessThan(0.5);
    });
  });

  describe('reviewWithChatGPT', () => {
    const mockFix = {
      originalCode: '<img src="test.jpg">',
      fixedCode: '<img src="test.jpg" alt="Description">',
      explanation: 'Added alt text'
    };

    it('should review fix using ChatGPT', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                review: 'approved',
                confidence: 0.85,
                improvements: []
              })
            }
          }
        ],
        usage: { prompt_tokens: 120, completion_tokens: 60 }
      });

      const review = await (aiReviewService as any).reviewWithChatGPT(
        mockFix,
        { type: 'missing_alt_text' },
        { framework: 'react' }
      );

      expect(review.status).toBe('approved');
      expect(review.confidence).toBe(0.85);
      expect(review.provider).toBe('chatgpt');
    });

    it('should suggest improvements when needed', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                review: 'approved_with_changes',
                confidence: 0.7,
                improvements: ['Be more specific in alt text'],
                suggestedCode: '<img src="test.jpg" alt="Product dashboard screenshot">'
              })
            }
          }
        ],
        usage: { prompt_tokens: 120, completion_tokens: 60 }
      });

      const review = await (aiReviewService as any).reviewWithChatGPT(
        mockFix,
        { type: 'missing_alt_text' },
        { framework: 'react' }
      );

      expect(review.status).toBe('approved_with_changes');
      expect(review.suggestedCode).toBe('<img src="test.jpg" alt="Product dashboard screenshot">');
    });
  });

  describe('createConsensus', () => {
    it('should create consensus when both AIs agree', () => {
      const claudeReview = {
        status: 'approved',
        confidence: 0.9,
        provider: 'claude'
      };

      const chatgptReview = {
        status: 'approved',
        confidence: 0.85,
        provider: 'chatgpt'
      };

      const consensus = (aiReviewService as any).createConsensus(
        claudeReview,
        chatgptReview,
        { type: 'missing_alt_text' }
      );

      expect(consensus.status).toBe('approved');
      expect(consensus.confidence).toBeCloseTo(0.875); // Average of both
      expect(consensus.agreement).toBe('high');
    });

    it('should handle disagreement between AIs', () => {
      const claudeReview = {
        status: 'approved',
        confidence: 0.9,
        provider: 'claude'
      };

      const chatgptReview = {
        status: 'rejected',
        confidence: 0.8,
        provider: 'chatgpt',
        reasoning: 'Alt text too generic'
      };

      const consensus = (aiReviewService as any).createConsensus(
        claudeReview,
        chatgptReview,
        { type: 'missing_alt_text' }
      );

      expect(consensus.status).toBe('requires_review');
      expect(consensus.agreement).toBe('low');
      expect(consensus.conflict).toBeTruthy();
    });
  });

  describe('sanitizeCodeForAI', () => {
    it('should remove sensitive information from code', () => {
      const code = 'const apiKey = "sk-secret123"; const token = "bearer abc123";';
      
      const sanitized = (aiReviewService as any).sanitizeCodeForAI(code);

      expect(sanitized).not.toContain('sk-secret123');
      expect(sanitized).not.toContain('bearer abc123');
      expect(sanitized).toContain('[REDACTED]');
    });

    it('should preserve code structure while sanitizing', () => {
      const code = '<img src="photo.jpg" data-secret="hidden123">';
      
      const sanitized = (aiReviewService as any).sanitizeCodeForAI(code);

      expect(sanitized).toContain('<img');
      expect(sanitized).toContain('src="photo.jpg"');
      expect(sanitized).not.toContain('hidden123');
    });
  });

  describe('error handling and resilience', () => {
    it('should provide fallback when all AI services fail', async () => {
      mockAnthropic.messages.create.mockRejectedValue(new Error('Service unavailable'));
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('Rate limited'));

      const fixes = await aiReviewService.generateAndReviewFixes(
        [{
          id: 'issue-1',
          type: 'missing_alt_text',
          element: '<img src="test.jpg">',
          code: '<img src="test.jpg">'
        }],
        { framework: 'react' },
        'test-user-id'
      );

      expect(fixes).toHaveLength(1);
      expect(fixes[0].fallback).toBe(true);
      expect(fixes[0].fixedCode).toContain('alt=');
    });

    it('should handle rate limiting with exponential backoff', async () => {
      const rateLimitError = new Error('Rate limit exceeded. Retry after 30 seconds');
      
      mockAnthropic.messages.create
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce({
          content: [{ type: 'text', text: '{"fixedCode": "success"}' }],
          usage: { input_tokens: 100, output_tokens: 50 }
        });

      const fix = await (aiReviewService as any).generateFixWithClaude(
        { type: 'missing_alt_text', element: '<img>' },
        { framework: 'react' },
        'test-user-id'
      );

      expect(fix.fixedCode).toBe('success');
    });
  });

  describe('cost tracking', () => {
    it('should track token usage and costs', async () => {
      mockAnthropic.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: '{"fixedCode": "test"}' }],
        usage: { input_tokens: 100, output_tokens: 50 }
      });

      const costTrackerSpy = vi.spyOn(aiReviewService['costTracker'], 'trackUsage');

      await (aiReviewService as any).generateFixWithClaude(
        { type: 'missing_alt_text' },
        { framework: 'react' },
        'test-user-id'
      );

      expect(costTrackerSpy).toHaveBeenCalledWith(
        'anthropic',
        'claude-3-5-sonnet',
        { input_tokens: 100, output_tokens: 50 }
      );
    });
  });

  describe('performance optimization', () => {
    it('should process multiple issues in parallel', async () => {
      const issues = Array.from({ length: 5 }, (_, i) => ({
        id: `issue-${i}`,
        type: 'missing_alt_text',
        element: `<img src="test${i}.jpg">`,
        code: `<img src="test${i}.jpg">`
      }));

      mockAnthropic.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: '{"fixedCode": "fixed"}' }],
        usage: { input_tokens: 100, output_tokens: 50 }
      });

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: '{"review": "approved"}' } }],
        usage: { prompt_tokens: 100, completion_tokens: 50 }
      });

      const startTime = Date.now();
      const fixes = await aiReviewService.generateAndReviewFixes(
        issues,
        { framework: 'react' },
        'test-user-id'
      );
      const duration = Date.now() - startTime;

      expect(fixes).toHaveLength(5);
      expect(duration).toBeLessThan(10000); // Should be faster than sequential processing
    });
  });
});