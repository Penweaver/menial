/**
 * Automated Test Suite: Mobile Payment Gateway & Escrow Integration (Pillar 3)
 * 
 * Verifies:
 * 1. Nigerian Payment Rails & Luhn Card Validation (Visa, Mastercard, Verve)
 * 2. Multi-Channel Escrow Initialization (Card, Virtual Account, USSD)
 * 3. Dynamic Dedicated Virtual NIP Account Generation & Expiry (§38)
 * 4. USSD Bank Code Generation & Telephony Protocol
 * 5. 3D Secure (3DS) OTP Challenge Verification (§37, §39)
 * 6. Cryptographic Webhook HMAC-SHA512 Signature & Replay Defense (§37, §39, §89)
 * 7. Escrow Funding Job Lifecycle Transition & Idempotency (§38, §39)
 * 8. Double-Entry Balanced Ledger Settlement on Job Completion (§40, §44)
 * 9. Worker 10-Digit NUBAN Resolution & Instant NIP Bank Transfer Withdrawal (§41, §42)
 * 10. Mobile Screen Component Invariants (EscrowPaymentScreen, Card3DSModal, EmployerBillingPaymentsScreen)
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import {
  NigerianPaymentRails,
  PaymentSignatureVerifier,
  InitializePaymentOptions,
} from '../shared/services/payment/PaymentService';
import { MockPaymentProvider } from '../shared/services/payment/MockPaymentProvider';
import { MockPayoutProvider } from '../shared/services/payment/MockPayoutProvider';
import { ApiService } from '../mobile/src/services/api';
import { MobilePaymentService } from '../mobile/src/services/payment/MobilePaymentService';

async function runPaymentEscrowMobileTests() {
  console.log('\n=============================================================');
  console.log('  MENIAL — PILLAR 3: MOBILE PAYMENT & ESCROW TEST SUITE      ');
  console.log('=============================================================\n');

  // ========================================================================
  // 1. NIGERIAN PAYMENT RAILS & CARD VALIDATION (LUHN, BRANDS, EXPIRY, CVV)
  // ========================================================================
  console.log('--- 1. NIGERIAN PAYMENT RAILS & CARD VALIDATION ---');

  // 1.1 Card Brand Detection
  assert.strictEqual(NigerianPaymentRails.detectCardBrand('4111222233334444'), 'visa');
  assert.strictEqual(NigerianPaymentRails.detectCardBrand('5399410000000000'), 'mastercard');
  assert.strictEqual(NigerianPaymentRails.detectCardBrand('5061001234567890'), 'verve');
  assert.strictEqual(NigerianPaymentRails.detectCardBrand('6500021234567890'), 'verve');
  assert.strictEqual(NigerianPaymentRails.detectCardBrand('1234567890123456'), 'unknown');
  console.log('✅ PASS: Domestic and International card brand detection (Visa, Mastercard, Verve)');

  // 1.2 Luhn Algorithm Check
  // Valid Visa test card
  assert.strictEqual(NigerianPaymentRails.validateCardNumber('4084084112344242'), true);
  // Valid Mastercard test card
  assert.strictEqual(NigerianPaymentRails.validateCardNumber('5555555555554444'), true);
  // Invalid Luhn
  assert.strictEqual(NigerianPaymentRails.validateCardNumber('4084084112344243'), false);
  // Invalid lengths
  assert.strictEqual(NigerianPaymentRails.validateCardNumber('12345'), false);
  console.log('✅ PASS: Standard Luhn checksum algorithm strictly enforced');

  // 1.3 Expiry Date Verification
  assert.strictEqual(NigerianPaymentRails.validateCardExpiry('12', '28'), true);
  assert.strictEqual(NigerianPaymentRails.validateCardExpiry('01', '24'), false); // Expired past date
  assert.strictEqual(NigerianPaymentRails.validateCardExpiry('13', '28'), false); // Invalid month 13
  assert.strictEqual(NigerianPaymentRails.validateCardExpiry('00', '28'), false); // Invalid month 00
  console.log('✅ PASS: Expiry month (01-12) and future year validation verified');

  // 1.4 CVV Check & Formatter
  assert.strictEqual(NigerianPaymentRails.validateCvv('123'), true);
  assert.strictEqual(NigerianPaymentRails.validateCvv('1234'), true);
  assert.strictEqual(NigerianPaymentRails.validateCvv('12'), false);
  assert.strictEqual(NigerianPaymentRails.formatCardNumber('4084084112344242'), '4084 0841 1234 4242');
  console.log('✅ PASS: CVV security code validation and 4-digit space formatting verified');

  // ========================================================================
  // 2. DYNAMIC VIRTUAL NIP ACCOUNT GENERATION & EXPIRATION (§38)
  // ========================================================================
  console.log('\n--- 2. DYNAMIC VIRTUAL NIP ACCOUNT GENERATION ---');

  const paymentProvider = new MockPaymentProvider();
  const vaResult = await paymentProvider.initializePayment({
    jobId: 'job_test_escrow_01',
    publicJobId: 'MNL-2026-9001',
    amountKobo: 3300000, // ₦33,000
    employerEmail: 'employer@test.ng',
    employerPhone: '+2348011223344',
    channel: 'bank_transfer',
  });

  assert.strictEqual(vaResult.success, true);
  assert(vaResult.virtualAccount, 'Virtual account details must be present');
  assert(vaResult.virtualAccount.accountNumber.startsWith('992'), 'Virtual NUBAN begins with Wema/Monnify 992 prefix');
  assert.strictEqual(vaResult.virtualAccount.accountNumber.length, 10, 'NUBAN account must be exactly 10 digits');
  assert(vaResult.virtualAccount.accountName.includes('MNL-2026-9001'), 'Account name maps to job public identifier');

  // Expiry in ~30 minutes
  const expiresTimestamp = new Date(vaResult.virtualAccount.expiresAt).getTime();
  const diffMinutes = (expiresTimestamp - Date.now()) / (60 * 1000);
  assert(diffMinutes > 28 && diffMinutes <= 31, 'Virtual account has 30-minute validity window');
  console.log('✅ PASS: Dedicated dynamic virtual NIP bank account generation with 30-min window verified');

  // ========================================================================
  // 3. USSD BANK CODE GENERATION ACROSS NIGERIAN BANKS
  // ========================================================================
  console.log('\n--- 3. USSD BANK CODE GENERATION ---');

  const gtbUssd = NigerianPaymentRails.generateUssdCode('058', 15000, '9928310481');
  assert.strictEqual(gtbUssd, '*737*50*15000*9928310481#');

  const zenithUssd = NigerianPaymentRails.generateUssdCode('057', 15000, '9928310481');
  assert.strictEqual(zenithUssd, '*966*15000*9928310481#');

  const accessUssd = NigerianPaymentRails.generateUssdCode('044', 15000, '9928310481');
  assert.strictEqual(accessUssd, '*901*15000*9928310481#');

  const firstBankUssd = NigerianPaymentRails.generateUssdCode('011', 15000, '9928310481');
  assert.strictEqual(firstBankUssd, '*894*15000*9928310481#');

  const ubaUssd = NigerianPaymentRails.generateUssdCode('033', 15000, '9928310481');
  assert.strictEqual(ubaUssd, '*919*15000*9928310481#');

  console.log('✅ PASS: USSD dial strings accurate for GTBank (*737#), Zenith (*966#), Access (*901#), First Bank (*894#), UBA (*919#)');

  // ========================================================================
  // 4. 3D SECURE (3DS) OTP CHALLENGE VERIFICATION (§37, §39)
  // ========================================================================
  console.log('\n--- 4. 3D SECURE OTP CHALLENGE VERIFICATION ---');

  const cardInitResult = await paymentProvider.initializePayment({
    jobId: 'job_test_escrow_02',
    publicJobId: 'MNL-2026-9002',
    amountKobo: 2500000, // ₦25,000
    employerEmail: 'employer@test.ng',
    employerPhone: '+2348011223344',
    channel: 'card',
    cardDetails: {
      cardNumber: '4084084112344242',
      expiryMonth: '11',
      expiryYear: '27',
      cvv: '123',
    },
  });

  assert.strictEqual(cardInitResult.success, true);
  assert.strictEqual(cardInitResult.requires3DS, true, 'Card payments mandate 3DS authentication challenge');
  assert(cardInitResult.authUrl, '3DS challenge authorization URL generated');

  // Attempt 1: Invalid OTP declines transaction
  const invalidOtpRes = await paymentProvider.submitCardOtp(cardInitResult.providerReference, '000000');
  assert.strictEqual(invalidOtpRes.success, false);
  assert(invalidOtpRes.error?.includes('declined'), 'Invalid OTP yields declined error');

  // Attempt 2: Valid OTP (123456) authorizes transaction
  const validOtpRes = await paymentProvider.submitCardOtp(cardInitResult.providerReference, '123456');
  assert.strictEqual(validOtpRes.success, true);

  // Status is now successful
  const statusRes = await paymentProvider.queryPaymentStatus!(cardInitResult.providerReference);
  assert.strictEqual(statusRes.status, 'successful');
  assert.strictEqual(statusRes.amountKobo, 2500000);
  console.log('✅ PASS: 3D Secure OTP verification correctly authorizes valid OTPs and declines invalid codes');

  // ========================================================================
  // 5. HMAC-SHA512 WEBHOOK SIGNATURE & REPLAY DEFENSE (§37, §39, §89)
  // ========================================================================
  console.log('\n--- 5. WEBHOOK SIGNATURE & REPLAY DEFENSE ---');

  const webhookSecret = 'sk_live_test_secret_menial_escrow_key_991823';
  paymentProvider.setSecretKey(webhookSecret);

  // Initialize a transaction to receive webhook
  const whInit = await paymentProvider.initializePayment({
    jobId: 'job_test_escrow_03',
    publicJobId: 'MNL-2026-9003',
    amountKobo: 1800000, // ₦18,000
    employerEmail: 'employer@test.ng',
    employerPhone: '+2348011223344',
  });

  const payload = {
    event: 'charge.success' as const,
    providerReference: whInit.providerReference,
    amountKobo: 1800000,
    currency: 'NGN' as const,
  };
  const rawBody = JSON.stringify(payload);

  // Generate valid HMAC-SHA512
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const crypto = require('crypto');
  const validSignature = crypto.createHmac('sha512', webhookSecret).update(rawBody).digest('hex');

  // 5.1 Forged signature rejected (§89)
  const forgedResult = await paymentProvider.handleWebhook(
    { ...payload, signature: 'forged_fake_signature_abc123' },
    rawBody
  );
  assert.strictEqual(forgedResult.success, false);
  assert(forgedResult.error?.includes('signature'), 'Forged signature strictly rejected');

  // 5.2 Valid signature accepted
  const legitimateResult = await paymentProvider.handleWebhook(
    { ...payload, signature: validSignature },
    rawBody
  );
  assert.strictEqual(legitimateResult.success, true);
  assert.strictEqual(legitimateResult.isIdempotentReplay, false);

  // 5.3 Duplicate webhook replay rejected as idempotent (§39)
  const duplicateReplay = await paymentProvider.handleWebhook(
    { ...payload, signature: validSignature },
    rawBody
  );
  assert.strictEqual(duplicateReplay.success, true);
  assert.strictEqual(duplicateReplay.isIdempotentReplay, true, 'Duplicate webhook identified as idempotent replay');

  // 5.4 Amount mismatch verification
  const whInit2 = await paymentProvider.initializePayment({
    jobId: 'job_test_escrow_04',
    publicJobId: 'MNL-2026-9004',
    amountKobo: 5000000, // ₦50,000
    employerEmail: 'employer@test.ng',
    employerPhone: '+2348011223344',
  });
  const mismatchPayload = {
    event: 'charge.success' as const,
    providerReference: whInit2.providerReference,
    amountKobo: 4000000, // ₦40,000 (Tampered amount!)
    currency: 'NGN' as const,
  };
  const mismatchRaw = JSON.stringify(mismatchPayload);
  const mismatchSig = crypto.createHmac('sha512', webhookSecret).update(mismatchRaw).digest('hex');
  const mismatchResult = await paymentProvider.handleWebhook(
    { ...mismatchPayload, signature: mismatchSig },
    mismatchRaw
  );
  assert.strictEqual(mismatchResult.success, false);
  assert(mismatchResult.error?.includes('Amount mismatch'), 'Amount mismatch strictly rejected');

  console.log('✅ PASS: HMAC-SHA512 verification, duplicate replay defense, and amount mismatch defenses verified');

  // ========================================================================
  // 6. ESCROW FUNDING LIFECYCLE & JOB STATE TRANSITIONS
  // ========================================================================
  console.log('\n--- 6. ESCROW FUNDING LIFECYCLE IN APISERVICE ---');

  // Create active job in store
  const testJob = await ApiService.createJob({
    title: 'Post-Construction Site Clean-up',
    description: 'Thorough post-construction debris removal',
    categoryId: 'cat_cleaning',
    numberOfWorkers: 1,
    workerPayKobo: 2000000, // ₦20,000
    locationText: 'Victoria Island, Lagos',
    latitude: 6.4281,
    longitude: 3.4219,
    scheduledDate: '2026-10-01',
  });

  const initEscrow = await ApiService.initializeEscrowPayment({
    jobId: testJob.jobId,
    publicJobId: testJob.publicJobId,
    amountKobo: testJob.pricing.totalAmountKobo,
    employerEmail: 'employer@menial.ng',
    employerPhone: '+2348098765432',
    channel: 'card',
  });

  assert.strictEqual(initEscrow.success, true);

  // Confirm escrow payment
  const confirmResult = await ApiService.confirmEscrowPayment(
    initEscrow.providerReference,
    testJob.pricing.totalAmountKobo,
    testJob.jobId
  );
  assert.strictEqual(confirmResult.success, true);

  // Retrieve updated job
  const updatedJob = ApiService.getActiveJob(testJob.jobId);
  assert(updatedJob, 'Job exists');
  assert.strictEqual(updatedJob.status, 'payment_secured', 'Job transitions to payment_secured');
  assert.strictEqual(updatedJob.isEscrowFunded, true, 'isEscrowFunded is true');
  assert.strictEqual(updatedJob.escrowReference, initEscrow.providerReference);
  console.log('✅ PASS: Job state machine transitions to payment_secured with escrowReference');

  // ========================================================================
  // 7. DOUBLE-ENTRY BALANCED LEDGER SETTLEMENT ON COMPLETION (§40, §44)
  // ========================================================================
  console.log('\n--- 7. DOUBLE-ENTRY BALANCED LEDGER SETTLEMENT ---');

  // Transition job through execution to completion
  await ApiService.startTravel(testJob.jobId);
  await ApiService.arriveAtJob(testJob.jobId, 'https://storage.menial.dev/arrival.jpg');
  await ApiService.startWork(testJob.jobId);
  await ApiService.completeWork(testJob.jobId, 'https://storage.menial.dev/completion.jpg', 'Job finished');

  // Confirm completion (triggers ledger release to worker)
  await ApiService.confirmCompletion(testJob.jobId);

  const completedJob = ApiService.getActiveJob(testJob.jobId);
  assert.strictEqual(completedJob?.status, 'completed');
  assert.strictEqual(completedJob?.isEscrowReleased, true);

  // Verify worker ledger transactions
  const workerTxList = ApiService.getLedgerTransactions('worker_adebayo');
  const jobReleaseEntry = workerTxList.find((e) => e.jobId === testJob.jobId && e.relatedType === 'payment');
  assert(jobReleaseEntry, 'Ledger entry for escrow release exists');
  assert.strictEqual(jobReleaseEntry.amountKobo, 2000000, 'Worker credited exactly agreed workerPayKobo');
  assert.strictEqual(jobReleaseEntry.currency, 'NGN');
  console.log('✅ PASS: Job completion releases escrow and writes append-only double-entry credit');

  // ========================================================================
  // 8. WORKER 10-DIGIT NUBAN RESOLUTION & INSTANT NIP BANK WITHDRAWAL (§41, §42)
  // ========================================================================
  console.log('\n--- 8. WORKER NUBAN RESOLUTION & NIP BANK WITHDRAWAL ---');

  // 8.1 10-Digit NUBAN Account Resolution
  const validNuban = await ApiService.validateNuban('0123456789', '044'); // Access Bank
  assert.strictEqual(validNuban.valid, true);
  assert.strictEqual(validNuban.accountName, 'VERIFIED WORKER HOLDER');

  const invalidNuban = await ApiService.validateNuban('12345', '044'); // Less than 10 digits
  assert.strictEqual(invalidNuban.valid, false);
  assert(invalidNuban.error?.includes('10 digits'));

  const unsupportedBank = await ApiService.validateNuban('0123456789', '999'); // Unknown bank
  assert.strictEqual(unsupportedBank.valid, false);
  console.log('✅ PASS: NUBAN account validation strictly validates 10 digits and CBN bank code');

  // 8.2 Worker Earnings Summary Calculation
  const summaryBefore = ApiService.getWorkerEarningsSummary('worker_adebayo');
  assert(summaryBefore.availableBalanceKobo > 0, 'Worker has positive available balance from completed jobs');

  // 8.3 Overdraw Prevention (§41, §42)
  const overdrawResult = await ApiService.withdrawEarnings({
    workerId: 'worker_adebayo',
    amountKobo: summaryBefore.availableBalanceKobo + 5000000, // Excess amount
    bankAccount: {
      accountNumber: '0123456789',
      bankCode: '044',
      accountName: 'VERIFIED WORKER HOLDER',
    },
  });
  assert.strictEqual(overdrawResult.success, false);
  assert(overdrawResult.error?.includes('Insufficient'), 'Overdraw attempt rejected');

  // 8.4 Valid Withdrawal Execution via NIP Transfer
  const withdrawalAmount = 1000000; // ₦10,000
  const validWithdrawal = await ApiService.withdrawEarnings({
    workerId: 'worker_adebayo',
    amountKobo: withdrawalAmount,
    bankAccount: {
      accountNumber: '0123456789',
      bankCode: '044',
      accountName: 'VERIFIED WORKER HOLDER',
    },
  });
  assert.strictEqual(validWithdrawal.success, true);
  assert(validWithdrawal.providerReference.startsWith('mock_payout_nip_'));
  assert.strictEqual(validWithdrawal.amountKobo, withdrawalAmount);

  // 8.5 Post-Withdrawal Balance Check
  const summaryAfter = ApiService.getWorkerEarningsSummary('worker_adebayo');
  assert.strictEqual(
    summaryAfter.availableBalanceKobo,
    summaryBefore.availableBalanceKobo - withdrawalAmount,
    'Available balance decremented by exact integer kobo withdrawn'
  );
  assert.strictEqual(
    summaryAfter.totalWithdrawnKobo,
    summaryBefore.totalWithdrawnKobo + withdrawalAmount,
    'Total withdrawn incremented accurately'
  );
  console.log('✅ PASS: Worker instant NIP withdrawal with debit ledger entry and overdraw protection');

  // ========================================================================
  // 9. MOBILE SCREEN & COMPONENT ARCHITECTURE INVARIANTS
  // ========================================================================
  console.log('\n--- 9. SCREEN ARCHITECTURE & COMPONENT INVARIANTS ---');

  const escrowScreenPath = path.resolve(
    __dirname,
    '../mobile/src/screens/employer/discover/EscrowPaymentScreen.tsx'
  );
  assert(fs.existsSync(escrowScreenPath), 'EscrowPaymentScreen exists');
  const escrowSrc = fs.readFileSync(escrowScreenPath, 'utf8');

  assert(escrowSrc.includes('Card3DSModal'), 'Integrates 3D Secure modal');
  assert(escrowSrc.includes('virtualAccount'), 'Displays dedicated virtual NIP account');
  assert(escrowSrc.includes('detectedBrand'), 'Detects card brand (Visa/Mastercard/Verve)');
  assert(escrowSrc.includes('handleDialUssd'), 'Supports USSD telephony dialing');
  assert(
    escrowSrc.includes('menial Escrow Protection') || escrowSrc.includes('Menial Escrow Protection'),
    'Displays institutional trust guarantee'
  );

  const card3dsPath = path.resolve(
    __dirname,
    '../mobile/src/components/payment/Card3DSModal.tsx'
  );
  assert(fs.existsSync(card3dsPath), 'Card3DSModal component exists');
  const card3dsSrc = fs.readFileSync(card3dsPath, 'utf8');
  assert(card3dsSrc.includes('3D Secure Authentication'), 'Includes 3DS header');
  assert(card3dsSrc.includes('123456'), 'Includes sandbox test OTP hint');

  const employerBillingPath = path.resolve(
    __dirname,
    '../mobile/src/screens/employer/settings/EmployerBillingPaymentsScreen.tsx'
  );
  assert(fs.existsSync(employerBillingPath), 'EmployerBillingPaymentsScreen exists');
  const billingSrc = fs.readFileSync(employerBillingPath, 'utf8');
  assert(billingSrc.includes('CBN-Licensed Escrow Protection'), 'Includes CBN escrow compliance notice');

  console.log('✅ PASS: Mobile UI payment components adhere to specifications and design system');

  console.log('\n=============================================================');
  console.log('   🎉 ALL PILLAR 3 PAYMENT & ESCROW TESTS PASSED (100%)       ');
  console.log('=============================================================\n');
}

runPaymentEscrowMobileTests().catch((err) => {
  console.error('\n❌ PILLAR 3 PAYMENT ESCROW TEST SUITE FAILED:', err);
  process.exit(1);
});
