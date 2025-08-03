import { http, HttpResponse } from 'msw';

export const handlers = [
  // Waitlist API endpoints
  http.post('/api/waitlist', async ({ request }) => {
    const body = await request.json() as { email: string };
    
    // Simulate validation - check for proper email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!body.email || !emailRegex.test(body.email)) {
      return HttpResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }
    
    // Simulate duplicate email
    if (body.email === 'duplicate@example.com') {
      return HttpResponse.json(
        { success: true, message: 'Email added to waitlist' },
        { status: 200 }
      );
    }
    
    // Success response
    return HttpResponse.json(
      { success: true, message: 'Email added to waitlist' },
      { status: 200 }
    );
  }),
  
  http.get('/api/waitlist/count', () => {
    return HttpResponse.json({ count: 1234 });
  }),
];