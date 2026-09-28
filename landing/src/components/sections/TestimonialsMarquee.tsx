'use client'

import { Star } from 'lucide-react'
import { ScrollReveal } from '@/components/ui/ScrollReveal'
import type { Testimonial, TestimonialsData } from '@/content/testimonials'

type TestimonialsMarqueeProps = {
  testimonials: TestimonialsData
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={14}
          className={i < rating ? 'fill-tertiary text-tertiary' : 'fill-border text-border'}
          aria-hidden="true"
        />
      ))}
    </div>
  )
}

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <div className="flex-shrink-0 w-[340px] bg-card border border-border rounded-2xl p-6 flex flex-col gap-4 mx-3 shadow-sm">
      <StarRating rating={testimonial.rating} />
      <blockquote className="text-sm text-text-primary leading-relaxed flex-1">
        &ldquo;{testimonial.quote}&rdquo;
      </blockquote>
      <footer className="flex flex-col gap-0.5">
        <cite className="not-italic text-sm font-semibold text-text-primary">{testimonial.name}</cite>
        <span className="text-xs text-text-secondary">{testimonial.role}</span>
      </footer>
    </div>
  )
}

type MarqueeRowProps = {
  testimonials: Testimonial[]
  direction: 'forward' | 'reverse'
  label: string
}

function MarqueeRow({ testimonials, direction, label }: MarqueeRowProps) {
  // Duplicate array for seamless infinite loop
  const doubled = [...testimonials, ...testimonials]

  return (
    <div className="relative" aria-label={`${label} testimonials`}>
      {/* Left gradient fade */}
      <div
        className="absolute left-0 top-0 bottom-0 w-24 z-10 pointer-events-none"
        style={{
          background: 'linear-gradient(to right, #F8FAFC 0%, transparent 100%)',
        }}
        aria-hidden="true"
      />
      {/* Right gradient fade */}
      <div
        className="absolute right-0 top-0 bottom-0 w-24 z-10 pointer-events-none"
        style={{
          background: 'linear-gradient(to left, #F8FAFC 0%, transparent 100%)',
        }}
        aria-hidden="true"
      />

      {/* Scrolling track — pause on hover */}
      <div className="overflow-hidden">
        <div
          className={`flex ${direction === 'forward' ? 'animate-scroll-x' : 'animate-scroll-x-reverse'} hover:[animation-play-state:paused]`}
          aria-hidden="false"
        >
          {doubled.map((t, i) => (
            <TestimonialCard key={`${t.name}-${i}`} testimonial={t} />
          ))}
        </div>
      </div>
    </div>
  )
}

export function TestimonialsMarquee({ testimonials }: TestimonialsMarqueeProps) {
  return (
    <section
      className="bg-canvas py-20 sm:py-24 overflow-hidden"
      aria-label="Customer testimonials"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
        <ScrollReveal>
          <div className="text-center">
            <span className="inline-block text-xs font-semibold text-secondary uppercase tracking-widest mb-3">
              Real Stories
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-text-primary mb-4">
              Loved by employers and workers alike
            </h2>
            <p className="text-base text-text-secondary max-w-xl mx-auto">
              Thousands of Nigerians trust menial every day for safe, reliable work.
            </p>
          </div>
        </ScrollReveal>
      </div>

      {/* Row 1 — Employers (forward) */}
      <div className="mb-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-3">
          <span className="text-xs font-semibold text-text-secondary uppercase tracking-widest">
            Employers
          </span>
        </div>
        <MarqueeRow
          testimonials={testimonials.employer}
          direction="forward"
          label="Employer"
        />
      </div>

      {/* Row 2 — Workers (reverse) */}
      <div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-3">
          <span className="text-xs font-semibold text-text-secondary uppercase tracking-widest">
            Workers
          </span>
        </div>
        <MarqueeRow
          testimonials={testimonials.worker}
          direction="reverse"
          label="Worker"
        />
      </div>
    </section>
  )
}
