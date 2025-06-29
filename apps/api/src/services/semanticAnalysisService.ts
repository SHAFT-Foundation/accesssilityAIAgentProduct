import { OpenAI } from 'openai';
import natural from 'natural';
import { Logger } from '../utils/logger';
import { CostTracker } from './costTracker';
import { MetricsCollector } from '../utils/metrics';

interface SemanticAnalysisResult {
  readabilityScore: ReadabilityMetrics;
  contentStructure: ContentStructure;
  languageAnalysis: LanguageAnalysis;
  accessibilityIssues: SemanticAccessibilityIssue[];
  suggestions: ContentSuggestion[];
  confidence: number;
}

interface ReadabilityMetrics {
  fleschKincaidGrade: number;
  fleschReadingEase: number;
  averageSentenceLength: number;
  averageWordLength: number;
  complexWordPercentage: number;
  wcagLevel: 'AAA' | 'AA' | 'A' | 'Fail';
}

interface ContentStructure {
  hasProperHeadings: boolean;
  headingHierarchy: HeadingInfo[];
  paragraphCount: number;
  listCount: number;
  hasLogicalFlow: boolean;
  structureIssues: string[];
}

interface LanguageAnalysis {
  primaryLanguage: string;
  languageComplexity: 'simple' | 'moderate' | 'complex' | 'very_complex';
  jargonWords: string[];
  idioms: string[];
  ambiguousTerms: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
}

interface SemanticAccessibilityIssue {
  type: 'complex_language' | 'missing_structure' | 'ambiguous_content' | 'jargon_heavy' | 'poor_readability';
  severity: 'error' | 'warning' | 'info';
  description: string;
  location: string;
  wcagCriteria: string[];
  suggestedFix?: string;
}

interface ContentSuggestion {
  type: 'simplify' | 'restructure' | 'clarify' | 'add_context';
  original: string;
  suggested: string;
  reason: string;
  impact: 'high' | 'medium' | 'low';
}

interface HeadingInfo {
  level: number;
  text: string;
  id?: string;
  isProperlyNested: boolean;
}

