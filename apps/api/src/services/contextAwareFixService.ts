import { OpenAI } from 'openai';
import { Anthropic } from '@anthropic-ai/sdk';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Logger } from '../utils/logger';
import { CostTracker } from './costTracker';
import { MetricsCollector } from '../utils/metrics';
import { AccessibilityIssue } from '../types/accessibility';

interface RepositoryContext {
  framework: string;
  language: string;
  buildTool: string;
  testFramework: string;
  dependencies: string[];
  componentStructure: ComponentInfo[];
  codingPatterns: CodingPattern[];
  existingA11yImplementations: A11yImplementation[];
}

interface ComponentInfo {
  name: string;
  type: 'component' | 'hook' | 'util' | 'page';
  framework: string;
  dependencies: string[];
  a11yFeatures: string[];
  testCoverage: number;
}

interface CodingPattern {
  pattern: string;
  frequency: number;
  category: 'styling' | 'state' | 'props' | 'testing' | 'accessibility';
  examples: string[];
}

interface A11yImplementation {
  type: string;
  implementation: string;
  context: string;
  effectiveness: number;
}

interface ContextAwareFix {
  id: string;
  issueId: string;
  originalCode: string;
  fixedCode: string;
  explanation: string;
  rationale: string;
  contextFactors: string[];
  confidence: number;
  testSuggestions: string[];
  dependencies: string[];
  impactAssessment: ImpactAssessment;
  alternativeApproaches: AlternativeFix[];
}

interface ImpactAssessment {
  breakingChanges: boolean;
  performanceImpact: 'none' | 'minimal' | 'moderate' | 'significant';
  testingRequired: boolean;
  deploymentRisk: 'low' | 'medium' | 'high';
  maintenanceComplexity: 'low' | 'medium' | 'high';
}

interface AlternativeFix {
  approach: string;
  code: string;
  pros: string[];
  cons: string[];
  suitability: number;
}

