import { createClient } from '@supabase/supabase-js'

// Use environment variables with secure public anon key (safe for client-side)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://uyvlawgxlzddsoikmmjm.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5dmxhd2d4bHpkZHNvaWttbWptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1Njg1NTYsImV4cCI6MjA2OTE0NDU1Nn0.tEZ98ILmkTbm7poHwAUdK04-2Jcmfs2HghNZAo1oc2M'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
})
