import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@/test/utils';
import userEvent from '@testing-library/user-event';
import { WaitlistForm } from './WaitlistForm';
import { server } from '@/test/mocks/server';
import { http, HttpResponse } from 'msw';

// Mock the analytics hook
const mockClickCTA = vi.fn();
vi.mock('@/hooks/useAnalytics', () => ({
  useAnalytics: () => ({
    clickCTA: mockClickCTA,
  }),
}));

describe('WaitlistForm', () => {
  const user = userEvent.setup();
  
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    mockClickCTA.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders email input and submit button', () => {
    render(<WaitlistForm />);
    
    expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /join waitlist/i })).toBeInTheDocument();
  });

  it('accepts custom props', () => {
    render(
      <WaitlistForm 
        placeholder="Your email address"
        buttonText="Get Early Access"
        className="custom-class"
      />
    );
    
    expect(screen.getByPlaceholderText('Your email address')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /get early access/i })).toBeInTheDocument();
  });

  it('validates email format before submission', async () => {
    render(<WaitlistForm />);
    
    const input = screen.getByPlaceholderText('Enter your email');
    const button = screen.getByRole('button', { name: /join waitlist/i });
    
    // Button should be disabled when no email
    expect(button).toBeDisabled();
    
    // Type invalid email - HTML5 validation will handle this
    await user.type(input, 'invalid-email');
    
    // HTML5 validation should prevent submission
    expect(input).toHaveAttribute('type', 'email');
    expect(input).toHaveAttribute('required');
  });

  it('shows loading state during submission', async () => {
    // Add a delay to the response
    server.use(
      http.post('/api/waitlist', async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return HttpResponse.json({ success: true });
      })
    );
    
    render(<WaitlistForm />);
    
    const input = screen.getByPlaceholderText('Enter your email');
    const button = screen.getByRole('button', { name: /join waitlist/i });
    
    await user.type(input, 'test@example.com');
    await user.click(button);
    
    // Check for loading spinner
    expect(screen.getByRole('button')).toBeDisabled();
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('displays success message after successful submission', async () => {
    render(<WaitlistForm />);
    
    const input = screen.getByPlaceholderText('Enter your email');
    const button = screen.getByRole('button', { name: /join waitlist/i });
    
    await user.type(input, 'test@example.com');
    await user.click(button);
    
    await waitFor(() => {
      expect(screen.getByText(/you're on the waitlist/i)).toBeInTheDocument();
    }, { timeout: 3000 });
    
    // Check that form is replaced with success message
    expect(screen.queryByPlaceholderText('Enter your email')).not.toBeInTheDocument();
  });

  it('handles API errors gracefully', async () => {
    // Override MSW handler for this test
    server.use(
      http.post('/api/waitlist', () => {
        return HttpResponse.json(
          { error: 'Server error' },
          { status: 500 }
        );
      })
    );
    
    render(<WaitlistForm />);
    
    const input = screen.getByPlaceholderText('Enter your email');
    const button = screen.getByRole('button', { name: /join waitlist/i });
    
    await user.type(input, 'test@example.com');
    await user.click(button);
    
    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });
    
    // Form should still be visible
    expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument();
  });

  it('handles invalid email format error from API', async () => {
    render(<WaitlistForm />);
    
    const input = screen.getByPlaceholderText('Enter your email');
    const button = screen.getByRole('button', { name: /join waitlist/i });
    
    // Use an email that MSW will reject
    await user.type(input, 'invalid@test');
    await user.click(button);
    
    await waitFor(() => {
      expect(screen.getByText(/invalid email format/i)).toBeInTheDocument();
    });
  });

  it('tracks analytics on successful submission', async () => {
    render(<WaitlistForm source="test-source" />);
    
    const input = screen.getByPlaceholderText('Enter your email');
    const button = screen.getByRole('button', { name: /join waitlist/i });
    
    await user.type(input, 'test@example.com');
    await user.click(button);
    
    await waitFor(() => {
      expect(screen.getByText(/you're on the waitlist/i)).toBeInTheDocument();
    });
    
    expect(mockClickCTA).toHaveBeenCalledWith('waitlist_signup', 'test-source');
  });

  it('disables form during submission', async () => {
    render(<WaitlistForm />);
    
    const input = screen.getByPlaceholderText('Enter your email');
    const button = screen.getByRole('button', { name: /join waitlist/i });
    
    await user.type(input, 'test@example.com');
    
    // Start submission
    const clickPromise = user.click(button);
    
    // Check disabled state immediately
    await waitFor(() => {
      expect(input).toBeDisabled();
      expect(button).toBeDisabled();
    });
    
    await clickPromise;
  });

  it('shows waitlist count when showCount is true', async () => {
    render(<WaitlistForm showCount={true} />);
    
    await waitFor(() => {
      expect(screen.getByText(/1,234 people already on the waitlist/i)).toBeInTheDocument();
    });
  });

  it('handles network errors gracefully', async () => {
    // Mock network error
    server.use(
      http.post('/api/waitlist', () => {
        return HttpResponse.error();
      })
    );
    
    render(<WaitlistForm />);
    
    const input = screen.getByPlaceholderText('Enter your email');
    const button = screen.getByRole('button', { name: /join waitlist/i });
    
    await user.type(input, 'test@example.com');
    await user.click(button);
    
    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });
  });

  it('button is enabled when email is typed', async () => {
    render(<WaitlistForm />);
    
    const input = screen.getByPlaceholderText('Enter your email');
    const button = screen.getByRole('button', { name: /join waitlist/i });
    
    // Initially disabled
    expect(button).toBeDisabled();
    
    // Type email
    await user.type(input, 'test@example.com');
    
    // Should be enabled
    expect(button).not.toBeDisabled();
  });
});