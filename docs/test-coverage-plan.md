# Comprehensive Test Coverage Plan
## Shaft Accessibility AI Agent Platform

### Overview
This document outlines a complete testing strategy to ensure the reliability, performance, and security of the Shaft platform. The plan covers unit, integration, end-to-end, performance, and security testing.

## Current Test Coverage Analysis

### Existing Tests
1. **Playwright E2E Test** (`test-waitlist-playwright.js`)
   - Tests waitlist form submission
   - Verifies success/error messages
   - Limited to happy path testing

### Coverage Gaps
- **No unit tests** for React components
- **No integration tests** for API routes
- **No performance benchmarks**
- **No security testing**
- **No accessibility testing** (ironic for an accessibility platform)
- **No visual regression tests**
- **No load testing**

## Test Framework Selection

### Chosen Stack
```json
{
  "unit": "Vitest + React Testing Library",
  "integration": "Vitest + MSW (Mock Service Worker)",
  "e2e": "Playwright",
  "performance": "Lighthouse CI + k6",
  "security": "OWASP ZAP + npm audit",
  "accessibility": "axe-core + Pa11y",
  "visual": "Percy or Chromatic"
}
```

## Detailed Test Implementation Plan

### 1. Unit Tests (Target: 85% Coverage)

#### Components to Test
```typescript
// src/components/marketing/WaitlistForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WaitlistForm } from './WaitlistForm';

describe('WaitlistForm', () => {
  it('renders email input and submit button', () => {
    render(<WaitlistForm />);
    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /join/i })).toBeInTheDocument();
  });

  it('validates email format before submission', async () => {
    render(<WaitlistForm />);
    const input = screen.getByPlaceholderText(/email/i);
    const button = screen.getByRole('button', { name: /join/i });
    
    await userEvent.type(input, 'invalid-email');
    await userEvent.click(button);
    
    expect(screen.getByText(/valid email/i)).toBeInTheDocument();
  });

  it('shows loading state during submission', async () => {
    render(<WaitlistForm />);
    const input = screen.getByPlaceholderText(/email/i);
    const button = screen.getByRole('button', { name: /join/i });
    
    await userEvent.type(input, 'test@example.com');
    await userEvent.click(button);
    
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('displays success message after submission', async () => {
    render(<WaitlistForm />);
    const input = screen.getByPlaceholderText(/email/i);
    const button = screen.getByRole('button', { name: /join/i });
    
    await userEvent.type(input, 'test@example.com');
    await userEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText(/you're on the waitlist/i)).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    // Mock API failure
    server.use(
      rest.post('/api/waitlist', (req, res, ctx) => {
        return res(ctx.status(500), ctx.json({ error: 'Server error' }));
      })
    );

    render(<WaitlistForm />);
    const input = screen.getByPlaceholderText(/email/i);
    const button = screen.getByRole('button', { name: /join/i });
    
    await userEvent.type(input, 'test@example.com');
    await userEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
  });
});
```

#### Hooks to Test
```typescript
// src/hooks/useAnalytics.test.ts
import { renderHook, act } from '@testing-library/react';
import { useAnalytics } from './useAnalytics';

describe('useAnalytics', () => {
  beforeEach(() => {
    window.gtag = vi.fn();
  });

  it('tracks page views', () => {
    const { result } = renderHook(() => useAnalytics());
    
    act(() => {
      result.current.trackPageView('/test-page');
    });
    
    expect(window.gtag).toHaveBeenCalledWith('config', expect.any(String), {
      page_path: '/test-page',
    });
  });

  it('tracks custom events', () => {
    const { result } = renderHook(() => useAnalytics());
    
    act(() => {
      result.current.trackEvent('button_click', { button_id: 'cta-hero' });
    });
    
    expect(window.gtag).toHaveBeenCalledWith('event', 'button_click', {
      button_id: 'cta-hero',
    });
  });

  it('respects opt-out preferences', () => {
    localStorage.setItem('analytics-opt-out', 'true');
    const { result } = renderHook(() => useAnalytics());
    
    act(() => {
      result.current.trackEvent('test_event');
    });
    
    expect(window.gtag).not.toHaveBeenCalled();
  });
});
```

### 2. Integration Tests

#### API Routes
```typescript
// src/app/api/waitlist/route.test.ts
import { POST } from './route';
import { createClient } from '@supabase/supabase-js';

vi.mock('@supabase/supabase-js');

describe('POST /api/waitlist', () => {
  it('creates waitlist entry for valid email', async () => {
    const mockInsert = vi.fn().mockResolvedValue({ data: {}, error: null });
    createClient.mockReturnValue({
      from: () => ({ insert: mockInsert })
    });

    const request = new Request('http://localhost:3000/api/waitlist', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockInsert).toHaveBeenCalledWith([{
      email: 'test@example.com',
      source: 'web',
      metadata: expect.any(Object),
    }]);
  });

  it('rejects invalid email format', async () => {
    const request = new Request('http://localhost:3000/api/waitlist', {
      method: 'POST',
      body: JSON.stringify({ email: 'invalid-email' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Invalid email format');
  });

  it('handles duplicate emails gracefully', async () => {
    const mockInsert = vi.fn().mockResolvedValue({ 
      data: null, 
      error: { code: '23505' } 
    });
    createClient.mockReturnValue({
      from: () => ({ insert: mockInsert })
    });

    const request = new Request('http://localhost:3000/api/waitlist', {
      method: 'POST',
      body: JSON.stringify({ email: 'existing@example.com' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });
});
```

