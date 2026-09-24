'use client';

import React, { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAdminAuth } from '@/lib/auth/auth-context';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';

function UnauthorizedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reason = searchParams.get('reason') || 'You do not have administrative clearance for this section.';
  const { adminContext } = useAdminAuth();

  return (
    <div className="min-h-screen bg-surface-canvas flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-surface py-10 px-6 shadow-card border border-surface-border rounded-xl sm:px-10 text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-error-container text-error flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <h2 className="text-xl font-bold text-surface-dark">
            Administrative Access Denied
          </h2>

          <div className="p-3.5 bg-error-container/50 border border-error/20 rounded-lg text-sm font-medium text-error-on-container text-left">
            {reason}
          </div>

          <p className="text-xs text-surface-muted leading-relaxed">
            Per platform specifications (§10, §13, §18), administrative permissions are segmented by operational role.
            {adminContext?.permissions && adminContext.permissions.length > 0 && (
              <span className="block mt-2 font-mono text-[11px] text-surface-dark">
                Your Active Permissions: [{adminContext.permissions.join(', ')}]
              </span>
            )}
          </p>

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 h-11 flex justify-center items-center gap-2 rounded-lg bg-surface-canvas border border-surface-border text-sm font-semibold text-surface-dark hover:bg-surface-input"
            >
              <ArrowLeft className="w-4 h-4" /> Go Back
            </button>
            <button
              type="button"
              onClick={() => router.push(adminContext?.isSuperadmin ? '/superadmin/overview' : '/admin/overview')}
              className="flex-1 h-11 flex justify-center items-center gap-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-hover shadow-sm"
            >
              <Home className="w-4 h-4" /> Overview
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UnauthorizedPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-surface-canvas flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <UnauthorizedContent />
    </Suspense>
  );
}
