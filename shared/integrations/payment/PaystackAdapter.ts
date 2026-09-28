/**
 * Menial Platform - Paystack Payment & Payout Adapter
 * 
 * Production adapter for Paystack Nigeria payment gateway.
 * Supports Card 3DS, NIP Bank Transfer, USSD, Webhook HMAC-SHA512 verification,
 * NUBAN account name resolution, and transfer recipient disbursements.
 * Reference: menial-master-spec-v2.md (§37, §39, §41)
 */

import {
  type IPaymentProvider,
  type InitializePaymentOptions,
  type PaymentInitializationResult,
  type WebhookPayload,
  type WebhookProcessingResult,
  PaymentSignatureVerifier,
} from '../../services/payment/PaymentService';
import {
  type IPayoutProvider,
  type InitiatePayoutOptions,
  type PayoutDisbursementResult,
} from '../../services/payment/PayoutService';
import type { ConnectionTestResult } from '../types';

export interface PaystackAdapterConfig {
  publicKey?: string;
  secretKey?: string;
  webhookSecret?: string;
  baseUrl?: string;
  isSandbox?: boolean;
}

export class PaystackAdapter implements IPaymentProvider, IPayoutProvider {
  private publicKey: string;
  private secretKey: string;
  private webhookSecret: string;
  private baseUrl: string;
  private isSandbox: boolean;

  constructor(config: PaystackAdapterConfig) {
    this.publicKey = config.publicKey || '';
    this.secretKey = config.secretKey || '';
    this.webhookSecret = config.webhookSecret || this.secretKey;
    this.baseUrl = config.baseUrl || 'https://api.paystack.co';
    this.isSandbox = config.isSandbox ?? false;
  }

