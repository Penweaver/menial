'use client'

import { useState } from 'react'
import {
  Minus,
  Plus,
  Sparkles,
  Truck,
  Hammer,
  CalendarCheck,
  Package,
  Flower2,
  UtensilsCrossed,
  Shirt,
  ShieldCheck,
  ArrowRight,
  Lock,
  type LucideIcon,
} from 'lucide-react'
import { wageEstimatorContent } from '@/content/wageEstimator'
import { ScrollReveal } from '@/components/ui/ScrollReveal'
import { formatNairaAmount } from '@/lib/utils'
import { cn } from '@/lib/utils'

const { categories, platformFeeRate } = wageEstimatorContent

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  cleaning: Sparkles,
  moving: Truck,
  construction: Hammer,
  event: CalendarCheck,
  warehouse: Package,
  gardening: Flower2,
  catering: UtensilsCrossed,
  laundry: Shirt,
}

export function WageEstimator() {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(categories[0].id)
  const [workerCount, setWorkerCount] = useState(2)
  const [days, setDays] = useState(1)
  const [animatePrice, setAnimatePrice] = useState(false)

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId) ?? categories[0]

  // All arithmetic in kobo; display in Naira
  const totalWorkerPayKobo = selectedCategory.baseRatePerWorkerPerDay * workerCount * days
  const platformFeeKobo = Math.round(totalWorkerPayKobo * platformFeeRate)
  const grandTotalKobo = totalWorkerPayKobo + platformFeeKobo

  // Convert kobo → Naira for display
  const totalWorkerPayNaira = totalWorkerPayKobo / 100
  const platformFeeNaira = platformFeeKobo / 100
  const grandTotalNaira = grandTotalKobo / 100

  const triggerPriceAnimation = () => {
    setAnimatePrice(true)
    setTimeout(() => setAnimatePrice(false), 300)
  }

  const clampWorkers = (v: number) => {
    const val = Math.max(1, Math.min(20, v))
    setWorkerCount(val)
    triggerPriceAnimation()
  }

  const clampDays = (v: number) => {
    const val = Math.max(1, Math.min(7, v))
    setDays(val)
    triggerPriceAnimation()
  }

  const handleSelectCategory = (id: string) => {
    setSelectedCategoryId(id)
    triggerPriceAnimation()
  }

  return (
    <section
      id="calculator"
      className="bg-white py-20 sm:py-24 relative overflow-hidden"
      aria-label="Live wage estimator"
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <ScrollReveal>
          <div className="text-center mb-10 sm:mb-12">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-container text-xs font-bold text-secondary uppercase tracking-widest mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
              Instant Quote
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-text-primary mb-4 tracking-tight">
              Estimate your job cost
            </h2>
            <p className="text-base sm:text-lg text-text-secondary max-w-xl mx-auto leading-relaxed">
              Transparent per-worker rates in Naira with instant escrow calculation before you post.
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={100}>
          <div className="bg-canvas border border-border rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-sm space-y-7 sm:space-y-8">

            {/* Category selector — 2-col on mobile, 4-col on desktop */}
            <div>
              <div className="flex items-center justify-between mb-3.5">
                <label className="text-sm font-bold text-text-primary">
                  1. Select Work Category
                </label>
                <span className="text-xs text-secondary font-semibold">
                  Standard Daily Benchmarks
                </span>
              </div>

              <div
                className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3"
                role="group"
                aria-label="Job category"
              >
                {categories.map((cat) => {
                  const Icon = CATEGORY_ICONS[cat.id] ?? Sparkles
                  const isSelected = selectedCategoryId === cat.id
                  const dailyRateNaira = cat.baseRatePerWorkerPerDay / 100

                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleSelectCategory(cat.id)}
                      aria-pressed={isSelected}
                      className={cn(
                        'btn-press tap-highlight-none flex flex-col items-start p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border text-left transition-all duration-200 relative overflow-hidden',
                        isSelected
                          ? 'bg-primary border-primary text-white shadow-lg shadow-primary/25 scale-[1.02]'
                          : 'bg-white border-border text-text-secondary hover:border-primary/40 hover:text-text-primary'
                      )}
                    >
                      <div className="flex items-center justify-between w-full mb-2">
                        <div
                          className={cn(
                            'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
                            isSelected ? 'bg-white/20 text-white' : 'bg-subtle text-primary'
                          )}
                        >
                          <Icon size={16} />
                        </div>
                        {isSelected && (
                          <span className="w-2 h-2 rounded-full bg-secondary animate-ping" />
                        )}
                      </div>

                      <span
                        className={cn(
                          'text-xs sm:text-sm font-bold leading-snug line-clamp-1',
                          isSelected ? 'text-white' : 'text-text-primary'
                        )}
                      >
                        {cat.label}
                      </span>
                      <span
                        className={cn(
                          'text-[11px] font-medium mt-1 tabular-nums',
                          isSelected ? 'text-white/80' : 'text-text-secondary'
                        )}
                      >
                        {formatNairaAmount(dailyRateNaira)}/day
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Steppers row — 2 responsive cards on mobile */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {/* Worker count card */}
              <div className="bg-white border border-border/80 rounded-2xl p-4 sm:p-5 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-bold text-text-primary">
                    2. Workers Needed
                  </label>
                  <span className="text-xs text-text-secondary">Max 20</span>
                </div>

                <div className="flex items-center justify-between bg-canvas border border-border/70 rounded-xl p-2">
                  <button
                    type="button"
                    onClick={() => clampWorkers(workerCount - 1)}
                    disabled={workerCount <= 1}
                    aria-label="Decrease worker count"
                    className="btn-press tap-highlight-none flex items-center justify-center w-11 h-11 rounded-lg bg-white border border-border text-text-primary hover:border-primary hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-xs"
                  >
                    <Minus size={18} />
                  </button>

                  <div className="text-center px-4">
                    <span
                      className={cn(
                        'block text-2xl sm:text-3xl font-extrabold text-text-primary tabular-nums transition-transform duration-200',
                        animatePrice ? 'scale-110 text-primary' : 'scale-100'
                      )}
                      aria-live="polite"
                    >
                      {workerCount}
                    </span>
                    <span className="text-[11px] font-semibold text-text-secondary">
                      {workerCount === 1 ? 'Worker' : 'Workers'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => clampWorkers(workerCount + 1)}
                    disabled={workerCount >= 20}
                    aria-label="Increase worker count"
                    className="btn-press tap-highlight-none flex items-center justify-center w-11 h-11 rounded-lg bg-white border border-border text-text-primary hover:border-primary hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-xs"
                  >
                    <Plus size={18} />
                  </button>
                </div>

                {/* Quick preset chips */}
                <div className="flex items-center gap-1.5 mt-3">
                  {[1, 2, 4, 8].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => clampWorkers(n)}
                      className={cn(
                        'flex-1 py-1 text-xs font-semibold rounded-md border transition-all tap-highlight-none',
                        workerCount === n
                          ? 'bg-primary-container border-primary text-primary font-bold'
                          : 'bg-canvas border-border/60 text-text-secondary hover:text-text-primary'
                      )}
                    >
                      {n} {n === 1 ? 'Pro' : 'Pros'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration card */}
              <div className="bg-white border border-border/80 rounded-2xl p-4 sm:p-5 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-bold text-text-primary">
                    3. Duration
                  </label>
                  <span className="text-xs text-text-secondary">1–7 Days</span>
                </div>

                <div className="flex items-center justify-between bg-canvas border border-border/70 rounded-xl p-2">
                  <button
                    type="button"
                    onClick={() => clampDays(days - 1)}
                    disabled={days <= 1}
                    aria-label="Decrease duration"
                    className="btn-press tap-highlight-none flex items-center justify-center w-11 h-11 rounded-lg bg-white border border-border text-text-primary hover:border-primary hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-xs"
                  >
                    <Minus size={18} />
                  </button>

                  <div className="text-center px-4">
                    <span
                      className={cn(
                        'block text-2xl sm:text-3xl font-extrabold text-text-primary tabular-nums transition-transform duration-200',
                        animatePrice ? 'scale-110 text-primary' : 'scale-100'
                      )}
                      aria-live="polite"
                    >
                      {days}
                    </span>
                    <span className="text-[11px] font-semibold text-text-secondary">
                      {days === 1 ? 'Day' : 'Days'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => clampDays(days + 1)}
                    disabled={days >= 7}
                    aria-label="Increase duration"
                    className="btn-press tap-highlight-none flex items-center justify-center w-11 h-11 rounded-lg bg-white border border-border text-text-primary hover:border-primary hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-xs"
                  >
                    <Plus size={18} />
                  </button>
                </div>

                {/* Quick preset chips */}
                <div className="flex items-center gap-1.5 mt-3">
                  {[1, 2, 3, 5].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => clampDays(d)}
                      className={cn(
                        'flex-1 py-1 text-xs font-semibold rounded-md border transition-all tap-highlight-none',
                        days === d
                          ? 'bg-primary-container border-primary text-primary font-bold'
                          : 'bg-canvas border-border/60 text-text-secondary hover:text-text-primary'
                      )}
                    >
                      {d} {d === 1 ? 'Day' : 'Days'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Results breakdown panel */}
            <div className="bg-white border border-border/90 rounded-2xl p-5 sm:p-7 space-y-4 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between pb-3 border-b border-border/70">
                <span className="text-xs font-bold text-text-secondary uppercase tracking-widest flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-secondary" />
                  Transparent Escrow Breakdown
                </span>
                <span className="text-[11px] font-semibold text-secondary bg-secondary-container px-2 py-0.5 rounded-full">
                  NIN Verified Rates
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">
                    Total Worker Wage ({workerCount} × {days} {days === 1 ? 'day' : 'days'})
                  </span>
                  <span className="font-bold text-text-primary tabular-nums">
                    {formatNairaAmount(totalWorkerPayNaira)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary flex items-center gap-1">
                    Platform Escrow Fee ({(platformFeeRate * 100).toFixed(0)}%)
                    <span className="text-[10px] text-text-secondary bg-subtle px-1.5 py-0.5 rounded">
                      Escrow & Support
                    </span>
                  </span>
                  <span className="font-bold text-text-primary tabular-nums">
                    {formatNairaAmount(platformFeeNaira)}
                  </span>
                </div>

                <div className="pt-3 border-t border-border flex items-baseline justify-between">
                  <div>
                    <span className="text-base sm:text-lg font-extrabold text-text-primary block">
                      Total Escrow Deposit
                    </span>
                    <span className="text-[11px] text-text-secondary">
                      Zero payment released until job confirmation
                    </span>
                  </div>

                  <span
                    className={cn(
                      'text-2xl sm:text-3xl font-extrabold text-primary tabular-nums transition-all duration-300',
                      animatePrice ? 'scale-105 text-primary-hover' : 'scale-100'
                    )}
                  >
                    {formatNairaAmount(grandTotalNaira)}
                  </span>
                </div>
              </div>

              {/* Escrow Guarantee note */}
              <div className="flex items-start gap-2 bg-canvas border border-border/60 rounded-xl p-3 text-xs text-text-secondary">
                <Lock size={14} className="text-primary shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong className="text-text-primary">100% Escrow Protection:</strong> Your deposit is held securely in escrow and only transferred to workers after you verify arrival with OTP and approve job completion. Free cancellation up to 2 hours before start.
                </p>
              </div>

              {/* Primary action CTA */}
              <a
                href="#post-job"
                className="btn-shimmer btn-press tap-highlight-none flex items-center justify-center w-full h-[52px] rounded-xl bg-primary hover:bg-primary-hover text-white text-base font-bold transition-all shadow-lg shadow-primary/25 gap-2"
              >
                <span>Post This Job with Escrow</span>
                <ArrowRight size={18} aria-hidden="true" />
              </a>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
