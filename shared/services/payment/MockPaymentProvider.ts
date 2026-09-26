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
  VirtualAccountDetails,
  UssdPaymentDetails,
} from './PaymentService';
import { PaymentSignatureVerifier, NigerianPaymentRails } from './PaymentService';

interface StoredTransaction {
  reference: string;
  jobId: string;
  amountKobo: number;
  status: 'pending' | 'successful' | 'failed' | 'refunded';
  createdAt: number;
  confirmedAt?: number;
  channel?: string;
  virtualAccount?: VirtualAccountDetails;
  ussdDetails?: UssdPaymentDetails;
  requires3DS?: boolean;
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
    const channel = options.channel || 'card';

    let virtualAccount: VirtualAccountDetails | undefined;
    let ussdDetails: UssdPaymentDetails | undefined;
    let requires3DS = false;

    // 1. Channel-specific validation and payload construction
    if (channel === 'bank_transfer') {
      // Generate dedicated dynamic NIP virtual bank account (§38)
      // 10-digit NUBAN starting with 992 (Wema / Monnify dynamic prefix)
      const randomSuffix = Math.floor(1000000 + Math.random() * 9000000).toString();
      virtualAccount = {
        bankName: 'Wema Bank / Providus',
        accountNumber: `992${randomSuffix.slice(0, 7)}`,
        accountName: `Menial Escrow / ${options.publicJobId}`,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      };
    } else if (channel === 'ussd') {
      const bankCode = options.selectedBankCode || '058';
      const bank = NigerianPaymentRails.SUPPORTED_BANKS.find((b) => b.code === bankCode) || NigerianPaymentRails.SUPPORTED_BANKS[0];
      const amountNaira = options.amountKobo / 100;
      const ussdCode = NigerianPaymentRails.generateUssdCode(bankCode, amountNaira);
      ussdDetails = {
        bankCode: bank.code,
        bankName: bank.name,
        ussdCode,
      };
    } else if (channel === 'card' && options.cardDetails) {
      const { cardNumber, expiryMonth, expiryYear, cvv } = options.cardDetails;
      if (!NigerianPaymentRails.validateCardNumber(cardNumber)) {
        return {
          success: false,
          paymentId: '',
          providerReference: '',
          checkoutUrl: '',
          amountKobo: options.amountKobo,
          currency: 'NGN',
          error: 'Invalid debit card number. Please check card digits.',
        };
      }
      if (!NigerianPaymentRails.validateCardExpiry(expiryMonth, expiryYear)) {
        return {
          success: false,
          paymentId: '',
          providerReference: '',
          checkoutUrl: '',
          amountKobo: options.amountKobo,
          currency: 'NGN',
          error: 'Card expiry date is invalid or has expired.',
        };
      }
      if (!NigerianPaymentRails.validateCvv(cvv)) {
        return {
          success: false,
          paymentId: '',
          providerReference: '',
          checkoutUrl: '',
          amountKobo: options.amountKobo,
          currency: 'NGN',
          error: 'Invalid CVV security code (3 or 4 digits required).',
        };
      }
      requires3DS = true;
    }

    this.transactions.set(reference, {
      reference,
      jobId: options.jobId,
      amountKobo: options.amountKobo,
      status: 'pending',
      createdAt: Date.now(),
      channel,
      virtualAccount,
      ussdDetails,
      requires3DS,
    });

    return {
      success: true,
      paymentId: `pay_${Date.now()}`,
      providerReference: reference,
      checkoutUrl,
      amountKobo: options.amountKobo,
      currency: 'NGN',
      channel,
      virtualAccount,
      ussdDetails,
      requires3DS,
      authUrl: requires3DS ? `https://checkout.paystack.com/3ds-challenge/${reference}` : undefined,
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

  /**
   * Submits card 3DS OTP challenge verification (§37, §39).
   */
  public async submitCardOtp(
    providerReference: string,
    otp: string
  ): Promise<{ success: boolean; error?: string }> {
    const tx = this.transactions.get(providerReference);
    if (!tx) {
      return {
        success: false,
        error: `Transaction reference ${providerReference} not found.`,
      };
    }

    if (tx.status === 'successful') {
      return { success: true };
    }

    const cleanOtp = otp.trim();
    // In mock/sandbox mode, 123456 is standard test OTP. Any non-empty 6-digit except '000000' succeeds.
    if (cleanOtp === '000000' || cleanOtp.length !== 6 || !/^\d+$/.test(cleanOtp)) {
      return {
        success: false,
        error: 'Invalid or expired 3D Secure OTP. Transaction declined by issuer bank.',
      };
    }

    tx.status = 'successful';
    tx.confirmedAt = Date.now();
    this.processedReferences.add(providerReference);

    return {
      success: true,
    };
  }

  /**
   * Queries payment status directly from payment provider (§38).
   */
  public async queryPaymentStatus(
    providerReference: string
  ): Promise<{ status: 'pending' | 'successful' | 'failed'; amountKobo: number }> {
    const tx = this.transactions.get(providerReference);
    if (!tx) {
      return { status: 'failed', amountKobo: 0 };
    }
    return {
      status: tx.status === 'refunded' ? 'successful' : tx.status,
      amountKobo: tx.amountKobo,
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
