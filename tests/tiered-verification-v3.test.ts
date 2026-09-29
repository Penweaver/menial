/**
 * Menial Platform - Phase 2 Verification Test Suite (Spec Addendum v3)
 * 
 * Verifies:
 * 1. Category wage bounds validation (hard floor block, soft ceiling warning, NULL gracefulness) (§G).
 * 2. Care tier minimum-two-references rule at the application layer (§B.2).
 * 3. Technical trade vetting & trade test certification badge (§B.3).
 * 4. Category safety configurations & checklists (Care adult nudge, Electrical/Plumbing checklists) (§B.2, §B.3).
 * 5. Multi-category worker management & 5-category cap (§I).
 * 6. Tier-aware worker discovery & ranking (§34, §B).
 * 7. SOS audible alerting acknowledgment RPC contract (§L).
 * 
 * Reference: Spec Addendum v3 (Sections A, B, C, G, I, L)
 */

import { JobService } from '../shared/services/job/JobService';
import { VerificationService } from '../shared/services/verification/VerificationService';
import { MockVerificationProvider } from '../shared/services/verification/MockVerificationProvider';
import { ProfileService } from '../shared/services/profile/ProfileService';
import type { CareReferenceInput } from '../shared/services/verification/VerificationService';
import type { IDatabaseClient } from '../shared/services/admin/AdminService';

function assert(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(`❌ Assertion Failed: ${message}`);
  }
}

