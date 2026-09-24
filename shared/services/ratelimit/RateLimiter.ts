/**
 * Menial Marketplace — RateLimiter Service
 * Implements sliding-window rate limiting and brute-force lockout defenses
 * across authentication, OTP, job creation, and verification submissions.
 * Spec references: §5, §9, §43
 */

export interface RateLimitConfig {
  /** Maximum number of allowed actions within the sliding window */
  maxRequests: number;
  /** Duration of the sliding window in seconds */
  windowSeconds: number;
}

export interface RateLimitResult {
  /** Whether the requested action is permitted */
  allowed: boolean;
  /** Number of remaining requests allowed within the current window */
  remaining: number;
  /** Seconds until the current rate limit window completely resets */
  resetSeconds: number;
  /** If blocked, seconds to wait before attempting again */
  retryAfterSeconds?: number;
}

export interface LockoutStatus {
  isLocked: boolean;
  lockedUntil?: Date;
  remainingLockoutSeconds?: number;
}

export class RateLimiter {
  // Map of action+identifier -> array of epoch millisecond timestamps
  private records: Map<string, number[]> = new Map();
  // Map of identifier -> lockout expiration epoch milliseconds
  private lockouts: Map<string, number> = new Map();

  // Standard platform rate limit configurations
  public static readonly PRESETS = {
    // §43: Max 3 OTP requests per 15 minutes per phone number
    OTP_REQUEST: { maxRequests: 3, windowSeconds: 15 * 60 },
    // §43: Max 5 OTP verification attempts per 15 minutes per phone number
    OTP_VERIFY: { maxRequests: 5, windowSeconds: 15 * 60 },
    // §9, §43: Max 5 failed admin login attempts before 15-minute lockout
    ADMIN_LOGIN_FAILURE: { maxRequests: 5, windowSeconds: 15 * 60 },
    // Anti-spam: Max 10 job creation actions per employer per 24 hours
    JOB_CREATION: { maxRequests: 10, windowSeconds: 24 * 60 * 60 },
    // Verification spam: Max 3 document verification requests per user per 24 hours
    VERIFICATION_SUBMISSION: { maxRequests: 3, windowSeconds: 24 * 60 * 60 }
  } as const;

  /**
   * Check and record a rate limit attempt using a sliding-window algorithm.
   */
  public checkLimit(actionKey: string, identifier: string, config: RateLimitConfig): RateLimitResult {
    const key = `${actionKey}:${identifier}`;
    const now = Date.now();
    const windowMs = config.windowSeconds * 1000;
    const windowStart = now - windowMs;

    // Check if currently locked out
    const lockoutExpiry = this.lockouts.get(key);
    if (lockoutExpiry && lockoutExpiry > now) {
      const retryAfterSeconds = Math.ceil((lockoutExpiry - now) / 1000);
      return {
        allowed: false,
        remaining: 0,
        resetSeconds: retryAfterSeconds,
        retryAfterSeconds
      };
    } else if (lockoutExpiry) {
      this.lockouts.delete(key);
    }

    // Filter existing timestamps within the current sliding window
    const timestamps = (this.records.get(key) || []).filter(t => t > windowStart);

    if (timestamps.length >= config.maxRequests) {
      const oldestInWindow = timestamps[0];
      const retryAfterSeconds = Math.ceil((oldestInWindow + windowMs - now) / 1000);
      return {
        allowed: false,
        remaining: 0,
        resetSeconds: retryAfterSeconds,
        retryAfterSeconds
      };
    }

    // Record the current attempt
    timestamps.push(now);
    this.records.set(key, timestamps);

    const remaining = config.maxRequests - timestamps.length;
    const resetSeconds = Math.ceil((timestamps[0] + windowMs - now) / 1000);

    return {
      allowed: true,
      remaining,
      resetSeconds
    };
  }

  /**
   * Enforce a temporary lockout for an identifier (e.g. after exceeding failed login attempts).
   */
  public applyLockout(actionKey: string, identifier: string, lockoutDurationSeconds: number): void {
    const key = `${actionKey}:${identifier}`;
    const expiry = Date.now() + lockoutDurationSeconds * 1000;
    this.lockouts.set(key, expiry);
  }

  /**
   * Check whether an identifier is currently locked out.
   */
  public getLockoutStatus(actionKey: string, identifier: string): LockoutStatus {
    const key = `${actionKey}:${identifier}`;
    const now = Date.now();
    const expiry = this.lockouts.get(key);

    if (expiry && expiry > now) {
      return {
        isLocked: true,
        lockedUntil: new Date(expiry),
        remainingLockoutSeconds: Math.ceil((expiry - now) / 1000)
      };
    }

    if (expiry) {
      this.lockouts.delete(key);
    }

    return { isLocked: false };
  }

  /**
   * Reset rate limit counts and lockouts for an identifier (e.g. upon successful authentication).
   */
  public reset(actionKey: string, identifier: string): void {
    const key = `${actionKey}:${identifier}`;
    this.records.delete(key);
    this.lockouts.delete(key);
  }

  /**
   * Clear all records (useful for test resets).
   */
  public clear(): void {
    this.records.clear();
    this.lockouts.clear();
  }
}

// Export singleton instance for platform-wide reuse
export const defaultRateLimiter = new RateLimiter();
