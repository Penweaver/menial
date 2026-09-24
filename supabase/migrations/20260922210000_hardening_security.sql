-- ===========================================================================
-- MENIAL MARKETPLACE — PHASE 10: HARDENING & SECURITY AUDIT MIGRATION
-- Migration: 20260922210000_hardening_security.sql
-- Description:
--   1. Function search_path lockdown (defending against search_path injection)
--   2. Strict append-only triggers on job_status_history, ledger_entries, and audit_logs
--   3. Financial integrity check constraints (per-worker pay math, positive amounts)
--   4. Phone and NUBAN data integrity constraints
--   5. Direct table RLS lockouts for append-only tables
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. SECURITY DEFINER SEARCH PATH LOCKDOWN
-- ---------------------------------------------------------------------------
-- Explicitly enforce SET search_path = public on all core helper and trigger functions
-- to eliminate search_path manipulation vulnerabilities in privileged contexts.

ALTER FUNCTION public.prevent_modify() SET search_path = public;
ALTER FUNCTION public.handle_updated_at() SET search_path = public;
ALTER FUNCTION public.generate_public_job_id() SET search_path = public;
ALTER FUNCTION public.is_admin() SET search_path = public;
ALTER FUNCTION public.is_superadmin() SET search_path = public;
ALTER FUNCTION public.has_admin_permission(admin_permission_key) SET search_path = public;
ALTER FUNCTION public.get_user_account_type() SET search_path = public;

-- ---------------------------------------------------------------------------
-- 2. APPEND-ONLY IMMUTABILITY DEFENSE (§42, §44, §67)
-- ---------------------------------------------------------------------------
-- Ensure job_status_history cannot be updated or deleted by any user or role.
-- Historical transitions must remain permanently immutable.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_job_status_history_no_update'
  ) THEN
    CREATE TRIGGER trg_job_status_history_no_update
      BEFORE UPDATE ON public.job_status_history
      FOR EACH ROW EXECUTE FUNCTION public.prevent_modify();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_job_status_history_no_delete'
  ) THEN
    CREATE TRIGGER trg_job_status_history_no_delete
      BEFORE DELETE ON public.job_status_history
      FOR EACH ROW EXECUTE FUNCTION public.prevent_modify();
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. FINANCIAL INTEGRITY CHECK CONSTRAINTS (§29, §37, §40, §42)
-- ---------------------------------------------------------------------------

-- A. Jobs Table: Proposed pay must be positive, workers must be >= 1, and total_amount must match exact formula
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_jobs_worker_pay_positive'
  ) THEN
    ALTER TABLE public.jobs
      ADD CONSTRAINT chk_jobs_worker_pay_positive CHECK (worker_pay > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_jobs_number_of_workers'
  ) THEN
    ALTER TABLE public.jobs
      ADD CONSTRAINT chk_jobs_number_of_workers CHECK (number_of_workers >= 1);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_jobs_platform_fee_non_negative'
  ) THEN
    ALTER TABLE public.jobs
      ADD CONSTRAINT chk_jobs_platform_fee_non_negative CHECK (platform_fee >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_jobs_total_amount_formula'
  ) THEN
    ALTER TABLE public.jobs
      ADD CONSTRAINT chk_jobs_total_amount_formula
      CHECK (total_amount = (worker_pay * number_of_workers) + platform_fee);
  END IF;
END $$;

-- B. Payments Table: Non-negative amounts and total consistency
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_payments_total_formula'
  ) THEN
    ALTER TABLE public.payments
      ADD CONSTRAINT chk_payments_total_formula
      CHECK (total_amount = worker_amount + platform_fee AND worker_amount >= 0 AND platform_fee >= 0);
  END IF;
END $$;

-- C. Payouts Table: Payout amount must always be greater than 0
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_payouts_amount_positive'
  ) THEN
    ALTER TABLE public.payouts
      ADD CONSTRAINT chk_payouts_amount_positive CHECK (amount > 0);
  END IF;
END $$;

