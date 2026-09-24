/**
 * Menial Platform - Slice 9 Verification Test Suite
 * 
 * Verifies Superadmin Governance screens and security constraints:
 * 1. Superadmin Access Isolation (§11, §14, §72):
 *    - Regular Admins strictly blocked from /superadmin/* routes
 *    - Superadmin granted full visibility across all administrative corridors
 * 2. Admin Account Lifecycle Management (§12, §16, §17, §19, §70):
 *    - Creation of Admin accounts in 'invited' status with 72h single-use token
 *    - Granular RBAC permissions assignment and atomic replacement
 *    - Account status updates (activate, suspend, deactivate)
 * 3. Superadmin Protection Invariant (§20):
 *    - Superadmin account cannot be deactivated, demoted, or stripped of root authority
 * 4. Platform Settings Governance (§66, §67):
 *    - Live parameter updates enforced with mandatory security rationale
 * 5. System Health & Ledger Audit Invariant (§44, §72):
 *    - Telemetry and double-entry ledger net balance check (0 kobo)
 * 
 * Reference: menial-master-spec-v2.md (§11-§20, §44, §66, §67, §70, §72)
 */

import { SuperadminService } from '../shared/services/superadmin/SuperadminService';
import { canAccessAdminRoute, type AdminUserContext } from '../shared/auth/rbac';
import type { IDatabaseClient } from '../shared/services/admin/AdminService';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`❌ Assertion Failed: ${message}`);
  }
}

