import { vi, describe, it, expect, beforeEach } from 'vitest';
import { POST } from './route';
import { createClient } from '@supabase/supabase-js';

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}));

describe('POST /api/waitlist', () => {
  const mockInsert = vi.fn();
  const mockFrom = vi.fn(() => ({ insert: mockInsert }));
  const mockSupabase = { from: mockFrom };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createClient).mockReturnValue(mockSupabase as any);
    
    // Mock console methods
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('creates waitlist entry for valid email', async () => {
    mockInsert.mockResolvedValue({ data: {}, error: null });

    const request = new Request('http://localhost:3000/api/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockInsert).toHaveBeenCalledWith([{
      email: 'test@example.com',
      source: 'web',
      metadata: expect.objectContaining({
        ip: 'unknown',
        userAgent: 'unknown',
        timestamp: expect.any(String),
      }),
    }]);
  });

  it('validates email format', async () => {
    const request = new Request('http://localhost:3000/api/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'invalid-email' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid email format');
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('requires email field', async () => {
    const request = new Request('http://localhost:3000/api/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Valid email is required');
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('handles duplicate emails gracefully', async () => {
    mockInsert.mockResolvedValue({ 
      data: null, 
      error: { code: '23505', message: 'Duplicate key' } 
    });

    const request = new Request('http://localhost:3000/api/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'existing@example.com' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('Email added to waitlist');
  });

  it('handles database errors', async () => {
    mockInsert.mockResolvedValue({ 
      data: null, 
      error: { code: '42P01', message: 'Table does not exist' } 
    });

    const request = new Request('http://localhost:3000/api/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to add to waitlist');
    expect(data.debug).toBe('Table does not exist');
    expect(data.code).toBe('42P01');
  });

  it('includes metadata in the request', async () => {
    mockInsert.mockResolvedValue({ data: {}, error: null });

    const request = new Request('http://localhost:3000/api/waitlist', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 Test Browser'
      },
      body: JSON.stringify({
        email: 'test@example.com',
        source: 'landing-page',
        metadata: { campaign: 'beta-launch' }
      }),
    });

    // Mock request.ip
    Object.defineProperty(request, 'ip', { value: '192.168.1.1' });

    const response = await POST(request);
    
    expect(response.status).toBe(200);
    expect(mockInsert).toHaveBeenCalledWith([{
      email: 'test@example.com',
      source: 'landing-page',
      metadata: expect.objectContaining({
        campaign: 'beta-launch',
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0 Test Browser',
        timestamp: expect.any(String),
      }),
    }]);
  });

  it('handles JSON parsing errors', async () => {
    const request = new Request('http://localhost:3000/api/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid json',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
    expect(data.debug).toContain('Unexpected token');
  });

  it('lowercases email', async () => {
    mockInsert.mockResolvedValue({ data: {}, error: null });

    const request = new Request('http://localhost:3000/api/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'Test@EXAMPLE.com' }),
    });

    const response = await POST(request);
    
    expect(response.status).toBe(200);
    expect(mockInsert).toHaveBeenCalledWith([
      expect.objectContaining({
        email: 'test@example.com',
      })
    ]);
  });

  it('validates email type', async () => {
    const request = new Request('http://localhost:3000/api/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 123 }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Valid email is required');
    expect(mockInsert).not.toHaveBeenCalled();
  });
});