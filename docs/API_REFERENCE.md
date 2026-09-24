# Menial Platform — Backend API & RPC Reference

This document provides a comprehensive technical catalog of all PostgreSQL stored procedures (RPCs), input parameters, return schemas, security definer permissions, and their corresponding TypeScript service abstractions.

---

## Administrative Hierarchy & Security Model

```
                ┌─────────────────────────┐
                │   SUPERADMIN (Unique)   │
                │  MFA Mandatory (§11,20) │
                └────────────┬────────────┘
                             │ creates/manages
                ┌────────────▼────────────┐
                │     ADMINISTRATORS      │
                │ Operations, Support,    │
                │ Verification, Finance,  │
                │ Moderation (§13, §14)   │
                └────────────┬────────────┘
                             │ moderates/verifies
       ┌─────────────────────┴─────────────────────┐
       │                                           │
┌──────▼──────┐                             ┌──────▼──────┐
│  EMPLOYERS  │ ◄────── Marketplace ──────► │   WORKERS   │
└─────────────┘          Jobs & Pay         └─────────────┘
```

---

## 1. Authentication & Admin Authority RPCs

### `create_admin_account`
- **Security:** `SECURITY DEFINER`, Superadmin only (`is_superadmin()`).
- **Signature:**
  ```sql
  create_admin_account(
    p_email text,
    p_full_name text,
    p_permissions text[] DEFAULT '{}'::text[]
  ) RETURNS uuid
  ```
- **Description:** Initializes a new administrator account, creates authentication records, and assigns fine-grained RBAC permissions. Emits an immutable audit log entry.
- **Service Mapping:** `AdminService.createAdmin()`, `SuperadminService.createAdmin()`

### `update_admin_status`
- **Security:** `SECURITY DEFINER`, Superadmin only (`is_superadmin()`).
- **Signature:**
  ```sql
  update_admin_status(
    p_admin_user_id uuid,
    p_new_status admin_status,
    p_reason text
  ) RETURNS void
  ```
- **Description:** Transitions an administrator's status (`active`, `suspended`, `deactivated`). Strictly blocks modifying or deactivating the Superadmin account (§20).
- **Service Mapping:** `SuperadminService.updateAdminStatus()`

### `update_admin_permissions`
- **Security:** `SECURITY DEFINER`, Superadmin only (`is_superadmin()`).
- **Signature:**
  ```sql
  update_admin_permissions(
    p_admin_user_id uuid,
    p_permissions text[],
    p_reason text
  ) RETURNS void
  ```
- **Description:** Replaces an administrator's active permissions with a new set. Emits an audit log entry.
- **Service Mapping:** `SuperadminService.updateAdminPermissions()`

### `check_admin_access`
- **Security:** `SECURITY DEFINER`, authenticated user.
- **Signature:**
  ```sql
  check_admin_access(p_user_id uuid DEFAULT auth.uid())
  RETURNS TABLE (
    admin_id uuid,
    is_superadmin boolean,
    status admin_status,
    permissions text[],
    mfa_enrolled boolean
  )
  ```
- **Description:** Evaluates active administrative privileges and granted permission scopes for session validation.

---

## 2. Marketplace Users & Profiles RPCs

### `complete_worker_onboarding`
- **Security:** `SECURITY DEFINER`, authenticated worker (`auth.uid()`).
- **Signature:**
  ```sql
  complete_worker_onboarding(
    p_bio text,
    p_category_ids uuid[],
    p_indicative_rate bigint, -- kobo (§4)
    p_service_radius_km integer,
    p_latitude double precision,
    p_longitude double precision
  ) RETURNS void
  ```
- **Description:** Completes worker profile onboarding, associates primary work categories, and establishes geographic coordinates for proximity discovery (§28).
- **Service Mapping:** `ProfileService.updateWorkerProfile()`

### `complete_employer_onboarding`
- **Security:** `SECURITY DEFINER`, authenticated employer (`auth.uid()`).
- **Signature:**
  ```sql
  complete_employer_onboarding(
    p_company_name text,
    p_is_business boolean
  ) RETURNS void
  ```
- **Description:** Completes employer profile onboarding.
- **Service Mapping:** `ProfileService.updateEmployerProfile()`

### `toggle_worker_availability`
- **Security:** `SECURITY DEFINER`, authenticated worker (`auth.uid()`).
- **Signature:**
  ```sql
  toggle_worker_availability(p_is_available boolean) RETURNS boolean
  ```
- **Description:** Updates the worker's real-time on-demand availability toggle.

### `submit_verification_request`
- **Security:** `SECURITY DEFINER`, authenticated worker (`auth.uid()`).
- **Signature:**
  ```sql
  submit_verification_request(
    p_verification_type text,
    p_document_type text,
    p_document_url text,
    p_submitted_data jsonb
  ) RETURNS uuid
  ```
- **Description:** Submits worker identity documents (NIN, voter's card, driver's license). Masks PII numbers (`*******8901`) per Nigeria Data Protection Act (§80).

