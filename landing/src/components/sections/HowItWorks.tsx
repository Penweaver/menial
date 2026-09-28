'use client'

import { useState } from 'react'
import {
  ClipboardList,
  UserCheck,
  BadgeCheck,
  IdCard,
  MapPin,
  Banknote,
  type LucideIcon,
} from 'lucide-react'
import { howItWorksContent } from '@/content/howItWorks'
import { ScrollReveal } from '@/components/ui/ScrollReveal'
import { cn } from '@/lib/utils'

type IconName =
  | 'ClipboardList'
  | 'UserCheck'
  | 'BadgeCheck'
  | 'IdCard'
  | 'MapPin'
  | 'Banknote'

const ICON_MAP: Record<IconName, LucideIcon> = {
  ClipboardList,
  UserCheck,
  BadgeCheck,
  IdCard,
  MapPin,
  Banknote,
}

type Tab = 'employer' | 'worker'

export function HowItWorks() {
  const [activeTab, setActiveTab] = useState<Tab>('employer')

  const steps = howItWorksContent[activeTab]

  return (
    <section
      id="how-it-works"
      className="bg-white py-20 sm:py-24"
      aria-label="How menial works"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <ScrollReveal>
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="inline-block text-xs font-semibold text-secondary uppercase tracking-widest mb-3">
              Simple Process
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-text-primary mb-4">
              How it works
            </h2>
            <p className="text-base text-text-secondary leading-relaxed">
              Get started in minutes — whether you need help or want to earn.
            </p>
          </div>
        </ScrollReveal>

        {/* Tab switcher */}
        <ScrollReveal delay={100}>
          <div className="flex justify-center mb-12">
            <div
              className="inline-flex rounded-full bg-subtle border border-border p-1 gap-0.5"
              role="tablist"
              aria-label="Select persona"
            >
              {(['employer', 'worker'] as Tab[]).map((tab) => (
                <button
                  key={tab}
                  role="tab"
                  id={`tab-${tab}`}
                  aria-selected={activeTab === tab}
                  aria-controls={`panel-${tab}`}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    'px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
                    activeTab === tab
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-text-secondary hover:text-text-primary'
                  )}
                >
                  {tab === 'employer' ? "I'm an Employer" : "I'm a Worker"}
                </button>
              ))}
            </div>
          </div>
        </ScrollReveal>

        {/* Steps panel */}
        <div
          role="tabpanel"
          id={`panel-${activeTab}`}
          aria-labelledby={`tab-${activeTab}`}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-10 relative">
            {/* Connector line — desktop only */}
            <div
              className="hidden md:block absolute top-10 left-[calc(33.33%+1rem)] right-[calc(33.33%+1rem)] h-px bg-gradient-to-r from-border via-primary/30 to-border"
              aria-hidden="true"
            />

            {steps.map((step, i) => {
              const Icon = ICON_MAP[step.icon as IconName]
              return (
                <ScrollReveal key={step.step} delay={i * 120}>
                  <div className="flex flex-col items-center text-center">
                    {/* Step number + icon */}
                    <div className="relative mb-6">
                      <div className="flex items-center justify-center w-20 h-20 rounded-full bg-primary-container border-2 border-primary/20">
                        {Icon && <Icon size={28} className="text-primary" />}
                      </div>
                      {/* Step badge */}
                      <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">
                        {step.step}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-text-primary mb-2">{step.title}</h3>
                    <p className="text-sm text-text-secondary leading-relaxed max-w-xs">
                      {step.description}
                    </p>
                  </div>
                </ScrollReveal>
              )
            })}
          </div>
        </div>

        {/* Bottom CTA */}
        <ScrollReveal delay={400}>
          <div className="flex justify-center mt-14">
            <a
              href={activeTab === 'employer' ? '#post-job' : '#find-work'}
              className="btn-shimmer inline-flex items-center justify-center h-[52px] px-8 rounded-[12px] bg-primary hover:bg-primary-hover text-white text-base font-semibold transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              {activeTab === 'employer' ? 'Post Your First Job →' : 'Start Earning Today →'}
            </a>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
