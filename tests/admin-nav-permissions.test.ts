/**
 * Menial Platform - Layout Shell & Navigation Permissions Test Suite
 * 
 * Verifies that the navigation visibility logic strictly aligns with RBAC (§13, §14, §18)
 * and properly indicates MFA session step-up gates (§23).
 */

import { canAccessAdminRoute, type AdminUserContext } from '../shared/auth/rbac';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`❌ Assertion Failed: ${message}`);
  }
}

// Emulate sidebar visibility filter logic from AdminSidebar.tsx
function filterNavForContext(admin: AdminUserContext | null, routes: string[]) {
  return routes.filter((route) => {
    const check = canAccessAdminRoute(admin, route);
    if (check.allowed) return true;
    // Visible with lock if blocked solely by session MFA step-up (§23)
    if (check.reason?.includes('MFA step-up challenge required')) return true;
    return false;
  });
}

async function runTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING NAV PERMISSION VISIBILITY TEST SUITE');
  console.log('====================================================\n');

  const allRoutes = [
    '/admin/overview',
    '/admin/workers',
    '/admin/employers',
    '/admin/jobs',
    '/admin/verification',
    '/admin/disputes',
    '/admin/safety',
    '/admin/payouts',
    '/admin/payments',
    '/admin/ledger',
    '/admin/moderation',
    '/superadmin/admins',
    '/superadmin/settings',
    '/superadmin/health',
    '/superadmin/audit',
  ];

  // 1. Operations Admin
  console.log('▶ Testing Operations Admin nav filtering...');
  const opsAdmin: AdminUserContext = {
    id: 'admin-1',
    userId: 'user-1',
    isSuperadmin: false,
    status: 'active',
    permissions: ['operations'],
    mfaEnrolled: false,
  };
  const opsVisible = filterNavForContext(opsAdmin, allRoutes);
  assert(opsVisible.includes('/admin/overview'), 'Overview must be visible');
  assert(opsVisible.includes('/admin/workers'), 'Workers must be visible');
  assert(opsVisible.includes('/admin/employers'), 'Employers must be visible');
  assert(opsVisible.includes('/admin/jobs'), 'Jobs must be visible');
  assert(!opsVisible.includes('/admin/verification'), 'Verification must be hidden from Ops Admin');
  assert(!opsVisible.includes('/admin/payouts'), 'Payouts must be hidden from Ops Admin');
  assert(!opsVisible.includes('/superadmin/admins'), 'Superadmin must be hidden from Ops Admin');
  console.log('  ✅ Operations Admin sees only operations and overview.');

  // 2. Verification Admin
  console.log('▶ Testing Verification Admin nav filtering...');
  const verifAdmin: AdminUserContext = {
    id: 'admin-2',
    userId: 'user-2',
    isSuperadmin: false,
    status: 'active',
    permissions: ['verification'],
    mfaEnrolled: false,
  };
  const verifVisible = filterNavForContext(verifAdmin, allRoutes);
  assert(verifVisible.includes('/admin/overview'), 'Overview must be visible');
  assert(verifVisible.includes('/admin/verification'), 'Verification must be visible');
  assert(!verifVisible.includes('/admin/workers'), 'Workers must be hidden from Verification Admin');
  assert(!verifVisible.includes('/admin/payouts'), 'Payouts must be hidden from Verification Admin');
  console.log('  ✅ Verification Admin sees only verification queue and overview.');

  // 3. Finance Admin (MFA Step-Up checks)
  console.log('▶ Testing Finance Admin nav visibility and step-up flags...');
  const financeAdminStepUpNeeded: AdminUserContext = {
    id: 'admin-3',
    userId: 'user-3',
    isSuperadmin: false,
    status: 'active',
    permissions: ['finance'],
    mfaEnrolled: true,
    mfaVerified: false,
  };
  const finVisible = filterNavForContext(financeAdminStepUpNeeded, allRoutes);
  assert(finVisible.includes('/admin/overview'), 'Overview visible');
  assert(finVisible.includes('/admin/payouts'), 'Payouts route remains visible in nav as step-up locked');
  assert(finVisible.includes('/admin/payments'), 'Payments route remains visible in nav as step-up locked');
  assert(finVisible.includes('/admin/ledger'), 'Ledger route remains visible in nav as step-up locked');
  assert(!finVisible.includes('/admin/workers'), 'Workers hidden from Finance Admin');
  assert(!finVisible.includes('/superadmin/admins'), 'Superadmin hidden from Finance Admin');

  // Verify access reason triggers the step-up prompt
  const finAccess = canAccessAdminRoute(financeAdminStepUpNeeded, '/admin/payouts');
  assert(!finAccess.allowed, 'Direct navigation blocked until step-up challenge solved');
  assert(Boolean(finAccess.reason?.includes('MFA step-up challenge required')), 'Requires step-up challenge');
  console.log('  ✅ Finance Admin routes properly gated by MFA step-up challenge.');

  // 4. Superadmin (Full Access & Governance)
  console.log('▶ Testing Superadmin root visibility...');
  const superadmin: AdminUserContext = {
    id: 'admin-super',
    userId: 'user-super',
    isSuperadmin: true,
    status: 'active',
    permissions: ['operations', 'verification', 'support', 'finance', 'moderation'],
    mfaEnrolled: true,
    mfaVerified: true,
  };
  const superVisible = filterNavForContext(superadmin, allRoutes);
  assert(superVisible.length === allRoutes.length, 'Superadmin must have all 15 routes visible in nav (§14)');
  console.log('  ✅ Superadmin has comprehensive visibility across all administrative corridors.');

  console.log('\n🎉 ALL NAV PERMISSION VISIBILITY TESTS PASSED (100%)\n');
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
