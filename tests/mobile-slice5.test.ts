/**
 * Menial Mobile - Slice 5 Verification Test Suite
 * 
 * Verifies:
 * 1. Worker active job lifecycle transitions (§32, §45):
 *    - payment_secured -> worker_on_way -> worker_arrived -> in_progress -> completed_by_worker.
 * 2. Photo check-in and photo check-out evidence capture (§45).
 * 3. Employer completion confirmation releasing escrow funds (§32, §39).
 * 4. Completion dispute escalation with valid DisputeReason (§46, §47).
 * 5. Section 49 Emergency SOS dispatch with incident dossier generation.
 * 6. Native WhatsApp/SMS live job share-sheet formatting (§49).
 * 7. Slice 5 screen and component coverage:
 *    - WorkerActiveJobScreen.tsx (5-step stepper, photo proof, stopwatch).
 *    - EmployerActiveJobScreen.tsx (real-time tracking, photo inspection, escrow release CTA, dispute CTA).
 *    - EmergencySosModal.tsx (Section 49 SOS dispatch, 112/767 hotlines, share sheet).
 * 8. WorkerNavigator and EmployerNavigator tab integration.
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

async function runSlice5Tests() {
  console.log('====================================================');
  console.log('  MENIAL MOBILE — SLICE 5 VERIFICATION TEST SUITE   ');
  console.log('====================================================\n');

  const { ApiService } = await import('../mobile/src/services/api');
  const { JobExecutionService } = await import('../shared/services/execution/JobExecutionService');
  const { TrustSafetyService } = await import('../shared/services/trust/TrustSafetyService');

  // ==========================================================================
  // 1. WORKER ACTIVE JOB LIFECYCLE TRANSITIONS (§32, §45)
  // ==========================================================================
  console.log('--- 1. ACTIVE JOB LIFECYCLE TRANSITIONS (§32, §45) ---');

  // Create and fund a test job
  const jobResult = await ApiService.createJob({
    categoryId: 'cat_cleaning',
    title: 'Post-Construction Deep Cleaning',
    description: 'Deep cleaning for 3-bedroom apartment in Lekki Phase 1',
    locationText: 'Admiralty Way, Lekki Phase 1, Lagos',
    scheduledDate: '2026-09-25',
    startTime: '10:00:00',
    durationMinutes: 180,
    workerPayKobo: 350000,
    numberOfWorkers: 1,
  });

  const testJobId = jobResult.jobId;
  assert(!!testJobId, `Created test execution job with ID: ${testJobId}`);

  // Initialize and fund escrow so status becomes payment_secured
  const initPayment = await ApiService.initializeEscrowPayment({
    jobId: testJobId,
    publicJobId: jobResult.publicJobId,
    amountKobo: jobResult.pricing.totalAmountKobo,
    employerEmail: 'employer.slice5@test.ng',
    employerPhone: '+2348011223344',
  });
  assert(initPayment.success, 'Escrow payment initialized successfully');

  const escrowFunding = await ApiService.confirmEscrowPayment(
    initPayment.providerReference,
    jobResult.pricing.totalAmountKobo,
    testJobId
  );
  assert(escrowFunding.success, 'Escrow payment confirmed and recorded');

  let activeJob = ApiService.getActiveJob(testJobId);
  assert(activeJob?.status === 'payment_secured', 'Job status initialized to payment_secured after escrow');

  // Step 1: Worker indicates on-the-way
  await ApiService.startTravel(testJobId);
  activeJob = ApiService.getActiveJob(testJobId);
  assert(activeJob?.status === 'worker_on_way', 'Worker signals transit: status transitions to worker_on_way (§45)');

  // Step 2: Worker arrives on site with arrival photo check-in
  const arrivalPhoto = 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=300';
  await ApiService.arriveAtJob(testJobId, arrivalPhoto);
  activeJob = ApiService.getActiveJob(testJobId);
  assert(activeJob?.status === 'worker_arrived', 'Worker arrives on site: status transitions to worker_arrived (§45)');
  assert(
    (activeJob?.checkinPhotoUrl === arrivalPhoto) || (activeJob?.arrivalPhotoUrl === arrivalPhoto),
    'Arrival photo check-in URL stored accurately'
  );

  // Step 3: Worker commences work
  await ApiService.startWork(testJobId);
  activeJob = ApiService.getActiveJob(testJobId);
  assert(activeJob?.status === 'in_progress', 'Worker starts work: status transitions to in_progress (§45)');

  // Step 4: Worker completes work with departure photo & notes
  const completionPhoto = 'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=300';
  await ApiService.completeWork(testJobId, completionPhoto, 'All rooms sanitised, trash evacuated.');
  activeJob = ApiService.getActiveJob(testJobId);
  assert(
    activeJob?.status === 'completed_by_worker',
    'Worker finishes task: status transitions to completed_by_worker (§45)'
  );
  assert(
    (activeJob?.checkoutPhotoUrl === completionPhoto) || (activeJob?.completionPhotoUrl === completionPhoto),
    'Completion photo check-out URL stored accurately'
  );

  // Step 5: Employer confirms completion and releases escrow funds
  await ApiService.confirmCompletion(testJobId);
  activeJob = ApiService.getActiveJob(testJobId);
  assert(
    activeJob?.status === 'completed',
    'Employer confirms completion: status transitions to completed and releases escrow (§32, §39)'
  );

  // ==========================================================================
  // 2. DISPUTE ESCALATION (§46, §47)
  // ==========================================================================
  console.log('\n--- 2. DISPUTE ESCALATION (§46, §47) ---');

  // Create another job to test dispute escalation
  const disputeJobResult = await ApiService.createJob({
    categoryId: 'cat_moving',
    title: 'Heavy Furniture Move',
    description: 'Move 3 sofa sets to 2nd floor',
    locationText: 'Victoria Island, Lagos',
    scheduledDate: '2026-09-25',
    startTime: '14:00:00',
    durationMinutes: 120,
    workerPayKobo: 500000,
    numberOfWorkers: 1,
  });

  const disputeJobId = disputeJobResult.jobId;
  const initDisputePayment = await ApiService.initializeEscrowPayment({
    jobId: disputeJobId,
    publicJobId: disputeJobResult.publicJobId,
    amountKobo: disputeJobResult.pricing.totalAmountKobo,
    employerEmail: 'dispute.slice5@test.ng',
    employerPhone: '+2348011223355',
  });
  assert(initDisputePayment.success, 'Dispute escrow initialized');

  await ApiService.confirmEscrowPayment(
    initDisputePayment.providerReference,
    disputeJobResult.pricing.totalAmountKobo,
    disputeJobId
  );
  await ApiService.startTravel(disputeJobId);
  await ApiService.arriveAtJob(disputeJobId, 'https://example.com/photo1.jpg');
  await ApiService.startWork(disputeJobId);
  await ApiService.completeWork(disputeJobId, 'https://example.com/photo2.jpg', 'Done early');

  // Employer raises dispute for incomplete work
  const disputeRes = await ApiService.raiseDispute(
    disputeJobId,
    'incomplete_work',
    'Worker left before second sofa was moved upstairs.'
  );

  assert(!!disputeRes.disputeId, `Dispute successfully created with ID: ${disputeRes.disputeId}`);
  const disputedJob = ApiService.getActiveJob(disputeJobId);
  assert(
    disputedJob?.status === 'disputed',
    'Job status transitions to disputed: escrow release is held (§46)'
  );

  // ==========================================================================
  // 3. SECTION 49 EMERGENCY SOS DISPATCH
  // ==========================================================================
  console.log('\n--- 3. SECTION 49 EMERGENCY SOS DISPATCH ---');

  const sosRes = await ApiService.triggerEmergencySos({
    jobId: testJobId,
    description: 'Suspicious and threatening behavior encountered on site.',
    locationText: 'Admiralty Way, Lekki Phase 1, Lagos',
    latitude: 6.4380,
    longitude: 3.4280,
  });

  assert(!!sosRes.reportId, `Emergency SOS alert successfully dispatched: Report Ref ${sosRes.reportId}`);
  const recordedReport = ApiService.getSosReport(sosRes.reportId);
  assert(recordedReport !== undefined, 'SOS incident record saved in TrustSafety dossier');
  assert(
    Boolean(recordedReport?.description.includes('Suspicious and threatening behavior')),
    'SOS incident captures user-submitted incident description'
  );
  assert(
    Boolean(recordedReport?.latitude === 6.4380 && recordedReport?.longitude === 3.4280),
    'SOS incident captures GPS coordinates (§49)'
  );

  // ==========================================================================
  // 4. LIVE JOB SHARE-SHEET FORMATTING (§49)
  // ==========================================================================
  console.log('\n--- 4. LIVE JOB SHARE-SHEET FORMATTING (§49) ---');

  const shareDetails = ApiService.generateJobShareDetails({
    publicJobId: 'MNL-2026-8921',
    jobTitle: 'Deep Kitchen Cleaning',
    locationText: '14 Admiralty Way, Lekki Phase 1',
    scheduledTime: 'Today at 2:00 PM',
    counterpartyName: 'Adebayo O.',
    counterpartyRole: 'Worker',
  });

  assert(
    shareDetails.shareText.includes('Menial Safety') &&
    shareDetails.shareText.includes('MNL-2026-8921'),
    'Job share text includes safety header and job identifier'
  );
  assert(
    shareDetails.shareText.includes('Adebayo O.'),
    'Job share text identifies counterpart name for emergency tracing'
  );
  assert(
    shareDetails.shareText.includes('14 Admiralty Way, Lekki Phase 1'),
    'Job share text includes accurate location description'
  );

  // ==========================================================================
  // 5. SLICE 5 SCREEN COVERAGE & STITCH FIDELITY
  // ==========================================================================
  console.log('\n--- 5. SCREEN COVERAGE & STITCH FIDELITY ---');

  const screensDir = path.resolve(__dirname, '../mobile/src/screens');
  const componentsDir = path.resolve(__dirname, '../mobile/src/components');

  const workerActiveJobPath = path.join(screensDir, 'worker/execution/WorkerActiveJobScreen.tsx');
  const employerActiveJobPath = path.join(screensDir, 'employer/execution/EmployerActiveJobScreen.tsx');
  const emergencySosModalPath = path.join(componentsDir, 'safety/EmergencySosModal.tsx');

  assert(fs.existsSync(workerActiveJobPath), 'WorkerActiveJobScreen.tsx exists');
  assert(fs.existsSync(employerActiveJobPath), 'EmployerActiveJobScreen.tsx exists');
  assert(fs.existsSync(emergencySosModalPath), 'EmergencySosModal.tsx exists');

  // Verify WorkerActiveJobScreen features
  const workerScreenContent = fs.readFileSync(workerActiveJobPath, 'utf8');
  assert(
    workerScreenContent.includes('Start Journey') &&
    (workerScreenContent.includes('Arrived') || workerScreenContent.includes('Check-In')) &&
    (workerScreenContent.includes('Begin Work') || workerScreenContent.includes('Start Work')) &&
    (workerScreenContent.includes('Submit Work') || workerScreenContent.includes('Complete Work')),
    'WorkerActiveJobScreen implements complete execution lifecycle action CTAs'
  );
  assert(
    workerScreenContent.includes('ARRIVAL PHOTO CHECK-IN') ||
    workerScreenContent.includes('Arrival Photo Check-in') ||
    workerScreenContent.includes('takeArrivalPhoto'),
    'WorkerActiveJobScreen features arrival photo check-in (§45)'
  );
  assert(
    workerScreenContent.includes('Departure Photo') ||
    workerScreenContent.includes('checkoutPhoto'),
    'WorkerActiveJobScreen features departure photo check-out proof (§45)'
  );
  assert(
    workerScreenContent.includes('Emergency SOS') ||
    workerScreenContent.includes('EmergencySosModal'),
    'WorkerActiveJobScreen mounts Section 49 Emergency SOS modal'
  );

  // Verify EmployerActiveJobScreen features
  const employerScreenContent = fs.readFileSync(employerActiveJobPath, 'utf8');
  assert(
    employerScreenContent.includes('Confirm & Release Escrow') ||
    employerScreenContent.includes('Release Escrow'),
    'EmployerActiveJobScreen implements Confirm Completion & Release Escrow CTA (§32, §39)'
  );
  assert(
    employerScreenContent.includes('Report Issue') ||
    employerScreenContent.includes('raiseDispute'),
    'EmployerActiveJobScreen implements dispute resolution trigger (§46)'
  );
  assert(
    employerScreenContent.includes('Arrival Photo') ||
    employerScreenContent.includes('arrivalPhotoUrl'),
    'EmployerActiveJobScreen displays worker arrival photo inspection'
  );

  // Verify EmergencySosModal features
  const sosModalContent = fs.readFileSync(emergencySosModalPath, 'utf8');
  assert(
    sosModalContent.includes('112') && sosModalContent.includes('767'),
    'EmergencySosModal provides 112 (National Emergency) and 767 (Lagos State Emergency) hotlines (§49)'
  );
  assert(
    sosModalContent.includes('triggerEmergencySos'),
    'EmergencySosModal calls ApiService.triggerEmergencySos (§49)'
  );
  assert(
    sosModalContent.includes('Share.share') ||
    sosModalContent.includes('generateJobShareDetails'),
    'EmergencySosModal integrates native WhatsApp/SMS live job share-sheet (§49)'
  );

  // ==========================================================================
  // 6. WORKER & EMPLOYER NAVIGATOR INTEGRATION
  // ==========================================================================
  console.log('\n--- 6. WORKER & EMPLOYER NAVIGATOR INTEGRATION ---');

  const workerNavPath = path.resolve(__dirname, '../mobile/src/navigation/WorkerNavigator.tsx');
  const employerNavPath = path.resolve(__dirname, '../mobile/src/navigation/EmployerNavigator.tsx');

  const workerNavContent = fs.readFileSync(workerNavPath, 'utf8');
  assert(
    workerNavContent.includes('WorkerActiveJobScreen'),
    'WorkerNavigator imports WorkerActiveJobScreen'
  );
  assert(
    workerNavContent.includes('name="ActiveJob"') &&
    workerNavContent.includes('component={WorkerActiveJobScreen}'),
    'WorkerNavigator mounts WorkerActiveJobScreen on ActiveJob tab'
  );

  const employerNavContent = fs.readFileSync(employerNavPath, 'utf8');
  assert(
    employerNavContent.includes('EmployerActiveJobScreen'),
    'EmployerNavigator imports EmployerActiveJobScreen'
  );
  assert(
    employerNavContent.includes('name="MyJobs"') &&
    employerNavContent.includes('component={EmployerActiveJobScreen}'),
    'EmployerNavigator mounts EmployerActiveJobScreen on MyJobs tab'
  );

  console.log('\n====================================================');
  console.log('  RESULTS: ALL SLICE 5 TESTS PASSED (100%)');
  console.log('====================================================\n');
}

runSlice5Tests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
