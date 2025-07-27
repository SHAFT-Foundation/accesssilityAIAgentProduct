import { createClient } from '@supabase/supabase-js'

// Use hardcoded values to ensure they're always available
const supabaseUrl = 'https://uyvlawgxlzddsoikmmjm.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5dmxhd2d4bHpkZHNvaWttbWptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1Njg1NTYsImV4cCI6MjA2OTE0NDU1Nn0.tEZ98ILmkTbm7poHwAUdK04-2Jcmfs2HghNZAo1oc2M'

// Debug logging
if (typeof window !== 'undefined') {
  console.log('Supabase URL:', supabaseUrl);
  console.log('Supabase Key prefix:', supabaseKey.substring(0, 20) + '...');
  console.log('Creating Supabase client...');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
})

// Verify client is created properly
if (typeof window !== 'undefined') {
  console.log('Supabase client created:', !!supabase);
  console.log('Supabase client URL:', supabase.supabaseUrl);
  console.log('Supabase client key available:', !!supabase.supabaseKey);
}