### `review_verification_submission`
- **Security:** `SECURITY DEFINER`, Verification Admin or Superadmin (`has_admin_permission('verification')`).
- **Signature:**
  ```sql
  review_verification_submission(
    p_verification_id uuid,
    p_action text, -- 'approve', 'reject', 'request_info'
    p_rejection_reason text DEFAULT NULL
  ) RETURNS void
  ```
- **Description:** Administrative review action transitioning verification record status and updating the worker's profile `verification_status` flag.

---

## 3. Marketplace & Job Creation RPCs

### `create_job_listing`
- **Security:** `SECURITY DEFINER`, authenticated employer.
- **Signature:**
  ```sql
  create_job_listing(
    p_category_id uuid,
    p_title text,
    p_description text,
    p_location_text text,
    p_latitude double precision,
    p_longitude double precision,
    p_scheduled_date date,
    p_start_time time DEFAULT NULL,
    p_duration_minutes integer DEFAULT NULL,
    p_number_of_workers integer DEFAULT 1,
    p_worker_pay bigint, -- kobo per worker (§29)
    p_currency currency DEFAULT 'NGN'
  ) RETURNS TABLE (job_id uuid, public_job_id text, total_amount bigint)
  ```
- **Description:** Creates a job draft. Strictly enforces the **Per-Worker Pay Rule (§29)**: `total_amount = (p_worker_pay * p_number_of_workers) + platform_fee` (dynamic 10% fee in kobo). Generates public human-readable ID (e.g. `MNL-00101`).
- **Service Mapping:** `JobService.createJob()`

### `publish_job`
- **Security:** `SECURITY DEFINER`, job owner.
- **Signature:** `publish_job(p_job_id uuid) RETURNS void`
- **Description:** Transitions job from `draft` to `posted` or `matching`.

### `hire_worker_for_job`
- **Security:** `SECURITY DEFINER`, job owner.
- **Signature:**
  ```sql
  hire_worker_for_job(
    p_job_id uuid,
    p_worker_id uuid,
    p_agreed_amount bigint DEFAULT NULL
  ) RETURNS uuid
  ```
- **Description:** Enforces Section 35 backend hiring checks: verifies employer ownership, worker availability, category alignment, active status, capacity limit, and prevents duplicate assignment.
- **Service Mapping:** `JobService.hireWorker()`

### `cancel_job_listing`
- **Security:** `SECURITY DEFINER`, job owner.
- **Signature:**
  ```sql
  cancel_job_listing(p_job_id uuid, p_reason text)
  RETURNS TABLE (
    job_id uuid,
    hours_until_start double precision,
    cancellation_fee_kobo bigint,
    free_cancellation boolean
  )
  ```
- **Description:** Cancels a job adhering to the Section 36 2-hour window policy. Outside 2 hours: 100% free refund. Within 2 hours: assesses platform cancellation penalty fee.
- **Service Mapping:** `JobService.cancelJob()`

---

## 4. Financial Transactions & Escrow RPCs

### `initialize_job_payment`
- **Security:** `SECURITY DEFINER`, employer job owner.
- **Signature:**
  ```sql
  initialize_job_payment(p_job_id uuid, p_provider text DEFAULT 'paystack')
  RETURNS TABLE (
    payment_id uuid,
    amount_kobo bigint,
    currency currency,
    provider_reference text
  )
  ```
- **Description:** Initializes an escrow payment session for the total job cost and locks the job into `payment_pending`.
- **Service Mapping:** `PaymentService.initializeJobPayment()`

### `confirm_payment_webhook`
- **Security:** `SECURITY DEFINER`, service role / webhook handler.
- **Signature:**
  ```sql
  confirm_payment_webhook(
    p_provider_reference text,
    p_amount_kobo bigint,
    p_provider_event_id text DEFAULT NULL,
    p_payload jsonb DEFAULT '{}'::jsonb
  ) RETURNS TABLE (success boolean, is_idempotent_replay boolean, job_id uuid)
  ```
- **Description:** Verifies payment completion from Paystack/Flutterwave webhooks. Enforces **Idempotency & Replay Attack Defense (§39)**. Records initial escrow deposit in the double-entry append-only ledger (`+total_amount kobo`).

### `process_job_payout`
- **Security:** `SECURITY DEFINER`, Finance Admin or Superadmin (`has_admin_permission('finance')`).
- **Signature:**
  ```sql
  process_job_payout(
    p_job_id uuid,
    p_worker_id uuid,
    p_account_number text,
    p_bank_code text,
    p_account_name text
  ) RETURNS TABLE (payout_id uuid, amount_kobo bigint, status text)
  ```
- **Description:** Validates 10-digit Nigerian NUBAN, generates balanced double-entry ledger entries, and initiates instant NIP transfer.

