import { Page } from 'puppeteer';
import { AccessibilityIssue, IssueType, IssueFix, IssueContext } from '../types/scan';
import { logger } from '../utils/logger';

interface WCAGRule {
  id: string;
  name: string;
  wcagCriteria: string;
  severity: 'blocker' | 'critical' | 'major' | 'minor';
  type: IssueType;
  description: string;
  check: (page: Page, element?: any) => Promise<AccessibilityIssue[]>;
}

export class WCAGRuleEngine {
  private rules: Map<string, WCAGRule> = new Map();

  constructor() {
    this.initializeRules();
  }

  private initializeRules(): void {
    // Rule 1.1.1 - Non-text Content (Images must have alt text)
    this.addRule({
      id: 'missing-alt-text',
      name: 'Missing Alt Text',
      wcagCriteria: '1.1.1',
      severity: 'critical',
      type: 'missing_alt_text',
      description: 'Images must have alternative text for screen readers',
      check: this.checkMissingAltText.bind(this),
    });

    // Rule 1.4.3 - Contrast (Minimum)
    this.addRule({
      id: 'color-contrast',
      name: 'Insufficient Color Contrast',
      wcagCriteria: '1.4.3',
      severity: 'major',
      type: 'color_contrast',
      description: 'Text must have sufficient contrast against background',
      check: this.checkColorContrast.bind(this),
    });

    // Rule 1.3.1 - Info and Relationships (Heading structure)
    this.addRule({
      id: 'heading-structure',
      name: 'Invalid Heading Structure',
      wcagCriteria: '1.3.1',
      severity: 'major',
      type: 'heading_structure',
      description: 'Headings must follow proper hierarchy (h1, h2, h3, etc.)',
      check: this.checkHeadingStructure.bind(this),
    });

    // Rule 3.3.2 - Labels or Instructions (Form labels)
    this.addRule({
      id: 'form-labels',
      name: 'Missing Form Labels',
      wcagCriteria: '3.3.2',
      severity: 'critical',
      type: 'form_labels',
      description: 'Form inputs must have accessible labels',
      check: this.checkFormLabels.bind(this),
    });

    // Rule 4.1.2 - Name, Role, Value (ARIA labels)
    this.addRule({
      id: 'aria-labels',
      name: 'Missing ARIA Labels',
      wcagCriteria: '4.1.2',
      severity: 'major',
      type: 'aria_labels',
      description: 'Interactive elements must have accessible names',
      check: this.checkAriaLabels.bind(this),
    });

    // Rule 2.1.1 - Keyboard (Focus management)
    this.addRule({
      id: 'focus-management',
      name: 'Poor Focus Management',
      wcagCriteria: '2.1.1',
      severity: 'major',
      type: 'focus_management',
      description: 'Interactive elements must be keyboard accessible',
      check: this.checkFocusManagement.bind(this),
    });

    // Rule 2.1.1 - Keyboard Navigation
    this.addRule({
      id: 'keyboard-navigation',
      name: 'Keyboard Navigation Issues',
      wcagCriteria: '2.1.1',
      severity: 'major',
      type: 'keyboard_navigation',
      description: 'All functionality must be keyboard accessible',
      check: this.checkKeyboardNavigation.bind(this),
    });

    // Rule 1.3.6 - Identify Purpose (Landmarks)
    this.addRule({
      id: 'landmarks',
      name: 'Missing Landmarks',
      wcagCriteria: '1.3.6',
      severity: 'minor',
      type: 'landmarks',
      description: 'Page should have proper landmark structure',
      check: this.checkLandmarks.bind(this),
    });
  }

  private addRule(rule: WCAGRule): void {
    this.rules.set(rule.id, rule);
  }

  async runAllRules(page: Page, includeRules?: string[], excludeRules?: string[]): Promise<AccessibilityIssue[]> {
    const issues: AccessibilityIssue[] = [];
    const activeRules = this.getActiveRules(includeRules, excludeRules);

    logger.info(`Running ${activeRules.length} accessibility rules`);

    for (const rule of activeRules) {
      try {
        const ruleStartTime = Date.now();
        const ruleIssues = await rule.check(page);
        const ruleEndTime = Date.now();

        logger.debug(`Rule ${rule.id} found ${ruleIssues.length} issues in ${ruleEndTime - ruleStartTime}ms`);
        issues.push(...ruleIssues);
      } catch (error) {
        logger.error(`Rule ${rule.id} failed`, {
          ruleId: rule.id,
          error: error.message,
        });
      }
    }

    return this.deduplicateIssues(issues);
  }

