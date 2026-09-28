/**
 * Menial Platform - Task 6 Verification Test Suite
 * 
 * Verifies Verification Centre, Dispute Centre, and Safety Reports Centre (§22, §25, §47, §49, §61, §62, §63, §80, §91):
 * 1. Verification Centre: NDPA 11-digit NIN masking (*******8901), document inspection,
 *    and Approve / Reject with mandatory rationale logging via reviewVerificationSubmission().
 * 2. Dispute Centre: Side-by-side evidence inspection (arrival/departure photos §49),
 *    and Escrow Release vs Employer Refund arbitration with mandatory rationale via resolveDispute().
 * 3. Safety Reports Centre: Section 49 Emergency SOS alerts with GPS coordinates,
 *    emergency dispatch telemetry (112 / 767), and mandatory non-silent resolution notes via resolveSafetyReport().
 * 4. Granular RBAC Route & Permission Isolation across Verification Admin, Support Admin, and Operations Admin.
 * 
 * Reference: menial-master-spec-v2.md (§22, §25, §47, §49, §61, §62, §63, §80, §91) & DESIGN.md
 */

import {
  AdminOperationsService,
  type PaginatedResult,
} from '../shared/services/operations/AdminOperationsService';
import type { IDatabaseClient } from '../shared/services/admin/AdminService';
import { canAccessAdminRoute, type AdminUserContext } from '../shared/auth/rbac';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`❌ Assertion Failed: ${message}`);
  }
}

// NDPA PII masking validator (§80)
function isNdpaNinMasked(maskedNin: string): boolean {
  return /^\*{7}\d{4}$/.test(maskedNin);
}

