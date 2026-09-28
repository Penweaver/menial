/**
 * Menial Platform - Termii Nigeria SMS & OTP Adapter
 * 
 * Production adapter for Termii SMS gateway (optimized for Nigerian routes & DND bypass).
 * Reference: menial-master-spec-v2.md (§5, §8, §43)
 */

import type {
  ISmsProvider,
  SendSmsOptions,
  SmsSendResult,
  OtpRequestResult,
  OtpVerifyResult,
} from '../../services/sms/SmsService';
import type { ConnectionTestResult } from '../types';

export interface TermiiAdapterConfig {
  apiKey?: string;
  senderId?: string;
  channel?: 'dnd' | 'generic' | 'whatsapp';
  baseUrl?: string;
  isSandbox?: boolean;
}

export class TermiiSmsAdapter implements ISmsProvider {
  private apiKey: string;
  private senderId: string;
  private channel: string;
  private baseUrl: string;
  private isSandbox: boolean;
  private totalCostKobo = 0;
  private activeOtps: Map<string, { code: string; expiresAt: number }> = new Map();

  constructor(config: TermiiAdapterConfig) {
    this.apiKey = config.apiKey || '';
    this.senderId = config.senderId || 'Menial';
    this.channel = config.channel || 'dnd';
    this.baseUrl = config.baseUrl || 'https://api.ng.termii.com/api';
    this.isSandbox = config.isSandbox ?? false;
  }

  /**
   * Ping / Balance check to test Termii API key validity.
   */
  public async testConnection(): Promise<ConnectionTestResult> {
    const start = Date.now();
    if (!this.apiKey) {
      return {
        success: false,
        latencyMs: 0,
        message: 'Termii API Key is missing or empty.',
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/get-balance?api_key=${this.apiKey}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      const latency = Date.now() - start;
      const data = await response.json();

      if (response.ok && (data.balance !== undefined || data.status === 'success')) {
        return {
          success: true,
          latencyMs: latency,
          message: 'Connection successful. Termii API authenticated.',
          details: {
            currency: data.currency || 'NGN',
            balance: data.balance ?? 0,
          },
        };
      }

      return {
        success: false,
        latencyMs: latency,
        message: data.message || `Termii API returned HTTP ${response.status}`,
      };
    } catch (err: unknown) {
      return {
        success: false,
        latencyMs: Date.now() - start,
        message: err instanceof Error ? err.message : 'Network error communicating with Termii',
      };
    }
  }

  public async sendSms(options: SendSmsOptions): Promise<SmsSendResult> {
    const messageId = `msg_termii_${Date.now()}`;
    const costKobo = 400; // ₦4.00 per Termii DND SMS

    if (!this.apiKey || this.isSandbox) {
      this.totalCostKobo += costKobo;
      return {
        success: true,
        messageId,
        simulatedCostKobo: costKobo,
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/sms/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: options.to,
          from: this.senderId,
          sms: options.message,
          type: 'plain',
          channel: this.channel,
          api_key: this.apiKey,
        }),
      });

      const data = await response.json();
      if (!response.ok || (data.code && data.code !== 'ok')) {
        return {
          success: false,
          messageId: '',
          error: data.message || 'Termii SMS delivery failed',
        };
      }

      this.totalCostKobo += costKobo;
      return {
        success: true,
        messageId: data.message_id || messageId,
        simulatedCostKobo: costKobo,
      };
    } catch (err: unknown) {
      return {
        success: false,
        messageId: '',
        error: err instanceof Error ? err.message : 'Error sending SMS via Termii',
      };
    }
  }

  public async requestOtp(phone: string): Promise<OtpRequestResult> {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const costKobo = 400;

    this.activeOtps.set(phone, { code, expiresAt: Date.now() + 10 * 60 * 1000 });

    if (!this.apiKey || this.isSandbox) {
      this.totalCostKobo += costKobo;
      return {
        success: true,
        expiresAt,
        simulatedCostKobo: costKobo,
      };
    }

    // Live Termii OTP message dispatch
    const smsRes = await this.sendSms({
      to: phone,
      message: `Your Menial security code is: ${code}. Valid for 10 minutes. Do not share.`,
    });

    return {
      success: smsRes.success,
      expiresAt,
      simulatedCostKobo: costKobo,
      error: smsRes.error,
    };
  }

  public async verifyOtp(phone: string, code: string): Promise<OtpVerifyResult> {
    const entry = this.activeOtps.get(phone);

    // In sandbox or dev, master bypass code '123456' is accepted
    if (this.isSandbox && code === '123456') {
      return { success: true };
    }

    if (!entry) {
      return { success: false, error: 'No active OTP found for this phone number.' };
    }

    if (Date.now() > entry.expiresAt) {
      this.activeOtps.delete(phone);
      return { success: false, error: 'OTP has expired. Please request a new one.' };
    }

    if (entry.code !== code.trim()) {
      return { success: false, error: 'Invalid verification code entered.' };
    }

    this.activeOtps.delete(phone);
    return { success: true };
  }

  public getTotalSimulatedCostKobo(): number {
    return this.totalCostKobo;
  }
}
