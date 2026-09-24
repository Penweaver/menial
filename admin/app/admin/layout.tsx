'use client';

import React from 'react';
import { AdminRouteGuard } from '@/lib/auth/AdminRouteGuard';
import { AdminHeader } from '@/components/layout/AdminHeader';
import { AdminSidebar } from '@/components/layout/AdminSidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminRouteGuard>
      <div className="min-h-screen flex flex-col bg-surface-canvas text-surface-dark">
        {/* Top App Bar per Stitch Screen 44069ce3... */}
        <AdminHeader />

        <div className="flex-1 flex w-full">
          {/* Left Permission-based Navigation Sidebar */}
          <AdminSidebar />

          {/* Main Operational Canvas */}
          <main className="flex-1 p-6 max-w-[1720px] mx-auto w-full overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </AdminRouteGuard>
  );
}
