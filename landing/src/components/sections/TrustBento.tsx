import { ShieldCheck, Lock, Siren, Zap, type LucideIcon } from 'lucide-react'
import { featuresContent } from '@/content/features'
import { ScrollReveal } from '@/components/ui/ScrollReveal'
import { cn } from '@/lib/utils'

type IconName = 'ShieldCheck' | 'Lock' | 'Siren' | 'Zap'
type ColorKey = 'primary' | 'secondary' | 'tertiary'

const ICON_MAP: Record<IconName, LucideIcon> = {
  ShieldCheck,
  Lock,
  Siren,
  Zap,
}

const COLOR_MAP: Record<ColorKey, { bg: string; border: string; icon: string; badge: string; badgeText: string }> = {
  primary: {
    bg: 'bg-primary-container',
    border: 'border-primary/20',
    icon: 'text-primary',
    badge: 'bg-primary/10',
    badgeText: 'text-primary',
  },
  secondary: {
    bg: 'bg-secondary-container',
    border: 'border-secondary/20',
    icon: 'text-secondary',
    badge: 'bg-secondary/10',
    badgeText: 'text-secondary',
  },
  tertiary: {
    bg: 'bg-tertiary-container',
    border: 'border-tertiary/20',
    icon: 'text-tertiary',
    badge: 'bg-tertiary/10',
    badgeText: 'text-tertiary',
  },
}

export function TrustBento() {
  return (
    <section
      id="features"
      className="bg-canvas py-20 sm:py-24"
      aria-label="Trust and safety features"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <ScrollReveal>
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="inline-block text-xs font-semibold text-secondary uppercase tracking-widest mb-3">
              Safety First
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-text-primary mb-4">
              Built for trust, every step of the way
            </h2>
            <p className="text-base text-text-secondary leading-relaxed">
              menial combines identity verification, financial protection, and emergency safety
              into a single platform you can rely on.
            </p>
          </div>
        </ScrollReveal>

        {/* Bento grid — 2×2 on desktop, 1 column on mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {featuresContent.map((feature, i) => {
            const Icon = ICON_MAP[feature.icon as IconName]
            const colors = COLOR_MAP[feature.color as ColorKey]

            return (
              <ScrollReveal key={feature.title} delay={i * 80}>
                <div
                  className={cn(
                    'group relative flex flex-col gap-5 rounded-lg p-8 border bg-card transition-all duration-300 hover:shadow-md hover:-translate-y-1',
                    colors.border
                  )}
                >
                  {/* Badge */}
                  <div className="flex items-center justify-between">
                    <div className={cn('flex items-center justify-center w-12 h-12 rounded-md', colors.bg)}>
                      {Icon && <Icon size={24} className={colors.icon} />}
                    </div>
                    <span
                      className={cn(
                        'text-[10px] font-bold tracking-widest px-2.5 py-1 rounded-full',
                        colors.badge,
                        colors.badgeText
                      )}
                    >
                      {feature.badge}
                    </span>
                  </div>

                  {/* Text */}
                  <div>
                    <h3 className="text-lg font-bold text-text-primary mb-2">{feature.title}</h3>
                    <p className="text-sm text-text-secondary leading-relaxed">{feature.description}</p>
                  </div>

                  {/* Hover accent line */}
                  <div
                    className={cn(
                      'absolute bottom-0 left-8 right-8 h-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300',
                      feature.color === 'primary'
                        ? 'bg-primary'
                        : feature.color === 'secondary'
                          ? 'bg-secondary'
                          : 'bg-tertiary'
                    )}
                    aria-hidden="true"
                  />
                </div>
              </ScrollReveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}
