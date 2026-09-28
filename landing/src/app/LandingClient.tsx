'use client'

import { useState } from 'react'
import { Navbar } from '@/components/layout/Navbar'
import { Hero } from '@/components/sections/Hero'
import type { TestimonialsData } from '@/content/testimonials'
import type { StatItem } from '@/lib/landing-data'
import { StatsTicker } from '@/components/sections/StatsTicker'
import { TestimonialsMarquee } from '@/components/sections/TestimonialsMarquee'
import { HowItWorks } from '@/components/sections/HowItWorks'
import { TrustBento } from '@/components/sections/TrustBento'
import { WageEstimator } from '@/components/sections/WageEstimator'
import { FAQ } from '@/components/sections/FAQ'
import { FooterCTA } from '@/components/sections/FooterCTA'
import { Footer } from '@/components/layout/Footer'

type LandingClientProps = {
  testimonials: TestimonialsData
  stats: StatItem[]
}

/**
 * Client wrapper that owns the global persona toggle state
 * and passes it down to Navbar and Hero.
 */
export function LandingClient({ testimonials, stats }: LandingClientProps) {
  const [persona, setPersona] = useState<'employer' | 'worker'>('employer')

  return (
    <>
      <Navbar persona={persona} onPersonaChange={setPersona} />
      <main id="main-content">
        <Hero persona={persona} />
        <StatsTicker stats={stats} />
        <TestimonialsMarquee testimonials={testimonials} />
        <HowItWorks />
        <TrustBento />
        <WageEstimator />
        <FAQ />
        <FooterCTA />
      </main>
      <Footer />
    </>
  )
}