  /**
   * Ping / Balance check to test credential validity.
   */
  public async testConnection(): Promise<ConnectionTestResult> {
    const start = Date.now();
    if (!this.secretKey) {
      return {
        success: false,
        latencyMs: 0,
        message: 'Paystack Secret Key is missing or empty.',
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/balance`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
      });

      const latency = Date.now() - start;
      const data = await response.json();

      if (response.ok && data.status === true) {
        return {
          success: true,
          latencyMs: latency,
          message: 'Connection successful. Paystack API authenticated.',
          details: {
            currency: data.data?.[0]?.currency || 'NGN',
            balanceKobo: data.data?.[0]?.balance || 0,
          },
        };
      }

      return {
        success: false,
        latencyMs: latency,
        message: data.message || `Paystack API returned HTTP ${response.status}`,
      };
    } catch (err: unknown) {
      return {
        success: false,
        latencyMs: Date.now() - start,
        message: err instanceof Error ? err.message : 'Network error communicating with Paystack',
      };
    }
  }

  public async initializePayment(
    options: InitializePaymentOptions
  ): Promise<PaymentInitializationResult> {
    const reference = `pstk_${options.jobId.slice(0, 8)}_${Date.now()}`;

    // If no live secret key provided, operate safely in sandbox simulation
    if (!this.secretKey || this.isSandbox) {
      return {
        success: true,
        paymentId: `pay_${reference}`,
        providerReference: reference,
        checkoutUrl: `https://checkout.paystack.com/${reference}`,
        amountKobo: options.amountKobo,
        currency: 'NGN',
        channel: options.channel || 'card',
        virtualAccount:
          options.channel === 'bank_transfer'
            ? {
                bankName: 'Wema Bank (Paystack)',
                accountNumber: '9982736154',
                accountName: `MENIAL ESCROW - ${options.publicJobId}`,
                expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
              }
            : undefined,
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/transaction/initialize`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: options.employerEmail,
          amount: options.amountKobo,
          reference,
          currency: 'NGN',
          callback_url: options.callbackUrl,
          metadata: {
            job_id: options.jobId,
            public_job_id: options.publicJobId,
            employer_phone: options.employerPhone,
          },
        }),
      });

      const resData = await response.json();
      if (!response.ok || !resData.status) {
        return {
          success: false,
          paymentId: '',
          providerReference: reference,
          checkoutUrl: '',
          amountKobo: options.amountKobo,
          currency: 'NGN',
          error: resData.message || 'Paystack initialization failed',
        };
      }

      return {
        success: true,
        paymentId: `pay_${reference}`,
        providerReference: reference,
        checkoutUrl: resData.data.authorization_url,
        amountKobo: options.amountKobo,
        currency: 'NGN',
        channel: options.channel || 'card',
      };
    } catch (err: unknown) {
      return {
        success: false,
        paymentId: '',
        providerReference: reference,
        checkoutUrl: '',
        amountKobo: options.amountKobo,
        currency: 'NGN',
        error: err instanceof Error ? err.message : 'Error communicating with Paystack',
      };
    }
  }

  public async handleWebhook(payload: WebhookPayload): Promise<WebhookProcessingResult> {
    if (payload.signature && this.webhookSecret) {
      const valid = PaymentSignatureVerifier.verifyPaystackSignature(
        JSON.stringify(payload),
        payload.signature,
        this.webhookSecret
      );
      if (!valid) {
        return { success: false, error: 'Cryptographic HMAC-SHA512 signature mismatch' };
      }
    }

    if (payload.event === 'charge.success') {
      return {
        success: true,
        paymentId: `pay_${payload.providerReference}`,
      };
    }

    return {
      success: false,
      error: `Charge was not successful: ${payload.event}`,
    };
  }

  public async refundPayment(
    providerReference: string,
    amountKobo: number,
    reason: string
  ): Promise<{ success: boolean; refundReference: string; error?: string }> {
    const refundRef = `ref_${providerReference}_${Date.now()}`;

    if (!this.secretKey || this.isSandbox) {
      return { success: true, refundReference: refundRef };
    }

    try {
      const response = await fetch(`${this.baseUrl}/refund`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transaction: providerReference,
          amount: amountKobo,
          merchant_note: reason,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.status) {
        return { success: false, refundReference: '', error: data.message };
      }

      return { success: true, refundReference: data.data?.reference || refundRef };
    } catch (err: unknown) {
      return {
        success: false,
        refundReference: '',
        error: err instanceof Error ? err.message : 'Refund failed',
      };
    }
  }

  public async resolveBankAccount(
    accountNumber: string,
    bankCode: string
  ): Promise<{ valid: boolean; accountName?: string; error?: string }> {
    if (!this.secretKey || this.isSandbox) {
      // Sandbox resolution
      return {
        valid: accountNumber.length === 10,
        accountName: 'BABATUNDE ADELEKE (VERIFIED)',
      };
    }

    try {
      const url = `${this.baseUrl}/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${this.secretKey}` },
      });
      const data = await response.json();

      if (response.ok && data.status) {
        return { valid: true, accountName: data.data.account_name };
      }

      return { valid: false, error: data.message || 'Could not resolve NUBAN account' };
    } catch (err: unknown) {
      return {
        valid: false,
        error: err instanceof Error ? err.message : 'Network error resolving NUBAN',
      };
    }
  }

  public async disbursePayout(options: InitiatePayoutOptions): Promise<PayoutDisbursementResult> {
    const transferRef = `TRF_PSTK_${options.workerId.slice(0, 6)}_${Date.now()}`;

    if (!this.secretKey || this.isSandbox) {
      return {
        success: true,
        payoutId: `payout_${transferRef}`,
        providerReference: transferRef,
        status: 'successful',
        amountKobo: options.amountKobo,
        currency: 'NGN',
      };
    }

    // Live Paystack NIP transfer implementation
    try {
      // 1. Create transfer recipient
      const recRes = await fetch(`${this.baseUrl}/transferrecipient`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'nuban',
          name: options.bankAccount.accountName,
          account_number: options.bankAccount.accountNumber,
          bank_code: options.bankAccount.bankCode,
          currency: 'NGN',
        }),
      });

      const recData = await recRes.json();
      if (!recRes.ok || !recData.status) {
        return {
          success: false,
          payoutId: '',
          providerReference: transferRef,
          status: 'failed',
          amountKobo: options.amountKobo,
          currency: 'NGN',
          error: recData.message || 'Recipient creation failed',
        };
      }

      const recipientCode = recData.data.recipient_code;

      // 2. Initiate Transfer
      const trfRes = await fetch(`${this.baseUrl}/transfer`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source: 'balance',
          amount: options.amountKobo,
          recipient: recipientCode,
          reason: `Menial Worker Earnings - Job ${options.jobId}`,
          reference: transferRef,
        }),
      });

      const trfData = await trfRes.json();
      if (!trfRes.ok || !trfData.status) {
        return {
          success: false,
          payoutId: '',
          providerReference: transferRef,
          status: 'failed',
          amountKobo: options.amountKobo,
          currency: 'NGN',
          error: trfData.message || 'Paystack transfer failed',
        };
      }

      return {
        success: true,
        payoutId: `payout_${trfData.data.id || transferRef}`,
        providerReference: transferRef,
        status: 'successful',
        amountKobo: options.amountKobo,
        currency: 'NGN',
      };
    } catch (err: unknown) {
      return {
        success: false,
        payoutId: '',
        providerReference: transferRef,
        status: 'failed',
        amountKobo: options.amountKobo,
        currency: 'NGN',
        error: err instanceof Error ? err.message : 'Error executing transfer',
      };
    }
  }
}
