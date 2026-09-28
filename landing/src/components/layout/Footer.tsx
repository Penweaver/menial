import { ShieldCheck, FileCheck, Mail } from 'lucide-react'

const FOOTER_LINKS = {
  Product: [
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Safety', href: '#features' },
    { label: 'Cities', href: '#cities' },
    { label: 'FAQ', href: '#faq' },
  ],
  Employers: [
    { label: 'Post a Job', href: '#post-job' },
    { label: 'Worker Verification', href: '#features' },
    { label: 'Escrow Payments', href: '#features' },
    { label: 'Business Accounts', href: '#' },
  ],
  Workers: [
    { label: 'Find Work', href: '#find-work' },
    { label: 'Get Verified', href: '#how-it-works' },
    { label: 'Payout Info', href: '#faq' },
    { label: 'Worker Safety', href: '#features' },
  ],
  Company: [
    { label: 'About Us', href: '#' },
    { label: 'Blog', href: '#' },
    { label: 'Careers', href: '#' },
    { label: 'Contact', href: '#' },
  ],
}

export function Footer() {
  return (
    <footer className="bg-[#0F172A] text-white border-t border-slate-800" aria-label="Site footer">
      <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 pt-16 pb-12">
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 mb-14">

          {/* ── Brand Block ──────────────────────────────────── */}
          <div className="shrink-0 lg:max-w-[280px]">
            {/* Menial Actual White Logo */}
            <a
              href="/"
              className="inline-block mb-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
              aria-label="menial home"
            >
              <img
                src="/logo-white.png"
                alt="menial"
                className="h-8 sm:h-9 w-auto object-contain"
              />
            </a>

            <p className="text-sm text-slate-400 leading-relaxed mb-6">
              {"Nigeria's trusted on-demand worker marketplace. NIN-verified workers, escrow-protected payments."}
            </p>

            {/* Contact & Verification badge */}
            <div className="flex flex-wrap items-center gap-4 text-slate-400 mb-6">
              <a
                href="mailto:hello@menial.ng"
                aria-label="Email menial support"
                className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white transition-colors duration-150 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full"
              >
                <Mail size={14} className="text-primary" />
                <span>hello@menial.ng</span>
              </a>

              <div className="inline-flex items-center gap-1.5 text-xs text-slate-300 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
                <ShieldCheck size={14} className="text-secondary flex-shrink-0" />
                <span>NIN Verified</span>
              </div>
            </div>

            {/* Desktop Side-by-Side App Store Badges (Removed on Mobile) */}
            <div className="hidden md:flex flex-row items-center gap-3 pt-2">
              {/* App Store */}
              <div
                className="inline-flex items-center gap-2.5 bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 text-white px-3.5 py-2 rounded-xl select-none transition-colors"
                aria-label="App Store — Coming Soon"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="white" aria-hidden="true" className="shrink-0">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
                <div className="flex flex-col items-start leading-none">
                  <span className="text-[8px] uppercase tracking-wider text-amber-400 font-bold mb-0.5">Coming Soon</span>
                  <span className="text-[13px] font-bold text-white">App Store</span>
                </div>
              </div>

              {/* Google Play */}
              <div
                className="inline-flex items-center gap-2.5 bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 text-white px-3.5 py-2 rounded-xl select-none transition-colors"
                aria-label="Google Play — Coming Soon"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white" aria-hidden="true" className="shrink-0">
                  <path d="M3.18 23.76c.35.19.77.19 1.12-.01l11.33-6.54-2.6-2.6-9.85 9.15zM.5 1.22C.18 1.57 0 2.09 0 2.73v18.54c0 .64.18 1.16.5 1.51l.08.08 10.38-10.38v-.24L.58 1.14.5 1.22zM21.96 10.6l-3.23-1.86-2.91 2.91 2.91 2.91 3.24-1.87c.92-.53.92-1.56-.01-2.09zM4.3.25l11.33 6.54-2.6 2.6L3.18.24C3.53.05 3.95.06 4.3.25z" />
                </svg>
                <div className="flex flex-col items-start leading-none">
                  <span className="text-[8px] uppercase tracking-wider text-amber-400 font-bold mb-0.5">Coming Soon</span>
                  <span className="text-[13px] font-bold text-white">Google Play</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Link Grid (2-col on mobile, 4-col on desktop) ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-10 flex-grow">
            {Object.entries(FOOTER_LINKS).map(([category, links]) => (
              <div key={category}>
                <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-4">
                  {category}
                </h3>
                <ul className="space-y-3" role="list">
                  {links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className="text-sm text-slate-400 hover:text-white transition-colors duration-150 focus:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded-sm"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* ── Better Arranged Bottom Bar ───────────────────────── */}
        <div className="border-t border-slate-800/80 pt-8 mt-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-5">
            {/* Left: Copyright */}
            <p className="text-xs text-slate-400 order-2 md:order-1 text-center md:text-left">
              © {new Date().getFullYear()} Menial Technologies Ltd. All rights reserved.
            </p>

            {/* Center / Right: NDPA & Legal links */}
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 order-1 md:order-2">
              <div className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                <FileCheck size={14} className="text-secondary shrink-0" />
                <span>NDPA 2023 Compliant</span>
              </div>
              <span className="text-slate-700 hidden sm:inline" aria-hidden="true">·</span>
              <a href="#" className="text-xs text-slate-400 hover:text-white transition-colors">
                Privacy Policy
              </a>
              <span className="text-slate-700" aria-hidden="true">·</span>
              <a href="#" className="text-xs text-slate-400 hover:text-white transition-colors">
                Terms of Service
              </a>
              <span className="text-slate-700 hidden sm:inline" aria-hidden="true">·</span>
              <a href="#" className="text-xs text-slate-400 hover:text-white transition-colors hidden sm:inline">
                Security & Escrow
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