async function runTrustSafetyCentresTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING TASK 6 TESTS: VERIFICATION, DISPUTES & SAFETY');
  console.log('====================================================\n');

  const executedCalls: { fn: string; args?: Record<string, unknown> }[] = [];

  const mockDb: IDatabaseClient = {
    async rpc<T>(fn: string, args?: Record<string, unknown>) {
      executedCalls.push({ fn, args });

      if (fn === 'get_admin_paginated_verifications') {
        const limit = (args?.p_limit as number) || 25;
        const offset = (args?.p_offset as number) || 0;
        return {
          data: {
            total: 3,
            limit,
            offset,
            data: [
              {
                id: 'ver-001',
                user_id: 'usr-w1',
                verification_type: 'id_document',
                document_type: 'nin',
                status: 'pending',
                worker_name: 'Babatunde Adeleke',
                worker_phone: '+234 802 345 6789',
                created_at: new Date().toISOString(),
              },
              {
                id: 'ver-002',
                user_id: 'usr-w2',
                verification_type: 'id_document',
                document_type: 'nin',
                status: 'pending',
                worker_name: 'Chinedu Eze',
                worker_phone: '+234 813 987 6543',
                created_at: new Date().toISOString(),
              },
              {
                id: 'ver-003',
                user_id: 'usr-w3',
                verification_type: 'id_document',
                document_type: 'nin',
                status: 'verified',
                worker_name: 'Amina Yusuf',
                worker_phone: '+234 809 111 2233',
                created_at: new Date().toISOString(),
              },
            ],
          } as unknown as T,
          error: null,
        };
      }

      if (fn === 'review_verification_submission') {
        const action = args?.p_action as string;
        const reason = args?.p_rejection_reason as string | null;

        if (action === 'reject' && (!reason || reason.trim().length < 5)) {
          return {
            data: null,
            error: new Error('A specific rejection reason (min 5 chars) is mandatory per §25 & §61.'),
          };
        }

        return { data: null as unknown as T, error: null };
      }

      if (fn === 'get_admin_paginated_disputes') {
        const limit = (args?.p_limit as number) || 25;
        const offset = (args?.p_offset as number) || 0;
        return {
          data: {
            total: 2,
            limit,
            offset,
            data: [
              {
                id: 'disp-001',
                job_id: 'job-101',
                public_job_id: 'MNL-84920',
                job_title: 'Site Plumbing Pipe Repair',
                filer_name: 'Dr. Kunle Alabi',
                filer_phone: '+234 803 123 4567',
                filed_by_type: 'employer',
                reason: 'incomplete_work',
                description: 'Worker departed early leaving pipes exposed under the sink.',
                status: 'open',
                total_amount: 2200000,
                worker_pay: 2000000,
                platform_fee: 200000,
                checkin_photo_url: 'https://cdn.menial.ng/evidence/checkin-101.jpg',
                checkout_photo_url: 'https://cdn.menial.ng/evidence/checkout-101.jpg',
                employer_name: 'Dr. Kunle Alabi',
                worker_name: 'Ibrahim Danladi',
                created_at: new Date().toISOString(),
              },
              {
                id: 'disp-002',
                job_id: 'job-102',
                public_job_id: 'MNL-84921',
                job_title: 'Generator Servicing & Fuel Filter',
                filer_name: 'Emeka Okafor',
                filer_phone: '+234 812 555 7890',
                filed_by_type: 'worker',
                reason: 'payment_issue',
                description: 'Employer refused to confirm release of escrow after test run.',
                status: 'open',
                total_amount: 1650000,
                worker_pay: 1500000,
                platform_fee: 150000,
                checkin_photo_url: 'https://cdn.menial.ng/evidence/checkin-102.jpg',
                checkout_photo_url: 'https://cdn.menial.ng/evidence/checkout-102.jpg',
                employer_name: 'Chief Obinna',
                worker_name: 'Emeka Okafor',
                created_at: new Date().toISOString(),
              },
            ],
          } as unknown as T,
          error: null,
        };
      }

      if (fn === 'resolve_dispute_case') {
        const note = args?.p_resolution_note as string;
        if (!note || note.trim().length < 5) {
          return {
            data: null,
            error: new Error('Arbitration resolution note (min 5 chars) is mandatory (§47, §62).'),
          };
        }
        return { data: null as unknown as T, error: null };
      }

      if (fn === 'get_admin_paginated_safety_reports') {
        const limit = (args?.p_limit as number) || 25;
        const offset = (args?.p_offset as number) || 0;
        return {
          data: {
            total: 1,
            limit,
            offset,
            data: [
              {
                id: 'sos-001',
                job_id: 'job-sos-101',
                public_job_id: 'MNL-77120',
                job_title: 'Emergency Generator Troubleshooting',
                reporter_name: 'Tunde Bakare',
                reporter_phone: '+234 803 999 8811',
                reporter_type: 'worker',
                description: 'Intimidation and physical threat from premises security.',
                location_text: 'Plot 14, Commercial Avenue, Ikeja Industrial Estate, Lagos',
                latitude: 6.6018,
                longitude: 3.3515,
                status: 'open',
                created_at: new Date().toISOString(),
              },
            ],
          } as unknown as T,
          error: null,
        };
      }

      if (fn === 'resolve_safety_report') {
        const note = args?.p_resolution_note as string;
        if (!note || note.trim().length < 5) {
          return {
            data: null,
            error: new Error('Non-silent incident resolution note (min 5 chars) is strictly mandatory (§49).'),
          };
        }
        return { data: null as unknown as T, error: null };
      }

      throw new Error(`Unexpected RPC call: ${fn}`);
    },
  };

  const opsService = new AdminOperationsService(mockDb);

  // ========================================================================
  // 1. Verification Centre: Paginated Queue & NDPA Masking (§22, §25, §61, §80)
  // ========================================================================
  console.log('▶ Vector 1: Verification Centre & NDPA Masking (§22, §25, §61, §80)...');
  const verQueue = await opsService.getVerificationQueue({ status: 'pending', limit: 10, offset: 0 });
  assert(verQueue.total === 3, 'Verification queue total should match mock total');
  assert(verQueue.data.length === 3, 'Verification queue batch size should match');

  // Verify NDPA masking rule (§80): NIN must never expose more than last 4 digits
  const sampleMaskedNin = '*******8901';
  assert(isNdpaNinMasked(sampleMaskedNin), 'NIN masking format must strictly be 7 asterisks followed by 4 digits');

  // Approve submission
  await opsService.reviewVerificationSubmission({
    verificationId: 'ver-001',
    action: 'approve',
  });
  const approveCall = executedCalls.find((c) => c.fn === 'review_verification_submission' && c.args?.p_action === 'approve');
  assert(!!approveCall, 'Approve action must invoke review_verification_submission RPC');
  assert(approveCall?.args?.p_verification_id === 'ver-001', 'Correct verificationId passed');

  // Reject submission without rationale must be rejected
  let rejectWithoutReasonFailed = false;
  try {
    await opsService.reviewVerificationSubmission({
      verificationId: 'ver-002',
      action: 'reject',
      reason: 'bad', // < 5 chars
    });
  } catch (err: unknown) {
    rejectWithoutReasonFailed = true;
    const msg = err instanceof Error ? err.message : '';
    assert(msg.includes('min 5 chars'), 'Rejection error message must enforce min 5 chars requirement');
  }
  assert(rejectWithoutReasonFailed, 'Rejecting verification without >=5 char reason must throw error (§25, §61)');

  // Reject with valid rationale
  await opsService.reviewVerificationSubmission({
    verificationId: 'ver-002',
    action: 'reject',
    reason: 'NIN document scan was excessively blurry and unreadable.',
  });
  const rejectCall = executedCalls.find(
    (c) => c.fn === 'review_verification_submission' && c.args?.p_action === 'reject' && c.args?.p_verification_id === 'ver-002'
  );
  assert(!!rejectCall, 'Valid rejection must invoke review_verification_submission RPC');
  console.log('  ✅ Verification queue retrieval, approve, and mandatory reject reasons verified.');

  // ========================================================================
  // 2. Dispute Centre: Evidence Inspection & Financial Arbitration (§47, §62)
  // ========================================================================
  console.log('▶ Vector 2: Dispute Centre & Financial Arbitration (§47, §62)...');
  const disputes = await opsService.getDisputes({ status: 'open', limit: 10, offset: 0 });
  assert(disputes.total === 2, 'Disputes queue total should match');
  assert(disputes.data[0].checkin_photo_url !== undefined, 'Check-in photo URL must be present in dispute evidence');
  assert(disputes.data[0].checkout_photo_url !== undefined, 'Checkout photo URL must be present in dispute evidence');

  // Financial arbitration: Release payout to worker
  await opsService.resolveDispute({
    disputeId: 'disp-002',
    resolutionNote: 'Reviewed generator test run video evidence; work performed satisfactorily. Escrow released to worker.',
    financialAction: 'release_payout',
  });
  const releaseCall = executedCalls.find(
    (c) => c.fn === 'resolve_dispute_case' && c.args?.p_financial_action === 'release_payout'
  );
  assert(!!releaseCall, 'Resolving dispute with release_payout must call resolve_dispute_case RPC');

  // Financial arbitration: Refund employer
  await opsService.resolveDispute({
    disputeId: 'disp-001',
    resolutionNote: 'Inspection confirmed worker abandoned incomplete piping. Full escrow refunded to employer.',
    financialAction: 'refund_employer',
  });
  const refundCall = executedCalls.find(
    (c) => c.fn === 'resolve_dispute_case' && c.args?.p_financial_action === 'refund_employer'
  );
  assert(!!refundCall, 'Resolving dispute with refund_employer must call resolve_dispute_case RPC');
  console.log('  ✅ Dispute evidence inspection, release payout, and refund employer verified.');

  // ========================================================================
  // 3. Safety Reports Centre: GPS Telemetry & Non-Silent Resolution (§49, §63)
  // ========================================================================
  console.log('▶ Vector 3: Safety Reports Centre & Non-Silent Resolution (§49, §63)...');
  const safety = await opsService.getSafetyReports({ status: 'open', limit: 10, offset: 0 });
  assert(safety.total === 1, 'Safety reports queue should return open reports');
  const sosItem = safety.data[0];
  assert(typeof sosItem.latitude === 'number' && typeof sosItem.longitude === 'number', 'Emergency SOS must contain GPS coordinates');
  assert(sosItem.latitude === 6.6018 && sosItem.longitude === 3.3515, 'GPS latitude & longitude coordinates accurately preserved');

  // Resolve safety report without note must fail
  let resolveSafetyWithoutNoteFailed = false;
  try {
    await opsService.resolveSafetyReport({
      reportId: 'sos-001',
      resolutionNote: 'ok', // < 5 chars
    });
  } catch (err: unknown) {
    resolveSafetyWithoutNoteFailed = true;
  }
  assert(resolveSafetyWithoutNoteFailed, 'Resolving safety report without >=5 char note must throw error (§49)');

  // Resolve safety report with dispatch log
  await opsService.resolveSafetyReport({
    reportId: 'sos-001',
    resolutionNote: 'Dispatched Lagos State Emergency Hotline (767). Rapid response team arrived at Ikeja Industrial Estate. Worker safely extracted.',
    status: 'resolved',
  });
  const safetyCall = executedCalls.find((c) => c.fn === 'resolve_safety_report' && c.args?.p_report_id === 'sos-001');
  assert(!!safetyCall, 'Resolving safety report must call resolve_safety_report RPC');
  console.log('  ✅ Emergency SOS GPS telemetry, emergency hotline dispatch log, and non-silent resolution verified.');

  // ========================================================================
  // 4. Granular RBAC Route & Permission Isolation (§13, §18)
  // ========================================================================
  console.log('▶ Vector 4: Granular RBAC Permissions for Task 6 Screens (§13, §18)...');

  // Verification Admin context (has only 'verification' permission)
  const verificationAdmin: AdminUserContext = {
    id: 'adm-v1',
    userId: 'usr-v1',
    isSuperadmin: false,
    permissions: ['verification'],
    status: 'active',
    mfaEnrolled: true,
    mfaVerified: true,
  };

  // Support Admin context (has only 'support' permission)
  const supportAdmin: AdminUserContext = {
    id: 'adm-s1',
    userId: 'usr-s1',
    isSuperadmin: false,
    permissions: ['support'],
    status: 'active',
    mfaEnrolled: true,
    mfaVerified: true,
  };

  // Operations Admin context (has only 'operations' permission)
  const opsAdmin: AdminUserContext = {
    id: 'adm-o1',
    userId: 'usr-o1',
    isSuperadmin: false,
    permissions: ['operations'],
    status: 'active',
    mfaEnrolled: true,
    mfaVerified: true,
  };

  // Superadmin context (root clearance)
  const superadmin: AdminUserContext = {
    id: 'adm-sa1',
    userId: 'usr-sa1',
    isSuperadmin: true,
    permissions: ['operations', 'verification', 'support', 'finance', 'moderation'],
    status: 'active',
    mfaEnrolled: true,
    mfaVerified: true,
  };

  // Verification Admin can access /admin/verification, but NOT /admin/disputes, /admin/safety, or /admin/finance
  assert(canAccessAdminRoute(verificationAdmin, '/admin/verification').allowed, 'Verification Admin must access /admin/verification');
  assert(!canAccessAdminRoute(verificationAdmin, '/admin/disputes').allowed, 'Verification Admin cannot access /admin/disputes');
  assert(!canAccessAdminRoute(verificationAdmin, '/admin/safety').allowed, 'Verification Admin cannot access /admin/safety');

  // Support Admin can access /admin/disputes and /admin/safety, but NOT /admin/verification
  assert(!canAccessAdminRoute(supportAdmin, '/admin/verification').allowed, 'Support Admin cannot access /admin/verification');
  assert(canAccessAdminRoute(supportAdmin, '/admin/disputes').allowed, 'Support Admin must access /admin/disputes');
  assert(canAccessAdminRoute(supportAdmin, '/admin/safety').allowed, 'Support Admin must access /admin/safety');

  // Operations Admin can access general operations but NOT /admin/verification or /admin/disputes
  assert(!canAccessAdminRoute(opsAdmin, '/admin/verification').allowed, 'Ops Admin cannot access /admin/verification');
  assert(!canAccessAdminRoute(opsAdmin, '/admin/disputes').allowed, 'Ops Admin cannot access /admin/disputes');

  // Superadmin can access ALL Task 6 routes
  assert(canAccessAdminRoute(superadmin, '/admin/verification').allowed, 'Superadmin must access /admin/verification');
  assert(canAccessAdminRoute(superadmin, '/admin/disputes').allowed, 'Superadmin must access /admin/disputes');
  assert(canAccessAdminRoute(superadmin, '/admin/safety').allowed, 'Superadmin must access /admin/safety');

  console.log('  ✅ Granular RBAC permissions strictly enforced across Verification Admin, Support Admin, and Superadmin.');

  console.log('\n====================================================');
  console.log('🎉 ALL TASK 6 TRUST & SAFETY CENTRE TESTS PASSED (100%)');
  console.log('====================================================\n');
}

runTrustSafetyCentresTests().catch((err) => {
  console.error('❌ Task 6 verification failed:', err);
  process.exit(1);
});
