import { heroContent } from '@/content/hero'
import { cn } from '@/lib/utils'

type HeroProps = {
  persona: 'employer' | 'worker'
}

function PhoneMockup() {
  return (
    <div className="relative mx-auto w-[220px] sm:w-[260px]" aria-hidden="true">
      {/* Phone frame */}
      <svg
        viewBox="0 0 260 520"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full drop-shadow-2xl"
        role="img"
        aria-label="menial app mockup"
      >
        {/* Phone body */}
        <rect x="2" y="2" width="256" height="516" rx="36" fill="white" stroke="#E2E8F0" strokeWidth="3" />
        {/* Screen area */}
        <rect x="12" y="52" width="236" height="440" rx="8" fill="#F8FAFC" />
        {/* Notch */}
        <rect x="95" y="10" width="70" height="10" rx="5" fill="#E2E8F0" />

        {/* App header bar */}
        <rect x="12" y="52" width="236" height="44" rx="0" fill="#1A4FEE" />
        <text x="24" y="80" fontFamily="system-ui" fontWeight="700" fontSize="14" fill="white">menial</text>
        <circle cx="228" cy="74" r="10" fill="white" fillOpacity="0.2" />

        {/* Search bar */}
        <rect x="24" y="108" width="212" height="32" rx="8" fill="white" stroke="#E2E8F0" strokeWidth="1.5" />
        <rect x="36" y="120" width="80" height="8" rx="4" fill="#CBD5E1" />

        {/* Worker card 1 */}
        <rect x="24" y="156" width="212" height="72" rx="12" fill="white" stroke="#E2E8F0" strokeWidth="1.5" />
        <circle cx="52" cy="192" r="16" fill="#EBF1FE" />
        <rect x="56" y="186" width="2" height="12" rx="1" fill="#1A4FEE" />
        <rect x="50" y="192" width="12" height="2" rx="1" fill="#1A4FEE" />
        <rect x="76" y="180" width="90" height="8" rx="4" fill="#0F172A" />
        <rect x="76" y="196" width="60" height="6" rx="3" fill="#CBD5E1" />
        {/* Verified badge */}
        <rect x="170" y="178" width="54" height="20" rx="10" fill="#E0F2FE" />
        <rect x="178" y="185" width="38" height="6" rx="3" fill="#0284C7" />
        {/* Stars */}
        <rect x="76" y="210" width="48" height="6" rx="3" fill="#FEF3C7" />

        {/* Worker card 2 */}
        <rect x="24" y="244" width="212" height="72" rx="12" fill="white" stroke="#E2E8F0" strokeWidth="1.5" />
        <circle cx="52" cy="280" r="16" fill="#FEF3C7" />
        <rect x="76" y="268" width="80" height="8" rx="4" fill="#0F172A" />
        <rect x="76" y="284" width="60" height="6" rx="3" fill="#CBD5E1" />
        <rect x="170" y="266" width="54" height="20" rx="10" fill="#E0F2FE" />
        <rect x="178" y="273" width="38" height="6" rx="3" fill="#0284C7" />
        <rect x="76" y="298" width="48" height="6" rx="3" fill="#FEF3C7" />

        {/* Map preview */}
        <rect x="24" y="332" width="212" height="100" rx="12" fill="#E0F2FE" />
        <rect x="24" y="332" width="212" height="100" rx="12" fill="url(#mapGrad)" />
        {/* Map pin */}
        <circle cx="130" cy="380" r="10" fill="#1A4FEE" />
        <circle cx="130" cy="380" r="5" fill="white" />
        {/* Distance rings */}
        <circle cx="130" cy="380" r="20" stroke="#1A4FEE" strokeWidth="1" strokeOpacity="0.3" fill="none" />
        <circle cx="130" cy="380" r="35" stroke="#1A4FEE" strokeWidth="1" strokeOpacity="0.15" fill="none" />

        {/* Pay button */}
        <rect x="24" y="448" width="212" height="36" rx="10" fill="#1A4FEE" />
        <rect x="80" y="460" width="100" height="12" rx="6" fill="white" fillOpacity="0.9" />

        {/* Bottom pill */}
        <rect x="100" y="498" width="60" height="6" rx="3" fill="#E2E8F0" />

        <defs>
          <linearGradient id="mapGrad" x1="24" y1="332" x2="236" y2="432" gradientUnits="userSpaceOnUse">
            <stop stopColor="#DBEAFE" />
            <stop offset="1" stopColor="#E0F2FE" />
          </linearGradient>
        </defs>
      </svg>

      {/* Floating badge — workers online */}
      <div className="absolute -left-8 top-24 bg-white rounded-xl shadow-lg border border-border px-3 py-2 flex items-center gap-2 text-xs font-semibold text-text-primary">
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
        2,847 online
      </div>

      {/* Floating badge — instant pay */}
      <div className="absolute -right-6 bottom-32 bg-white rounded-xl shadow-lg border border-border px-3 py-2 text-xs font-semibold text-text-primary">
        <span className="text-primary">₦</span> Instant Pay ⚡
      </div>
    </div>
  )
}

