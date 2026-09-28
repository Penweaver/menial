'use client'

import { useState, useEffect } from 'react'
import { Menu, X } from 'lucide-react'
import { PersonaToggle } from '@/components/ui/PersonaToggle'
import { cn } from '@/lib/utils'

const NAV_LINKS = [
  { href: '#features', label: 'Features' },
  { href: '#how-it-works', label: 'How it Works' },
  { href: '#cities', label: 'Cities' },
  { href: '#faq', label: 'FAQ' },
]

type NavbarProps = {
  persona: 'employer' | 'worker'
  onPersonaChange: (p: 'employer' | 'worker') => void
}

export function Navbar({ persona, onPersonaChange }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 16)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  const ctaLabel = persona === 'employer' ? 'Post a Job' : 'Find Work'
  const ctaHref = persona === 'employer' ? '#post-job' : '#find-work'

  return (
    <>
      <header
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-shadow duration-300',
          scrolled
            ? 'glass border-b border-border/60 shadow-sm'
            : 'glass border-b border-transparent'
        )}
        role="banner"
      >
        <nav
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between"
          aria-label="Main navigation"
        >
          {/* Logo */}
          <a
            href="/"
            className="flex items-center gap-2 flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
            aria-label="menial — home"
          >
            <img
              src="/logo.png"
              alt="menial"
              className="h-8 w-auto object-contain"
            />
          </a>

          {/* Desktop centre links */}
          <ul className="hidden lg:flex items-center gap-8" role="list">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>

          {/* Desktop right: persona toggle + CTA */}
          <div className="hidden lg:flex items-center gap-3">
            <PersonaToggle persona={persona} onChange={onPersonaChange} />
            <a
              href={ctaHref}
              className="btn-shimmer inline-flex items-center justify-center h-10 px-5 rounded-[12px] bg-primary hover:bg-primary-hover text-white text-sm font-semibold transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              {ctaLabel}
            </a>
          </div>

          {/* Mobile hamburger */}
          <button
            className="lg:hidden p-2 rounded-md text-text-secondary hover:text-text-primary hover:bg-subtle transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            onClick={() => setMenuOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
          >
            <Menu size={22} />
          </button>
        </nav>
      </header>

      {/* Mobile full-screen drawer */}
      <div
        id="mobile-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={cn(
          'fixed inset-0 z-[60] flex flex-col bg-white transition-transform duration-300 ease-in-out lg:hidden',
          menuOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-4 h-16 border-b border-border">
          <img src="/logo.png" alt="menial" className="h-7 w-auto object-contain" />
          <button
            onClick={() => setMenuOpen(false)}
            aria-label="Close navigation menu"
            className="p-2 rounded-md text-text-secondary hover:text-text-primary hover:bg-subtle transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X size={22} />
          </button>
        </div>

        {/* Drawer body */}
        <div className="flex-1 overflow-y-auto px-4 py-8 flex flex-col gap-6">
          {/* Persona toggle */}
          <div className="flex justify-center">
            <PersonaToggle
              persona={persona}
              onChange={(p) => {
                onPersonaChange(p)
              }}
            />
          </div>

          {/* Nav links */}
          <ul className="flex flex-col gap-1" role="list">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center h-12 px-4 rounded-lg text-base font-medium text-text-primary hover:bg-subtle transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>

          {/* Dual CTA buttons */}
          <div className="flex flex-col gap-3 mt-auto">
            <a
              href="#post-job"
              onClick={() => setMenuOpen(false)}
              className="btn-shimmer flex items-center justify-center h-[52px] rounded-[12px] bg-primary text-white text-base font-semibold transition-colors hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Post a Job in 60s
            </a>
            <a
              href="#find-work"
              onClick={() => setMenuOpen(false)}
              className="flex items-center justify-center h-[52px] rounded-[12px] border-[1.5px] border-primary text-primary text-base font-semibold transition-colors hover:bg-primary-container focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Find Work Near You
            </a>
          </div>
        </div>
      </div>

      {/* Backdrop overlay */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-[55] bg-black/20 backdrop-blur-sm lg:hidden"
          aria-hidden="true"
          onClick={() => setMenuOpen(false)}
        />
      )}
    </>
  )
}
