'use client';

import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '@/lib/auth/auth-context';
import { KeyRound, X, AlertCircle, RefreshCw, ShieldCheck } from 'lucide-react';

interface MfaStepUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  targetSectionTitle?: string;
}

export function MfaStepUpModal({
  isOpen,
  onClose,
  onSuccess,
  targetSectionTitle = 'Privileged Operations',
}: MfaStepUpModalProps) {
  const { challengeMfa, verifyMfa } = useAdminAuth();

  const [loadingChallenge, setLoadingChallenge] = useState(false);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);

  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCode('');
      setError(null);
      initChallenge();
    }
  }, [isOpen]);

  const initChallenge = async () => {
    setLoadingChallenge(true);
    setError(null);
    try {
      const data = await challengeMfa();
      setChallengeId(data.challengeId);
      setFactorId(data.factorId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to initialize session challenge.';
      setError(msg);
    } finally {
      setLoadingChallenge(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorId || !challengeId || code.length !== 6) {
      setError('Please provide the 6-digit TOTP code.');
      return;
    }

    setIsVerifying(true);
    setError(null);
    try {
      const result = await verifyMfa(factorId, challengeId, code.trim());
      if (!result.success) {
        setError(result.error || 'Authentication code rejected. Try the next 30s token.');
        setIsVerifying(false);
        return;
      }

      setIsVerifying(false);
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Verification failed.';
      setError(msg);
      setIsVerifying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-dark/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-white border border-surface-border rounded-2xl shadow-modal overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-surface-border/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-surface-dark">
                Session Step-Up Challenge
              </h3>
              <p className="text-xs text-surface-muted">
                Mandatory TOTP Gate for {targetSectionTitle} (§23)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-surface-muted hover:text-surface-dark hover:bg-surface-canvas transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loadingChallenge ? (
            <div className="py-8 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-medium text-surface-muted">Generating cryptographic challenge...</p>
            </div>
          ) : (
            <form onSubmit={handleVerify} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-error-container border border-error/20 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-error-on-container shrink-0 mt-0.5" />
                  <span className="text-xs font-medium text-error-on-container">{error}</span>
                </div>
              )}

              <div>
                <label htmlFor="modal-totp" className="block text-xs font-bold text-surface-dark uppercase tracking-wider">
                  6-Digit Authenticator Token
                </label>
                <input
                  id="modal-totp"
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
                  className="mt-1.5 block w-full h-[52px] text-center font-mono text-2xl tracking-[0.4em] bg-surface-canvas border border-surface-border rounded-xl text-surface-dark focus:outline-none focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                />
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 h-11 flex justify-center items-center rounded-xl bg-surface-canvas border border-surface-border text-xs font-semibold text-surface-dark hover:bg-surface-input transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isVerifying || code.length !== 6}
                  className="flex-1 h-11 flex justify-center items-center gap-2 rounded-xl bg-primary text-xs font-semibold text-white hover:bg-primary-hover active:scale-98 transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {isVerifying ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Elevate Session</span>
                    </>
                  )}
                </button>
              </div>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={initChallenge}
                  className="text-[11px] text-surface-muted hover:text-surface-dark inline-flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" /> Refresh Challenge Token
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
