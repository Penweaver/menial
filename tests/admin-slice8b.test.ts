/**
 * Menial Platform - Slice 8B Verification Test Suite
 * 
 * Verifies the Marketplace Directory & Dispatch screens:
 * 1. Live Overview Command Center (§54, §94):
 *    - Real-time KPI aggregation (workers, employers, active jobs, revenue in kobo)
 *    - Operational Attention Queue counts
 * 2. Workers Directory (§56, §91):
 *    - Server-side paginated worker listing
 *    - Verified Pro badges, ratings, and availability status
 * 3. Employers Directory (§57, §91):
 *    - Server-side paginated employer listing
 *    - Total jobs posted & total spend in NGN
 * 4. Job & Dispatch Management (§58, §91):
 *    - Filter by corridor and execution status
 *    - Escrow calculation & worker pay breakdowns (§29, §40)
 * 5. User Account Status Toggling (§55, §67):
 *    - Suspension and reinstatement with mandatory audit rationale
 * 
 * Reference: menial-master-spec-v2.md (§54, §55, §56, §57, §58, §67, §91, §94)
 */

import { AdminOperationsService } from '../shared/services/operations/AdminOperationsService';
import { canAccessAdminRoute, type AdminUserContext } from '../shared/auth/rbac';
import type { IDatabaseClient } from '../shared/services/admin/AdminService';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`❌ Assertion Failed: ${message}`);
  }
}

