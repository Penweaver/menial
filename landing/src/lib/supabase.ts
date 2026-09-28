import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Lazy singleton Supabase client for the landing page.
 *
 * The client is created on first use, NOT at module load time.
 * This prevents `supabaseUrl is required` crashes during `next build`
 * when NEXT_PUBLIC_* env vars are not present in the build environment.
 *
 * All data-fetching functions in landing-data.ts call getSupabase()
 * instead of importing the client directly.
 */
let _client: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) return null

  if (!_client) {
    _client = createClient(url, key)
  }

  return _client
}
