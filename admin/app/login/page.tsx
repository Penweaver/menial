'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAdminAuth } from '@/lib/auth/auth-context';
import { Shield, Lock, Mail, Eye, EyeOff, AlertCircle } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect');

  const { login } = useAdminAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please provide both your administrative email and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await login(email.trim(), password);

      if (!result.success) {
        setError(result.error || 'Authentication failed. Please verify your credentials.');
        setIsSubmitting(false);
        return;
      }

      if (result.requiresMfaEnroll) {
        const next = redirectUrl ? `?redirect=${encodeURIComponent(redirectUrl)}` : '';
        router.push(`/login/mfa-enroll${next}`);
        return;
      }

      if (result.requiresMfaChallenge) {
        const next = redirectUrl ? `?redirect=${encodeURIComponent(redirectUrl)}` : '';
        router.push(`/login/mfa-challenge${next}`);
        return;
      }

      // Successful login without additional gates
      router.push(redirectUrl || '/admin/overview');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred during authentication.';
      setError(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-canvas flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Header */}
        <div className="flex justify-center items-center gap-2 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-header">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <span className="text-3xl font-extrabold text-primary tracking-tight">menial</span>
        </div>
        <h2 className="text-center text-xl font-bold text-surface-dark tracking-tight">
          Administrative Command Portal
        </h2>
        <p className="mt-1 text-center text-sm text-surface-muted">
          Staff Operations &amp; Superadmin Governance System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-surface py-8 px-6 shadow-card border border-surface-border rounded-xl sm:px-10">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3.5 rounded-lg bg-error-container border border-error/20 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-error-on-container shrink-0 mt-0.5" />
                <div className="text-sm font-medium text-error-on-container">{error}</div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-surface-dark">
                Official Email Address
              </label>
              <div className="mt-1.5 relative rounded-md">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-surface-muted">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@menial.ng"
                  className="block w-full h-[50px] pl-10 pr-3.5 bg-surface-canvas border border-surface-border rounded-lg text-surface-dark placeholder-surface-muted text-sm focus:outline-none focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-surface-dark">
                Password
              </label>
              <div className="mt-1.5 relative rounded-md">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-surface-muted">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="block w-full h-[50px] pl-10 pr-12 bg-surface-canvas border border-surface-border rounded-lg text-surface-dark placeholder-surface-muted text-sm focus:outline-none focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-surface-muted hover:text-surface-dark"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-[52px] flex justify-center items-center px-4 border border-transparent rounded-lg shadow-sm text-base font-semibold text-white bg-primary hover:bg-primary-hover active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Authenticating Clearance...</span>
                  </div>
                ) : (
                  'Authorize Console Access'
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 border-t border-surface-border pt-4">
            <div className="flex items-center justify-between text-xs text-surface-muted">
              <span>Have an invite token?</span>
              <a
                href="/accept-invitation"
                className="font-semibold text-primary hover:text-primary-hover hover:underline"
              >
                Accept Admin Invitation →
              </a>
            </div>
          </div>
        </div>

        {/* Security Footer Notice */}
        <div className="mt-6 text-center text-xs text-surface-muted px-4">
          <p className="flex items-center justify-center gap-1.5 font-medium text-surface-dark/70 mb-1">
            <Shield className="w-3.5 h-3.5 text-primary" />
            Mandatory Multi-Factor Authentication Enforced (§23)
          </p>
          <p>
            Privileged platform actions and governance logs are immutable and cryptographically audited.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-surface-canvas flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
