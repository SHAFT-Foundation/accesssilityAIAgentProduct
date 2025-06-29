import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WCAGRuleEngine } from './wcagRuleEngine';
import { Page } from 'puppeteer';

// Mock Puppeteer page
const createMockPage = (): Page => {
  return {
    evaluate: vi.fn(),
    $: vi.fn(),
    $$: vi.fn(),
    url: vi.fn().mockReturnValue('https://test.com'),
    title: vi.fn().mockResolvedValue('Test Page'),
    screenshot: vi.fn(),
    pdf: vi.fn(),
    goto: vi.fn(),
    close: vi.fn(),
  } as any;
};

describe('WCAGRuleEngine', () => {
  let ruleEngine: WCAGRuleEngine;
  let mockPage: Page;

  beforeEach(() => {
    ruleEngine = new WCAGRuleEngine();
    mockPage = createMockPage();
  });

  describe('scanPage', () => {
    it('should scan a page and return accessibility issues', async () => {
      // Mock page evaluation to return issues
      mockPage.evaluate = vi.fn()
        .mockResolvedValueOnce([
          { src: 'image1.jpg', alt: '', tagName: 'IMG' }
        ]) // Missing alt text
        .mockResolvedValueOnce([
          { 
            element: '<button>Click here</button>',
            selector: 'button',
            foreground: 'rgb(128,128,128)',
            background: 'rgb(255,255,255)'
          }
        ]) // Low contrast
        .mockResolvedValueOnce([]) // Missing labels
        .mockResolvedValueOnce([]) // Invalid heading structure
        .mockResolvedValueOnce([]) // Missing focus indicators
        .mockResolvedValueOnce([]) // Empty links
        .mockResolvedValueOnce([]) // Missing language
        .mockResolvedValueOnce([]); // Duplicate IDs

      const issues = await ruleEngine.scanPage(mockPage);

      expect(issues).toHaveLength(2);
      expect(issues[0].type).toBe('missing_alt_text');
      expect(issues[0].severity).toBe('error');
      expect(issues[1].type).toBe('low_contrast');
      expect(issues[1].severity).toBe('error');
    });

    it('should handle empty scan results', async () => {
      mockPage.evaluate = vi.fn().mockResolvedValue([]);

      const issues = await ruleEngine.scanPage(mockPage);

      expect(issues).toHaveLength(0);
    });

    it('should handle scan errors gracefully', async () => {
      mockPage.evaluate = vi.fn().mockRejectedValue(new Error('Page evaluation failed'));

      const issues = await ruleEngine.scanPage(mockPage);

      expect(issues).toHaveLength(0);
    });
  });

  describe('checkMissingAltText', () => {
    it('should detect images without alt text', async () => {
      mockPage.evaluate = vi.fn().mockResolvedValue([
        { src: 'image1.jpg', alt: '', tagName: 'IMG' },
        { src: 'image2.jpg', alt: 'Good alt text', tagName: 'IMG' },
        { src: 'image3.jpg', alt: '', tagName: 'IMG' }
      ]);

      const issues = await (ruleEngine as any).checkMissingAltText(mockPage);

      expect(issues).toHaveLength(2);
      expect(issues[0].type).toBe('missing_alt_text');
      expect(issues[0].wcagCriteria).toContain('1.1.1');
      expect(issues[0].fixSuggestion.type).toBe('add_attribute');
    });

    it('should ignore decorative images', async () => {
      mockPage.evaluate = vi.fn().mockResolvedValue([
        { src: 'decorative.jpg', alt: '', tagName: 'IMG', role: 'presentation' },
        { src: 'decorative2.jpg', alt: '', tagName: 'IMG', 'aria-hidden': 'true' }
      ]);

      const issues = await (ruleEngine as any).checkMissingAltText(mockPage);

      expect(issues).toHaveLength(0);
    });
  });

  describe('checkColorContrast', () => {
    it('should detect low contrast issues', async () => {
      mockPage.evaluate = vi.fn().mockResolvedValue([
        {
          element: '<button>Low contrast</button>',
          selector: 'button',
          foreground: 'rgb(128,128,128)', // Light gray
          background: 'rgb(255,255,255)'  // White
        }
      ]);

      const issues = await (ruleEngine as any).checkColorContrast(mockPage);

      expect(issues).toHaveLength(1);
      expect(issues[0].type).toBe('low_contrast');
      expect(issues[0].wcagCriteria).toContain('1.4.3');
      expect(issues[0].metadata.contrastRatio).toBeLessThan(4.5);
    });

    it('should pass sufficient contrast', async () => {
      mockPage.evaluate = vi.fn().mockResolvedValue([
        {
          element: '<button>Good contrast</button>',
          selector: 'button',
          foreground: 'rgb(0,0,0)',     // Black
          background: 'rgb(255,255,255)' // White
        }
      ]);

      const issues = await (ruleEngine as any).checkColorContrast(mockPage);

      expect(issues).toHaveLength(0);
    });
  });

  describe('checkMissingLabels', () => {
    it('should detect form inputs without labels', async () => {
      mockPage.evaluate = vi.fn().mockResolvedValue([
        {
          element: '<input type="text" name="email">',
          selector: 'input[name="email"]',
          hasLabel: false,
          hasAriaLabel: false,
          hasAriaLabelledby: false
        }
      ]);

      const issues = await (ruleEngine as any).checkMissingLabels(mockPage);

      expect(issues).toHaveLength(1);
      expect(issues[0].type).toBe('missing_label');
      expect(issues[0].wcagCriteria).toContain('1.3.1');
    });

    it('should pass inputs with proper labels', async () => {
      mockPage.evaluate = vi.fn().mockResolvedValue([
        {
          element: '<input type="text" name="email" aria-label="Email address">',
          selector: 'input[name="email"]',
          hasLabel: false,
          hasAriaLabel: true,
          hasAriaLabelledby: false
        }
      ]);

      const issues = await (ruleEngine as any).checkMissingLabels(mockPage);

      expect(issues).toHaveLength(0);
    });
  });

  describe('checkHeadingStructure', () => {
    it('should detect improper heading hierarchy', async () => {
      mockPage.evaluate = vi.fn().mockResolvedValue([
        { level: 1, text: 'Main heading' },
        { level: 3, text: 'Skipped h2' }, // Skip from h1 to h3
        { level: 2, text: 'Out of order' }
      ]);

      const issues = await (ruleEngine as any).checkHeadingStructure(mockPage);

      expect(issues).toHaveLength(1);
      expect(issues[0].type).toBe('invalid_heading_structure');
      expect(issues[0].wcagCriteria).toContain('1.3.1');
    });

    it('should pass proper heading hierarchy', async () => {
      mockPage.evaluate = vi.fn().mockResolvedValue([
        { level: 1, text: 'Main heading' },
        { level: 2, text: 'Section heading' },
        { level: 3, text: 'Subsection heading' },
        { level: 2, text: 'Another section' }
      ]);

      const issues = await (ruleEngine as any).checkHeadingStructure(mockPage);

      expect(issues).toHaveLength(0);
    });
  });

  describe('checkFocusIndicators', () => {
    it('should detect elements without focus indicators', async () => {
      mockPage.evaluate = vi.fn().mockResolvedValue([
        {
          element: '<button>No focus style</button>',
          selector: 'button',
          hasFocusIndicator: false
        }
      ]);

      const issues = await (ruleEngine as any).checkFocusIndicators(mockPage);

      expect(issues).toHaveLength(1);
      expect(issues[0].type).toBe('missing_focus_indicator');
      expect(issues[0].wcagCriteria).toContain('2.4.7');
    });
  });

  describe('checkEmptyLinks', () => {
    it('should detect links without accessible text', async () => {
      mockPage.evaluate = vi.fn().mockResolvedValue([
        {
          element: '<a href="/page"></a>',
          selector: 'a[href="/page"]',
          hasText: false,
          hasAriaLabel: false,
          hasTitle: false
        }
      ]);

      const issues = await (ruleEngine as any).checkEmptyLinks(mockPage);

      expect(issues).toHaveLength(1);
      expect(issues[0].type).toBe('empty_link');
      expect(issues[0].wcagCriteria).toContain('2.4.4');
    });
  });

  describe('checkLanguageDeclaration', () => {
    it('should detect missing language declaration', async () => {
      mockPage.evaluate = vi.fn().mockResolvedValue({
        hasLang: false,
        hasXmlLang: false
      });

      const issues = await (ruleEngine as any).checkLanguageDeclaration(mockPage);

      expect(issues).toHaveLength(1);
      expect(issues[0].type).toBe('missing_language');
      expect(issues[0].wcagCriteria).toContain('3.1.1');
    });

    it('should pass when language is declared', async () => {
      mockPage.evaluate = vi.fn().mockResolvedValue({
        hasLang: true,
        hasXmlLang: false
      });

      const issues = await (ruleEngine as any).checkLanguageDeclaration(mockPage);

      expect(issues).toHaveLength(0);
    });
  });

  describe('checkDuplicateIds', () => {
    it('should detect duplicate ID attributes', async () => {
      mockPage.evaluate = vi.fn().mockResolvedValue([
        {
          id: 'duplicate-id',
          elements: [
            '<div id="duplicate-id">First</div>',
            '<span id="duplicate-id">Second</span>'
          ]
        }
      ]);

      const issues = await (ruleEngine as any).checkDuplicateIds(mockPage);

      expect(issues).toHaveLength(1);
      expect(issues[0].type).toBe('duplicate_id');
      expect(issues[0].wcagCriteria).toContain('4.1.1');
    });
  });

  describe('utility functions', () => {
    describe('calculateContrastRatio', () => {
      it('should calculate correct contrast ratio', () => {
        const ratio = (ruleEngine as any).calculateContrastRatio(
          'rgb(0,0,0)',     // Black
          'rgb(255,255,255)' // White
        );

        expect(ratio).toBeCloseTo(21, 1); // Perfect contrast
      });

      it('should handle same colors', () => {
        const ratio = (ruleEngine as any).calculateContrastRatio(
          'rgb(128,128,128)',
          'rgb(128,128,128)'
        );

        expect(ratio).toBeCloseTo(1, 1); // No contrast
      });
    });

    describe('parseRgbColor', () => {
      it('should parse RGB color values', () => {
        const color = (ruleEngine as any).parseRgbColor('rgb(255, 128, 0)');
        expect(color).toEqual([255, 128, 0]);
      });

      it('should handle malformed RGB values', () => {
        const color = (ruleEngine as any).parseRgbColor('invalid-color');
        expect(color).toEqual([0, 0, 0]);
      });
    });

    describe('getLuminance', () => {
      it('should calculate correct luminance', () => {
        const whiteLuminance = (ruleEngine as any).getLuminance([255, 255, 255]);
        const blackLuminance = (ruleEngine as any).getLuminance([0, 0, 0]);

        expect(whiteLuminance).toBeCloseTo(1, 2);
        expect(blackLuminance).toBeCloseTo(0, 2);
      });
    });
  });

  describe('error handling', () => {
    it('should handle page evaluation errors', async () => {
      mockPage.evaluate = vi.fn().mockRejectedValue(new Error('Evaluation failed'));

      const issues = await (ruleEngine as any).checkMissingAltText(mockPage);

      expect(issues).toHaveLength(0);
    });

    it('should handle invalid data from page evaluation', async () => {
      mockPage.evaluate = vi.fn().mockResolvedValue(null);

      const issues = await (ruleEngine as any).checkMissingAltText(mockPage);

      expect(issues).toHaveLength(0);
    });
  });

  describe('performance', () => {
    it('should complete scan within reasonable time', async () => {
      mockPage.evaluate = vi.fn().mockResolvedValue([]);

      const startTime = Date.now();
      await ruleEngine.scanPage(mockPage);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(5000); // 5 seconds max
    });
  });
});