/**
 * Slice 2 Verification Test Suite: Worker Onboarding + NIN Verification Screens
 * 
 * Verifies:
 * 1. Worker profile onboarding wired to ProfileService (bio, kobo rate conversion, radius, categories).
 * 2. NIN 11-digit syntax validation and NDPA compliance masking (*******XXXX per §80).
 * 3. Verification state machine transitions: UNVERIFIED -> PENDING -> VERIFIED / REJECTED (§22, §25).
 * 4. Screens coverage and integration in WorkerNavigator (WorkerProfileSetup, WorkerVerification, VerificationStatus).
 */

import * as fs from 'fs';
import * as path from 'path';
import { ApiService, profileService, verificationProvider, SEED_CATEGORIES } from '../mobile/src/services/api';
import { formatKoboToNaira } from '../mobile/src/constants/theme';

async function runSlice2Tests() {
  console.log('====================================================');
  console.log('  MENIAL MOBILE — SLICE 2 VERIFICATION TEST SUITE   ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      failed++;
    }
  }

  // --------------------------------------------------------------------------
  // TEST 1: Categories & Wage Rate Kobo Conversion (§4, §22, §26)
  // --------------------------------------------------------------------------
  console.log('--- 1. CATEGORIES & WAGE RATE KOBO CONVERSION ---');
  const categories = ApiService.getCategories();
  assert(categories.length >= 8, 'At least 8 seed categories loaded from Section 26');

  const cleaningCat = categories.find((c) => c.id === 'cat_cleaning');
  assert(cleaningCat !== undefined && cleaningCat.name === 'House Cleaning', 'House Cleaning category exists');
  assert(cleaningCat?.suggestedRateKobo === 350000, 'Cleaning suggested rate is 350,000 kobo (₦3,500)');
  assert(formatKoboToNaira(cleaningCat!.suggestedRateKobo) === '₦3,500', 'formatKoboToNaira formats 350,000 kobo as ₦3,500');

  // Test worker onboarding profile submission
  const testBio = 'Experienced residential cleaner and artisan with 5 years experience across Lagos.';
  const rateNaira = 4500;
  const rateKobo = rateNaira * 100; // 450,000 kobo
  const radiusKm = 20;
  const categoryIds = ['cat_cleaning', 'cat_laundry'];

  await ApiService.completeWorkerOnboarding({
    bio: testBio,
    indicativeRateKobo: rateKobo,
    serviceRadiusKm: radiusKm,
    categoryIds,
  });

  const storedProfile = ApiService.getStoredWorkerProfile();
  assert(storedProfile !== undefined, 'Worker profile saved via ProfileService');
  assert(storedProfile?.indicativeRateKobo === 450000, 'Wage rate stored in integer kobo (450,000 kobo)');
  assert(storedProfile?.serviceRadiusKm === 20, 'Service radius stored as 20km');
  assert(storedProfile?.categoryIds.length === 2, '2 service categories linked to worker');

  // --------------------------------------------------------------------------
  // TEST 2: NIN Syntax Validation & NDPA Masking (§80)
  // --------------------------------------------------------------------------
  console.log('\n--- 2. NIN VALIDATION & NDPA PRIVACY MASKING (§80) ---');
  // 2.1: Rejection of invalid NINs
  const shortNin = ApiService.validateDocumentNumber('nin', '123456789'); // 9 digits
  assert(!shortNin.valid, 'NIN shorter than 11 digits is rejected');
  assert(
    shortNin.error !== undefined && shortNin.error.includes('11 digits'),
    'Error message specifies exact 11 digits requirement'
  );

  const nonNumericNin = ApiService.validateDocumentNumber('nin', '1234567890A');
  assert(!nonNumericNin.valid, 'NIN with non-numeric character is rejected');

  // 2.2: Valid NIN with NDPA masking
  const validRawNin = '12345678901';
  const validNin = ApiService.validateDocumentNumber('nin', validRawNin);
  assert(validNin.valid === true, '11-digit numeric NIN passes validation');
  assert(
    validNin.maskedNumber === '*******8901',
    `NIN properly masked for NDPA compliance (expected *******8901, got ${validNin.maskedNumber})`
  );

  // --------------------------------------------------------------------------
  // TEST 3: Verification State Machine Transitions (§22, §25, §61)
  // --------------------------------------------------------------------------
  console.log('\n--- 3. VERIFICATION STATE MACHINE TRANSITIONS ---');
  const workerId = 'worker_test_user_slice2';

  // 3.1: Initial standing
  const initialStatus = ApiService.getWorkerVerificationStatus(workerId);
  assert(initialStatus === 'unverified', 'Worker starts in unverified status');

  // 3.2: Submission -> pending
  const submitRes = await ApiService.submitWorkerVerification(workerId, {
    verificationType: 'id_document',
    documentType: 'nin',
    documentUrl: 'supabase://documents/worker_slice2_nin.jpg',
    metadata: { idNumber: validRawNin },
  });
  assert(submitRes.success === true, 'Verification submission succeeds');
  assert(submitRes.status === 'pending', 'Verification transitions to pending status');
  assert(
    ApiService.getWorkerVerificationStatus(workerId) === 'pending',
    'Worker profile status is now pending'
  );

  // 3.3: Admin Rejection
  const adminId = 'admin_ops_99';
  const rejectRes = await ApiService.reviewVerificationSubmission(
    adminId,
    submitRes.verificationId,
    'reject',
    'NIN document image is illegible'
  );
  assert(rejectRes.status === 'rejected', 'Administrative rejection transitions status to rejected');
  assert(
    ApiService.getWorkerVerificationStatus(workerId) === 'rejected',
    'Worker profile status is now rejected'
  );

  // 3.4: Re-submission after rejection
  const resubmitRes = await ApiService.submitWorkerVerification(workerId, {
    verificationType: 'id_document',
    documentType: 'nin',
    documentUrl: 'supabase://documents/worker_slice2_nin_hd.jpg',
    metadata: { idNumber: validRawNin },
  });
  assert(resubmitRes.status === 'pending', 'Re-submission transitions status back to pending');

  // 3.5: Admin Approval -> verified
  const approveRes = await ApiService.reviewVerificationSubmission(
    adminId,
    resubmitRes.verificationId,
    'approve'
  );
  assert(approveRes.status === 'verified', 'Administrative approval transitions status to verified');
  assert(
    ApiService.getWorkerVerificationStatus(workerId) === 'verified',
    'Worker profile standing is now verified pro'
  );

  // --------------------------------------------------------------------------
  // TEST 4: Slice 2 Screen Coverage & Navigator Integration
  // --------------------------------------------------------------------------
  console.log('\n--- 4. SLICE 2 SCREEN COVERAGE & INTEGRATION ---');
  const screensDir = path.join(__dirname, '../mobile/src/screens/worker');
  assert(
    fs.existsSync(path.join(screensDir, 'WorkerProfileSetupScreen.tsx')),
    'WorkerProfileSetupScreen.tsx exists'
  );
  assert(
    fs.existsSync(path.join(screensDir, 'WorkerVerificationScreen.tsx')),
    'WorkerVerificationScreen.tsx exists'
  );
  assert(
    fs.existsSync(path.join(screensDir, 'VerificationStatusScreen.tsx')),
    'VerificationStatusScreen.tsx exists'
  );

  // Navigator integration check
  const workerNavPath = path.join(__dirname, '../mobile/src/navigation/WorkerNavigator.tsx');
  const workerNavCode = fs.readFileSync(workerNavPath, 'utf-8');
  assert(
    workerNavCode.includes('WorkerProfileSetupScreen') &&
      workerNavCode.includes('WorkerVerificationScreen') &&
      workerNavCode.includes('VerificationStatusScreen'),
    'WorkerNavigator integrates all 3 Slice 2 screens'
  );
  assert(
    workerNavCode.includes('WorkerProvider'),
    'WorkerNavigator wraps tab hierarchy in WorkerProvider context'
  );

  console.log('\n====================================================');
  console.log(`  RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runSlice2Tests().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
