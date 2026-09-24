'use client';

import React from 'react';
import { AdminRouteGuard } from '@/lib/auth/AdminRouteGuard';
import { SuperadminHeader } from '@/components/layout/SuperadminHeader';
import { AdminSidebar } from '@/components/layout/AdminSidebar';

export default function SuperadminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminRouteGuard>
      <div className="min-h-screen flex flex-col bg-surface-canvas text-surface-dark">
        {/* Top Executive Header per Stitch Screen fc1fc9f6... */}
        <SuperadminHeader />

        <div className="flex-1 flex w-full">
          {/* Governance Navigation Sidebar */}
          <AdminSidebar />

          {/* Main Governance Canvas */}
          <main className="flex-1 p-6 max-w-7xl mx-auto w-full overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </AdminRouteGuard>
  );
}
