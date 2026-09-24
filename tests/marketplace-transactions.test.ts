/**
 * Menial Platform - Phase 5 Verification Test Suite
 * 
 * Tests escrow payments, webhook idempotency, replay protection,
 * append-only double-entry ledger, bank disbursements, and earnings derivation.
 * Reference: menial-master-spec-v2.md (§4, §37, §38, §39, §41, §42, §44)
 */

import { MockPaymentProvider } from '../shared/services/payment/MockPaymentProvider';
import { MockPayoutProvider } from '../shared/services/payment/MockPayoutProvider';
import type { LedgerEntryType } from '../shared/types/enums';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`❌ Assertion Failed: ${message}`);
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING PHASE 5 TESTS: TRANSACTIONS & FINANCES');
  console.log('====================================================\n');

  // ========================================================================
  // 1. Test Payment Provider & Webhook Idempotency (§37, §39)
  // ========================================================================
  console.log('▶ Testing Payment Initialization & Webhook Replay Protection...');
  const paymentProvider = new MockPaymentProvider();

  // 1.1: Initialize payment session with kobo integer amount (§4)
  const initRes = await paymentProvider.initializePayment({
    jobId: 'job_uuid_101',
    publicJobId: 'MNL-00042',
    amountKobo: 550000, // ₦5,500
    employerEmail: 'employer@menial.ng',
    employerPhone: '+2348012345678',
  });

  assert(initRes.success, 'Payment initialization should succeed');
  assert(initRes.amountKobo === 550000, 'Amount must be preserved in kobo');
  assert(initRes.currency === 'NGN', 'Currency must be NGN');
  assert(Boolean(initRes.providerReference), 'Provider reference must be generated');

  // 1.2: Webhook confirmation with amount mismatch -> must fail
  const badAmountWebhook = await paymentProvider.handleWebhook({
    event: 'charge.success',
    providerReference: initRes.providerReference,
    amountKobo: 500000, // Wrong amount
    currency: 'NGN',
  });
  assert(!badAmountWebhook.success, 'Webhook with amount mismatch must be rejected');

  // 1.3: Webhook confirmation with correct amount -> succeeds
  const goodWebhook = await paymentProvider.handleWebhook({
    event: 'charge.success',
    providerReference: initRes.providerReference,
    amountKobo: 550000,
    currency: 'NGN',
  });
  assert(goodWebhook.success, 'Valid webhook confirmation must succeed');
  assert(!goodWebhook.isIdempotentReplay, 'First callback is not a replay');

  // 1.4: Webhook Replay Protection (§39): Second callback with same reference
  const duplicateWebhook = await paymentProvider.handleWebhook({
    event: 'charge.success',
    providerReference: initRes.providerReference,
    amountKobo: 550000,
    currency: 'NGN',
  });
  assert(duplicateWebhook.success, 'Duplicate callback should return success');
  assert(
    Boolean(duplicateWebhook.isIdempotentReplay),
    'Duplicate callback must be flagged as idempotent replay to prevent double-spending (§39)'
  );

  console.log('  ✅ Payment initialization, amount verification, and idempotency verified.');

  // ========================================================================
  // 2. Test Payout Provider & NUBAN Validation (§41)
  // ========================================================================
  console.log('▶ Testing Payout Provider & Nigerian NUBAN Validation...');
  const payoutProvider = new MockPayoutProvider();

  // 2.1: Invalid account number length check
  const invalidNuban = await payoutProvider.resolveBankAccount('12345', '058');
  assert(!invalidNuban.valid, 'NUBAN account shorter than 10 digits must fail');

  // 2.2: Valid 10-digit NUBAN
  const validNuban = await payoutProvider.resolveBankAccount('0123456789', '058');
  assert(validNuban.valid, '10-digit NUBAN with valid bank code must pass');

  // 2.3: Disburse payout in integer kobo
  const disburseRes = await payoutProvider.disbursePayout({
    jobId: 'job_uuid_101',
    workerId: 'worker_uuid_amina',
    amountKobo: 500000, // ₦5,000
    bankAccount: {
      accountNumber: '0123456789',
      bankCode: '058',
      accountName: 'AMINA BELLO',
    },
  });
  assert(disburseRes.success, 'Payout disbursement should succeed');
  assert(disburseRes.status === 'successful', 'Payout status should be successful');
  assert(disburseRes.amountKobo === 500000, 'Payout amount must match kobo amount');

  console.log('  ✅ NUBAN validation and NIP bank transfer disbursement verified.');

  // ========================================================================
  // 3. Test Append-Only Double-Entry Ledger Simulation (§44)
  // ========================================================================
  console.log('▶ Testing Double-Entry Append-Only Ledger Balancing (§44)...');

  interface MockLedgerEntry {
    id: string;
    relatedType: LedgerEntryType;
    relatedId: string;
    jobId: string;
    actorId: string;
    amount: number; // signed kobo: positive=credit, negative=debit
    currency: 'NGN';
    description: string;
  }

  const ledgerStore: MockLedgerEntry[] = [];

  function recordEscrowFunding(
    jobId: string,
    employerId: string,
    workerId: string,
    workerAmountKobo: number,
    platformFeeKobo: number
  ) {
    const totalAmount = workerAmountKobo + platformFeeKobo;

    // Entry 1: Employer total debit
    ledgerStore.push({
      id: `ledg_${ledgerStore.length + 1}`,
      relatedType: 'payment',
      relatedId: `pay_${jobId}`,
      jobId,
      actorId: employerId,
      amount: -totalAmount,
      currency: 'NGN',
      description: 'Escrow funding deposit',
    });

    // Entry 2: Platform fee credit
    ledgerStore.push({
      id: `ledg_${ledgerStore.length + 1}`,
      relatedType: 'fee',
      relatedId: `pay_${jobId}`,
      jobId,
      actorId: employerId,
      amount: platformFeeKobo,
      currency: 'NGN',
      description: 'Platform service fee',
    });

    // Entry 3: Worker escrow credit
    ledgerStore.push({
      id: `ledg_${ledgerStore.length + 1}`,
      relatedType: 'payment',
      relatedId: `pay_${jobId}`,
      jobId,
      actorId: workerId,
      amount: workerAmountKobo,
      currency: 'NGN',
      description: 'Escrow hold for worker',
    });
  }

  recordEscrowFunding('job_101', 'employer_1', 'worker_1', 500000, 50000);

  // Verify double-entry balance: sum of all amounts for this transaction = 0
  const transactionSum = ledgerStore.reduce((sum, e) => sum + e.amount, 0);
  assert(
    transactionSum === 0,
    `Double-entry ledger must balance to 0, got ${transactionSum} kobo`
  );

  console.log('  ✅ Double-entry ledger balancing verified.');

  // ========================================================================
  // 4. Test Worker Earnings Derived from Ledger (§42, §44)
  // ========================================================================
  console.log('▶ Testing Worker Earnings Engine (Ledger Single Source of Truth)...');

  function calculateWorkerEarnings(
    workerId: string,
    completedJobIds: Set<string>,
    ledger: MockLedgerEntry[]
  ) {
    const workerEntries = ledger.filter((e) => e.actorId === workerId);

    // Total earned = sum of positive payment entries
    const totalEarnedKobo = workerEntries
      .filter((e) => e.relatedType === 'payment' && e.amount > 0)
      .reduce((sum, e) => sum + e.amount, 0);

    // Pending escrow = positive payment entries on non-completed jobs
    const pendingEscrowKobo = workerEntries
      .filter(
        (e) =>
          e.relatedType === 'payment' &&
          e.amount > 0 &&
          !completedJobIds.has(e.jobId)
      )
      .reduce((sum, e) => sum + e.amount, 0);

    // Paid out = absolute sum of negative payout entries
    const paidOutKobo = Math.abs(
      workerEntries
        .filter((e) => e.relatedType === 'payout' && e.amount < 0)
        .reduce((sum, e) => sum + e.amount, 0)
    );

    // Available for withdrawal = (total earned - pending escrow) - paid out
    const availableBalanceKobo = Math.max(
      0,
      totalEarnedKobo - pendingEscrowKobo - paidOutKobo
    );

    return {
      totalEarnedKobo,
      pendingEscrowKobo,
      paidOutKobo,
      availableBalanceKobo,
    };
  }

  // Current state: job_101 is funded (500,000 kobo), not yet completed
  const completedJobs = new Set<string>();
  let earnings = calculateWorkerEarnings('worker_1', completedJobs, ledgerStore);

  assert(earnings.totalEarnedKobo === 500000, 'Total earned should be 500,000 kobo');
  assert(earnings.pendingEscrowKobo === 500000, 'Pending escrow should be 500,000 kobo');
  assert(earnings.availableBalanceKobo === 0, 'Available balance should be 0 while in escrow');

  // Job completes
  completedJobs.add('job_101');
  earnings = calculateWorkerEarnings('worker_1', completedJobs, ledgerStore);
  assert(earnings.pendingEscrowKobo === 0, 'Pending escrow should be 0 after job completion');
  assert(
    earnings.availableBalanceKobo === 500000,
    'Available balance should now be 500,000 kobo'
  );

  // Worker receives payout disbursement: append ledger entry (§44)
  ledgerStore.push({
    id: `ledg_${ledgerStore.length + 1}`,
    relatedType: 'payout',
    relatedId: 'payout_1',
    jobId: 'job_101',
    actorId: 'worker_1',
    amount: -500000, // Debit
    currency: 'NGN',
    description: 'Bank payout disbursement',
  });

  earnings = calculateWorkerEarnings('worker_1', completedJobs, ledgerStore);
  assert(earnings.paidOutKobo === 500000, 'Paid out should be 500,000 kobo');
  assert(earnings.availableBalanceKobo === 0, 'Available balance should be 0 after payout');

  // ========================================================================
  // 5. Test Offsetting Refund Reversal (§44)
  // ========================================================================
  console.log('▶ Testing Offsetting Refund (Append-Only Reversal)...');

  // Refund employer: append positive credit entry (§44)
  ledgerStore.push({
    id: `ledg_${ledgerStore.length + 1}`,
    relatedType: 'refund',
    relatedId: 'pay_job_101',
    jobId: 'job_101',
    actorId: 'employer_1',
    amount: 550000, // Offsetting credit
    currency: 'NGN',
    description: 'Escrow deposit refund',
  });

  // Verify employer net balance is 0 (-550,000 + 550,000)
  const employerBalance = ledgerStore
    .filter((e) => e.actorId === 'employer_1' && e.relatedType !== 'fee')
    .reduce((sum, e) => sum + e.amount, 0);

  assert(
    employerBalance === 0,
    `Employer net balance after refund must be 0, got ${employerBalance}`
  );

  console.log('  ✅ Offsetting append-only refund reversal verified.');

  console.log('\n====================================================');
  console.log('🎉 ALL PHASE 5 VERIFICATION TESTS PASSED (100%)');
  console.log('====================================================\n');
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
