/**
 * Menial Platform - Runtime Provider Manager & Switchboard Resolver
 * 
 * Factory that dynamically instantiates and routes to the active provider
 * configured in the database by the Superadmin. Enables live hot-swapping
 * without code deployment or application restart.
 * Reference: menial-master-spec-v2.md (§5, §8, §22, §39, §41, §66, §72)
 */

import type { IDatabaseClient } from '../services/admin/AdminService';
import type { IPaymentProvider } from '../services/payment/PaymentService';
import { MockPaymentProvider } from '../services/payment/MockPaymentProvider';
import type { IPayoutProvider } from '../services/payment/PayoutService';
import { MockPayoutProvider } from '../services/payment/MockPayoutProvider';
import type { ISmsProvider } from '../services/sms/SmsService';
import { MockSmsProvider } from '../services/sms/MockSmsProvider';
import type { IVerificationProvider } from '../services/verification/VerificationService';
import { MockVerificationProvider } from '../services/verification/MockVerificationProvider';

import { PaystackAdapter } from './payment/PaystackAdapter';
import { FlutterwaveAdapter } from './payment/FlutterwaveAdapter';
import { TermiiSmsAdapter } from './sms/TermiiSmsAdapter';
import { TwilioSmsAdapter } from './sms/TwilioSmsAdapter';
import { PremblyAdapter } from './kyc/PremblyAdapter';

import type {
  ActiveProviderSecrets,
  ConnectionTestResult,
  TestConnectionParams,
  IntegrationCategory,
} from './types';

export class ProviderManager {
  private db: IDatabaseClient;
  private cache: Map<IntegrationCategory, { provider: any; fetchedAt: number }> = new Map();
  private cacheTtlMs = 60000; // 1 minute local cache

  constructor(db: IDatabaseClient) {
    this.db = db;
  }

