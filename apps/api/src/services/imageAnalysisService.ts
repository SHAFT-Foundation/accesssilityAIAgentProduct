import { OpenAI } from 'openai';
import sharp from 'sharp';
import { createHash } from 'crypto';
import { Logger } from '../utils/logger';
import { CostTracker } from './costTracker';
import { MetricsCollector } from '../utils/metrics';

interface ImageAnalysisResult {
  hasText: boolean;
  textContent?: string;
  hasInformativeContent: boolean;
  suggestedAltText: string;
  colorContrast: ColorContrastInfo;
  accessibility: AccessibilityInfo;
  confidence: number;
  analysisId: string;
}

interface ColorContrastInfo {
  ratio: number;
  meetsWCAG_AA: boolean;
  meetsWCAG_AAA: boolean;
  foregroundColor: string;
  backgroundColor: string;
  recommendations: string[];
}

interface AccessibilityInfo {
  issues: ImageAccessibilityIssue[];
  score: number;
  recommendations: string[];
}

interface ImageAccessibilityIssue {
  type: 'low_contrast' | 'text_in_image' | 'missing_caption' | 'complex_diagram' | 'color_only_info';
  severity: 'error' | 'warning' | 'info';
  description: string;
  wcagCriteria: string[];
}

export class ImageAnalysisService {
  private openai: OpenAI;
  private logger: Logger;
  private costTracker: CostTracker;
  private metrics: MetricsCollector;
  private analysisCache: Map<string, ImageAnalysisResult>;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });
    this.logger = new Logger('ImageAnalysisService');
    this.costTracker = new CostTracker();
    this.metrics = new MetricsCollector('image_analysis');
    this.analysisCache = new Map();
  }

  async analyzeImage(
    imageBuffer: Buffer,
    context: {
      elementType: string;
      surroundingText?: string;
      pageTitle?: string;
      isDecorative?: boolean;
    }
  ): Promise<ImageAnalysisResult> {
    const startTime = Date.now();
    const imageHash = this.generateImageHash(imageBuffer);
    
    // Check cache first
    if (this.analysisCache.has(imageHash)) {
      this.metrics.recordCacheHit('image_analysis');
      return this.analysisCache.get(imageHash)!;
    }

    try {
      // Preprocess image for analysis
      const processedImage = await this.preprocessImage(imageBuffer);
      
      // Run multiple analyses in parallel
      const [
        visionAnalysis,
        colorContrastAnalysis,
        textDetection,
      ] = await Promise.all([
        this.analyzeWithVisionAPI(processedImage, context),
        this.analyzeColorContrast(processedImage),
        this.detectTextInImage(processedImage),
      ]);

      // Combine results
      const result: ImageAnalysisResult = {
        hasText: textDetection.hasText,
        textContent: textDetection.content,
        hasInformativeContent: visionAnalysis.isInformative,
        suggestedAltText: this.generateAltText(visionAnalysis, textDetection, context),
        colorContrast: colorContrastAnalysis,
        accessibility: this.assessAccessibility(
          visionAnalysis,
          colorContrastAnalysis,
          textDetection,
          context
        ),
        confidence: this.calculateConfidence(visionAnalysis, textDetection),
        analysisId: `img-analysis-${Date.now()}-${imageHash.substring(0, 8)}`,
      };

      // Cache result
      this.analysisCache.set(imageHash, result);
      
      // Record metrics
      this.metrics.recordLatency('image_analysis', Date.now() - startTime);
      this.metrics.recordAnalysis('image', result.accessibility.score);
      
      return result;
    } catch (error) {
      this.logger.error('Image analysis failed', { error, imageHash });
      this.metrics.recordError('image_analysis', error as Error);
      
      // Return fallback analysis
      return this.getFallbackAnalysis(context);
    }
  }

  private async analyzeWithVisionAPI(
    imageBuffer: Buffer,
    context: any
  ): Promise<any> {
    const base64Image = imageBuffer.toString('base64');
    
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-vision-preview',
        messages: [
          {
            role: 'system',
            content: `You are an accessibility expert analyzing images for WCAG compliance. 
                     Focus on: text content, informative vs decorative nature, color usage, 
                     and any accessibility concerns.`,
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this image for accessibility:
                      Element type: ${context.elementType}
                      Surrounding text: ${context.surroundingText || 'None'}
                      Page context: ${context.pageTitle || 'Unknown'}
                      
                      Provide:
                      1. Is this informative or decorative?
                      2. What information does it convey?
                      3. Any text in the image?
                      4. Accessibility concerns?
                      5. Suggested alt text (empty string if decorative)`,
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        max_tokens: 500,
        temperature: 0.3,
      });

      const analysis = response.choices[0].message.content!;
      
      // Track costs
      await this.costTracker.trackUsage('openai', 'gpt-4-vision', {
        input_tokens: response.usage?.prompt_tokens || 0,
        output_tokens: response.usage?.completion_tokens || 0,
        image_tokens: Math.ceil(imageBuffer.length / 1024), // Approximate
      });
      
      return this.parseVisionAnalysis(analysis);
    } catch (error) {
      if (error instanceof Error && error.message.includes('rate_limit')) {
        // Implement exponential backoff
        await this.handleRateLimitWithBackoff(error);
        return this.analyzeWithVisionAPI(imageBuffer, context);
      }
      throw error;
    }
  }

  private async analyzeColorContrast(imageBuffer: Buffer): Promise<ColorContrastInfo> {
    const image = sharp(imageBuffer);
    const { data, info } = await image
      .resize(100, 100, { fit: 'inside' })
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Extract dominant colors
    const colors = this.extractDominantColors(data, info);
    
    // Calculate contrast ratios
    const contrastRatio = this.calculateContrastRatio(
      colors.foreground,
      colors.background
    );

    const meetsWCAG_AA = contrastRatio >= 4.5;
    const meetsWCAG_AAA = contrastRatio >= 7;

    const recommendations: string[] = [];
    if (!meetsWCAG_AA) {
      recommendations.push('Increase contrast ratio to at least 4.5:1 for WCAG AA compliance');
      recommendations.push(`Current ratio ${contrastRatio.toFixed(2)}:1 is too low`);
    }

    return {
      ratio: contrastRatio,
      meetsWCAG_AA,
      meetsWCAG_AAA,
      foregroundColor: this.rgbToHex(colors.foreground),
      backgroundColor: this.rgbToHex(colors.background),
      recommendations,
    };
  }

  private async detectTextInImage(imageBuffer: Buffer): Promise<any> {
    // Use OCR or Vision API for text detection
    try {
      const base64Image = imageBuffer.toString('base64');
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-vision-preview',
        messages: [
          {
            role: 'system',
            content: 'Extract all text from this image. Return only the text content, nothing else.',
          },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        max_tokens: 200,
        temperature: 0,
      });

      const textContent = response.choices[0].message.content!.trim();
      
      return {
        hasText: textContent.length > 0,
        content: textContent,
      };
    } catch (error) {
      this.logger.warn('Text detection failed', { error });
      return { hasText: false, content: null };
    }
  }

  private generateAltText(
    visionAnalysis: any,
    textDetection: any,
    context: any
  ): string {
    // If decorative, return empty alt text
    if (!visionAnalysis.isInformative || context.isDecorative) {
      return '';
    }

    // If image contains text, include it in alt text
    if (textDetection.hasText && textDetection.content) {
      const textPrefix = visionAnalysis.description ? 
        `${visionAnalysis.description}. Text: ` : 
        'Image containing text: ';
      return textPrefix + textDetection.content;
    }

    // Use vision analysis description
    return visionAnalysis.suggestedAlt || visionAnalysis.description || '';
  }

  private assessAccessibility(
    visionAnalysis: any,
    colorContrast: ColorContrastInfo,
    textDetection: any,
    context: any
  ): AccessibilityInfo {
    const issues: ImageAccessibilityIssue[] = [];
    let score = 100;

    // Check color contrast
    if (!colorContrast.meetsWCAG_AA) {
      issues.push({
        type: 'low_contrast',
        severity: 'error',
        description: `Color contrast ratio ${colorContrast.ratio.toFixed(2)}:1 fails WCAG AA`,
        wcagCriteria: ['1.4.3', '1.4.11'],
      });
      score -= 30;
    }

    // Check for text in images
    if (textDetection.hasText && context.elementType !== 'logo') {
      issues.push({
        type: 'text_in_image',
        severity: 'warning',
        description: 'Image contains text that should be real text for better accessibility',
        wcagCriteria: ['1.4.5', '1.4.9'],
      });
      score -= 20;
    }

    // Check for complex diagrams without proper description
    if (visionAnalysis.isComplex && !context.surroundingText) {
      issues.push({
        type: 'complex_diagram',
        severity: 'error',
        description: 'Complex image requires extended description',
        wcagCriteria: ['1.1.1'],
      });
      score -= 25;
    }

    // Generate recommendations
    const recommendations = this.generateRecommendations(issues, visionAnalysis);

    return {
      issues,
      score: Math.max(0, score),
      recommendations,
    };
  }

  private generateRecommendations(
    issues: ImageAccessibilityIssue[],
    visionAnalysis: any
  ): string[] {
    const recommendations: string[] = [];

    issues.forEach(issue => {
      switch (issue.type) {
        case 'low_contrast':
          recommendations.push('Increase color contrast or provide alternative high-contrast version');
          break;
        case 'text_in_image':
          recommendations.push('Replace image text with real HTML text and CSS styling');
          break;
        case 'complex_diagram':
          recommendations.push('Add detailed description using aria-describedby or longdesc');
          break;
        case 'color_only_info':
          recommendations.push('Ensure information is not conveyed by color alone');
          break;
      }
    });

    // Add general recommendations based on analysis
    if (visionAnalysis.isInformative && !visionAnalysis.suggestedAlt) {
      recommendations.push('Add descriptive alt text that conveys the image purpose');
    }

    return [...new Set(recommendations)]; // Remove duplicates
  }

  private calculateConfidence(visionAnalysis: any, textDetection: any): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence based on analysis quality
    if (visionAnalysis.description?.length > 20) confidence += 0.2;
    if (visionAnalysis.suggestedAlt?.length > 10) confidence += 0.15;
    if (textDetection.hasText && textDetection.content) confidence += 0.15;

    return Math.min(1, confidence);
  }

  private async preprocessImage(imageBuffer: Buffer): Promise<Buffer> {
    // Optimize image for analysis (resize, format conversion if needed)
    return sharp(imageBuffer)
      .resize(1024, 1024, { 
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 85 })
      .toBuffer();
  }

  private generateImageHash(imageBuffer: Buffer): string {
    return createHash('sha256').update(imageBuffer).digest('hex');
  }

  private parseVisionAnalysis(analysisText: string): any {
    // Parse the structured response from GPT-4 Vision
    const lines = analysisText.split('\n');
    const analysis: any = {
      isInformative: true,
      description: '',
      suggestedAlt: '',
      isComplex: false,
    };

    lines.forEach(line => {
      if (line.includes('decorative')) {
        analysis.isInformative = false;
      }
      if (line.includes('information') || line.includes('convey')) {
        analysis.description = line;
      }
      if (line.includes('alt text:')) {
        analysis.suggestedAlt = line.split(':')[1]?.trim() || '';
      }
      if (line.includes('complex') || line.includes('diagram')) {
        analysis.isComplex = true;
      }
    });

    return analysis;
  }

  private extractDominantColors(data: Buffer, info: sharp.OutputInfo): any {
    // Simple color extraction - in production, use a proper algorithm
    const pixels = data.length / info.channels;
    const step = Math.max(1, Math.floor(pixels / 1000)); // Sample pixels
    
    const colors: number[][] = [];
    
    for (let i = 0; i < data.length; i += step * info.channels) {
      colors.push([
        data[i],     // R
        data[i + 1], // G  
        data[i + 2], // B
      ]);
    }

    // Sort by luminance and pick extremes as foreground/background
    colors.sort((a, b) => this.getLuminance(a) - this.getLuminance(b));
    
    return {
      background: colors[0] || [255, 255, 255],
      foreground: colors[colors.length - 1] || [0, 0, 0],
    };
  }

  private calculateContrastRatio(color1: number[], color2: number[]): number {
    const l1 = this.getLuminance(color1);
    const l2 = this.getLuminance(color2);
    
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    
    return (lighter + 0.05) / (darker + 0.05);
  }

  private getLuminance(rgb: number[]): number {
    const [r, g, b] = rgb.map(val => {
      const normalized = val / 255;
      return normalized <= 0.03928
        ? normalized / 12.92
        : Math.pow((normalized + 0.055) / 1.055, 2.4);
    });
    
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  private rgbToHex(rgb: number[]): string {
    return '#' + rgb.map(val => val.toString(16).padStart(2, '0')).join('');
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
    const attempt = this.metrics.getRetryCount('vision_api');
    
    const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
    return delay + Math.random() * 1000; // Add jitter
  }

  private getFallbackAnalysis(context: any): ImageAnalysisResult {
    return {
      hasText: false,
      hasInformativeContent: !context.isDecorative,
      suggestedAltText: context.isDecorative ? '' : 'Image',
      colorContrast: {
        ratio: 0,
        meetsWCAG_AA: false,
        meetsWCAG_AAA: false,
        foregroundColor: '#000000',
        backgroundColor: '#FFFFFF',
        recommendations: ['Unable to analyze color contrast'],
      },
      accessibility: {
        issues: [{
          type: 'missing_caption',
          severity: 'warning',
          description: 'Image analysis unavailable',
          wcagCriteria: ['1.1.1'],
        }],
        score: 50,
        recommendations: ['Manual review recommended'],
      },
      confidence: 0.1,
      analysisId: `img-analysis-fallback-${Date.now()}`,
    };
  }

  async shutdown(): Promise<void> {
    // Save any pending metrics
    await this.metrics.flush();
    this.analysisCache.clear();
  }
}