import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client (using anon key for now, upgrade to service role key later)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://uyvlawgxlzddsoikmmjm.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5dmxhd2d4bHpkZHNvaWttbWptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1Njg1NTYsImV4cCI6MjA2OTE0NDU1Nn0.tEZ98ILmkTbm7poHwAUdK04-2Jcmfs2HghNZAo1oc2M';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export async function POST(request: NextRequest) {
  try {
    const { email, source, metadata } = await request.json();

    // Validate input
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Insert into waitlist with server-side security
    const { data, error } = await supabase
      .from('waitlist')
      .insert([
        {
          email: email.toLowerCase().trim(),
          source: source || 'web',
          metadata: {
            ...metadata,
            ip: request.ip || 'unknown',
            userAgent: request.headers.get('user-agent') || 'unknown',
            timestamp: new Date().toISOString(),
          }
        }
      ]);

    if (error) {
      if (error.code === '23505') {
        // Duplicate email - return success to prevent email enumeration
        return NextResponse.json({ success: true, message: 'Email added to waitlist' });
      }
      
      console.error('Waitlist insertion error:', error);
      return NextResponse.json({ error: 'Failed to add to waitlist' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Email added to waitlist' });
  } catch (error) {
    console.error('Waitlist API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}