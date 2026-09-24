/**
 * Menial Platform - Mock SMS & OTP Provider
 * 
 * Development implementation of ISmsProvider.
 * Features:
 * - Logs generated OTP to console for frictionless developer login (§9).
 * - Tracks and logs simulated SMS cost in kobo (default 400 kobo = ₦4.00 per SMS) per §5.
 * - Strict rate limiting on OTP requests and verification attempts per §43.
 * 
 * Reference: menial-master-spec-v2.md (§5, §9, §43, §85)
 */

import type {
  ISmsProvider,
  SendSmsOptions,
  SmsSendResult,
  OtpRequestResult,
  OtpVerifyResult,
} from './SmsService';

interface StoredOtp {
  code: string;
  expiresAt: number; // unix timestamp ms
  attempts: number;
}

interface RateLimitTracker {
  requestTimestamps: number[];
}

export class MockSmsProvider implements ISmsProvider {
  /** Simulated standard Nigerian SMS cost: 400 kobo = ₦4.00 per send (§5) */
  public static readonly COST_PER_SMS_KOBO = 400;

  /** Maximum OTP requests permitted in sliding window (§43) */
  public static readonly MAX_REQUESTS_PER_WINDOW = 3;

  /** Sliding window duration in milliseconds (10 minutes) */
  public static readonly RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

  /** OTP expiration duration (10 minutes) */
  public static readonly OTP_EXPIRY_MS = 10 * 60 * 1000;

  /** Maximum failed verification attempts before OTP is invalidated (§43) */
  public static readonly MAX_VERIFY_ATTEMPTS = 5;

  private totalSimulatedCostKobo: number = 0;
  private otpStore: Map<string, StoredOtp> = new Map();
  private rateLimitStore: Map<string, RateLimitTracker> = new Map();
  private isDevLoggingEnabled: boolean = true;

  constructor(options?: { enableDevLogging?: boolean }) {
    if (options?.enableDevLogging !== undefined) {
      this.isDevLoggingEnabled = options.enableDevLogging;
    }
  }

  public async sendSms(options: SendSmsOptions): Promise<SmsSendResult> {
    const normalizedPhone = this.normalizePhone(options.to);
    this.recordCost();

    if (this.isDevLoggingEnabled) {
      console.log(
        `[MockSmsProvider] 📱 SMS dispatched to ${normalizedPhone} | Cost: ₦${(MockSmsProvider.COST_PER_SMS_KOBO / 100).toFixed(2)} (${MockSmsProvider.COST_PER_SMS_KOBO} kobo) | Total simulated: ₦${(this.totalSimulatedCostKobo / 100).toFixed(2)}\nMessage: "${options.message}"`
      );
    }

    return {
      success: true,
      messageId: `mock_sms_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      simulatedCostKobo: MockSmsProvider.COST_PER_SMS_KOBO,
    };
  }

  public async requestOtp(phone: string): Promise<OtpRequestResult> {
    const normalizedPhone = this.normalizePhone(phone);
    const now = Date.now();

    // 1. Rate limiting check (§43)
    let tracker = this.rateLimitStore.get(normalizedPhone);
    if (!tracker) {
      tracker = { requestTimestamps: [] };
      this.rateLimitStore.set(normalizedPhone, tracker);
    }

    // Filter out timestamps older than the sliding window
    tracker.requestTimestamps = tracker.requestTimestamps.filter(
      (ts) => now - ts < MockSmsProvider.RATE_LIMIT_WINDOW_MS
    );

    if (tracker.requestTimestamps.length >= MockSmsProvider.MAX_REQUESTS_PER_WINDOW) {
      const oldestInWindow = tracker.requestTimestamps[0];
      const waitSeconds = Math.ceil(
        (MockSmsProvider.RATE_LIMIT_WINDOW_MS - (now - oldestInWindow)) / 1000
      );
      const waitMinutes = Math.ceil(waitSeconds / 60);

      if (this.isDevLoggingEnabled) {
        console.warn(
          `[MockSmsProvider] ⚠️ Rate limit exceeded for ${normalizedPhone}. Blocked. Retry in ${waitMinutes}m.`
        );
      }

      return {
        success: false,
        expiresAt: new Date(now).toISOString(),
        simulatedCostKobo: 0,
        rateLimitRemaining: 0,
        error: `Too many OTP requests. Please wait ${waitMinutes} minute(s) before trying again (§43).`,
      };
    }

    // 2. Generate 6-digit numeric OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = now + MockSmsProvider.OTP_EXPIRY_MS;

    this.otpStore.set(normalizedPhone, {
      code,
      expiresAt,
      attempts: 0,
    });

    tracker.requestTimestamps.push(now);
    this.recordCost();

    if (this.isDevLoggingEnabled) {
      console.log(
        `[MockSmsProvider] 🔑 [DEV OTP] Phone: ${normalizedPhone} -> CODE: [ ${code} ] | Expires in: 10m | Cost: ₦${(MockSmsProvider.COST_PER_SMS_KOBO / 100).toFixed(2)}`
      );
    }

    return {
      success: true,
      expiresAt: new Date(expiresAt).toISOString(),
      simulatedCostKobo: MockSmsProvider.COST_PER_SMS_KOBO,
      rateLimitRemaining:
        MockSmsProvider.MAX_REQUESTS_PER_WINDOW - tracker.requestTimestamps.length,
    };
  }

  public async verifyOtp(phone: string, code: string): Promise<OtpVerifyResult> {
    const normalizedPhone = this.normalizePhone(phone);
    const stored = this.otpStore.get(normalizedPhone);

    if (!stored) {
      return {
        success: false,
        error: 'No active OTP found for this phone number. Please request a new code.',
      };
    }

    const now = Date.now();
    if (now > stored.expiresAt) {
      this.otpStore.delete(normalizedPhone);
      return {
        success: false,
        error: 'The verification code has expired. Please request a new code.',
      };
    }

    stored.attempts += 1;

    if (stored.code !== code.trim()) {
      if (stored.attempts >= MockSmsProvider.MAX_VERIFY_ATTEMPTS) {
        this.otpStore.delete(normalizedPhone);
        return {
          success: false,
          error:
            'Too many incorrect attempts. For security, this code has been invalidated. Please request a new one.',
        };
      }

      const remaining = MockSmsProvider.MAX_VERIFY_ATTEMPTS - stored.attempts;
      return {
        success: false,
        error: `Incorrect verification code. ${remaining} attempt(s) remaining.`,
      };
    }

    // Success: consume code
    this.otpStore.delete(normalizedPhone);
    return { success: true };
  }

  public getTotalSimulatedCostKobo(): number {
    return this.totalSimulatedCostKobo;
  }

  /** Helper for testing */
  public reset(): void {
    this.otpStore.clear();
    this.rateLimitStore.clear();
    this.totalSimulatedCostKobo = 0;
  }

  private recordCost(): void {
    this.totalSimulatedCostKobo += MockSmsProvider.COST_PER_SMS_KOBO;
  }

  private normalizePhone(phone: string): string {
    const cleaned = phone.replace(/[\s\-()]/g, '');
    if (cleaned.startsWith('0') && cleaned.length === 11) {
      return `+234${cleaned.slice(1)}`;
    }
    if (cleaned.startsWith('234') && !cleaned.startsWith('+')) {
      return `+${cleaned}`;
    }
    return cleaned;
  }
}
