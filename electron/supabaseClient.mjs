import { createClient } from '@supabase/supabase-js';

// Change from import.meta.env to process.env
const VITE_SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const VITE_SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!VITE_SUPABASE_URL || !VITE_SUPABASE_ANON_KEY) {
  throw new Error('Supabase environment variables are not set in the main process.');
}

const supabase = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false, // Don't persist sessions in the main process
    autoRefreshToken: false, // Don't auto refresh tokens in the main process
    flowType: 'pkce', // Use PKCE flow for better security
    // No storage implementation is needed; supabase-js defaults to in-memory
    // storage when persistSession is false.
  }
});

export default supabase;