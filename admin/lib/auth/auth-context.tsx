'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import { getSupabaseBrowserClient, toDatabaseClient } from '../supabase/client';
import { getAdminUserContext, type AdminUserContext } from './admin-auth';
import { AdminService } from '@shared/services/admin/AdminService';

interface LoginResult {
  success: boolean;
  requiresMfaEnroll?: boolean;
  requiresMfaChallenge?: boolean;
  error?: string;
}

interface AuthContextType {
  user: User | null;
  adminContext: AdminUserContext | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  enrollMfa: () => Promise<{ factorId: string; qrCode: string; secret: string; uri: string }>;
  challengeMfa: (factorId?: string) => Promise<{ challengeId: string; factorId: string }>;
  verifyMfa: (factorId: string, challengeId: string, code: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refreshAdminContext: () => Promise<AdminUserContext | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [adminContext, setAdminContext] = useState<AdminUserContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = getSupabaseBrowserClient();

  const refreshAdminContext = useCallback(async (): Promise<AdminUserContext | null> => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);
      if (!currentUser) {
        setAdminContext(null);
        return null;
      }

      const context = await getAdminUserContext(supabase, currentUser);
      setAdminContext(context);
      return context;
    } catch (err) {
      console.error('Failed to resolve admin context:', err);
      setAdminContext(null);
      return null;
    }
  }, [supabase]);

  useEffect(() => {
    let mounted = true;

    async function init() {
      setIsLoading(true);
      await refreshAdminContext();
      if (mounted) {
        setIsLoading(false);
      }
    }

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setAdminContext(null);
        setIsLoading(false);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        await refreshAdminContext();
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, refreshAdminContext]);

  const login = async (email: string, password: string): Promise<LoginResult> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.user) {
        setIsLoading(false);
        return { success: false, error: error?.message || 'Invalid email or password.' };
      }

      // Verify administrative credentials via RPC
      const adminService = new AdminService(toDatabaseClient(supabase));
      const access = await adminService.getAdminAccess(data.user.id);

      if (!access.isAdmin || access.status !== 'active') {
        await supabase.auth.signOut();
        setIsLoading(false);
        return {
          success: false,
          error: access.status === 'suspended'
            ? 'Account is suspended (§17). Contact Superadmin.'
            : access.status === 'deactivated'
            ? 'Account has been deactivated (§17).'
            : 'Access denied: User does not possess administrative privileges.',
        };
      }

      // Evaluate MFA Requirements (§23)
      // Mandatory for Superadmin or Finance Admin
      const requiresMandatoryMfa = access.isSuperadmin || access.permissions.includes('finance');

      if (requiresMandatoryMfa && !access.mfaEnrolled) {
        setUser(data.user);
        setIsLoading(false);
        return { success: true, requiresMfaEnroll: true };
      }

      // If user has MFA enrolled, check session assurance level
      if (access.mfaEnrolled) {
        const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (aalData && aalData.currentLevel !== 'aal2') {
          setUser(data.user);
          setIsLoading(false);
          return { success: true, requiresMfaChallenge: true };
        }
      }

      // Fully authenticated with appropriate assurance level
      await refreshAdminContext();
      setIsLoading(false);
      return { success: true };
    } catch (err: unknown) {
      setIsLoading(false);
      const message = err instanceof Error ? err.message : 'An unexpected error occurred during login.';
      return { success: false, error: message };
    }
  };

  const enrollMfa = async () => {
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      issuer: 'Menial Admin',
    });

    if (error || !data || data.type !== 'totp') {
      throw new Error(`Failed to initiate MFA enrollment: ${error?.message || 'Unknown error'}`);
    }

    return {
      factorId: data.id,
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
      uri: data.totp.uri,
    };
  };

  const challengeMfa = async (factorId?: string) => {
    let targetFactorId = factorId;

    if (!targetFactorId) {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error || !data.totp || data.totp.length === 0) {
        throw new Error('No enrolled TOTP factor found for this administrator account.');
      }
      const verifiedFactor = data.totp.find((f) => f.status === 'verified') || data.totp[0];
      targetFactorId = verifiedFactor.id;
    }

    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId: targetFactorId,
    });

    if (challengeError || !challengeData) {
      throw new Error(`Failed to create MFA challenge: ${challengeError?.message || 'Unknown error'}`);
    }

    return {
      challengeId: challengeData.id,
      factorId: targetFactorId,
    };
  };

  const verifyMfa = async (factorId: string, challengeId: string, code: string) => {
    const { error } = await supabase.auth.mfa.verify({
      factorId,
      challengeId,
      code,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    await refreshAdminContext();
    return { success: true };
  };

  const signOut = async () => {
    setIsLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setAdminContext(null);
    setIsLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        adminContext,
        isLoading,
        login,
        enrollMfa,
        challengeMfa,
        verifyMfa,
        signOut,
        refreshAdminContext,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AuthProvider');
  }
  return context;
}
