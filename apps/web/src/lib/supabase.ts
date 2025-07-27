import { createClient } from '@supabase/supabase-js'

// Ensure we have the correct values - fallback to production values if env vars not found
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://uyvlawgxlzddsoikmmjm.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5dmxhd2d4bHpkZHNvaWttbWptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1Njg1NTYsImV4cCI6MjA2OTE0NDU1Nn0.tEZ98ILmkTbm7poHwAUdK04-2Jcmfs2HghNZAo1oc2M'

// Debug logging for production
if (typeof window !== 'undefined') {
  console.log('Supabase URL:', supabaseUrl);
  console.log('Supabase Key prefix:', supabaseKey.substring(0, 20) + '...');
}

export const supabase = createClient(supabaseUrl, supabaseKey)
