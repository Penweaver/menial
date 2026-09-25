'use client';

import React from 'react';
import type { OverviewMetricsData } from '@shared/services/operations/AdminOperationsService';
import {
  Activity,
  CheckCircle2,
  XCircle,
  UserCheck,
  Users,
  Wallet,
  TrendingUp,
  ShieldCheck,
} from 'lucide-react';

interface OverviewKpiGridProps {
  metrics: OverviewMetricsData['metrics'] | null;
  isLoading?: boolean;
}

export function OverviewKpiGrid({ metrics, isLoading }: OverviewKpiGridProps) {
  // Format integer kobo into Nigerian Naira (NGN) string with 2 decimal places and tabular nums
  const formatNairaFromKobo = (kobo: number): string => {
    const naira = kobo / 100;
    return `₦${naira.toLocaleString('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  if (isLoading && !metrics) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div
            key={idx}
            className="p-5 bg-white border border-surface-border rounded-2xl shadow-card space-y-3 animate-pulse"
          >
            <div className="flex items-center justify-between">
              <div className="h-3 w-20 bg-slate-200 rounded" />
              <div className="h-8 w-8 bg-slate-100 rounded-xl" />
            </div>
            <div className="h-7 w-24 bg-slate-200 rounded" />
            <div className="h-3 w-28 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {/* 1. Active In-Flight Jobs */}
      <div className="p-5 bg-white border border-surface-border rounded-2xl shadow-card flex flex-col justify-between space-y-2 hover:border-secondary/40 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-surface-muted uppercase tracking-wider">
            Active Dispatch
          </span>
          <div className="p-2 rounded-xl bg-secondary-container text-secondary-on-container">
            <Activity className="w-4 h-4 animate-pulse" />
          </div>
        </div>
        <div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl font-extrabold text-surface-dark tracking-tight tabular-nums">
              {metrics ? metrics.active_jobs_count.toLocaleString() : '--'}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-secondary-container text-secondary-on-container">
              Live
            </span>
          </div>
          <p className="text-[11px] text-surface-muted mt-1">
            In matching, en route &amp; execution
          </p>
        </div>
      </div>

      {/* 2. Completed Jobs */}
      <div className="p-5 bg-white border border-surface-border rounded-2xl shadow-card flex flex-col justify-between space-y-2 hover:border-emerald-500/40 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-surface-muted uppercase tracking-wider">
            Completed Jobs
          </span>
          <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl font-extrabold text-surface-dark tracking-tight tabular-nums">
              {metrics ? metrics.completed_jobs_count.toLocaleString() : '--'}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              Settled
            </span>
          </div>
          <p className="text-[11px] text-surface-muted mt-1">
            Confirmed &amp; ledger-balanced
          </p>
        </div>
      </div>

      {/* 3. Cancelled Jobs */}
      <div className="p-5 bg-white border border-surface-border rounded-2xl shadow-card flex flex-col justify-between space-y-2 hover:border-slate-300 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-surface-muted uppercase tracking-wider">
            Cancelled Jobs
          </span>
          <div className="p-2 rounded-xl bg-slate-100 text-slate-600">
            <XCircle className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl font-extrabold text-surface-dark tracking-tight tabular-nums">
              {metrics ? metrics.cancelled_jobs_count.toLocaleString() : '--'}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
              Terminal
            </span>
          </div>
          <p className="text-[11px] text-surface-muted mt-1">
            User cancelled or policy timeout
          </p>
        </div>
      </div>

      {/* 4. Total Verified Workers */}
      <div className="p-5 bg-white border border-surface-border rounded-2xl shadow-card flex flex-col justify-between space-y-2 hover:border-primary/40 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-surface-muted uppercase tracking-wider">
            Verified Workers
          </span>
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <UserCheck className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl font-extrabold text-surface-dark tracking-tight tabular-nums">
              {metrics ? metrics.total_workers.toLocaleString() : '--'}
            </span>
            {metrics && metrics.new_users_today > 0 && (
              <span className="text-[10px] font-bold text-secondary flex items-center gap-0.5 bg-secondary-container px-1.5 py-0.5 rounded-full">
                <TrendingUp className="w-2.5 h-2.5" />+{metrics.new_users_today}
              </span>
            )}
          </div>
          <p className="text-[11px] text-surface-muted mt-1">
            Active across labor corridors
          </p>
        </div>
      </div>

      {/* 5. Registered Employers */}
      <div className="p-5 bg-white border border-surface-border rounded-2xl shadow-card flex flex-col justify-between space-y-2 hover:border-primary/40 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-surface-muted uppercase tracking-wider">
            Active Employers
          </span>
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <Users className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl font-extrabold text-surface-dark tracking-tight tabular-nums">
              {metrics ? metrics.total_employers.toLocaleString() : '--'}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
              Verified
            </span>
          </div>
          <p className="text-[11px] text-surface-muted mt-1">
            Individual &amp; commercial accounts
          </p>
        </div>
      </div>

      {/* 6. Platform Fee Revenue */}
      <div className="p-5 bg-white border border-surface-border rounded-2xl shadow-card flex flex-col justify-between space-y-2 hover:border-primary/50 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-surface-muted uppercase tracking-wider">
            Platform Revenue
          </span>
          <div className="p-2 rounded-xl bg-primary text-white">
            <Wallet className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="flex items-baseline gap-1">
            <span className="font-mono text-xl xl:text-2xl font-extrabold text-surface-dark tracking-tight tabular-nums">
              {metrics ? formatNairaFromKobo(metrics.platform_revenue_kobo) : '₦0.00'}
            </span>
          </div>
          <p className="text-[11px] text-surface-muted mt-1">
            Double-entry ledger fee sum (§44)
          </p>
        </div>
      </div>
    </div>
  );
}