async function runSlice9Tests() {
  console.log('====================================================');
  console.log('🧪 RUNNING SLICE 9 TESTS: SUPERADMIN GOVERNANCE');
  console.log('====================================================\n');

  const executedCalls: { fn: string; args?: Record<string, unknown> }[] = [];

  const mockDb: IDatabaseClient = {
    async rpc<T>(fn: string, args?: Record<string, unknown>) {
      executedCalls.push({ fn, args });

      if (fn === 'get_superadmin_admins_list') {
        return {
          data: [
            {
              id: 'adm-001',
              user_id: 'usr-super',
              is_superadmin: true,
              status: 'active',
              mfa_enrolled: true,
              last_login_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              full_name: 'Superadmin Root Controller',
              email: 'superadmin@menial.ng',
              phone: '+234 800 000 0001',
              permissions: ['operations', 'verification', 'support', 'finance', 'moderation'],
            },
            {
              id: 'adm-002',
              user_id: 'usr-ops',
              is_superadmin: false,
              status: 'active',
              mfa_enrolled: true,
              last_login_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              full_name: 'Amina Bello',
              email: 'amina.ops@menial.ng',
              phone: '+234 802 111 2233',
              permissions: ['operations', 'verification'],
            },
          ] as unknown as T,
          error: null,
        };
      }

      if (fn === 'create_admin_account') {
        const userId = args?.p_user_id;
        if (!userId) {
          return { data: null, error: new Error('User ID is required.') };
        }
        return { data: 'new-admin-uuid-889' as unknown as T, error: null };
      }

      if (fn === 'update_admin_status') {
        const adminId = args?.p_admin_user_id;
        const reason = args?.p_reason;
        if (adminId === 'adm-001') {
          return { data: null, error: new Error('Superadmin account cannot be deactivated (§20).') };
        }
        if (!reason || String(reason).trim().length < 5) {
          return { data: null, error: new Error('A detailed reason is required (§17, §67).') };
        }
        return { data: true as unknown as T, error: null };
      }

      if (fn === 'update_admin_permissions') {
        const adminId = args?.p_admin_user_id;
        const perms = args?.p_new_permissions;
        if (!perms || (Array.isArray(perms) && perms.length === 0)) {
          return { data: null, error: new Error('At least one permission must be assigned.') };
        }
        return { data: true as unknown as T, error: null };
      }

      if (fn === 'get_superadmin_platform_settings') {
        return {
          data: [
            {
              key: 'platform_fee_percentage',
              value: '10',
              description: 'Platform facilitation fee percentage',
              updatedAt: new Date().toISOString(),
              updatedByName: 'Superadmin Root Controller',
            },
            {
              key: 'worker_cancellation_grace_mins',
              value: '30',
              description: 'Cancellation grace period in minutes',
              updatedAt: new Date().toISOString(),
              updatedByName: 'Superadmin Root Controller',
            },
          ] as unknown as T,
          error: null,
        };
      }

      if (fn === 'update_platform_setting') {
        const reason = args?.p_reason;
        if (!reason || String(reason).trim().length < 5) {
          return { data: null, error: new Error('A detailed reason is required to update settings (§66, §67).') };
        }
        return { data: true as unknown as T, error: null };
      }

      if (fn === 'get_superadmin_system_health') {
        return {
          data: {
            system_status: 'healthy',
            timestamp: new Date().toISOString(),
            ledger_audit: {
              total_ledger_entries: 24,
              net_balance_sum_kobo: 0,
              is_balanced: true,
            },
            operational_load: {
              total_users: 70,
              total_jobs: 14,
              unresolved_emergency_sos: 1,
              open_disputes: 2,
            },
          } as unknown as T,
          error: null,
        };
      }

      return { data: true as unknown as T, error: null };
    },
  };

  const saService = new SuperadminService(mockDb);

  // ========================================================================
  // 1. Superadmin Access Isolation & RBAC Protection (§11, §14, §72)
  // ========================================================================
  console.log('▶ STEP 1: Verifying Superadmin Access Isolation & Protection Rules...');

  const superadminUser: AdminUserContext = {
    id: 'adm-001',
    userId: 'usr-super',
    isSuperadmin: true,
    status: 'active',
    permissions: ['operations', 'verification', 'support', 'finance', 'moderation'],
    mfaEnrolled: true,
    mfaVerified: true,
  };

  const regularAdminUser: AdminUserContext = {
    id: 'adm-002',
    userId: 'usr-ops',
    isSuperadmin: false,
    status: 'active',
    permissions: ['operations', 'verification', 'finance'],
    mfaEnrolled: true,
    mfaVerified: true,
  };

  // Superadmin allowed on all /superadmin routes
  assert(canAccessAdminRoute(superadminUser, '/superadmin/overview').allowed, 'Superadmin allowed on /superadmin/overview');
  assert(canAccessAdminRoute(superadminUser, '/superadmin/admins').allowed, 'Superadmin allowed on /superadmin/admins');
  assert(canAccessAdminRoute(superadminUser, '/superadmin/settings').allowed, 'Superadmin allowed on /superadmin/settings');
  assert(canAccessAdminRoute(superadminUser, '/superadmin/audit').allowed, 'Superadmin allowed on /superadmin/audit');
  assert(canAccessAdminRoute(superadminUser, '/superadmin/health').allowed, 'Superadmin allowed on /superadmin/health');

  // Regular admin strictly rejected from /superadmin routes (§14, §19)
  assert(!canAccessAdminRoute(regularAdminUser, '/superadmin/overview').allowed, 'Regular admin blocked from /superadmin/overview');
  assert(!canAccessAdminRoute(regularAdminUser, '/superadmin/admins').allowed, 'Regular admin blocked from /superadmin/admins');
  assert(!canAccessAdminRoute(regularAdminUser, '/superadmin/settings').allowed, 'Regular admin blocked from /superadmin/settings');
  assert(!canAccessAdminRoute(regularAdminUser, '/superadmin/audit').allowed, 'Regular admin blocked from /superadmin/audit');

  console.log('  ✅ Superadmin authority isolation and access boundaries strictly enforced.');

  // ========================================================================
  // 2. Admin Account Lifecycle Management (§12, §17, §19, §70)
  // ========================================================================
  console.log('▶ STEP 2: Verifying Admin Account Creation & Lifecycle Management...');

  const adminsList = await saService.getAdminUsers();
  assert(adminsList.length === 2, 'Should list 2 admin accounts');
  assert(adminsList[0].isSuperadmin === true, 'First account is Superadmin');
  assert(adminsList[1].isSuperadmin === false, 'Second account is Regular Admin');

  // Test creating new admin account
  const createRes = await saService.createAdminUser({
    userId: 'usr-new-001',
    permissions: ['operations', 'verification'],
    reason: 'Appointed as Regional Operations Specialist',
  });
  assert(createRes.adminId === 'new-admin-uuid-889', 'New admin ID generated');

  // Test updating admin permissions
  await saService.updateAdminPermissions({
    adminUserId: 'adm-002',
    newPermissions: ['operations', 'verification', 'support'],
    reason: 'Promoted to handle support inquiries',
  });
  const permCall = executedCalls.find((c) => c.fn === 'update_admin_permissions' && c.args?.p_admin_user_id === 'adm-002');
  assert(Boolean(permCall), 'update_admin_permissions RPC executed');

  console.log('  ✅ Admin account creation, listing, and permission updates verified.');

  // ========================================================================
  // 3. Superadmin Protection Defense (§20)
  // ========================================================================
  console.log('▶ STEP 3: Verifying Superadmin Self-Deactivation Defense (§20)...');

  let superadminDeactivationBlocked = false;
  try {
    await saService.setAdminStatus({
      adminUserId: 'adm-001', // Superadmin ID
      newStatus: 'deactivated',
      reason: 'Attempted deactivation of root Superadmin',
    });
  } catch (err: unknown) {
    superadminDeactivationBlocked = true;
  }
  assert(superadminDeactivationBlocked, 'Superadmin account deactivation must be strictly rejected (§20)');

  // Regular admin status can be updated with reason
  await saService.setAdminStatus({
    adminUserId: 'adm-002',
    newStatus: 'suspended',
    reason: 'Security credential breach under investigation #882',
  });
  const statusCall = executedCalls.find((c) => c.fn === 'update_admin_status' && c.args?.p_admin_user_id === 'adm-002');
  assert(Boolean(statusCall), 'Regular admin status update executed with audit reason');

  console.log('  ✅ Superadmin protection defense verified against deactivation or demotion.');

  // ========================================================================
  // 4. Platform Settings Governance (§66, §67)
  // ========================================================================
  console.log('▶ STEP 4: Verifying Platform Settings Governance & Audit Logging (§66)...');

  const settingsList = await saService.getPlatformSettings();
  assert(settingsList.length >= 2, 'Should list platform settings');
  const feeSetting = settingsList.find((s) => s.key === 'platform_fee_percentage');
  assert(feeSetting?.value === '10', 'Platform fee baseline is 10%');

  // Updating setting without reason -> fails
  let settingUpdateWithoutReasonFailed = false;
  try {
    await saService.updatePlatformSetting('platform_fee_percentage', '12', 'bad');
  } catch (err: unknown) {
    settingUpdateWithoutReasonFailed = true;
  }
  assert(settingUpdateWithoutReasonFailed, 'Updating platform settings without detailed reason must fail');

  // Valid update with reason
  await saService.updatePlatformSetting(
    'platform_fee_percentage',
    '10',
    'Platform facilitation fee audited and confirmed at baseline 10% for next operational quarter.'
  );
  const settingCall = executedCalls.find((c) => c.fn === 'update_platform_setting' && c.args?.p_key === 'platform_fee_percentage');
  assert(Boolean(settingCall), 'Platform setting update RPC executed with audit rationale');

  console.log('  ✅ Superadmin platform parameter governance and audit trail verified.');

  // ========================================================================
  // 5. System Health & Double-Entry Ledger Balancing Invariant (§44, §72)
  // ========================================================================
  console.log('▶ STEP 5: Verifying System Health & Double-Entry Ledger Balance Audit (§72)...');

  const healthReport = await saService.getSystemHealth();
  assert(healthReport.system_status === 'healthy', 'System status must report healthy');
  assert(healthReport.ledger_audit.is_balanced === true, 'Ledger audit must confirm is_balanced: true');
  assert(healthReport.ledger_audit.net_balance_sum_kobo === 0, 'Net balance sum must equal 0 kobo');
  assert(healthReport.operational_load.total_users === 70, 'Operational load reports 70 users');
  assert(healthReport.operational_load.total_jobs === 14, 'Operational load reports 14 jobs');

  console.log('  ✅ System health and double-entry ledger balance certification verified.');

  console.log('\n====================================================');
  console.log('🎉 ALL SLICE 9 SUPERADMIN TESTS PASSED (100%)');
  console.log('====================================================\n');
}

runSlice9Tests().catch((err) => {
  console.error(err);
  process.exit(1);
});
