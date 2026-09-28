'use client'

import { cn } from '@/lib/utils'

type PersonaToggleProps = {
  persona: 'employer' | 'worker'
  onChange: (persona: 'employer' | 'worker') => void
  className?: string
}

export function PersonaToggle({ persona, onChange, className }: PersonaToggleProps) {
  return (
    <div
      className={cn(
        'relative flex items-center rounded-full bg-subtle border border-border p-1 gap-0.5',
        className
      )}
      role="group"
      aria-label="Switch persona"
    >
      {/* Sliding pill indicator */}
      <span
        aria-hidden="true"
        className={cn(
          'absolute top-1 h-[calc(100%-8px)] w-[calc(50%-4px)] rounded-full bg-primary transition-transform duration-300 ease-in-out',
          persona === 'employer' ? 'translate-x-0 left-1' : 'translate-x-full left-1'
        )}
      />

      <button
        onClick={() => onChange('employer')}
        aria-pressed={persona === 'employer'}
        className={cn(
          'relative z-10 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
          persona === 'employer' ? 'text-white' : 'text-text-secondary hover:text-text-primary'
        )}
      >
        Employers
      </button>

      <button
        onClick={() => onChange('worker')}
        aria-pressed={persona === 'worker'}
        className={cn(
          'relative z-10 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
          persona === 'worker' ? 'text-white' : 'text-text-secondary hover:text-text-primary'
        )}
      >
        Workers
      </button>
    </div>
  )
}