### `get_worker_earnings_summary`
- **Security:** `SECURITY DEFINER`, worker or Finance Admin.
- **Signature:**
  ```sql
  get_worker_earnings_summary(p_worker_id uuid)
  RETURNS TABLE (
    total_earned_kobo bigint,
    pending_payout_kobo bigint,
    completed_payout_kobo bigint,
    currency currency
  )
  ```
- **Description:** Calculates worker earnings strictly from append-only `ledger_entries` (§42, §44).

---

## 5. Job Execution & Safety Check-ins RPCs

### `mark_worker_on_way`
- **Security:** `SECURITY DEFINER`, assigned worker.
- **Signature:** `mark_worker_on_way(p_job_id uuid) RETURNS void`

### `mark_worker_arrived`
- **Security:** `SECURITY DEFINER`, assigned worker.
- **Signature:** `mark_worker_arrived(p_job_id uuid, p_photo_url text DEFAULT NULL) RETURNS void`
- **Description:** Records arrival timestamp and mandatory arrival check-in photo (§49).

### `start_job_work`
- **Security:** `SECURITY DEFINER`, assigned worker.
- **Signature:** `start_job_work(p_job_id uuid) RETURNS void`

### `complete_job_by_worker`
- **Security:** `SECURITY DEFINER`, assigned worker.
- **Signature:** `complete_job_by_worker(p_job_id uuid, p_photo_url text DEFAULT NULL) RETURNS void`
- **Description:** Records completion timestamp and mandatory checkout photo proof (§49).

### `confirm_job_completion`
- **Security:** `SECURITY DEFINER`, employer job owner.
- **Signature:** `confirm_job_completion(p_job_id uuid) RETURNS void`
- **Description:** Employer signs off work. Increments worker completed jobs count (§45) and triggers double-entry ledger balancing settlement batch.

### `raise_completion_dispute`
- **Security:** `SECURITY DEFINER`, employer or worker.
- **Signature:**
  ```sql
  raise_completion_dispute(
    p_job_id uuid,
    p_reason dispute_reason,
    p_description text
  ) RETURNS uuid
  ```
- **Description:** Branches job to `disputed` status and opens an operational dispute ticket.

---

## 6. Trust & Safety RPCs

### `submit_job_rating`
- **Security:** `SECURITY DEFINER`, job participant.
- **Signature:**
  ```sql
  submit_job_rating(
    p_job_id uuid,
    p_stars integer, -- 1 to 5
    p_review_text text DEFAULT NULL
  ) RETURNS TABLE (rating_id uuid, job_id uuid, rater_id uuid, ratee_id uuid, stars integer, new_average_rating numeric)
  ```
- **Description:** Records review, prevents duplicate reviews on the same job, and recalculates the ratee's running average (§46).

### `trigger_emergency_sos`
- **Security:** `SECURITY DEFINER`, job participant.
- **Signature:**
  ```sql
  trigger_emergency_sos(
    p_job_id uuid,
    p_description text,
    p_location_text text DEFAULT NULL,
    p_latitude double precision DEFAULT NULL,
    p_longitude double precision DEFAULT NULL
  ) RETURNS uuid
  ```
- **Description:** Dispatches immediate safety report to the Support Admin Attention Queue (§49).

### `resolve_safety_report`
- **Security:** `SECURITY DEFINER`, Support Admin or Superadmin.
- **Signature:**
  ```sql
  resolve_safety_report(
    p_report_id uuid,
    p_resolution_note text,
    p_new_status safety_report_status DEFAULT 'resolved'
  ) RETURNS void
  ```
- **Description:** Closes a safety report with non-silent mandatory audit logging (§49, §63).

### `send_job_message`
- **Security:** `SECURITY DEFINER`, job participant.
- **Signature:** `send_job_message(p_conversation_id uuid, p_body text) RETURNS uuid`
- **Description:** Scoped strictly to the job's conversation. Enforces **Terminal Read-Only Chat Lock (§48)** if the parent job is `completed` or `cancelled`.

---

## 7. Superadmin Governance RPCs

### `get_superadmin_admins_list`
- **Security:** `SECURITY DEFINER`, Superadmin only (`is_superadmin()`).
- **Signature:** `get_superadmin_admins_list() RETURNS TABLE (...)`

### `get_superadmin_system_health`
- **Security:** `SECURITY DEFINER`, Superadmin only (`is_superadmin()`).
- **Signature:**
  ```sql
  get_superadmin_system_health()
  RETURNS TABLE (
    metric_name text,
    metric_value text,
    status text,
    checked_at timestamp with time zone
  )
  ```
- **Description:** Verifies database table volumes, unhandled safety alerts, and runs the **Double-Entry Ledger Balancing Verification (§44, §72)** (`SUM(amount) = 0`).

### `execute_superadmin_recovery`
- **Security:** `SECURITY DEFINER`, database administrator privileges only.
- **Signature:**
  ```sql
  execute_superadmin_recovery(
    p_new_user_id uuid,
    p_reason text
  ) RETURNS void
  ```
- **Description:** Standard Operating Procedure recovery script for disaster recovery of the unique Superadmin account (§74).