export class ContextAwareFixService {
  private openai: OpenAI;
  private anthropic: Anthropic;
  private logger: Logger;
  private costTracker: CostTracker;
  private metrics: MetricsCollector;
  private contextCache: Map<string, RepositoryContext>;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });
    this.logger = new Logger('ContextAwareFixService');
    this.costTracker = new CostTracker();
    this.metrics = new MetricsCollector('context_aware_fixes');
    this.contextCache = new Map();
  }

  async generateContextAwareFix(
    issue: AccessibilityIssue,
    repositoryPath: string,
    fileContext: {
      filePath: string;
      content: string;
      imports: string[];
      exports: string[];
    }
  ): Promise<ContextAwareFix> {
    const startTime = Date.now();
    
    try {
      // Analyze repository context
      const repoContext = await this.analyzeRepositoryContext(repositoryPath);
      
      // Analyze file-specific context
      const fileAnalysis = await this.analyzeFileContext(fileContext, repoContext);
      
      // Generate fix with both AI models
      const [claudeFix, openAIFix] = await Promise.all([
        this.generateFixWithClaude(issue, fileContext, repoContext, fileAnalysis),
        this.generateFixWithOpenAI(issue, fileContext, repoContext, fileAnalysis),
      ]);
      
      // Create consensus fix
      const consensusFix = this.createConsensusFix(claudeFix, openAIFix, issue);
      
      // Enhance with additional context
      const enhancedFix = await this.enhanceFixWithContext(
        consensusFix,
        repoContext,
        fileAnalysis
      );
      
      // Generate alternatives
      const alternatives = await this.generateAlternativeApproaches(
        enhancedFix,
        repoContext,
        fileAnalysis
      );
      
      const contextAwareFix: ContextAwareFix = {
        id: `fix-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        issueId: issue.id,
        originalCode: enhancedFix.originalCode,
        fixedCode: enhancedFix.fixedCode,
        explanation: enhancedFix.explanation,
        rationale: enhancedFix.rationale,
        contextFactors: enhancedFix.contextFactors,
        confidence: this.calculateConfidence(claudeFix, openAIFix, repoContext),
        testSuggestions: await this.generateTestSuggestions(enhancedFix, repoContext),
        dependencies: this.extractDependencies(enhancedFix, repoContext),
        impactAssessment: this.assessImpact(enhancedFix, repoContext),
        alternativeApproaches: alternatives,
      };
      
      // Record metrics
      this.metrics.recordLatency('context_aware_fix', Date.now() - startTime);
      this.metrics.recordFixGeneration(contextAwareFix.confidence);
      
      return contextAwareFix;
    } catch (error) {
      this.logger.error('Context-aware fix generation failed', { error, issueId: issue.id });
      this.metrics.recordError('context_aware_fix', error as Error);
      throw error;
    }
  }

  private async analyzeRepositoryContext(repositoryPath: string): Promise<RepositoryContext> {
    const cacheKey = repositoryPath;
    
    if (this.contextCache.has(cacheKey)) {
      return this.contextCache.get(cacheKey)!;
    }

    try {
      // Analyze package.json
      const packageJson = JSON.parse(
        readFileSync(join(repositoryPath, 'package.json'), 'utf8')
      );
      
      // Detect framework and tools
      const framework = this.detectFramework(packageJson);
      const buildTool = this.detectBuildTool(repositoryPath);
      const testFramework = this.detectTestFramework(packageJson);
      
      // Analyze component structure
      const componentStructure = await this.analyzeComponentStructure(repositoryPath);
      
      // Identify coding patterns
      const codingPatterns = await this.identifyCodingPatterns(repositoryPath);
      
      // Find existing accessibility implementations
      const existingA11yImplementations = await this.findExistingA11yImplementations(
        repositoryPath
      );
      
      const context: RepositoryContext = {
        framework,
        language: this.detectLanguage(packageJson),
        buildTool,
        testFramework,
        dependencies: Object.keys(packageJson.dependencies || {}),
        componentStructure,
        codingPatterns,
        existingA11yImplementations,
      };
      
      this.contextCache.set(cacheKey, context);
      return context;
    } catch (error) {
      this.logger.warn('Repository context analysis failed', { error, repositoryPath });
      return this.getDefaultContext();
    }
  }

  private async analyzeFileContext(
    fileContext: any,
    repoContext: RepositoryContext
  ): Promise<any> {
    const fileAnalysis = {
      componentType: this.detectComponentType(fileContext.content),
      stateManagement: this.detectStateManagement(fileContext.content),
      stylingApproach: this.detectStylingApproach(fileContext.content, repoContext),
      testingPatterns: this.detectTestingPatterns(fileContext.content),
      a11yFeatures: this.detectExistingA11yFeatures(fileContext.content),
      complexityScore: this.calculateComplexityScore(fileContext.content),
      dependencies: this.analyzeDependencies(fileContext.imports, repoContext),
    };
    
    return fileAnalysis;
  }

  private async generateFixWithClaude(
    issue: AccessibilityIssue,
    fileContext: any,
    repoContext: RepositoryContext,
    fileAnalysis: any
  ): Promise<any> {
    const prompt = this.buildClaudePrompt(issue, fileContext, repoContext, fileAnalysis);
    
    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1500,
        temperature: 0.3,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });
      
      const content = response.content[0].type === 'text' ? response.content[0].text : '';
      
      // Track costs
      await this.costTracker.trackUsage('anthropic', 'claude-3-5-sonnet', {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
      });
      
      return this.parseClaudeResponse(content, issue);
    } catch (error) {
      if (error instanceof Error && error.message.includes('rate_limit')) {
        await this.handleRateLimitWithBackoff(error, 'claude');
        return this.generateFixWithClaude(issue, fileContext, repoContext, fileAnalysis);
      }
      throw error;
    }
  }

  private async generateFixWithOpenAI(
    issue: AccessibilityIssue,
    fileContext: any,
    repoContext: RepositoryContext,
    fileAnalysis: any
  ): Promise<any> {
    const prompt = this.buildOpenAIPrompt(issue, fileContext, repoContext, fileAnalysis);
    
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are an expert accessibility developer who generates context-aware fixes.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 1500,
        temperature: 0.3,
      });
      
      const content = response.choices[0].message.content!;
      
      // Track costs
      await this.costTracker.trackUsage('openai', 'gpt-4-turbo', {
        input_tokens: response.usage?.prompt_tokens || 0,
        output_tokens: response.usage?.completion_tokens || 0,
      });
      
      return this.parseOpenAIResponse(content, issue);
    } catch (error) {
      if (error instanceof Error && error.message.includes('rate_limit')) {
        await this.handleRateLimitWithBackoff(error, 'openai');
        return this.generateFixWithOpenAI(issue, fileContext, repoContext, fileAnalysis);
      }
      throw error;
    }
  }

  private buildClaudePrompt(
    issue: AccessibilityIssue,
    fileContext: any,
    repoContext: RepositoryContext,
    fileAnalysis: any
  ): string {
    return `
Generate a context-aware accessibility fix for the following issue:

ISSUE DETAILS:
- Type: ${issue.type}
- Severity: ${issue.severity}
- Description: ${issue.description}
- WCAG Criteria: ${issue.wcagCriteria.join(', ')}
- Element: ${issue.element}
- Code: ${issue.code}

REPOSITORY CONTEXT:
- Framework: ${repoContext.framework}
- Language: ${repoContext.language}
- Build Tool: ${repoContext.buildTool}
- Test Framework: ${repoContext.testFramework}
- Key Dependencies: ${repoContext.dependencies.slice(0, 10).join(', ')}

FILE CONTEXT:
- Path: ${fileContext.filePath}
- Component Type: ${fileAnalysis.componentType}
- Styling Approach: ${fileAnalysis.stylingApproach}
- State Management: ${fileAnalysis.stateManagement}
- Existing A11y Features: ${fileAnalysis.a11yFeatures.join(', ')}

EXISTING PATTERNS:
${repoContext.existingA11yImplementations.slice(0, 3).map(impl => 
  `- ${impl.type}: ${impl.implementation}`
).join('\n')}

Please provide:
1. Fixed code that follows the repository's patterns
2. Explanation of the fix
3. Rationale for the chosen approach
4. Context factors that influenced the decision
5. Any new dependencies needed

Ensure the fix is consistent with the existing codebase style and patterns.
    `.trim();
  }

  private buildOpenAIPrompt(
    issue: AccessibilityIssue,
    fileContext: any,
    repoContext: RepositoryContext,
    fileAnalysis: any
  ): string {
    return `
Fix this accessibility issue while maintaining consistency with the codebase:

ISSUE: ${issue.type} - ${issue.description}
ELEMENT: ${issue.element}
CURRENT CODE: ${issue.code}

CODEBASE CONTEXT:
- Framework: ${repoContext.framework}
- Styling: ${fileAnalysis.stylingApproach}
- Testing: ${repoContext.testFramework}

REQUIREMENTS:
- Follow existing code patterns
- Maintain current functionality
- Use appropriate accessibility standards
- Consider performance impact

Provide the fixed code with explanation.
    `.trim();
  }

  private createConsensusFix(claudeFix: any, openAIFix: any, issue: AccessibilityIssue): any {
    // Compare approaches and create consensus
    const consensusFix = {
      originalCode: issue.code,
      fixedCode: this.selectBestFixedCode(claudeFix, openAIFix),
      explanation: this.combineExplanations(claudeFix, openAIFix),
      rationale: this.combineRationales(claudeFix, openAIFix),
      contextFactors: this.combineContextFactors(claudeFix, openAIFix),
    };
    
    return consensusFix;
  }

  private async enhanceFixWithContext(
    fix: any,
    repoContext: RepositoryContext,
    fileAnalysis: any
  ): Promise<any> {
    // Add repository-specific enhancements
    const enhanced = { ...fix };
    
    // Add framework-specific improvements
    if (repoContext.framework === 'react') {
      enhanced.fixedCode = this.enhanceForReact(enhanced.fixedCode, fileAnalysis);
    } else if (repoContext.framework === 'vue') {
      enhanced.fixedCode = this.enhanceForVue(enhanced.fixedCode, fileAnalysis);
    }
    
    // Add testing considerations
    if (repoContext.testFramework) {
      enhanced.testSuggestions = this.generateFrameworkTestSuggestions(
        enhanced,
        repoContext.testFramework
      );
    }
    
    return enhanced;
  }

  private async generateAlternativeApproaches(
    fix: any,
    repoContext: RepositoryContext,
    fileAnalysis: any
  ): Promise<AlternativeFix[]> {
    const alternatives: AlternativeFix[] = [];
    
    // Generate alternative approaches based on context
    if (repoContext.framework === 'react') {
      alternatives.push(...this.generateReactAlternatives(fix, fileAnalysis));
    }
    
    // Add framework-agnostic alternatives
    alternatives.push(...this.generateGenericAlternatives(fix));
    
    // Score alternatives based on suitability
    return alternatives.map(alt => ({
      ...alt,
      suitability: this.calculateSuitability(alt, repoContext, fileAnalysis),
    })).sort((a, b) => b.suitability - a.suitability);
  }

  private async generateTestSuggestions(
    fix: any,
    repoContext: RepositoryContext
  ): Promise<string[]> {
    const suggestions: string[] = [];
    
    // Framework-specific test suggestions
    if (repoContext.testFramework === 'jest') {
      suggestions.push(...this.generateJestTestSuggestions(fix));
    } else if (repoContext.testFramework === 'vitest') {
      suggestions.push(...this.generateVitestTestSuggestions(fix));
    }
    
    // General accessibility test suggestions
    suggestions.push(...this.generateA11yTestSuggestions(fix));
    
    return suggestions;
  }

  private detectFramework(packageJson: any): string {
    const deps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };
    
    if (deps.react) return 'react';
    if (deps.vue) return 'vue';
    if (deps.angular) return 'angular';
    if (deps.svelte) return 'svelte';
    
    return 'vanilla';
  }

  private detectBuildTool(repositoryPath: string): string {
    try {
      if (readFileSync(join(repositoryPath, 'vite.config.js'), 'utf8')) return 'vite';
    } catch {}
    
    try {
      if (readFileSync(join(repositoryPath, 'webpack.config.js'), 'utf8')) return 'webpack';
    } catch {}
    
    try {
      if (readFileSync(join(repositoryPath, 'next.config.js'), 'utf8')) return 'next';
    } catch {}
    
    return 'unknown';
  }

  private detectTestFramework(packageJson: any): string {
    const deps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };
    
    if (deps.vitest) return 'vitest';
    if (deps.jest) return 'jest';
    if (deps.mocha) return 'mocha';
    if (deps.jasmine) return 'jasmine';
    
    return 'none';
  }

  private detectLanguage(packageJson: any): string {
    const deps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };
    
    if (deps.typescript || deps['@types/node']) return 'typescript';
    return 'javascript';
  }

  private async analyzeComponentStructure(repositoryPath: string): Promise<ComponentInfo[]> {
    // Analyze component structure - simplified implementation
    return [
      {
        name: 'Component',
        type: 'component',
        framework: 'react',
        dependencies: [],
        a11yFeatures: [],
        testCoverage: 0,
      },
    ];
  }

  private async identifyCodingPatterns(repositoryPath: string): Promise<CodingPattern[]> {
    // Identify coding patterns - simplified implementation
    return [
      {
        pattern: 'arrow functions',
        frequency: 0.8,
        category: 'styling',
        examples: ['const Component = () => {}'],
      },
    ];
  }

  private async findExistingA11yImplementations(
    repositoryPath: string
  ): Promise<A11yImplementation[]> {
    // Find existing accessibility implementations - simplified
    return [
      {
        type: 'aria-label',
        implementation: 'aria-label="Button text"',
        context: 'button',
        effectiveness: 0.9,
      },
    ];
  }

  private getDefaultContext(): RepositoryContext {
    return {
      framework: 'react',
      language: 'typescript',
      buildTool: 'vite',
      testFramework: 'vitest',
      dependencies: [],
      componentStructure: [],
      codingPatterns: [],
      existingA11yImplementations: [],
    };
  }

  private detectComponentType(content: string): string {
    if (content.includes('useState') || content.includes('useEffect')) {
      return 'functional-component';
    }
    if (content.includes('class') && content.includes('extends')) {
      return 'class-component';
    }
    return 'unknown';
  }

  private detectStateManagement(content: string): string {
    if (content.includes('useState')) return 'hooks';
    if (content.includes('redux')) return 'redux';
    if (content.includes('zustand')) return 'zustand';
    return 'none';
  }

  private detectStylingApproach(content: string, repoContext: RepositoryContext): string {
    if (content.includes('styled-components')) return 'styled-components';
    if (content.includes('emotion')) return 'emotion';
    if (content.includes('className')) return 'css-modules';
    if (repoContext.dependencies.includes('tailwindcss')) return 'tailwind';
    return 'css';
  }

  private detectTestingPatterns(content: string): string[] {
    const patterns: string[] = [];
    if (content.includes('describe')) patterns.push('describe-it');
    if (content.includes('test(')) patterns.push('test-function');
    return patterns;
  }

  private detectExistingA11yFeatures(content: string): string[] {
    const features: string[] = [];
    if (content.includes('aria-')) features.push('aria-attributes');
    if (content.includes('role=')) features.push('roles');
    if (content.includes('tabIndex')) features.push('keyboard-navigation');
    return features;
  }

  private calculateComplexityScore(content: string): number {
    const lines = content.split('\n').length;
    const functions = (content.match(/function|=>/g) || []).length;
    const conditions = (content.match(/if|switch|case/g) || []).length;
    
    return (lines * 0.1) + (functions * 2) + (conditions * 1.5);
  }

  private analyzeDependencies(imports: string[], repoContext: RepositoryContext): string[] {
    return imports.filter(imp => repoContext.dependencies.includes(imp));
  }

  private parseClaudeResponse(content: string, issue: AccessibilityIssue): any {
    // Parse structured response from Claude
    const sections = content.split('\n\n');
    return {
      fixedCode: this.extractCodeFromResponse(content),
      explanation: this.extractExplanation(content),
      rationale: this.extractRationale(content),
      contextFactors: this.extractContextFactors(content),
    };
  }

  private parseOpenAIResponse(content: string, issue: AccessibilityIssue): any {
    // Parse structured response from OpenAI
    return {
      fixedCode: this.extractCodeFromResponse(content),
      explanation: this.extractExplanation(content),
      rationale: this.extractRationale(content),
      contextFactors: [],
    };
  }

  private extractCodeFromResponse(content: string): string {
    // Extract code blocks from response
    const codeMatch = content.match(/```[\w]*\n([\s\S]*?)\n```/);
    return codeMatch ? codeMatch[1] : '';
  }

  private extractExplanation(content: string): string {
    // Extract explanation from response
    const lines = content.split('\n');
    const explanationStart = lines.findIndex(line => 
      line.toLowerCase().includes('explanation')
    );
    
    if (explanationStart !== -1) {
      return lines.slice(explanationStart + 1, explanationStart + 3).join(' ');
    }
    
    return 'Fix improves accessibility compliance';
  }

  private extractRationale(content: string): string {
    // Extract rationale from response
    const rationaleMatch = content.match(/rationale[:\s]+(.*)/i);
    return rationaleMatch ? rationaleMatch[1] : 'Follows accessibility best practices';
  }

  private extractContextFactors(content: string): string[] {
    // Extract context factors from response
    const factorsMatch = content.match(/context factors[:\s]+(.*)/i);
    if (factorsMatch) {
      return factorsMatch[1].split(',').map(f => f.trim());
    }
    return [];
  }

  private selectBestFixedCode(claudeFix: any, openAIFix: any): string {
    // Compare and select best fixed code
    const claudeScore = this.scoreFixedCode(claudeFix.fixedCode);
    const openAIScore = this.scoreFixedCode(openAIFix.fixedCode);
    
    return claudeScore > openAIScore ? claudeFix.fixedCode : openAIFix.fixedCode;
  }

  private scoreFixedCode(code: string): number {
    let score = 0;
    
    // Score based on accessibility features
    if (code.includes('aria-')) score += 10;
    if (code.includes('role=')) score += 5;
    if (code.includes('tabIndex')) score += 5;
    if (code.includes('alt=')) score += 8;
    
    // Deduct for complexity
    const complexity = (code.match(/\{|\(|\[/g) || []).length;
    score -= complexity * 0.5;
    
    return score;
  }

  private combineExplanations(claudeFix: any, openAIFix: any): string {
    return `${claudeFix.explanation} ${openAIFix.explanation}`.trim();
  }

  private combineRationales(claudeFix: any, openAIFix: any): string {
    return `${claudeFix.rationale} ${openAIFix.rationale}`.trim();
  }

  private combineContextFactors(claudeFix: any, openAIFix: any): string[] {
    return [...new Set([...claudeFix.contextFactors, ...openAIFix.contextFactors])];
  }

  private enhanceForReact(code: string, fileAnalysis: any): string {
    // Add React-specific enhancements
    if (fileAnalysis.stateManagement === 'hooks' && !code.includes('useState')) {
      // Add hooks if appropriate
    }
    return code;
  }

  private enhanceForVue(code: string, fileAnalysis: any): string {
    // Add Vue-specific enhancements
    return code;
  }

  private generateFrameworkTestSuggestions(fix: any, testFramework: string): string[] {
    const suggestions: string[] = [];
    
    if (testFramework === 'jest') {
      suggestions.push('Test accessibility with @testing-library/jest-dom');
    } else if (testFramework === 'vitest') {
      suggestions.push('Test accessibility with @testing-library/user-event');
    }
    
    return suggestions;
  }

  private generateReactAlternatives(fix: any, fileAnalysis: any): AlternativeFix[] {
    return [
      {
        approach: 'Custom Hook',
        code: 'const useAccessibility = () => { /* hook implementation */ }',
        pros: ['Reusable', 'Testable'],
        cons: ['Additional complexity'],
        suitability: 0.8,
      },
    ];
  }

  private generateGenericAlternatives(fix: any): AlternativeFix[] {
    return [
      {
        approach: 'Inline Solution',
        code: fix.fixedCode,
        pros: ['Simple', 'Direct'],
        cons: ['Not reusable'],
        suitability: 0.6,
      },
    ];
  }

  private generateJestTestSuggestions(fix: any): string[] {
    return [
      'Test with screen reader queries',
      'Verify keyboard navigation',
      'Check ARIA attributes',
    ];
  }

  private generateVitestTestSuggestions(fix: any): string[] {
    return [
      'Use @testing-library/react',
      'Test accessibility with axe-core',
      'Verify focus management',
    ];
  }

  private generateA11yTestSuggestions(fix: any): string[] {
    return [
      'Run automated accessibility tests',
      'Test with screen readers',
      'Verify keyboard navigation',
      'Check color contrast',
    ];
  }

  private calculateConfidence(claudeFix: any, openAIFix: any, repoContext: RepositoryContext): number {
    let confidence = 0.5;
    
    // Increase confidence if both models agree
    if (this.fixesAreConsistent(claudeFix, openAIFix)) {
      confidence += 0.3;
    }
    
    // Increase confidence based on context quality
    if (repoContext.existingA11yImplementations.length > 0) {
      confidence += 0.1;
    }
    
    return Math.min(0.95, confidence);
  }

  private fixesAreConsistent(claudeFix: any, openAIFix: any): boolean {
    // Simple consistency check
    const claudeFeatures = (claudeFix.fixedCode.match(/aria-\w+/g) || []).length;
    const openAIFeatures = (openAIFix.fixedCode.match(/aria-\w+/g) || []).length;
    
    return Math.abs(claudeFeatures - openAIFeatures) <= 1;
  }

  private extractDependencies(fix: any, repoContext: RepositoryContext): string[] {
    const dependencies: string[] = [];
    
    // Check if fix requires new dependencies
    if (fix.fixedCode.includes('import')) {
      const importMatch = fix.fixedCode.match(/from ['"]([^'"]+)['"]/g);
      if (importMatch) {
        dependencies.push(...importMatch.map(imp => imp.split(/['"]/).slice(-2, -1)[0]));
      }
    }
    
    return dependencies.filter(dep => !repoContext.dependencies.includes(dep));
  }

  private assessImpact(fix: any, repoContext: RepositoryContext): ImpactAssessment {
    return {
      breakingChanges: this.hasBreakingChanges(fix),
      performanceImpact: this.assessPerformanceImpact(fix),
      testingRequired: true,
      deploymentRisk: this.assessDeploymentRisk(fix),
      maintenanceComplexity: this.assessMaintenanceComplexity(fix),
    };
  }

  private hasBreakingChanges(fix: any): boolean {
    // Check for breaking changes in the fix
    return fix.fixedCode.includes('BREAKING:') || 
           fix.fixedCode.length > fix.originalCode.length * 2;
  }

  private assessPerformanceImpact(fix: any): 'none' | 'minimal' | 'moderate' | 'significant' {
    const codeComplexity = (fix.fixedCode.match(/\{|\(|\[/g) || []).length;
    
    if (codeComplexity > 20) return 'significant';
    if (codeComplexity > 10) return 'moderate';
    if (codeComplexity > 5) return 'minimal';
    return 'none';
  }

  private assessDeploymentRisk(fix: any): 'low' | 'medium' | 'high' {
    if (fix.dependencies.length > 0) return 'medium';
    if (fix.fixedCode.includes('useEffect')) return 'medium';
    return 'low';
  }

  private assessMaintenanceComplexity(fix: any): 'low' | 'medium' | 'high' {
    const lines = fix.fixedCode.split('\n').length;
    
    if (lines > 20) return 'high';
    if (lines > 10) return 'medium';
    return 'low';
  }

  private calculateSuitability(
    alternative: AlternativeFix,
    repoContext: RepositoryContext,
    fileAnalysis: any
  ): number {
    let score = 0.5;
    
    // Adjust based on repository context
    if (repoContext.framework === 'react' && alternative.approach.includes('Hook')) {
      score += 0.2;
    }
    
    // Adjust based on file analysis
    if (fileAnalysis.complexityScore > 50 && alternative.approach.includes('Simple')) {
      score += 0.1;
    }
    
    return Math.min(1, score);
  }

  private async handleRateLimitWithBackoff(error: Error, provider: string): Promise<void> {
    const retryAfter = this.extractRetryAfter(error.message);
    const backoffTime = retryAfter || this.calculateExponentialBackoff(provider);
    
    this.logger.warn(`Rate limited for ${provider}, waiting ${backoffTime}ms before retry`);
    await new Promise(resolve => setTimeout(resolve, backoffTime));
  }

  private extractRetryAfter(errorMessage: string): number | null {
    const match = errorMessage.match(/retry after (\d+)/i);
    return match ? parseInt(match[1]) * 1000 : null;
  }

  private calculateExponentialBackoff(provider: string): number {
    const baseDelay = 1000;
    const maxDelay = 60000;
    const attempt = this.metrics.getRetryCount(provider);
    
    const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
    return delay + Math.random() * 1000; // Add jitter
  }

  async shutdown(): Promise<void> {
    await this.metrics.flush();
    this.contextCache.clear();
  }
}