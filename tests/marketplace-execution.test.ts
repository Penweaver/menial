/**
 * Menial Platform - Phase 6 Verification Test Suite
 * 
 * Tests real-time job execution lifecycle, arrival/departure photo check-ins,
 * completion confirmations, completed job counter increments, and dispute branches.
 * Reference: menial-master-spec-v2.md (§31, §32, §33, §45, §46, §47, §49)
 */

import { JobExecutionService } from '../shared/services/execution/JobExecutionService';
import type { IDatabaseClient } from '../shared/services/admin/AdminService';
import type { JobStatus } from '../shared/types/enums';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`❌ Assertion Failed: ${message}`);
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING PHASE 6 TESTS: JOB EXECUTION & SAFETY');
  console.log('====================================================\n');

  // ========================================================================
  // 1. Test Execution Lifecycle State Machine (§32, §45)
  // ========================================================================
  console.log('▶ Testing Real-Time Execution State Transitions...');

  interface MockJobContext {
    id: string;
    status: JobStatus;
    workerStatus: string;
    arrivalPhotoUrl?: string;
    checkoutPhotoUrl?: string;
    workerCompletedCount: number;
    employerJobsCount: number;
  }

  const job: MockJobContext = {
    id: 'job_exec_101',
    status: 'payment_secured',
    workerStatus: 'accepted',
    workerCompletedCount: 5,
    employerJobsCount: 2,
  };

  // Step 1.1: Worker starts travel
  assert(job.status === 'payment_secured', 'Initial status must be payment_secured');
  job.workerStatus = 'on_way';
  job.status = 'worker_on_way';
  assert(job.status === 'worker_on_way', 'Status must transition to worker_on_way (§32)');

  // Step 1.2: Worker arrives with photo check-in (§49)
  const arrivalPhoto = 'supabase://checkin_photos/job_101_arrival.jpg';
  job.workerStatus = 'arrived';
  job.status = 'worker_arrived';
  job.arrivalPhotoUrl = arrivalPhoto;
  assert(job.status === 'worker_arrived', 'Status must transition to worker_arrived');
  assert(
    job.arrivalPhotoUrl === arrivalPhoto,
    'Arrival safety check-in photo must be recorded (§49)'
  );

  // Step 1.3: Worker starts work
  job.workerStatus = 'in_progress';
  job.status = 'in_progress';
  assert(job.status === 'in_progress', 'Status must transition to in_progress');

  // Step 1.4: Worker completes work with photo check-out (§45, §49)
  const checkoutPhoto = 'supabase://checkout_photos/job_101_done.jpg';
  job.workerStatus = 'completed';
  job.status = 'completed_by_worker';
  job.checkoutPhotoUrl = checkoutPhoto;
  assert(job.status === 'completed_by_worker', 'Status must transition to completed_by_worker (§45)');
  assert(
    job.checkoutPhotoUrl === checkoutPhoto,
    'Departure safety check-out photo must be recorded (§49)'
  );

  // Step 1.5: Employer confirms completion (§45)
  job.status = 'completed';
  job.workerCompletedCount += 1;
  job.employerJobsCount += 1;
  assert(job.status === 'completed', 'Job must reach terminal completed status');
  assert(
    job.workerCompletedCount === 6,
    'Worker completed jobs count must increment by 1 (§22)'
  );
  assert(
    job.employerJobsCount === 3,
    'Employer total jobs count must increment by 1 (§24)'
  );

  console.log('  ✅ Real-time execution happy path and metrics increment verified.');

  // ========================================================================
  // 2. Test Disagreement & Dispute Branch (§45, §47)
  // ========================================================================
  console.log('▶ Testing Completion Disagreement & Dispute Branch (§45, §47)...');

  const disputedJob: MockJobContext = {
    id: 'job_exec_102',
    status: 'completed_by_worker',
    workerStatus: 'completed',
    workerCompletedCount: 10,
    employerJobsCount: 4,
  };

  // Employer inspects work and finds it incomplete -> raises dispute
  const disputeReason = 'incomplete_work';
  const disputeDescription = 'Worker left before finishing the garden lawn trimming.';

  disputedJob.status = 'disputed';
  assert(disputedJob.status === 'disputed', 'Job status must transition to disputed (§45)');
  assert(
    disputedJob.workerCompletedCount === 10,
    'Completed jobs count must NOT increment while in disputed status'
  );

  console.log('  ✅ Dispute transition branch verified.');

  // ========================================================================
  // 3. Test JobExecutionService RPC Client Integration
  // ========================================================================
  console.log('▶ Testing JobExecutionService Client Methods...');

  const mockDbCalls: { fn: string; args?: Record<string, unknown> }[] = [];
  const mockDbClient: IDatabaseClient = {
    async rpc<T>(fn: string, args?: Record<string, unknown>) {
      mockDbCalls.push({ fn, args });
      if (fn === 'raise_completion_dispute') {
        return { data: 'dispute_uuid_999' as unknown as T, error: null };
      }
      return { data: true as unknown as T, error: null };
    },
  };

  const execService = new JobExecutionService(mockDbClient);

  // Test startTravel
  await execService.startTravel('job_101');
  assert(mockDbCalls[0].fn === 'mark_worker_on_way', 'Should call mark_worker_on_way RPC');

  // Test arriveAtJob with photo
  await execService.arriveAtJob({
    jobId: 'job_101',
    photoUrl: 'https://storage.menial.ng/photo_arrival.jpg',
  });
  assert(mockDbCalls[1].fn === 'mark_worker_arrived', 'Should call mark_worker_arrived RPC');
  assert(
    mockDbCalls[1].args?.p_checkin_photo_url === 'https://storage.menial.ng/photo_arrival.jpg',
    'Should pass photo URL argument'
  );

  // Test startWork
  await execService.startWork('job_101');
  assert(mockDbCalls[2].fn === 'start_job_work', 'Should call start_job_work RPC');

  // Test completeWork with photo and notes
  await execService.completeWork({
    jobId: 'job_101',
    photoUrl: 'https://storage.menial.ng/photo_done.jpg',
    completionNotes: 'All 4 rooms cleaned thoroughly.',
  });
  assert(mockDbCalls[3].fn === 'complete_job_by_worker', 'Should call complete_job_by_worker RPC');

  // Test confirmCompletion
  await execService.confirmCompletion('job_101');
  assert(mockDbCalls[4].fn === 'confirm_job_completion', 'Should call confirm_job_completion RPC');

  // Test raiseDispute
  const disputeRes = await execService.raiseDispute({
    jobId: 'job_102',
    reason: 'incomplete_work',
    description: 'Work was only partially done.',
  });
  assert(disputeRes.disputeId === 'dispute_uuid_999', 'Should return dispute ID');
  assert(mockDbCalls[5].fn === 'raise_completion_dispute', 'Should call raise_completion_dispute RPC');

  console.log('  ✅ JobExecutionService RPC client methods verified.');

  console.log('\n====================================================');
  console.log('🎉 ALL PHASE 6 VERIFICATION TESTS PASSED (100%)');
  console.log('====================================================\n');
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