  public invalidateCache(category?: IntegrationCategory): void {
    if (category) {
      this.cache.delete(category);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Resolves the active Payment Provider dynamically from database config.
   */
  public async getPaymentProvider(): Promise<IPaymentProvider> {
    const cached = this.cache.get('payment');
    if (cached && Date.now() - cached.fetchedAt < this.cacheTtlMs) {
      return cached.provider as IPaymentProvider;
    }

    const activeConfig = await this.fetchActiveConfig('payment');
    let provider: IPaymentProvider;

    switch (activeConfig.provider_id) {
      case 'paystack':
        provider = new PaystackAdapter({
          publicKey: String(activeConfig.config?.public_key || ''),
          secretKey: String(activeConfig.secrets?.secret_key || ''),
          webhookSecret: String(activeConfig.secrets?.webhook_secret || ''),
          baseUrl: String(activeConfig.config?.base_url || 'https://api.paystack.co'),
          isSandbox: activeConfig.environment === 'sandbox',
        });
        break;

      case 'flutterwave':
        provider = new FlutterwaveAdapter({
          publicKey: String(activeConfig.config?.public_key || ''),
          secretKey: String(activeConfig.secrets?.secret_key || ''),
          webhookSecret: String(activeConfig.secrets?.webhook_secret || ''),
          baseUrl: String(activeConfig.config?.base_url || 'https://api.flutterwave.com/v3'),
          isSandbox: activeConfig.environment === 'sandbox',
        });
        break;

      case 'mock':
      default:
        provider = new MockPaymentProvider();
        break;
    }

    this.cache.set('payment', { provider, fetchedAt: Date.now() });
    return provider;
  }

  /**
   * Resolves the active Payout Provider dynamically from database config.
   */
  public async getPayoutProvider(): Promise<IPayoutProvider> {
    const payment = await this.getPaymentProvider();
    if ('disbursePayout' in payment && typeof (payment as any).disbursePayout === 'function') {
      return payment as unknown as IPayoutProvider;
    }
    return new MockPayoutProvider();
  }

  /**
   * Resolves the active SMS Provider dynamically from database config.
   */
  public async getSmsProvider(): Promise<ISmsProvider> {
    const cached = this.cache.get('sms');
    if (cached && Date.now() - cached.fetchedAt < this.cacheTtlMs) {
      return cached.provider as ISmsProvider;
    }

    const activeConfig = await this.fetchActiveConfig('sms');
    let provider: ISmsProvider;

    switch (activeConfig.provider_id) {
      case 'termii':
        provider = new TermiiSmsAdapter({
          apiKey: String(activeConfig.secrets?.api_key || ''),
          senderId: String(activeConfig.config?.sender_id || 'Menial'),
          channel: (activeConfig.config?.channel as any) || 'dnd',
          baseUrl: String(activeConfig.config?.base_url || 'https://api.ng.termii.com/api'),
          isSandbox: activeConfig.environment === 'sandbox',
        });
        break;

      case 'twilio':
        provider = new TwilioSmsAdapter({
          accountSid: String(activeConfig.secrets?.account_sid || activeConfig.config?.account_sid || ''),
          authToken: String(activeConfig.secrets?.auth_token || ''),
          fromNumber: String(activeConfig.config?.from_number || ''),
          baseUrl: String(activeConfig.config?.base_url || 'https://api.twilio.com'),
          isSandbox: activeConfig.environment === 'sandbox',
        });
        break;

      case 'mock':
      default:
        provider = new MockSmsProvider();
        break;
    }

    this.cache.set('sms', { provider, fetchedAt: Date.now() });
    return provider;
  }

  /**
   * Resolves the active KYC Provider dynamically from database config.
   */
  public async getKycProvider(): Promise<IVerificationProvider> {
    const cached = this.cache.get('kyc');
    if (cached && Date.now() - cached.fetchedAt < this.cacheTtlMs) {
      return cached.provider as IVerificationProvider;
    }

    const activeConfig = await this.fetchActiveConfig('kyc');
    let provider: IVerificationProvider;

    switch (activeConfig.provider_id) {
      case 'prembly':
        provider = new PremblyAdapter({
          appId: String(activeConfig.config?.app_id || ''),
          apiKey: String(activeConfig.secrets?.api_key || ''),
          baseUrl: String(activeConfig.config?.base_url || 'https://api.identitypass.com/api/v1'),
          isSandbox: activeConfig.environment === 'sandbox',
        });
        break;

      case 'mock':
      default:
        provider = new MockVerificationProvider();
        break;
    }

    this.cache.set('kyc', { provider, fetchedAt: Date.now() });
    return provider;
  }

  /**
   * Validates and pings external provider API credentials on the fly without saving.
   */
  public async testConnection(params: TestConnectionParams): Promise<ConnectionTestResult> {
    const isSandbox = params.environment === 'sandbox';

    if (params.providerId === 'mock') {
      return {
        success: true,
        latencyMs: 1,
        message: 'Mock provider sandbox connection verified.',
        details: { mode: 'in-memory-simulation' },
      };
    }

    if (params.providerId === 'paystack') {
      const adapter = new PaystackAdapter({
        publicKey: params.config.public_key as string,
        secretKey: params.secrets.secret_key as string,
        baseUrl: (params.config.base_url as string) || 'https://api.paystack.co',
        isSandbox,
      });
      return adapter.testConnection();
    }

    if (params.providerId === 'flutterwave') {
      const adapter = new FlutterwaveAdapter({
        publicKey: params.config.public_key as string,
        secretKey: params.secrets.secret_key as string,
        baseUrl: (params.config.base_url as string) || 'https://api.flutterwave.com/v3',
        isSandbox,
      });
      return adapter.testConnection();
    }

    if (params.providerId === 'termii') {
      const adapter = new TermiiSmsAdapter({
        apiKey: params.secrets.api_key as string,
        senderId: (params.config.sender_id as string) || 'Menial',
        baseUrl: (params.config.base_url as string) || 'https://api.ng.termii.com/api',
        isSandbox,
      });
      return adapter.testConnection();
    }

    if (params.providerId === 'twilio') {
      const adapter = new TwilioSmsAdapter({
        accountSid: (params.secrets.account_sid || params.config.account_sid) as string,
        authToken: params.secrets.auth_token as string,
        baseUrl: (params.config.base_url as string) || 'https://api.twilio.com',
        isSandbox,
      });
      return adapter.testConnection();
    }

    if (params.providerId === 'prembly') {
      const adapter = new PremblyAdapter({
        appId: params.config.app_id as string,
        apiKey: params.secrets.api_key as string,
        baseUrl: (params.config.base_url as string) || 'https://api.identitypass.com/api/v1',
        isSandbox,
      });
      return adapter.testConnection();
    }

    return {
      success: true,
      latencyMs: 5,
      message: `Connection to ${params.providerId} verified (simulated).`,
    };
  }

  private async fetchActiveConfig(category: IntegrationCategory): Promise<ActiveProviderSecrets> {
    try {
      const { data, error } = await this.db.rpc<ActiveProviderSecrets>(
        'get_active_integration_provider',
        { p_category: category }
      );

      if (error || !data) {
        return {
          provider_id: 'mock',
          provider_name: 'Fallback Mock',
          environment: 'sandbox',
          config: {},
          secrets: {},
        };
      }

      return data;
    } catch {
      return {
        provider_id: 'mock',
        provider_name: 'Fallback Mock',
        environment: 'sandbox',
        config: {},
        secrets: {},
      };
    }
  }
}
