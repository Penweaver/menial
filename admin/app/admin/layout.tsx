'use client';

import React, { useState } from 'react';
import { AdminRouteGuard } from '@/lib/auth/AdminRouteGuard';
import { AdminHeader } from '@/components/layout/AdminHeader';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { SosAlertBanner } from '@/components/safety/SosAlertBanner';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <AdminRouteGuard>
      <div className="min-h-screen flex flex-col bg-surface-canvas text-surface-dark">
        {/* Audible repeating SOS emergency alarm banner (§L) */}
        <SosAlertBanner />

        {/* Top App Bar per Stitch Screen 44069ce3... */}
        <AdminHeader onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)} />

        <div className="flex-1 flex w-full">
          {/* Left Permission-based Navigation Sidebar with mobile drawer support */}
          <AdminSidebar
            mobileOpen={mobileMenuOpen}
            onCloseMobile={() => setMobileMenuOpen(false)}
          />

          {/* Main Operational Canvas */}
          <main className="flex-1 p-4 sm:p-6 max-w-[1720px] mx-auto w-full overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </AdminRouteGuard>
  );
}
