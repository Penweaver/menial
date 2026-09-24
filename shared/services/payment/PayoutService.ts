/**
 * Menial Platform - Payout Service Interface
 * 
 * Abstract interface for worker earnings disbursements to Nigerian commercial bank accounts.
 * Reference: menial-master-spec-v2.md (§5, §41, §85)
 */

import type { PayoutStatus } from '../../types/enums';

export interface BankAccountDetails {
  accountNumber: string; // 10-digit NUBAN
  bankCode: string;      // 3-digit CBN bank code (e.g. 058 for GTBank, 044 for Access)
  accountName: string;
}

export interface InitiatePayoutOptions {
  jobId: string;
  workerId: string;
  amountKobo: number;    // Integer kobo (§4)
  bankAccount: BankAccountDetails;
}

export interface PayoutDisbursementResult {
  success: boolean;
  payoutId: string;
  providerReference: string;
  status: PayoutStatus;
  amountKobo: number;
  currency: 'NGN';
  error?: string;
}

export interface IPayoutProvider {
  /**
   * Resolves and verifies a 10-digit Nigerian NUBAN account number.
   */
  resolveBankAccount(
    accountNumber: string,
    bankCode: string
  ): Promise<{ valid: boolean; accountName?: string; error?: string }>;

  /**
   * Initiates an NIP bank transfer disbursement for worker earnings.
   */
  disbursePayout(options: InitiatePayoutOptions): Promise<PayoutDisbursementResult>;
}
