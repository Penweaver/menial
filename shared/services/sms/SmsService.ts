/**
 * Menial Platform - SMS & OTP Service Interface
 * 
 * Abstract interface for SMS delivery and Phone OTP verification.
 * Designed to seamlessly swap between MockSmsProvider (dev), Termii, and Africa's Talking (prod).
 * Reference: menial-master-spec-v2.md (§5, §9, §43, §85)
 */

export interface SendSmsOptions {
  to: string; // E.164 phone format or local Nigerian format (e.g. +234XXXXXXXXXX)
  message: string;
}

export interface SmsSendResult {
  success: boolean;
  messageId: string;
  simulatedCostKobo?: number; // Cost tracking in kobo per §5
  error?: string;
}

export interface OtpRequestResult {
  success: boolean;
  expiresAt: string; // ISO timestamp
  simulatedCostKobo: number;
  error?: string;
  rateLimitRemaining?: number;
}

export interface OtpVerifyResult {
  success: boolean;
  error?: string;
}

export interface ISmsProvider {
  /**
   * Sends an outbound transactional SMS.
   */
  sendSms(options: SendSmsOptions): Promise<SmsSendResult>;

  /**
   * Generates and dispatches a phone verification OTP code.
   * Enforces rate limiting per §43.
   */
  requestOtp(phone: string): Promise<OtpRequestResult>;

  /**
   * Verifies an entered OTP code against the phone number.
   * Prevents brute-force via attempt counters.
   */
  verifyOtp(phone: string, code: string): Promise<OtpVerifyResult>;

  /**
   * Returns aggregated simulated SMS expenditure in kobo.
   */
  getTotalSimulatedCostKobo(): number;
}
