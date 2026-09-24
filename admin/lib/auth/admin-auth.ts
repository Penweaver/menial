import type { SupabaseClient, User } from '@supabase/supabase-js';
import { AdminService, type AdminAccessDetails } from '@shared/services/admin/AdminService';
import type { AdminUserContext } from '@shared/auth/rbac';
import { canAccessAdminRoute } from '@shared/auth/rbac';
import { toDatabaseClient } from '../supabase/client';

export { canAccessAdminRoute, type AdminUserContext };

/**
 * Loads the active administrative profile and session MFA verification state.
 * Uses AdminService RPC call (`check_admin_access`) to verify authority.
 */
export async function getAdminUserContext(
  supabase: SupabaseClient,
  user: User | null
): Promise<AdminUserContext | null> {
  if (!user) return null;

  const adminService = new AdminService(toDatabaseClient(supabase));
  const access: AdminAccessDetails = await adminService.getAdminAccess(user.id);

  if (!access.isAdmin || !access.status) {
    return null;
  }

  // Check Supabase MFA Authenticator Assurance Level (aal1 vs aal2)
  let mfaVerified = false;
  try {
    const { data: aalData, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (!aalError && aalData) {
      mfaVerified = aalData.currentLevel === 'aal2';
    }
  } catch {
    mfaVerified = false;
  }

  return {
    id: access.adminId || user.id,
    userId: user.id,
    isSuperadmin: access.isSuperadmin,
    status: access.status,
    permissions: access.permissions,
    mfaEnrolled: access.mfaEnrolled,
    mfaVerified,
  };
}
