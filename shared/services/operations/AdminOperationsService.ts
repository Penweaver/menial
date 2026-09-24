/**
 * Menial Platform - Admin Operations Service
 * 
 * Provides client operations for Admin and Superadmin desktop web dashboards:
 * live metrics aggregation, attention queue (§54), high-performance pagination (§91),
 * category management (§64), platform settings updates (§66), and audit logs (§67).
 * Reference: menial-master-spec-v2.md (§53-67, §91, §92)
 */

import type { IDatabaseClient } from '../admin/AdminService';

export interface OverviewMetricsData {
  metrics: {
    total_workers: number;
    total_employers: number;
    new_users_today: number;
    active_jobs_count: number;
    completed_jobs_count: number;
    cancelled_jobs_count: number;
    platform_revenue_kobo: number;
    currency: 'NGN';
  };
  attention_queue: {
    pending_verifications: number;
    open_disputes: number;
    open_safety_reports: number;
    failed_payments: number;
    failed_payouts: number;
  };
}

export interface PaginatedResult<T> {
  total: number;
  limit: number;
  offset: number;
  data: T[];
}

export interface ManageCategoryParams {
  id?: string;
  name: string;
  description?: string;
  icon?: string;
  isActive?: boolean;
  displayOrder?: number;
}

export interface UpdatePlatformSettingParams {
  key: string;
  value: string;
  reason: string;
}

export class AdminOperationsService {
  private db: IDatabaseClient;

  constructor(db: IDatabaseClient) {
    this.db = db;
  }

  /**
   * Fetches real-time platform overview metrics and operational attention queue counts (§54).
   */
  public async getOverviewMetrics(): Promise<OverviewMetricsData> {
    const { data, error } = await this.db.rpc<OverviewMetricsData>(
      'get_admin_overview_metrics'
    );

    if (error || !data) {
      throw new Error(`Failed to fetch overview metrics: ${error?.message || 'No data'}`);
    }

    return data;
  }

