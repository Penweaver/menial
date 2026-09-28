/**
 * Menial Platform - Dynamic Integration Types & Provider Contracts
 * 
 * Defines the runtime switchboard contracts for Payments, SMS, and KYC.
 * Reference: menial-master-spec-v2.md (§5, §8, §22, §39, §41, §66, §72)
 */

export type IntegrationCategory = 'payment' | 'sms' | 'kyc';
export type IntegrationEnvironment = 'sandbox' | 'live';

export interface IntegrationProviderConfig {
  id: string;
  category: IntegrationCategory;
  providerId: string;
  providerName: string;
  isActive: boolean;
  environment: IntegrationEnvironment;
  config: Record<string, unknown>;
  maskedSecrets: Record<string, string>;
  updatedAt: string;
  updatedByName?: string;
}

export interface ActiveProviderSecrets {
  provider_id: string;
  provider_name: string;
  environment: IntegrationEnvironment;
  config: Record<string, unknown>;
  secrets: Record<string, string>;
}

export interface ConnectionTestResult {
  success: boolean;
  latencyMs: number;
  message: string;
  details?: Record<string, unknown>;
}

export interface TestConnectionParams {
  category: IntegrationCategory;
  providerId: string;
  environment: IntegrationEnvironment;
  config: Record<string, unknown>;
  secrets: Record<string, string>;
}
