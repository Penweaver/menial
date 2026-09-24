/**
 * Menial Platform - Authentication Service
 * 
 * Handles authentication flows for:
 * 1. Marketplace Users (Phone-first OTP login & registration per §9)
 * 2. Administrative Users (Email & Password + mandatory MFA for Superadmin and Finance Admin per §9, §23)
 * 
 * Reference: menial-master-spec-v2.md (§9, §23, §43, §85)
 */

import type { ISmsProvider } from '../sms/SmsService';
import type { UserAccountType } from '../../types/enums';

export interface PhoneAuthSession {
  userId: string;
  phone: string;
  accountType?: UserAccountType;
  token: string;
  expiresAt: string;
}

export interface AdminAuthSession {
  adminId: string;
  userId: string;
  email: string;
  isSuperadmin: boolean;
  status: string;
  permissions: string[];
  mfaEnrolled: boolean;
  mfaVerified: boolean;
  token: string;
  lastActiveAt: number;
  sessionTimeoutHours: number;
}

export interface LoginAttemptTracker {
  attempts: number;
  lockedUntil?: number;
}

export class AuthService {
  /** Maximum consecutive failed password attempts before lockout (§43) */
  public static readonly MAX_LOGIN_ATTEMPTS = 5;

  /** Lockout duration after exceeding login attempts (15 minutes) */
  public static readonly LOCKOUT_DURATION_MS = 15 * 60 * 1000;

  /** Default session idle timeout for Admin/Superadmin in hours (§23, §66) */
  public static readonly DEFAULT_ADMIN_SESSION_HOURS = 12;

  private smsProvider: ISmsProvider;
  private loginAttempts: Map<string, LoginAttemptTracker> = new Map();

  constructor(smsProvider: ISmsProvider) {
    this.smsProvider = smsProvider;
  }

  // ==========================================================================
  // 1. Marketplace Users: Phone-First Auth (§9)
  // ==========================================================================

  /**
   * Dispatches a one-time passcode to the user's phone.
   */
  public async sendOtp(phone: string): Promise<{ success: boolean; error?: string }> {
    const result = await this.smsProvider.requestOtp(phone);
    if (!result.success) {
      return { success: false, error: result.error };
    }
    return { success: true };
  }

  /**
   * Verifies the OTP. In production, upon successful verification, this resolves
   * or creates the user session in Supabase Auth.
   */
  public async verifyOtpAndAuthenticate(
    phone: string,
    code: string,
    accountType?: UserAccountType
  ): Promise<{ success: boolean; session?: PhoneAuthSession; error?: string }> {
    const verifyResult = await this.smsProvider.verifyOtp(phone, code);
    if (!verifyResult.success) {
      return { success: false, error: verifyResult.error };
    }

    // Return authenticated session representation
    const session: PhoneAuthSession = {
      userId: `user_phone_${phone.replace(/\+/g, '')}`,
      phone,
      accountType,
      token: `mock_jwt_session_${Date.now()}`,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30-day mobile session
    };

    return { success: true, session };
  }

  // ==========================================================================
  // 2. Administrative Users: Email/Password & Session Validation (§9, §23)
  // ==========================================================================

  /**
   * Evaluates whether an admin email is currently locked out due to brute-force protection (§43).
   */
  public checkLoginRateLimit(identifier: string): { isLocked: boolean; waitSeconds?: number } {
    const tracker = this.loginAttempts.get(identifier.toLowerCase());
    if (!tracker || !tracker.lockedUntil) {
      return { isLocked: false };
    }

    const now = Date.now();
    if (now < tracker.lockedUntil) {
      const waitSeconds = Math.ceil((tracker.lockedUntil - now) / 1000);
      return { isLocked: true, waitSeconds };
    }

    // Lock expired
    this.loginAttempts.delete(identifier.toLowerCase());
    return { isLocked: false };
  }

  /**
   * Records a failed login attempt. Triggers temporary lockout if threshold is exceeded.
   */
  public recordFailedAttempt(identifier: string): { locked: boolean; remainingAttempts: number } {
    const key = identifier.toLowerCase();
    let tracker = this.loginAttempts.get(key);
    if (!tracker) {
      tracker = { attempts: 0 };
      this.loginAttempts.set(key, tracker);
    }

    tracker.attempts += 1;

    if (tracker.attempts >= AuthService.MAX_LOGIN_ATTEMPTS) {
      tracker.lockedUntil = Date.now() + AuthService.LOCKOUT_DURATION_MS;
      return { locked: true, remainingAttempts: 0 };
    }

    return {
      locked: false,
      remainingAttempts: AuthService.MAX_LOGIN_ATTEMPTS - tracker.attempts,
    };
  }

  /**
   * Resets failed login attempt counter upon successful password verification.
   */
  public resetFailedAttempts(identifier: string): void {
    this.loginAttempts.delete(identifier.toLowerCase());
  }

  /**
   * Checks whether an admin session has exceeded the idle timeout (§23).
   */
  public isSessionExpired(session: AdminAuthSession): boolean {
    const timeoutMs = (session.sessionTimeoutHours || AuthService.DEFAULT_ADMIN_SESSION_HOURS) * 3600 * 1000;
    const idleDuration = Date.now() - session.lastActiveAt;
    return idleDuration > timeoutMs;
  }

  /**
   * Checks whether the given administrative user is required to present MFA per §23:
   * - Superadmin: MANDATORY (no exceptions)
   * - Finance Admin: MANDATORY
   * - Other admins: OPTIONAL
   */
  public isMfaRequired(isSuperadmin: boolean, permissions: string[]): boolean {
    if (isSuperadmin) return true;
    return permissions.includes('finance');
  }
}
