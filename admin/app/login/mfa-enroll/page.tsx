'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAdminAuth } from '@/lib/auth/auth-context';
import { QRCodeSVG } from 'qrcode.react';
import { ShieldCheck, Copy, Check, AlertCircle, Key, RefreshCw } from 'lucide-react';

function MfaEnrollContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/admin/overview';

  const { user, enrollMfa, challengeMfa, verifyMfa } = useAdminAuth();

  const [loadingEnroll, setLoadingEnroll] = useState(true);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrUri, setQrUri] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);

  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initEnrollment = async () => {
    setLoadingEnroll(true);
    setError(null);
    try {
      const data = await enrollMfa();
      setFactorId(data.factorId);
      setQrUri(data.uri);
      setSecret(data.secret);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to initiate MFA enrollment.';
      setError(msg);
    } finally {
      setLoadingEnroll(false);
    }
  };

  useEffect(() => {
    initEnrollment();
  }, []);

  const handleCopySecret = () => {
    if (secret) {
      navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorId || code.length !== 6) {
      setError('Please enter the complete 6-digit authentication code.');
      return;
    }

    setIsVerifying(true);
    setError(null);
    try {
      // Create challenge on the new factor
      const challenge = await challengeMfa(factorId);
      // Verify code
      const result = await verifyMfa(factorId, challenge.challengeId, code.trim());

      if (!result.success) {
        setError(result.error || 'Invalid TOTP code. Please try again.');
        setIsVerifying(false);
        return;
      }

      // Success: redirect to destination
      router.push(redirectUrl);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Verification failed.';
      setError(msg);
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-canvas flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="flex justify-center items-center gap-2 mb-2">
          <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-white shadow-header">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <span className="text-3xl font-extrabold text-primary tracking-tight">menial</span>
        </div>
        <h2 className="text-center text-xl font-bold text-surface-dark tracking-tight">
          Mandatory MFA Enrollment (§23)
        </h2>
        <p className="mt-1 text-center text-sm text-surface-muted">
          Privileged administrative roles require hardware or authenticator TOTP registration
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-surface py-8 px-6 shadow-card border border-surface-border rounded-xl sm:px-10">
          {loadingEnroll ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-4">
              <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm font-medium text-surface-muted">Generating cryptographic TOTP key...</p>
            </div>
          ) : error && !qrUri ? (
            <div className="space-y-4">
              <div className="p-3.5 rounded-lg bg-error-container border border-error/20 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-error-on-container shrink-0 mt-0.5" />
                <div className="text-sm font-medium text-error-on-container">{error}</div>
              </div>
              <button
                type="button"
                onClick={initEnrollment}
                className="w-full h-11 flex justify-center items-center gap-2 rounded-lg bg-surface-canvas border border-surface-border text-sm font-semibold text-surface-dark hover:bg-surface-input"
              >
                <RefreshCw className="w-4 h-4" />
                Retry Key Generation
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {error && (
                <div className="p-3.5 rounded-lg bg-error-container border border-error/20 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-error-on-container shrink-0 mt-0.5" />
                  <div className="text-sm font-medium text-error-on-container">{error}</div>
                </div>
              )}

              {/* Step 1: Scan QR */}
              <div>
                <span className="text-xs font-bold text-primary uppercase tracking-wider">Step 1 of 2</span>
                <h3 className="text-sm font-semibold text-surface-dark mt-0.5">
                  Scan QR code with your Authenticator App
                </h3>
                <p className="text-xs text-surface-muted mt-1">
                  Use Google Authenticator, 1Password, Authy, or YubiKey Authenticator.
                </p>

                <div className="mt-4 flex justify-center p-4 bg-white border border-surface-border rounded-xl">
                  {qrUri && (
                    <QRCodeSVG
                      value={qrUri}
                      size={180}
                      level="H"
                      includeMargin={false}
                    />
                  )}
                </div>
              </div>

              {/* Step 2: Manual Key Fallback */}
              <div className="p-3 bg-surface-canvas border border-surface-border rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-surface-muted flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5" /> Manual Setup Key
                  </span>
                  <button
                    type="button"
                    onClick={handleCopySecret}
                    className="text-xs font-semibold text-primary hover:text-primary-hover flex items-center gap-1 cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-secondary" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Copy Key
                      </>
                    )}
                  </button>
                </div>
                <div className="mt-1 font-mono text-xs text-surface-dark tracking-wider select-all break-all">
                  {secret}
                </div>
              </div>

              {/* Step 3: Verification Code Form */}
              <form onSubmit={handleVerify} className="space-y-4 pt-2">
                <div>
                  <span className="text-xs font-bold text-primary uppercase tracking-wider">Step 2 of 2</span>
                  <label htmlFor="code" className="block text-sm font-semibold text-surface-dark mt-0.5">
                    Enter the 6-digit confirmation code
                  </label>
                  <input
                    id="code"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    autoComplete="one-time-code"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="mt-1.5 block w-full h-[52px] text-center font-mono text-2xl tracking-[0.4em] bg-surface-canvas border border-surface-border rounded-lg text-surface-dark focus:outline-none focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isVerifying || code.length !== 6}
                  className="w-full h-[52px] flex justify-center items-center px-4 border border-transparent rounded-lg shadow-sm text-base font-semibold text-white bg-primary hover:bg-primary-hover active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isVerifying ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Verifying &amp; Registering Key...</span>
                    </div>
                  ) : (
                    'Activate Multi-Factor Protection'
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MfaEnrollPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-surface-canvas flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <MfaEnrollContent />
    </Suspense>
  );
}