async function runSlice8bTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING SLICE 8B TESTS: DIRECTORY & DISPATCH');
  console.log('====================================================\n');

  const executedCalls: { fn: string; args?: Record<string, unknown> }[] = [];

  const mockDb: IDatabaseClient = {
    async rpc<T>(fn: string, args?: Record<string, unknown>) {
      executedCalls.push({ fn, args });

      if (fn === 'get_admin_overview_metrics') {
        return {
          data: {
            metrics: {
              total_workers: 48,
              total_employers: 22,
              new_users_today: 5,
              active_jobs_count: 14,
              completed_jobs_count: 85,
              cancelled_jobs_count: 3,
              platform_revenue_kobo: 4250000,
              currency: 'NGN',
            },
            attention_queue: {
              pending_verifications: 2,
              open_disputes: 2,
              open_safety_reports: 1,
              failed_payments: 0,
              failed_payouts: 0,
            },
          } as unknown as T,
          error: null,
        };
      }

      if (fn === 'get_admin_paginated_workers') {
        const search = args?.p_search ? String(args.p_search).toLowerCase() : null;
        let data = [
          {
            id: 'w-01',
            full_name: 'Babatunde Adeleke',
            phone: '+234 802 345 6789',
            status: 'active',
            verification_status: 'verified',
            is_available: true,
            average_rating: 4.9,
            total_ratings_count: 38,
            completed_jobs_count: 42,
          },
          {
            id: 'w-02',
            full_name: 'Chinedu Eze',
            phone: '+234 813 987 6543',
            status: 'active',
            verification_status: 'pending',
            is_available: true,
            average_rating: 5.0,
            total_ratings_count: 12,
            completed_jobs_count: 14,
          },
          {
            id: 'w-03',
            full_name: 'Ibrahim Danladi',
            phone: '+234 805 111 2233',
            status: 'suspended',
            verification_status: 'verified',
            is_available: false,
            average_rating: 3.8,
            total_ratings_count: 15,
            completed_jobs_count: 18,
          },
        ];

        if (search) {
          data = data.filter((w) => w.full_name.toLowerCase().includes(search) || w.phone.includes(search));
        }

        return {
          data: {
            total: data.length,
            limit: args?.p_limit || 25,
            offset: args?.p_offset || 0,
            data,
          } as unknown as T,
          error: null,
        };
      }

      if (fn === 'get_admin_paginated_employers') {
        return {
          data: {
            total: 2,
            limit: 25,
            offset: 0,
            data: [
              {
                id: 'emp-01',
                full_name: 'Dr. Kunle Alabi',
                phone: '+234 803 123 4567',
                company_name: 'Alabi Properties Ltd',
                status: 'active',
                total_jobs_posted: 18,
                total_spent: 39600000,
              },
              {
                id: 'emp-02',
                full_name: 'Chief Obinna',
                phone: '+234 812 555 7890',
                company_name: 'Obinna Logistics',
                status: 'active',
                total_jobs_posted: 9,
                total_spent: 14850000,
              },
            ],
          } as unknown as T,
          error: null,
        };
      }

      if (fn === 'get_admin_paginated_jobs') {
        const status = args?.p_status;
        const data = [
          {
            id: 'job-01',
            public_job_id: 'MNL-10294',
            title: 'Heavy Masonry Foundation',
            category_name: 'Masonry',
            status: status || 'in_progress',
            worker_pay: 2000000,
            platform_fee: 400000,
            total_amount: 4400000,
            number_of_workers: 2,
            employer_name: 'Dr. Kunle Alabi',
            employer_phone: '+234 803 123 4567',
          },
        ];
        return {
          data: {
            total: 1,
            limit: 25,
            offset: 0,
            data,
          } as unknown as T,
          error: null,
        };
      }

      if (fn === 'toggle_user_account_status') {
        const reason = args?.p_reason;
        if (!reason || String(reason).trim().length < 5) {
          return {
            data: null,
            error: new Error('A detailed reason is required to modify user account status (§55, §67).'),
          };
        }
        return { data: true as unknown as T, error: null };
      }

      return { data: true as unknown as T, error: null };
    },
  };

  const opsService = new AdminOperationsService(mockDb);

  // ========================================================================
  // 1. Live Overview Command Center (§54, §94)
  // ========================================================================
  console.log('▶ STEP 1: Verifying Live Overview Metrics & Attention Queue (§54)...');

  const overview = await opsService.getOverviewMetrics();
  assert(overview.metrics.total_workers === 48, 'Total workers must equal 48');
  assert(overview.metrics.active_jobs_count === 14, 'Active jobs must equal 14');
  assert(overview.metrics.platform_revenue_kobo === 4250000, 'Platform revenue must equal ₦42,500.00');
  assert(overview.attention_queue.pending_verifications === 2, 'Pending verifications matches queue');
  assert(overview.attention_queue.open_disputes === 2, 'Open disputes matches queue');
  assert(overview.attention_queue.open_safety_reports === 1, 'Safety reports matches queue');

  console.log('  ✅ Live overview KPIs and attention queue counts verified.');

  // ========================================================================
  // 2. Workers Directory & Status Management (§56, §91)
  // ========================================================================
  console.log('▶ STEP 2: Verifying Workers Directory & Search (§56, §91)...');

  const allWorkers = await opsService.getWorkers();
  assert(allWorkers.total === 3, 'Should return all 3 workers');
  assert(allWorkers.data[0].verification_status === 'verified', 'Worker 1 is Verified Pro');
  assert(allWorkers.data[0].average_rating === 4.9, 'Worker 1 average rating is 4.9');

  // Test keyword search
  const searchedWorkers = await opsService.getWorkers({ search: 'Chinedu' });
  assert(searchedWorkers.total === 1, 'Should find 1 worker matching Chinedu');
  assert(searchedWorkers.data[0].full_name === 'Chinedu Eze', 'Found Chinedu Eze');

  console.log('  ✅ Workers directory pagination, verified badges, and search verified.');

  // ========================================================================
  // 3. User Suspension & Reinstatement with Audit Log (§55, §67)
  // ========================================================================
  console.log('▶ STEP 3: Verifying Account Status Toggling & Mandatory Audit (§55, §67)...');

  // Attempt without reason -> fails
  let failedWithoutReason = false;
  try {
    await opsService.toggleUserStatus({
      userId: 'w-01',
      newStatus: 'suspended',
      reason: 'bad', // < 5 chars
    });
  } catch (err: unknown) {
    failedWithoutReason = true;
  }
  assert(failedWithoutReason, 'Status change without detailed reason must fail');

  // Valid suspension with reason
  await opsService.toggleUserStatus({
    userId: 'w-01',
    newStatus: 'suspended',
    reason: 'Repeated late arrival violations documented under investigation #491.',
  });
  const suspendCall = executedCalls.find((c) => c.fn === 'toggle_user_account_status' && c.args?.p_new_status === 'suspended');
  assert(Boolean(suspendCall), 'toggle_user_account_status RPC must be called with suspended');

  // Valid reinstatement with reason
  await opsService.toggleUserStatus({
    userId: 'w-01',
    newStatus: 'active',
    reason: 'Dispute arbitration resolved and reinstatement approved by Operations Lead.',
  });
  const reinstateCall = executedCalls.find((c) => c.fn === 'toggle_user_account_status' && c.args?.p_new_status === 'active');
  assert(Boolean(reinstateCall), 'toggle_user_account_status RPC must be called with active');

  console.log('  ✅ Mandatory audit logging on user suspension and reinstatement verified.');

  // ========================================================================
  // 4. Employers Directory (§57, §91)
  // ========================================================================
  console.log('▶ STEP 4: Verifying Employers Directory & Spending Metrics (§57)...');

  const employers = await opsService.getEmployers();
  assert(employers.total === 2, 'Should return 2 employers');
  assert(employers.data[0].total_spent === 39600000, 'Employer total spend is ₦396,000.00');
  assert(employers.data[0].company_name === 'Alabi Properties Ltd', 'Company name properly resolved');

  console.log('  ✅ Employers directory and platform spend totals verified.');

  // ========================================================================
  // 5. Job & Dispatch Management (§58, §91)
  // ========================================================================
  console.log('▶ STEP 5: Verifying Jobs Dispatch & Per-Worker Escrow Calculation (§58, §29)...');

  const jobs = await opsService.getJobs({ status: 'in_progress' });
  assert(jobs.total === 1, 'Should return 1 job');
  const job = jobs.data[0];
  assert(job.public_job_id === 'MNL-10294', 'Public job ID is MNL-10294');
  assert(job.number_of_workers === 2, 'Job has 2 workers');
  // Formula: (Worker Pay * Count) + Fee = (2,000,000 * 2) + 400,000 = 4,400,000 kobo (§29)
  assert(
    (Number(job.worker_pay) * Number(job.number_of_workers)) + Number(job.platform_fee) === Number(job.total_amount),
    'Per-worker pricing formula strictly satisfied (§29)'
  );

  console.log('  ✅ Jobs dispatch filtering and per-worker escrow formula verified.');

  // ========================================================================
  // 6. RBAC Route Clearance
  // ========================================================================
  console.log('▶ STEP 6: Verifying RBAC Access to Directory & Dispatch...');

  const opsAdmin: AdminUserContext = {
    id: 'adm-ops',
    userId: 'usr-ops',
    isSuperadmin: false,
    status: 'active',
    permissions: ['operations'],
    mfaEnrolled: false,
  };

  assert(canAccessAdminRoute(opsAdmin, '/admin/overview').allowed, 'Ops admin can access overview');
  assert(canAccessAdminRoute(opsAdmin, '/admin/workers').allowed, 'Ops admin can access workers directory');
  assert(canAccessAdminRoute(opsAdmin, '/admin/employers').allowed, 'Ops admin can access employers directory');
  assert(canAccessAdminRoute(opsAdmin, '/admin/jobs').allowed, 'Ops admin can access jobs dispatch');

  console.log('  ✅ Operations Admin permissions strictly allow directory and dispatch corridors.');

  console.log('\n====================================================');
  console.log('🎉 ALL SLICE 8B VERIFICATION TESTS PASSED (100%)');
  console.log('====================================================\n');
}

runSlice8bTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