### 3. E2E Tests (Playwright)

#### Test Scenarios
```typescript
// tests/e2e/landing-page.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('has correct title and meta tags', async ({ page }) => {
    await expect(page).toHaveTitle(/Shaft - AI-Powered Accessibility/);
    
    const description = await page.getAttribute('meta[name="description"]', 'content');
    expect(description).toContain('accessibility');
  });

  test('hero section is visible and interactive', async ({ page }) => {
    const hero = page.locator('[data-testid="hero-section"]');
    await expect(hero).toBeVisible();
    
    const ctaButton = hero.locator('button:has-text("Get Started")');
    await expect(ctaButton).toBeVisible();
    await ctaButton.click();
    
    // Should scroll to waitlist form
    await expect(page.locator('input[type="email"]')).toBeInViewport();
  });

  test('navigation works correctly', async ({ page }) => {
    const nav = page.locator('nav');
    
    // Test all nav links
    const links = [
      { text: 'Features', target: '#features' },
      { text: 'How It Works', target: '#how-it-works' },
      { text: 'Pricing', target: '#pricing' },
    ];
    
    for (const link of links) {
      await nav.locator(`text=${link.text}`).click();
      await expect(page).toHaveURL(link.target);
    }
  });

  test('is accessible', async ({ page }) => {
    const violations = await page.evaluate(async () => {
      const { AxeBuilder } = await import('axe-playwright');
      const results = await new AxeBuilder({ page }).analyze();
      return results.violations;
    });
    
    expect(violations).toHaveLength(0);
  });

  test('performs well on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check mobile menu
    const mobileMenu = page.locator('[data-testid="mobile-menu-button"]');
    await expect(mobileMenu).toBeVisible();
    
    await mobileMenu.click();
    const mobileNav = page.locator('[data-testid="mobile-navigation"]');
    await expect(mobileNav).toBeVisible();
  });
});

// tests/e2e/waitlist-flow.spec.ts
test.describe('Waitlist Signup Flow', () => {
  test('complete signup journey', async ({ page }) => {
    await page.goto('/');
    
    // Scroll to form
    await page.locator('text=Join the Waitlist').first().click();
    
    // Fill form
    const email = `test-${Date.now()}@example.com`;
    await page.fill('input[type="email"]', email);
    await page.click('button:has-text("Join Waitlist")');
    
    // Verify success
    await expect(page.locator('text=You\'re on the waitlist')).toBeVisible();
    
    // Verify analytics event was fired
    const gtagCalls = await page.evaluate(() => window.gtagCalls);
    expect(gtagCalls).toContainEqual({
      event: 'sign_up',
      method: 'waitlist',
    });
  });

  test('handles network failures', async ({ page }) => {
    // Block API calls
    await page.route('**/api/waitlist', route => route.abort());
    
    await page.goto('/');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.click('button:has-text("Join Waitlist")');
    
    await expect(page.locator('text=Something went wrong')).toBeVisible();
  });
});
```

### 4. Performance Tests

#### Lighthouse CI Configuration
```javascript
// lighthouserc.js
module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run start',
      url: ['http://localhost:3000/', 'http://localhost:3000/privacy'],
      numberOfRuns: 3,
      settings: {
        preset: 'desktop',
        throttling: {
          cpuSlowdownMultiplier: 1,
        },
      },
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 1 }],
        'categories:best-practices': ['error', { minScore: 0.95 }],
        'categories:seo': ['error', { minScore: 0.95 }],
        'first-contentful-paint': ['error', { maxNumericValue: 1500 }],
        'interactive': ['error', { maxNumericValue: 3000 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
```

#### Load Testing with k6
```javascript
// tests/load/waitlist-api.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 }, // Ramp up
    { duration: '1m', target: 20 },  // Stay at 20 users
    { duration: '30s', target: 100 }, // Spike to 100 users
    { duration: '1m', target: 100 },  // Stay at 100 users
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.1'],    // Error rate under 10%
  },
};

export default function() {
  const payload = JSON.stringify({
    email: `test-${Date.now()}-${__VU}@example.com`,
    source: 'load-test',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const res = http.post('http://localhost:3000/api/waitlist', payload, params);
  
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response has success': (r) => JSON.parse(r.body).success === true,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
```

### 5. Security Tests

