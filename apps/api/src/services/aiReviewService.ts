import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { AccessibilityIssue } from '../types/scan';
import { logger } from '../utils/logger';
import { AuditLogger } from './auditLogger';

export interface AIReviewConfig {
  openaiApiKey: string;
  anthropicApiKey: string;
  maxTokens: number;
  temperature: number;
  costTrackingEnabled: boolean;
}

export interface CodeFix {
  issueId: string;
  issueType: string;
  severity: string;
  wcagCriteria: string;
  originalCode: string;
  fixedCode: string;
  explanation: string;
  confidence: number;
  testSuggestions: string[];
  alternativeApproaches?: string[];
  reviewComments: {
    claude: AIReviewResult;
    chatgpt: AIReviewResult;
    consensus: ConsensusResult;
  };
}

export interface AIReviewResult {
  provider: 'claude' | 'chatgpt';
  approved: boolean;
  confidence: number;
  reasoning: string;
  suggestions: string[];
  concerns: string[];
  alternativeApproach?: string;
  estimatedImpact: 'low' | 'medium' | 'high';
  costTracking: {
    inputTokens: number;
    outputTokens: number;
    estimatedCost: number;
  };
}

export interface ConsensusResult {
  agreement: 'full' | 'partial' | 'disagreement';
  finalApproval: boolean;
  confidence: number;
  mergedSuggestions: string[];
  conflictResolution?: string;
  recommendedApproach: string;
}

export class AIReviewService {
  private openai: OpenAI;
  private anthropic: Anthropic;
  private config: AIReviewConfig;
  private auditLogger: AuditLogger;
  private costTracking: Map<string, number> = new Map();

  constructor(config: AIReviewConfig) {
    this.config = config;
    this.openai = new OpenAI({ apiKey: config.openaiApiKey });
    this.anthropic = new Anthropic({ apiKey: config.anthropicApiKey });
    this.auditLogger = new AuditLogger();
  }

  /**
   * Generate and review code fixes for accessibility issues using two-phase AI review
   */
  async generateAndReviewFixes(
    issues: AccessibilityIssue[],
    repositoryContext: {
      name: string;
      language: string;
      framework?: string;
      testingFramework?: string;
      existingPatterns?: string[];
    },
    userId: string
  ): Promise<CodeFix[]> {
    const fixes: CodeFix[] = [];

    logger.info('Starting AI-powered fix generation and review', {
      userId,
      repository: repositoryContext.name,
      issueCount: issues.length,
    });

    for (const issue of issues) {
      try {
        logger.debug('Processing issue for AI review', {
          issueId: issue.id,
          type: issue.type,
          severity: issue.severity,
        });

        // Generate initial fix
        const initialFix = await this.generateInitialFix(issue, repositoryContext);

        // Phase 1: Claude review
        const claudeReview = await this.reviewWithClaude(initialFix, issue, repositoryContext);

        // Phase 2: ChatGPT review
        const chatgptReview = await this.reviewWithChatGPT(initialFix, issue, repositoryContext);

        // Create consensus
        const consensus = this.createConsensus(claudeReview, chatgptReview, issue);

        // Apply consensus improvements if needed
        const finalFix = await this.applyConsensusImprovements(
          initialFix,
          consensus,
          issue,
          repositoryContext
        );

        const codeFix: CodeFix = {
          issueId: issue.id,
          issueType: issue.type,
          severity: issue.severity,
          wcagCriteria: issue.wcagCriteria,
          originalCode: issue.html,
          fixedCode: finalFix,
          explanation: this.generateExplanation(issue, claudeReview, chatgptReview),
          confidence: consensus.confidence,
          testSuggestions: this.generateTestSuggestions(issue, repositoryContext),
          alternativeApproaches: this.mergeAlternativeApproaches(claudeReview, chatgptReview),
          reviewComments: {
            claude: claudeReview,
            chatgpt: chatgptReview,
            consensus,
          },
        };

        fixes.push(codeFix);

        // Log AI usage for cost tracking
        await this.logAIUsage(userId, issue.id, claudeReview, chatgptReview);

      } catch (error) {
        logger.error('Failed to generate fix for issue', {
          issueId: issue.id,
          error: error.message,
        });

        // Create fallback fix
        fixes.push(this.createFallbackFix(issue));
      }
    }

    // Log summary
    await this.auditLogger.logUserAction({
      userId,
      action: 'ai_fixes_generated',
      resource: 'ai_fixes',
      details: {
        repository: repositoryContext.name,
        issueCount: issues.length,
        fixCount: fixes.length,
        totalCost: this.calculateTotalCost(fixes),
        averageConfidence: this.calculateAverageConfidence(fixes),
      },
      severity: 'info',
      category: 'scan',
      source: 'api',
      outcome: 'success',
    });

    logger.info('AI fix generation and review completed', {
      userId,
      repository: repositoryContext.name,
      fixCount: fixes.length,
      averageConfidence: this.calculateAverageConfidence(fixes),
    });

    return fixes;
  }

