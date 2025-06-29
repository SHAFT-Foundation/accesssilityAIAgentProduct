import { Page } from 'puppeteer';

interface AccessibilityIssue {
  id: string;
  type: string;
  severity: 'error' | 'warning' | 'info';
  description: string;
  element: string;
  selector: string;
  wcagCriteria: string[];
  code?: string;
  line?: number;
  column?: number;
  filePath?: string;
  metadata?: Record<string, any>;
  fixSuggestion?: {
    type: string;
    attribute?: string;
    value?: string;
    replacement?: string;
  };
}

export class WCAGRuleEngine {
  async scanPage(page: Page): Promise<AccessibilityIssue[]> {
    const issues: AccessibilityIssue[] = [];

    try {
      // Run all accessibility checks
      const [
        altTextIssues,
        contrastIssues,
        labelIssues,
        headingIssues,
        focusIssues,
        linkIssues,
        languageIssues,
        duplicateIdIssues
      ] = await Promise.all([
        this.checkMissingAltText(page),
        this.checkColorContrast(page),
        this.checkMissingLabels(page),
        this.checkHeadingStructure(page),
        this.checkFocusIndicators(page),
        this.checkEmptyLinks(page),
        this.checkLanguageDeclaration(page),
        this.checkDuplicateIds(page)
      ]);

      issues.push(
        ...altTextIssues,
        ...contrastIssues,
        ...labelIssues,
        ...headingIssues,
        ...focusIssues,
        ...linkIssues,
        ...languageIssues,
        ...duplicateIdIssues
      );

      return issues;
    } catch (error) {
      console.error('Error during page scan:', error);
      return [];
    }
  }

  private async checkMissingAltText(page: Page): Promise<AccessibilityIssue[]> {
    try {
      const images = await page.evaluate(() => {
        const imgs = Array.from(document.querySelectorAll('img'));
        return imgs.map(img => ({
          src: img.src,
          alt: img.alt,
          tagName: img.tagName,
          role: img.getAttribute('role'),
          'aria-hidden': img.getAttribute('aria-hidden')
        }));
      });

      return images
        .filter(img => 
          !img.alt && 
          img.role !== 'presentation' && 
          img['aria-hidden'] !== 'true'
        )
        .map((img, index) => ({
          id: `missing-alt-${index}`,
          type: 'missing_alt_text',
          severity: 'error' as const,
          description: 'Image missing alternative text',
          element: `<img src="${img.src}">`,
          selector: `img[src="${img.src}"]`,
          wcagCriteria: ['1.1.1'],
          fixSuggestion: {
            type: 'add_attribute',
            attribute: 'alt',
            value: 'Descriptive alternative text'
          }
        }));
    } catch (error) {
      console.error('Error checking alt text:', error);
      return [];
    }
  }

  private async checkColorContrast(page: Page): Promise<AccessibilityIssue[]> {
    try {
      const elements = await page.evaluate(() => {
        const textElements = Array.from(document.querySelectorAll('button, a, p, h1, h2, h3, h4, h5, h6, span, div'));
        return textElements
          .filter(el => el.textContent?.trim())
          .map(el => {
            const styles = window.getComputedStyle(el);
            return {
              element: el.outerHTML,
              selector: el.tagName.toLowerCase(),
              foreground: styles.color,
              background: styles.backgroundColor
            };
          });
      });

      return elements
        .map((el, index) => {
          const contrastRatio = this.calculateContrastRatio(el.foreground, el.background);
          if (contrastRatio < 4.5) {
            return {
              id: `low-contrast-${index}`,
              type: 'low_contrast',
              severity: 'error' as const,
              description: 'Element has insufficient color contrast',
              element: el.element,
              selector: el.selector,
              wcagCriteria: ['1.4.3'],
              metadata: {
                contrastRatio,
                foreground: el.foreground,
                background: el.background
              }
            };
          }
          return null;
        })
        .filter((issue): issue is AccessibilityIssue => issue !== null);
    } catch (error) {
      console.error('Error checking color contrast:', error);
      return [];
    }
  }

  private async checkMissingLabels(page: Page): Promise<AccessibilityIssue[]> {
    try {
      const inputs = await page.evaluate(() => {
        const inputElements = Array.from(document.querySelectorAll('input, textarea, select'));
        return inputElements.map(input => {
          const id = input.id;
          const hasLabel = document.querySelector(`label[for="${id}"]`) !== null;
          const hasAriaLabel = input.getAttribute('aria-label') !== null;
          const hasAriaLabelledby = input.getAttribute('aria-labelledby') !== null;
          
          return {
            element: input.outerHTML,
            selector: input.tagName.toLowerCase() + (input.name ? `[name="${input.name}"]` : ''),
            hasLabel,
            hasAriaLabel,
            hasAriaLabelledby
          };
        });
      });

      return inputs
        .filter(input => !input.hasLabel && !input.hasAriaLabel && !input.hasAriaLabelledby)
        .map((input, index) => ({
          id: `missing-label-${index}`,
          type: 'missing_label',
          severity: 'error' as const,
          description: 'Form input missing accessible label',
          element: input.element,
          selector: input.selector,
          wcagCriteria: ['1.3.1', '4.1.2']
        }));
    } catch (error) {
      console.error('Error checking labels:', error);
      return [];
    }
  }

