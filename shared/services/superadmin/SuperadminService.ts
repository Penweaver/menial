/**
 * Menial Platform - Superadmin Governance Service
 * 
 * Provides client operations for the Superadmin desktop web dashboard:
 * administrator lifecycle management (§12, §17, §19), platform settings governance (§66),
 * complete audit trail inspection (§67), and system health auditing (§72).
 * Reference: menial-master-spec-v2.md (§11, §12, §14, §20, §66, §67, §71, §72)
 */

import type { IDatabaseClient } from '../admin/AdminService';
import type { AdminPermissionKey, AdminStatus } from '../../types/enums';

export interface AdminAccountSummary {
  id: string;
  userId: string;
  isSuperadmin: boolean;
  status: AdminStatus;
  mfaEnrolled: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  fullName: string;
  email: string | null;
  phone: string;
  permissions: AdminPermissionKey[];
}

export interface PlatformSettingItem {
  key: string;
  value: string;
  description: string;
  updatedAt: string;
  updatedByName: string | null;
}

export interface SystemHealthReport {
  system_status: 'healthy' | 'degraded';
  timestamp: string;
  ledger_audit: {
    total_ledger_entries: number;
    net_balance_sum_kobo: number;
    is_balanced: boolean;
  };
  operational_load: {
    total_users: number;
    total_jobs: number;
    unresolved_emergency_sos: number;
    open_disputes: number;
  };
}

export class SuperadminService {
  private db: IDatabaseClient;

  constructor(db: IDatabaseClient) {
    this.db = db;
  }

  /**
   * Superadmin-only: Lists all administrator accounts with statuses, permissions, and MFA standing (§72).
   */
  public async getAdminUsers(): Promise<AdminAccountSummary[]> {
    const { data, error } = await this.db.rpc<Record<string, unknown>[]>(
      'get_superadmin_admins_list'
    );

    if (error || !data) {
      throw new Error(`Failed to list admin users: ${error?.message || 'No data'}`);
    }

    return data.map((row) => ({
      id: String(row.id),
      userId: String(row.user_id),
      isSuperadmin: Boolean(row.is_superadmin),
      status: row.status as AdminStatus,
      mfaEnrolled: Boolean(row.mfa_enrolled),
      lastLoginAt: row.last_login_at ? String(row.last_login_at) : null,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
      fullName: String(row.full_name),
      email: row.email ? String(row.email) : null,
      phone: String(row.phone),
      permissions: (row.permissions as AdminPermissionKey[]) || [],
    }));
  }

  /**
   * Superadmin-only: Creates a new Admin account in 'invited' status with initial permissions (§12, §17, §70).
   */
  public async createAdminUser(params: {
    userId: string;
    permissions: AdminPermissionKey[];
    reason?: string;
  }): Promise<{ adminId: string; invitationToken?: string; invitationExpiresAt?: string }> {
    const { data, error } = await this.db.rpc<unknown>('create_admin_account', {
      p_user_id: params.userId,
      p_permissions: params.permissions,
      p_reason: params.reason || 'Admin account created by Superadmin',
    });

    if (error || !data) {
      throw new Error(`Failed to create admin user: ${error?.message || 'No ID returned'}`);
    }

    const record = Array.isArray(data) ? (data[0] as Record<string, unknown>) : (data as Record<string, unknown>);
    const adminId = record?.admin_id || record?.adminId || (typeof data === 'string' ? data : '');
    const invitationToken = record?.invitation_token || record?.invitationToken;
    const invitationExpiresAt = record?.invitation_expires_at || record?.invitationExpiresAt;

    return {
      adminId: String(adminId),
      invitationToken: invitationToken ? String(invitationToken) : undefined,
      invitationExpiresAt: invitationExpiresAt ? String(invitationExpiresAt) : undefined,
    };
  }

  /**
   * Superadmin-only: Activates, suspends, or deactivates an admin account (§17).
   * Superadmin accounts cannot be deactivated through this flow (§20).
   */
  public async setAdminStatus(params: {
    adminUserId: string;
    newStatus: AdminStatus;
    reason: string;
  }): Promise<void> {
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
   * Superadmin-only: Atomically replaces assigned permissions for an admin (§13, §19).
   */
  public async updateAdminPermissions(params: {
    adminUserId: string;
    newPermissions: AdminPermissionKey[];
    reason: string;
  }): Promise<void> {
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
   * Superadmin-only: Inspects all platform settings (§66, §72).
   */
  public async getPlatformSettings(): Promise<PlatformSettingItem[]> {
    const { data, error } = await this.db.rpc<PlatformSettingItem[]>(
      'get_superadmin_platform_settings'
    );

    if (error || !data) {
      throw new Error(`Failed to fetch platform settings: ${error?.message || 'No data'}`);
    }

    return data;
  }

  /**
   * Superadmin-only: Updates core platform parameters with audit logging (§66, §67).
   */
  public async updatePlatformSetting(key: string, value: string, reason: string): Promise<void> {
    const { error } = await this.db.rpc('update_platform_setting', {
      p_key: key,
      p_value: value,
      p_reason: reason,
    });

    if (error) {
      throw new Error(`Failed to update platform setting: ${error.message}`);
    }
  }

  /**
   * Superadmin-only: Audits system health, volumes, and double-entry ledger balance integrity (§44, §72).
   */
  public async getSystemHealth(): Promise<SystemHealthReport> {
    const { data, error } = await this.db.rpc<SystemHealthReport>(
      'get_superadmin_system_health'
    );

    if (error || !data) {
      throw new Error(`Failed to fetch system health: ${error?.message || 'No data'}`);
    }

    return data;
  }
}
