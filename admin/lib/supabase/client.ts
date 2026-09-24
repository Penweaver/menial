import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { IDatabaseClient } from '@shared/services/admin/AdminService';

let client: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient {
  if (client) return client;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key-here';

  client = createBrowserClient(supabaseUrl, supabaseAnonKey);
  return client;
}

/**
 * Adapts SupabaseClient to satisfy IDatabaseClient interface for AdminService and SuperadminService.
 */
export function toDatabaseClient(supabase: SupabaseClient): IDatabaseClient {
  return {
    async rpc<T = unknown>(fn: string, args?: Record<string, unknown>) {
      const res = await supabase.rpc(fn, args);
      return {
        data: res.data as T | null,
        error: res.error ? new Error(res.error.message) : null,
      };
    },
  };
}
