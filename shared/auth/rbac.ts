/**
 * Menial Platform - Role-Based Access Control (RBAC) Helpers
 * 
 * Maps application route paths to required administrative permissions.
 * Reference: menial-master-spec-v2.md (§10, §13, §14, §18, §23, §71, §72)
 */

import type { AdminPermissionKey } from '../types/enums';

export interface AdminUserContext {
  id: string;
  userId: string;
  isSuperadmin: boolean;
  status: 'active' | 'suspended' | 'deactivated' | 'invited';
  permissions: AdminPermissionKey[];
  mfaEnrolled: boolean;
  mfaVerified?: boolean; // True only if active session has completed the MFA challenge (§23)
}

/**
 * Route prefix to required permission mapping for the Admin dashboard.
 */
export const ADMIN_ROUTE_PERMISSIONS: Record<string, AdminPermissionKey> = {
  '/admin/operations': 'operations',
  '/admin/users': 'operations',
  '/admin/workers': 'operations',
  '/admin/employers': 'operations',
  '/admin/jobs': 'operations',
  '/admin/verification': 'verification',
  '/admin/support': 'support',
  '/admin/disputes': 'support',
  '/admin/safety': 'support',
  '/admin/finance': 'finance',
  '/admin/payments': 'finance',
  '/admin/payouts': 'finance',
  '/admin/ledger': 'finance',
  '/admin/moderation': 'moderation',
  '/admin/reviews': 'moderation',
  '/admin/reports': 'moderation',
};

/**
 * Determines whether the user has permission to access the requested route.
 * Superadmin has access to everything (§14).
 * Suspended/deactivated accounts have zero access (§17).
 */
export function canAccessAdminRoute(
  admin: AdminUserContext | null,
  pathname: string
): { allowed: boolean; reason?: string } {
  if (!admin) {
    return { allowed: false, reason: 'Authentication required.' };
  }

  if (admin.status !== 'active') {
    return { allowed: false, reason: `Account is ${admin.status}. Access denied (§17).` };
  }

  // Superadmin routes require explicit superadmin authority (§72)
  if (pathname.startsWith('/superadmin')) {
    if (!admin.isSuperadmin) {
      return {
        allowed: false,
        reason: 'Superadmin authority required. Regular administrators cannot access governance (§10, §20).',
      };
    }

    if (!admin.mfaEnrolled) {
      return {
        allowed: false,
        reason: 'MFA enrollment is mandatory for Superadmin access (§23).',
      };
    }

    if (admin.mfaVerified === false) {
      return {
        allowed: false,
        reason: 'MFA step-up challenge required for Superadmin session (§23).',
      };
    }

    return { allowed: true };
  }

  // Superadmin has implicit access to all regular admin routes (§14)
  if (admin.isSuperadmin) {
    return { allowed: true };
  }

  // Check specific route permissions
  for (const [routePrefix, requiredPerm] of Object.entries(ADMIN_ROUTE_PERMISSIONS)) {
    if (pathname.startsWith(routePrefix)) {
      if (!admin.permissions.includes(requiredPerm)) {
        return {
          allowed: false,
          reason: `Missing required permission: ${requiredPerm.toUpperCase()}_ADMIN (§13).`,
        };
      }

      // Finance routes require MFA enrollment AND active session challenge completion (§23)
      if (requiredPerm === 'finance') {
        if (!admin.mfaEnrolled) {
          return {
            allowed: false,
            reason: 'MFA enrollment is mandatory for financial operations (§23).',
          };
        }
        if (admin.mfaVerified === false) {
          return {
            allowed: false,
            reason: 'MFA step-up challenge required for financial operations (§23).',
          };
        }
      }

      return { allowed: true };
    }
  }

  // Default dashboard overview is available to any active admin
  if (pathname === '/admin' || pathname === '/admin/overview') {
    return { allowed: true };
  }

  return { allowed: true };
}
