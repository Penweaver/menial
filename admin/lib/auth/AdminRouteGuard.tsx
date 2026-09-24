'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAdminAuth } from './auth-context';
import { canAccessAdminRoute } from './admin-auth';

interface AdminRouteGuardProps {
  children: React.ReactNode;
}

export function AdminRouteGuard({ children }: AdminRouteGuardProps) {
  const { adminContext, isLoading } = useAdminAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;

    // Authentication paths bypass the route guard
    if (pathname.startsWith('/login') || pathname.startsWith('/accept-invitation')) {
      return;
    }

    // Unauthenticated user -> redirect to login
    if (!adminContext) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    // Check RBAC route permissions and MFA session step-up requirements
    const access = canAccessAdminRoute(adminContext, pathname);
    if (!access.allowed) {
      if (access.reason?.includes('MFA step-up challenge required')) {
        router.push(`/login/mfa-challenge?redirect=${encodeURIComponent(pathname)}`);
        return;
      }
      if (access.reason?.includes('MFA enrollment is mandatory')) {
        router.push(`/login/mfa-enroll?redirect=${encodeURIComponent(pathname)}`);
        return;
      }

      router.replace(`/unauthorized?reason=${encodeURIComponent(access.reason || 'Access denied.')}`);
    }
  }, [adminContext, isLoading, pathname, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-canvas">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-body-md text-surface-muted font-medium">Verifying Administrative Clearance...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
