/**
 * Menial Platform - Twilio Global SMS & OTP Adapter
 * 
 * Production adapter for Twilio SMS gateway.
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

export interface TwilioAdapterConfig {
  accountSid?: string;
  authToken?: string;
  fromNumber?: string;
  baseUrl?: string;
  isSandbox?: boolean;
}

export class TwilioSmsAdapter implements ISmsProvider {
  private accountSid: string;
  private authToken: string;
  private fromNumber: string;
  private baseUrl: string;
  private isSandbox: boolean;
  private totalCostKobo = 0;
  private activeOtps: Map<string, { code: string; expiresAt: number }> = new Map();

  constructor(config: TwilioAdapterConfig) {
    this.accountSid = config.accountSid || '';
    this.authToken = config.authToken || '';
    this.fromNumber = config.fromNumber || '';
    this.baseUrl = config.baseUrl || 'https://api.twilio.com';
    this.isSandbox = config.isSandbox ?? false;
  }

  /**
   * Ping / Account info check to test Twilio SID and Auth Token.
   */
  public async testConnection(): Promise<ConnectionTestResult> {
    const start = Date.now();
    if (!this.accountSid || !this.authToken) {
      return {
        success: false,
        latencyMs: 0,
        message: 'Twilio Account SID or Auth Token is missing.',
      };
    }

    try {
      const basicAuth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');
      const response = await fetch(`${this.baseUrl}/2010-04-01/Accounts/${this.accountSid}.json`, {
        headers: {
          Authorization: `Basic ${basicAuth}`,
        },
      });

      const latency = Date.now() - start;
      const data = await response.json();

      if (response.ok && data.status === 'active') {
        return {
          success: true,
          latencyMs: latency,
          message: 'Connection successful. Twilio API authenticated.',
          details: {
            friendlyName: data.friendly_name,
            status: data.status,
          },
        };
      }

      return {
        success: false,
        latencyMs: latency,
        message: data.message || `Twilio API returned HTTP ${response.status}`,
      };
    } catch (err: unknown) {
      return {
        success: false,
        latencyMs: Date.now() - start,
        message: err instanceof Error ? err.message : 'Network error communicating with Twilio',
      };
    }
  }

  public async sendSms(options: SendSmsOptions): Promise<SmsSendResult> {
    const messageId = `msg_twilio_${Date.now()}`;
    const costKobo = 900; // ~₦9.00 ($0.005) international SMS

    if (!this.accountSid || !this.authToken || this.isSandbox) {
      this.totalCostKobo += costKobo;
      return {
        success: true,
        messageId,
        simulatedCostKobo: costKobo,
      };
    }

    try {
      const basicAuth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');
      const params = new URLSearchParams();
      params.append('To', options.to);
      params.append('From', this.fromNumber);
      params.append('Body', options.message);

      const response = await fetch(
        `${this.baseUrl}/2010-04-01/Accounts/${this.accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${basicAuth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString(),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        return {
          success: false,
          messageId: '',
          error: data.message || 'Twilio SMS failed',
        };
      }

      this.totalCostKobo += costKobo;
      return {
        success: true,
        messageId: data.sid || messageId,
        simulatedCostKobo: costKobo,
      };
    } catch (err: unknown) {
      return {
        success: false,
        messageId: '',
        error: err instanceof Error ? err.message : 'Error sending SMS via Twilio',
      };
    }
  }

  public async requestOtp(phone: string): Promise<OtpRequestResult> {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const costKobo = 900;

    this.activeOtps.set(phone, { code, expiresAt: Date.now() + 10 * 60 * 1000 });

    if (!this.accountSid || this.isSandbox) {
      this.totalCostKobo += costKobo;
      return {
        success: true,
        expiresAt,
        simulatedCostKobo: costKobo,
      };
    }

    const smsRes = await this.sendSms({
      to: phone,
      message: `Your Menial security code is: ${code}. Valid for 10 minutes.`,
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

    if (this.isSandbox && code === '123456') {
      return { success: true };
    }

    if (!entry) {
      return { success: false, error: 'No active OTP found for this phone.' };
    }

    if (Date.now() > entry.expiresAt) {
      this.activeOtps.delete(phone);
      return { success: false, error: 'OTP has expired.' };
    }

    if (entry.code !== code.trim()) {
      return { success: false, error: 'Invalid OTP code.' };
    }

    this.activeOtps.delete(phone);
    return { success: true };
  }

  public getTotalSimulatedCostKobo(): number {
    return this.totalCostKobo;
  }
}