  /**
   * Generate initial code fix for an accessibility issue
   */
  private async generateInitialFix(
    issue: AccessibilityIssue,
    context: any
  ): Promise<string> {
    const prompt = this.buildFixGenerationPrompt(issue, context);

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        messages: [{
          role: 'user',
          content: prompt,
        }],
      });

      const content = response.content[0];
      if (content.type === 'text') {
        return this.extractCodeFromResponse(content.text);
      }

      throw new Error('Unexpected response format from Claude');
    } catch (error) {
      logger.error('Failed to generate initial fix with Claude', {
        issueId: issue.id,
        error: error.message,
      });

      // Fallback to ChatGPT
      return await this.generateInitialFixWithChatGPT(issue, context);
    }
  }

  /**
   * Review code fix with Claude
   */
  private async reviewWithClaude(
    fixedCode: string,
    issue: AccessibilityIssue,
    context: any
  ): Promise<AIReviewResult> {
    const prompt = this.buildReviewPrompt(fixedCode, issue, context, 'claude');

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: this.config.maxTokens,
        temperature: 0.1, // Lower temperature for review
        messages: [{
          role: 'user',
          content: prompt,
        }],
      });

      const content = response.content[0];
      if (content.type === 'text') {
        return this.parseReviewResponse(content.text, 'claude', response.usage);
      }

      throw new Error('Unexpected response format from Claude');
    } catch (error) {
      logger.error('Claude review failed', {
        issueId: issue.id,
        error: error.message,
      });

      return this.createErrorReview('claude', error);
    }
  }

  /**
   * Review code fix with ChatGPT
   */
  private async reviewWithChatGPT(
    fixedCode: string,
    issue: AccessibilityIssue,
    context: any
  ): Promise<AIReviewResult> {
    const prompt = this.buildReviewPrompt(fixedCode, issue, context, 'chatgpt');

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        max_tokens: this.config.maxTokens,
        temperature: 0.1,
        messages: [{
          role: 'user',
          content: prompt,
        }],
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content in ChatGPT response');
      }

      return this.parseReviewResponse(content, 'chatgpt', response.usage);
    } catch (error) {
      logger.error('ChatGPT review failed', {
        issueId: issue.id,
        error: error.message,
      });

      return this.createErrorReview('chatgpt', error);
    }
  }

  /**
   * Create consensus between Claude and ChatGPT reviews
   */
  private createConsensus(
    claudeReview: AIReviewResult,
    chatgptReview: AIReviewResult,
    issue: AccessibilityIssue
  ): ConsensusResult {
    const bothApprove = claudeReview.approved && chatgptReview.approved;
    const neitherApproves = !claudeReview.approved && !chatgptReview.approved;
    const oneApproves = claudeReview.approved !== chatgptReview.approved;

    let agreement: 'full' | 'partial' | 'disagreement';
    let finalApproval: boolean;
    let confidence: number;

    if (bothApprove) {
      agreement = 'full';
      finalApproval = true;
      confidence = Math.min(claudeReview.confidence, chatgptReview.confidence);
    } else if (neitherApproves) {
      agreement = 'full';
      finalApproval = false;
      confidence = Math.max(claudeReview.confidence, chatgptReview.confidence);
    } else {
      agreement = 'disagreement';
      finalApproval = this.resolveDisagreement(claudeReview, chatgptReview, issue);
      confidence = Math.abs(claudeReview.confidence - chatgptReview.confidence) < 0.3 ? 0.6 : 0.4;
    }

    const mergedSuggestions = [
      ...claudeReview.suggestions,
      ...chatgptReview.suggestions,
    ].filter((suggestion, index, arr) => arr.indexOf(suggestion) === index);

    return {
      agreement,
      finalApproval,
      confidence,
      mergedSuggestions,
      conflictResolution: oneApproves ? this.generateConflictResolution(claudeReview, chatgptReview) : undefined,
      recommendedApproach: this.selectRecommendedApproach(claudeReview, chatgptReview, finalApproval),
    };
  }

  /**
   * Build prompt for initial fix generation
   */
  private buildFixGenerationPrompt(issue: AccessibilityIssue, context: any): string {
    return `You are an expert accessibility engineer. Generate a code fix for the following accessibility issue:

**Issue Details:**
- Type: ${issue.type}
- Severity: ${issue.severity}
- WCAG Criteria: ${issue.wcagCriteria}
- Title: ${issue.title}
- Description: ${issue.description}
- Impact: ${issue.impact}

**Current Code:**
\`\`\`html
${issue.html}
\`\`\`

**Element Selector:** ${issue.selector}

**Repository Context:**
- Language: ${context.language}
- Framework: ${context.framework || 'Unknown'}
- Testing Framework: ${context.testingFramework || 'Unknown'}

**Requirements:**
1. Fix MUST address the specific WCAG criteria violation
2. Fix MUST be minimal and focused - only change what's necessary
3. Fix MUST maintain existing functionality
4. Fix MUST follow modern accessibility best practices
5. Fix MUST be compatible with the repository's framework
6. Include comments explaining the accessibility improvement

**Output Format:**
Provide ONLY the fixed HTML/JSX code. Do not include explanations or additional text.

**Fixed Code:**`;
  }

  /**
   * Build prompt for AI review
   */
  private buildReviewPrompt(
    fixedCode: string,
    issue: AccessibilityIssue,
    context: any,
    reviewer: 'claude' | 'chatgpt'
  ): string {
    const reviewerRole = reviewer === 'claude' 
      ? 'You are Claude, an expert accessibility auditor and code reviewer.'
      : 'You are ChatGPT, an expert accessibility engineer and security reviewer.';

    return `${reviewerRole} Review this accessibility fix with extreme attention to detail.

**Original Issue:**
- Type: ${issue.type}
- Severity: ${issue.severity}
- WCAG: ${issue.wcagCriteria}
- Description: ${issue.description}

**Original Code:**
\`\`\`html
${issue.html}
\`\`\`

**Proposed Fix:**
\`\`\`html
${fixedCode}
\`\`\`

**Repository Context:**
- Language: ${context.language}
- Framework: ${context.framework || 'Unknown'}

**Review Criteria:**
1. Does the fix correctly address the WCAG violation?
2. Is the fix minimal and non-breaking?
3. Are there any security implications?
4. Is the code quality acceptable?
5. Are there better alternative approaches?
6. Will this fix work across different browsers/assistive technologies?

**Response Format (JSON):**
{
  "approved": boolean,
  "confidence": number (0-1),
  "reasoning": "detailed explanation",
  "suggestions": ["suggestion1", "suggestion2"],
  "concerns": ["concern1", "concern2"],
  "alternativeApproach": "alternative if you have one",
  "estimatedImpact": "low|medium|high"
}`;
  }

  /**
   * Parse AI review response
   */
  private parseReviewResponse(response: string, provider: 'claude' | 'chatgpt', usage?: any): AIReviewResult {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        provider,
        approved: parsed.approved || false,
        confidence: Math.max(0, Math.min(1, parsed.confidence || 0.5)),
        reasoning: parsed.reasoning || 'No reasoning provided',
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
        concerns: Array.isArray(parsed.concerns) ? parsed.concerns : [],
        alternativeApproach: parsed.alternativeApproach,
        estimatedImpact: ['low', 'medium', 'high'].includes(parsed.estimatedImpact) 
          ? parsed.estimatedImpact 
          : 'medium',
        costTracking: {
          inputTokens: usage?.input_tokens || usage?.prompt_tokens || 0,
          outputTokens: usage?.output_tokens || usage?.completion_tokens || 0,
          estimatedCost: this.calculateCost(provider, usage),
        },
      };
    } catch (error) {
      logger.error('Failed to parse AI review response', {
        provider,
        error: error.message,
        response: response.substring(0, 500),
      });

      return this.createErrorReview(provider, error);
    }
  }

  /**
   * Extract code from AI response
   */
  private extractCodeFromResponse(response: string): string {
    // Look for code blocks
    const codeBlocks = response.match(/```(?:html|jsx?|tsx?)?\n([\s\S]*?)```/g);
    if (codeBlocks && codeBlocks.length > 0) {
      return codeBlocks[0].replace(/```(?:html|jsx?|tsx?)?\n/, '').replace(/```$/, '').trim();
    }

    // If no code blocks, return the whole response trimmed
    return response.trim();
  }

  /**
   * Generate fallback fix when AI fails
   */
  private createFallbackFix(issue: AccessibilityIssue): CodeFix {
    const basicFix = issue.fix.suggestedCode || issue.html;

    return {
      issueId: issue.id,
      issueType: issue.type,
      severity: issue.severity,
      wcagCriteria: issue.wcagCriteria,
      originalCode: issue.html,
      fixedCode: basicFix,
      explanation: `Fallback fix: ${issue.fix.explanation}`,
      confidence: 0.3,
      testSuggestions: ['Manual testing recommended'],
      reviewComments: {
        claude: this.createErrorReview('claude', new Error('AI service unavailable')),
        chatgpt: this.createErrorReview('chatgpt', new Error('AI service unavailable')),
        consensus: {
          agreement: 'disagreement',
          finalApproval: false,
          confidence: 0.3,
          mergedSuggestions: ['Review manually'],
          recommendedApproach: 'Manual review required',
        },
      },
    };
  }

  /**
   * Create error review result
   */
  private createErrorReview(provider: 'claude' | 'chatgpt', error: Error): AIReviewResult {
    return {
      provider,
      approved: false,
      confidence: 0,
      reasoning: `Review failed: ${error.message}`,
      suggestions: [],
      concerns: ['AI review service unavailable'],
      estimatedImpact: 'medium',
      costTracking: {
        inputTokens: 0,
        outputTokens: 0,
        estimatedCost: 0,
      },
    };
  }

  private calculateCost(provider: 'claude' | 'chatgpt', usage: any): number {
    if (!usage || !this.config.costTrackingEnabled) return 0;

    const inputTokens = usage.input_tokens || usage.prompt_tokens || 0;
    const outputTokens = usage.output_tokens || usage.completion_tokens || 0;

    // Pricing as of 2024 (per 1M tokens)
    const pricing = {
      claude: { input: 3.00, output: 15.00 },
      chatgpt: { input: 10.00, output: 30.00 },
    };

    const rates = pricing[provider];
    return ((inputTokens * rates.input) + (outputTokens * rates.output)) / 1_000_000;
  }

  private async logAIUsage(
    userId: string,
    issueId: string,
    claudeReview: AIReviewResult,
    chatgptReview: AIReviewResult
  ): Promise<void> {
    const totalCost = claudeReview.costTracking.estimatedCost + chatgptReview.costTracking.estimatedCost;
    const totalTokens = 
      claudeReview.costTracking.inputTokens + claudeReview.costTracking.outputTokens +
      chatgptReview.costTracking.inputTokens + chatgptReview.costTracking.outputTokens;

    await this.auditLogger.logUserAction({
      userId,
      action: 'ai_review_completed',
      resource: 'ai_review',
      resourceId: issueId,
      details: {
        claudeApproved: claudeReview.approved,
        chatgptApproved: chatgptReview.approved,
        totalTokens,
        totalCost,
        claudeCost: claudeReview.costTracking.estimatedCost,
        chatgptCost: chatgptReview.costTracking.estimatedCost,
      },
      severity: 'info',
      category: 'scan',
      source: 'api',
      outcome: 'success',
    });

    // Update cost tracking
    const currentCost = this.costTracking.get(userId) || 0;
    this.costTracking.set(userId, currentCost + totalCost);
  }

  private calculateTotalCost(fixes: CodeFix[]): number {
    return fixes.reduce((total, fix) => {
      return total + 
        fix.reviewComments.claude.costTracking.estimatedCost +
        fix.reviewComments.chatgpt.costTracking.estimatedCost;
    }, 0);
  }

  private calculateAverageConfidence(fixes: CodeFix[]): number {
    if (fixes.length === 0) return 0;
    return fixes.reduce((sum, fix) => sum + fix.confidence, 0) / fixes.length;
  }

  private generateInitialFixWithChatGPT(issue: AccessibilityIssue, context: any): Promise<string> {
    // Implementation for ChatGPT fallback
    return Promise.resolve(issue.fix.suggestedCode);
  }

  private applyConsensusImprovements(
    initialFix: string,
    consensus: ConsensusResult,
    issue: AccessibilityIssue,
    context: any
  ): Promise<string> {
    // If both AIs approved and confidence is high, return as-is
    if (consensus.finalApproval && consensus.confidence > 0.8) {
      return Promise.resolve(initialFix);
    }

    // For now, return the initial fix
    // In production, this could trigger additional AI refinement
    return Promise.resolve(initialFix);
  }

  private generateExplanation(
    issue: AccessibilityIssue,
    claudeReview: AIReviewResult,
    chatgptReview: AIReviewResult
  ): string {
    const baseExplanation = `Fix for ${issue.type} (WCAG ${issue.wcagCriteria}): ${issue.description}`;
    
    const reviewSummary = `\n\nAI Review Summary:\n- Claude: ${claudeReview.approved ? 'Approved' : 'Rejected'} (confidence: ${claudeReview.confidence})\n- ChatGPT: ${chatgptReview.approved ? 'Approved' : 'Rejected'} (confidence: ${chatgptReview.confidence})`;
    
    return baseExplanation + reviewSummary;
  }

  private generateTestSuggestions(issue: AccessibilityIssue, context: any): string[] {
    const suggestions = [
      'Test with screen reader (NVDA, JAWS, VoiceOver)',
      'Verify keyboard navigation works properly',
      'Check color contrast meets WCAG standards',
    ];

    // Add specific suggestions based on issue type
    switch (issue.type) {
      case 'missing_alt_text':
        suggestions.push('Verify alt text is descriptive and meaningful');
        break;
      case 'form_labels':
        suggestions.push('Test form with screen reader', 'Verify label association');
        break;
      case 'heading_structure':
        suggestions.push('Check heading hierarchy with headings extension');
        break;
    }

    return suggestions;
  }

  private mergeAlternativeApproaches(claudeReview: AIReviewResult, chatgptReview: AIReviewResult): string[] {
    const approaches: string[] = [];
    
    if (claudeReview.alternativeApproach) {
      approaches.push(`Claude: ${claudeReview.alternativeApproach}`);
    }
    
    if (chatgptReview.alternativeApproach) {
      approaches.push(`ChatGPT: ${chatgptReview.alternativeApproach}`);
    }
    
    return approaches;
  }

  private resolveDisagreement(
    claudeReview: AIReviewResult,
    chatgptReview: AIReviewResult,
    issue: AccessibilityIssue
  ): boolean {
    // Prioritize security and critical issues
    if (issue.severity === 'critical' || issue.severity === 'blocker') {
      return false; // Be conservative for critical issues
    }

    // Use the review with higher confidence
    return claudeReview.confidence > chatgptReview.confidence 
      ? claudeReview.approved 
      : chatgptReview.approved;
  }

  private generateConflictResolution(claudeReview: AIReviewResult, chatgptReview: AIReviewResult): string {
    return `Disagreement resolved based on higher confidence score. Claude (${claudeReview.confidence}): ${claudeReview.approved ? 'Approved' : 'Rejected'}. ChatGPT (${chatgptReview.confidence}): ${chatgptReview.approved ? 'Approved' : 'Rejected'}.`;
  }

  private selectRecommendedApproach(
    claudeReview: AIReviewResult,
    chatgptReview: AIReviewResult,
    finalApproval: boolean
  ): string {
    if (finalApproval) {
      return 'Proceed with the fix as both AIs have reached consensus or the higher confidence review approved.';
    } else {
      return 'Manual review recommended due to AI concerns or disagreement.';
    }
  }

  async shutdown(): Promise<void> {
    await this.auditLogger.shutdown();
  }
}