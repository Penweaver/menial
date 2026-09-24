/**
 * Menial Platform - Admin App Auth & MFA Step-Up Unit Test
 * 
 * Verifies that the Next.js admin auth rules strictly enforce RBAC and MFA step-up gates (§23).
 * Reference: menial-master-spec-v2.md (§10, §13, §14, §17, §18, §20, §23, §72)
 */

import { canAccessAdminRoute, type AdminUserContext } from '../shared/auth/rbac';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`❌ Assertion Failed: ${message}`);
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING ADMIN APP AUTH & MFA STEP-UP TEST SUITE');
  console.log('====================================================\n');

  // 1. Unauthenticated or non-admin access
  console.log('▶ Testing unauthenticated & non-admin rejection...');
  const unauth = canAccessAdminRoute(null, '/admin/overview');
  assert(!unauth.allowed, 'Unauthenticated user must be rejected');
  assert(unauth.reason === 'Authentication required.', 'Reason must state authentication required');

  const suspendedAdmin: AdminUserContext = {
    id: 'admin-001',
    userId: 'user-001',
    isSuperadmin: false,
    status: 'suspended',
    permissions: ['operations', 'finance'],
    mfaEnrolled: true,
    mfaVerified: true,
  };
  const suspendedAccess = canAccessAdminRoute(suspendedAdmin, '/admin/overview');
  assert(!suspendedAccess.allowed, 'Suspended admin must have zero access (§17)');
  assert(Boolean(suspendedAccess.reason?.includes('suspended')), 'Reason must reflect suspended status');

  const deactivatedAdmin: AdminUserContext = {
    ...suspendedAdmin,
    status: 'deactivated',
  };
  assert(!canAccessAdminRoute(deactivatedAdmin, '/admin/jobs').allowed, 'Deactivated admin must have zero access (§17)');
  console.log('  ✅ Unauthenticated, suspended, and deactivated accounts properly blocked.');

  // 2. Superadmin MFA Enforcement & Session Step-up (§23, §72)
  console.log('▶ Testing Superadmin mandatory MFA and session step-up gates...');
  const superadminNoMfa: AdminUserContext = {
    id: 'super-001',
    userId: 'user-super',
    isSuperadmin: true,
    status: 'active',
    permissions: ['operations', 'verification', 'support', 'finance', 'moderation'],
    mfaEnrolled: false,
  };

  const superadminNoMfaCheck = canAccessAdminRoute(superadminNoMfa, '/superadmin/governance');
  assert(!superadminNoMfaCheck.allowed, 'Superadmin without MFA enrolled must be blocked from /superadmin');
  assert(Boolean(superadminNoMfaCheck.reason?.includes('MFA enrollment is mandatory')), 'Must require MFA enrollment');

  // Superadmin enrolled in MFA but session at aal1 (mfaVerified === false)
  const superadminStepUpRequired: AdminUserContext = {
    ...superadminNoMfa,
    mfaEnrolled: true,
    mfaVerified: false,
  };
  const stepUpCheck = canAccessAdminRoute(superadminStepUpRequired, '/superadmin/overview');
  assert(!stepUpCheck.allowed, 'Superadmin with mfaVerified=false must be challenged for session step-up (§23)');
  assert(Boolean(stepUpCheck.reason?.includes('MFA step-up challenge required')), 'Reason must specify MFA step-up challenge');

  // Superadmin with completed session step-up (mfaVerified === true)
  const superadminVerified: AdminUserContext = {
    ...superadminStepUpRequired,
    mfaVerified: true,
  };
  assert(canAccessAdminRoute(superadminVerified, '/superadmin/overview').allowed, 'Verified Superadmin must be allowed');
  assert(canAccessAdminRoute(superadminVerified, '/superadmin/admins').allowed, 'Verified Superadmin must be allowed on /superadmin/admins');
  assert(canAccessAdminRoute(superadminVerified, '/admin/overview').allowed, 'Superadmin has implicit access to all admin routes (§14)');
  assert(canAccessAdminRoute(superadminVerified, '/admin/payments').allowed, 'Superadmin has implicit access to payments');
  console.log('  ✅ Superadmin mandatory MFA and session step-up verified.');

  // 3. Regular Admin RBAC & Route Segregation (§13, §18)
  console.log('▶ Testing Regular Admin route permission matrix...');
  const opsAdmin: AdminUserContext = {
    id: 'admin-ops',
    userId: 'user-ops',
    isSuperadmin: false,
    status: 'active',
    permissions: ['operations'],
    mfaEnrolled: false,
  };

  assert(canAccessAdminRoute(opsAdmin, '/admin/overview').allowed, 'Ops admin can access overview');
  assert(canAccessAdminRoute(opsAdmin, '/admin/workers').allowed, 'Ops admin can access workers');
  assert(canAccessAdminRoute(opsAdmin, '/admin/jobs').allowed, 'Ops admin can access jobs');

  // Blocked from routes outside permissions
  const opsBlockedFromFinance = canAccessAdminRoute(opsAdmin, '/admin/finance');
  assert(!opsBlockedFromFinance.allowed, 'Ops admin must be blocked from finance');
  assert(Boolean(opsBlockedFromFinance.reason?.includes('FINANCE_ADMIN')), 'Must inform about missing permission');

  const opsBlockedFromSuperadmin = canAccessAdminRoute(opsAdmin, '/superadmin/admins');
  assert(!opsBlockedFromSuperadmin.allowed, 'Ops admin must be strictly blocked from /superadmin');
  console.log('  ✅ Regular admin route permission matrix verified.');

  // 4. Finance Admin MFA Step-Up Gate (§23)
  console.log('▶ Testing Finance Admin MFA step-up challenge enforcement...');
  const financeAdminNoMfa: AdminUserContext = {
    id: 'admin-fin',
    userId: 'user-fin',
    isSuperadmin: false,
    status: 'active',
    permissions: ['finance'],
    mfaEnrolled: false,
  };
  const finNoMfaCheck = canAccessAdminRoute(financeAdminNoMfa, '/admin/payouts');
  assert(!finNoMfaCheck.allowed, 'Finance admin without MFA must be blocked from payouts (§23)');

  const financeAdminStepUp: AdminUserContext = {
    ...financeAdminNoMfa,
    mfaEnrolled: true,
    mfaVerified: false,
  };
  const finStepUpCheck = canAccessAdminRoute(financeAdminStepUp, '/admin/payouts');
  assert(!finStepUpCheck.allowed, 'Finance admin with mfaVerified=false must be challenged');
  assert(Boolean(finStepUpCheck.reason?.includes('MFA step-up challenge required')), 'Step-up challenge message required');

  const financeAdminVerified: AdminUserContext = {
    ...financeAdminStepUp,
    mfaVerified: true,
  };
  assert(canAccessAdminRoute(financeAdminVerified, '/admin/payouts').allowed, 'Verified Finance admin allowed on payouts');
  assert(canAccessAdminRoute(financeAdminVerified, '/admin/payments').allowed, 'Verified Finance admin allowed on payments');
  assert(canAccessAdminRoute(financeAdminVerified, '/admin/ledger').allowed, 'Verified Finance admin allowed on ledger');
  console.log('  ✅ Finance Admin MFA step-up gate strictly verified.');

  console.log('\n🎉 ALL ADMIN APP AUTH & MFA TESTS PASSED SUCCESSFULLY!\n');
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
