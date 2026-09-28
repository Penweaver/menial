'use client'

import { AnimatedCounter } from '@/components/ui/AnimatedCounter'
import { ScrollReveal } from '@/components/ui/ScrollReveal'
import type { StatItem } from '@/lib/landing-data'

type StatsTickerProps = {
  stats: StatItem[]
}

export function StatsTicker({ stats }: StatsTickerProps) {
  return (
    <section
      className="bg-white border-y border-border py-14 sm:py-16"
      aria-label="Platform statistics"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <p className="text-center text-sm font-semibold text-text-secondary uppercase tracking-widest mb-10">
            Trusted across Nigeria
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {stats.map((stat, i) => (
            <ScrollReveal key={stat.label} delay={i * 100}>
              <div className="flex flex-col items-center text-center p-6 rounded-lg border border-border bg-canvas hover:border-primary/30 hover:shadow-sm transition-all duration-200">
                <span className="text-4xl sm:text-5xl font-extrabold text-text-primary tabular-nums mb-2">
                  <AnimatedCounter
                    target={stat.value}
                    prefix={stat.prefix ?? ''}
                    suffix={stat.suffix}
                    duration={1600}
                  />
                </span>
                <span className="text-sm font-medium text-text-secondary">{stat.label}</span>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}
