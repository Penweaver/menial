/**
 * Slice 3 Verification Test Suite: Employer Job Creation Flow & Section 29 Pricing
 * 
 * Verifies:
 * 1. Section 29 Per-Worker Pay Calculation:
 *    - Proposed pay is per-worker, not a total budget.
 *    - Total cost = (proposed_pay * number_of_workers) + platform_fee.
 * 2. Live configurable platform fee from platform_settings.
 * 3. Job creation draft and publication via JobService without client database access.
 * 4. Step screens coverage (SelectCategory, JobDetailsLocation, Schedule, PricingWorkerCount, ReviewPublish).
 * 5. Integration within EmployerNavigator.
 */

import * as fs from 'fs';
import * as path from 'path';
import { ApiService, jobService } from '../mobile/src/services/api';
import { JobService } from '../shared/services/job/JobService';
import { formatKoboToNaira } from '../mobile/src/constants/theme';

async function runSlice3Tests() {
  console.log('====================================================');
  console.log('  MENIAL MOBILE — SLICE 3 VERIFICATION TEST SUITE   ');
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
  // TEST 1: Section 29 Per-Worker Pay Pricing Formula
  // --------------------------------------------------------------------------
  console.log('--- 1. SECTION 29 PER-WORKER PRICING FORMULA ---');
  // Scenario A: 1 worker at ₦3,500/hr (350,000 kobo) with 10% fee
  const rate1 = 350000;
  const count1 = 1;
  const pricing1 = ApiService.calculateJobPricing(rate1, count1, 10.0);

  assert(pricing1.workerPayKobo === 350000, 'Worker pay rate preserved per worker (350,000 kobo)');
  assert(pricing1.numberOfWorkers === 1, 'Worker count is 1');
  assert(pricing1.subtotalKobo === 350000, 'Subtotal for 1 worker is 350,000 kobo (₦3,500)');
  assert(pricing1.platformFeeKobo === 35000, '10% platform fee is 35,000 kobo (₦350)');
  assert(pricing1.totalAmountKobo === 385000, 'Total escrow required is 385,000 kobo (₦3,850)');
  assert(formatKoboToNaira(pricing1.totalAmountKobo) === '₦3,850', 'Formatted total matches ₦3,850');

  // Scenario B: 3 workers at ₦5,000 (500,000 kobo) with 10% fee (§29 multi-worker test)
  const rate2 = 500000;
  const count2 = 3;
  const pricing2 = ApiService.calculateJobPricing(rate2, count2, 10.0);

  assert(pricing2.workerPayKobo === 500000, 'Per-worker rate remains 500,000 kobo (₦5,000)');
  assert(pricing2.numberOfWorkers === 3, 'Worker count is 3');
  assert(
    pricing2.subtotalKobo === 1500000,
    'Subtotal is 3 × ₦5,000 = 1,500,000 kobo (₦15,000) — NOT divided among workers'
  );
  assert(pricing2.platformFeeKobo === 150000, '10% platform fee on subtotal is 150,000 kobo (₦1,500)');
  assert(pricing2.totalAmountKobo === 1650000, 'Total escrow required is 1,650,000 kobo (₦16,500)');
  assert(formatKoboToNaira(pricing2.totalAmountKobo) === '₦16,500', 'Formatted total matches ₦16,500');

  // --------------------------------------------------------------------------
  // TEST 2: Live Configurable Platform Fee (§66)
  // --------------------------------------------------------------------------
  console.log('\n--- 2. LIVE CONFIGURABLE PLATFORM FEE FROM SETTINGS (§66) ---');
  // Default fee from settings
  const liveFee = await ApiService.getPlatformFeePercentage();
  assert(liveFee === 10.0, 'Initial live platform fee is 10.0%');

  // Superadmin updates fee in settings to 7.5%
  ApiService.setPlatformFeePercentage(7.5);
  const updatedFee = await ApiService.getPlatformFeePercentage();
  assert(updatedFee === 7.5, 'Updated platform fee is 7.5%');

  // Verify calculateJobPricing dynamically honors the live 7.5% fee
  const pricingLive = ApiService.calculateJobPricing(1000000, 2, updatedFee); // 2 workers @ ₦10,000
  assert(pricingLive.subtotalKobo === 2000000, 'Subtotal is 2,000,000 kobo (₦20,000)');
  assert(pricingLive.platformFeeKobo === 150000, '7.5% platform fee is 150,000 kobo (₦1,500)');
  assert(pricingLive.totalAmountKobo === 2150000, 'Total escrow reflects live 7.5% fee (₦21,500)');

  // Reset back to 10%
  ApiService.setPlatformFeePercentage(10.0);

  // --------------------------------------------------------------------------
  // TEST 3: Job Creation & Publishing via JobService (§29, §30, §32)
  // --------------------------------------------------------------------------
  console.log('\n--- 3. JOB CREATION & PUBLISHING VIA JOBSERVICE ---');
  assert(jobService instanceof JobService, 'ApiService uses shared JobService instance');

  const createParams = {
    categoryId: 'cat_moving',
    title: 'Move Office Furniture & Files',
    description: 'Carry office desks, chairs, and filing boxes from ground floor to 2nd floor.',
    locationText: 'Plot 14 Admiralty Way, Lekki Phase 1, Lagos',
    scheduledDate: '2026-09-25',
    startTime: '09:00:00',
    durationMinutes: 240,
    numberOfWorkers: 2,
    workerPayKobo: 600000, // ₦6,000 per worker
  };

  const createResult = await ApiService.createJob(createParams);
  assert(createResult.jobId.startsWith('job_'), 'Job created with valid jobId');
  assert(createResult.publicJobId.startsWith('MNL-'), 'Public job ID formatted as MNL-YYYY-XXXX');
  assert(createResult.pricing.workerPayKobo === 600000, 'Pricing per-worker pay preserved');
  assert(createResult.pricing.numberOfWorkers === 2, 'Worker count preserved');
  assert(createResult.pricing.subtotalKobo === 1200000, 'Subtotal is 1,200,000 kobo (₦12,000)');
  assert(createResult.pricing.totalAmountKobo === 1320000, 'Total escrow with 10% fee is 1,320,000 kobo (₦13,200)');

  // Check draft status before publish
  const storedJob = ApiService.getCreatedJob(createResult.jobId);
  assert(storedJob !== undefined, 'Job persisted in backend store');
  assert(storedJob.status === 'draft', 'Initial job state is draft');

  // Publish job
  await ApiService.publishJob(createResult.jobId);
  const publishedJob = ApiService.getCreatedJob(createResult.jobId);
  assert(publishedJob.status === 'open', 'Publishing transitions job state to open (§32)');

  // --------------------------------------------------------------------------
  // TEST 4: 5-Step Guided Wizard Screens Coverage
  // --------------------------------------------------------------------------
  console.log('\n--- 4. 5-STEP GUIDED WIZARD SCREENS COVERAGE ---');
  const screensDir = path.join(__dirname, '../mobile/src/screens/employer/create');

  const requiredStepScreens = [
    'SelectCategoryScreen.tsx',
    'JobDetailsLocationScreen.tsx',
    'ScheduleScreen.tsx',
    'PricingWorkerCountScreen.tsx',
    'ReviewPublishScreen.tsx',
  ];

  for (const screenName of requiredStepScreens) {
    const screenPath = path.join(screensDir, screenName);
    const exists = fs.existsSync(screenPath);
    assert(exists, `Wizard Step screen exists: ${screenName}`);

    if (exists) {
      const code = fs.readFileSync(screenPath, 'utf-8');
      const exportName = screenName.replace('.tsx', '');
      assert(
        code.includes(`export const ${exportName}`),
        `Screen exports component: ${exportName}`
      );
    }
  }

  // Check PricingWorkerCountScreen explicitly contains Section 29 callout
  const pricingScreenCode = fs.readFileSync(
    path.join(screensDir, 'PricingWorkerCountScreen.tsx'),
    'utf-8'
  );
  assert(
    pricingScreenCode.includes('Section 29 Rule') &&
      pricingScreenCode.includes('PER-WORKER RATE'),
    'PricingWorkerCountScreen includes explicit Section 29 per-worker transparency callouts'
  );

  // Check ReviewPublishScreen contains escrow guarantee
  const reviewScreenCode = fs.readFileSync(
    path.join(screensDir, 'ReviewPublishScreen.tsx'),
    'utf-8'
  );
  assert(
    reviewScreenCode.includes('100% ESCROW PROTECTED') &&
      reviewScreenCode.includes('Menial Escrow Guarantee'),
    'ReviewPublishScreen highlights escrow guarantee callout per Stitch design'
  );

  // --------------------------------------------------------------------------
  // TEST 5: EmployerNavigator Integration
  // --------------------------------------------------------------------------
  console.log('\n--- 5. EMPLOYER NAVIGATOR INTEGRATION ---');
  const empNavPath = path.join(__dirname, '../mobile/src/navigation/EmployerNavigator.tsx');
  const empNavCode = fs.readFileSync(empNavPath, 'utf-8');

  assert(
    empNavCode.includes('JobCreationProvider'),
    'EmployerNavigator wraps flow in JobCreationProvider context'
  );
  assert(
    empNavCode.includes('EmployerCreateJobStackNavigator'),
    'EmployerNavigator mounts EmployerCreateJobStackNavigator'
  );
  assert(
    empNavCode.includes('SelectCategory') &&
      empNavCode.includes('JobDetailsLocation') &&
      empNavCode.includes('Schedule') &&
      empNavCode.includes('PricingWorkerCount') &&
      empNavCode.includes('ReviewPublish'),
    'All 5 steps wired in EmployerCreateJobStackNavigator'
  );

  console.log('\n====================================================');
  console.log(`  RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runSlice3Tests().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
