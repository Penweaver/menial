/**
 * Menial Platform - Phase 3 Verification Test Suite
 * 
 * Tests marketplace profiles, verification state machine, NDPA privacy,
 * and proximity-based worker discovery matching.
 * Reference: menial-master-spec-v2.md (§21, §22, §24, §25, §27, §28, §34, §80)
 */

import { MockVerificationProvider } from '../shared/services/verification/MockVerificationProvider';
import { ProfileService } from '../shared/services/profile/ProfileService';
import type { IDatabaseClient } from '../shared/services/admin/AdminService';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`❌ Assertion Failed: ${message}`);
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING PHASE 3 TESTS: MARKETPLACE USERS & PROFILES');
  console.log('====================================================\n');

  // ========================================================================
  // 1. Test Verification Lifecycle & NDPA Privacy (§25, §80)
  // ========================================================================
  console.log('▶ Testing Verification Provider (State Machine & NDPA)...');
  const verifier = new MockVerificationProvider();
  const workerUserId = 'worker_uuid_101';

  // 1.1: NIN Validation and Masking (§80)
  const invalidNin = verifier.validateDocumentNumber('nin', '12345'); // too short
  assert(!invalidNin.valid, 'NIN shorter than 11 digits must fail validation');

  const validNin = verifier.validateDocumentNumber('nin', '12345678901');
  assert(validNin.valid, '11-digit NIN must pass validation');
  assert(
    validNin.maskedNumber === '*******8901',
    `NIN must be masked for NDPA compliance (§80), got ${validNin.maskedNumber}`
  );

  // 1.2: Initial status must be unverified (§22)
  assert(
    verifier.getUserStatus(workerUserId) === 'unverified',
    'Worker initial verification status must be unverified'
  );

  // 1.3: Worker submits verification request
  const submitRes = await verifier.submitVerification(workerUserId, {
    verificationType: 'id_document',
    documentType: 'nin',
    documentUrl: 'supabase://verification_docs/worker_101_nin.pdf',
    metadata: { idNumber: '12345678901' },
  });
  assert(submitRes.success, 'Verification submission should succeed');
  assert(submitRes.status === 'pending', 'Submitted verification must enter pending status');
  assert(
    verifier.getUserStatus(workerUserId) === 'pending',
    'Worker profile status must update to pending'
  );

  // Check stored record has masked number
  const record = verifier.getSubmission(submitRes.verificationId);
  assert(record?.maskedIdNumber === '*******8901', 'Stored record must store masked ID');

  // 1.4: Admin Approves verification (§25, §61)
  const adminId = 'admin_verification_staff_1';
  const approveRes = await verifier.reviewSubmission(
    adminId,
    submitRes.verificationId,
    'approve'
  );
  assert(approveRes.success, 'Review approval should succeed');
  assert(approveRes.status === 'verified', 'Approved status must be verified');
  assert(
    verifier.getUserStatus(workerUserId) === 'verified',
    'Worker status must now be verified (§25)'
  );

  // 1.5: Test Rejection Workflow with reason
  const workerUserId2 = 'worker_uuid_102';
  const submitRes2 = await verifier.submitVerification(workerUserId2, {
    verificationType: 'id_document',
    documentType: 'voters_card',
    metadata: { idNumber: 'ABC1234567890' },
  });
  const rejectRes = await verifier.reviewSubmission(
    adminId,
    submitRes2.verificationId,
    'reject',
    'Document photo is blurry and illegible'
  );
  assert(rejectRes.status === 'rejected', 'Status must be rejected');
  assert(
    verifier.getUserStatus(workerUserId2) === 'rejected',
    'Worker status must be rejected'
  );
  assert(
    verifier.getSubmission(submitRes2.verificationId)?.rejectionReason ===
      'Document photo is blurry and illegible',
    'Rejection reason must be preserved'
  );

  console.log('  ✅ Verification state machine and NDPA privacy rules passed.');

  // ========================================================================
  // 2. Test Proximity Distance Calculation (Haversine - §28)
  // ========================================================================
  console.log('▶ Testing Proximity & Distance Calculation (Haversine)...');

  // Coordinates: Ikeja, Lagos vs Victoria Island, Lagos (~16 km)
  const ikejaLat = 6.6018;
  const ikejaLon = 3.3515;
  const viLat = 6.4281;
  const viLon = 3.4219;

  const distanceIkejaToVi = ProfileService.calculateDistanceKm(
    ikejaLat,
    ikejaLon,
    viLat,
    viLon
  );
  assert(
    distanceIkejaToVi > 18 && distanceIkejaToVi < 22,
    `Calculated distance between Ikeja and VI should be ~20km, got ${distanceIkejaToVi}km`
  );

  // Same coordinate should be 0km
  const zeroDist = ProfileService.calculateDistanceKm(ikejaLat, ikejaLon, ikejaLat, ikejaLon);
  assert(zeroDist === 0, 'Distance to same coordinate must be 0');

  console.log('  ✅ Haversine distance calculations verified.');

  // ========================================================================
  // 3. Test Worker Discovery & Suitability Matching (§28, §34)
  // ========================================================================
  console.log('▶ Testing Worker Discovery Ranking & Filtering (§28, §34)...');

  const mockDb: IDatabaseClient = {
    async rpc<T>(_fn: string, _args?: Record<string, unknown>) {
      return { data: true as unknown as T, error: null };
    },
  };
  const profileService = new ProfileService(mockDb);

  const cleaningCategoryId = 'cat_cleaning_uuid';
  const movingCategoryId = 'cat_moving_uuid';

  // Employer located in Ikeja
  const employerLocation = {
    latitude: 6.6018,
    longitude: 3.3515,
  };

  const candidateWorkers = [
    {
      id: 'worker_near_verified_high_rated',
      fullName: 'Amina Bello',
      avatarUrl: 'https://example.com/amina.jpg',
      bio: 'Professional cleaner with 5 years experience',
      indicativeRate: 350000, // ₦3,500/hr in kobo
      ratingAvg: 4.9,
      completedJobsCount: 42,
      verificationStatus: 'verified' as const,
      isAvailable: true,
      serviceRadiusKm: 15,
      latitude: 6.6100, // ~1km from Ikeja
      longitude: 3.3550,
      categoryIds: [cleaningCategoryId],
    },
    {
      id: 'worker_near_unverified',
      fullName: 'John Doe',
      avatarUrl: null,
      bio: 'Cleaner',
      indicativeRate: 200000,
      ratingAvg: 4.5,
      completedJobsCount: 3,
      verificationStatus: 'unverified' as const, // NOT VERIFIED
      isAvailable: true,
      serviceRadiusKm: 15,
      latitude: 6.6050, // ~0.5km from Ikeja
      longitude: 3.3520,
      categoryIds: [cleaningCategoryId],
    },
    {
      id: 'worker_near_unavailable',
      fullName: 'Sade Adebayo',
      avatarUrl: null,
      bio: 'Cleaner',
      indicativeRate: 300000,
      ratingAvg: 5.0,
      completedJobsCount: 100,
      verificationStatus: 'verified' as const,
      isAvailable: false, // NOT AVAILABLE (§27)
      serviceRadiusKm: 20,
      latitude: 6.6020,
      longitude: 3.3518,
      categoryIds: [cleaningCategoryId],
    },
    {
      id: 'worker_wrong_category',
      fullName: 'Emeka Okafor',
      avatarUrl: null,
      bio: 'Heavy lifting and moving',
      indicativeRate: 400000,
      ratingAvg: 4.8,
      completedJobsCount: 30,
      verificationStatus: 'verified' as const,
      isAvailable: true,
      serviceRadiusKm: 20,
      latitude: 6.6030,
      longitude: 3.3520,
      categoryIds: [movingCategoryId], // WRONG CATEGORY
    },
    {
      id: 'worker_farther_verified',
      fullName: 'Ibrahim Musa',
      avatarUrl: null,
      bio: 'Office and home cleaner',
      indicativeRate: 300000,
      ratingAvg: 4.7,
      completedJobsCount: 18,
      verificationStatus: 'verified' as const,
      isAvailable: true,
      serviceRadiusKm: 20,
      latitude: 6.5500, // ~6km away
      longitude: 3.3600,
      categoryIds: [cleaningCategoryId],
    },
  ];

  // Run discovery query for Cleaning service near Ikeja
  const discovered = profileService.filterAndRankWorkers(candidateWorkers, {
    categoryId: cleaningCategoryId,
    latitude: employerLocation.latitude,
    longitude: employerLocation.longitude,
    radiusKm: 15,
    verifiedOnly: true,
  });

  // Verify only eligible workers returned:
  // - Amina Bello (verified, available, cleaning, 1km)
  // - Ibrahim Musa (verified, available, cleaning, 6km)
  // Rejected:
  // - John Doe (unverified)
  // - Sade Adebayo (unavailable)
  // - Emeka Okafor (wrong category)
  assert(discovered.length === 2, `Expected exactly 2 eligible workers, got ${discovered.length}`);
  assert(
    discovered[0].id === 'worker_near_verified_high_rated',
    'Nearest eligible worker (Amina) must be ranked first'
  );
  assert(
    discovered[1].id === 'worker_farther_verified',
    'Farther eligible worker (Ibrahim) must be ranked second'
  );
  assert(
    discovered[0].distanceKm < discovered[1].distanceKm,
    'Results must be sorted nearest first'
  );
  assert(
    discovered[0].indicativeRateKobo === 350000,
    'Indicative rate must be preserved in kobo'
  );

  console.log('  ✅ Worker discovery filtering and distance ranking passed.');

  console.log('\n====================================================');
  console.log('🎉 ALL PHASE 3 VERIFICATION TESTS PASSED (100%)');
  console.log('====================================================\n');
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
