import { Smartphone, ArrowRight } from 'lucide-react'

export function FooterCTA() {
  return (
    <section
      className="bg-primary py-20 sm:py-24 relative overflow-hidden"
      aria-label="Get started with menial"
    >
      {/* Decorative blobs */}
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white opacity-[0.04] blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-96 h-96 rounded-full bg-white opacity-[0.03] blur-3xl" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Headline */}
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-4 leading-tight">
            Ready to get started?
          </h2>
          <p className="text-base sm:text-lg text-white/70 max-w-xl mx-auto">
            Join thousands of Nigerians already using menial to hire safely and earn reliably.
          </p>
        </div>

        {/* Dual persona CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          {/* Employer CTA */}
          <div className="flex flex-col items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-semibold text-white/60 uppercase tracking-widest">
              For Employers
            </span>
            <a
              href="#post-job"
              className="btn-shimmer flex items-center justify-center h-[52px] px-8 w-full sm:w-auto rounded-[12px] bg-white text-primary text-base font-semibold hover:bg-primary-container transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary gap-2"
            >
              Post a Job in 60s
              <ArrowRight size={18} aria-hidden="true" />
            </a>
          </div>

          <div className="text-white/30 text-sm hidden sm:block">or</div>
          <div className="text-white/30 text-sm block sm:hidden w-full text-center">— or —</div>

          {/* Worker CTA */}
          <div className="flex flex-col items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-semibold text-white/60 uppercase tracking-widest">
              For Workers
            </span>
            <a
              href="#find-work"
              className="flex items-center justify-center h-[52px] px-8 w-full sm:w-auto rounded-[12px] border-[1.5px] border-white/60 text-white text-base font-semibold hover:bg-white/10 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary gap-2"
            >
              Find Work Near You
              <ArrowRight size={18} aria-hidden="true" />
            </a>
          </div>
        </div>

        {/* Mobile download bar */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8 border-t border-white/20">
          <div className="flex items-center gap-2 text-white/80 text-sm">
            <Smartphone size={16} aria-hidden="true" />
            <span className="font-medium">Get the menial app</span>
          </div>

          {/* App Store button */}
          <a
            href="#"
            aria-label="Download on the App Store"
            className="flex items-center gap-3 h-12 px-5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            {/* Apple icon */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white" aria-hidden="true">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
            </svg>
            <div className="text-left">
              <div className="text-[9px] text-white/70 leading-none">Download on the</div>
              <div className="text-xs font-semibold text-white leading-tight">App Store</div>
            </div>
          </a>

          {/* Google Play button */}
          <a
            href="#"
            aria-label="Get it on Google Play"
            className="flex items-center gap-3 h-12 px-5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            {/* Play icon */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white" aria-hidden="true">
              <path d="M3.18 23.76c.35.19.77.19 1.12-.01l11.33-6.54-2.6-2.6-9.85 9.15zM.5 1.22C.18 1.57 0 2.09 0 2.73v18.54c0 .64.18 1.16.5 1.51l.08.08 10.38-10.38v-.24L.58 1.14.5 1.22zM21.96 10.6l-3.23-1.86-2.91 2.91 2.91 2.91 3.24-1.87c.92-.53.92-1.56-.01-2.09zM4.3.25l11.33 6.54-2.6 2.6L3.18.24C3.53.05 3.95.06 4.3.25z" />
            </svg>
            <div className="text-left">
              <div className="text-[9px] text-white/70 leading-none">Get it on</div>
              <div className="text-xs font-semibold text-white leading-tight">Google Play</div>
            </div>
          </a>
        </div>
      </div>
    </section>
  )
}
