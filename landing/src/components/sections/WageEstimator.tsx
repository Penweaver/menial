'use client'

import { useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { wageEstimatorContent } from '@/content/wageEstimator'
import { ScrollReveal } from '@/components/ui/ScrollReveal'
import { formatNairaAmount } from '@/lib/utils'
import { cn } from '@/lib/utils'

const { categories, platformFeeRate } = wageEstimatorContent

export function WageEstimator() {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(categories[0].id)
  const [workerCount, setWorkerCount] = useState(2)
  const [days, setDays] = useState(1)

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId) ?? categories[0]

  // All arithmetic in kobo; display in Naira
  const totalWorkerPayKobo = selectedCategory.baseRatePerWorkerPerDay * workerCount * days
  const platformFeeKobo = Math.round(totalWorkerPayKobo * platformFeeRate)
  const grandTotalKobo = totalWorkerPayKobo + platformFeeKobo

  // Convert kobo → Naira for display
  const totalWorkerPayNaira = totalWorkerPayKobo / 100
  const platformFeeNaira = platformFeeKobo / 100
  const grandTotalNaira = grandTotalKobo / 100

  const clampWorkers = (v: number) => Math.max(1, Math.min(20, v))
  const clampDays = (v: number) => Math.max(1, Math.min(7, v))

  return (
    <section
      className="bg-white py-20 sm:py-24"
      aria-label="Live wage estimator"
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <ScrollReveal>
          <div className="text-center mb-12">
            <span className="inline-block text-xs font-semibold text-secondary uppercase tracking-widest mb-3">
              Instant Quote
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-text-primary mb-4">
              Estimate your job cost
            </h2>
            <p className="text-base text-text-secondary">
              Adjust the options below to get a live Naira cost breakdown before you post.
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={100}>
          <div className="bg-canvas border border-border rounded-lg p-6 sm:p-8 space-y-8">

            {/* Category selector */}
            <div>
              <label className="block text-sm font-semibold text-text-primary mb-3">
                Job Category
              </label>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Job category">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategoryId(cat.id)}
                    aria-pressed={selectedCategoryId === cat.id}
                    className={cn(
                      'px-4 py-2 rounded-full text-sm font-medium border transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
                      selectedCategoryId === cat.id
                        ? 'bg-primary border-primary text-white shadow-sm'
                        : 'bg-white border-border text-text-secondary hover:border-primary/50 hover:text-text-primary'
                    )}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Steppers row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Worker count */}
              <div>
                <label className="block text-sm font-semibold text-text-primary mb-3">
                  Number of Workers
                </label>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setWorkerCount(clampWorkers(workerCount - 1))}
                    disabled={workerCount <= 1}
                    aria-label="Decrease worker count"
                    className="flex items-center justify-center w-10 h-10 rounded-full border border-border bg-white text-text-primary hover:border-primary hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <Minus size={16} />
                  </button>
                  <span
                    className="w-12 text-center text-2xl font-bold text-text-primary tabular-nums"
                    aria-live="polite"
                    aria-label={`${workerCount} workers`}
                  >
                    {workerCount}
                  </span>
                  <button
                    onClick={() => setWorkerCount(clampWorkers(workerCount + 1))}
                    disabled={workerCount >= 20}
                    aria-label="Increase worker count"
                    className="flex items-center justify-center w-10 h-10 rounded-full border border-border bg-white text-text-primary hover:border-primary hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <Plus size={16} />
                  </button>
                  <span className="text-sm text-text-secondary">workers (max 20)</span>
                </div>
              </div>

              {/* Duration */}
              <div>
                <label className="block text-sm font-semibold text-text-primary mb-3">
                  Duration
                </label>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setDays(clampDays(days - 1))}
                    disabled={days <= 1}
                    aria-label="Decrease duration"
                    className="flex items-center justify-center w-10 h-10 rounded-full border border-border bg-white text-text-primary hover:border-primary hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <Minus size={16} />
                  </button>
                  <span
                    className="w-12 text-center text-2xl font-bold text-text-primary tabular-nums"
                    aria-live="polite"
                    aria-label={`${days} day${days > 1 ? 's' : ''}`}
                  >
                    {days}
                  </span>
                  <button
                    onClick={() => setDays(clampDays(days + 1))}
                    disabled={days >= 7}
                    aria-label="Increase duration"
                    className="flex items-center justify-center w-10 h-10 rounded-full border border-border bg-white text-text-primary hover:border-primary hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <Plus size={16} />
                  </button>
                  <span className="text-sm text-text-secondary">
                    {days === 1 ? 'day' : 'days'} (max 7)
                  </span>
                </div>
              </div>
            </div>

            {/* Results panel */}
            <div className="bg-white border border-border rounded-lg p-6 space-y-4">
              <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-widest mb-4">
                Cost Breakdown
              </h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">
                    Worker Pay ({workerCount} × {days} day{days > 1 ? 's' : ''})
                  </span>
                  <span className="text-base font-semibold text-text-primary tabular-nums">
                    {formatNairaAmount(totalWorkerPayNaira)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">
                    Platform Fee ({(platformFeeRate * 100).toFixed(0)}%)
                  </span>
                  <span className="text-base font-semibold text-text-primary tabular-nums">
                    {formatNairaAmount(platformFeeNaira)}
                  </span>
                </div>

                <div className="pt-3 border-t border-border flex items-center justify-between">
                  <span className="text-base font-bold text-text-primary">Total</span>
                  <span className="text-2xl font-extrabold text-primary tabular-nums">
                    {formatNairaAmount(grandTotalNaira)}
                  </span>
                </div>
              </div>

              <p className="text-xs text-text-secondary">
                Rates are estimates. Final price is set when you post the job. All funds held in escrow until job completion.
              </p>
            </div>

            {/* CTA */}
            <a
              href="#post-job"
              className="btn-shimmer flex items-center justify-center w-full h-[52px] rounded-[12px] bg-primary hover:bg-primary-hover text-white text-base font-semibold transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Post This Job
            </a>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
