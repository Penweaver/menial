import { ShieldCheck, FileText, BookOpen } from 'lucide-react'

const FOOTER_LINKS = {
  Product: [
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'Cities', href: '#cities' },
    { label: 'Safety', href: '#features' },
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
    { label: 'About', href: '#' },
    { label: 'Blog', href: '#' },
    { label: 'Careers', href: '#' },
    { label: 'Contact', href: '#' },
  ],
}

export function Footer() {
  return (
    <footer className="bg-[#0F172A] text-white" aria-label="Site footer">
      {/* Main footer content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-5">
          {/* Brand column */}
          <div className="lg:col-span-1">
            <a
              href="/"
              className="text-2xl font-extrabold text-primary tracking-tight focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
              aria-label="menial home"
            >
              menial
            </a>
            <p className="mt-4 text-sm text-slate-400 leading-relaxed max-w-xs">
              Nigeria's trusted on-demand worker marketplace. NIN-verified workers, escrow-protected payments.
            </p>
            <div className="mt-6 flex items-center gap-2 text-xs text-slate-500">
              <ShieldCheck size={14} className="text-secondary flex-shrink-0" />
              <span>NIN Verified Platform</span>
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([category, links]) => (
            <div key={category}>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">
                {category}
              </h3>
              <ul className="space-y-3" role="list">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-slate-300 hover:text-white transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
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

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500 order-2 sm:order-1">
              © {new Date().getFullYear()} Menial Technologies Ltd. All rights reserved.
            </p>

            {/* NDPA Compliance note */}
            <div className="flex items-start gap-2 order-1 sm:order-2 max-w-sm">
              <FileText size={13} className="text-slate-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-500">
                menial complies with the Nigeria Data Protection Act (NDPA) 2023. Your personal data is processed lawfully and stored securely.{' '}
                <a href="#" className="underline hover:text-slate-300 transition-colors">
                  Privacy Policy
                </a>
                {' · '}
                <a href="#" className="underline hover:text-slate-300 transition-colors">
                  Terms
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
