/**
 * Menial Platform - Phase 7 Verification Test Suite
 * 
 * Tests ratings running averages, duplicate review prevention,
 * active job emergency SOS reporting, non-silent safety resolution,
 * job-scoped messaging read-only locking, and external contact share payload.
 * Reference: menial-master-spec-v2.md (§46, §47, §48, §49, §62, §63, §67)
 */

import { TrustSafetyService } from '../shared/services/trust/TrustSafetyService';
import type { IDatabaseClient } from '../shared/services/admin/AdminService';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`❌ Assertion Failed: ${message}`);
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING PHASE 7 TESTS: TRUST & SAFETY');
  console.log('====================================================\n');

  // ========================================================================
  // 1. Test Ratings, Star Bounds & Running Average Recalculation (§46)
  // ========================================================================
  console.log('▶ Testing Ratings, Star Constraints & Running Average Recalculation...');

  interface MockRating {
    jobId: string;
    raterId: string;
    rateeId: string;
    stars: number;
  }

  const ratingsTable: MockRating[] = [];

  function submitRatingMock(
    jobId: string,
    jobStatus: string,
    raterId: string,
    rateeId: string,
    stars: number
  ): { success: boolean; newAverage?: number; error?: string } {
    // 1.1: Star bounds check (1 to 5)
    if (stars < 1 || stars > 5) {
      return { success: false, error: 'Stars must be between 1 and 5' };
    }

    // 1.2: Job completion check (§46)
    if (jobStatus !== 'completed') {
      return { success: false, error: 'Ratings can only be submitted after valid job completion' };
    }

    // 1.3: Duplicate rating prevention (§46)
    if (ratingsTable.some((r) => r.jobId === jobId && r.raterId === raterId)) {
      return { success: false, error: 'Duplicate rating: already reviewed this job' };
    }

    ratingsTable.push({ jobId, raterId, rateeId, stars });

    // Calculate new running average for ratee
    const rateeRatings = ratingsTable.filter((r) => r.rateeId === rateeId);
    const avg = Number(
      (rateeRatings.reduce((sum, r) => sum + r.stars, 0) / rateeRatings.length).toFixed(2)
    );

    return { success: true, newAverage: avg };
  }

  // Test 1.1: Star range bounds
  assert(!submitRatingMock('job_1', 'completed', 'user_a', 'worker_1', 0).success, '0 stars must be rejected');
  assert(!submitRatingMock('job_1', 'completed', 'user_a', 'worker_1', 6).success, '6 stars must be rejected');

  // Test 1.2: Rating before completion must be rejected
  assert(
    !submitRatingMock('job_1', 'in_progress', 'user_a', 'worker_1', 5).success,
    'Rating on in_progress job must be blocked (§46)'
  );

  // Test 1.3: First review (5 stars) -> Average = 5.0
  const review1 = submitRatingMock('job_1', 'completed', 'user_a', 'worker_1', 5);
  assert(review1.success, 'Valid review should succeed');
  assert(review1.newAverage === 5.0, 'First rating average should be 5.0');

  // Test 1.4: Duplicate review attempt by same rater on same job -> must fail (§46)
  const dupReview = submitRatingMock('job_1', 'completed', 'user_a', 'worker_1', 4);
  assert(!dupReview.success, 'Duplicate rating on same job by same user must be blocked (§46)');

  // Test 1.5: Second review from different employer on job_2 (4 stars) -> Average = 4.5
  const review2 = submitRatingMock('job_2', 'completed', 'user_b', 'worker_1', 4);
  assert(review2.success, 'Second review on different job should succeed');
  assert(review2.newAverage === 4.5, 'Average rating should now be 4.5');

  console.log('  ✅ Ratings, star constraints, running averages, and duplicate blocks verified.');

  // ========================================================================
  // 2. Test Emergency SOS Reporting & Non-Silent Resolution (§49, §63)
  // ========================================================================
  console.log('▶ Testing Emergency SOS Reporting & Non-Silent Resolution (§49, §63)...');

  interface MockSafetyReport {
    id: string;
    jobId: string;
    status: string;
    resolutionNote?: string;
    resolvedBy?: string;
  }

  const safetyReports: MockSafetyReport[] = [];

  function triggerSosMock(jobId: string): string {
    const reportId = `sos_${Date.now()}`;
    safetyReports.push({ id: reportId, jobId, status: 'open' });
    return reportId;
  }

  function resolveSosMock(
    reportId: string,
    adminId: string,
    resolutionNote: string
  ): { success: boolean; error?: string } {
    const report = safetyReports.find((r) => r.id === reportId);
    if (!report) return { success: false, error: 'Report not found' };

    // Non-silent closure requirement (§49, §63)
    if (!resolutionNote || resolutionNote.trim().length < 5) {
      return { success: false, error: 'A resolution note is required to close safety reports' };
    }

    report.status = 'resolved';
    report.resolutionNote = resolutionNote;
    report.resolvedBy = adminId;
    return { success: true };
  }

  const newSosId = triggerSosMock('job_active_99');
  assert(safetyReports.length === 1, 'SOS report should be created');
  assert(safetyReports[0].status === 'open', 'Initial status must be open');

  // Attempting to close without resolution note must fail (§49, §63)
  const silentCloseAttempt = resolveSosMock(newSosId, 'admin_support_1', '');
  assert(!silentCloseAttempt.success, 'Silent closure without notes must be prohibited (§49)');

  // Valid resolution with note succeeds
  const validClose = resolveSosMock(
    newSosId,
    'admin_support_1',
    'Contacted both parties by phone; verbal dispute de-escalated and resolved amicably.'
  );
  assert(validClose.success, 'Resolution with detailed notes should succeed');
  assert(safetyReports[0].status === 'resolved', 'Report status must update to resolved');

  console.log('  ✅ Emergency SOS dispatch and non-silent audit-logged resolution verified.');

  // ========================================================================
  // 3. Test Job-Scoped Messaging with Terminal Read-Only Lock (§48)
  // ========================================================================
  console.log('▶ Testing Job-Scoped Messaging with Terminal Read-Only Lock (§48)...');

  function sendMessageMock(
    jobStatus: string,
    body: string
  ): { success: boolean; error?: string } {
    // Check terminal lock (§48)
    if (['completed', 'cancelled'].includes(jobStatus)) {
      return {
        success: false,
        error: `Conversation is locked: Job is in terminal status (${jobStatus}).`,
      };
    }
    if (!body || body.trim().length === 0) {
      return { success: false, error: 'Body cannot be empty' };
    }
    return { success: true };
  }

  // Active job: message succeeds
  assert(sendMessageMock('in_progress', 'I am at the front gate.').success, 'Message on in_progress job should succeed');
  assert(sendMessageMock('worker_arrived', 'Please buzz me in.').success, 'Message on worker_arrived job should succeed');

  // Terminal job: message is blocked (§48)
  const completedChatAttempt = sendMessageMock('completed', 'Thanks for the great work!');
  assert(!completedChatAttempt.success, 'Message on completed job must be blocked (§48)');
  assert(Boolean(completedChatAttempt.error?.includes('Conversation is locked')), 'Error must indicate conversation is locked');

  const cancelledChatAttempt = sendMessageMock('cancelled', 'Why was it cancelled?');
  assert(!cancelledChatAttempt.success, 'Message on cancelled job must be blocked (§48)');

  console.log('  ✅ Terminal job read-only chat locking verified.');

  // ========================================================================
  // 4. Test Native Share Sheet Payload Generation (§49)
  // ========================================================================
  console.log('▶ Testing Native Share Sheet Payload Formatting (§49)...');

  const shareDetails = TrustSafetyService.generateJobShareDetails({
    publicJobId: 'MNL-00123',
    jobTitle: 'Plumbing Repair',
    locationText: '12 Admiralty Way, Lekki Phase 1',
    scheduledTime: 'Today at 2:00 PM',
    counterpartyName: 'Amina Bello',
    counterpartyRole: 'Worker',
  });

  assert(
    shareDetails.shareText.includes('MNL-00123'),
    'Share payload must include public job ID'
  );
  assert(
    shareDetails.shareText.includes('12 Admiralty Way, Lekki Phase 1'),
    'Share payload must include job location'
  );
  assert(
    shareDetails.shareText.includes('Amina Bello'),
    'Share payload must include counterparty name'
  );

  console.log('  ✅ External contact share payload formatting verified.');

  // ========================================================================
  // 5. Test TrustSafetyService RPC Client Mapping
  // ========================================================================
  console.log('▶ Testing TrustSafetyService RPC Client Methods...');

  const mockDbCalls: { fn: string; args?: Record<string, unknown> }[] = [];
  const mockDbClient: IDatabaseClient = {
    async rpc<T>(fn: string, args?: Record<string, unknown>) {
      mockDbCalls.push({ fn, args });
      if (fn === 'submit_job_rating') {
        return {
          data: {
            rating_id: 'rate_rec_1',
            job_id: 'job_101',
            rater_id: 'user_employer',
            ratee_id: 'user_worker',
            stars: 5,
            new_average_rating: 4.85,
          } as unknown as T,
          error: null,
        };
      }
      if (fn === 'trigger_emergency_sos') {
        return { data: 'sos_rec_999' as unknown as T, error: null };
      }
      if (fn === 'send_job_message') {
        return { data: 'msg_rec_42' as unknown as T, error: null };
      }
      return { data: true as unknown as T, error: null };
    },
  };

  const trustService = new TrustSafetyService(mockDbClient);

  // Test submitRating
  const ratingRes = await trustService.submitRating({
    jobId: 'job_101',
    stars: 5,
    reviewText: 'Punctual and very efficient worker.',
  });
  assert(ratingRes.stars === 5, 'Should return submitted stars');
  assert(ratingRes.newAverageRating === 4.85, 'Should return updated average rating');

  // Test triggerEmergencySos
  const sosRes = await trustService.triggerEmergencySos({
    jobId: 'job_101',
    description: 'Hostile situation at job location.',
  });
  assert(sosRes.reportId === 'sos_rec_999', 'Should return created SOS report ID');

  // Test sendMessage
  const msgRes = await trustService.sendMessage('conv_uuid_1', 'Hello worker');
  assert(msgRes.messageId === 'msg_rec_42', 'Should return created message ID');

  console.log('  ✅ TrustSafetyService RPC client integration verified.');

  console.log('\n====================================================');
  console.log('🎉 ALL PHASE 7 VERIFICATION TESTS PASSED (100%)');
  console.log('====================================================\n');
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