  /**
   * Fetches server-side paginated jobs with keyword filtering (§58, §91).
   */
  public async getJobs(params?: {
    status?: string;
    categoryId?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResult<Record<string, unknown>>> {
    const { data, error } = await this.db.rpc<PaginatedResult<Record<string, unknown>>>(
      'get_admin_paginated_jobs',
      {
        p_status: params?.status,
        p_category_id: params?.categoryId,
        p_search: params?.search,
        p_limit: params?.limit || 25,
        p_offset: params?.offset || 0,
      }
    );

    if (error || !data) {
      throw new Error(`Failed to fetch jobs: ${error?.message || 'No data'}`);
    }

    return data;
  }

  /**
   * Fetches server-side paginated verification queue items (§61, §91).
   */
  public async getVerificationQueue(params?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResult<Record<string, unknown>>> {
    const { data, error } = await this.db.rpc<PaginatedResult<Record<string, unknown>>>(
      'get_admin_paginated_verifications',
      {
        p_status: params?.status || 'pending',
        p_limit: params?.limit || 25,
        p_offset: params?.offset || 0,
      }
    );

    if (error || !data) {
      throw new Error(`Failed to fetch verification queue: ${error?.message || 'No data'}`);
    }

    return data;
  }

  /**
   * Creates or updates a service category with audit logging (§64, §67).
   */
  public async manageCategory(params: ManageCategoryParams): Promise<{ categoryId: string }> {
    const { data, error } = await this.db.rpc<string>('manage_category', {
      p_id: params.id,
      p_name: params.name,
      p_description: params.description,
      p_icon: params.icon,
      p_is_active: params.isActive ?? true,
      p_display_order: params.displayOrder ?? 0,
    });

    if (error || !data) {
      throw new Error(`Failed to manage category: ${error?.message || 'No ID returned'}`);
    }

    return { categoryId: data };
  }

  /**
   * Superadmin-only: Updates core platform settings with audit logging (§66, §67).
   */
  public async updatePlatformSetting(params: UpdatePlatformSettingParams): Promise<void> {
    const { error } = await this.db.rpc('update_platform_setting', {
      p_key: params.key,
      p_value: params.value,
      p_reason: params.reason,
    });

    if (error) {
      throw new Error(`Failed to update platform setting: ${error.message}`);
    }
  }

  /**
   * Fetches server-side paginated audit logs (§67, §91).
   */
  public async getAuditLogs(params?: {
    action?: string;
    targetType?: string;
    actorId?: string;
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResult<Record<string, unknown>>> {
    const { data, error } = await this.db.rpc<PaginatedResult<Record<string, unknown>>>(
      'get_admin_audit_logs',
      {
        p_action: params?.action,
        p_target_type: params?.targetType,
        p_actor_id: params?.actorId,
        p_limit: params?.limit || 50,
        p_offset: params?.offset || 0,
      }
    );

    if (error || !data) {
      throw new Error(`Failed to fetch audit logs: ${error?.message || 'No data'}`);
    }

    return data;
  }

  /**
   * Reviews worker verification submission (§25, §61).
   */
  public async reviewVerificationSubmission(params: {
    verificationId: string;
    action: 'approve' | 'reject' | 'request_info';
    reason?: string;
  }): Promise<void> {
    const { error } = await this.db.rpc('review_verification_submission', {
      p_verification_id: params.verificationId,
      p_action: params.action,
      p_rejection_reason: params.reason || null,
    });

    if (error) {
      throw new Error(`Failed to review verification submission: ${error.message}`);
    }
  }

  /**
   * Fetches server-side paginated disputes queue (§62, §91).
   */
  public async getDisputes(params?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResult<Record<string, unknown>>> {
    const { data, error } = await this.db.rpc<PaginatedResult<Record<string, unknown>>>(
      'get_admin_paginated_disputes',
      {
        p_status: params?.status || null,
        p_limit: params?.limit || 25,
        p_offset: params?.offset || 0,
      }
    );

    if (error || !data) {
      throw new Error(`Failed to fetch disputes: ${error?.message || 'No data'}`);
    }

    return data;
  }

  /**
   * Resolves a dispute with financial arbitration and audit logging (§47, §62, §67).
   */
  public async resolveDispute(params: {
    disputeId: string;
    resolutionNote: string;
    financialAction?: 'none' | 'refund_employer' | 'release_payout';
  }): Promise<void> {
    const { error } = await this.db.rpc('resolve_dispute_case', {
      p_dispute_id: params.disputeId,
      p_resolution_note: params.resolutionNote,
      p_financial_action: params.financialAction || 'none',
    });

    if (error) {
      throw new Error(`Failed to resolve dispute: ${error.message}`);
    }
  }

  /**
   * Fetches server-side paginated safety reports queue (§63, §91).
   */
  public async getSafetyReports(params?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResult<Record<string, unknown>>> {
    const { data, error } = await this.db.rpc<PaginatedResult<Record<string, unknown>>>(
      'get_admin_paginated_safety_reports',
      {
        p_status: params?.status || null,
        p_limit: params?.limit || 25,
        p_offset: params?.offset || 0,
      }
    );

    if (error || !data) {
      throw new Error(`Failed to fetch safety reports: ${error?.message || 'No data'}`);
    }

    return data;
  }

  /**
   * Resolves a safety report with mandatory non-silent documentation (§49, §63).
   */
  public async resolveSafetyReport(params: {
    reportId: string;
    resolutionNote: string;
    status?: 'resolved' | 'dismissed';
  }): Promise<void> {
    const { error } = await this.db.rpc('resolve_safety_report', {
      p_report_id: params.reportId,
      p_resolution_note: params.resolutionNote,
      p_new_status: params.status || 'resolved',
    });

    if (error) {
      throw new Error(`Failed to resolve safety report: ${error.message}`);
    }
  }

  /**
   * Fetches server-side paginated workers directory (§56, §91).
   */
  public async getWorkers(params?: {
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResult<Record<string, unknown>>> {
    const { data, error } = await this.db.rpc<PaginatedResult<Record<string, unknown>>>(
      'get_admin_paginated_workers',
      {
        p_status: params?.status || null,
        p_search: params?.search || null,
        p_limit: params?.limit || 25,
        p_offset: params?.offset || 0,
      }
    );

    if (error || !data) {
      throw new Error(`Failed to fetch workers: ${error?.message || 'No data'}`);
    }

    return data;
  }

  /**
   * Fetches server-side paginated employers directory (§57, §91).
   */
  public async getEmployers(params?: {
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResult<Record<string, unknown>>> {
    const { data, error } = await this.db.rpc<PaginatedResult<Record<string, unknown>>>(
      'get_admin_paginated_employers',
      {
        p_status: params?.status || null,
        p_search: params?.search || null,
        p_limit: params?.limit || 25,
        p_offset: params?.offset || 0,
      }
    );

    if (error || !data) {
      throw new Error(`Failed to fetch employers: ${error?.message || 'No data'}`);
    }

    return data;
  }

  /**
   * Suspends or reinstates a user account with mandatory reason (§55, §67).
   */
  public async toggleUserStatus(params: {
    userId: string;
    newStatus: 'active' | 'suspended' | 'deactivated';
    reason: string;
  }): Promise<void> {
    const { error } = await this.db.rpc('toggle_user_account_status', {
      p_target_user_id: params.userId,
      p_new_status: params.newStatus,
      p_reason: params.reason,
    });

    if (error) {
      throw new Error(`Failed to update user status: ${error.message}`);
    }
  }

  /**
   * Fetches server-side paginated payouts queue (§60, §91).
   */
  public async getPayouts(params?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResult<Record<string, unknown>>> {
    const { data, error } = await this.db.rpc<PaginatedResult<Record<string, unknown>>>(
      'get_admin_paginated_payouts',
      {
        p_status: params?.status || null,
        p_limit: params?.limit || 25,
        p_offset: params?.offset || 0,
      }
    );

    if (error || !data) {
      throw new Error(`Failed to fetch payouts: ${error?.message || 'No data'}`);
    }

    return data;
  }

  /**
   * Fetches server-side paginated payments log (§59, §91).
   */
  public async getPayments(params?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResult<Record<string, unknown>>> {
    const { data, error } = await this.db.rpc<PaginatedResult<Record<string, unknown>>>(
      'get_admin_paginated_payments',
      {
        p_status: params?.status || null,
        p_limit: params?.limit || 25,
        p_offset: params?.offset || 0,
      }
    );

    if (error || !data) {
      throw new Error(`Failed to fetch payments: ${error?.message || 'No data'}`);
    }

    return data;
  }

  /**
   * Fetches server-side paginated double-entry ledger entries with balance check (§44, §91).
   */
  public async getLedgerEntries(params?: {
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResult<Record<string, unknown>> & { is_balanced: boolean; net_balance_sum_kobo: number }> {
    const { data, error } = await this.db.rpc<
      PaginatedResult<Record<string, unknown>> & { is_balanced: boolean; net_balance_sum_kobo: number }
    >('get_admin_paginated_ledger', {
      p_limit: params?.limit || 50,
      p_offset: params?.offset || 0,
    });

    if (error || !data) {
      throw new Error(`Failed to fetch ledger entries: ${error?.message || 'No data'}`);
    }

    return data;
  }
}
