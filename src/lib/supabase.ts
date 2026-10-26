import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'LocalConnect cannot start: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in the environment. Check your deployment environment variables.',
  );
}

export const supabase: SupabaseClient = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Hosted site URL used for auth email redirects (confirmation + reset).
// Uses the current browser origin so redirects always return to the active deployment.
export const SITE_URL = typeof window !== 'undefined' ? window.location.origin : 'https://localconnect.bolt.host';

export type SupabaseRow = Record<string, unknown>;
