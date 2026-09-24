'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/lib/auth/auth-context';
import {
  ShieldAlert,
  Download,
  Bell,
  Key,
  ShieldCheck,
  ChevronDown,
  LogOut,
  ExternalLink,
  Shield,
  Layers,
  Building,
} from 'lucide-react';

export function SuperadminHeader() {
  const router = useRouter();
  const { user, signOut } = useAdminAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [sentinelActive, setSentinelActive] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  const toggleSentinel = () => {
    if (confirm('⚠️ ESCROW PAUSE SENTINEL: Are you sure you want to test the emergency escrow hold circuit breaker (§72)?')) {
      setSentinelActive(!sentinelActive);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-surface-border shadow-xs">
      {/* Top Executive Navigation */}
      <div className="flex justify-between items-center w-full px-6 py-2.5 min-h-[56px] mx-auto">
        {/* Brand & Security Clearance Cluster */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Link href="/superadmin/overview" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white shadow-xs">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <span className="text-2xl font-extrabold text-primary tracking-tight font-sans">
                menial
              </span>
            </Link>
          </div>

          <span className="px-2 py-0.5 rounded-full bg-surface-canvas text-surface-dark text-[11px] font-bold border border-surface-border uppercase tracking-wider">
            superadmin v2.4
          </span>

          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
            <span className="text-[11px] font-extrabold tracking-wide uppercase">
              Tier-0 Root Clearance
            </span>
          </div>
        </div>

        {/* Quick Executive Actions & Profile */}
        <div className="flex items-center gap-3">
          {/* Emergency Safeguard Action Button */}
          <button
            type="button"
            onClick={toggleSentinel}
            className={`hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer ${
              sentinelActive
                ? 'bg-error text-white ring-2 ring-error/30'
                : 'bg-error-container text-error hover:bg-error hover:text-white'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>{sentinelActive ? 'Sentinel Engaged' : 'Escrow Pause Sentinel'}</span>
          </button>

          {/* Audit Export Quick Link */}
          <button
            type="button"
            onClick={() => alert('Exporting signed CBN Regulatory Dossier (§72)...')}
            className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-canvas text-surface-dark text-xs font-semibold border border-surface-border hover:bg-surface-input transition-colors shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-primary" />
            <span>CBN Dossier</span>
          </button>

          {/* Notification Bell */}
          <button
            type="button"
            className="relative p-2 rounded-xl text-surface-muted hover:text-surface-dark hover:bg-surface-canvas transition-colors"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-error ring-2 ring-white"></span>
          </button>

          <div className="h-6 w-px bg-surface-border"></div>

          {/* User Profile Pill */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2 pl-1 py-1 rounded-xl hover:bg-surface-canvas transition-all text-left"
            >
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-primary text-white font-bold flex items-center justify-center text-xs ring-2 ring-primary/20">
                  SA
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-secondary border-2 border-white"></span>
              </div>

              <div className="hidden xl:flex flex-col text-left">
                <span className="text-xs font-bold text-surface-dark leading-tight flex items-center gap-1">
                  {user?.email?.split('@')[0] || 'Platform Superadmin'}
                  <ChevronDown className="w-3 h-3 text-surface-muted" />
                </span>
                <span className="text-[10px] text-secondary font-bold flex items-center gap-1 mt-0.5">
                  <Key className="w-3 h-3" /> TOTP MFA Active (§23)
                </span>
              </div>
            </button>

            {/* Profile Dropdown */}
            {showProfileMenu && (
              <div
                className="absolute right-0 mt-2 w-64 bg-white border border-surface-border rounded-xl shadow-modal py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-100"
                onMouseLeave={() => setShowProfileMenu(false)}
              >
                <div className="px-4 py-2 border-b border-surface-border/60">
                  <p className="text-xs font-bold text-surface-dark truncate">{user?.email}</p>
                  <p className="text-[11px] text-secondary font-semibold flex items-center gap-1 mt-0.5">
                    <ShieldCheck className="w-3 h-3" /> Unique Superadmin Clearance
                  </p>
                </div>

                <div className="py-1 border-b border-surface-border/60">
                  <Link
                    href="/admin/overview"
                    onClick={() => setShowProfileMenu(false)}
                    className="w-full px-4 py-2 text-xs font-semibold text-primary hover:bg-primary/5 flex items-center justify-between"
                  >
                    <span>Switch to Operations Dashboard</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>

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
      </div>

      {/* Multi-Region & Escrow Sentinel Ribbon */}
      <div className="bg-surface-canvas px-6 py-2 border-t border-surface-border/60">
        <div className="w-full mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Territorial Status */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-surface-muted font-medium flex items-center gap-1 text-[11px]">
              <Building className="w-3 h-3" /> Regional Corridors:
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white text-surface-dark border border-surface-border text-[11px] font-medium shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span> Lagos (Nominal)
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white text-surface-dark border border-surface-border text-[11px] font-medium shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span> Abuja FCT (Active)
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white text-surface-dark border border-surface-border text-[11px] font-medium shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span> Port Harcourt (Active)
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white text-tertiary-on-container border border-tertiary/20 text-[11px] font-medium shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span> Ibadan (Beta Phase 2)
            </span>
          </div>

          {/* Live Escrow Custody Tag */}
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary text-white text-[11px] shadow-xs">
              <Shield className="w-3.5 h-3.5 text-secondary" />
              <span>
                Escrow Custody:{' '}
                <strong className="font-bold text-white font-mono tabular-nums">₦84,250,000</strong>
              </span>
              <span className="text-white/70 text-[10px] hidden sm:inline">
                (100% NDIC Partner Vaults)
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
