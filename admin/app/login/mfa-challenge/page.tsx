'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAdminAuth } from '@/lib/auth/auth-context';
import { KeyRound, AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react';

function MfaChallengeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/admin/overview';

  const { challengeMfa, verifyMfa, signOut } = useAdminAuth();

  const [loadingChallenge, setLoadingChallenge] = useState(true);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);

  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initChallenge = async () => {
    setLoadingChallenge(true);
    setError(null);
    try {
      const data = await challengeMfa();
      setChallengeId(data.challengeId);
      setFactorId(data.factorId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to initialize MFA challenge.';
      setError(msg);
    } finally {
      setLoadingChallenge(false);
    }
  };

  useEffect(() => {
    initChallenge();
  }, []);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorId || !challengeId || code.length !== 6) {
      setError('Please provide the full 6-digit authenticator code.');
      return;
    }

    setIsVerifying(true);
    setError(null);
    try {
      const result = await verifyMfa(factorId, challengeId, code.trim());

      if (!result.success) {
        setError(result.error || 'Authentication code rejected. Please try the next 30-second token.');
        setIsVerifying(false);
        return;
      }

      // Success: Proceed to requested privileged area
      router.push(redirectUrl);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Verification failed.';
      setError(msg);
      setIsVerifying(false);
    }
  };

  const handleCancel = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-surface-canvas flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex flex-col justify-center items-center mb-2">
          <img src="/logo.png" alt="menial" className="h-10 w-auto mb-2" />
        </div>
        <h2 className="text-center text-xl font-bold text-surface-dark tracking-tight">
          Session Step-Up Verification (§23)
        </h2>
        <p className="mt-1 text-center text-sm text-surface-muted">
          Enter the current 6-digit security code from your authenticator app
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-surface py-8 px-6 shadow-card border border-surface-border rounded-xl sm:px-10">
          {loadingChallenge ? (
            <div className="py-10 flex flex-col items-center justify-center space-y-4">
              <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm font-medium text-surface-muted">Initializing cryptographic challenge...</p>
            </div>
          ) : (
            <form onSubmit={handleVerify} className="space-y-5">
              {error && (
                <div className="p-3.5 rounded-lg bg-error-container border border-error/20 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-error-on-container shrink-0 mt-0.5" />
                  <div className="text-sm font-medium text-error-on-container">{error}</div>
                </div>
              )}

              <div>
                <label htmlFor="totp-code" className="block text-sm font-semibold text-surface-dark">
                  Authenticator TOTP Code
                </label>
                <input
                  id="totp-code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  autoComplete="one-time-code"
                  autoFocus
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="mt-1.5 block w-full h-[56px] text-center font-mono text-3xl tracking-[0.5em] bg-surface-canvas border border-surface-border rounded-lg text-surface-dark focus:outline-none focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isVerifying || code.length !== 6}
                  className="w-full h-[52px] flex justify-center items-center px-4 border border-transparent rounded-lg shadow-sm text-base font-semibold text-white bg-primary hover:bg-primary-hover active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isVerifying ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Verifying Session Step-Up...</span>
                    </div>
                  ) : (
                    'Verify & Elevate Session'
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between pt-2 text-xs">
                <button
                  type="button"
                  onClick={initChallenge}
                  className="text-surface-muted hover:text-surface-dark flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> New Challenge
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="text-surface-muted hover:text-error flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Sign Out
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="mt-6 text-center text-xs text-surface-muted px-4">
          <p>
            This challenge ensures that active sessions accessing financial ledgers or governance matrices have verified physical possession of the registered authenticator token.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function MfaChallengePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-surface-canvas flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <MfaChallengeContent />
    </Suspense>
  );
}