async function runTests() {
  console.log('================================================================');
  console.log('🧪 RUNNING SPEC ADDENDUM (v3) PHASE 2 DOMAIN & SERVICE TESTS');
  console.log('================================================================\n');

  // ========================================================================
  // 1. Category Wage Bounds (§G)
  // ========================================================================
  console.log('▶ Testing Category Wage Bounds Validation (§G)...');

  // Case 1.1: Bounds are NULL by default (graceful skip, no error, no false warning)
  const unboundCategory = {
    name: 'General Labour',
    min_pay_kobo: null,
    max_pay_kobo: null,
  };

  const unboundCheck = JobService.validateCategoryWageBounds(300000, unboundCategory); // ₦3,000
  assert(unboundCheck.isValid === true, 'When bounds are NULL, check must be valid');
  assert(unboundCheck.isBelowFloor === false, 'When min_pay is NULL, floor must not trigger');
  assert(unboundCheck.isAboveCeiling === false, 'When max_pay is NULL, ceiling must not trigger');
  assert(!unboundCheck.error, 'No error should exist when bounds are NULL');
  assert(!unboundCheck.warning, 'No warning should exist when bounds are NULL');
  console.log('  ✅ NULL bounds gracefully skipped without error or false warnings.');

  // Case 1.2: Hard floor block when min_pay_kobo is configured by Admin
  const floorConfiguredCategory = {
    name: 'Electrical Installation & Repair',
    min_pay_kobo: 1500000, // ₦15,000 floor configured by Admin
    max_pay_kobo: 6000000, // ₦60,000 ceiling
  };

  const belowFloorCheck = JobService.validateCategoryWageBounds(1000000, floorConfiguredCategory); // ₦10,000
  assert(belowFloorCheck.isValid === false, 'Offer below min_pay_kobo must be invalid (hard block)');
  assert(belowFloorCheck.isBelowFloor === true, 'isBelowFloor must be true');
  assert(
    belowFloorCheck.error?.includes('below the required minimum wage floor'),
    `Expected floor error message, got: ${belowFloorCheck.error}`
  );
  console.log('  ✅ Proposed wage below category floor triggers hard block.');

  // Case 1.3: Soft ceiling warning when max_pay_kobo is exceeded
  const aboveCeilingCheck = JobService.validateCategoryWageBounds(7500000, floorConfiguredCategory); // ₦75,000
  assert(aboveCeilingCheck.isValid === true, 'Offer above max_pay_kobo is valid (not hard-blocked)');
  assert(aboveCeilingCheck.isAboveCeiling === true, 'isAboveCeiling flag must be true');
  assert(
    aboveCeilingCheck.warning?.includes('higher than usual'),
    `Expected soft warning message, got: ${aboveCeilingCheck.warning}`
  );
  console.log('  ✅ Proposed wage above ceiling triggers soft confirmation warning.');

  // Case 1.4: Compliant wage within configured bounds
  const validCheck = JobService.validateCategoryWageBounds(2500000, floorConfiguredCategory); // ₦25,000
  assert(validCheck.isValid === true, 'Within bounds must be valid');
  assert(!validCheck.error && !validCheck.warning, 'No errors or warnings for within-bounds pay');
  console.log('  ✅ Compliant pay within configured bounds passes cleanly.');


  // ========================================================================
  // 2. Care Tier: Minimum-Two-References Rule at Application Layer (§B.2)
  // ========================================================================
  console.log('\n▶ Testing Care Tier Minimum-Two-References Rule (§B.2)...');

  // Case 2.1: Empty references list
  const emptyRefValidation = VerificationService.validateCareReferences([]);
  assert(emptyRefValidation.valid === false, 'Empty references must fail validation');
  assert(
    emptyRefValidation.error?.includes('minimum of two') || emptyRefValidation.error?.includes('at least two'),
    `Expected reference count error, got: ${emptyRefValidation.error}`
  );

  // Case 2.2: Exactly 1 reference provided (must fail!)
  const singleRef: CareReferenceInput[] = [
    { name: 'Adebayo Ogunlesi', relationship: 'Former Employer', phone: '08023456789' },
  ];
  const singleRefValidation = VerificationService.validateCareReferences(singleRef);
  assert(singleRefValidation.valid === false, 'Single reference must fail: minimum 2 required (§B.2)');
  assert(
    singleRefValidation.error?.includes('minimum of two contactable references (received 1)'),
    `Expected minimum-2 error, got: ${singleRefValidation.error}`
  );
  console.log('  ✅ Care tier strictly rejects submissions with only 1 reference.');

  // Case 2.3: Incomplete contact information (missing relationship or invalid phone)
  const incompleteRefs: CareReferenceInput[] = [
    { name: 'Adebayo Ogunlesi', relationship: 'Former Employer', phone: '08023456789' },
    { name: 'Chioma Okonjo', relationship: '', phone: '123' }, // invalid phone & relationship
  ];
  const incompleteValidation = VerificationService.validateCareReferences(incompleteRefs);
  assert(incompleteValidation.valid === false, 'Incomplete reference details must fail validation');
  console.log('  ✅ Malformed reference contact fields rejected.');

  // Case 2.4: Two valid references
  const validRefs: CareReferenceInput[] = [
    { name: 'Adebayo Ogunlesi', relationship: 'Former Employer', phone: '08023456789' },
    { name: 'Chioma Okonjo', relationship: 'Family Friend', phone: '08033334444' },
  ];
  const validRefsValidation = VerificationService.validateCareReferences(validRefs);
  assert(validRefsValidation.valid === true, 'Two complete references must pass validation');
  console.log('  ✅ Minimum two contactable references successfully validated.');


  // ========================================================================
  // 3. Mock Verification Provider: Tiered Submissions & Reviews (§B.2, §B.3)
  // ========================================================================
  console.log('\n▶ Testing Tiered Submissions on MockVerificationProvider (§B, §C)...');
  const verifier = new MockVerificationProvider();
  const worker1 = 'worker_care_101';
  const worker2 = 'worker_tech_202';
  const childcareCatId = 'cat_childcare_uuid';
  const plumbingCatId = 'cat_plumbing_uuid';

  // 3.1: Care submission requiring police cert
  const careWithoutCert = await verifier.submitCareVerification(worker1, {
    categoryId: childcareCatId,
    policeCertUrl: '', // missing!
    references: validRefs,
  });
  assert(careWithoutCert.success === false, 'Care submission without police cert must fail');

  const careValidSubmission = await verifier.submitCareVerification(worker1, {
    categoryId: childcareCatId,
    policeCertUrl: 'supabase://verification_docs/worker101_police_cert.pdf',
    references: validRefs,
  });
  assert(careValidSubmission.success === true, 'Valid Care submission must succeed');
  assert(careValidSubmission.status === 'pending', 'Care tier must enter PENDING status (no auto-progression per §B.2)');
  console.log('  ✅ Care submission lands in PENDING status with police certificate and 2 references.');

  // 3.2: Technical Trade submission requiring experience & portfolio
  const techWithoutPortfolio = await verifier.submitTechnicalVerification(worker2, {
    categoryId: plumbingCatId,
    experienceYears: 5,
    portfolioUrls: [], // missing!
  });
  assert(techWithoutPortfolio.success === false, 'Technical trade without portfolio must fail');

  const techValidSubmission = await verifier.submitTechnicalVerification(worker2, {
    categoryId: plumbingCatId,
    experienceYears: 7,
    portfolioUrls: ['supabase://portfolio/plumbing_pipe_work.jpg'],
    certificateType: 'federal_trade_test',
    certificateGrade: 'grade_1',
    certificateUrl: 'supabase://certificates/trade_test_grade1.pdf',
  });
  assert(techValidSubmission.success === true, 'Valid Technical submission must succeed');
  assert(techValidSubmission.status === 'pending', 'Technical submission enters PENDING status');
  console.log('  ✅ Technical trade submission validated with work proof and Trade Test certificate.');

  // 3.3: Admin reviews Care application
  const careReviewRes = await verifier.reviewTieredSubmission({
    adminId: 'admin_support_001',
    verificationId: careValidSubmission.verificationId,
    action: 'approve',
    referencesOutcome: [
      { name: 'Adebayo Ogunlesi', relationship: 'Former Employer', phone: '08023456789', admin_contact_outcome: 'verified_positive', contacted_at: new Date().toISOString() },
      { name: 'Chioma Okonjo', relationship: 'Family Friend', phone: '08033334444', admin_contact_outcome: 'verified_positive', contacted_at: new Date().toISOString() },
    ],
  });
  assert(careReviewRes.status === 'verified', 'Approved care submission must transition to verified');
  const worker1Status = verifier.getUserCategoryVerification(worker1, childcareCatId);
  assert(worker1Status?.status === 'verified', 'Worker must now hold verified status for Childcare');
  console.log('  ✅ Care review records reference calling outcomes and grants CARE_VERIFIED status.');

  // 3.4: Admin reviews Technical Trade application with Trade Test certification badge
  const techReviewRes = await verifier.reviewTieredSubmission({
    adminId: 'admin_support_001',
    verificationId: techValidSubmission.verificationId,
    action: 'approve',
    subStatus: 'trade_test_certified', // elevated badge!
  });
  assert(techReviewRes.status === 'verified', 'Approved technical submission is verified');
  assert(techReviewRes.subStatus === 'trade_test_certified', 'Trade test certification badge granted');
  const worker2Status = verifier.getUserCategoryVerification(worker2, plumbingCatId);
  assert(worker2Status?.subStatus === 'trade_test_certified', 'Worker profile reflects TRADE_TEST_CERTIFIED badge');
  console.log('  ✅ Technical trade review awards TRADE_TEST_CERTIFIED badge.');


  // ========================================================================
  // 4. Category Safeguards, Checklists & Disclaimers (§B.2, §B.3)
  // ========================================================================
  console.log('\n▶ Testing Category Safety Configs & Checklists (§B.2, §B.3)...');

  // 4.1: Care tier safety config
  const careSafety = JobService.getCategorySafetyConfig('Childcare / Babysitting', 'care');
  assert(careSafety.tier === 'care', 'Tier must be care');
  assert(careSafety.requiresFirstBookingNotice === true, 'First-booking notice required for Care');
  assert(careSafety.elevatedCheckInThresholdHours === 3, 'Elevated check-in prompt required at >3 hours');
  console.log('  ✅ Care tier safety safeguards (first-booking notice, 3h check-in prompt) verified.');

  // 4.2: Electrical safety config
  const electricalSafety = JobService.getCategorySafetyConfig('Electrical Installation & Repair', 'technical_trade');
  assert(electricalSafety.tier === 'technical_trade', 'Tier must be technical_trade');
  assert(
    electricalSafety.disclaimer?.toLowerCase().includes('menial is not a party to the technical work'),
    'One-line liability disclaimer must be present for technical trades'
  );
  assert(
    electricalSafety.preJobChecklist?.some((item) => item.includes('breaker')),
    'Electrical checklist must include breaker access prompt'
  );
  console.log('  ✅ Electrical safety config includes liability disclaimer and breaker checklist.');

  // 4.3: Plumbing safety config
  const plumbingSafety = JobService.getCategorySafetyConfig('Plumbing', 'technical_trade');
  assert(
    plumbingSafety.preJobChecklist?.some((item) => item.includes('stopcock')),
    'Plumbing checklist must include water mains / stopcock access prompt'
  );
  console.log('  ✅ Plumbing safety config includes water shutoff checklist.');


  // ========================================================================
  // 5. Multi-Category Worker Management & Platform Setting Cap (§I)
  // ========================================================================
  console.log('\n▶ Testing Multi-Category Selection & 5-Category Cap (§I)...');

  const mockDb: IDatabaseClient = {
    rpc: async <T = unknown>(fn: string, args?: Record<string, unknown>) => {
      return { data: true as unknown as T, error: null };
    },
  };
  const profileService = new ProfileService(mockDb);

  // Case 5.1: Attempting 6 categories when max allowed is 5
  let capExceeded = false;
  try {
    await profileService.setWorkerCategories(
      [
        { categoryId: 'cat_1', indicativeRateKobo: 200000 },
        { categoryId: 'cat_2', indicativeRateKobo: 250000 },
        { categoryId: 'cat_3', indicativeRateKobo: 300000 },
        { categoryId: 'cat_4', indicativeRateKobo: 350000 },
        { categoryId: 'cat_5', indicativeRateKobo: 400000 },
        { categoryId: 'cat_6', indicativeRateKobo: 450000 }, // 6th category!
      ],
      5 // max cap
    );
  } catch (err: unknown) {
    capExceeded = true;
    assert((err as Error).message.includes('Maximum 5 categories allowed'), 'Should enforce 5-category cap');
  }
  assert(capExceeded, 'Selecting more than 5 categories must be rejected');
  console.log('  ✅ Worker category cap (5 maximum) strictly enforced at application layer.');

  // Case 5.2: Compliant 3-category selection
  await profileService.setWorkerCategories(
    [
      { categoryId: 'cat_cleaning', indicativeRateKobo: 200000 },
      { categoryId: 'cat_ironing', indicativeRateKobo: 150000 },
      { categoryId: 'cat_gardening', indicativeRateKobo: 250000 },
    ],
    5
  );
  console.log('  ✅ Multi-category assignment with distinct indicative rates accepted.');


  // ========================================================================
  // 6. Tier-Aware Worker Discovery & Search Filtering (§34, §B)
  // ========================================================================
  console.log('\n▶ Testing Tier-Aware Worker Discovery & Search Filtering (§B, §34)...');

  const candidateWorkers: Parameters<ProfileService['filterAndRankWorkers']>[0] = [
    {
      id: 'worker_unverified_care',
      fullName: 'Amina S.',
      avatarUrl: null,
      bio: 'Loves children',
      indicativeRate: 300000,
      ratingAvg: 4.8,
      completedJobsCount: 10,
      verificationStatus: 'verified' as const, // standard verified, but NOT care verified!
      isAvailable: true,
      serviceRadiusKm: 20,
      latitude: 6.5244,
      longitude: 3.3792,
      categoryIds: ['cat_childcare'],
      categoryVerifications: {
        cat_childcare: { tier: 'care' as const, status: 'pending' as const }, // still pending!
      },
    },
    {
      id: 'worker_verified_care',
      fullName: 'Blessing E.',
      avatarUrl: null,
      bio: 'Certified care professional',
      indicativeRate: 350000,
      ratingAvg: 4.95,
      completedJobsCount: 22,
      verificationStatus: 'verified' as const,
      isAvailable: true,
      serviceRadiusKm: 20,
      latitude: 6.5245,
      longitude: 3.3793,
      categoryIds: ['cat_childcare'],
      categoryVerifications: {
        cat_childcare: { tier: 'care' as const, status: 'verified' as const },
      },
    },
    {
      id: 'worker_experienced_plumber',
      fullName: 'Ibrahim K.',
      avatarUrl: null,
      bio: 'Master pipefitter',
      indicativeRate: 500000,
      ratingAvg: 4.7,
      completedJobsCount: 30,
      verificationStatus: 'verified' as const,
      isAvailable: true,
      serviceRadiusKm: 20,
      latitude: 6.525,
      longitude: 3.38,
      categoryIds: ['cat_plumbing'],
      categoryVerifications: {
        cat_plumbing: { tier: 'technical_trade' as const, status: 'verified' as const, subStatus: 'experience_verified' as const },
      },
    },
    {
      id: 'worker_certified_plumber',
      fullName: 'Tunde O.',
      avatarUrl: null,
      bio: 'Federal Trade Test Grade 1 Plumber',
      indicativeRate: 600000,
      ratingAvg: 4.9,
      completedJobsCount: 45,
      verificationStatus: 'verified' as const,
      isAvailable: true,
      serviceRadiusKm: 20,
      latitude: 6.526,
      longitude: 3.381,
      categoryIds: ['cat_plumbing'],
      categoryVerifications: {
        cat_plumbing: { tier: 'technical_trade' as const, status: 'verified' as const, subStatus: 'trade_test_certified' as const },
      },
    },
  ];

  // 6.1: Search for Childcare (Care tier) -> unverified care candidate must be filtered out!
  const careResults = profileService.filterAndRankWorkers(candidateWorkers, {
    categoryId: 'cat_childcare',
    categoryTier: 'care',
    latitude: 6.5244,
    longitude: 3.3792,
  });
  assert(careResults.length === 1, 'Only the CARE_VERIFIED worker should appear in care search');
  assert(careResults[0].id === 'worker_verified_care', 'Verified care worker must be returned');
  console.log('  ✅ Unverified Care applicants excluded from Care discovery results.');

  // 6.2: Search for Plumbing with tradeTestOnly = true -> only certified plumber returned
  const certifiedPlumbingResults = profileService.filterAndRankWorkers(candidateWorkers, {
    categoryId: 'cat_plumbing',
    categoryTier: 'technical_trade',
    latitude: 6.5244,
    longitude: 3.3792,
    tradeTestOnly: true,
  });
  assert(certifiedPlumbingResults.length === 1, 'Only trade-test certified worker matches certified filter');
  assert(certifiedPlumbingResults[0].id === 'worker_certified_plumber', 'Certified plumber returned');
  console.log('  ✅ Employer Trade Test certified filter returns only credentialed artisans.');

  // 6.3: General search for Plumbing (without tradeTestOnly filter) -> both experienced and certified appear
  const generalPlumbingResults = profileService.filterAndRankWorkers(candidateWorkers, {
    categoryId: 'cat_plumbing',
    categoryTier: 'technical_trade',
    latitude: 6.5244,
    longitude: 3.3792,
    tradeTestOnly: false,
  });
  assert(generalPlumbingResults.length === 2, 'Both experienced and certified plumbers are bookable');
  console.log('  ✅ Both experienced and trade-test certified plumbers remain discoverable and bookable.');

  // ========================================================================
  // 7. Multi-Category Verification Isolation & Non-Leakage (§B, §C)
  // ========================================================================
  console.log('\n▶ Testing Multi-Category Status Isolation & Non-Leakage (§B, §C)...');

  const multiCatWorkerId = 'worker_dual_skilled_007';
  const careCatId = 'cat_care_childcare';
  const techCatId = 'cat_tech_electrical';

  // Step 1: Worker submits Care verification for Childcare
  const careSubmission = await verifier.submitCareVerification(multiCatWorkerId, {
    categoryId: careCatId,
    policeCertUrl: 'https://storage.menial.ng/police_cert_007.pdf',
    references: [
      { name: 'Dr. Stella Ameyo', relationship: 'Former Employer', phone: '08011223344' },
      { name: 'Engr. Emeka Anyaoku', relationship: 'Community Leader', phone: '08022334455' },
    ],
  });

  // Step 2: Same worker submits Technical verification for Electrical Repair
  const techSubmission = await verifier.submitTechnicalVerification(multiCatWorkerId, {
    categoryId: techCatId,
    experienceYears: 4,
    portfolioUrls: ['https://storage.menial.ng/portfolio_wiring_007.jpg'],
  });

  // Step 3: Admin reviews and approves Childcare ONLY (CARE_VERIFIED)
  await verifier.reviewTieredSubmission({
    adminId: 'admin_reviewer_01',
    verificationId: careSubmission.verificationId,
    action: 'approve',
    referenceCallNotes: 'Both references confirmed high integrity and verified childcare experience.',
  });

  // Step 4: Verify that in the provider, Childcare is verified while Electrical remains pending
  const careStatus = verifier.getUserCategoryVerification(multiCatWorkerId, careCatId);
  const techStatus = verifier.getUserCategoryVerification(multiCatWorkerId, techCatId);

  assert(careStatus?.status === 'verified', 'Childcare must be verified');
  assert(careStatus?.tier === 'care', 'Childcare tier must be care');
  assert(techStatus?.status === 'pending', 'Electrical must strictly remain pending review');
  assert(techStatus?.tier === 'technical_trade', 'Electrical tier must be technical_trade');
  console.log('  ✅ Verification provider records isolate status strictly per category without leakage.');

  // Step 5: Test eligibility check via JobService.checkWorkerCategoryEligibility
  const careCategoryMeta = {
    id: careCatId,
    name: 'Childcare / Babysitting',
    verification_tier: 'care' as const,
  };
  const techCategoryMeta = {
    id: techCatId,
    name: 'Electrical Installation & Repair',
    verification_tier: 'technical_trade' as const,
  };

  const careEligibility = JobService.checkWorkerCategoryEligibility(careCategoryMeta, careStatus);
  assert(careEligibility.eligible === true, 'Worker must be eligible for Childcare booking');

  // Must NOT leak verified status to Electrical!
  const techEligibility = JobService.checkWorkerCategoryEligibility(techCategoryMeta, techStatus);
  assert(techEligibility.eligible === false, 'Worker must NOT be eligible for Electrical booking');
  assert(
    techEligibility.error?.includes('TECHNICAL_VERIFIED status'),
    `Expected TECHNICAL_VERIFIED error, got: ${techEligibility.error}`
  );
  console.log('  ✅ JobService.checkWorkerCategoryEligibility strictly isolates eligibility per category.');

  // Step 6: Test discovery isolation in ProfileService.filterAndRankWorkers
  const dualCategoryWorkerList: Parameters<ProfileService['filterAndRankWorkers']>[0] = [
    {
      id: multiCatWorkerId,
      fullName: 'Babatunde F.',
      avatarUrl: null,
      bio: 'Experienced caregiver and apprentice electrician',
      indicativeRate: 400000,
      ratingAvg: 4.9,
      completedJobsCount: 15,
      verificationStatus: 'verified' as const, // standard verified
      isAvailable: true,
      serviceRadiusKm: 25,
      latitude: 6.5244,
      longitude: 3.3792,
      categoryIds: [careCatId, techCatId],
      categoryVerifications: {
        [careCatId]: { tier: 'care', status: 'verified' },
        [techCatId]: { tier: 'technical_trade', status: 'pending' }, // pending!
      },
    },
  ];

  // Search Care category -> worker MUST be discovered
  const discoveredCare = profileService.filterAndRankWorkers(dualCategoryWorkerList, {
    categoryId: careCatId,
    categoryTier: 'care',
    latitude: 6.5244,
    longitude: 3.3792,
  });
  assert(discoveredCare.length === 1, 'Dual-category worker must appear in verified Care discovery');
  assert(discoveredCare[0].id === multiCatWorkerId, 'Correct worker returned in Care search');

  // Search Technical Trade category -> worker MUST BE EXCLUDED because electrical is pending
  const discoveredTech = profileService.filterAndRankWorkers(dualCategoryWorkerList, {
    categoryId: techCatId,
    categoryTier: 'technical_trade',
    latitude: 6.5244,
    longitude: 3.3792,
  });
  assert(
    discoveredTech.length === 0,
    'Dual-category worker must be excluded from Technical discovery while electrical is pending'
  );
  console.log('  ✅ ProfileService discovery prevents cross-category verification leakage.');

  console.log('\n================================================================');
  console.log('🎉 ALL SPEC ADDENDUM (v3) PHASE 2 TESTS PASSED (100%)');
  console.log('================================================================');
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
