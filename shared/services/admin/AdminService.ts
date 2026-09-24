/**
 * Menial Platform - Admin Management Service
 * 
 * Provides typed operations for managing administrator accounts, status transitions,
 * permission grants, and security audits.
 * Reference: menial-master-spec-v2.md (§10-20, §23, §67, §68, §70)
 */

import type { AdminPermissionKey, AdminStatus } from '../../types/enums';
import type { AdminUserContext } from '../../auth/rbac';

export interface CreateAdminParams {
  userId: string;
  permissions: AdminPermissionKey[];
  reason?: string;
}

export interface UpdateAdminStatusParams {
  adminUserId: string;
  newStatus: AdminStatus;
  reason: string;
}

export interface UpdateAdminPermissionsParams {
  adminUserId: string;
  newPermissions: AdminPermissionKey[];
  reason: string;
}

export interface AdminAccessDetails {
  isAdmin: boolean;
  adminId?: string;
  isSuperadmin: boolean;
  status: AdminStatus | null;
  permissions: AdminPermissionKey[];
  mfaEnrolled: boolean;
  requiresMfa: boolean;
}

/**
 * Interface representing the database client required by AdminService.
 * Can be satisfied by SupabaseClient or test mocks.
 */
export interface IDatabaseClient {
  rpc<T = unknown>(
    fn: string,
    args?: Record<string, unknown>
  ): Promise<{ data: T | null; error: Error | null }>;
}

export class AdminService {
  private db: IDatabaseClient;

  constructor(db: IDatabaseClient) {
    this.db = db;
  }

  /**
   * Superadmin-only: Provision a new Admin account in 'invited' status with initial permissions (§12, §70).
   */
  public async createAdmin(params: CreateAdminParams): Promise<{ adminId: string }> {
    const { data, error } = await this.db.rpc<string>('create_admin_account', {
      p_user_id: params.userId,
      p_permissions: params.permissions,
      p_reason: params.reason || 'Admin account creation',
    });

    if (error) {
      throw new Error(`Failed to create admin account: ${error.message}`);
    }

    if (!data) {
      throw new Error('Failed to create admin account: No ID returned.');
    }

    return { adminId: data };
  }

  /**
   * Superadmin-only: Activate, suspend, or deactivate an admin account (§17).
   * Note: Superadmin accounts cannot be deactivated through this flow (§20).
   */
  public async setAdminStatus(params: UpdateAdminStatusParams): Promise<void> {
    const { error } = await this.db.rpc('update_admin_status', {
      p_admin_user_id: params.adminUserId,
      p_new_status: params.newStatus,
      p_reason: params.reason,
    });

    if (error) {
      throw new Error(`Failed to update admin status: ${error.message}`);
    }
  }

  /**
   * Superadmin-only: Atomically replace the assigned permissions for an admin (§13, §19).
   */
  public async updatePermissions(params: UpdateAdminPermissionsParams): Promise<void> {
    const { error } = await this.db.rpc('update_admin_permissions', {
      p_admin_user_id: params.adminUserId,
      p_new_permissions: params.newPermissions,
      p_reason: params.reason,
    });

    if (error) {
      throw new Error(`Failed to update admin permissions: ${error.message}`);
    }
  }

  /**
   * Inspects administrative privileges and MFA requirements for a user (§18, §23).
   */
  public async getAdminAccess(userId?: string): Promise<AdminAccessDetails> {
    const { data, error } = await this.db.rpc<Record<string, unknown>>('check_admin_access', {
      p_user_id: userId,
    });

    if (error || !data) {
      return {
        isAdmin: false,
        isSuperadmin: false,
        status: null,
        permissions: [],
        mfaEnrolled: false,
        requiresMfa: false,
      };
    }

    return {
      isAdmin: Boolean(data.is_admin),
      adminId: data.admin_id as string | undefined,
      isSuperadmin: Boolean(data.is_superadmin),
      status: (data.status as AdminStatus) || null,
      permissions: (data.permissions as AdminPermissionKey[]) || [],
      mfaEnrolled: Boolean(data.mfa_enrolled),
      requiresMfa: Boolean(data.requires_mfa),
    };
  }

  /**
   * Accepts an admin invitation using a valid 72-hour invitation token,
   * requiring mandatory completed MFA enrollment before reaching 'active' status (§23).
   */
  public async acceptInvitation(params: {
    invitationToken: string;
    mfaEnrolled: boolean;
  }): Promise<{ adminId: string; userId: string; status: AdminStatus; mfaEnrolled: boolean }> {
    if (!params.mfaEnrolled) {
      throw new Error('MFA enrollment is mandatory before activating an administrator account (§23).');
    }

    const { data, error } = await this.db.rpc<Array<{
      admin_id: string;
      user_id: string;
      status: AdminStatus;
      mfa_enrolled: boolean;
    }>>('accept_admin_invitation', {
      p_invitation_token: params.invitationToken,
      p_mfa_enrolled: params.mfaEnrolled,
    });

    if (error || !data || data.length === 0) {
      throw new Error(`Failed to accept admin invitation: ${error?.message || 'No record returned.'}`);
    }

    return {
      adminId: data[0].admin_id,
      userId: data[0].user_id,
      status: data[0].status,
      mfaEnrolled: data[0].mfa_enrolled,
    };
  }
}