export function Hero({ persona }: HeroProps) {
  const primaryCTA =
    persona === 'employer' ? heroContent.employerCTA : heroContent.workerCTA
  const primaryHref = persona === 'employer' ? '#post-job' : '#find-work'

  return (
    <section
      className="relative min-h-[100svh] flex items-center overflow-hidden bg-canvas pt-16"
      aria-label="Hero section"
    >
      {/* Animated gradient blobs */}
      <div aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="animate-blob absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-primary opacity-[0.12] blur-[120px]" />
        <div className="animate-blob-delay-2 absolute top-20 right-0 w-[500px] h-[500px] rounded-full bg-secondary opacity-[0.10] blur-[120px]" />
        <div className="animate-blob-delay-3 absolute bottom-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full bg-primary-container opacity-[0.25] blur-[120px]" />
      </div>

      {/* Grid overlay */}
      <div aria-hidden="true" className="absolute inset-0 grid-overlay pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* Left column — copy */}
          <div className="flex flex-col items-start">
            {/* Live badge */}
            <div className="animate-pulse-ring mb-6 inline-flex items-center gap-2 rounded-full bg-white border border-border px-4 py-2 text-sm font-medium text-text-primary shadow-sm">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" aria-hidden="true" />
              {heroContent.badge}
            </div>

            {/* Headline */}
            <h1 className="text-5xl lg:text-7xl font-extrabold leading-[1.05] tracking-tight text-text-primary mb-6">
              {heroContent.headlineStart}{' '}
              <span className="gradient-text">{heroContent.headlineGradient}</span>
              <br />
              {heroContent.headlineEnd}
            </h1>

            {/* Subheadline */}
            <p className="text-base sm:text-lg text-text-secondary leading-relaxed max-w-xl mb-8">
              {heroContent.subheadline}
            </p>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto mb-10">
              <a
                href={primaryHref}
                className="btn-shimmer flex items-center justify-center h-[52px] px-7 rounded-[12px] bg-primary hover:bg-primary-hover text-white text-base font-semibold transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 w-full sm:w-auto"
              >
                {primaryCTA}
              </a>
              <a
                href="#how-it-works"
                className="flex items-center justify-center h-[52px] px-7 rounded-[12px] border-[1.5px] border-primary text-primary text-base font-semibold bg-white hover:bg-primary-container transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 w-full sm:w-auto"
              >
                {heroContent.secondaryCTA}
              </a>
            </div>

            {/* Live stats pills */}
            <div className="flex flex-wrap gap-3">
              {heroContent.liveStats.map((stat) => (
                <div
                  key={stat.label}
                  className="flex items-center gap-2 bg-white border border-border rounded-full px-4 py-2 text-sm shadow-sm"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse flex-shrink-0" aria-hidden="true" />
                  <span className="font-bold text-text-primary tabular-nums">
                    {stat.value}{stat.suffix}
                  </span>
                  <span className="text-text-secondary">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right column — phone mockup */}
          <div className="flex justify-center lg:justify-end">
            <div className="relative">
              <PhoneMockup />
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 animate-bounce" aria-hidden="true">
        <div className="w-px h-8 bg-gradient-to-b from-transparent to-border" />
        <span className="text-xs text-text-secondary">Scroll</span>
      </div>
    </section>
  )
}
