import { createClient } from '@supabase/supabase-js';

// Environment configuration
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'your-project-url';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
}); 