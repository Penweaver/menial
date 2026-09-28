import { getLandingTestimonials, getLandingStats } from '@/lib/landing-data'
import { LandingClient } from './LandingClient'

/**
 * Root page — server component.
 * Fetches dynamic data (testimonials, stats) from Supabase at request time.
 * Falls back to static content if Supabase is unavailable.
 *
 * Persona toggle state lives in LandingClient (client boundary).
 */
export default async function LandingPage() {
  // Parallel data fetching — safe to fail individually
  const [testimonials, stats] = await Promise.all([
    getLandingTestimonials(),
    getLandingStats(),
  ])

  return (
    <>
      {/* Skip-to-content link for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-md focus:font-semibold focus:outline-none"
      >
        Skip to main content
      </a>

      <LandingClient testimonials={testimonials} stats={stats} />
    </>
  )
}
