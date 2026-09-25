/**
 * Menial Mobile - Supabase Client Configuration
 * 
 * Provides configured Supabase client instance with auto-refreshing
 * auth headers, offline resilience, and environment-aware fallback defaults.
 * 
 * Reference: menial-master-spec-v2.md (§18, §51, §73)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Fallback configuration for development and local testing
const DEFAULT_SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const DEFAULT_SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'menial-mobile-anon-key-local';

let supabaseMobileClient: SupabaseClient | null = null;

export function getMobileSupabaseClient(): SupabaseClient {
  if (supabaseMobileClient) {
    return supabaseMobileClient;
  }

  supabaseMobileClient = createClient(DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });

  return supabaseMobileClient;
}

export const supabase = getMobileSupabaseClient();
