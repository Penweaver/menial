/**
 * Menial Platform - Task 3 Verification Test Suite
 * 
 * Verifies Overview Dashboard & Operational Attention Queue (§54, §92, §94):
 * 1. Overview Metrics & Attention Queue RPC mapping via AdminOperationsService
 * 2. Strict non-fabricated data integrity (§94):
 *    - Real worker, employer, active/completed/cancelled job counts
 *    - Integer kobo platform revenue calculation and NGN currency formatting
 * 3. Operational Attention Queue triage categories (§54):
 *    - Pending verifications, open disputes, open safety reports, failed payments, failed payouts
 * 4. RBAC route accessibility and MFA step-up requirements for Attention Queue destination routes
 * 
 * Reference: menial-master-spec-v2.md (§54, §92, §94) & DESIGN.md
 */

import {
  AdminOperationsService,
  type OverviewMetricsData,
} from '../shared/services/operations/AdminOperationsService';
import type { IDatabaseClient } from '../shared/services/admin/AdminService';
import { canAccessAdminRoute, type AdminUserContext } from '../shared/auth/rbac';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`❌ Assertion Failed: ${message}`);
  }
}

// Financial formatting utility matching OverviewKpiGrid implementation
function formatNairaFromKobo(kobo: number): string {
  const naira = kobo / 100;
  return `₦${naira.toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

async function runOverviewQueueTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING TASK 3 TESTS: OVERVIEW & ATTENTION QUEUE (§54)');
  console.log('====================================================\n');

  // Track executed database calls
  const executedCalls: { fn: string; args?: Record<string, unknown> }[] = [];

  const mockDatabaseMetrics: OverviewMetricsData = {
    metrics: {
      total_workers: 52,
      total_employers: 28,
      new_users_today: 7,
      active_jobs_count: 18,
      completed_jobs_count: 94,
      cancelled_jobs_count: 4,
      platform_revenue_kobo: 5850000, // ₦58,500.00
      currency: 'NGN',
    },
    attention_queue: {
      pending_verifications: 5,
      open_disputes: 2,
      open_safety_reports: 1,
      failed_payments: 3,
      failed_payouts: 1,
    },
  };

  const mockDb: IDatabaseClient = {
    async rpc<T>(fn: string, args?: Record<string, unknown>) {
      executedCalls.push({ fn, args });

      if (fn === 'get_admin_overview_metrics') {
        return { data: mockDatabaseMetrics as unknown as T, error: null };
      }

      return { data: null, error: new Error(`Unhandled RPC function: ${fn}`) };
    },
  };

  const service = new AdminOperationsService(mockDb);

  // ========================================================================
  // 1. Test Overview Metrics Retrieval via RPC (§54)
  // ========================================================================
  console.log('▶ 1. Testing AdminOperationsService.getOverviewMetrics()...');

  const overview = await service.getOverviewMetrics();

  assert(executedCalls.length === 1, 'RPC should have been invoked exactly once');
  assert(
    executedCalls[0].fn === 'get_admin_overview_metrics',
    'Must invoke get_admin_overview_metrics stored procedure'
  );
  assert(overview !== null, 'Overview result must not be null');

  console.log('  ✅ get_admin_overview_metrics RPC called and parsed successfully.');

  // ========================================================================
  // 2. Validate All 7+ Section 54 Operational Metrics & Section 94 Compliance
  // ========================================================================
  console.log('▶ 2. Validating Section 54 Operational Metrics & Non-Fabrication (§94)...');

  const m = overview.metrics;
  assert(typeof m.total_workers === 'number' && m.total_workers === 52, 'Workers count must match database');
  assert(typeof m.total_employers === 'number' && m.total_employers === 28, 'Employers count must match database');
  assert(typeof m.new_users_today === 'number' && m.new_users_today === 7, 'New users today must match database');
  assert(typeof m.active_jobs_count === 'number' && m.active_jobs_count === 18, 'Active jobs must match database');
  assert(typeof m.completed_jobs_count === 'number' && m.completed_jobs_count === 94, 'Completed jobs must match database');
  assert(typeof m.cancelled_jobs_count === 'number' && m.cancelled_jobs_count === 4, 'Cancelled jobs must match database');
  assert(typeof m.platform_revenue_kobo === 'number' && m.platform_revenue_kobo === 5850000, 'Platform revenue kobo must match database');
  assert(m.currency === 'NGN', 'Platform currency must strictly be NGN');

  console.log('  ✅ All operational metrics adhere to Section 54 and non-fabrication (§94).');

  // ========================================================================
  // 3. Test Currency Formatting (Integer Kobo to NGN with Tabular Nums)
  // ========================================================================
  console.log('▶ 3. Testing Integer Kobo Currency Formatting per DESIGN.md...');

  const formattedRevenue = formatNairaFromKobo(m.platform_revenue_kobo);
  assert(
    formattedRevenue === '₦58,500.00',
    `Expected '₦58,500.00', but got '${formattedRevenue}'`
  );

  const zeroKobo = formatNairaFromKobo(0);
  assert(zeroKobo === '₦0.00', `Expected '₦0.00' for 0 kobo, got '${zeroKobo}'`);

  const smallKobo = formatNairaFromKobo(12550);
  assert(smallKobo === '₦125.50', `Expected '₦125.50' for 12550 kobo, got '${smallKobo}'`);

  console.log('  ✅ Integer kobo correctly formatted to Nigerian Naira (₦) with decimal accuracy.');

  // ========================================================================
  // 4. Validate Section 54 Attention Queue Categories & Action Triage
  // ========================================================================
  console.log('▶ 4. Validating Section 54 Attention Queue Fields & Triage Counts...');

  const q = overview.attention_queue;
  assert(typeof q.pending_verifications === 'number' && q.pending_verifications === 5, 'Pending verifications must match');
  assert(typeof q.open_disputes === 'number' && q.open_disputes === 2, 'Open disputes must match');
  assert(typeof q.open_safety_reports === 'number' && q.open_safety_reports === 1, 'Open safety reports must match');
  assert(typeof q.failed_payments === 'number' && q.failed_payments === 3, 'Failed payments must match');
  assert(typeof q.failed_payouts === 'number' && q.failed_payouts === 1, 'Failed payouts must match');

  const totalAttention = q.pending_verifications + q.open_disputes + q.open_safety_reports + q.failed_payments + q.failed_payouts;
  assert(totalAttention === 12, `Total attention items should be 12, got ${totalAttention}`);

  console.log('  ✅ Section 54 Attention Queue categories and triage counts verified.');

  // ========================================================================
  // 5. Test RBAC Route Accessibility for Attention Queue Destinations
  // ========================================================================
  console.log('▶ 5. Testing RBAC Route Access & Step-Up on Attention Queue Destinations...');

  // Verification Admin context (no finance, no support)
  const verAdmin: AdminUserContext = {
    id: 'adm-v1',
    userId: 'usr-v1',
    isSuperadmin: false,
    status: 'active',
    permissions: ['verification'],
    mfaEnrolled: true,
    mfaVerified: false,
  };

  // Support Admin context (disputes & safety)
  const supportAdmin: AdminUserContext = {
    id: 'adm-s1',
    userId: 'usr-s1',
    isSuperadmin: false,
    status: 'active',
    permissions: ['support'],
    mfaEnrolled: true,
    mfaVerified: false,
  };

  // Finance Admin context (without MFA step-up)
  const financeAdminNoMfa: AdminUserContext = {
    id: 'adm-f1',
    userId: 'usr-f1',
    isSuperadmin: false,
    status: 'active',
    permissions: ['finance'],
    mfaEnrolled: true,
    mfaVerified: false,
  };

  // Finance Admin context (with MFA step-up)
  const financeAdminMfa: AdminUserContext = {
    id: 'adm-f1',
    userId: 'usr-f1',
    isSuperadmin: false,
    status: 'active',
    permissions: ['finance'],
    mfaEnrolled: true,
    mfaVerified: true,
  };

  // Route 1: /admin/verification
  assert(
    canAccessAdminRoute(verAdmin, '/admin/verification').allowed === true,
    'Verification admin should access /admin/verification'
  );
  assert(
    canAccessAdminRoute(supportAdmin, '/admin/verification').allowed === false,
    'Support admin should NOT access /admin/verification'
  );

  // Route 2: /admin/disputes (requires support permission)
  assert(
    canAccessAdminRoute(supportAdmin, '/admin/disputes').allowed === true,
    'Support admin should access /admin/disputes'
  );
  assert(
    canAccessAdminRoute(verAdmin, '/admin/disputes').allowed === false,
    'Verification admin should NOT access /admin/disputes'
  );

  // Route 3: /admin/safety (requires support permission)
  assert(
    canAccessAdminRoute(supportAdmin, '/admin/safety').allowed === true,
    'Support admin should access /admin/safety'
  );
  assert(
    canAccessAdminRoute(verAdmin, '/admin/safety').allowed === false,
    'Verification admin should NOT access /admin/safety'
  );

  // Route 4 & 5: /admin/payments and /admin/payouts (Require finance + MFA step-up)
  assert(
    canAccessAdminRoute(financeAdminNoMfa, '/admin/payments').allowed === false,
    'Finance admin without MFA step-up must be blocked from /admin/payments'
  );
  assert(
    canAccessAdminRoute(financeAdminMfa, '/admin/payments').allowed === true,
    'Finance admin with MFA step-up must access /admin/payments'
  );

  assert(
    canAccessAdminRoute(financeAdminNoMfa, '/admin/payouts').allowed === false,
    'Finance admin without MFA step-up must be blocked from /admin/payouts'
  );
  assert(
    canAccessAdminRoute(financeAdminMfa, '/admin/payouts').allowed === true,
    'Finance admin with MFA step-up must access /admin/payouts'
  );

  console.log('  ✅ Attention Queue routes strictly enforce RBAC and MFA step-up challenges.');

  // ========================================================================
  // 6. Test Error Handling in AdminOperationsService
  // ========================================================================
  console.log('▶ 6. Testing RPC Error Handling & Resilience...');

  const failingDb: IDatabaseClient = {
    async rpc() {
      return { data: null, error: new Error('Database connection failed') };
    },
  };

  const failingService = new AdminOperationsService(failingDb);
  let errorCaught = false;

  try {
    await failingService.getOverviewMetrics();
  } catch (err: unknown) {
    errorCaught = true;
    assert(
      (err as Error).message.includes('Failed to fetch overview metrics'),
      'Should throw descriptive error message on RPC failure'
    );
  }

  assert(errorCaught, 'RPC failure must throw an exception to be handled by caller');

  console.log('  ✅ Error handling and error message formatting verified.');

  console.log('\n====================================================');
  console.log('🎉 ALL TASK 3 OVERVIEW & ATTENTION QUEUE TESTS PASSED (100%)');
  console.log('====================================================');
}

runOverviewQueueTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
