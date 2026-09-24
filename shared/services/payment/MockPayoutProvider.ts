/**
 * Menial Platform - Mock Payout Provider
 * 
 * Development implementation of IPayoutProvider simulating Nigerian Inter-Bank Settlement System (NIBSS) / NIP transfers.
 * Reference: menial-master-spec-v2.md (§5, §41, §85)
 */

import type {
  IPayoutProvider,
  InitiatePayoutOptions,
  PayoutDisbursementResult,
} from './PayoutService';

export class MockPayoutProvider implements IPayoutProvider {
  private static readonly SUPPORTED_BANKS: Record<string, string> = {
    '058': 'Guaranty Trust Bank (GTB)',
    '044': 'Access Bank',
    '057': 'Zenith Bank',
    '011': 'First Bank of Nigeria',
    '033': 'United Bank for Africa (UBA)',
  };

  public async resolveBankAccount(
    accountNumber: string,
    bankCode: string
  ): Promise<{ valid: boolean; accountName?: string; error?: string }> {
    const cleanedAccount = accountNumber.trim().replace(/\D/g, '');

    // Nigerian NUBAN accounts are strictly 10 digits
    if (cleanedAccount.length !== 10) {
      return {
        valid: false,
        error: 'Nigerian bank account numbers (NUBAN) must be exactly 10 digits.',
      };
    }

    const bankName = MockPayoutProvider.SUPPORTED_BANKS[bankCode];
    if (!bankName) {
      return {
        valid: false,
        error: `Unsupported bank code (${bankCode}).`,
      };
    }

    return {
      valid: true,
      accountName: 'VERIFIED WORKER HOLDER',
    };
  }

  public async disbursePayout(
    options: InitiatePayoutOptions
  ): Promise<PayoutDisbursementResult> {
    const validation = await this.resolveBankAccount(
      options.bankAccount.accountNumber,
      options.bankAccount.bankCode
    );

    if (!validation.valid) {
      return {
        success: false,
        payoutId: '',
        providerReference: '',
        status: 'failed',
        amountKobo: options.amountKobo,
        currency: 'NGN',
        error: validation.error,
      };
    }

    const reference = `mock_payout_nip_${Date.now()}`;

    return {
      success: true,
      payoutId: `payout_rec_${Date.now()}`,
      providerReference: reference,
      status: 'successful',
      amountKobo: options.amountKobo,
      currency: 'NGN',
    };
  }
}
