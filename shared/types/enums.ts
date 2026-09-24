/**
 * Menial Platform - Database Enums & Lifecycle Definitions
 * 
 * PostgreSQL enum types represented as TypeScript union string literal types.
 * All enums and state transition maps are exported.
 */

// ============================================================================
// 1. User & Identity Enums
// ============================================================================

/**
 * High-level marketplace account role.
 */
export type UserAccountType = 'employer' | 'worker';

/**
 * User account standing in the system.
 */
export type UserAccountStatus = 'active' | 'suspended' | 'deactivated';

// ============================================================================
// 2. Admin & Authorization Enums
// ============================================================================

/**
 * Status of an administrative user account.
 */
export type AdminStatus = 'invited' | 'active' | 'suspended' | 'deactivated';

/**
 * Granular permission keys assigned to Admin users.
 */
export type AdminPermissionKey =
  | 'operations'
  | 'verification'
  | 'support'
  | 'finance'
  | 'moderation';

// ============================================================================
// 3. Verification Enums
// ============================================================================

/**
 * Identity / worker verification status.
 */
export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

/**
 * Actions that an admin can take on a verification submission.
 */
export type VerificationAction = 'approve' | 'reject' | 'request_info';

// ============================================================================
// 4. Job Lifecycle & Worker Assignment Enums
// ============================================================================

/**
 * End-to-end lifecycle statuses for a job.
 */
export type JobStatus =
  | 'draft'
  | 'posted'
  | 'matching'
  | 'requested'
  | 'accepted'
  | 'payment_pending'
  | 'payment_secured'
  | 'worker_on_way'
  | 'worker_arrived'
  | 'in_progress'
  | 'completed_by_worker'
  | 'completed'
  | 'cancelled'
  | 'disputed'
  | 'payment_failed';

/**
 * Assignment and attendance status for an individual worker on a job.
 */
export type JobWorkerStatus =
  | 'invited'
  | 'requested'
  | 'accepted'
  | 'rejected'
  | 'on_way'
  | 'arrived'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show';

// ============================================================================
// 5. Payment & Financial Enums
// ============================================================================

/**
 * Status of an employer payment transaction.
 */
export type PaymentStatus =
  | 'pending'
  | 'successful'
  | 'failed'
  | 'cancelled'
  | 'refunded'
  | 'disputed';

/**
 * Status of a worker payout transaction.
 */
export type PayoutStatus =
  | 'pending'
  | 'processing'
  | 'successful'
  | 'failed'
  | 'reversed';

/**
 * Categorization for double-entry / append-only financial ledger entries.
 */
export type LedgerEntryType =
  | 'payment'
  | 'payout'
  | 'refund'
  | 'fee'
  | 'cancellation_fee';

/**
 * Supported platform currencies. Fixed to NGN (Nigerian Naira) for MVP.
 */
export type Currency = 'NGN';

// ============================================================================
// 6. Dispute, Safety & Moderation Enums
// ============================================================================

/**
 * Lifecycle status of an opened dispute.
 */
export type DisputeStatus =
  | 'open'
  | 'under_review'
  | 'waiting_for_information'
  | 'resolved'
  | 'closed';

/**
 * Categorized dispute reasons.
 */
export type DisputeReason =
  | 'worker_no_show'
  | 'employer_no_show'
  | 'incomplete_work'
  | 'inaccurate_description'
  | 'payment_problem'
  | 'safety_issue'
  | 'other';

/**
 * Lifecycle status of an emergency/safety SOS report.
 */
export type SafetyReportStatus =
  | 'open'
  | 'assigned'
  | 'under_review'
  | 'resolved'
  | 'closed';

/**
 * Entity role participating in ratings, reviews, messaging, or disputes.
 */
export type RaterType = 'employer' | 'worker';
export type ActorPartyType = 'employer' | 'worker';

// ============================================================================
// 7. Job Lifecycle State Transition Rules
// ============================================================================

/**
 * Valid next statuses for each JobStatus according to the core platform lifecycle:
 * DRAFT -> POSTED -> MATCHING -> REQUESTED -> ACCEPTED -> PAYMENT_PENDING -> PAYMENT_SECURED -> WORKER_ON_WAY -> WORKER_ARRIVED -> IN_PROGRESS -> COMPLETED_BY_WORKER -> COMPLETED
 *
 * Branches:
 * - Any active status -> CANCELLED
 * - PAYMENT_PENDING -> PAYMENT_FAILED
 * - COMPLETED_BY_WORKER -> DISPUTED
 * - DISPUTED -> COMPLETED | CANCELLED
 * - PAYMENT_FAILED -> PAYMENT_PENDING | CANCELLED
 */
export const JOB_STATUS_TRANSITIONS: Record<JobStatus, readonly JobStatus[]> = {
  draft: ['posted', 'cancelled'],
  posted: ['matching', 'cancelled'],
  matching: ['requested', 'cancelled'],
  requested: ['accepted', 'cancelled'],
  accepted: ['payment_pending', 'cancelled'],
  payment_pending: ['payment_secured', 'payment_failed', 'cancelled'],
  payment_secured: ['worker_on_way', 'cancelled'],
  worker_on_way: ['worker_arrived', 'cancelled'],
  worker_arrived: ['in_progress', 'cancelled'],
  in_progress: ['completed_by_worker', 'cancelled'],
  completed_by_worker: ['completed', 'disputed', 'cancelled'],
  completed: [],
  cancelled: [],
  disputed: ['completed', 'cancelled'],
  payment_failed: ['payment_pending', 'cancelled'],
} as const;

export type JobStatusTransitions = typeof JOB_STATUS_TRANSITIONS;

/**
 * Validates whether a proposed job status transition is permitted.
 */
export function isValidJobStatusTransition(from: JobStatus, to: JobStatus): boolean {
  return (JOB_STATUS_TRANSITIONS[from] as readonly JobStatus[]).includes(to);
}
