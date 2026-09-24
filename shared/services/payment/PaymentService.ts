import * as crypto from 'crypto';

export class PaymentSignatureVerifier {
  /**
   * Cryptographically verifies Paystack/Flutterwave HMAC-SHA512 signature using timing-safe comparison.
   * Defends against forged webhook calls (§37, §39, §89).
   */
  public static verifyPaystackSignature(
    rawBody: string,
    signatureHeader: string | undefined,
    secretKey: string
  ): boolean {
    if (!signatureHeader || !rawBody || !secretKey) {
      return false;
    }
    const hash = crypto
      .createHmac('sha512', secretKey)
      .update(rawBody)
      .digest('hex');

    try {
      const hashBuffer = Buffer.from(hash, 'utf8');
      const sigBuffer = Buffer.from(signatureHeader, 'utf8');
      if (hashBuffer.length !== sigBuffer.length) {
        return false;
      }
      return crypto.timingSafeEqual(hashBuffer, sigBuffer);
    } catch {
      return false;
    }
  }
}

export interface InitializePaymentOptions {
  jobId: string;
  publicJobId: string;
  amountKobo: number;     // Integer kobo (§4)
  employerEmail: string;
  employerPhone: string;
  callbackUrl?: string;
}

export interface PaymentInitializationResult {
  success: boolean;
  paymentId: string;
  providerReference: string;
  checkoutUrl: string;
  amountKobo: number;
  currency: 'NGN';
  error?: string;
}

export interface WebhookPayload {
  event: 'charge.success' | 'charge.failed';
  providerReference: string;
  amountKobo: number;
  currency: 'NGN';
  customerEmail?: string;
  metadata?: Record<string, unknown>;
  signature?: string;
}

export interface WebhookProcessingResult {
  success: boolean;
  isIdempotentReplay?: boolean;
  paymentId?: string;
  error?: string;
}

export interface IPaymentProvider {
  /**
   * Initializes an escrow payment session with external provider (Paystack/Flutterwave).
   */
  initializePayment(options: InitializePaymentOptions): Promise<PaymentInitializationResult>;

  /**
   * Validates and confirms an incoming webhook payload.
   * Client cannot set payment success (§37).
   */
  handleWebhook(payload: WebhookPayload): Promise<WebhookProcessingResult>;

  /**
   * Reverses an escrow deposit via refund.
   */
  refundPayment(
    providerReference: string,
    amountKobo: number,
    reason: string
  ): Promise<{ success: boolean; refundReference: string; error?: string }>;
}
