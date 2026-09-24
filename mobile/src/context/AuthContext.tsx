import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ApiService } from '../services/api';
import { StorageService } from '../services/storage';
import type { PhoneAuthSession } from '@shared/services/auth/AuthService';
import type { UserAccountType } from '@shared/types/enums';

export interface RateLimitState {
  isLocked: boolean;
  lockoutUntil: number | null;
  message: string | null;
}

interface AuthContextType {
  session: PhoneAuthSession | null;
  activeRole: UserAccountType | null;
  isLoading: boolean;
  rateLimitState: RateLimitState;
  requestOtp: (phone: string) => Promise<{ success: boolean; error?: string }>;
  verifyOtp: (
    phone: string,
    code: string,
    accountType?: UserAccountType
  ) => Promise<{ success: boolean; error?: string }>;
  selectRole: (role: UserAccountType) => Promise<void>;
  loginAsDemo: (role: UserAccountType) => Promise<void>;
  loginWithSocial: (
    provider: 'google' | 'facebook' | 'linkedin',
    accountType?: UserAccountType
  ) => Promise<{ success: boolean; error?: string }>;
  loginWithEmail: (
    email: string,
    password: string,
    accountType?: UserAccountType
  ) => Promise<{ success: boolean; error?: string }>;
  registerWithEmail: (
    email: string,
    password: string,
    fullName: string,
    accountType?: UserAccountType
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  deleteAccount: (reason?: string) => Promise<{ success: boolean; error?: string }>;
  formatPhoneNumber: (raw: string) => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<PhoneAuthSession | null>(null);
  const [activeRole, setActiveRole] = useState<UserAccountType | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [rateLimitState, setRateLimitState] = useState<RateLimitState>({
    isLocked: false,
    lockoutUntil: null,
    message: null,
  });

  // Helper to format Nigerian phone numbers into E.164 (+234...)
  const formatPhoneNumber = useCallback((raw: string): string => {
    const cleaned = raw.replace(/\D/g, '');
    if (cleaned.startsWith('234')) {
      return `+${cleaned}`;
    }
    if (cleaned.startsWith('0')) {
      return `+234${cleaned.substring(1)}`;
    }
    if (cleaned.length === 10) {
      return `+234${cleaned}`;
    }
    return `+${cleaned}`;
  }, []);

  // Restore authenticated session and role on app boot from encrypted SecureStore
  useEffect(() => {
    let isMounted = true;
    async function restoreSession() {
      try {
        const storedSession = await StorageService.getAuthSession();
        const storedRole = await StorageService.getActiveRole();

        if (isMounted) {
          if (storedSession) {
            setSession(storedSession);
          }
          if (storedRole) {
            setActiveRole(storedRole);
          } else if (storedSession?.accountType) {
            setActiveRole(storedSession.accountType);
          }
        }
      } catch (err) {
        console.error('[AuthContext] Failed to restore session from SecureStore:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    restoreSession();
    return () => {
      isMounted = false;
    };
  }, []);

  // Check rate limit timer expiration
  useEffect(() => {
    if (!rateLimitState.isLocked || !rateLimitState.lockoutUntil) return;

    const interval = setInterval(() => {
      if (Date.now() >= rateLimitState.lockoutUntil!) {
        setRateLimitState({
          isLocked: false,
          lockoutUntil: null,
          message: null,
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [rateLimitState]);

  const requestOtp = useCallback(
    async (phone: string): Promise<{ success: boolean; error?: string }> => {
      const formatted = formatPhoneNumber(phone);

      // Check client-side rate limit lock
      if (rateLimitState.isLocked && rateLimitState.lockoutUntil && Date.now() < rateLimitState.lockoutUntil) {
        const waitMinutes = Math.ceil((rateLimitState.lockoutUntil - Date.now()) / 60000);
        return {
          success: false,
          error: `Rate limit active. Please wait ${waitMinutes} minute(s) before trying again (§43).`,
        };
      }

      const res = await ApiService.requestPhoneOtp(formatted);

      if (!res.success) {
        if (res.isRateLimited) {
          // Lock for 10 minutes (600,000 ms) per MockSmsProvider / Section 43
          const lockoutUntil = Date.now() + 10 * 60 * 1000;
          setRateLimitState({
            isLocked: true,
            lockoutUntil,
            message: res.error || 'Too many OTP requests. Please wait 10 minutes before retrying (§43).',
          });
        }
        return { success: false, error: res.error };
      }

      return { success: true };
    },
    [formatPhoneNumber, rateLimitState]
  );

  const verifyOtp = useCallback(
    async (
      phone: string,
      code: string,
      accountType?: UserAccountType
    ): Promise<{ success: boolean; error?: string }> => {
      const formatted = formatPhoneNumber(phone);
      const res = await ApiService.verifyPhoneOtp(formatted, code, accountType);

      if (!res.success || !res.session) {
        return { success: false, error: res.error || 'Verification failed.' };
      }

      // Persist session to encrypted SecureStore
      await StorageService.saveAuthSession(res.session);
      setSession(res.session);

      if (accountType) {
        await StorageService.saveActiveRole(accountType);
        setActiveRole(accountType);
      }

      return { success: true };
    },
    [formatPhoneNumber]
  );

  const selectRole = useCallback(async (role: UserAccountType): Promise<void> => {
    await StorageService.saveActiveRole(role);
    setActiveRole(role);
    if (session) {
      const updatedSession = { ...session, accountType: role };
      await StorageService.saveAuthSession(updatedSession);
      setSession(updatedSession);
    }
  }, [session]);

  const loginAsDemo = useCallback(async (role: UserAccountType): Promise<void> => {
    const demoSession: PhoneAuthSession = {
      userId: `demo_${role}_001`,
      phone: role === 'employer' ? '+2348011112222' : '+2348033334444',
      token: `demo_token_${Date.now()}`,
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      accountType: role,
    };
    await StorageService.saveAuthSession(demoSession);
    await StorageService.saveActiveRole(role);
    setSession(demoSession);
    setActiveRole(role);
  }, []);

  const loginWithSocial = useCallback(
    async (
      provider: 'google' | 'facebook' | 'linkedin',
      accountType: UserAccountType = 'employer'
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        const socialSession: PhoneAuthSession = {
          userId: `${provider}_user_${Date.now()}`,
          phone: '+2348000000000',
          token: `${provider}_oauth_${Date.now()}`,
          expiresAt: new Date(Date.now() + 86400000 * 30).toISOString(),
          accountType,
        };
        await StorageService.saveAuthSession(socialSession);
        await StorageService.saveActiveRole(accountType);
        setSession(socialSession);
        setActiveRole(accountType);
        return { success: true };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : `Failed to sign in with ${provider}`,
        };
      }
    },
    []
  );

  const loginWithEmail = useCallback(
    async (
      email: string,
      password: string,
      accountType: UserAccountType = 'employer'
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        if (!email.includes('@')) {
          return { success: false, error: 'Please enter a valid email address.' };
        }
        if (password.length < 6) {
          return { success: false, error: 'Password must be at least 6 characters.' };
        }
        const emailSession: PhoneAuthSession = {
          userId: `email_${Date.now()}`,
          phone: '+2348000000000',
          token: `email_jwt_${Date.now()}`,
          expiresAt: new Date(Date.now() + 86400000 * 14).toISOString(),
          accountType,
        };
        await StorageService.saveAuthSession(emailSession);
        await StorageService.saveActiveRole(accountType);
        setSession(emailSession);
        setActiveRole(accountType);
        return { success: true };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Email authentication failed.',
        };
      }
    },
    []
  );

  const registerWithEmail = useCallback(
    async (
      email: string,
      password: string,
      fullName: string,
      accountType: UserAccountType = 'employer'
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        if (!fullName.trim()) {
          return { success: false, error: 'Please enter your full legal name.' };
        }
        if (!email.includes('@')) {
          return { success: false, error: 'Please enter a valid email address.' };
        }
        if (password.length < 6) {
          return { success: false, error: 'Password must be at least 6 characters.' };
        }
        const emailSession: PhoneAuthSession = {
          userId: `user_${Date.now()}`,
          phone: '+2348000000000',
          token: `register_jwt_${Date.now()}`,
          expiresAt: new Date(Date.now() + 86400000 * 14).toISOString(),
          accountType,
        };
        await StorageService.saveAuthSession(emailSession);
        await StorageService.saveActiveRole(accountType);
        setSession(emailSession);
        setActiveRole(accountType);
        return { success: true };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Registration failed.',
        };
      }
    },
    []
  );

  const logout = useCallback(async (): Promise<void> => {
    await StorageService.clearAuthSession();
    await StorageService.clearActiveRole();
    setSession(null);
    setActiveRole(null);
  }, []);

  const deleteAccount = useCallback(
    async (reason?: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const userId = session?.userId || 'worker_adebayo';
        const res = await ApiService.deleteWorkerAccount(userId, reason);
        if (!res.success) {
          return res;
        }
        await logout();
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message || 'Account deletion failed.' };
      }
    },
    [session, logout]
  );

  return (
    <AuthContext.Provider
      value={{
        session,
        activeRole,
        isLoading,
        rateLimitState,
        requestOtp,
        verifyOtp,
        selectRole,
        loginAsDemo,
        loginWithSocial,
        loginWithEmail,
        registerWithEmail,
        logout,
        deleteAccount,
        formatPhoneNumber,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
