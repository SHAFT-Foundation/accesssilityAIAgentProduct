import { NextResponse } from 'next/server';
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

export async function GET() {
  try {
    const { count, error } = await supabase
      .from('waitlist')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('Waitlist count error:', error);
      return NextResponse.json({ error: 'Failed to get count' }, { status: 500 });
    }

    return NextResponse.json({ count: count || 0 });
  } catch (error) {
    console.error('Waitlist count API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}