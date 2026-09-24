'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/lib/auth/auth-context';
import {
  Search,
  Bell,
  RefreshCw,
  LogOut,
  Shield,
  ChevronDown,
  Lock,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';

export function AdminHeader() {
  const router = useRouter();
  const { user, adminContext, signOut } = useAdminAuth();
  const [watTime, setWatTime] = useState<string>('');
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Live West Africa Time (WAT = UTC+1) clock matching Stitch design
  useEffect(() => {
    function updateClock() {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Africa/Lagos',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
      setWatTime(`${formatter.format(now)} WAT`);
    }

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  const getPrimaryRoleLabel = () => {
    if (!adminContext) return 'Staff';
    if (adminContext.isSuperadmin) return 'Platform Superadmin';
    if (adminContext.permissions.includes('operations')) return 'Operations Command';
    if (adminContext.permissions.includes('verification')) return 'Verification Lead';
    if (adminContext.permissions.includes('finance')) return 'Finance Administrator';
    if (adminContext.permissions.includes('support')) return 'Trust & Safety Lead';
    if (adminContext.permissions.includes('moderation')) return 'Content Moderator';
    return 'Operations Staff';
  };

  return (
    <header className="bg-white sticky top-0 z-40 w-full px-6 py-2.5 min-h-[56px] shadow-xs border-b border-surface-border flex items-center justify-between">
      {/* Left Brand & Telemetry Cluster */}
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-2">
          <Link href="/admin/overview" className="flex items-center gap-2 group">
            <span className="text-2xl font-extrabold text-primary tracking-tight font-sans">
              menial
            </span>
            <span className="bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
              Admin Ops
            </span>
          </Link>
        </div>

        <div className="h-5 w-px bg-surface-border"></div>

        {/* Real-time WAT Clock & Lagos HQ Gateway */}
        <div className="flex items-center gap-4 text-xs text-surface-muted">
          <div className="flex items-center gap-2 font-medium">
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
            <span className="text-surface-dark font-semibold font-mono">
              {watTime || '12:00:00 WAT'}
            </span>
            <span className="text-[11px] text-surface-muted hidden sm:inline">
              • Lagos HQ Gateway
            </span>
          </div>

          <div className="hidden xl:flex items-center gap-3 pl-3 border-l border-surface-border">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-secondary-on-container bg-secondary-container px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span> NIBSS: Active
            </span>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-secondary-on-container bg-secondary-container px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span> Escrow Virtual Ledger: 100%
            </span>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-secondary-on-container bg-secondary-container px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span> NIMC Identity: 99.8%
            </span>
          </div>
        </div>
      </div>

      {/* Center Search Bar */}
      <div className="flex-1 max-w-md mx-6 hidden md:block">
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-muted w-4 h-4 pointer-events-none" />
          <input
            type="text"
            placeholder="Quick search Worker NIN, Employer BVN, Job ID..."
            className="w-full bg-surface-canvas border border-surface-border focus:border-primary focus:bg-white focus:ring-1 focus:ring-primary text-xs rounded-xl pl-9 pr-14 py-2 text-surface-dark outline-none transition-all placeholder:text-surface-muted/80"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-surface-muted border border-surface-border bg-white px-1.5 py-0.5 rounded shadow-xs">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right Controls & Profile Cluster */}
      <div className="flex items-center gap-3">
        {/* Notification Bell */}
        <button
          type="button"
          className="relative w-9 h-9 flex items-center justify-center rounded-xl text-surface-muted hover:text-surface-dark hover:bg-surface-canvas transition-all"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full ring-2 ring-white"></span>
        </button>

        {/* Sync Telemetry */}
        <button
          type="button"
          onClick={() => router.refresh()}
          className="w-9 h-9 flex items-center justify-center rounded-xl text-surface-muted hover:text-surface-dark hover:bg-surface-canvas transition-all"
          title="Force Sync Ops Ledger"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        <div className="h-6 w-px bg-surface-border"></div>

        {/* Admin Profile Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-3 pl-1 py-1 rounded-xl hover:bg-surface-canvas transition-all text-left"
          >
            <div className="relative">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary font-bold flex items-center justify-center text-xs border border-primary/20">
                {user?.email ? user.email.slice(0, 2).toUpperCase() : 'AD'}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-secondary border-2 border-white"></span>
            </div>

            <div className="hidden lg:block text-left pr-1">
              <div className="text-xs font-bold text-surface-dark leading-tight flex items-center gap-1.5">
                {user?.email?.split('@')[0] || 'Administrator'}
                <ChevronDown className="w-3 h-3 text-surface-muted" />
              </div>
              <p className="text-[11px] text-surface-muted leading-tight mt-0.5">
                {getPrimaryRoleLabel()}
              </p>
            </div>
          </button>

          {/* Profile Dropdown Menu */}
          {showProfileMenu && (
            <div
              className="absolute right-0 mt-2 w-64 bg-white border border-surface-border rounded-xl shadow-modal py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-100"
              onMouseLeave={() => setShowProfileMenu(false)}
            >
              <div className="px-4 py-2 border-b border-surface-border/60">
                <p className="text-xs font-semibold text-surface-dark truncate">
                  {user?.email}
                </p>
                <div className="flex items-center gap-1.5 mt-1 text-[11px]">
                  {adminContext?.mfaVerified ? (
                    <span className="inline-flex items-center gap-1 text-secondary font-semibold">
                      <ShieldCheck className="w-3 h-3" /> MFA Step-Up Verified
                    </span>
                  ) : adminContext?.mfaEnrolled ? (
                    <span className="inline-flex items-center gap-1 text-tertiary font-semibold">
                      <Lock className="w-3 h-3" /> MFA Enrolled (aal1)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-surface-muted">
                      <Shield className="w-3 h-3" /> Single Factor
                    </span>
                  )}
                </div>
              </div>

              {adminContext?.isSuperadmin && (
                <div className="py-1 border-b border-surface-border/60">
                  <Link
                    href="/superadmin/overview"
                    onClick={() => setShowProfileMenu(false)}
                    className="w-full px-4 py-2 text-xs font-bold text-primary hover:bg-primary/5 flex items-center justify-between"
                  >
                    <span>Switch to Superadmin Console</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}

              <div className="py-1">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full px-4 py-2 text-xs font-semibold text-error hover:bg-error-container/40 flex items-center gap-2 cursor-pointer transition-colors text-left"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
