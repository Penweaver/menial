import { getSupabaseClient } from './supabase'
import { fallbackTestimonials, type TestimonialsData } from '@/content/testimonials'
import { statsContent } from '@/content/stats'

export type StatItem = {
  key?: string
  value: number
  prefix?: string
  suffix: string
  label: string
}

/**
 * Fetch testimonials from Supabase.
 * Falls back to static content/testimonials.ts when:
 *   - Supabase env vars are not configured (build time / dev without .env.local)
 *   - The table is empty
 *   - Any network or query error occurs
 */
export async function getLandingTestimonials(): Promise<TestimonialsData> {
  try {
    const client = getSupabaseClient()
    if (!client) return fallbackTestimonials

    const { data, error } = await client
      .from('landing_testimonials')
      .select('id, persona, quote, author_name, name:author_name, role:author_role, rating, sort_order')
      .eq('active', true)
      .order('sort_order')

    if (error || !data?.length) return fallbackTestimonials

    const employer = data.filter((t) => t.persona === 'employer')
    const worker = data.filter((t) => t.persona === 'worker')

    return {
      employer: employer.length ? employer : fallbackTestimonials.employer,
      worker: worker.length ? worker : fallbackTestimonials.worker,
    }
  } catch {
    return fallbackTestimonials
  }
}

/**
 * Fetch platform stats from Supabase.
 * Falls back to static content/stats.ts when:
 *   - Supabase env vars are not configured
 *   - The table is empty
 *   - Any network or query error occurs
 */
export async function getLandingStats(): Promise<StatItem[]> {
  try {
    const client = getSupabaseClient()
    if (!client) return statsContent

    const { data, error } = await client
      .from('landing_stats')
      .select('key, value, label, prefix, suffix')
      .eq('active', true)
      .order('sort_order')

    if (error || !data?.length) return statsContent
    return data as StatItem[]
  } catch {
    return statsContent
  }
}
