import { vi, describe, it, expect } from 'vitest';
import { render, screen } from '@/test/utils';
import userEvent from '@testing-library/user-event';
import { Hero } from './Hero';

// Mock the analytics hook
vi.mock('@/hooks/useAnalytics', () => ({
  useAnalytics: () => ({
    clickCTA: vi.fn(),
  }),
}));

// Mock window.scrollTo
global.scrollTo = vi.fn();

describe('Hero', () => {
  const user = userEvent.setup();

  it('renders main headline and subheadline', () => {
    render(<Hero />);
    
    expect(screen.getByText(/The First Scanner That Makes Sites/i)).toBeInTheDocument();
    expect(screen.getByText(/AI Agent Compatible/i)).toBeInTheDocument();
    expect(screen.getByText(/In the AI agent economy, accessibility isn't a feature—it's a network advantage/i)).toBeInTheDocument();
  });

  it('renders announcement bar', () => {
    render(<Hero />);
    
    expect(screen.getByText(/WORLD'S FIRST/i)).toBeInTheDocument();
    expect(screen.getByText(/AI Agent-Compatible Accessibility Scanner/i)).toBeInTheDocument();
  });

  it('renders CTA buttons', () => {
    render(<Hero />);
    
    expect(screen.getByRole('button', { name: /Start Free - Get 2 PRs/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /See Live Demo/i })).toBeInTheDocument();
  });

  it('handles Start Free button click', async () => {
    const mockGetElementById = vi.fn().mockReturnValue({ offsetTop: 1000 });
    global.document.getElementById = mockGetElementById;
    
    render(<Hero />);
    
    const startButton = screen.getByRole('button', { name: /Start Free - Get 2 PRs/i });
    await user.click(startButton);
    
    expect(mockGetElementById).toHaveBeenCalledWith('pricing');
    expect(global.scrollTo).toHaveBeenCalledWith({ 
      top: 1000, 
      behavior: 'smooth' 
    });
  });

  it('handles Watch Demo button click', async () => {
    render(<Hero />);
    
    const demoButton = screen.getByRole('button', { name: /See Live Demo/i });
    await user.click(demoButton);
    
    // Demo modal should appear - look for the heading specifically
    const modalHeading = screen.getByRole('heading', { name: /Live Demo/i });
    expect(modalHeading).toBeInTheDocument();
    expect(screen.getByText(/Demo video placeholder/i)).toBeInTheDocument();
  });

  it('closes demo modal when close button is clicked', async () => {
    render(<Hero />);
    
    // Open modal
    const demoButton = screen.getByRole('button', { name: /See Live Demo/i });
    await user.click(demoButton);
    
    // Close modal
    const closeButton = screen.getByRole('button', { name: /×/i });
    await user.click(closeButton);
    
    // Modal should be gone
    expect(screen.queryByText(/Demo video placeholder/i)).not.toBeInTheDocument();
  });

  it('renders social proof section', () => {
    render(<Hero />);
    
    expect(screen.getByText(/Built for modern development teams/i)).toBeInTheDocument();
    expect(screen.getByText(/GitHub/i)).toBeInTheDocument();
    expect(screen.getByText(/VS Code/i)).toBeInTheDocument();
    expect(screen.getByText(/Next.js/i)).toBeInTheDocument();
  });

  it('renders dashboard mockup', () => {
    render(<Hero />);
    
    expect(screen.getByText(/Repository: my-website/i)).toBeInTheDocument();
    expect(screen.getByText(/Scan Complete/i)).toBeInTheDocument();
    expect(screen.getByText('23')).toBeInTheDocument();
    expect(screen.getByText(/Issues Found/i)).toBeInTheDocument();
    expect(screen.getByText('19')).toBeInTheDocument();
    expect(screen.getByText(/Auto-Fixed/i)).toBeInTheDocument();
    
    // Use getAllByText for '1' since it appears multiple times
    const prCount = screen.getAllByText('1').find(element => 
      element.closest('.bg-green-50')
    );
    expect(prCount).toBeInTheDocument();
    expect(screen.getByText(/PR Created/i)).toBeInTheDocument();
  });

  it('renders example issues in mockup', () => {
    render(<Hero />);
    
    expect(screen.getByText(/Missing alt text on hero image/i)).toBeInTheDocument();
    expect(screen.getByText(/Low contrast in navigation buttons/i)).toBeInTheDocument();
    expect(screen.getByText(/Creating pull request.../i)).toBeInTheDocument();
  });

  it('renders AI agent network message', () => {
    render(<Hero />);
    
    const message = screen.getByText(/As AI agents begin to power everything/i);
    expect(message).toBeInTheDocument();
    expect(message.parentElement).toHaveClass('bg-shaft-light-gray');
  });

  it('has proper semantic structure', () => {
    const { container } = render(<Hero />);
    
    // Should have section element
    const section = container.querySelector('section');
    expect(section).toBeInTheDocument();
    
    // Should have h1 heading
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent(/The First Scanner That Makes Sites/i);
  });

  it('applies hover effects on buttons', async () => {
    render(<Hero />);
    
    const startButton = screen.getByRole('button', { name: /Start Free - Get 2 PRs/i });
    expect(startButton).toHaveClass('hover:bg-red-600');
    
    const demoButton = screen.getByRole('button', { name: /See Live Demo/i });
    expect(demoButton).toHaveClass('hover:text-shaft-red');
  });

  it('has proper accessibility attributes', () => {
    render(<Hero />);
    
    // Buttons should be focusable
    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      expect(button).not.toHaveAttribute('disabled');
    });
  });
});