#### OWASP ZAP Configuration
```yaml
# zap-scan.yaml
env:
  contexts:
    - name: "Shaft Web App"
      urls:
        - "http://localhost:3000"
      includePaths:
        - "http://localhost:3000/.*"
      authentication:
        method: "form"
        
rules:
  - id: 10016  # Web Browser XSS Protection Not Enabled
    threshold: "medium"
  - id: 10017  # Cross-Domain JavaScript Source File Inclusion
    threshold: "medium"
  - id: 10019  # Content-Type Header Missing
    threshold: "low"
```

#### Security Test Suite
```typescript
// tests/security/api-security.test.ts
describe('API Security', () => {
  test('rate limiting is enforced', async () => {
    const requests = Array(100).fill(null).map(() => 
      fetch('/api/waitlist', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com' }),
      })
    );

    const responses = await Promise.all(requests);
    const rateLimited = responses.filter(r => r.status === 429);
    
    expect(rateLimited.length).toBeGreaterThan(0);
  });

  test('SQL injection is prevented', async () => {
    const maliciousInputs = [
      "test@example.com'; DROP TABLE waitlist; --",
      "test@example.com' OR '1'='1",
      "test@example.com\"; DELETE FROM waitlist WHERE \"\" = \"",
    ];

    for (const input of maliciousInputs) {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        body: JSON.stringify({ email: input }),
      });

      // Should reject as invalid email, not execute SQL
      expect(response.status).toBe(400);
    }
  });

  test('XSS is prevented in user inputs', async () => {
    const xssAttempts = [
      '<script>alert("XSS")</script>@example.com',
      'test@example.com<img src=x onerror=alert("XSS")>',
    ];

    for (const input of xssAttempts) {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        body: JSON.stringify({ email: input }),
      });

      expect(response.status).toBe(400);
    }
  });
});
```

### 6. Accessibility Tests

```typescript
// tests/a11y/accessibility.test.ts
import { test } from '@playwright/test';
import { injectAxe, checkA11y } from 'axe-playwright';

test.describe('Accessibility Compliance', () => {
  test('home page meets WCAG 2.1 AA', async ({ page }) => {
    await page.goto('/');
    await injectAxe(page);
    await checkA11y(page, null, {
      detailedReport: true,
      detailedReportOptions: {
        html: true,
      },
    });
  });

  test('keyboard navigation works', async ({ page }) => {
    await page.goto('/');
    
    // Tab through interactive elements
    await page.keyboard.press('Tab');
    const firstFocused = await page.evaluate(() => document.activeElement?.tagName);
    expect(['A', 'BUTTON', 'INPUT']).toContain(firstFocused);
    
    // Test skip links
    await page.keyboard.press('Tab');
    const skipLink = await page.locator(':focus');
    await expect(skipLink).toHaveText(/skip to content/i);
  });

  test('screen reader landmarks exist', async ({ page }) => {
    await page.goto('/');
    
    const landmarks = await page.evaluate(() => {
      const main = document.querySelector('main');
      const nav = document.querySelector('nav');
      const footer = document.querySelector('footer');
      return { main: !!main, nav: !!nav, footer: !!footer };
    });
    
    expect(landmarks).toEqual({ main: true, nav: true, footer: true });
  });
});
```

## Test Execution Strategy

### Local Development
```bash
# Run all unit tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test WaitlistForm

# Run in watch mode
npm test -- --watch
```

### CI/CD Pipeline
```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3

  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:integration

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install
      - run: npm run test:e2e

  performance-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build
      - run: npm run test:lighthouse

  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm audit --production
      - uses: zaproxy/action-full-scan@v0.4.0
        with:
          target: 'http://localhost:3000'
```

## Testing Best Practices

### 1. Test Organization
- Group related tests in describe blocks
- Use consistent naming: `ComponentName.test.tsx`
- Keep tests close to source files
- Use data-testid for E2E selectors

### 2. Test Data
- Use factories for consistent test data
- Avoid hardcoded values
- Clean up after tests
- Use separate test database

### 3. Mocking Strategy
- Mock external services (Supabase, APIs)
- Use MSW for API mocking
- Don't mock what you're testing
- Keep mocks simple and focused

### 4. Performance
- Run tests in parallel
- Use test.skip for slow tests
- Cache dependencies in CI
- Optimize test database queries

## Coverage Goals

| Test Type | Current | Target | Timeline |
|-----------|---------|---------|----------|
| Unit | 0% | 85% | Week 1-2 |
| Integration | 0% | 80% | Week 2-3 |
| E2E | 5% | 70% | Week 3-4 |
| Performance | 0% | Core flows | Week 4 |
| Security | 0% | OWASP Top 10 | Week 4 |
| Accessibility | 0% | WCAG AA | Week 5 |

## Next Steps

1. **Immediate Actions**
   - Install test dependencies
   - Set up test configuration
   - Write tests for critical paths

2. **Week 1 Focus**
   - Unit tests for all components
   - API route integration tests
   - Basic E2E smoke tests

3. **Week 2-3 Focus**
   - Expand E2E coverage
   - Add performance benchmarks
   - Implement security scans

4. **Ongoing**
   - Maintain >80% coverage
   - Add tests with new features
   - Regular security audits