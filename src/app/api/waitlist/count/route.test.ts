import { vi, describe, it, expect, beforeEach } from 'vitest';
import { GET } from './route';
import { createClient } from '@supabase/supabase-js';

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}));

describe('GET /api/waitlist/count', () => {
  const mockSelect = vi.fn();
  const mockFrom = vi.fn(() => ({ select: mockSelect }));
  const mockSupabase = { from: mockFrom };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createClient).mockReturnValue(mockSupabase as any);
    
    // Mock console methods
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('returns waitlist count successfully', async () => {
    mockSelect.mockResolvedValue({ data: null, error: null, count: 42 });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.count).toBe(42);
    expect(mockFrom).toHaveBeenCalledWith('waitlist');
    expect(mockSelect).toHaveBeenCalledWith('*', { count: 'exact', head: true });
  });

  it('handles database errors', async () => {
    mockSelect.mockResolvedValue({ 
      data: null, 
      error: { message: 'Database connection failed' }, 
      count: null 
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to get count');
  });

  it('handles null count', async () => {
    mockSelect.mockResolvedValue({ data: null, error: null, count: null });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.count).toBe(0);
  });

  it('handles undefined count', async () => {
    mockSelect.mockResolvedValue({ data: null, error: null, count: undefined });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.count).toBe(0);
  });

  it('handles exceptions', async () => {
    mockSelect.mockRejectedValue(new Error('Network timeout'));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});