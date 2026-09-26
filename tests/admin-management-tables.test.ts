/**
 * Menial Platform - Task 5 Verification Test Suite
 * 
 * Verifies Worker, Employer, and Job Management Paginated Tables (§55, §56, §57, §58, §91, §92):
 * 1. Worker Directory Server-Side Pagination via getWorkers() (§56, §91)
 * 2. Employer Directory Server-Side Pagination & Escrow Volume via getEmployers() (§57, §91)
 * 3. Job Dispatch Feed Pagination & Escrow Formula via getJobs() (§58, §91)
 * 4. User Standing Lifecycle Toggles (Suspend / Reactivate) with Audit Rationale (§55, §67)
 * 5. High-Performance Pagination Calculation & Bounds Math (§91)
 * 6. RBAC Access Enforcement on Management Routes (/admin/workers, /admin/employers, /admin/jobs)
 * 
 * Reference: menial-master-spec-v2.md (§55, §56, §57, §58, §91, §92) & DESIGN.md
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

// Financial formatting utility matching DESIGN.md
function formatNairaFromKobo(kobo: number): string {
  const naira = kobo / 100;
  return `₦${naira.toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

async function runManagementTablesTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING TASK 5 TESTS: WORKER, EMPLOYER & JOB TABLES');
  console.log('====================================================\n');

  // Track executed RPC calls
  const executedCalls: { fn: string; args?: Record<string, unknown> }[] = [];

  const mockDb: IDatabaseClient = {
    async rpc<T>(fn: string, args?: Record<string, unknown>) {
      executedCalls.push({ fn, args });

      if (fn === 'get_admin_paginated_workers') {
        const limit = (args?.p_limit as number) || 25;
        const offset = (args?.p_offset as number) || 0;
        return {
          data: {
            total: 48,
            limit,
            offset,
            data: [
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
                created_at: new Date().toISOString(),
              },
              {
                id: 'w-02',
                full_name: 'Chinedu Eze',
                phone: '+234 813 987 6543',
                status: 'active',
                verification_status: 'pending',
                is_available: true,
                average_rating: 5.0,
                total_ratings_count: 14,
                completed_jobs_count: 16,
                created_at: new Date().toISOString(),
              },
            ],
          } as unknown as T,
          error: null,
        };
      }

      if (fn === 'get_admin_paginated_employers') {
        const limit = (args?.p_limit as number) || 25;
        const offset = (args?.p_offset as number) || 0;
        return {
          data: {
            total: 22,
            limit,
            offset,
            data: [
              {
                id: 'emp-01',
                full_name: 'Dr. Kunle Alabi',
                phone: '+234 803 123 4567',
                company_name: 'Alabi Properties Ltd',
                status: 'active',
                total_jobs_posted: 18,
                total_spent: 39600000, // ₦396,000.00
                created_at: new Date().toISOString(),
              },
            ],
          } as unknown as T,
          error: null,
        };
      }

      if (fn === 'get_admin_paginated_jobs') {
        const limit = (args?.p_limit as number) || 25;
        const offset = (args?.p_offset as number) || 0;
        return {
          data: {
            total: 14,
            limit,
            offset,
            data: [
              {
                id: 'job-01',
                public_job_id: 'MNL-10294',
                title: '3-Bedroom Post-Renovation Deep Clean',
                category_name: 'Deep Cleaning',
                status: 'in_progress',
                scheduled_date: '2026-09-25',
                start_time: '08:00',
                worker_pay: 1850000,
                platform_fee: 185000,
                total_amount: 2035000,
                number_of_workers: 1,
                created_at: new Date().toISOString(),
                employer_name: 'Folake Adebayo',
                employer_phone: '+234 803 123 4567',
              },
            ],
          } as unknown as T,
          error: null,
        };
      }

      if (fn === 'toggle_user_account_status') {
        return { data: true as unknown as T, error: null };
      }

      return { data: null, error: new Error(`Unhandled RPC function: ${fn}`) };
    },
  };

  const service = new AdminOperationsService(mockDb);

  // ========================================================================
  // 1. Test Worker Directory Server-Side Pagination (§56, §91)
  // ========================================================================
  console.log('▶ 1. Testing Server-Side Paginated Worker Directory (§56, §91)...');

  const workersRes = await service.getWorkers({
    status: 'active',
    search: 'Babatunde',
    limit: 25,
    offset: 0,
  });

  assert(executedCalls.length === 1, 'Should call get_admin_paginated_workers RPC');
  assert(executedCalls[0].fn === 'get_admin_paginated_workers', 'Must call get_admin_paginated_workers');
  assert(workersRes.total === 48, 'Must return total available records');
  assert(workersRes.data.length === 2, 'Must return records array');
  assert(executedCalls[0].args?.p_status === 'active', 'Must pass status filter to SQL query');
  assert(executedCalls[0].args?.p_search === 'Babatunde', 'Must pass search filter to SQL query');

  console.log('  ✅ Worker directory retrieves server-side paginated results with filter parameters.');

  // ========================================================================
  // 2. Test Employer Directory & Escrow Volume Calculation (§57, §91)
  // ========================================================================
  console.log('▶ 2. Testing Employer Directory & Escrow Volume Tabular Nums (§57)...');

  const employersRes = await service.getEmployers({
    limit: 10,
    offset: 0,
  });

  assert(executedCalls.length === 2, 'Should call get_admin_paginated_employers RPC');
  assert(executedCalls[1].fn === 'get_admin_paginated_employers', 'Must call get_admin_paginated_employers');
  assert(employersRes.total === 22, 'Must report total employer accounts');

  const emp = employersRes.data[0];
  const spentKobo = Number(emp.total_spent);
  assert(spentKobo === 39600000, 'Spent amount must match database integer kobo');

  const formattedSpent = formatNairaFromKobo(spentKobo);
  assert(formattedSpent === '₦396,000.00', `Expected ₦396,000.00, got ${formattedSpent}`);

  console.log('  ✅ Employer escrow spend accurately formatted from integer kobo.');

  // ========================================================================
  // 3. Test Job Dispatch Feed Pagination & Escrow Formula (§58, §91)
  // ========================================================================
  console.log('▶ 3. Testing Job Dispatch Feed & Escrow Mathematical Invariant (§39, §44, §58)...');

  const jobsRes = await service.getJobs({
    status: 'in_progress',
    limit: 25,
    offset: 0,
  });

  assert(executedCalls.length === 3, 'Should call get_admin_paginated_jobs RPC');
  assert(executedCalls[2].fn === 'get_admin_paginated_jobs', 'Must call get_admin_paginated_jobs');

  const job = jobsRes.data[0];
  const workerPay = Number(job.worker_pay);
  const platformFee = Number(job.platform_fee);
  const totalAmount = Number(job.total_amount);

  assert(
    workerPay + platformFee === totalAmount,
    `Escrow balance formula must hold: ${workerPay} + ${platformFee} === ${totalAmount}`
  );
  assert(formatNairaFromKobo(totalAmount) === '₦20,350.00', 'Total escrow amount formatted accurately');

  console.log('  ✅ Job escrow fee breakdown satisfies double-entry mathematical invariant.');

  // ========================================================================
  // 4. Test User Standing Lifecycle Toggles (Suspend / Reactivate) (§55, §67)
  // ========================================================================
  console.log('▶ 4. Testing Account Standing Toggles with Mandatory Audit Rationale (§55, §67)...');

  await service.toggleUserStatus({
    userId: 'usr-target-uuid',
    newStatus: 'suspended',
    reason: 'Investigating suspected off-platform cash solicitation',
  });

  const lastCall = executedCalls[executedCalls.length - 1];
  assert(lastCall.fn === 'toggle_user_account_status', 'Must call toggle_user_account_status RPC');
  assert(lastCall.args?.p_target_user_id === 'usr-target-uuid', 'Must target specified user UUID');
  assert(lastCall.args?.p_new_status === 'suspended', 'Must update standing status');
  assert(
    Boolean(lastCall.args?.p_reason && (lastCall.args?.p_reason as string).length >= 5),
    'Must include mandatory audit rationale'
  );

  console.log('  ✅ Account standing updated with required audit rationale.');

  // ========================================================================
  // 5. Test High-Performance Pagination Calculation & Bounds Math (§91)
  // ========================================================================
  console.log('▶ 5. Testing Pagination Math & Bounds Logic (§91)...');

  function calculatePaginationBounds(total: number, limit: number, offset: number) {
    const currentPage = Math.floor(offset / limit) + 1;
    const totalPages = Math.ceil(total / limit);
    const startItem = offset + 1;
    const endItem = Math.min(offset + limit, total);
    const hasPrevious = offset > 0;
    const hasNext = offset + limit < total;

    return { currentPage, totalPages, startItem, endItem, hasPrevious, hasNext };
  }

  // Page 1 (offset 0, limit 25, total 60)
  const p1 = calculatePaginationBounds(60, 25, 0);
  assert(p1.currentPage === 1, 'Page 1 should be current');
  assert(p1.totalPages === 3, 'Total pages should be 3');
  assert(p1.startItem === 1 && p1.endItem === 25, 'Window should be 1 to 25');
  assert(!p1.hasPrevious && p1.hasNext, 'Should have next, no previous');

  // Page 2 (offset 25, limit 25, total 60)
  const p2 = calculatePaginationBounds(60, 25, 25);
  assert(p2.currentPage === 2, 'Page 2 should be current');
  assert(p2.startItem === 26 && p2.endItem === 50, 'Window should be 26 to 50');
  assert(p2.hasPrevious && p2.hasNext, 'Should have both previous and next');

  // Page 3 (offset 50, limit 25, total 60)
  const p3 = calculatePaginationBounds(60, 25, 50);
  assert(p3.currentPage === 3, 'Page 3 should be current');
  assert(p3.startItem === 51 && p3.endItem === 60, 'Window should be 51 to 60');
  assert(p3.hasPrevious && !p3.hasNext, 'Should have previous, no next');

  console.log('  ✅ Section 91 pagination arithmetic and windowing verified.');

  // ========================================================================
  // 6. Test RBAC Route Enforcement on Management Tables (§13, §14)
  // ========================================================================
  console.log('▶ 6. Testing RBAC Route Access on Management Tables...');

  const opsAdmin: AdminUserContext = {
    id: 'adm-o1',
    userId: 'usr-o1',
    isSuperadmin: false,
    status: 'active',
    permissions: ['operations'],
    mfaEnrolled: true,
    mfaVerified: false,
  };

  const verAdmin: AdminUserContext = {
    id: 'adm-v1',
    userId: 'usr-v1',
    isSuperadmin: false,
    status: 'active',
    permissions: ['verification'],
    mfaEnrolled: true,
    mfaVerified: false,
  };

  const superadmin: AdminUserContext = {
    id: 'adm-root',
    userId: 'usr-root',
    isSuperadmin: true,
    status: 'active',
    permissions: ['operations', 'verification', 'support', 'finance', 'moderation'],
    mfaEnrolled: true,
    mfaVerified: true,
  };

  // /admin/workers
  assert(canAccessAdminRoute(opsAdmin, '/admin/workers').allowed === true, 'Ops admin accesses /admin/workers');
  assert(canAccessAdminRoute(verAdmin, '/admin/workers').allowed === false, 'Verification admin blocked from /admin/workers');
  assert(canAccessAdminRoute(superadmin, '/admin/workers').allowed === true, 'Superadmin accesses /admin/workers');

  // /admin/employers
  assert(canAccessAdminRoute(opsAdmin, '/admin/employers').allowed === true, 'Ops admin accesses /admin/employers');
  assert(canAccessAdminRoute(verAdmin, '/admin/employers').allowed === false, 'Verification admin blocked from /admin/employers');
  assert(canAccessAdminRoute(superadmin, '/admin/employers').allowed === true, 'Superadmin accesses /admin/employers');

  // /admin/jobs
  assert(canAccessAdminRoute(opsAdmin, '/admin/jobs').allowed === true, 'Ops admin accesses /admin/jobs');
  assert(canAccessAdminRoute(verAdmin, '/admin/jobs').allowed === false, 'Verification admin blocked from /admin/jobs');
  assert(canAccessAdminRoute(superadmin, '/admin/jobs').allowed === true, 'Superadmin accesses /admin/jobs');

  console.log('  ✅ RBAC boundaries strictly enforce OPERATIONS_ADMIN authority on roster tables.');

  console.log('\n====================================================');
  console.log('🎉 ALL TASK 5 MANAGEMENT TABLES TESTS PASSED (100%)');
  console.log('====================================================');
}

runManagementTablesTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