  private getActiveRules(includeRules?: string[], excludeRules?: string[]): WCAGRule[] {
    let rules = Array.from(this.rules.values());

    if (includeRules && includeRules.length > 0) {
      rules = rules.filter(rule => includeRules.includes(rule.id));
    }

    if (excludeRules && excludeRules.length > 0) {
      rules = rules.filter(rule => !excludeRules.includes(rule.id));
    }

    return rules;
  }

  private async checkMissingAltText(page: Page): Promise<AccessibilityIssue[]> {
    const issues: AccessibilityIssue[] = [];

    const images = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img'));
      return imgs.map((img, index) => ({
        index,
        src: img.src,
        alt: img.alt,
        title: img.title,
        width: img.width,
        height: img.height,
        selector: `img:nth-of-type(${index + 1})`,
        outerHTML: img.outerHTML,
        isDecorative: img.role === 'presentation' || img.role === 'none',
        parentText: img.parentElement?.textContent?.trim().substring(0, 100) || '',
      }));
    });

    for (const img of images) {
      if (!img.isDecorative && !img.alt && !img.title) {
        const issue: AccessibilityIssue = {
          id: `missing-alt-${img.index}`,
          type: 'missing_alt_text',
          severity: 'critical',
          wcagCriteria: '1.1.1',
          title: 'Image missing alternative text',
          description: 'This image does not have alt text, making it inaccessible to screen readers.',
          impact: 'Screen reader users cannot understand the content or purpose of this image.',
          selector: img.selector,
          html: img.outerHTML,
          fix: {
            type: 'attribute',
            description: 'Add descriptive alt text to the image',
            suggestedCode: `<img src="${img.src}" alt="[Describe the image content]" ${img.outerHTML.includes('width=') ? '' : `width="${img.width}" height="${img.height}"`}>`,
            explanation: 'Alt text should describe the image content or its purpose in context. For decorative images, use alt="" or add role="presentation".',
            confidence: 0.9,
          },
          context: {
            pageTitle: await page.title(),
            pageUrl: page.url(),
            nearbyText: img.parentText,
            imageInfo: {
              src: img.src,
              dimensions: { width: img.width, height: img.height },
            },
            parentElements: await this.getParentElements(page, img.selector),
          },
        };

        issues.push(issue);
      }
    }

    return issues;
  }

  private async checkColorContrast(page: Page): Promise<AccessibilityIssue[]> {
    const issues: AccessibilityIssue[] = [];

    const contrastIssues = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'));
      const issues: any[] = [];

      elements.forEach((element, index) => {
        const style = window.getComputedStyle(element);
        const textContent = element.textContent?.trim();

        if (textContent && textContent.length > 0) {
          const color = style.color;
          const backgroundColor = style.backgroundColor;
          const fontSize = parseFloat(style.fontSize);
          const fontWeight = style.fontWeight;

          // Simple contrast check (would use more sophisticated algorithm in production)
          if (this.hasLowContrast(color, backgroundColor, fontSize, fontWeight)) {
            issues.push({
              index,
              selector: this.generateSelector(element),
              textContent: textContent.substring(0, 100),
              color,
              backgroundColor,
              fontSize,
              fontWeight,
              outerHTML: element.outerHTML.substring(0, 200),
            });
          }
        }
      });

      return issues;
    });

    for (const item of contrastIssues) {
      const issue: AccessibilityIssue = {
        id: `contrast-${item.index}`,
        type: 'color_contrast',
        severity: 'major',
        wcagCriteria: '1.4.3',
        title: 'Insufficient color contrast',
        description: 'Text does not have sufficient contrast against its background.',
        impact: 'Users with low vision or color blindness may have difficulty reading this text.',
        selector: item.selector,
        html: item.outerHTML,
        fix: {
          type: 'style',
          description: 'Increase color contrast to meet WCAG AA standards',
          suggestedCode: `/* Ensure contrast ratio is at least 4.5:1 for normal text, 3:1 for large text */\n${item.selector} {\n  color: #000000; /* Dark text */\n  background-color: #ffffff; /* Light background */\n}`,
          explanation: 'Use a contrast checker tool to find colors that meet WCAG standards. Dark text on light backgrounds or light text on dark backgrounds typically work well.',
          confidence: 0.7,
        },
        context: {
          pageTitle: await page.title(),
          pageUrl: page.url(),
          nearbyText: item.textContent,
          parentElements: await this.getParentElements(page, item.selector),
        },
      };

      issues.push(issue);
    }

    return issues;
  }

  private async checkHeadingStructure(page: Page): Promise<AccessibilityIssue[]> {
    const issues: AccessibilityIssue[] = [];

    const headings = await page.evaluate(() => {
      const headingElements = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
      return headingElements.map((heading, index) => ({
        index,
        tagName: heading.tagName.toLowerCase(),
        level: parseInt(heading.tagName.charAt(1)),
        text: heading.textContent?.trim() || '',
        selector: `${heading.tagName.toLowerCase()}:nth-of-type(${index + 1})`,
        outerHTML: heading.outerHTML,
      }));
    });

    // Check for missing h1
    const h1Count = headings.filter(h => h.level === 1).length;
    if (h1Count === 0) {
      issues.push({
        id: 'missing-h1',
        type: 'heading_structure',
        severity: 'major',
        wcagCriteria: '1.3.1',
        title: 'Missing main heading (h1)',
        description: 'Page should have exactly one h1 element as the main heading.',
        impact: 'Screen readers rely on heading structure for navigation. Missing h1 makes it harder to understand page structure.',
        selector: 'body',
        html: '<body>',
        fix: {
          type: 'element',
          description: 'Add an h1 element as the main page heading',
          suggestedCode: '<h1>Main Page Title</h1>',
          explanation: 'The h1 should represent the main topic or purpose of the page. There should be exactly one h1 per page.',
          confidence: 0.8,
        },
        context: {
          pageTitle: await page.title(),
          pageUrl: page.url(),
          parentElements: [],
        },
      });
    }

    // Check for heading level gaps
    for (let i = 1; i < headings.length; i++) {
      const current = headings[i];
      const previous = headings[i - 1];

      if (current.level > previous.level + 1) {
        issues.push({
          id: `heading-gap-${current.index}`,
          type: 'heading_structure',
          severity: 'major',
          wcagCriteria: '1.3.1',
          title: 'Heading level gap detected',
          description: `Heading jumps from h${previous.level} to h${current.level}, skipping levels.`,
          impact: 'Screen readers expect logical heading hierarchy. Skipping levels confuses navigation.',
          selector: current.selector,
          html: current.outerHTML,
          fix: {
            type: 'element',
            description: `Change to h${previous.level + 1} or add intermediate headings`,
            suggestedCode: `<h${previous.level + 1}>${current.text}</h${previous.level + 1}>`,
            explanation: 'Headings should follow sequential order: h1 → h2 → h3, etc. Don\'t skip levels.',
            confidence: 0.9,
          },
          context: {
            pageTitle: await page.title(),
            pageUrl: page.url(),
            nearbyText: current.text,
            parentElements: await this.getParentElements(page, current.selector),
          },
        });
      }
    }

    return issues;
  }

  private async checkFormLabels(page: Page): Promise<AccessibilityIssue[]> {
    const issues: AccessibilityIssue[] = [];

    const formInputs = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input, select, textarea'));
      return inputs.map((input, index) => {
        const element = input as HTMLInputElement;
        const type = element.type || 'text';
        
        return {
          index,
          type,
          id: element.id,
          name: element.name,
          placeholder: element.placeholder,
          ariaLabel: element.getAttribute('aria-label'),
          ariaLabelledby: element.getAttribute('aria-labelledby'),
          selector: `${element.tagName.toLowerCase()}:nth-of-type(${index + 1})`,
          outerHTML: element.outerHTML,
          hasLabel: !!element.labels?.length,
          isHidden: element.type === 'hidden',
        };
      });
    });

    for (const input of formInputs) {
      if (input.isHidden) continue;

      const hasAccessibleName = input.hasLabel || 
                               input.ariaLabel || 
                               input.ariaLabelledby || 
                               (input.type === 'submit' || input.type === 'button');

      if (!hasAccessibleName) {
        const issue: AccessibilityIssue = {
          id: `missing-label-${input.index}`,
          type: 'form_labels',
          severity: 'critical',
          wcagCriteria: '3.3.2',
          title: 'Form input missing label',
          description: 'This form input does not have an accessible label.',
          impact: 'Screen reader users cannot identify the purpose of this form field.',
          selector: input.selector,
          html: input.outerHTML,
          fix: {
            type: 'element',
            description: 'Add a label element or aria-label attribute',
            suggestedCode: input.id 
              ? `<label for="${input.id}">Field Label</label>\n${input.outerHTML}`
              : `<input aria-label="Field description" ${input.outerHTML.substring(6)}`,
            explanation: 'Every form input should have a label that describes its purpose. Use <label> elements or aria-label attributes.',
            confidence: 0.9,
          },
          context: {
            pageTitle: await page.title(),
            pageUrl: page.url(),
            parentElements: await this.getParentElements(page, input.selector),
          },
        };

        issues.push(issue);
      }
    }

    return issues;
  }

  private async checkAriaLabels(page: Page): Promise<AccessibilityIssue[]> {
    const issues: AccessibilityIssue[] = [];

    const interactiveElements = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll(
        'button, [role="button"], [role="link"], [role="tab"], [role="menuitem"], [role="option"]'
      ));

      return elements.map((element, index) => {
        const hasText = (element.textContent?.trim().length || 0) > 0;
        const hasAriaLabel = !!element.getAttribute('aria-label');
        const hasAriaLabelledby = !!element.getAttribute('aria-labelledby');
        
        return {
          index,
          tagName: element.tagName.toLowerCase(),
          role: element.getAttribute('role'),
          hasText,
          hasAriaLabel,
          hasAriaLabelledby,
          textContent: element.textContent?.trim() || '',
          selector: `${element.tagName.toLowerCase()}:nth-of-type(${index + 1})`,
          outerHTML: element.outerHTML.substring(0, 200),
        };
      });
    });

    for (const element of interactiveElements) {
      const hasAccessibleName = element.hasText || element.hasAriaLabel || element.hasAriaLabelledby;

      if (!hasAccessibleName) {
        const issue: AccessibilityIssue = {
          id: `missing-aria-label-${element.index}`,
          type: 'aria_labels',
          severity: 'major',
          wcagCriteria: '4.1.2',
          title: 'Interactive element missing accessible name',
          description: 'This interactive element does not have an accessible name.',
          impact: 'Screen reader users cannot identify the purpose or function of this element.',
          selector: element.selector,
          html: element.outerHTML,
          fix: {
            type: 'attribute',
            description: 'Add aria-label or visible text content',
            suggestedCode: `<${element.tagName} aria-label="Describe the action" ${element.outerHTML.substring(element.tagName.length + 1)}`,
            explanation: 'Interactive elements need accessible names so users understand their purpose. Add aria-label or visible text.',
            confidence: 0.8,
          },
          context: {
            pageTitle: await page.title(),
            pageUrl: page.url(),
            elementRole: element.role,
            parentElements: await this.getParentElements(page, element.selector),
          },
        };

        issues.push(issue);
      }
    }

    return issues;
  }

  private async checkFocusManagement(page: Page): Promise<AccessibilityIssue[]> {
    const issues: AccessibilityIssue[] = [];

    const focusableElements = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll(
        'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ));

      return elements.map((element, index) => {
        const style = window.getComputedStyle(element);
        const tabIndex = element.getAttribute('tabindex');
        
        return {
          index,
          tagName: element.tagName.toLowerCase(),
          tabIndex: tabIndex ? parseInt(tabIndex) : 0,
          hasVisibleFocus: style.outline !== 'none' && style.outline !== '0',
          selector: `${element.tagName.toLowerCase()}:nth-of-type(${index + 1})`,
          outerHTML: element.outerHTML.substring(0, 200),
        };
      });
    });

    for (const element of focusableElements) {
      if (!element.hasVisibleFocus) {
        const issue: AccessibilityIssue = {
          id: `missing-focus-${element.index}`,
          type: 'focus_management',
          severity: 'major',
          wcagCriteria: '2.1.1',
          title: 'Interactive element missing visible focus indicator',
          description: 'This focusable element does not have a visible focus indicator.',
          impact: 'Keyboard users cannot see which element currently has focus.',
          selector: element.selector,
          html: element.outerHTML,
          fix: {
            type: 'style',
            description: 'Add visible focus styles',
            suggestedCode: `${element.selector}:focus {\n  outline: 2px solid #005fcc;\n  outline-offset: 2px;\n}`,
            explanation: 'All focusable elements should have a visible focus indicator. Use outline or border styles that are clearly visible.',
            confidence: 0.9,
          },
          context: {
            pageTitle: await page.title(),
            pageUrl: page.url(),
            parentElements: await this.getParentElements(page, element.selector),
          },
        };

        issues.push(issue);
      }
    }

    return issues;
  }

  private async checkKeyboardNavigation(page: Page): Promise<AccessibilityIssue[]> {
    const issues: AccessibilityIssue[] = [];

    // Check for keyboard traps and inaccessible elements
    const keyboardIssues = await page.evaluate(() => {
      const clickHandlers = Array.from(document.querySelectorAll('*')).filter(el => {
        const hasClickHandler = el.onclick || 
                               el.addEventListener && 
                               el.getAttribute('onclick') ||
                               el.matches('[role="button"], [role="link"]');
        
        const isFocusable = el.matches('a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
        
        return hasClickHandler && !isFocusable;
      });

      return clickHandlers.map((element, index) => ({
        index,
        tagName: element.tagName.toLowerCase(),
        selector: `${element.tagName.toLowerCase()}:nth-of-type(${index + 1})`,
        outerHTML: element.outerHTML.substring(0, 200),
        textContent: element.textContent?.trim().substring(0, 50) || '',
      }));
    });

    for (const element of keyboardIssues) {
      const issue: AccessibilityIssue = {
        id: `keyboard-inaccessible-${element.index}`,
        type: 'keyboard_navigation',
        severity: 'major',
        wcagCriteria: '2.1.1',
        title: 'Interactive element not keyboard accessible',
        description: 'This element has click handlers but is not keyboard accessible.',
        impact: 'Keyboard-only users cannot interact with this element.',
        selector: element.selector,
        html: element.outerHTML,
        fix: {
          type: 'attribute',
          description: 'Make element keyboard accessible',
          suggestedCode: `<${element.tagName} tabindex="0" role="button" onkeydown="if(event.key==='Enter'||event.key===' ') this.click()" ${element.outerHTML.substring(element.tagName.length + 1)}`,
          explanation: 'Interactive elements need tabindex="0" and keyboard event handlers. Consider using button or link elements instead.',
          confidence: 0.8,
        },
        context: {
          pageTitle: await page.title(),
          pageUrl: page.url(),
          nearbyText: element.textContent,
          parentElements: await this.getParentElements(page, element.selector),
        },
      };

      issues.push(issue);
    }

    return issues;
  }

  private async checkLandmarks(page: Page): Promise<AccessibilityIssue[]> {
    const issues: AccessibilityIssue[] = [];

    const landmarks = await page.evaluate(() => {
      const landmarkElements = Array.from(document.querySelectorAll(
        'header, nav, main, aside, footer, [role="banner"], [role="navigation"], [role="main"], [role="complementary"], [role="contentinfo"]'
      ));

      const hasMain = landmarkElements.some(el => 
        el.tagName.toLowerCase() === 'main' || el.getAttribute('role') === 'main'
      );

      const hasNav = landmarkElements.some(el => 
        el.tagName.toLowerCase() === 'nav' || el.getAttribute('role') === 'navigation'
      );

      return {
        hasMain,
        hasNav,
        landmarkCount: landmarkElements.length,
      };
    });

    if (!landmarks.hasMain) {
      issues.push({
        id: 'missing-main-landmark',
        type: 'landmarks',
        severity: 'minor',
        wcagCriteria: '1.3.6',
        title: 'Missing main landmark',
        description: 'Page should have a main landmark to identify the primary content.',
        impact: 'Screen reader users rely on landmarks for page navigation.',
        selector: 'body',
        html: '<body>',
        fix: {
          type: 'element',
          description: 'Add a main element or role="main"',
          suggestedCode: '<main>\n  <!-- Primary page content -->\n</main>',
          explanation: 'Wrap the main content area in a <main> element or add role="main" to the primary content container.',
          confidence: 0.8,
        },
        context: {
          pageTitle: await page.title(),
          pageUrl: page.url(),
          parentElements: [],
        },
      });
    }

    return issues;
  }

  private async getParentElements(page: Page, selector: string): Promise<string[]> {
    try {
      return await page.evaluate((sel) => {
        const element = document.querySelector(sel);
        if (!element) return [];

        const parents: string[] = [];
        let current = element.parentElement;
        
        while (current && current !== document.body && parents.length < 5) {
          parents.push(current.tagName.toLowerCase());
          current = current.parentElement;
        }
        
        return parents;
      }, selector);
    } catch (error) {
      return [];
    }
  }

  private deduplicateIssues(issues: AccessibilityIssue[]): AccessibilityIssue[] {
    const seen = new Set<string>();
    const unique: AccessibilityIssue[] = [];

    for (const issue of issues) {
      const key = `${issue.type}-${issue.selector}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(issue);
      }
    }

    return unique;
  }
}