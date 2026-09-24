/**
 * Menial Platform - Phase 2 Verification Test Suite
 * 
 * Tests core service abstractions, rate limiting, RBAC, and administrative authority.
 * Reference: menial-master-spec-v2.md (§5, §9, §11, §13, §17, §19, §20, §23, §43, §70)
 */

import { MockSmsProvider } from '../shared/services/sms/MockSmsProvider';
import { AuthService } from '../shared/services/auth/AuthService';
import { canAccessAdminRoute, type AdminUserContext } from '../shared/auth/rbac';
import { AdminService, type IDatabaseClient } from '../shared/services/admin/AdminService';
import type { AdminPermissionKey } from '../shared/types/enums';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`❌ Assertion Failed: ${message}`);
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING PHASE 2 TESTS: ADMIN AUTHORITY & AUTH');
  console.log('====================================================\n');

  // ========================================================================
  // 1. Test MockSmsProvider (Cost Tracking & Rate Limiting - §5, §43)
  // ========================================================================
  console.log('▶ Testing MockSmsProvider...');
  const sms = new MockSmsProvider({ enableDevLogging: false });
  const testPhone = '+2348012345678';

  // Test 1.1: Cost tracking
  const sendRes = await sms.sendSms({ to: testPhone, message: 'Welcome to Menial' });
  assert(sendRes.success, 'SMS dispatch should succeed');
  assert(
    sendRes.simulatedCostKobo === 400,
    `SMS cost should be 400 kobo (₦4.00), got ${sendRes.simulatedCostKobo}`
  );
  assert(
    sms.getTotalSimulatedCostKobo() === 400,
    `Total simulated cost should be 400 kobo, got ${sms.getTotalSimulatedCostKobo()}`
  );

  // Test 1.2: OTP Request & Verification
  sms.reset();
  const otpRes1 = await sms.requestOtp(testPhone);
  assert(otpRes1.success, 'First OTP request should succeed');
  assert(otpRes1.rateLimitRemaining === 2, 'Should have 2 attempts remaining in window');

  // Verify invalid code
  const badVerify = await sms.verifyOtp(testPhone, '000000');
  assert(!badVerify.success, 'Invalid OTP should fail');
  assert(Boolean(badVerify.error?.includes('attempt(s) remaining')), 'Error should show remaining attempts');

  // Verify rate limiting (§43)
  const otpRes2 = await sms.requestOtp(testPhone);
  assert(otpRes2.success, 'Second OTP request should succeed');
  const otpRes3 = await sms.requestOtp(testPhone);
  assert(otpRes3.success, 'Third OTP request should succeed');

  // 4th request must be blocked by rate limit
  const otpRes4 = await sms.requestOtp(testPhone);
  assert(!otpRes4.success, 'Fourth OTP request must be blocked by rate limiting (§43)');
  assert(Boolean(otpRes4.error?.includes('Too many OTP requests')), 'Error message must inform about rate limit');

  console.log('  ✅ MockSmsProvider cost tracking and rate limiting passed.');

  // ========================================================================
  // 2. Test AuthService (Brute-force protection & MFA rules - §9, §23, §43)
  // ========================================================================
  console.log('▶ Testing AuthService...');
  const auth = new AuthService(sms);
  const testEmail = 'admin@menial.ng';

  // Test 2.1: Brute-force lockout (§43)
  for (let i = 1; i <= 4; i++) {
    const attempt = auth.recordFailedAttempt(testEmail);
    assert(!attempt.locked, `Attempt ${i} should not lock account`);
    assert(attempt.remainingAttempts === 5 - i, 'Remaining attempts counter should decrement');
  }

  // 5th failed attempt triggers lockout
  const fifthAttempt = auth.recordFailedAttempt(testEmail);
  assert(fifthAttempt.locked, '5th failed attempt must trigger lockout (§43)');

  const rateCheck = auth.checkLoginRateLimit(testEmail);
  assert(rateCheck.isLocked, 'Account should be flagged as locked');
  assert((rateCheck.waitSeconds || 0) > 0, 'Wait seconds should be positive');

  auth.resetFailedAttempts(testEmail);
  assert(!auth.checkLoginRateLimit(testEmail).isLocked, 'Account should unlock after reset');

  // Test 2.2: Mandatory MFA rules (§23)
  assert(auth.isMfaRequired(true, []), 'MFA must be mandatory for Superadmin (§23)');
  assert(auth.isMfaRequired(false, ['finance']), 'MFA must be mandatory for Finance Admin (§23)');
  assert(!auth.isMfaRequired(false, ['operations', 'verification']), 'MFA is optional for other admin roles');

  // Test 2.3: Session idle timeout (§23)
  const activeSession = {
    adminId: 'admin_1',
    userId: 'user_1',
    email: testEmail,
    isSuperadmin: false,
    status: 'active',
    permissions: ['operations'],
    mfaEnrolled: true,
    mfaVerified: true,
    token: 'test_token',
    lastActiveAt: Date.now() - 2 * 3600 * 1000, // 2 hours ago
    sessionTimeoutHours: 12,
  };
  assert(!auth.isSessionExpired(activeSession), 'Session active 2 hours ago should not be expired (timeout: 12h)');

  const expiredSession = {
    ...activeSession,
    lastActiveAt: Date.now() - 13 * 3600 * 1000, // 13 hours ago
  };
  assert(auth.isSessionExpired(expiredSession), 'Session active 13 hours ago must be expired (timeout: 12h)');

  console.log('  ✅ AuthService rate limiting, session timeout, and MFA rules passed.');

  // ========================================================================
  // 3. Test RBAC Route Access Control (§10, §13, §14, §17, §19, §20, §23)
  // ========================================================================
  console.log('▶ Testing RBAC & Route Permissions...');

  const activeSuperadmin: AdminUserContext = {
    id: 'super_1',
    userId: 'user_super',
    isSuperadmin: true,
    status: 'active',
    permissions: ['operations', 'verification', 'support', 'finance', 'moderation'],
    mfaEnrolled: true,
  };

  const activeOperationsAdmin: AdminUserContext = {
    id: 'admin_ops',
    userId: 'user_ops',
    isSuperadmin: false,
    status: 'active',
    permissions: ['operations'],
    mfaEnrolled: false,
  };

  const activeFinanceAdminNoMfa: AdminUserContext = {
    id: 'admin_fin',
    userId: 'user_fin',
    isSuperadmin: false,
    status: 'active',
    permissions: ['finance'],
    mfaEnrolled: false,
  };

  const activeFinanceAdminWithMfa: AdminUserContext = {
    ...activeFinanceAdminNoMfa,
    mfaEnrolled: true,
  };

  const suspendedAdmin: AdminUserContext = {
    ...activeOperationsAdmin,
    status: 'suspended',
  };

  // Test 3.1: Suspended admin cannot access anything (§17)
  const suspendedAccess = canAccessAdminRoute(suspendedAdmin, '/admin/operations');
  assert(!suspendedAccess.allowed, 'Suspended admin must be denied access to all routes (§17)');

  // Test 3.2: Operations Admin can access operations but NOT finance or verification (§13)
  assert(canAccessAdminRoute(activeOperationsAdmin, '/admin/operations').allowed, 'Ops admin should access operations');
  assert(canAccessAdminRoute(activeOperationsAdmin, '/admin/jobs').allowed, 'Ops admin should access jobs');
  assert(!canAccessAdminRoute(activeOperationsAdmin, '/admin/finance').allowed, 'Ops admin must NOT access finance (§13)');
  assert(!canAccessAdminRoute(activeOperationsAdmin, '/admin/verification').allowed, 'Ops admin must NOT access verification (§13)');

  // Test 3.3: Superadmin route protection (§20)
  const opsSuperadminAttempt = canAccessAdminRoute(activeOperationsAdmin, '/superadmin/admins');
  assert(!opsSuperadminAttempt.allowed, 'Regular admin cannot access /superadmin routes (§20)');
  assert(canAccessAdminRoute(activeSuperadmin, '/superadmin/admins').allowed, 'Superadmin with MFA can access /superadmin');

  // Test 3.4: Finance route requires MFA Enrollment AND Session Step-Up (§23)
  const finNoMfaAttempt = canAccessAdminRoute(activeFinanceAdminNoMfa, '/admin/finance/payouts');
  assert(!finNoMfaAttempt.allowed, 'Finance admin without MFA enrollment must be blocked from /admin/finance (§23)');

  const finUnverifiedSession: AdminUserContext = {
    ...activeFinanceAdminWithMfa,
    mfaVerified: false,
  };
  const finUnverifiedAttempt = canAccessAdminRoute(finUnverifiedSession, '/admin/finance/payouts');
  assert(!finUnverifiedAttempt.allowed, 'Finance admin with mfaVerified=false must be blocked from /admin/finance (§23)');
  assert(
    Boolean(finUnverifiedAttempt.reason?.includes('MFA step-up challenge required')),
    'Reason must state MFA step-up challenge required'
  );

  const finVerifiedSession: AdminUserContext = {
    ...activeFinanceAdminWithMfa,
    mfaVerified: true,
  };
  assert(
    canAccessAdminRoute(finVerifiedSession, '/admin/finance/payouts').allowed,
    'Finance admin with completed MFA step-up challenge allowed into /admin/finance'
  );

  // Test 3.5: Superadmin route also enforces active session step-up (§23)
  const superUnverifiedSession: AdminUserContext = {
    ...activeSuperadmin,
    mfaVerified: false,
  };
  const superUnverifiedAttempt = canAccessAdminRoute(superUnverifiedSession, '/superadmin/admins');
  assert(!superUnverifiedAttempt.allowed, 'Superadmin with mfaVerified=false must be blocked from /superadmin (§23)');

  const superVerifiedSession: AdminUserContext = {
    ...activeSuperadmin,
    mfaVerified: true,
  };
  assert(
    canAccessAdminRoute(superVerifiedSession, '/superadmin/admins').allowed,
    'Superadmin with completed MFA challenge allowed into /superadmin'
  );

  console.log('  ✅ RBAC route isolation, MFA enrollment, and session step-up enforcement passed.');

  // ========================================================================
  // 4. Test AdminService RPC Call Mapping (§12, §17, §19, §70)
  // ========================================================================
  console.log('▶ Testing AdminService RPC client...');

  const mockCalls: { fn: string; args?: Record<string, unknown> }[] = [];
  const mockDb: IDatabaseClient = {
    async rpc<T>(fn: string, args?: Record<string, unknown>) {
      mockCalls.push({ fn, args });
      if (fn === 'create_admin_account') {
        return { data: 'mock_new_admin_uuid' as unknown as T, error: null };
      }
      if (fn === 'accept_admin_invitation') {
        return {
          data: [
            {
              admin_id: 'mock_admin_id',
              user_id: 'mock_user_id',
              status: 'active',
              mfa_enrolled: true,
            },
          ] as unknown as T,
          error: null,
        };
      }
      if (fn === 'check_admin_access') {
        return {
          data: {
            is_admin: true,
            is_superadmin: true,
            status: 'active',
            permissions: ['operations', 'verification', 'support', 'finance', 'moderation'],
            mfa_enrolled: true,
            requires_mfa: true,
          } as unknown as T,
          error: null,
        };
      }
      return { data: true as unknown as T, error: null };
    },
  };

  const adminService = new AdminService(mockDb);

  // Test createAdmin RPC mapping
  const createRes = await adminService.createAdmin({
    userId: 'target_user_1',
    permissions: ['verification', 'support'],
    reason: 'Hiring operational support staff',
  });
  assert(createRes.adminId === 'mock_new_admin_uuid', 'createAdmin should return new admin ID');
  assert(mockCalls[0].fn === 'create_admin_account', 'Should call create_admin_account RPC');
  assert(
    (mockCalls[0].args?.p_permissions as AdminPermissionKey[]).includes('verification'),
    'Should pass permissions array'
  );

  // Test setAdminStatus RPC mapping
  await adminService.setAdminStatus({
    adminUserId: 'admin_to_suspend',
    newStatus: 'suspended',
    reason: 'Policy violation investigation',
  });
  assert(mockCalls[1].fn === 'update_admin_status', 'Should call update_admin_status RPC');

  // Test updatePermissions RPC mapping
  await adminService.updatePermissions({
    adminUserId: 'admin_to_promote',
    newPermissions: ['operations', 'finance'],
    reason: 'Expanded responsibilities',
  });
  assert(mockCalls[2].fn === 'update_admin_permissions', 'Should call update_admin_permissions RPC');

  // Test acceptInvitation RPC mapping & mandatory MFA enforcement (§23)
  try {
    await adminService.acceptInvitation({
      invitationToken: 'test_invitation_token_123',
      mfaEnrolled: false,
    });
    assert(false, 'Should have failed without completed MFA enrollment');
  } catch (err: unknown) {
    assert(
      (err as Error).message.includes('MFA enrollment is mandatory'),
      'Must reject activation without completed MFA enrollment (§23)'
    );
  }

  // Update mock for accept_admin_invitation
  const acceptRes = await adminService.acceptInvitation({
    invitationToken: 'test_invitation_token_123',
    mfaEnrolled: true,
  });
  assert(mockCalls[3].fn === 'accept_admin_invitation', 'Should call accept_admin_invitation RPC');
  assert(mockCalls[3].args?.p_mfa_enrolled === true, 'p_mfa_enrolled must be true');

  console.log('  ✅ AdminService RPC client mapping and invitation acceptance passed.');


  console.log('\n====================================================');
  console.log('🎉 ALL PHASE 2 VERIFICATION TESTS PASSED (100%)');
  console.log('====================================================\n');
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
