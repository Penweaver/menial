'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Direction = 'up' | 'left' | 'right' | 'scale'

type ScrollRevealProps = {
  children: ReactNode
  className?: string
  /** Animation delay in ms after element enters viewport */
  delay?: number
  /** IntersectionObserver threshold (0–1) */
  threshold?: number
  /** Entry direction — controls which axis the element slides from */
  direction?: Direction
}

const HIDDEN_STYLES: Record<Direction, string> = {
  up:    'opacity-0 translate-y-8',
  left:  'opacity-0 -translate-x-8',
  right: 'opacity-0 translate-x-8',
  scale: 'opacity-0 scale-95',
}

const VISIBLE_STYLES: Record<Direction, string> = {
  up:    'opacity-100 translate-y-0',
  left:  'opacity-100 translate-x-0',
  right: 'opacity-100 translate-x-0',
  scale: 'opacity-100 scale-100',
}

/**
 * Wraps children in a div that animates into view when the element
 * enters the viewport via IntersectionObserver.
 *
 * Supports four directions: up (default), left, right, scale.
 * Uses a spring-like cubic-bezier for a native mobile feel.
 * Respects prefers-reduced-motion via CSS (handled in globals.css).
 */
export function ScrollReveal({
  children,
  className,
  delay = 0,
  threshold = 0.12,
  direction = 'up',
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold])

  return (
    <div
      ref={ref}
      className={cn(
        // Spring easing — same curve as colorinvoice.com
        'transition-all duration-700',
        '[transition-timing-function:cubic-bezier(0.16,1,0.3,1)]',
        visible ? VISIBLE_STYLES[direction] : HIDDEN_STYLES[direction],
        className
      )}
      style={{ transitionDelay: visible ? `${delay}ms` : '0ms' }}
    >
      {children}
    </div>
  )
}
