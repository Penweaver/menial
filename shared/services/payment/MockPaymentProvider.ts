/**
 * Menial Platform - Mock Payment Provider
 * 
 * Development implementation of IPaymentProvider simulating Paystack / Flutterwave.
 * Enforces:
 * - Integer kobo calculations (§4).
 * - Idempotency against duplicate webhook callbacks and replay attacks (§39).
 * - Client cannot set payment success (§37).
 * 
 * Reference: menial-master-spec-v2.md (§5, §37, §38, §39, §85)
 */

import type {
  IPaymentProvider,
  InitializePaymentOptions,
  PaymentInitializationResult,
  WebhookPayload,
  WebhookProcessingResult,
} from './PaymentService';
import { PaymentSignatureVerifier } from './PaymentService';

interface StoredTransaction {
  reference: string;
  jobId: string;
  amountKobo: number;
  status: 'pending' | 'successful' | 'failed' | 'refunded';
  createdAt: number;
  confirmedAt?: number;
}

export class MockPaymentProvider implements IPaymentProvider {
  private transactions: Map<string, StoredTransaction> = new Map();
  private processedReferences: Set<string> = new Set();
  private secretKey?: string;

  constructor(secretKey?: string) {
    this.secretKey = secretKey;
  }

  public setSecretKey(key: string): void {
    this.secretKey = key;
  }

  public async initializePayment(
    options: InitializePaymentOptions
  ): Promise<PaymentInitializationResult> {
    const reference = `mock_ref_${options.publicJobId}_${Date.now()}`;
    const checkoutUrl = `https://checkout.menial.dev/pay?ref=${reference}&amt=${options.amountKobo}`;

    this.transactions.set(reference, {
      reference,
      jobId: options.jobId,
      amountKobo: options.amountKobo,
      status: 'pending',
      createdAt: Date.now(),
    });

    return {
      success: true,
      paymentId: `pay_${Date.now()}`,
      providerReference: reference,
      checkoutUrl,
      amountKobo: options.amountKobo,
      currency: 'NGN',
    };
  }

  public async handleWebhook(
    payload: WebhookPayload,
    rawBody?: string
  ): Promise<WebhookProcessingResult> {
    const { providerReference, amountKobo, event, signature } = payload;

    // 0. Cryptographic Webhook HMAC Signature Verification (§37, §39, §89)
    if (this.secretKey) {
      const bodyToVerify = rawBody || JSON.stringify(payload);
      const isValid = PaymentSignatureVerifier.verifyPaystackSignature(
        bodyToVerify,
        signature,
        this.secretKey
      );
      if (!isValid) {
        return {
          success: false,
          error: 'Forged or invalid webhook signature. Request rejected (§89).',
        };
      }
    }

    // 1. Webhook Idempotency / Duplicate Check (§39)

    if (this.processedReferences.has(providerReference)) {
      return {
        success: true,
        isIdempotentReplay: true,
      };
    }

    const tx = this.transactions.get(providerReference);
    if (!tx) {
      return {
        success: false,
        error: `Transaction reference ${providerReference} not found in provider.`,
      };
    }

    // 2. Amount verification in kobo (§4)
    if (tx.amountKobo !== amountKobo) {
      tx.status = 'failed';
      return {
        success: false,
        error: `Amount mismatch: expected ${tx.amountKobo} kobo, got ${amountKobo} kobo.`,
      };
    }

    if (event === 'charge.success') {
      tx.status = 'successful';
      tx.confirmedAt = Date.now();
      this.processedReferences.add(providerReference);

      return {
        success: true,
        isIdempotentReplay: false,
        paymentId: `pay_confirmed_${providerReference}`,
      };
    }

    tx.status = 'failed';
    return {
      success: false,
      error: 'Charge event failed.',
    };
  }

  public async refundPayment(
    providerReference: string,
    amountKobo: number,
    _reason: string
  ): Promise<{ success: boolean; refundReference: string; error?: string }> {
    const tx = this.transactions.get(providerReference);
    if (!tx || tx.status !== 'successful') {
      return {
        success: false,
        refundReference: '',
        error: 'Only successful transactions can be refunded.',
      };
    }

    tx.status = 'refunded';
    const refundReference = `mock_rfnd_${Date.now()}`;

    return {
      success: true,
      refundReference,
    };
  }

  public getTransaction(reference: string): StoredTransaction | undefined {
    return this.transactions.get(reference);
  }

  public reset(): void {
    this.transactions.clear();
    this.processedReferences.clear();
  }
}
