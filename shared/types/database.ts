/**
 * Menial Platform - Database Types
 * 
 * PostgreSQL database row and insert definitions for Supabase client integration.
 * All monetary amounts are stored as integers in kobo (1 NGN = 100 kobo).
 * All timestamps are ISO 8601 strings.
 * All UUID identifiers are strings.
 */

import type {
  AdminPermissionKey,
  AdminStatus,
  Currency,
  DisputeReason,
  DisputeStatus,
  JobStatus,
  JobWorkerStatus,
  LedgerEntryType,
  PaymentStatus,
  PayoutStatus,
  RaterType,
  SafetyReportStatus,
  UserAccountType,
  UserAccountStatus,
  VerificationAction,
  VerificationStatus,
} from './enums';

export type {
  AdminPermissionKey,
  AdminStatus,
  Currency,
  DisputeReason,
  DisputeStatus,
  JobStatus,
  JobWorkerStatus,
  LedgerEntryType,
  PaymentStatus,
  PayoutStatus,
  RaterType,
  SafetyReportStatus,
  UserAccountType,
  UserAccountStatus,
  VerificationAction,
  VerificationStatus,
};

// ============================================================================
// 1. User & Profile Tables
// ============================================================================

/**
 * Core user profile extending Supabase auth.users.
 */
export interface Profile {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  avatar_url: string | null;
  account_type: UserAccountType;
  status: UserAccountStatus;
  created_at: string;
  updated_at: string;
}

export interface ProfileInsert {
  id: string;
  full_name: string;
  phone: string;
  email?: string | null;
  avatar_url?: string | null;
  account_type: UserAccountType;
  status?: UserAccountStatus;
  created_at?: string;
  updated_at?: string;
}

/**
 * Worker-specific marketplace profile and capabilities.
 */
export interface WorkerProfile {
  id: string;
  bio: string | null;
  /** Indicative worker rate in kobo (1 NGN = 100 kobo). Null if not set. */
  indicative_rate: number | null;
  currency: Currency;
  rating_avg: number | null;
  completed_jobs_count: number;
  is_available: boolean;
  service_radius_km: number | null;
  latitude: number | null;
  longitude: number | null;
  verification_status: VerificationStatus;
}

export interface WorkerProfileInsert {
  id: string;
  bio?: string | null;
  /** Indicative worker rate in kobo (1 NGN = 100 kobo). Null if not set. */
  indicative_rate?: number | null;
  currency?: Currency;
  rating_avg?: number | null;
  completed_jobs_count?: number;
  is_available?: boolean;
  service_radius_km?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  verification_status?: VerificationStatus;
}

/**
 * Employer-specific profile and marketplace statistics.
 */
export interface EmployerProfile {
  id: string;
  company_name: string | null;
  is_business: boolean;
  rating_avg: number | null;
  total_jobs_count: number;
}

export interface EmployerProfileInsert {
  id: string;
  company_name?: string | null;
  is_business?: boolean;
  rating_avg?: number | null;
  total_jobs_count?: number;
}

// ============================================================================
// 2. Admin & Access Control Tables
// ============================================================================

/**
 * Privileged administrative account record.
 */
