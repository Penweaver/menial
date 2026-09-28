'use client'

import { useState } from 'react'
import { Plus, Minus } from 'lucide-react'
import { faqContent } from '@/content/faq'
import { ScrollReveal } from '@/components/ui/ScrollReveal'
import { cn } from '@/lib/utils'

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const toggle = (i: number) => setOpenIndex(openIndex === i ? null : i)

  return (
    <section
      id="faq"
      className="bg-canvas py-20 sm:py-24"
      aria-label="Frequently asked questions"
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <ScrollReveal>
          <div className="text-center mb-12">
            <span className="inline-block text-xs font-semibold text-secondary uppercase tracking-widest mb-3">
              FAQ
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-text-primary mb-4">
              Common questions
            </h2>
            <p className="text-base text-text-secondary">
              Everything you need to know before you get started.
            </p>
          </div>
        </ScrollReveal>

        {/* Accordion */}
        <ScrollReveal delay={100}>
          <div className="space-y-2" role="list">
            {faqContent.map((item, i) => {
              const isOpen = openIndex === i
              return (
                <div
                  key={i}
                  className="bg-card border border-border rounded-lg overflow-hidden transition-shadow duration-200 hover:shadow-sm"
                  role="listitem"
                >
                  <button
                    id={`faq-btn-${i}`}
                    aria-expanded={isOpen}
                    aria-controls={`faq-panel-${i}`}
                    onClick={() => toggle(i)}
                    className="flex items-center justify-between w-full px-6 py-5 text-left gap-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
                  >
                    <span className="text-base font-semibold text-text-primary">{item.q}</span>
                    <span
                      className={cn(
                        'flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full border border-border transition-all duration-200',
                        isOpen ? 'bg-primary border-primary text-white rotate-0' : 'bg-white text-text-secondary'
                      )}
                      aria-hidden="true"
                    >
                      {isOpen ? <Minus size={14} /> : <Plus size={14} />}
                    </span>
                  </button>

                  {/* Animated panel */}
                  <div
                    id={`faq-panel-${i}`}
                    role="region"
                    aria-labelledby={`faq-btn-${i}`}
                    className={cn(
                      'overflow-hidden transition-all duration-300 ease-in-out',
                      isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
                    )}
                  >
                    <div className="px-6 pb-5">
                      <div className="w-full h-px bg-border mb-4" aria-hidden="true" />
                      <p className="text-sm text-text-secondary leading-relaxed">{item.a}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </ScrollReveal>

        {/* Still have questions? */}
        <ScrollReveal delay={300}>
          <div className="mt-10 text-center">
            <p className="text-sm text-text-secondary">
              Still have questions?{' '}
              <a
                href="mailto:support@menial.ng"
                className="font-semibold text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
              >
                Contact support →
              </a>
            </p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
