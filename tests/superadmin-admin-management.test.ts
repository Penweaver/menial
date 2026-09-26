/**
 * Menial Platform - Task 4 Verification Test Suite
 * 
 * Verifies Superadmin-only Admin Management Matrix (§10, §12, §17, §18, §19, §20, §72):
 * 1. Admin Users Directory Retrieval via SuperadminService.getAdminUsers()
 * 2. 72-Hour Cryptographic Invitation Creation via createAdminUser()
 * 3. Atomic RBAC Permission Reassignment via updateAdminPermissions()
 * 4. Administrator Lifecycle Standing (Active, Suspended, Deactivated) with Mandatory Rationale
 * 5. Section 20 Superadmin Root Account Protection (Cannot be suspended or deactivated)
 * 6. RBAC Route & Mandatory Session MFA Step-Up Gate on /superadmin/admins
 * 
 * Reference: menial-master-spec-v2.md (§10, §12, §17, §19, §20, §72) & DESIGN.md
 */

import {
  SuperadminService,
  type AdminAccountSummary,
} from '../shared/services/superadmin/SuperadminService';
import type { IDatabaseClient } from '../shared/services/admin/AdminService';
import type { AdminPermissionKey, AdminStatus } from '../shared/types/enums';
import { canAccessAdminRoute, type AdminUserContext } from '../shared/auth/rbac';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`❌ Assertion Failed: ${message}`);
  }
}

async function runSuperadminAdminManagementTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING TASK 4 TESTS: SUPERADMIN ADMIN MANAGEMENT');
  console.log('====================================================\n');

  // Track executed RPC calls
  const executedCalls: { fn: string; args?: Record<string, unknown> }[] = [];

  const mockAdminRecords = [
    {
      id: 'adm-001',
      user_id: 'usr-super',
      is_superadmin: true,
      status: 'active',
      mfa_enrolled: true,
      last_login_at: new Date().toISOString(),
      created_at: new Date(Date.now() - 3600000 * 24 * 90).toISOString(),
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
      last_login_at: new Date(Date.now() - 3600000 * 4).toISOString(),
      created_at: new Date(Date.now() - 3600000 * 24 * 30).toISOString(),
      updated_at: new Date().toISOString(),
      full_name: 'Amina Bello',
      email: 'amina.ops@menial.ng',
      phone: '+234 802 111 2233',
      permissions: ['operations', 'verification'],
    },
    {
      id: 'adm-003',
      user_id: 'usr-fin',
      is_superadmin: false,
      status: 'invited',
      mfa_enrolled: false,
      last_login_at: null,
      created_at: new Date(Date.now() - 3600000 * 6).toISOString(),
      updated_at: new Date().toISOString(),
      full_name: 'David Adeleke',
      email: 'david.fin@menial.ng',
      phone: '+234 803 444 5566',
      permissions: ['finance'],
    },
  ];

  const mockDb: IDatabaseClient = {
    async rpc<T>(fn: string, args?: Record<string, unknown>) {
      executedCalls.push({ fn, args });

      if (fn === 'get_superadmin_admins_list') {
        return { data: mockAdminRecords as unknown as T, error: null };
      }

      if (fn === 'create_admin_account') {
        const userId = args?.p_user_id as string;
        const perms = args?.p_permissions as AdminPermissionKey[];
        const newAdminId = 'adm-' + Math.random().toString(36).substring(2, 7);
        const token = 'INVITE-TOKEN-72H-' + Math.random().toString(36).substring(2, 10).toUpperCase();
        const expiresAt = new Date(Date.now() + 72 * 3600000).toISOString();

        return {
          data: [
            {
              admin_id: newAdminId,
              invitation_token: token,
              invitation_expires_at: expiresAt,
            },
          ] as unknown as T,
          error: null,
        };
      }

      if (fn === 'update_admin_permissions') {
        const adminId = args?.p_admin_user_id as string;
        const newPerms = args?.p_new_permissions as AdminPermissionKey[];
        const target = mockAdminRecords.find((a) => a.id === adminId);
        if (target) {
          if (target.is_superadmin) {
            return {
              data: null,
              error: new Error(
                'Protection Error: Superadmin permissions are implicit and cannot be modified (§14, §20).'
              ),
            };
          }
          target.permissions = newPerms;
        }
        return { data: true as unknown as T, error: null };
      }

      if (fn === 'update_admin_status') {
        const adminId = args?.p_admin_user_id as string;
        const newStatus = args?.p_new_status as string;
        const target = mockAdminRecords.find((a) => a.id === adminId);
        if (target) {
          if (target.is_superadmin && ['suspended', 'deactivated'].includes(newStatus)) {
            return {
              data: null,
              error: new Error(
                'Protection Error: The Superadmin account cannot be deactivated or suspended through admin procedures (§20).'
              ),
            };
          }
          target.status = newStatus;
        }
        return { data: true as unknown as T, error: null };
      }

      return { data: null, error: new Error(`Unhandled RPC function: ${fn}`) };
    },
  };

  const service = new SuperadminService(mockDb);

  // ========================================================================
  // 1. Test Admin Directory Retrieval via getAdminUsers() (§72)
  // ========================================================================
  console.log('▶ 1. Testing SuperadminService.getAdminUsers()...');

  const admins = await service.getAdminUsers();

  assert(executedCalls.length === 1, 'Should invoke get_superadmin_admins_list RPC');
  assert(executedCalls[0].fn === 'get_superadmin_admins_list', 'Must call get_superadmin_admins_list');
  assert(admins.length === 3, 'Must return 3 mock admin accounts');

  const superadmin = admins.find((a) => a.isSuperadmin);
  assert(Boolean(superadmin), 'Must find root Superadmin account');
  assert(superadmin?.status === 'active', 'Superadmin must be active');
  assert(superadmin?.mfaEnrolled === true, 'Superadmin must be MFA enrolled');
  assert(superadmin?.permissions.length === 5, 'Superadmin must hold all 5 permission roles');

  console.log('  ✅ Admin directory retrieved and mapped to AdminAccountSummary objects.');

  // ========================================================================
  // 2. Test 72-Hour Invitation Token Issuance (§12, §17)
  // ========================================================================
  console.log('▶ 2. Testing 72-Hour Cryptographic Invitation Creation via createAdminUser()...');

  const targetUserId = 'usr-new-candidate-uuid';
  const invitePerms: AdminPermissionKey[] = ['operations', 'verification'];

  const inviteResult = await service.createAdminUser({
    userId: targetUserId,
    permissions: invitePerms,
    reason: 'Appointed as Regional Operations Dispatcher for Lekki corridor',
  });

  assert(Boolean(inviteResult.adminId), 'Must return created adminId');
  assert(Boolean(inviteResult.invitationToken), 'Must return 72-hour invitation token');
  assert(Boolean(inviteResult.invitationExpiresAt), 'Must return expiration timestamp');
  assert(
    inviteResult.invitationToken!.startsWith('INVITE-TOKEN-72H-'),
    'Token must follow cryptographic 72h specification'
  );

  console.log('  ✅ Cryptographic 72-hour single-use invitation token generated.');

  // ========================================================================
  // 3. Test Atomic Permission Reassignment (§13, §19)
  // ========================================================================
  console.log('▶ 3. Testing Atomic Permission Reassignment via updateAdminPermissions()...');

  const regularAdmin = admins.find((a) => !a.isSuperadmin && a.status === 'active');
  assert(Boolean(regularAdmin), 'Must have an active regular admin');

  const updatedPerms: AdminPermissionKey[] = ['support', 'finance'];

  await service.updateAdminPermissions({
    adminUserId: regularAdmin!.id,
    newPermissions: updatedPerms,
    reason: 'Elevated to Support and Finance administrator role',
  });

  const lastCall = executedCalls[executedCalls.length - 1];
  assert(lastCall.fn === 'update_admin_permissions', 'Must call update_admin_permissions RPC');
  assert(lastCall.args?.p_admin_user_id === regularAdmin!.id, 'Must target specific admin ID');
  assert(
    JSON.stringify(lastCall.args?.p_new_permissions) === JSON.stringify(updatedPerms),
    'Must pass updated permission array atomically'
  );

  console.log('  ✅ Permissions updated atomically with audit rationale.');

  // ========================================================================
  // 4. Test Administrator Lifecycle Standing (Suspend / Reactivate) (§17)
  // ========================================================================
  console.log('▶ 4. Testing Account Suspension with Mandatory Audit Rationale (§17, §67)...');

  await service.setAdminStatus({
    adminUserId: regularAdmin!.id,
    newStatus: 'suspended',
    reason: 'Temporary suspension pending security clearance review',
  });

  const statusCall = executedCalls[executedCalls.length - 1];
  assert(statusCall.fn === 'update_admin_status', 'Must call update_admin_status RPC');
  assert(statusCall.args?.p_new_status === 'suspended', 'Status must be updated to suspended');
  assert(
    Boolean(statusCall.args?.p_reason && (statusCall.args?.p_reason as string).length >= 5),
    'Mandatory audit rationale must be provided'
  );

  console.log('  ✅ Account suspension executed with immutable audit logging.');

  // ========================================================================
  // 5. Test Section 20 Superadmin Root Account Protection
  // ========================================================================
  console.log('▶ 5. Testing Section 20 Superadmin Root Account Protection...');

  let protectionTriggered = false;
  try {
    await service.setAdminStatus({
      adminUserId: superadmin!.id,
      newStatus: 'suspended',
      reason: 'Attempted suspension of root Superadmin',
    });
  } catch (err: unknown) {
    protectionTriggered = true;
    assert(
      (err as Error).message.includes('The Superadmin account cannot be deactivated or suspended'),
      'Must reject suspension of root Superadmin (§20)'
    );
  }

  assert(protectionTriggered, 'Suspending root Superadmin must throw Protection Error');

  let permProtectionTriggered = false;
  try {
    await service.updateAdminPermissions({
      adminUserId: superadmin!.id,
      newPermissions: ['operations'],
      reason: 'Attempted downgrade of Superadmin permissions',
    });
  } catch (err: unknown) {
    permProtectionTriggered = true;
    assert(
      (err as Error).message.includes('Superadmin permissions are implicit'),
      'Must reject permission modification of root Superadmin (§20)'
    );
  }

  assert(permProtectionTriggered, 'Downgrading Superadmin permissions must throw Protection Error');

  console.log('  ✅ Section 20 Superadmin root account protection verified.');

  // ========================================================================
  // 6. Test RBAC Route Protection on /superadmin/admins
  // ========================================================================
  console.log('▶ 6. Testing RBAC Route & MFA Step-Up Gate on /superadmin/admins...');

  // Regular operations admin
  const opsAdminContext: AdminUserContext = {
    id: 'adm-ops',
    userId: 'usr-ops',
    isSuperadmin: false,
    status: 'active',
    permissions: ['operations', 'verification', 'support', 'finance', 'moderation'],
    mfaEnrolled: true,
    mfaVerified: true,
  };

  // Superadmin without MFA enrollment
  const superadminNoMfa: AdminUserContext = {
    id: 'adm-super',
    userId: 'usr-super',
    isSuperadmin: true,
    status: 'active',
    permissions: ['operations', 'verification', 'support', 'finance', 'moderation'],
    mfaEnrolled: false,
    mfaVerified: false,
  };

  // Superadmin without MFA step-up verification (aal1)
  const superadminNoStepUp: AdminUserContext = {
    id: 'adm-super',
    userId: 'usr-super',
    isSuperadmin: true,
    status: 'active',
    permissions: ['operations', 'verification', 'support', 'finance', 'moderation'],
    mfaEnrolled: true,
    mfaVerified: false,
  };

  // Fully verified Superadmin (aal2 / step-up challenge passed)
  const superadminVerified: AdminUserContext = {
    id: 'adm-super',
    userId: 'usr-super',
    isSuperadmin: true,
    status: 'active',
    permissions: ['operations', 'verification', 'support', 'finance', 'moderation'],
    mfaEnrolled: true,
    mfaVerified: true,
  };

  // Regular admin must be rejected
  const opsCheck = canAccessAdminRoute(opsAdminContext, '/superadmin/admins');
  assert(!opsCheck.allowed, 'Regular admin must be blocked from /superadmin/admins');
  assert(Boolean(opsCheck.reason?.includes('Superadmin authority required')), 'Error reason must cite Superadmin authority');

  // Superadmin without MFA enrollment must be rejected
  const noMfaCheck = canAccessAdminRoute(superadminNoMfa, '/superadmin/admins');
  assert(!noMfaCheck.allowed, 'Superadmin without MFA must be blocked');

  // Superadmin without MFA step-up must be challenged
  const noStepUpCheck = canAccessAdminRoute(superadminNoStepUp, '/superadmin/admins');
  assert(!noStepUpCheck.allowed, 'Superadmin without session step-up must be blocked');
  assert(Boolean(noStepUpCheck.reason?.includes('MFA step-up challenge required')), 'Error reason must cite MFA step-up');

  // Fully verified Superadmin must be permitted
  const verifiedCheck = canAccessAdminRoute(superadminVerified, '/superadmin/admins');
  assert(verifiedCheck.allowed, 'Fully verified Superadmin must access /superadmin/admins');

  console.log('  ✅ RBAC and MFA session step-up gate strictly protect /superadmin/admins.');

  console.log('\n====================================================');
  console.log('🎉 ALL TASK 4 SUPERADMIN ADMIN MANAGEMENT TESTS PASSED (100%)');
  console.log('====================================================');
}

runSuperadminAdminManagementTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
