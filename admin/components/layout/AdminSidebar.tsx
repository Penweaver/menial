'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAdminAuth } from '@/lib/auth/auth-context';
import { canAccessAdminRoute } from '@/lib/auth/admin-auth';
import { MfaStepUpModal } from '../auth/MfaStepUpModal';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  UserCheck,
  Scale,
  ShieldAlert,
  Wallet,
  CreditCard,
  BookOpen,
  MessageSquareWarning,
  History,
  Shield,
  Settings,
  Activity,
  Lock,
  LockOpen,
  ChevronRight,
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeVariant?: 'neutral' | 'warning' | 'error' | 'success';
  requiresMfaStepUp?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { adminContext } = useAdminAuth();

  const [stepUpOpen, setStepUpOpen] = useState(false);
  const [stepUpTarget, setStepUpTarget] = useState<{ title: string; href: string } | null>(null);

  // Complete navigation structure mapped to administrative domains (§13, §14, §18)
  const navSections: NavSection[] = [
    {
      title: 'OPERATIONAL COMMAND',
      items: [
        { name: 'Live Overview', href: '/admin/overview', icon: LayoutDashboard },
        { name: 'Workers Directory', href: '/admin/workers', icon: Users },
        { name: 'Employers Directory', href: '/admin/employers', icon: Users },
        { name: 'Job & Dispatch', href: '/admin/jobs', icon: Briefcase },
      ],
    },
    {
      title: 'TRUST, SAFETY & COMPLIANCE',
      items: [
        {
          name: 'Verification Queue',
          href: '/admin/verification',
          icon: UserCheck,
          badge: 'Queue',
          badgeVariant: 'warning',
        },
        {
          name: 'Dispute Arbitration',
          href: '/admin/disputes',
          icon: Scale,
          badge: 'Active',
          badgeVariant: 'error',
        },
        {
          name: 'Safety Reports & SOS',
          href: '/admin/safety',
          icon: ShieldAlert,
        },
        {
          name: 'Reviews Moderation',
          href: '/admin/moderation',
          icon: MessageSquareWarning,
        },
      ],
    },
    {
      title: 'FINANCIAL SETTLEMENT (§23)',
      items: [
        {
          name: 'Payouts & Float',
          href: '/admin/payouts',
          icon: Wallet,
          requiresMfaStepUp: true,
        },
        {
          name: 'Payment Transactions',
          href: '/admin/payments',
          icon: CreditCard,
          requiresMfaStepUp: true,
        },
        {
          name: 'Double-Entry Ledger',
          href: '/admin/ledger',
          icon: BookOpen,
          requiresMfaStepUp: true,
        },
      ],
    },
  ];

  // Superadmin Exclusive Section (§11, §14, §71, §72)
  if (adminContext?.isSuperadmin) {
    navSections.push({
      title: 'SUPERADMIN GOVERNANCE',
      items: [
        {
          name: 'Admin Management',
          href: '/superadmin/admins',
          icon: Shield,
          requiresMfaStepUp: true,
        },
        {
          name: 'Platform Settings',
          href: '/superadmin/settings',
          icon: Settings,
          requiresMfaStepUp: true,
        },
        {
          name: 'System Health & Ledgers',
          href: '/superadmin/health',
          icon: Activity,
          requiresMfaStepUp: true,
        },
        {
          name: 'Global Audit Trail',
          href: '/superadmin/audit',
          icon: History,
          requiresMfaStepUp: true,
        },
      ],
    });
  }

  // Filter items by permission using canAccessAdminRoute
  const visibleSections = navSections
    .map((section) => {
      const visibleItems = section.items.filter((item) => {
        const check = canAccessAdminRoute(adminContext, item.href);
        // If allowed is true, display it
        if (check.allowed) return true;
        // If blocked solely because of session MFA step-up challenge, keep visible with lock badge!
        if (check.reason?.includes('MFA step-up challenge required')) return true;
        // Otherwise hidden due to missing permission (§13, §18)
        return false;
      });

      return { ...section, items: visibleItems };
    })
    .filter((section) => section.items.length > 0);

  const handleNavClick = (e: React.MouseEvent, item: NavItem) => {
    // If route requires step-up and session is not yet step-up verified
    const check = canAccessAdminRoute(adminContext, item.href);
    if (!check.allowed && check.reason?.includes('MFA step-up challenge required')) {
      e.preventDefault();
      setStepUpTarget({ title: item.name, href: item.href });
      setStepUpOpen(true);
    }
  };

  const handleStepUpSuccess = () => {
    setStepUpOpen(false);
    if (stepUpTarget) {
      router.push(stepUpTarget.href);
    }
  };

  return (
    <>
      <aside className="w-64 bg-white border-r border-surface-border flex flex-col shrink-0 min-h-[calc(100vh-56px)] select-none">
        {/* Navigation Section List */}
        <div className="flex-1 py-4 px-3 space-y-6 overflow-y-auto">
          {visibleSections.map((section) => (
            <div key={section.title} className="space-y-1">
              <h4 className="px-3 text-[10px] font-bold text-surface-muted uppercase tracking-wider">
                {section.title}
              </h4>

              <div className="space-y-0.5 pt-1">
                {section.items.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== '/admin/overview' && pathname.startsWith(item.href));

                  // Determine if step-up challenge icon is required
                  const isStepUpLocked =
                    item.requiresMfaStepUp && adminContext?.mfaVerified === false;

                  const IconComponent = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={(e) => handleNavClick(e, item)}
                      className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-primary text-white shadow-xs font-bold'
                          : 'text-surface-dark hover:bg-surface-canvas hover:text-primary'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <IconComponent
                          className={`w-4 h-4 shrink-0 transition-colors ${
                            isActive
                              ? 'text-white'
                              : 'text-surface-muted group-hover:text-primary'
                          }`}
                        />
                        <span className="truncate">{item.name}</span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isStepUpLocked ? (
                          <span
                            title="MFA Session Step-Up Required (§23)"
                            className={`p-0.5 rounded ${
                              isActive ? 'text-white/80' : 'text-tertiary'
                            }`}
                          >
                            <Lock className="w-3.5 h-3.5" />
                          </span>
                        ) : item.requiresMfaStepUp && adminContext?.mfaVerified ? (
                          <span
                            title="MFA Step-Up Active"
                            className={`p-0.5 rounded ${
                              isActive ? 'text-white/80' : 'text-secondary'
                            }`}
                          >
                            <LockOpen className="w-3 h-3" />
                          </span>
                        ) : null}

                        {item.badge && (
                          <span
                            className={`px-1.5 py-0.2 text-[10px] font-bold rounded-full ${
                              isActive
                                ? 'bg-white/20 text-white'
                                : item.badgeVariant === 'error'
                                ? 'bg-error-container text-error-on-container'
                                : item.badgeVariant === 'warning'
                                ? 'bg-tertiary-container text-tertiary-on-container'
                                : 'bg-surface-canvas text-surface-muted'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Role Info Footer */}
        <div className="p-3 border-t border-surface-border/60 bg-surface-canvas/50">
          <div className="px-3 py-2 rounded-xl bg-white border border-surface-border text-xs">
            <div className="flex items-center justify-between text-surface-muted text-[10px] font-bold uppercase tracking-wider mb-1">
              <span>Security Clearance</span>
              <span
                className={`font-semibold ${
                  adminContext?.isSuperadmin
                    ? 'text-primary font-bold'
                    : 'text-secondary-on-container'
                }`}
              >
                {adminContext?.isSuperadmin ? 'Tier-0' : 'Tier-1'}
              </span>
            </div>
            <div className="font-semibold text-surface-dark truncate text-[11px]">
              {adminContext?.isSuperadmin ? 'Superadmin Root' : `${adminContext?.permissions?.length || 0} Permissions`}
            </div>
          </div>
        </div>
      </aside>

      {/* Inline MFA Step-Up Challenge Modal */}
      <MfaStepUpModal
        isOpen={stepUpOpen}
        onClose={() => setStepUpOpen(false)}
        onSuccess={handleStepUpSuccess}
        targetSectionTitle={stepUpTarget?.title}
      />
    </>
  );
}
