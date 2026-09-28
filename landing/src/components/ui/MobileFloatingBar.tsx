'use client'

import { useState, useEffect } from 'react'
import { ArrowRight, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

type MobileFloatingBarProps = {
  persona: 'employer' | 'worker'
  onPersonaChange: (p: 'employer' | 'worker') => void
}

export function MobileFloatingBar({ persona, onPersonaChange }: MobileFloatingBarProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      // Reveal once scrolled past 320px, hide near the very bottom footer
      const scrollY = window.scrollY
      const docHeight = document.documentElement.scrollHeight
      const winHeight = window.innerHeight
      const nearBottom = scrollY + winHeight > docHeight - 300

      if (scrollY > 340 && !nearBottom) {
        setVisible(true)
      } else {
        setVisible(false)
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const ctaHref = persona === 'employer' ? '#post-job' : '#find-work'
  const ctaLabel = persona === 'employer' ? 'Post Job in 60s' : 'Find Nearby Work'

  return (
    <aside
      aria-label="Mobile quick action"
      className={cn(
        'fixed bottom-5 inset-x-4 z-40 lg:hidden transition-all duration-500 ease-out',
        '[transition-timing-function:cubic-bezier(0.16,1,0.3,1)]',
        visible
          ? 'translate-y-0 opacity-100 pointer-events-auto'
          : 'translate-y-20 opacity-0 pointer-events-none'
      )}
    >
      <div className="max-w-md mx-auto bg-white/90 backdrop-blur-xl border border-slate-200/90 rounded-2xl p-2 shadow-2xl shadow-primary/25 flex items-center justify-between gap-2.5">
        {/* Micro Persona Switcher */}
        <div className="flex items-center bg-slate-100 rounded-xl p-1 shrink-0">
          <button
            type="button"
            onClick={() => onPersonaChange('employer')}
            className={cn(
              'px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 tap-highlight-none',
              persona === 'employer'
                ? 'bg-primary text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            Hire
          </button>
          <button
            type="button"
            onClick={() => onPersonaChange('worker')}
            className={cn(
              'px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 tap-highlight-none',
              persona === 'worker'
                ? 'bg-secondary text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            Work
          </button>
        </div>

        {/* Action CTA Button */}
        <a
          href={ctaHref}
          className="btn-shimmer btn-press tap-highlight-none flex-1 h-11 px-4 rounded-xl bg-primary text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 shadow-md shadow-primary/20 hover:bg-primary-hover transition-colors"
        >
          <span>{ctaLabel}</span>
          <ArrowRight size={15} className="shrink-0" />
        </a>
      </div>
    </aside>
  )
}
