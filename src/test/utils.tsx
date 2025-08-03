import { ReactElement } from 'react';
import { render, RenderOptions, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

// Custom render function that includes providers
export function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return {
    user: userEvent.setup(),
    ...render(ui, options),
  };
}

// Re-export everything
export * from '@testing-library/react';
export { customRender as render, waitFor };

// Test data factories
export const createMockEmail = (index = 0) => `test${index}@example.com`;

export const createMockWaitlistEntry = (overrides = {}) => ({
  id: 'mock-id',
  email: 'test@example.com',
  source: 'web',
  metadata: {},
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

// Mock analytics functions
export const mockAnalytics = () => {
  const trackEvent = vi.fn();
  const trackPageView = vi.fn();
  const trackConversion = vi.fn();
  
  return {
    trackEvent,
    trackPageView,
    trackConversion,
  };
};

// Wait for async operations
export const waitForLoadingToFinish = () => 
  waitFor(() => {
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).not.toBeInTheDocument();
  });