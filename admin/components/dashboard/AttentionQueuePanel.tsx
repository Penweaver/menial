'use client';

import React from 'react';
import Link from 'next/link';
import type { OverviewMetricsData } from '@shared/services/operations/AdminOperationsService';
import {
  AlertTriangle,
  UserCheck,
  Scale,
  ShieldAlert,
  CreditCard,
  ArrowUpRight,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';

interface AttentionQueuePanelProps {
  queue: OverviewMetricsData['attention_queue'] | null;
  isLoading?: boolean;
}

export function AttentionQueuePanel({ queue, isLoading }: AttentionQueuePanelProps) {
  const totalAttentionCount = queue
    ? queue.pending_verifications +
      queue.open_disputes +
      queue.open_safety_reports +
      queue.failed_payments +
      queue.failed_payouts
    : 0;

  if (isLoading && !queue) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-4 w-48 bg-slate-200 rounded animate-pulse" />
          <div className="h-4 w-28 bg-slate-100 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, idx) => (
            <div
              key={idx}
              className="p-5 bg-white border border-surface-border rounded-2xl shadow-card space-y-3 animate-pulse"
            >
              <div className="flex items-center justify-between">
                <div className="h-4 w-24 bg-slate-200 rounded" />
                <div className="h-6 w-10 bg-slate-100 rounded-full" />
              </div>
              <div className="h-10 w-full bg-slate-100 rounded" />
              <div className="h-4 w-28 bg-slate-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header with Title and Total Attention Count */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-tertiary-container text-tertiary-on-container">
            <AlertTriangle className="w-4 h-4 text-tertiary" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-surface-dark uppercase tracking-wider">
              Operational Attention Queue (§54)
            </h2>
            <p className="text-xs text-surface-muted">
              Live actionable items requiring administrative staff intervention
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {totalAttentionCount > 0 ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-error-container text-error-on-container text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-error animate-ping" />
              {totalAttentionCount} Actionable Items
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Queue Clean • 0 Pending
            </span>
          )}
        </div>
      </div>

      {/* Grid of 5 Triage Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* 1. Pending Verifications */}
        <Link
          href="/admin/verification"
          className={`group p-5 bg-white border rounded-2xl shadow-card transition-all flex flex-col justify-between space-y-3 ${
            queue && queue.pending_verifications > 0
              ? 'border-tertiary/60 hover:border-tertiary hover:shadow-md'
              : 'border-surface-border hover:border-surface-muted'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-tertiary-container text-tertiary-on-container">
                <UserCheck className="w-4 h-4 text-tertiary" />
              </div>
              <span className="text-xs font-bold text-surface-dark">
                Verifications
              </span>
            </div>
            <span
              className={`font-mono font-bold text-xs px-2.5 py-0.5 rounded-full tabular-nums ${
                queue && queue.pending_verifications > 0
                  ? 'bg-tertiary-container text-tertiary-on-container font-extrabold'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {queue ? queue.pending_verifications : 0}
            </span>
          </div>

          <p className="text-xs text-surface-muted line-clamp-2">
            Pending 11-digit NIN identity submissions waiting for review &amp; NDPA verification.
          </p>

          <div className="flex items-center gap-1 text-xs font-bold text-tertiary-on-container group-hover:translate-x-0.5 transition-transform pt-1">
            <span>Review Queue</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        {/* 2. Active Disputes */}
        <Link
          href="/admin/disputes"
          className={`group p-5 bg-white border rounded-2xl shadow-card transition-all flex flex-col justify-between space-y-3 ${
            queue && queue.open_disputes > 0
              ? 'border-error/60 hover:border-error hover:shadow-md bg-red-50/10'
              : 'border-surface-border hover:border-surface-muted'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-error-container text-error-on-container">
                <Scale className="w-4 h-4 text-error" />
              </div>
              <span className="text-xs font-bold text-surface-dark">
                Disputes
              </span>
            </div>
            <span
              className={`font-mono font-bold text-xs px-2.5 py-0.5 rounded-full tabular-nums ${
                queue && queue.open_disputes > 0
                  ? 'bg-error-container text-error-on-container font-extrabold'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {queue ? queue.open_disputes : 0}
            </span>
          </div>

          <p className="text-xs text-surface-muted line-clamp-2">
            Contested jobs with frozen escrow vault funds awaiting photo evidence inspection.
          </p>

          <div className="flex items-center gap-1 text-xs font-bold text-error group-hover:translate-x-0.5 transition-transform pt-1">
            <span>Arbitrate Disputes</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        {/* 3. Emergency SOS & Safety Reports */}
        <Link
          href="/admin/safety"
          className={`group p-5 bg-white border rounded-2xl shadow-card transition-all flex flex-col justify-between space-y-3 ${
            queue && queue.open_safety_reports > 0
              ? 'border-error ring-1 ring-error/50 bg-red-50/20 hover:shadow-md'
              : 'border-surface-border hover:border-surface-muted'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-error text-white">
                <ShieldAlert className="w-4 h-4 animate-pulse" />
              </div>
              <span className="text-xs font-bold text-surface-dark">
                Safety &amp; SOS
              </span>
            </div>
            <span
              className={`font-mono font-bold text-xs px-2.5 py-0.5 rounded-full tabular-nums ${
                queue && queue.open_safety_reports > 0
                  ? 'bg-error text-white animate-pulse font-extrabold'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {queue ? queue.open_safety_reports : 0}
            </span>
          </div>

          <p className="text-xs text-surface-muted line-clamp-2">
            Urgent Section 49 in-person distress alerts with GPS coordinates and 112 dispatch.
          </p>

          <div className="flex items-center gap-1 text-xs font-bold text-error group-hover:translate-x-0.5 transition-transform pt-1">
            <span>Inspect Alerts</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        {/* 4. Failed Payments */}
        <Link
          href="/admin/payments"
          className={`group p-5 bg-white border rounded-2xl shadow-card transition-all flex flex-col justify-between space-y-3 ${
            queue && queue.failed_payments > 0
              ? 'border-amber-500/60 hover:border-amber-500 hover:shadow-md'
              : 'border-surface-border hover:border-surface-muted'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-100 text-amber-900">
                <CreditCard className="w-4 h-4 text-amber-700" />
              </div>
              <span className="text-xs font-bold text-surface-dark">
                Failed Payments
              </span>
            </div>
            <span
              className={`font-mono font-bold text-xs px-2.5 py-0.5 rounded-full tabular-nums ${
                queue && queue.failed_payments > 0
                  ? 'bg-amber-100 text-amber-900 font-extrabold'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {queue ? queue.failed_payments : 0}
            </span>
          </div>

          <p className="text-xs text-surface-muted line-clamp-2">
            Inbound card or transfer deposits that failed or timed out during escrow funding.
          </p>

          <div className="flex items-center gap-1 text-xs font-bold text-amber-800 group-hover:translate-x-0.5 transition-transform pt-1">
            <span>Reconcile Payments</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        {/* 5. Failed Payouts */}
        <Link
          href="/admin/payouts"
          className={`group p-5 bg-white border rounded-2xl shadow-card transition-all flex flex-col justify-between space-y-3 ${
            queue && queue.failed_payouts > 0
              ? 'border-indigo-500/60 hover:border-indigo-500 hover:shadow-md'
              : 'border-surface-border hover:border-surface-muted'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-indigo-100 text-indigo-900">
                <ArrowUpRight className="w-4 h-4 text-indigo-700" />
              </div>
              <span className="text-xs font-bold text-surface-dark">
                Failed Payouts
              </span>
            </div>
            <span
              className={`font-mono font-bold text-xs px-2.5 py-0.5 rounded-full tabular-nums ${
                queue && queue.failed_payouts > 0
                  ? 'bg-indigo-100 text-indigo-900 font-extrabold'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {queue ? queue.failed_payouts : 0}
            </span>
          </div>

          <p className="text-xs text-surface-muted line-clamp-2">
            Outbound NIP worker disbursements rejected by destination banks or switch.
          </p>

          <div className="flex items-center gap-1 text-xs font-bold text-indigo-800 group-hover:translate-x-0.5 transition-transform pt-1">
            <span>Reroute Payouts</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </Link>
      </div>
    </div>
  );
}
