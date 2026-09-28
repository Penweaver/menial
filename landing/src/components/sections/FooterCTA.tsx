import { Smartphone, ArrowRight } from 'lucide-react'

export function FooterCTA() {
  return (
    <section
      className="relative py-24 md:py-32 overflow-hidden bg-slate-900 border-t border-slate-800"
      aria-label="Get started with menial"
    >
      {/* Glowing Grid Texture — identical to ColorInvoice pattern */}
      <div
        className="absolute inset-0 z-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          maskImage: 'radial-gradient(circle at center, black 40%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(circle at center, black 50%, transparent 100%)',
        }}
        aria-hidden="true"
      />

      {/* Radiant Electric Cobalt Orb */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] sm:w-[650px] h-[500px] sm:h-[650px] bg-primary rounded-full blur-[140px] opacity-40 pointer-events-none"
        aria-hidden="true"
      />

      <div className="max-w-4xl mx-auto px-5 sm:px-6 lg:px-8 relative z-10 text-center">
        {/* Live pill badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs font-semibold text-white/90 shadow-inner mb-6 animate-pop-in">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary" />
          </span>
          Instant Setup · Zero Upfront Subscription
        </div>

        {/* Headline */}
        <h2 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
          Ready to experience{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-secondary-container to-secondary">
            dignified labour?
          </span>
        </h2>

        <p className="text-base sm:text-lg text-slate-300 mb-10 max-w-2xl mx-auto leading-relaxed">
          Join thousands of verified workers and employers across Nigeria. Post jobs in 60 seconds or start earning with guaranteed instant NIP bank payouts.
        </p>

        {/* Dual persona CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
          <a
            href="#post-job"
            className="btn-shimmer btn-press tap-highlight-none w-full sm:w-auto h-[52px] px-8 rounded-full bg-primary hover:bg-primary-hover text-white text-base font-bold shadow-lg shadow-primary/40 inline-flex items-center justify-center gap-2 transition-all duration-200"
          >
            <span>Post a Job in 60s</span>
            <ArrowRight size={18} aria-hidden="true" />
          </a>

          <a
            href="#find-work"
            className="btn-press tap-highlight-none w-full sm:w-auto h-[52px] px-8 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white text-base font-bold inline-flex items-center justify-center gap-2 transition-all duration-200"
          >
            <span>Find Work Near You</span>
            <ArrowRight size={18} aria-hidden="true" />
          </a>
        </div>

        {/* Mobile download bar */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8 border-t border-white/10">
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <Smartphone size={16} aria-hidden="true" />
            <span className="font-medium text-slate-300">Get the menial app</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {/* App Store button with high contrast */}
            <div
              aria-label="Download on the App Store (Coming Soon)"
              className="flex items-center gap-3 h-12 px-5 rounded-xl bg-slate-800/95 border-2 border-slate-600 text-white shadow-xl shadow-black/40 select-none transition-all duration-200 hover:border-slate-500"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="white" aria-hidden="true" className="shrink-0 text-white">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
              </svg>
              <div className="flex flex-col items-start leading-none">
                <span className="text-[9px] uppercase tracking-wider text-amber-300 font-extrabold mb-1">Coming Soon</span>
                <span className="text-sm font-bold text-white tracking-tight">App Store</span>
              </div>
            </div>

            {/* Google Play button with high contrast */}
            <div
              aria-label="Get it on Google Play (Coming Soon)"
              className="flex items-center gap-3 h-12 px-5 rounded-xl bg-slate-800/95 border-2 border-slate-600 text-white shadow-xl shadow-black/40 select-none transition-all duration-200 hover:border-slate-500"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white" aria-hidden="true" className="shrink-0 text-white">
                <path d="M3.18 23.76c.35.19.77.19 1.12-.01l11.33-6.54-2.6-2.6-9.85 9.15zM.5 1.22C.18 1.57 0 2.09 0 2.73v18.54c0 .64.18 1.16.5 1.51l.08.08 10.38-10.38v-.24L.58 1.14.5 1.22zM21.96 10.6l-3.23-1.86-2.91 2.91 2.91 2.91 3.24-1.87c.92-.53.92-1.56-.01-2.09zM4.3.25l11.33 6.54-2.6 2.6L3.18.24C3.53.05 3.95.06 4.3.25z" />
              </svg>
              <div className="flex flex-col items-start leading-none">
                <span className="text-[9px] uppercase tracking-wider text-amber-300 font-extrabold mb-1">Coming Soon</span>
                <span className="text-sm font-bold text-white tracking-tight">Google Play</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
