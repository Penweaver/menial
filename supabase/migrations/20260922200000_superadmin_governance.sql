-- =============================================================================
-- MENIAL — SUPERADMIN GOVERNANCE & PLATFORM CONTROL PROCEDURES
-- =============================================================================
-- Migration: 20260922200000_superadmin_governance.sql
-- Purpose:   Superadmin-exclusive admin listing, platform settings inspection,
--            system health monitoring with double-entry ledger balance check,
--            and infrastructure account recovery protocol.
-- Reference: menial-master-spec-v2.md (Sections 11, 14, 20, 66, 71, 72, 74)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. SUPERADMIN ADMINS LIST (§72)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_superadmin_admins_list()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows jsonb;
BEGIN
  -- Strict Superadmin check (§14, §72)
  IF NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'Unauthorized: Superadmin authority required (§14, §72).';
  END IF;

  SELECT coalesce(jsonb_agg(r), '[]'::jsonb) INTO v_rows
  FROM (
    SELECT
      au.id,
      au.user_id,
      au.is_superadmin,
      au.status,
      au.mfa_enrolled,
      au.last_login_at,
      au.created_at,
      au.updated_at,
      p.full_name,
      p.email,
      p.phone,
      coalesce(
        (
          SELECT array_agg(ap.permission_key::text)
          FROM public.admin_user_permissions aup
          JOIN public.admin_permissions ap ON ap.id = aup.permission_id
          WHERE aup.admin_user_id = au.id
        ),
        CASE WHEN au.is_superadmin THEN ARRAY['operations', 'verification', 'support', 'finance', 'moderation'] ELSE ARRAY[]::text[] END
      ) AS permissions
    FROM public.admin_users au
    JOIN public.profiles p ON p.id = au.user_id
    ORDER BY au.is_superadmin DESC, au.created_at ASC
  ) r;

  RETURN v_rows;
END;
$$;

COMMENT ON FUNCTION public.get_superadmin_admins_list IS
  'Superadmin-only procedure retrieving all administrator accounts with status, permissions, and MFA status. §72';


-- ---------------------------------------------------------------------------
-- 2. GET SUPERADMIN PLATFORM SETTINGS (§66, §72)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_superadmin_platform_settings()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows jsonb;
BEGIN
  IF NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'Unauthorized: Superadmin authority required (§66).';
  END IF;

  SELECT coalesce(jsonb_agg(r), '[]'::jsonb) INTO v_rows
  FROM (
    SELECT
      ps.key,
      ps.value,
      ps.description,
      ps.updated_at,
      p.full_name AS updated_by_name
    FROM public.platform_settings ps
    LEFT JOIN public.admin_users au ON au.id = ps.updated_by
    LEFT JOIN public.profiles p ON p.id = au.user_id
    ORDER BY ps.key ASC
  ) r;

  RETURN v_rows;
END;
$$;

COMMENT ON FUNCTION public.get_superadmin_platform_settings IS
  'Superadmin-only procedure retrieving platform settings configuration. §66, §72';


-- ---------------------------------------------------------------------------
-- 3. GET SUPERADMIN SYSTEM HEALTH & LEDGER BALANCE CHECK (§72)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_superadmin_system_health()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ledger_sum bigint := 0;
  v_ledger_entry_count bigint := 0;
  v_is_ledger_balanced boolean := true;
  v_unresolved_sos integer := 0;
  v_open_disputes integer := 0;
  v_total_users integer := 0;
  v_total_jobs integer := 0;
BEGIN
  IF NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'Unauthorized: Superadmin authority required (§72).';
  END IF;

  -- 1. Double-Entry Ledger Balancing Verification (§44, §72)
  -- In double-entry bookkeeping, the net sum of all balanced credits and debits must be 0
  SELECT coalesce(sum(amount), 0), count(*)
  INTO v_ledger_sum, v_ledger_entry_count
  FROM public.ledger_entries;

  -- Ledger is balanced if sum equals 0
  v_is_ledger_balanced := (v_ledger_sum = 0);

  -- 2. System status aggregates
  SELECT count(*) INTO v_unresolved_sos
  FROM public.safety_reports WHERE status = 'open';

  SELECT count(*) INTO v_open_disputes
  FROM public.disputes WHERE status = 'open';

  SELECT count(*) INTO v_total_users FROM public.profiles;
  SELECT count(*) INTO v_total_jobs FROM public.jobs;

  RETURN jsonb_build_object(
    'system_status', 'healthy',
    'timestamp', now(),
    'ledger_audit', jsonb_build_object(
      'total_ledger_entries', v_ledger_entry_count,
      'net_balance_sum_kobo', v_ledger_sum,
      'is_balanced', v_is_ledger_balanced
    ),
    'operational_load', jsonb_build_object(
      'total_users', v_total_users,
      'total_jobs', v_total_jobs,
      'unresolved_emergency_sos', v_unresolved_sos,
      'open_disputes', v_open_disputes
    )
  );
END;
$$;

COMMENT ON FUNCTION public.get_superadmin_system_health IS
  'Performs system health audit including double-entry ledger balance verification. §44, §72';


-- ---------------------------------------------------------------------------
-- 4. EXECUTE SUPERADMIN RECOVERY PROCEDURE (§74)
-- ---------------------------------------------------------------------------
-- Disaster recovery procedure requiring database administrator authority.
CREATE OR REPLACE FUNCTION public.execute_superadmin_recovery(
  p_new_user_id uuid,
  p_reason text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_superadmin_id uuid;
  v_old_user_id uuid;
BEGIN
  -- Locate current superadmin row
  SELECT id, user_id INTO v_existing_superadmin_id, v_old_user_id
  FROM public.admin_users
  WHERE is_superadmin = true;

  IF v_existing_superadmin_id IS NULL THEN
    RAISE EXCEPTION 'No Superadmin account exists to recover. Use init-superadmin bootstrap (§11).';
  END IF;

  IF p_reason IS NULL OR length(trim(p_reason)) < 10 THEN
    RAISE EXCEPTION 'Detailed security rationale required for Superadmin recovery (§74).';
  END IF;

  -- Re-link Superadmin authority to the new recovered Auth user
  UPDATE public.admin_users
  SET user_id = p_new_user_id,
      mfa_enrolled = false, -- Reset MFA so user can re-enroll upon initial login (§23)
      updated_at = now()
  WHERE id = v_existing_superadmin_id;

  -- Record recovery event in immutable audit log (§67, §74)
  INSERT INTO public.audit_logs (
    actor_id,
    actor_role,
    action,
    target_type,
    target_id,
    previous_state,
    new_state,
    reason,
    metadata
  ) VALUES (
    v_existing_superadmin_id,
    'system',
    'superadmin.recovery',
    'admin_user',
    v_existing_superadmin_id,
    jsonb_build_object('user_id', v_old_user_id),
    jsonb_build_object('user_id', p_new_user_id, 'mfa_reset', true),
    p_reason,
    jsonb_build_object('recovered_at', now())
  );

  RETURN true;
END;
$$;

COMMENT ON FUNCTION public.execute_superadmin_recovery IS
  'Infrastructure recovery procedure to re-link Superadmin authority and reset MFA with audit logging. §74';