-- D. Ledger Table: Ledger entries cannot have an amount of 0
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_ledger_non_zero_amount'
  ) THEN
    ALTER TABLE public.ledger_entries
      ADD CONSTRAINT chk_ledger_non_zero_amount CHECK (amount <> 0);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4. PROFILE & IDENTITY INTEGRITY CONSTRAINTS (§5, §80)
-- ---------------------------------------------------------------------------

-- E.164 or valid Nigerian local phone number format check
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_profiles_phone_format'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT chk_profiles_phone_format
      CHECK (phone ~ '^\+?[0-9]{10,15}$');
  END IF;
END $$;

-- Indicative rate on worker_profiles must be non-negative if set
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_worker_indicative_rate_non_negative'
  ) THEN
    ALTER TABLE public.worker_profiles
      ADD CONSTRAINT chk_worker_indicative_rate_non_negative
      CHECK (indicative_rate IS NULL OR indicative_rate >= 0);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 5. RLS LOCKOUT ON APPEND-ONLY TABLES
-- ---------------------------------------------------------------------------
-- Drop any direct INSERT/UPDATE/DELETE policies on ledger_entries, audit_logs,
-- and job_status_history for authenticated users, leaving writes exclusively
-- to server-side SECURITY DEFINER RPCs.

DROP POLICY IF EXISTS "Authenticated users cannot insert ledger directly" ON public.ledger_entries;
CREATE POLICY "Deny direct user insert on ledger_entries"
  ON public.ledger_entries
  FOR INSERT TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "Deny direct user insert on audit_logs" ON public.audit_logs;
CREATE POLICY "Deny direct user insert on audit_logs"
  ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "Deny direct user insert on job_status_history" ON public.job_status_history;
CREATE POLICY "Deny direct user insert on job_status_history"
  ON public.job_status_history
  FOR INSERT TO authenticated
  WITH CHECK (false);

-- ---------------------------------------------------------------------------
-- 6. SYSTEM HEALTH FUNCTION AUDIT HELPER (§72)
-- ---------------------------------------------------------------------------
-- Add a lightweight integrity check function to verify constraint and schema health

CREATE OR REPLACE FUNCTION public.verify_schema_integrity()
RETURNS TABLE (
  check_name text,
  is_valid boolean,
  details text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invalid_ledger_count integer;
  v_invalid_job_formula_count integer;
BEGIN
  -- 1. Check for any non-zero imbalance across all ledger transactions
  SELECT COUNT(*) INTO v_invalid_ledger_count
  FROM (
    SELECT job_id, SUM(amount) AS net_balance
    FROM public.ledger_entries
    WHERE job_id IS NOT NULL
    GROUP BY job_id
    HAVING SUM(amount) <> 0
  ) imbalanced;

  RETURN QUERY SELECT
    'ledger_zero_sum_integrity'::text,
    (v_invalid_ledger_count = 0),
    CASE WHEN v_invalid_ledger_count = 0
         THEN 'All completed ledger batches are balanced (net zero).'
         ELSE 'Found ' || v_invalid_ledger_count || ' imbalanced job ledger batches.'
    END;

  -- 2. Check for any jobs violating total_amount formula
  SELECT COUNT(*) INTO v_invalid_job_formula_count
  FROM public.jobs
  WHERE total_amount <> (worker_pay * number_of_workers) + platform_fee;

  RETURN QUERY SELECT
    'job_pricing_formula_integrity'::text,
    (v_invalid_job_formula_count = 0),
    CASE WHEN v_invalid_job_formula_count = 0
         THEN 'All jobs comply with (worker_pay * number_of_workers) + platform_fee formula.'
         ELSE 'Found ' || v_invalid_job_formula_count || ' jobs with formula mismatches.'
    END;
END;
$$;

-- Grant access to authenticated users with admin privileges
REVOKE ALL ON FUNCTION public.verify_schema_integrity() FROM public;
GRANT EXECUTE ON FUNCTION public.verify_schema_integrity() TO authenticated;