  private async checkHeadingStructure(page: Page): Promise<AccessibilityIssue[]> {
    try {
      const headings = await page.evaluate(() => {
        const headingElements = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
        return headingElements.map(heading => ({
          level: parseInt(heading.tagName[1]),
          text: heading.textContent?.trim() || ''
        }));
      });

      const issues: AccessibilityIssue[] = [];
      
      for (let i = 1; i < headings.length; i++) {
        const current = headings[i];
        const previous = headings[i - 1];
        
        if (current.level > previous.level + 1) {
          issues.push({
            id: `heading-structure-${i}`,
            type: 'invalid_heading_structure',
            severity: 'error',
            description: `Heading level skips from h${previous.level} to h${current.level}`,
            element: `<h${current.level}>${current.text}</h${current.level}>`,
            selector: `h${current.level}`,
            wcagCriteria: ['1.3.1']
          });
        }
      }

      return issues;
    } catch (error) {
      console.error('Error checking heading structure:', error);
      return [];
    }
  }

  private async checkFocusIndicators(page: Page): Promise<AccessibilityIssue[]> {
    try {
      const elements = await page.evaluate(() => {
        const focusableElements = Array.from(document.querySelectorAll('button, a, input, textarea, select'));
        return focusableElements.map(el => {
          const styles = window.getComputedStyle(el, ':focus');
          const hasFocusIndicator = styles.outline !== 'none' && styles.outline !== '0px';
          
          return {
            element: el.outerHTML,
            selector: el.tagName.toLowerCase(),
            hasFocusIndicator
          };
        });
      });

      return elements
        .filter(el => !el.hasFocusIndicator)
        .map((el, index) => ({
          id: `missing-focus-${index}`,
          type: 'missing_focus_indicator',
          severity: 'error' as const,
          description: 'Interactive element missing focus indicator',
          element: el.element,
          selector: el.selector,
          wcagCriteria: ['2.4.7']
        }));
    } catch (error) {
      console.error('Error checking focus indicators:', error);
      return [];
    }
  }

  private async checkEmptyLinks(page: Page): Promise<AccessibilityIssue[]> {
    try {
      const links = await page.evaluate(() => {
        const linkElements = Array.from(document.querySelectorAll('a[href]'));
        return linkElements.map(link => {
          const hasText = link.textContent?.trim() !== '';
          const hasAriaLabel = link.getAttribute('aria-label') !== null;
          const hasTitle = link.getAttribute('title') !== null;
          
          return {
            element: link.outerHTML,
            selector: `a[href="${link.getAttribute('href')}"]`,
            hasText,
            hasAriaLabel,
            hasTitle
          };
        });
      });

      return links
        .filter(link => !link.hasText && !link.hasAriaLabel && !link.hasTitle)
        .map((link, index) => ({
          id: `empty-link-${index}`,
          type: 'empty_link',
          severity: 'error' as const,
          description: 'Link has no accessible text',
          element: link.element,
          selector: link.selector,
          wcagCriteria: ['2.4.4']
        }));
    } catch (error) {
      console.error('Error checking empty links:', error);
      return [];
    }
  }

  private async checkLanguageDeclaration(page: Page): Promise<AccessibilityIssue[]> {
    try {
      const languageInfo = await page.evaluate(() => {
        const htmlElement = document.documentElement;
        return {
          hasLang: htmlElement.hasAttribute('lang'),
          hasXmlLang: htmlElement.hasAttribute('xml:lang')
        };
      });

      if (!languageInfo.hasLang && !languageInfo.hasXmlLang) {
        return [{
          id: 'missing-language',
          type: 'missing_language',
          severity: 'error',
          description: 'Page missing language declaration',
          element: '<html>',
          selector: 'html',
          wcagCriteria: ['3.1.1']
        }];
      }

      return [];
    } catch (error) {
      console.error('Error checking language declaration:', error);
      return [];
    }
  }

  private async checkDuplicateIds(page: Page): Promise<AccessibilityIssue[]> {
    try {
      const duplicates = await page.evaluate(() => {
        const elementsWithIds = Array.from(document.querySelectorAll('[id]'));
        const idCounts: Record<string, string[]> = {};
        
        elementsWithIds.forEach(el => {
          const id = el.id;
          if (!idCounts[id]) {
            idCounts[id] = [];
          }
          idCounts[id].push(el.outerHTML);
        });

        return Object.entries(idCounts)
          .filter(([, elements]) => elements.length > 1)
          .map(([id, elements]) => ({ id, elements }));
      });

      return duplicates.map((duplicate, index) => ({
        id: `duplicate-id-${index}`,
        type: 'duplicate_id',
        severity: 'error' as const,
        description: `Duplicate ID attribute: ${duplicate.id}`,
        element: duplicate.elements[0],
        selector: `#${duplicate.id}`,
        wcagCriteria: ['4.1.1'],
        metadata: {
          duplicateId: duplicate.id,
          occurrences: duplicate.elements.length
        }
      }));
    } catch (error) {
      console.error('Error checking duplicate IDs:', error);
      return [];
    }
  }

  private calculateContrastRatio(foreground: string, background: string): number {
    const fgLuminance = this.getLuminance(this.parseRgbColor(foreground));
    const bgLuminance = this.getLuminance(this.parseRgbColor(background));
    
    const lighter = Math.max(fgLuminance, bgLuminance);
    const darker = Math.min(fgLuminance, bgLuminance);
    
    return (lighter + 0.05) / (darker + 0.05);
  }

  private parseRgbColor(color: string): [number, number, number] {
    const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (match) {
      return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
    }
    return [0, 0, 0]; // Default to black for invalid colors
  }

  private getLuminance([r, g, b]: [number, number, number]): number {
    const toLinear = (component: number) => {
      const normalized = component / 255;
      return normalized <= 0.03928 
        ? normalized / 12.92 
        : Math.pow((normalized + 0.055) / 1.055, 2.4);
    };

    return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  }
}