export interface AdminUser {
  id: string;
  user_id: string;
  is_superadmin: boolean;
  status: AdminStatus;
  created_by: string | null;
  mfa_enrolled: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminUserInsert {
  id?: string;
  user_id: string;
  is_superadmin?: boolean;
  status?: AdminStatus;
  created_by?: string | null;
  mfa_enrolled?: boolean;
  last_login_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * System permission definition for administrative role-based access.
 */
export interface AdminPermission {
  id: string;
  permission_key: AdminPermissionKey;
  description: string;
}

export interface AdminPermissionInsert {
  id?: string;
  permission_key: AdminPermissionKey;
  description: string;
}

/**
 * Mapping between admin users and assigned granular permissions.
 */
export interface AdminUserPermission {
  id: string;
  admin_user_id: string;
  permission_id: string;
  granted_by: string;
  granted_at: string;
}

export interface AdminUserPermissionInsert {
  id?: string;
  admin_user_id: string;
  permission_id: string;
  granted_by: string;
  granted_at?: string;
}

// ============================================================================
// 3. Category & Taxonomy Tables
// ============================================================================

/**
 * Job category / skill taxonomy item.
 */
export interface Category {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface CategoryInsert {
  id?: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  is_active?: boolean;
  display_order?: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * Many-to-many relationship between workers and service categories.
 */
export interface WorkerCategory {
  worker_id: string;
  category_id: string;
}

export interface WorkerCategoryInsert {
  worker_id: string;
  category_id: string;
}

// ============================================================================
// 4. Job & Assignment Tables
// ============================================================================

/**
 * Core job listing and operational contract.
 */
export interface Job {
  id: string;
  public_job_id: string;
  employer_id: string;
  category_id: string;
  title: string;
  description: string | null;
  location_text: string;
  latitude: number | null;
  longitude: number | null;
  scheduled_date: string;
  start_time: string | null;
  duration_minutes: number | null;
  number_of_workers: number;
  /** Compensation amount per worker in kobo (1 NGN = 100 kobo) */
  worker_pay: number;
  /** Platform intermediary fee in kobo (1 NGN = 100 kobo) */
  platform_fee: number;
  /** Total job cost charged to the employer in kobo (1 NGN = 100 kobo) */
  total_amount: number;
  currency: Currency;
  status: JobStatus;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  cancelled_at: string | null;
}

export interface JobInsert {
  id?: string;
  public_job_id?: string;
  employer_id: string;
  category_id: string;
  title: string;
  description?: string | null;
  location_text: string;
  latitude?: number | null;
  longitude?: number | null;
  scheduled_date: string;
  start_time?: string | null;
  duration_minutes?: number | null;
  number_of_workers?: number;
  /** Compensation amount per worker in kobo (1 NGN = 100 kobo) */
  worker_pay: number;
  /** Platform intermediary fee in kobo (1 NGN = 100 kobo) */
  platform_fee: number;
  /** Total job cost charged to the employer in kobo (1 NGN = 100 kobo) */
  total_amount: number;
  currency?: Currency;
  status?: JobStatus;
  cancellation_reason?: string | null;
  created_at?: string;
  updated_at?: string;
  completed_at?: string | null;
  cancelled_at?: string | null;
}

/**
 * Worker assignment record for single or multi-worker jobs.
 */
export interface JobWorker {
  id: string;
  job_id: string;
  worker_id: string;
  assignment_status: JobWorkerStatus;
  /** Agreed worker payout amount for this assignment in kobo (1 NGN = 100 kobo) */
  agreed_amount: number;
  currency: Currency;
  assigned_at: string;
  accepted_at: string | null;
  arrived_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  payout_status: PayoutStatus;
}

export interface JobWorkerInsert {
  id?: string;
  job_id: string;
  worker_id: string;
  assignment_status?: JobWorkerStatus;
  /** Agreed worker payout amount for this assignment in kobo (1 NGN = 100 kobo) */
  agreed_amount: number;
  currency?: Currency;
  assigned_at?: string;
  accepted_at?: string | null;
  arrived_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  payout_status?: PayoutStatus;
}

/**
 * Audit trail of job status transitions over time.
 */
export interface JobStatusHistory {
  id: string;
  job_id: string;
  previous_status: JobStatus | null;
  new_status: JobStatus;
  actor_id: string;
  actor_type: string;
  reason: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface JobStatusHistoryInsert {
  id?: string;
  job_id: string;
  previous_status?: JobStatus | null;
  new_status: JobStatus;
  actor_id: string;
  actor_type: string;
  reason?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string;
}

// ============================================================================
// 5. Verification Table
// ============================================================================

/**
 * Identity, KYC, or skill verification submission record.
 */
export interface VerificationRecord {
  id: string;
  user_id: string;
  verification_type: string;
  document_type: string | null;
  document_url: string | null;
  submitted_data: Record<string, unknown> | null;
  status: VerificationStatus;
  reviewer_id: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface VerificationRecordInsert {
  id?: string;
  user_id: string;
  verification_type: string;
  document_type?: string | null;
  document_url?: string | null;
  submitted_data?: Record<string, unknown> | null;
  status?: VerificationStatus;
  reviewer_id?: string | null;
  reviewed_at?: string | null;
  rejection_reason?: string | null;
  created_at?: string;
  updated_at?: string;
}

// ============================================================================
// 6. Payments, Payouts & Ledger Tables
// ============================================================================

/**
 * Inbound payment transaction made by an employer.
 */
export interface Payment {
  id: string;
  job_id: string;
  employer_id: string;
  /** Amount designated for worker compensation in kobo (1 NGN = 100 kobo) */
  worker_amount: number;
  /** Platform service fee portion in kobo (1 NGN = 100 kobo) */
  platform_fee: number;
  /** Total transaction amount collected in kobo (1 NGN = 100 kobo) */
  total_amount: number;
  currency: Currency;
  provider: string | null;
  provider_reference: string | null;
  status: PaymentStatus;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentInsert {
  id?: string;
  job_id: string;
  employer_id: string;
  /** Amount designated for worker compensation in kobo (1 NGN = 100 kobo) */
  worker_amount: number;
  /** Platform service fee portion in kobo (1 NGN = 100 kobo) */
  platform_fee: number;
  /** Total transaction amount collected in kobo (1 NGN = 100 kobo) */
  total_amount: number;
  currency?: Currency;
  provider?: string | null;
  provider_reference?: string | null;
  status?: PaymentStatus;
  metadata?: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * Outbound payout transaction sent to a worker.
 */
export interface Payout {
  id: string;
  worker_id: string;
  job_id: string;
  /** Payout amount in kobo (1 NGN = 100 kobo) */
  amount: number;
  currency: Currency;
  provider: string | null;
  provider_reference: string | null;
  status: PayoutStatus;
  initiated_at: string;
  completed_at: string | null;
  failure_reason: string | null;
}

export interface PayoutInsert {
  id?: string;
  worker_id: string;
  job_id: string;
  /** Payout amount in kobo (1 NGN = 100 kobo) */
  amount: number;
  currency?: Currency;
  provider?: string | null;
  provider_reference?: string | null;
  status?: PayoutStatus;
  initiated_at?: string;
  completed_at?: string | null;
  failure_reason?: string | null;
}

/**
 * Immutable, append-only financial ledger entry. Single source of truth for balances.
 */
export interface LedgerEntry {
  id: string;
  related_type: LedgerEntryType;
  related_id: string;
  job_id: string | null;
  actor_id: string;
  /** Signed amount in kobo (1 NGN = 100 kobo); positive for credit, negative for debit */
  amount: number;
  currency: Currency;
  description: string;
  created_at: string;
}

export interface LedgerEntryInsert {
  id?: string;
  related_type: LedgerEntryType;
  related_id: string;
  job_id?: string | null;
  actor_id: string;
  /** Signed amount in kobo (1 NGN = 100 kobo); positive for credit, negative for debit */
  amount: number;
  currency?: Currency;
  description: string;
  created_at?: string;
}

// ============================================================================
// 7. Messaging Tables
// ============================================================================

/**
 * Job-scoped conversation thread between employer and worker.
 */
export interface Conversation {
  id: string;
  job_id: string;
  employer_id: string;
  worker_id: string;
  created_at: string;
}

export interface ConversationInsert {
  id?: string;
  job_id: string;
  employer_id: string;
  worker_id: string;
  created_at?: string;
}

/**
 * Individual chat message within a job conversation.
 */
export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_type: RaterType;
  body: string;
  created_at: string;
  read_at: string | null;
}

export interface MessageInsert {
  id?: string;
  conversation_id: string;
  sender_id: string;
  sender_type: RaterType;
  body: string;
  created_at?: string;
  read_at?: string | null;
}

// ============================================================================
// 8. Rating & Review Table
// ============================================================================

/**
 * Post-completion review and 1-5 star rating.
 */
export interface Rating {
  id: string;
  job_id: string;
  rater_id: string;
  rater_type: RaterType;
  ratee_id: string;
  ratee_type: RaterType;
  stars: number;
  review_text: string | null;
  created_at: string;
}

export interface RatingInsert {
  id?: string;
  job_id: string;
  rater_id: string;
  rater_type: RaterType;
  ratee_id: string;
  ratee_type: RaterType;
  stars: number;
  review_text?: string | null;
  created_at?: string;
}

// ============================================================================
// 9. Dispute & Safety Tables
// ============================================================================

/**
 * Formally opened job dispute requiring administrative arbitration.
 */
export interface Dispute {
  id: string;
  job_id: string;
  filed_by_id: string;
  filed_by_type: RaterType;
  reason: DisputeReason;
  description: string | null;
  status: DisputeStatus;
  assigned_admin_id: string | null;
  resolution_note: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DisputeInsert {
  id?: string;
  job_id: string;
  filed_by_id: string;
  filed_by_type: RaterType;
  reason: DisputeReason;
  description?: string | null;
  status?: DisputeStatus;
  assigned_admin_id?: string | null;
  resolution_note?: string | null;
  resolved_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * High-priority safety incident or SOS report filed by a user.
 */
export interface SafetyReport {
  id: string;
  job_id: string;
  reporter_id: string;
  reporter_type: RaterType;
  description: string;
  location_text: string | null;
  latitude: number | null;
  longitude: number | null;
  status: SafetyReportStatus;
  assigned_admin_id: string | null;
  resolution_note: string | null;
  resolved_by_id: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SafetyReportInsert {
  id?: string;
  job_id: string;
  reporter_id: string;
  reporter_type: RaterType;
  description: string;
  location_text?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  status?: SafetyReportStatus;
  assigned_admin_id?: string | null;
  resolution_note?: string | null;
  resolved_by_id?: string | null;
  resolved_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

// ============================================================================
// 10. Platform Operations Tables
// ============================================================================

/**
 * In-app notification delivered to a user.
 */
export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  is_read: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface NotificationInsert {
  id?: string;
  user_id: string;
  title: string;
  message: string;
  is_read?: boolean;
  metadata?: Record<string, unknown> | null;
  created_at?: string;
}

/**
 * Dynamic configuration setting for marketplace fees, rules, and limits.
 */
export interface PlatformSetting {
  id: string;
  key: string;
  value: string;
  description: string | null;
  updated_by: string | null;
  updated_at: string;
  created_at: string;
}

export interface PlatformSettingInsert {
  id?: string;
  key: string;
  value: string;
  description?: string | null;
  updated_by?: string | null;
  updated_at?: string;
  created_at?: string;
}

/**
 * Immutable administrative and operational audit trail entry.
 */
export interface AuditLog {
  id: string;
  actor_id: string;
  actor_role: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  previous_state: Record<string, unknown> | null;
  new_state: Record<string, unknown> | null;
  reason: string | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export interface AuditLogInsert {
  id?: string;
  actor_id: string;
  actor_role: string;
  action: string;
  target_type?: string | null;
  target_id?: string | null;
  previous_state?: Record<string, unknown> | null;
  new_state?: Record<string, unknown> | null;
  reason?: string | null;
  metadata?: Record<string, unknown> | null;
  ip_address?: string | null;
  created_at?: string;
}

// ============================================================================
// 11. Row & InsertRow Type Aliases
// ============================================================================

export type ProfileRow = Profile;
export type ProfileInsertRow = ProfileInsert;

export type WorkerProfileRow = WorkerProfile;
export type WorkerProfileInsertRow = WorkerProfileInsert;

export type EmployerProfileRow = EmployerProfile;
export type EmployerProfileInsertRow = EmployerProfileInsert;

export type AdminUserRow = AdminUser;
export type AdminUserInsertRow = AdminUserInsert;

export type AdminPermissionRow = AdminPermission;
export type AdminPermissionInsertRow = AdminPermissionInsert;

export type AdminUserPermissionRow = AdminUserPermission;
export type AdminUserPermissionInsertRow = AdminUserPermissionInsert;

export type CategoryRow = Category;
export type CategoryInsertRow = CategoryInsert;

export type WorkerCategoryRow = WorkerCategory;
export type WorkerCategoryInsertRow = WorkerCategoryInsert;

export type JobRow = Job;
export type JobInsertRow = JobInsert;

export type JobWorkerRow = JobWorker;
export type JobWorkerInsertRow = JobWorkerInsert;

export type JobStatusHistoryRow = JobStatusHistory;
export type JobStatusHistoryInsertRow = JobStatusHistoryInsert;

export type VerificationRecordRow = VerificationRecord;
export type VerificationRecordInsertRow = VerificationRecordInsert;

export type PaymentRow = Payment;
export type PaymentInsertRow = PaymentInsert;

export type PayoutRow = Payout;
export type PayoutInsertRow = PayoutInsert;

export type LedgerEntryRow = LedgerEntry;
export type LedgerEntryInsertRow = LedgerEntryInsert;

export type ConversationRow = Conversation;
export type ConversationInsertRow = ConversationInsert;

export type MessageRow = Message;
export type MessageInsertRow = MessageInsert;

export type RatingRow = Rating;
export type RatingInsertRow = RatingInsert;

export type DisputeRow = Dispute;
export type DisputeInsertRow = DisputeInsert;

export type SafetyReportRow = SafetyReport;
export type SafetyReportInsertRow = SafetyReportInsert;

export type NotificationRow = Notification;
export type NotificationInsertRow = NotificationInsert;

export type PlatformSettingRow = PlatformSetting;
export type PlatformSettingInsertRow = PlatformSettingInsert;

export type AuditLogRow = AuditLog;
export type AuditLogInsertRow = AuditLogInsert;

// ============================================================================
// 12. Supabase Database Schema Type Definition
// ============================================================================

/**
 * Top-level Database interface definition matching Supabase client conventions.
 */
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: ProfileInsert;
        Update: Partial<ProfileInsert>;
      };
      worker_profiles: {
        Row: WorkerProfile;
        Insert: WorkerProfileInsert;
        Update: Partial<WorkerProfileInsert>;
      };
      employer_profiles: {
        Row: EmployerProfile;
        Insert: EmployerProfileInsert;
        Update: Partial<EmployerProfileInsert>;
      };
      admin_users: {
        Row: AdminUser;
        Insert: AdminUserInsert;
        Update: Partial<AdminUserInsert>;
      };
      admin_permissions: {
        Row: AdminPermission;
        Insert: AdminPermissionInsert;
        Update: Partial<AdminPermissionInsert>;
      };
      admin_user_permissions: {
        Row: AdminUserPermission;
        Insert: AdminUserPermissionInsert;
        Update: Partial<AdminUserPermissionInsert>;
      };
      categories: {
        Row: Category;
        Insert: CategoryInsert;
        Update: Partial<CategoryInsert>;
      };
      worker_categories: {
        Row: WorkerCategory;
        Insert: WorkerCategoryInsert;
        Update: Partial<WorkerCategoryInsert>;
      };
      jobs: {
        Row: Job;
        Insert: JobInsert;
        Update: Partial<JobInsert>;
      };
      job_workers: {
        Row: JobWorker;
        Insert: JobWorkerInsert;
        Update: Partial<JobWorkerInsert>;
      };
      job_status_history: {
        Row: JobStatusHistory;
        Insert: JobStatusHistoryInsert;
        Update: Partial<JobStatusHistoryInsert>;
      };
      verification_records: {
        Row: VerificationRecord;
        Insert: VerificationRecordInsert;
        Update: Partial<VerificationRecordInsert>;
      };
      payments: {
        Row: Payment;
        Insert: PaymentInsert;
        Update: Partial<PaymentInsert>;
      };
      payouts: {
        Row: Payout;
        Insert: PayoutInsert;
        Update: Partial<PayoutInsert>;
      };
      ledger_entries: {
        Row: LedgerEntry;
        Insert: LedgerEntryInsert;
        Update: Partial<LedgerEntryInsert>;
      };
      conversations: {
        Row: Conversation;
        Insert: ConversationInsert;
        Update: Partial<ConversationInsert>;
      };
      messages: {
        Row: Message;
        Insert: MessageInsert;
        Update: Partial<MessageInsert>;
      };
      ratings: {
        Row: Rating;
        Insert: RatingInsert;
        Update: Partial<RatingInsert>;
      };
      disputes: {
        Row: Dispute;
        Insert: DisputeInsert;
        Update: Partial<DisputeInsert>;
      };
      safety_reports: {
        Row: SafetyReport;
        Insert: SafetyReportInsert;
        Update: Partial<SafetyReportInsert>;
      };
      notifications: {
        Row: Notification;
        Insert: NotificationInsert;
        Update: Partial<NotificationInsert>;
      };
      platform_settings: {
        Row: PlatformSetting;
        Insert: PlatformSettingInsert;
        Update: Partial<PlatformSettingInsert>;
      };
      audit_logs: {
        Row: AuditLog;
        Insert: AuditLogInsert;
        Update: Partial<AuditLogInsert>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_account_type: UserAccountType;
      user_account_status: UserAccountStatus;
      admin_status: AdminStatus;
      admin_permission_key: AdminPermissionKey;
      verification_status: VerificationStatus;
      verification_action: VerificationAction;
      job_status: JobStatus;
      job_worker_status: JobWorkerStatus;
      payment_status: PaymentStatus;
      payout_status: PayoutStatus;
      dispute_status: DisputeStatus;
      dispute_reason: DisputeReason;
      ledger_entry_type: LedgerEntryType;
      safety_report_status: SafetyReportStatus;
      rater_type: RaterType;
      currency: Currency;
    };
    CompositeTypes: Record<string, never>;
  };
}

// Generic helper types for Supabase client queries
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

export type DatabaseEnums<T extends keyof Database['public']['Enums']> =
  Database['public']['Enums'][T];
