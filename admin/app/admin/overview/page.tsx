'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getAdminOperationsService } from '@/lib/services';
import type { OverviewMetricsData } from '@shared/services/operations/AdminOperationsService';
import { useAdminAuth } from '@/lib/auth/auth-context';
import { OverviewKpiGrid } from '@/components/dashboard/OverviewKpiGrid';
import { AttentionQueuePanel } from '@/components/dashboard/AttentionQueuePanel';
import {
  RefreshCw,
  Clock,
  Shield,
  MapPin,
  Briefcase,
  Users,
  AlertCircle,
  ExternalLink,
  Radio,
} from 'lucide-react';

export default function AdminOverviewPage() {
  const { adminContext } = useAdminAuth();
  const [data, setData] = useState<OverviewMetricsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchMetrics = useCallback(async (isSilent = false) => {
    if (!isSilent) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }
    setError(null);

    try {
      const ops = getAdminOperationsService();
      const res = await ops.getOverviewMetrics();
      setData(res);
      setLastUpdated(new Date());
    } catch (err: unknown) {
      console.error('Failed to fetch admin overview metrics:', err);
      const errMsg = err instanceof Error ? err.message : 'Unknown database error';
      setError(`Unable to retrieve live metrics: ${errMsg}`);
      
      // Fallback baseline (§94 non-fabricated structure) if no data has been loaded yet
      setData((prev) => prev ?? {
        metrics: {
          total_workers: 0,
          total_employers: 0,
          new_users_today: 0,
          active_jobs_count: 0,
          completed_jobs_count: 0,
          cancelled_jobs_count: 0,
          platform_revenue_kobo: 0,
          currency: 'NGN',
        },
        attention_queue: {
          pending_verifications: 0,
          open_disputes: 0,
          open_safety_reports: 0,
          failed_payments: 0,
          failed_payouts: 0,
        },
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchMetrics(false);
  }, [fetchMetrics]);

  // Periodic 30-second silent telemetry refresh
  useEffect(() => {
    const timer = setInterval(() => {
      fetchMetrics(true);
    }, 30000);

    return () => clearInterval(timer);
  }, [fetchMetrics]);

  // Format last updated time in WAT (UTC+1)
  const formatWatTime = (date: Date | null) => {
    if (!date) return '--:--:-- WAT';
    return date.toLocaleTimeString('en-GB', {
      timeZone: 'Africa/Lagos',
      hour12: false,
    }) + ' WAT';
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-surface-dark tracking-tight">
              Marketplace Command Center
            </h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-container text-secondary-on-container text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
              Live Grid Active
            </span>
          </div>
          <p className="text-xs text-surface-muted mt-1">
            Section 54 operational telemetry, double-entry ledger totals, and real-time corridor dispatch
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-white border border-surface-border rounded-xl text-xs text-surface-muted">
            <Clock className="w-3.5 h-3.5 text-surface-muted" />
            <span>Updated:</span>
            <span className="font-mono font-semibold text-surface-dark tabular-nums">
              {formatWatTime(lastUpdated)}
            </span>
          </div>

          <button
            onClick={() => fetchMetrics(false)}
            disabled={isLoading || isRefreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-surface-border text-surface-dark hover:bg-surface-canvas text-xs font-semibold shadow-xs transition-colors disabled:opacity-60"
            title="Refresh overview metrics"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-surface-muted ${
                isLoading || isRefreshing ? 'animate-spin' : ''
              }`}
            />
            <span>{isLoading || isRefreshing ? 'Syncing...' : 'Refresh Metrics'}</span>
          </button>
        </div>
      </div>

      {/* Error Alert Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-error/30 text-error flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => fetchMetrics(false)}
            className="font-bold underline hover:no-underline shrink-0"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Regional Corridor Dispatch Bar */}
      <div className="p-4 bg-white border border-surface-border rounded-2xl shadow-card flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-secondary animate-pulse" />
          <span className="text-xs font-bold text-surface-dark uppercase tracking-wider">
            Operational Corridors:
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-primary" />
            <span className="font-semibold text-surface-dark">Lagos Metro</span>
            <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
            <span className="text-[11px] text-surface-muted">Lekki, Ikeja, Yaba</span>
          </div>

          <div className="h-4 w-px bg-surface-border hidden sm:block" />

          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-primary" />
            <span className="font-semibold text-surface-dark">Abuja FCT</span>
            <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
            <span className="text-[11px] text-surface-muted">Gwarinpa, Maitama, Wuse</span>
          </div>

          <div className="h-4 w-px bg-surface-border hidden md:block" />

          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-primary" />
            <span className="font-semibold text-surface-dark">Rivers State</span>
            <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
            <span className="text-[11px] text-surface-muted">Port Harcourt</span>
          </div>
        </div>

        <div className="text-[11px] font-semibold text-secondary flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-secondary animate-ping" />
          Corridors Healthy
        </div>
      </div>

      {/* Primary KPI Grid (§54, §94) */}
      <OverviewKpiGrid metrics={data?.metrics ?? null} isLoading={isLoading} />

      {/* Operational Attention Queue (§54) */}
      <AttentionQueuePanel queue={data?.attention_queue ?? null} isLoading={isLoading} />

      {/* Administrative Session Clearance & Direct Navigation */}
      <div className="p-5 bg-white border border-surface-border rounded-2xl shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-surface-dark flex items-center gap-2">
              Authenticated Session:{' '}
              {adminContext?.isSuperadmin ? 'Superadmin Root Controller' : 'Operations Staff'}
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase">
                Active
              </span>
            </h3>
            <p className="text-[11px] text-surface-muted mt-0.5">
              Assigned clearances:{' '}
              {adminContext?.permissions && adminContext.permissions.length > 0
                ? adminContext.permissions.join(', ')
                : 'Operational read-only monitoring'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/workers"
            className="px-3.5 py-2 rounded-xl bg-surface-canvas hover:bg-slate-200 text-surface-dark font-semibold text-xs transition-colors flex items-center gap-1.5"
          >
            <Users className="w-3.5 h-3.5 text-surface-muted" />
            <span>Workers Roster</span>
          </Link>

          <Link
            href="/admin/jobs"
            className="px-3.5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Active Dispatch</span>
          </Link>

          {adminContext?.isSuperadmin && (
            <Link
              href="/superadmin/overview"
              className="px-3.5 py-2 rounded-xl bg-surface-dark hover:bg-black text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5"
            >
              <span>Governance Console</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
