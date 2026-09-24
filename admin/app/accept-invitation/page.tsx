'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseBrowserClient, toDatabaseClient } from '@/lib/supabase/client';
import { AdminService } from '@shared/services/admin/AdminService';
import { ShieldCheck, Lock, Key, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

function AcceptInvitationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialToken = searchParams.get('token') || '';

  const [token, setToken] = useState(initialToken);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState<'details' | 'mfa' | 'complete'>('details');

  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrUri, setQrUri] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = getSupabaseBrowserClient();

  useEffect(() => {
    if (initialToken) {
      setToken(initialToken);
    }
  }, [initialToken]);

  const handleStartSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token || token.trim().length !== 64) {
      setError('Please provide a valid 64-character administrative invitation token.');
      return;
    }

    if (password.length < 8) {
      setError('Password must contain at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      // Step 1: Enroll TOTP MFA factor with Supabase Auth
      const { data: enrollData, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        issuer: 'Menial Admin',
      });

      if (enrollError || !enrollData || enrollData.type !== 'totp') {
        throw new Error(enrollError?.message || 'Failed to initialize MFA key.');
      }

      setFactorId(enrollData.id);
      setQrUri(enrollData.totp.uri);
      setSecret(enrollData.totp.secret);
      setStep('mfa');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to process setup.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteActivation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorId || totpCode.length !== 6) {
      setError('Please enter the 6-digit confirmation code.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      // Step 2: Create challenge and verify TOTP code
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      });

      if (challengeError || !challengeData) {
        throw new Error(challengeError?.message || 'MFA challenge failed.');
      }

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code: totpCode.trim(),
      });

      if (verifyError) {
        throw new Error(verifyError.message || 'Invalid confirmation code.');
      }

      // Step 3: Call accept_admin_invitation RPC strictly requiring mfaEnrolled: true (§23)
      const adminService = new AdminService(toDatabaseClient(supabase));
      await adminService.acceptInvitation({
        invitationToken: token.trim(),
        mfaEnrolled: true,
      });

      // Update password for user
      await supabase.auth.updateUser({ password });

      setStep('complete');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Activation failed.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-canvas flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="flex justify-center items-center gap-2 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-header">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <span className="text-3xl font-extrabold text-primary tracking-tight">menial</span>
        </div>
        <h2 className="text-center text-xl font-bold text-surface-dark tracking-tight">
          Admin Invitation Activation
        </h2>
        <p className="mt-1 text-center text-sm text-surface-muted">
          72-Hour Administrative Onboarding &amp; Security Registration (§17, §23)
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-surface py-8 px-6 shadow-card border border-surface-border rounded-xl sm:px-10">
          {error && (
            <div className="mb-5 p-3.5 rounded-lg bg-error-container border border-error/20 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-error-on-container shrink-0 mt-0.5" />
              <div className="text-sm font-medium text-error-on-container">{error}</div>
            </div>
          )}

          {step === 'details' && (
            <form onSubmit={handleStartSetup} className="space-y-4">
              <div>
                <label htmlFor="token" className="block text-sm font-semibold text-surface-dark">
                  64-Character Invitation Token
                </label>
                <div className="mt-1.5 relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-surface-muted">
                    <Key className="h-4 w-4" />
                  </div>
                  <input
                    id="token"
                    type="text"
                    required
                    value={token}
                    onChange={(e) => setToken(e.target.value.trim())}
                    placeholder="Paste 64-hex invitation token"
                    className="block w-full h-[50px] pl-10 pr-3.5 font-mono text-xs bg-surface-canvas border border-surface-border rounded-lg text-surface-dark focus:outline-none focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="pass" className="block text-sm font-semibold text-surface-dark">
                  Create Admin Password
                </label>
                <div className="mt-1.5 relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-surface-muted">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    id="pass"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="block w-full h-[50px] pl-10 pr-3.5 bg-surface-canvas border border-surface-border rounded-lg text-surface-dark focus:outline-none focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="cpass" className="block text-sm font-semibold text-surface-dark">
                  Confirm Password
                </label>
                <div className="mt-1.5 relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-surface-muted">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    id="cpass"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className="block w-full h-[50px] pl-10 pr-3.5 bg-surface-canvas border border-surface-border rounded-lg text-surface-dark focus:outline-none focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-[52px] flex justify-center items-center px-4 border border-transparent rounded-lg shadow-sm text-base font-semibold text-white bg-primary hover:bg-primary-hover active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isLoading ? 'Validating Token...' : 'Proceed to Mandatory MFA Setup →'}
                </button>
              </div>
            </form>
          )}

          {step === 'mfa' && (
            <form onSubmit={handleCompleteActivation} className="space-y-5">
              <div>
                <span className="text-xs font-bold text-primary uppercase tracking-wider">Mandatory MFA</span>
                <h3 className="text-sm font-semibold text-surface-dark mt-0.5">
                  Scan QR code with your Authenticator App
                </h3>
                <p className="text-xs text-surface-muted mt-1">
                  MFA enrollment is mandatory before an invited administrator can reach active status (§23).
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

                <div className="mt-3 p-2.5 bg-surface-canvas rounded-lg border border-surface-border font-mono text-xs text-center text-surface-muted select-all break-all">
                  Key: {secret}
                </div>
              </div>

              <div>
                <label htmlFor="totp" className="block text-sm font-semibold text-surface-dark">
                  6-Digit Authenticator Code
                </label>
                <input
                  id="totp"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  required
                  autoFocus
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="mt-1.5 block w-full h-[52px] text-center font-mono text-2xl tracking-[0.4em] bg-surface-canvas border border-surface-border rounded-lg text-surface-dark focus:outline-none focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || totpCode.length !== 6}
                className="w-full h-[52px] flex justify-center items-center px-4 border border-transparent rounded-lg shadow-sm text-base font-semibold text-white bg-primary hover:bg-primary-hover active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? 'Activating Account...' : 'Complete Registration & Activate Account'}
              </button>
            </form>
          )}

          {step === 'complete' && (
            <div className="text-center py-6 space-y-4">
              <div className="w-12 h-12 rounded-full bg-secondary-container text-secondary-on-container flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-surface-dark">Account Successfully Activated!</h3>
              <p className="text-sm text-surface-muted max-w-sm mx-auto">
                Your administrator profile is now active with hardware-backed Multi-Factor Protection enabled.
              </p>
              <button
                type="button"
                onClick={() => router.push('/admin/overview')}
                className="w-full h-[50px] flex justify-center items-center gap-2 rounded-lg bg-primary text-white font-semibold hover:bg-primary-hover active:scale-98 transition-all"
              >
                Enter Admin Console <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-surface-canvas flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <AcceptInvitationContent />
    </Suspense>
  );
}
