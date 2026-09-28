import { supabase } from './supabase'
import { fallbackTestimonials, type TestimonialsData } from '@/content/testimonials'
import { statsContent } from '@/content/stats'

export async function getLandingTestimonials(): Promise<TestimonialsData> {
  try {
    const { data, error } = await supabase
      .from('landing_testimonials')
      .select('*')
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

export type StatItem = {
  value: number
  prefix?: string
  suffix: string
  label: string
}

export async function getLandingStats(): Promise<StatItem[]> {
  try {
    const { data } = await supabase
      .from('landing_stats')
      .select('key, value, label, prefix, suffix')

    if (!data?.length) return statsContent
    return data as StatItem[]
  } catch {
    return statsContent
  }
}
