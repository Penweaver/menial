'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/lib/auth/auth-context';

export default function RootPage() {
  const router = useRouter();
  const { adminContext, isLoading } = useAdminAuth();

  useEffect(() => {
    if (isLoading) return;

    if (!adminContext) {
      router.replace('/login');
    } else if (adminContext.isSuperadmin) {
      router.replace('/superadmin/overview');
    } else {
      router.replace('/admin/overview');
    }
  }, [adminContext, isLoading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-canvas">
      <div className="flex flex-col items-center space-y-4">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-body-md text-surface-muted font-medium">Routing to administrative console...</p>
      </div>
    </div>
  );
}