export class SemanticAnalysisService {
  private openai: OpenAI;
  private logger: Logger;
  private costTracker: CostTracker;
  private metrics: MetricsCollector;
  private tokenizer: any;
  private sentenceDetector: any;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });
    this.logger = new Logger('SemanticAnalysisService');
    this.costTracker = new CostTracker();
    this.metrics = new MetricsCollector('semantic_analysis');
    
    // Initialize NLP tools
    this.tokenizer = new natural.WordTokenizer();
    this.sentenceDetector = new natural.SentenceTokenizer();
  }

  async analyzeContent(
    content: string,
    context: {
      elementType: string;
      pageTitle?: string;
      targetAudience?: string;
      contentType?: 'navigation' | 'main' | 'form' | 'article';
    }
  ): Promise<SemanticAnalysisResult> {
    const startTime = Date.now();

    try {
      // Run analyses in parallel
      const [
        readabilityMetrics,
        contentStructure,
        languageAnalysis,
        aiAnalysis,
      ] = await Promise.all([
        this.calculateReadability(content),
        this.analyzeContentStructure(content, context),
        this.analyzeLanguage(content),
        this.performAIAnalysis(content, context),
      ]);

      // Identify accessibility issues
      const accessibilityIssues = this.identifyAccessibilityIssues(
        readabilityMetrics,
        contentStructure,
        languageAnalysis,
        aiAnalysis
      );

      // Generate suggestions
      const suggestions = await this.generateSuggestions(
        content,
        accessibilityIssues,
        context
      );

      const result: SemanticAnalysisResult = {
        readabilityScore: readabilityMetrics,
        contentStructure,
        languageAnalysis,
        accessibilityIssues,
        suggestions,
        confidence: this.calculateConfidence(aiAnalysis),
      };

      // Record metrics
      this.metrics.recordLatency('semantic_analysis', Date.now() - startTime);
      this.metrics.recordAnalysis('semantic', readabilityMetrics.fleschReadingEase);

      return result;
    } catch (error) {
      this.logger.error('Semantic analysis failed', { error });
      this.metrics.recordError('semantic_analysis', error as Error);
      throw error;
    }
  }

  private calculateReadability(text: string): ReadabilityMetrics {
    const sentences = this.sentenceDetector.tokenize(text);
    const words = this.tokenizer.tokenize(text);
    
    // Calculate basic metrics
    const totalWords = words.length;
    const totalSentences = sentences.length;
    const totalSyllables = words.reduce((sum, word) => sum + this.countSyllables(word), 0);
    
    // Flesch Reading Ease
    const fleschReadingEase = 206.835 - 
      1.015 * (totalWords / totalSentences) - 
      84.6 * (totalSyllables / totalWords);
    
    // Flesch-Kincaid Grade Level
    const fleschKincaidGrade = 0.39 * (totalWords / totalSentences) + 
      11.8 * (totalSyllables / totalWords) - 15.59;
    
    // Complex words (3+ syllables)
    const complexWords = words.filter(word => this.countSyllables(word) >= 3);
    const complexWordPercentage = (complexWords.length / totalWords) * 100;
    
    // Average word length
    const totalCharacters = words.reduce((sum, word) => sum + word.length, 0);
    const averageWordLength = totalCharacters / totalWords;
    
    // Determine WCAG level based on reading ease
    let wcagLevel: 'AAA' | 'AA' | 'A' | 'Fail' = 'Fail';
    if (fleschReadingEase >= 60) wcagLevel = 'AAA';
    else if (fleschReadingEase >= 50) wcagLevel = 'AA';
    else if (fleschReadingEase >= 40) wcagLevel = 'A';
    
    return {
      fleschKincaidGrade: Math.round(fleschKincaidGrade * 10) / 10,
      fleschReadingEase: Math.round(fleschReadingEase * 10) / 10,
      averageSentenceLength: Math.round((totalWords / totalSentences) * 10) / 10,
      averageWordLength: Math.round(averageWordLength * 10) / 10,
      complexWordPercentage: Math.round(complexWordPercentage * 10) / 10,
      wcagLevel,
    };
  }

  private analyzeContentStructure(content: string, context: any): ContentStructure {
    // Parse HTML content for structure analysis
    const headingRegex = /<h([1-6])[^>]*>(.*?)<\/h\1>/gi;
    const paragraphRegex = /<p[^>]*>/gi;
    const listRegex = /<(ul|ol)[^>]*>/gi;
    
    const headings: HeadingInfo[] = [];
    let match;
    
    while ((match = headingRegex.exec(content)) !== null) {
      headings.push({
        level: parseInt(match[1]),
        text: match[2].replace(/<[^>]*>/g, ''), // Strip inner HTML
        isProperlyNested: true, // Will validate below
      });
    }
    
    // Validate heading hierarchy
    const structureIssues: string[] = [];
    let lastLevel = 0;
    
    headings.forEach((heading, index) => {
      if (index === 0 && heading.level !== 1) {
        structureIssues.push('First heading should be H1');
      }
      
      if (heading.level > lastLevel + 1) {
        heading.isProperlyNested = false;
        structureIssues.push(`Heading level ${heading.level} skips levels`);
      }
      
      lastLevel = heading.level;
    });
    
    const paragraphCount = (content.match(paragraphRegex) || []).length;
    const listCount = (content.match(listRegex) || []).length;
    
    return {
      hasProperHeadings: headings.length > 0 && structureIssues.length === 0,
      headingHierarchy: headings,
      paragraphCount,
      listCount,
      hasLogicalFlow: this.assessLogicalFlow(headings, paragraphCount),
      structureIssues,
    };
  }

  private analyzeLanguage(content: string): LanguageAnalysis {
    const words = this.tokenizer.tokenize(content.toLowerCase());
    
    // Common jargon terms (would be more comprehensive in production)
    const jargonList = ['utilize', 'leverage', 'synergize', 'paradigm', 'methodology'];
    const idiomList = ['piece of cake', 'break a leg', 'hit the nail on the head'];
    const ambiguousTerms = ['it', 'this', 'that', 'they', 'them'];
    
    const jargonWords = words.filter(word => jargonList.includes(word));
    const idioms = this.detectIdioms(content, idiomList);
    const ambiguous = words.filter(word => ambiguousTerms.includes(word));
    
    // Sentiment analysis
    const sentimentAnalyzer = new natural.SentimentAnalyzer('English', 
      natural.PorterStemmer, 'afinn');
    const sentiment = sentimentAnalyzer.getSentiment(words);
    
    // Determine complexity
    let languageComplexity: 'simple' | 'moderate' | 'complex' | 'very_complex' = 'simple';
    const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
    
    if (avgWordLength > 6 || jargonWords.length > words.length * 0.1) {
      languageComplexity = 'very_complex';
    } else if (avgWordLength > 5 || jargonWords.length > words.length * 0.05) {
      languageComplexity = 'complex';
    } else if (avgWordLength > 4) {
      languageComplexity = 'moderate';
    }
    
    return {
      primaryLanguage: 'en', // Would use language detection in production
      languageComplexity,
      jargonWords: [...new Set(jargonWords)],
      idioms,
      ambiguousTerms: [...new Set(ambiguous)].slice(0, 10), // Limit to top 10
      sentiment: sentiment > 0.1 ? 'positive' : sentiment < -0.1 ? 'negative' : 'neutral',
    };
  }

  private async performAIAnalysis(content: string, context: any): Promise<any> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `You are an accessibility expert analyzing content for WCAG compliance.
                     Focus on semantic clarity, readability, and cognitive accessibility.
                     Consider the target audience: ${context.targetAudience || 'general public'}.`,
          },
          {
            role: 'user',
            content: `Analyze this content for accessibility:
                     
                     Content type: ${context.contentType || 'general'}
                     Element type: ${context.elementType}
                     
                     Content:
                     ${content.substring(0, 2000)} ${content.length > 2000 ? '...[truncated]' : ''}
                     
                     Identify:
                     1. Clarity issues
                     2. Cognitive load concerns
                     3. Ambiguous language
                     4. Missing context
                     5. Suggestions for improvement`,
          },
        ],
        max_tokens: 500,
        temperature: 0.3,
      });

      const analysis = response.choices[0].message.content!;
      
      // Track costs
      await this.costTracker.trackUsage('openai', 'gpt-4-turbo', {
        input_tokens: response.usage?.prompt_tokens || 0,
        output_tokens: response.usage?.completion_tokens || 0,
      });
      
      return this.parseAIAnalysis(analysis);
    } catch (error) {
      if (error instanceof Error && error.message.includes('rate_limit')) {
        // Implement retry with backoff
        await this.handleRateLimitWithBackoff(error);
        return this.performAIAnalysis(content, context);
      }
      throw error;
    }
  }

  private identifyAccessibilityIssues(
    readability: ReadabilityMetrics,
    structure: ContentStructure,
    language: LanguageAnalysis,
    aiAnalysis: any
  ): SemanticAccessibilityIssue[] {
    const issues: SemanticAccessibilityIssue[] = [];

    // Check readability
    if (readability.wcagLevel === 'Fail' || readability.fleschKincaidGrade > 9) {
      issues.push({
        type: 'poor_readability',
        severity: 'error',
        description: `Content requires ${readability.fleschKincaidGrade}th grade reading level (target: 9th grade or lower)`,
        location: 'document',
        wcagCriteria: ['3.1.5'],
        suggestedFix: 'Simplify language and sentence structure',
      });
    }

    // Check language complexity
    if (language.languageComplexity === 'very_complex') {
      issues.push({
        type: 'complex_language',
        severity: 'warning',
        description: 'Language is too complex for general audience',
        location: 'document',
        wcagCriteria: ['3.1.5'],
      });
    }

    // Check jargon usage
    if (language.jargonWords.length > 5) {
      issues.push({
        type: 'jargon_heavy',
        severity: 'warning',
        description: `Content contains ${language.jargonWords.length} jargon terms`,
        location: 'document',
        wcagCriteria: ['3.1.3'],
        suggestedFix: 'Define technical terms or use simpler alternatives',
      });
    }

    // Check structure
    if (!structure.hasProperHeadings) {
      issues.push({
        type: 'missing_structure',
        severity: 'error',
        description: 'Content lacks proper heading structure',
        location: 'document',
        wcagCriteria: ['1.3.1', '2.4.6'],
      });
    }

    // Add AI-identified issues
    if (aiAnalysis.issues) {
      issues.push(...aiAnalysis.issues);
    }

    return issues;
  }

  private async generateSuggestions(
    content: string,
    issues: SemanticAccessibilityIssue[],
    context: any
  ): Promise<ContentSuggestion[]> {
    const suggestions: ContentSuggestion[] = [];

    // Generate suggestions for each issue type
    for (const issue of issues) {
      switch (issue.type) {
        case 'complex_language':
          const simplifiedSuggestions = await this.generateSimplificationSuggestions(
            content,
            context
          );
          suggestions.push(...simplifiedSuggestions);
          break;

        case 'jargon_heavy':
          const jargonReplacements = this.generateJargonReplacements(content);
          suggestions.push(...jargonReplacements);
          break;

        case 'poor_readability':
          const readabilitySuggestions = this.generateReadabilitySuggestions(content);
          suggestions.push(...readabilitySuggestions);
          break;

        case 'ambiguous_content':
          const clarifications = await this.generateClarifications(content, context);
          suggestions.push(...clarifications);
          break;
      }
    }

    // Sort by impact
    return suggestions.sort((a, b) => {
      const impactOrder = { high: 3, medium: 2, low: 1 };
      return impactOrder[b.impact] - impactOrder[a.impact];
    });
  }

  private async generateSimplificationSuggestions(
    content: string,
    context: any
  ): Promise<ContentSuggestion[]> {
    const sentences = this.sentenceDetector.tokenize(content);
    const suggestions: ContentSuggestion[] = [];

    // Find complex sentences
    const complexSentences = sentences.filter(sentence => {
      const words = this.tokenizer.tokenize(sentence);
      return words.length > 20 || this.countSyllables(sentence) / words.length > 2;
    });

    // Use AI to simplify top 3 complex sentences
    for (const sentence of complexSentences.slice(0, 3)) {
      try {
        const response = await this.openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'Simplify this sentence for a 9th grade reading level. Keep the meaning but use simpler words and shorter sentences.',
            },
            {
              role: 'user',
              content: sentence,
            },
          ],
          max_tokens: 100,
          temperature: 0.3,
        });

        const simplified = response.choices[0].message.content!;
        
        suggestions.push({
          type: 'simplify',
          original: sentence,
          suggested: simplified,
          reason: 'Sentence is too complex for target reading level',
          impact: 'high',
        });
      } catch (error) {
        this.logger.warn('Failed to generate simplification', { error });
      }
    }

    return suggestions;
  }

  private generateJargonReplacements(content: string): ContentSuggestion[] {
    const jargonMap: Record<string, string> = {
      'utilize': 'use',
      'leverage': 'use',
      'implement': 'do',
      'facilitate': 'help',
      'optimize': 'improve',
      'synergize': 'work together',
      'paradigm': 'model',
      'methodology': 'method',
    };

    const suggestions: ContentSuggestion[] = [];
    
    Object.entries(jargonMap).forEach(([jargon, replacement]) => {
      if (content.toLowerCase().includes(jargon)) {
        suggestions.push({
          type: 'simplify',
          original: jargon,
          suggested: replacement,
          reason: 'Technical jargon may confuse users',
          impact: 'medium',
        });
      }
    });

    return suggestions;
  }

  private generateReadabilitySuggestions(content: string): ContentSuggestion[] {
    const suggestions: ContentSuggestion[] = [];
    const sentences = this.sentenceDetector.tokenize(content);

    // Suggest breaking long sentences
    sentences.forEach(sentence => {
      const words = this.tokenizer.tokenize(sentence);
      if (words.length > 20) {
        suggestions.push({
          type: 'restructure',
          original: sentence,
          suggested: 'Break this into 2-3 shorter sentences',
          reason: 'Sentence is too long (over 20 words)',
          impact: 'high',
        });
      }
    });

    return suggestions;
  }

  private async generateClarifications(
    content: string,
    context: any
  ): Promise<ContentSuggestion[]> {
    // Find sentences with ambiguous pronouns
    const pronounRegex = /\b(it|this|that|they|them)\b/gi;
    const sentences = this.sentenceDetector.tokenize(content);
    const suggestions: ContentSuggestion[] = [];

    sentences.forEach((sentence, index) => {
      const matches = sentence.match(pronounRegex);
      if (matches && matches.length > 2) {
        suggestions.push({
          type: 'clarify',
          original: sentence,
          suggested: 'Replace pronouns with specific nouns',
          reason: 'Multiple ambiguous pronouns may confuse readers',
          impact: 'medium',
        });
      }
    });

    return suggestions;
  }

  private countSyllables(word: string): number {
    word = word.toLowerCase();
    let count = 0;
    let previousWasVowel = false;
    
    for (let i = 0; i < word.length; i++) {
      const isVowel = /[aeiou]/.test(word[i]);
      if (isVowel && !previousWasVowel) {
        count++;
      }
      previousWasVowel = isVowel;
    }
    
    // Adjust for silent e
    if (word.endsWith('e')) {
      count--;
    }
    
    // Ensure at least 1 syllable
    return Math.max(1, count);
  }

  private assessLogicalFlow(headings: HeadingInfo[], paragraphCount: number): boolean {
    // Basic assessment of content flow
    if (headings.length === 0 && paragraphCount > 5) {
      return false; // Long content without structure
    }
    
    if (headings.length > 0 && paragraphCount / headings.length < 2) {
      return false; // Too many headings, not enough content
    }
    
    return true;
  }

  private detectIdioms(content: string, idiomList: string[]): string[] {
    const foundIdioms: string[] = [];
    const lowerContent = content.toLowerCase();
    
    idiomList.forEach(idiom => {
      if (lowerContent.includes(idiom)) {
        foundIdioms.push(idiom);
      }
    });
    
    return foundIdioms;
  }

  private parseAIAnalysis(analysis: string): any {
    // Parse structured AI response
    const result: any = {
      issues: [],
      clarityScore: 0,
      suggestions: [],
    };

    // Extract issues and suggestions from AI response
    const lines = analysis.split('\n');
    let currentSection = '';
    
    lines.forEach(line => {
      if (line.includes('Clarity issues:')) {
        currentSection = 'clarity';
      } else if (line.includes('Cognitive load:')) {
        currentSection = 'cognitive';
      } else if (line.includes('Suggestions:')) {
        currentSection = 'suggestions';
      } else if (line.trim() && currentSection) {
        // Process based on section
        if (currentSection === 'clarity' || currentSection === 'cognitive') {
          result.issues.push({
            type: 'ambiguous_content',
            severity: 'warning',
            description: line.trim(),
            location: 'content',
            wcagCriteria: ['3.1.5'],
          });
        }
      }
    });

    return result;
  }

  private calculateConfidence(aiAnalysis: any): number {
    // Base confidence on quality of analysis
    let confidence = 0.7;
    
    if (aiAnalysis.issues && aiAnalysis.issues.length > 0) {
      confidence += 0.1;
    }
    
    if (aiAnalysis.suggestions && aiAnalysis.suggestions.length > 0) {
      confidence += 0.1;
    }
    
    return Math.min(0.95, confidence);
  }

  private async handleRateLimitWithBackoff(error: Error): Promise<void> {
    const retryAfter = this.extractRetryAfter(error.message);
    const backoffTime = retryAfter || this.calculateExponentialBackoff();
    
    this.logger.warn(`Rate limited, waiting ${backoffTime}ms before retry`);
    await new Promise(resolve => setTimeout(resolve, backoffTime));
  }

  private extractRetryAfter(errorMessage: string): number | null {
    const match = errorMessage.match(/retry after (\d+)/i);
    return match ? parseInt(match[1]) * 1000 : null;
  }

  private calculateExponentialBackoff(): number {
    const baseDelay = 1000;
    const maxDelay = 60000;
    const attempt = this.metrics.getRetryCount('semantic_api');
    
    const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
    return delay + Math.random() * 1000; // Add jitter
  }

  async shutdown(): Promise<void> {
    await this.metrics.flush();
  }
}