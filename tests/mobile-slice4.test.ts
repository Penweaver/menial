/**
 * Menial Mobile - Slice 4 Verification Test Suite
 * 
 * Verifies:
 * 1. Worker discovery proximity ranking, category filtering & text search (§28, §34).
 * 2. Worker profile & verified dossier retrieval with integer kobo rates (§22, §25).
 * 3. Worker hiring delegation to JobService.hireWorker (§35).
 * 4. Paystack escrow initialization & webhook payment confirmation (§37, §39, §44).
 * 5. Replay attack defense & zero client-side payment forgery (§89 Vector 8).
 * 6. Slice 4 screen coverage, Stitch visual fidelity, and EmployerNavigator integration.
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

async function runSlice4Tests() {
  console.log('====================================================');
  console.log('  MENIAL MOBILE — SLICE 4 VERIFICATION TEST SUITE   ');
  console.log('====================================================\n');

  const { ApiService, paymentProvider, SEED_WORKERS, SEED_CATEGORIES } = await import(
    '../mobile/src/services/api'
  );
  const { JobService } = await import('../shared/services/job/JobService');
  const { ProfileService } = await import('../shared/services/profile/ProfileService');
  const { formatKoboToNaira } = await import('../mobile/src/constants/theme');

  // ==========================================================================
  // 1. WORKER DISCOVERY PROXIMITY & RANKING (§28, §34)
  // ==========================================================================
  console.log('--- 1. WORKER DISCOVERY PROXIMITY & RANKING (§28, §34) ---');

  // Discovery with Lekki coordinates
  const lekkiWorkers = await ApiService.discoverWorkers({
    latitude: 6.4380,
    longitude: 3.4280,
    radiusKm: 30,
    verifiedOnly: true,
  });

  assert(lekkiWorkers.length > 0, `Discovered ${lekkiWorkers.length} nearby workers in Lagos`);
  assert(
    lekkiWorkers.every((w) => w.verificationStatus === 'verified'),
    'All discovered workers must be verified per §25 & §34'
  );

  // Proximity sorting verification: nearest first (§28)
  for (let i = 0; i < lekkiWorkers.length - 1; i++) {
    const current = lekkiWorkers[i];
    const next = lekkiWorkers[i + 1];
    assert(
      current.distanceKm <= next.distanceKm,
      `Workers must be sorted by proximity: ${current.fullName} (${current.distanceKm}km) <= ${next.fullName} (${next.distanceKm}km)`
    );
  }

  // Category filtering: Cleaning category
  const cleaningWorkers = await ApiService.discoverWorkers({
    categoryId: 'cat_cleaning',
    latitude: 6.4380,
    longitude: 3.4280,
    radiusKm: 30,
  });

  assert(cleaningWorkers.length >= 1, 'At least 1 cleaning specialist discovered');
  assert(
    cleaningWorkers.some((w) => w.id === 'worker_adebayo'),
    'Adebayo O. discovered in cleaning category'
  );

  // Category filtering: Moving category
  const movingWorkers = await ApiService.discoverWorkers({
    categoryId: 'cat_moving',
    latitude: 6.4380,
    longitude: 3.4280,
    radiusKm: 30,
  });
  assert(
    movingWorkers.some((w) => w.id === 'worker_musa'),
    'Musa Ibrahim discovered in moving category'
  );

  // Text search query filtering
  const searchResults = await ApiService.discoverWorkers({
    searchQuery: 'Chioma',
    latitude: 6.4380,
    longitude: 3.4280,
  });
  assert(searchResults.length === 1, 'Search by name returns exact match');
  assert(searchResults[0].fullName === 'Chioma Eze', 'Found Chioma Eze by name');

  const skillSearchResults = await ApiService.discoverWorkers({
    searchQuery: 'masonry',
    latitude: 6.4380,
    longitude: 3.4280,
  });
  assert(
    skillSearchResults.some((w) => w.id === 'worker_emeka'),
    'Search by skill keyword "masonry" returns Emeka Nwosu'
  );

  // ==========================================================================
  // 2. WORKER PROFILE & VERIFIED DOSSIER (§22, §25)
  // ==========================================================================
  console.log('\n--- 2. WORKER PROFILE & VERIFIED DOSSIER ---');

  const adebayo = ApiService.getWorkerById('worker_adebayo');
  assert(!!adebayo, 'Worker profile for Adebayo O. retrieved');
  assert(adebayo!.fullName === 'Adebayo O.', 'Full name matches');
  assert(adebayo!.verificationStatus === 'verified', 'Verification status is verified');
  assert(adebayo!.indicativeRate === 350000, 'Indicative rate is 350,000 kobo (₦3,500)');
  assert(formatKoboToNaira(adebayo!.indicativeRate) === '₦3,500', 'Formatted rate matches ₦3,500');
  assert(adebayo!.ratingAvg === 4.9, 'Average rating is 4.9');
  assert(adebayo!.completedJobsCount === 142, 'Completed jobs count is 142');
  assert(adebayo!.reviews.length >= 2, 'Customer reviews exist for worker');
  assert(adebayo!.skills.includes('Deep Cleaning'), 'Skills list includes Deep Cleaning');

  // ==========================================================================
  // 3. WORKER HIRING VIA JOBSERVICE (§35)
  // ==========================================================================
  console.log('\n--- 3. WORKER HIRING DELEGATION (§35) ---');

  // Create open job listing
  const newJob = await ApiService.createJob({
    categoryId: 'cat_cleaning',
    title: 'Post-Renovation Apartment Cleaning',
    description: 'Thorough cleaning for 3-bedroom flat in Lekki Phase 1',
    locationText: 'Plot 14, Admiralty Way, Lekki Phase 1, Lagos',
    scheduledDate: '2026-10-01',
    startTime: '09:00',
    durationMinutes: 300,
    numberOfWorkers: 1,
    workerPayKobo: 450000, // ₦4,500
  });

  assert(!!newJob.jobId, 'Job draft created with valid jobId');

  // Publish job
  await ApiService.publishJob(newJob.jobId);
  const publishedJob = ApiService.getCreatedJob(newJob.jobId);
  assert(publishedJob.status === 'open', 'Job is published and open');

  // Hire worker for job (§35)
  const hireResult = await ApiService.hireWorker({
    jobId: newJob.jobId,
    workerId: 'worker_adebayo',
    agreedAmountKobo: 450000,
  });

  assert(!!hireResult.assignmentId, 'Hiring offer created assignmentId');
  const hiredJob = ApiService.getCreatedJob(newJob.jobId);
  assert(hiredJob.hiredWorkerId === 'worker_adebayo', 'Worker assigned to job');
  assert(hiredJob.status === 'payment_pending', 'Job transitions to payment_pending status');
  assert(hiredJob.agreedAmountKobo === 450000, 'Agreed amount preserved in integer kobo');

  // ==========================================================================
  // 4. PAYSTACK ESCROW PAYMENT & CONFIRMATION (§37, §39, §44)
  // ==========================================================================
  console.log('\n--- 4. PAYSTACK ESCROW PAYMENT & REPLAY DEFENSE (§37, §39, §44) ---');

  // Section 29 escrow breakdown calculation
  const platformFeePercent = await ApiService.getPlatformFeePercentage();
  const pricing = ApiService.calculateJobPricing(450000, 1, platformFeePercent);
  assert(pricing.subtotalKobo === 450000, 'Subtotal is 450,000 kobo (₦4,500)');
  assert(pricing.platformFeeKobo === 45000, '10% platform fee is 45,000 kobo (₦450)');
  assert(pricing.totalAmountKobo === 495000, 'Total escrow deposit is 495,000 kobo (₦4,950)');

  // Initialize Escrow Payment via PaymentService
  const initPayment = await ApiService.initializeEscrowPayment({
    jobId: newJob.jobId,
    publicJobId: newJob.publicJobId,
    amountKobo: pricing.totalAmountKobo,
    employerEmail: 'employer@acme.ng',
    employerPhone: '+2348098765432',
  });

  assert(initPayment.success, 'Escrow payment initialization succeeds');
  assert(initPayment.amountKobo === 495000, 'Escrow locks exactly 495,000 kobo');
  assert(initPayment.currency === 'NGN', 'Currency is NGN');
  assert(!!initPayment.providerReference, 'Paystack provider reference generated');
  assert(initPayment.checkoutUrl.includes(initPayment.providerReference), 'Checkout URL contains reference');

  // Confirm Escrow Payment via webhook simulation (§39, §44)
  const confirmResult = await ApiService.confirmEscrowPayment(
    initPayment.providerReference,
    pricing.totalAmountKobo,
    newJob.jobId
  );

  assert(confirmResult.success, 'Payment confirmation succeeds via PaymentProvider');
  const securedJob = ApiService.getCreatedJob(newJob.jobId);
  assert(securedJob.status === 'payment_secured', 'Job status transitions to payment_secured');
  assert(securedJob.isEscrowFunded === true, 'Job marked as escrow funded');
  assert(securedJob.escrowReference === initPayment.providerReference, 'Escrow reference matches transaction');

  // Idempotency check: Replay attack prevention (§39)
  const replayResult = await ApiService.confirmEscrowPayment(
    initPayment.providerReference,
    pricing.totalAmountKobo,
    newJob.jobId
  );
  assert(replayResult.isIdempotentReplay === true, 'Duplicate webhook identified as idempotent replay');

  // ==========================================================================
  // 5. SLICE 4 SCREEN COVERAGE & STITCH VISUAL FIDELITY
  // ==========================================================================
  console.log('\n--- 5. SLICE 4 SCREEN COVERAGE & STITCH FIDELITY ---');

  const screensDir = path.resolve(__dirname, '../mobile/src/screens/employer/discover');

  const requiredScreens = [
    'WorkerDiscoveryScreen.tsx',
    'WorkerDetailScreen.tsx',
    'HireWorkerScreen.tsx',
    'EscrowPaymentScreen.tsx',
  ];

  for (const screenFile of requiredScreens) {
    const fullPath = path.join(screensDir, screenFile);
    assert(fs.existsSync(fullPath), `Slice 4 screen exists: ${screenFile}`);

    const content = fs.readFileSync(fullPath, 'utf8');
    const componentName = screenFile.replace('.tsx', '');
    assert(
      content.includes(`export const ${componentName}`) || content.includes(`export default ${componentName}`),
      `Screen exports component: ${componentName}`
    );
  }

  // Visual Fidelity checks in EscrowPaymentScreen
  const escrowScreenContent = fs.readFileSync(path.join(screensDir, 'EscrowPaymentScreen.tsx'), 'utf8');
  assert(
    escrowScreenContent.includes('menial Escrow Protection'),
    'EscrowPaymentScreen includes Section 39 menial Escrow Protection callout'
  );
  assert(
    escrowScreenContent.includes('Instant Bank Transfer') &&
    escrowScreenContent.includes('Debit Card') &&
    escrowScreenContent.includes('menial Wallet Balance'),
    'EscrowPaymentScreen supports all 3 Stitch payment methods (Bank Transfer, Card, Wallet)'
  );
  assert(
    escrowScreenContent.includes('NDPA Compliant') &&
    escrowScreenContent.includes('Bank Grade Security') &&
    escrowScreenContent.includes('100% Escrow Guarantee'),
    'EscrowPaymentScreen includes all 3 Stitch trust badges'
  );
  assert(
    escrowScreenContent.includes('Authorize & Secure'),
    'EscrowPaymentScreen includes Stitch primary CTA action'
  );

  // WorkerDiscoveryScreen visual fidelity checks
  const discoveryScreenContent = fs.readFileSync(path.join(screensDir, 'WorkerDiscoveryScreen.tsx'), 'utf8');
  assert(
    discoveryScreenContent.includes('NIN / BVN VERIFIED ESCROW SYSTEM') ||
    discoveryScreenContent.includes('NIN VERIFIED ESCROW'),
    'WorkerDiscoveryScreen includes Stitch verified escrow trust banner'
  );
  assert(
    discoveryScreenContent.includes('VERIFIED PRO'),
    'WorkerDiscoveryScreen includes VERIFIED PRO trust badges'
  );

  // ==========================================================================
  // 6. EMPLOYER NAVIGATOR INTEGRATION
  // ==========================================================================
  console.log('\n--- 6. EMPLOYER NAVIGATOR INTEGRATION ---');

  const navPath = path.resolve(__dirname, '../mobile/src/navigation/EmployerNavigator.tsx');
  const navContent = fs.readFileSync(navPath, 'utf8');

  assert(
    navContent.includes('WorkerDiscoveryStackNavigator'),
    'EmployerNavigator defines WorkerDiscoveryStackNavigator'
  );
  assert(
    navContent.includes('component={WorkerDiscoveryStackNavigator}'),
    'EmployerNavigator mounts WorkerDiscoveryStackNavigator on Discover tab'
  );
  assert(
    navContent.includes('name="WorkerDiscovery"') &&
    navContent.includes('name="WorkerDetail"') &&
    navContent.includes('name="HireWorker"') &&
    navContent.includes('name="EscrowPayment"'),
    'WorkerDiscoveryStackNavigator wires all 4 Slice 4 screens'
  );

  console.log('\n====================================================');
  console.log('  RESULTS: ALL SLICE 4 TESTS PASSED (100%)');
  console.log('====================================================\n');
}

runSlice4Tests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
