/**
 * Menial Mobile - Slice 6 Verification Test Suite
 * 
 * Verifies:
 * 1. Worker earnings derivation from immutable double-entry ledger (§4, §41, §44).
 * 2. Available balance update upon employer job completion confirmation (§32, §44).
 * 3. Nigerian NUBAN 10-digit validation & CBN bank code resolution (§41, §85).
 * 4. Payout disbursement via NIP transfer & balance debit defense (§41).
 * 5. Mutual post-job rating submission (1-5 star constraints & running average recalculation) (§46).
 * 6. Duplicate rating prevention on same job (§46).
 * 7. Worker work history and audit receipts retrieval (§45).
 * 8. Slice 6 screen & component coverage:
 *    - WorkerWalletScreen.tsx (earnings hero, NIP cashout modal, ledger transactions).
 *    - WorkerJobHistoryScreen.tsx (history cards, ratings, photo evidence).
 *    - JobRatingModal.tsx (1-5 star selector, review notes, section 46 trust notice).
 * 9. WorkerNavigator tab wiring (Wallet and History tabs).
 */

import * as fs from 'fs';
import * as path from 'path';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${message}`);
}

async function runSlice6Tests() {
  console.log('====================================================');
  console.log('  MENIAL MOBILE — SLICE 6 VERIFICATION TEST SUITE   ');
  console.log('====================================================\n');

  const { ApiService, SUPPORTED_NIGERIAN_BANKS } = await import('../mobile/src/services/api');
  const { formatKoboToNaira } = await import('../mobile/src/constants/theme');

  // ==========================================================================
  // 1. WORKER EARNINGS DERIVATION & LEDGER INTEGRITY (§4, §41, §44)
  // ==========================================================================
  console.log('--- 1. WORKER EARNINGS DERIVATION & LEDGER INTEGRITY (§4, §41, §44) ---');

  const initialSummary = ApiService.getWorkerEarningsSummary('worker_adebayo');
  assert(initialSummary.lifetimeEarningsKobo > 0, `Initial lifetime earnings: ${formatKoboToNaira(initialSummary.lifetimeEarningsKobo)}`);
  assert(initialSummary.totalWithdrawnKobo >= 0, `Total withdrawn: ${formatKoboToNaira(initialSummary.totalWithdrawnKobo)}`);
  assert(
    initialSummary.availableBalanceKobo === initialSummary.lifetimeEarningsKobo - initialSummary.totalWithdrawnKobo,
    'Available balance equals lifetime earnings minus total withdrawn'
  );

  const initialBalance = initialSummary.availableBalanceKobo;

  // Verify ledger transactions retrieval
  const transactions = ApiService.getLedgerTransactions('worker_adebayo');
  assert(transactions.length > 0, `Retrieved ${transactions.length} ledger transactions for worker`);
  assert(
    transactions.some((t) => t.relatedType === 'payment' && t.amountKobo > 0),
    'Ledger contains positive payment credits'
  );

  // ==========================================================================
  // 2. ACTIVE JOB COMPLETION UNLOCKS EARNINGS (§32, §44)
  // ==========================================================================
  console.log('\n--- 2. ACTIVE JOB COMPLETION UNLOCKS EARNINGS (§32, §44) ---');

  // Create a new job for worker_adebayo
  const newJobResult = await ApiService.createJob({
    categoryId: 'cat_cleaning',
    title: 'Post-Renovation Clean - Lekki',
    description: 'Scrub tiles and clean windows.',
    locationText: 'Admiralty Way, Lekki Phase 1',
    scheduledDate: '2026-09-25',
    startTime: '10:00:00',
    durationMinutes: 120,
    workerPayKobo: 400000, // ₦4,000
    numberOfWorkers: 1,
  });

  const testJobId = newJobResult.jobId;

  // Fund escrow
  const initPayment = await ApiService.initializeEscrowPayment({
    jobId: testJobId,
    publicJobId: newJobResult.publicJobId,
    amountKobo: newJobResult.pricing.totalAmountKobo,
    employerEmail: 'client@acme.ng',
    employerPhone: '+2348011223344',
  });

  await ApiService.confirmEscrowPayment(
    initPayment.providerReference,
    newJobResult.pricing.totalAmountKobo,
    testJobId
  );

  // Assign worker
  await ApiService.hireWorker({
    jobId: testJobId,
    workerId: 'worker_adebayo',
    agreedAmountKobo: 400000,
  });

  // Verify pending escrow increased
  const midSummary = ApiService.getWorkerEarningsSummary('worker_adebayo');
  assert(midSummary.pendingEscrowKobo >= 400000, 'Pending escrow tracks active funded job');

  // Complete lifecycle to completion
  await ApiService.startTravel(testJobId);
  await ApiService.arriveAtJob(testJobId, 'https://example.com/arrival.jpg');
  await ApiService.startWork(testJobId);
  await ApiService.completeWork(testJobId, 'https://example.com/checkout.jpg', 'Job finished');
  await ApiService.confirmCompletion(testJobId);

  // Verify available balance increased by exactly workerPayKobo (400,000 kobo / ₦4,000)
  const afterCompletionSummary = ApiService.getWorkerEarningsSummary('worker_adebayo');
  assert(
    afterCompletionSummary.availableBalanceKobo === initialBalance + 400000,
    `Available balance credited: was ${formatKoboToNaira(initialBalance)}, now ${formatKoboToNaira(afterCompletionSummary.availableBalanceKobo)}`
  );
  assert(
    afterCompletionSummary.lifetimeEarningsKobo === initialSummary.lifetimeEarningsKobo + 400000,
    'Lifetime earnings incremented by exact worker wage'
  );

  // ==========================================================================
  // 3. NUBAN VALIDATION & CBN BANK RESOLUTION (§41, §85)
  // ==========================================================================
  console.log('\n--- 3. NUBAN VALIDATION & CBN BANK RESOLUTION (§41, §85) ---');

  // Invalid NUBAN (< 10 digits)
  const invalidShort = await ApiService.validateNuban('012345', '044');
  assert(!invalidShort.valid, 'NUBAN shorter than 10 digits must be rejected');

  // Invalid NUBAN (> 10 digits)
  const invalidLong = await ApiService.validateNuban('012345678901', '044');
  assert(!invalidLong.valid, 'NUBAN longer than 10 digits must be rejected');

  // Invalid bank code
  const invalidBank = await ApiService.validateNuban('0123456789', '999');
  assert(!invalidBank.valid, 'Unsupported CBN bank code must be rejected');

  // Valid 10-digit NUBAN
  const validNuban = await ApiService.validateNuban('0123456789', '044');
  assert(validNuban.valid, '10-digit NUBAN with valid CBN bank code succeeds');
  assert(!!validNuban.accountName, `Account name resolved: ${validNuban.accountName}`);

  // Supported banks list check
  assert(SUPPORTED_NIGERIAN_BANKS.length >= 5, 'At least 5 major Nigerian banks supported');
  assert(
    SUPPORTED_NIGERIAN_BANKS.some((b) => b.name.includes('Access Bank')),
    'Access Bank supported'
  );
  assert(
    SUPPORTED_NIGERIAN_BANKS.some((b) => b.name.includes('Guaranty Trust Bank')),
    'GTBank supported'
  );

  // ==========================================================================
  // 4. WORKER BANK DISBURSEMENT VIA NIP TRANSFER (§41)
  // ==========================================================================
  console.log('\n--- 4. WORKER BANK DISBURSEMENT VIA NIP TRANSFER (§41) ---');

  const currentAvailable = afterCompletionSummary.availableBalanceKobo;

  // Rejection on zero or negative amount
  const zeroWithdraw = await ApiService.withdrawEarnings({
    workerId: 'worker_adebayo',
    amountKobo: 0,
    bankAccount: { accountNumber: '0123456789', bankCode: '044', accountName: 'TEST' },
  });
  assert(!zeroWithdraw.success, 'Zero kobo withdrawal is rejected');

  // Rejection on overdraft attempt (exceeding available balance)
  const overdraftWithdraw = await ApiService.withdrawEarnings({
    workerId: 'worker_adebayo',
    amountKobo: currentAvailable + 1000000,
    bankAccount: { accountNumber: '0123456789', bankCode: '044', accountName: 'TEST' },
  });
  assert(!overdraftWithdraw.success, 'Withdrawal exceeding available balance is rejected (§44)');

  // Successful valid withdrawal: ₦2,000 (200,000 kobo)
  const withdrawAmountKobo = 200000;
  const validWithdraw = await ApiService.withdrawEarnings({
    workerId: 'worker_adebayo',
    amountKobo: withdrawAmountKobo,
    bankAccount: {
      accountNumber: '0123456789',
      bankCode: '044',
      accountName: 'VERIFIED WORKER HOLDER',
    },
  });

  assert(validWithdraw.success, 'NIP bank transfer withdrawal succeeds');
  assert(validWithdraw.status === 'successful', 'Payout status is successful');
  assert(!!validWithdraw.providerReference, `Generated NIP provider reference: ${validWithdraw.providerReference}`);

  // Available balance must decrement by exact withdrawal amount
  const postWithdrawSummary = ApiService.getWorkerEarningsSummary('worker_adebayo');
  assert(
    postWithdrawSummary.availableBalanceKobo === currentAvailable - withdrawAmountKobo,
    `Available balance correctly debited from ${formatKoboToNaira(currentAvailable)} to ${formatKoboToNaira(postWithdrawSummary.availableBalanceKobo)}`
  );
  assert(
    postWithdrawSummary.totalWithdrawnKobo === afterCompletionSummary.totalWithdrawnKobo + withdrawAmountKobo,
    'Total withdrawn accumulator incremented by exact withdrawal amount'
  );

  // ==========================================================================
  // 5. MUTUAL POST-JOB RATINGS & RUNNING AVERAGE (§46)
  // ==========================================================================
  console.log('\n--- 5. MUTUAL POST-JOB RATINGS & RUNNING AVERAGE (§46) ---');

  // Rejection of invalid star ratings (< 1 or > 5)
  let rejectedLow = false;
  try {
    await ApiService.submitJobRating({ jobId: testJobId, stars: 0, raterRole: 'employer' } as any);
  } catch (err) {
    rejectedLow = true;
  }
  assert(rejectedLow, '0-star rating must be rejected');

  let rejectedHigh = false;
  try {
    await ApiService.submitJobRating({ jobId: testJobId, stars: 6, raterRole: 'employer' } as any);
  } catch (err) {
    rejectedHigh = true;
  }
  assert(rejectedHigh, '6-star rating must be rejected');

  // Valid 5-star rating submission
  const validRating = await ApiService.submitJobRating({
    jobId: testJobId,
    stars: 5,
    reviewText: 'Outstanding cleaning! Very thorough and punctual.',
  });

  assert(validRating.stars === 5, 'Rating submitted with 5 stars');
  assert(validRating.newAverageRating >= 1 && validRating.newAverageRating <= 5, `Recalculated running average: ${validRating.newAverageRating}`);

  // Duplicate rating attempt on same job must be rejected (§46)
  let duplicateRejected = false;
  try {
    await ApiService.submitJobRating({
      jobId: testJobId,
      stars: 4,
      reviewText: 'Second rating attempt',
    });
  } catch (err) {
    duplicateRejected = true;
  }
  assert(duplicateRejected, 'Duplicate rating on same job by same user must be blocked (§46)');

  // ==========================================================================
  // 6. WORK HISTORY & AUDIT VIEW (§44, §45)
  // ==========================================================================
  console.log('\n--- 6. WORK HISTORY & AUDIT VIEW (§44, §45) ---');

  const history = ApiService.getWorkerJobHistory('worker_adebayo');
  assert(history.length >= 2, `Retrieved ${history.length} jobs in worker work history`);
  const completedJob = history.find((j) => j.status === 'completed');
  assert(completedJob !== undefined, 'History includes completed jobs');
  assert(!!completedJob.publicJobId, `Public job reference preserved: ${completedJob.publicJobId}`);
  assert(completedJob.workerPayKobo > 0, `Job net earnings preserved: ${formatKoboToNaira(completedJob.workerPayKobo)}`);

  // ==========================================================================
  // 7. SCREEN & COMPONENT COVERAGE
  // ==========================================================================
  console.log('\n--- 7. SCREEN & COMPONENT COVERAGE ---');

  const screensDir = path.resolve(__dirname, '../mobile/src/screens');
  const componentsDir = path.resolve(__dirname, '../mobile/src/components');

  const walletScreenPath = path.join(screensDir, 'worker/wallet/WorkerWalletScreen.tsx');
  const historyScreenPath = path.join(screensDir, 'worker/wallet/WorkerJobHistoryScreen.tsx');
  const ratingModalPath = path.join(componentsDir, 'trust/JobRatingModal.tsx');

  assert(fs.existsSync(walletScreenPath), 'WorkerWalletScreen.tsx exists');
  assert(fs.existsSync(historyScreenPath), 'WorkerJobHistoryScreen.tsx exists');
  assert(fs.existsSync(ratingModalPath), 'JobRatingModal.tsx exists');

  // Verify WorkerWalletScreen features
  const walletScreenContent = fs.readFileSync(walletScreenPath, 'utf8');
  assert(
    walletScreenContent.includes('AVAILABLE BALANCE') || walletScreenContent.includes('Available Balance'),
    'WorkerWalletScreen displays AVAILABLE BALANCE hero'
  );
  assert(
    walletScreenContent.includes('Pending Escrow') && walletScreenContent.includes('Lifetime Earnings'),
    'WorkerWalletScreen displays Pending Escrow and Lifetime Earnings'
  );
  assert(
    walletScreenContent.includes('Withdraw to Bank Account') || walletScreenContent.includes('Withdraw to Bank'),
    'WorkerWalletScreen implements Withdraw to Bank action'
  );
  assert(
    walletScreenContent.includes('NUBAN') && walletScreenContent.includes('validateNuban'),
    'WorkerWalletScreen enforces 10-digit NUBAN validation'
  );
  assert(
    walletScreenContent.includes('Double-Entry Ledger') || walletScreenContent.includes('Transaction History'),
    'WorkerWalletScreen renders audit transaction history'
  );

  // Verify WorkerJobHistoryScreen features
  const historyScreenContent = fs.readFileSync(historyScreenPath, 'utf8');
  assert(
    historyScreenContent.includes('Work History'),
    'WorkerJobHistoryScreen implements TopBar Work History'
  );
  assert(
    historyScreenContent.includes('Net Earnings') || historyScreenContent.includes('workerPayKobo'),
    'WorkerJobHistoryScreen displays net earnings per job'
  );
  assert(
    historyScreenContent.includes('JobRatingModal'),
    'WorkerJobHistoryScreen mounts JobRatingModal for client ratings'
  );

  // Verify JobRatingModal features
  const ratingModalContent = fs.readFileSync(ratingModalPath, 'utf8');
  assert(
    ratingModalContent.includes('Rate Your Experience'),
    'JobRatingModal implements Rate Your Experience title'
  );
  assert(
    ratingModalContent.includes('submitJobRating') || ratingModalContent.includes('ApiService.submitJobRating'),
    'JobRatingModal delegates to ApiService.submitJobRating'
  );
  assert(
    ratingModalContent.includes('Section 46'),
    'JobRatingModal highlights Section 46 mutual rating policy'
  );

  // ==========================================================================
  // 8. WORKER NAVIGATOR INTEGRATION
  // ==========================================================================
  console.log('\n--- 8. WORKER NAVIGATOR INTEGRATION ---');

  const workerNavPath = path.resolve(__dirname, '../mobile/src/navigation/WorkerNavigator.tsx');
  const workerNavContent = fs.readFileSync(workerNavPath, 'utf8');

  assert(
    workerNavContent.includes('WorkerWalletScreen'),
    'WorkerNavigator imports WorkerWalletScreen'
  );
  assert(
    workerNavContent.includes('WorkerJobHistoryScreen'),
    'WorkerNavigator imports WorkerJobHistoryScreen'
  );
  assert(
    workerNavContent.includes('name="Wallet"') &&
    workerNavContent.includes('component={WorkerWalletScreen}'),
    'WorkerNavigator mounts WorkerWalletScreen on Wallet tab'
  );
  assert(
    workerNavContent.includes('name="JobFeed"') &&
    workerNavContent.includes('component={WorkerJobHistoryScreen}'),
    'WorkerNavigator mounts WorkerJobHistoryScreen on History/JobFeed tab'
  );

  console.log('\n====================================================');
  console.log('  RESULTS: ALL SLICE 6 TESTS PASSED (100%)');
  console.log('====================================================\n');
}

runSlice6Tests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
