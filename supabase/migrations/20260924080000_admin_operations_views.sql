-- =============================================================================
-- MENIAL — ADMIN OPERATIONS EXTENDED VIEWS & RPC PROCEDURES
-- =============================================================================
-- Migration: 20260924080000_admin_operations_views.sql
-- Purpose:   High-performance server-side paginated queries for:
--            1. Verification submissions queue with NDPA masking (§61, §80)
--            2. Disputes arbitration queue with photo check-in/out evidence (§62, §49)
--            3. Emergency SOS & Safety Reports triage queue (§63, §49)
--            4. Workers & Employers directory queries (§55, §56, §57)
--            5. User status toggle (suspension / reinstatement) with audit log (§55, §67)
-- Reference: menial-master-spec-v2.md (Sections 47, 49, 54, 55, 56, 57, 61, 62, 63, 67, 80, 91)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. SERVER-SIDE PAGINATED DISPUTES QUERY (§62, §91)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_admin_paginated_disputes(
  p_status text DEFAULT NULL,
  p_limit integer DEFAULT 25,
  p_offset integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total integer := 0;
  v_rows jsonb;
BEGIN
  IF NOT (public.has_admin_permission('support') OR public.is_superadmin()) THEN
    RAISE EXCEPTION 'Unauthorized: Support Admin permission required (§62).';
  END IF;

  SELECT count(*) INTO v_total
  FROM public.disputes d
  WHERE (p_status IS NULL OR d.status::text = p_status);

  SELECT coalesce(jsonb_agg(r), '[]'::jsonb) INTO v_rows
  FROM (
    SELECT
      d.id,
      d.job_id,
      d.filed_by_id,
      d.filed_by_type,
      d.reason,
      d.description,
      d.status,
      d.resolution_note,
      d.resolved_at,
      d.created_at,
      j.public_job_id,
      j.title AS job_title,
      j.total_amount,
      j.worker_pay,
      j.platform_fee,
      j.status AS job_status,
      p_filer.full_name AS filer_name,
      p_filer.phone AS filer_phone,
      p_emp.full_name AS employer_name,
      p_emp.phone AS employer_phone,
      p_wrk.full_name AS worker_name,
      p_wrk.phone AS worker_phone,
      -- Check-in / Check-out photo evidence from status history (§49)
      (
        SELECT jsh.metadata->>'checkin_photo_url'
        FROM public.job_status_history jsh
        WHERE jsh.job_id = d.job_id AND jsh.new_status = 'worker_arrived'
        ORDER BY jsh.created_at DESC
        LIMIT 1
      ) AS checkin_photo_url,
      (
        SELECT jsh.metadata->>'checkout_photo_url'
        FROM public.job_status_history jsh
        WHERE jsh.job_id = d.job_id AND jsh.new_status = 'completed_by_worker'
        ORDER BY jsh.created_at DESC
        LIMIT 1
      ) AS checkout_photo_url
    FROM public.disputes d
    JOIN public.jobs j ON j.id = d.job_id
    JOIN public.profiles p_filer ON p_filer.id = d.filed_by_id
    JOIN public.profiles p_emp ON p_emp.id = j.employer_id
    LEFT JOIN public.job_workers jw ON jw.job_id = j.id
    LEFT JOIN public.profiles p_wrk ON p_wrk.id = jw.worker_id
    WHERE (p_status IS NULL OR d.status::text = p_status)
    ORDER BY d.created_at DESC
    LIMIT coalesce(p_limit, 25)
    OFFSET coalesce(p_offset, 0)
  ) r;

  RETURN jsonb_build_object(
    'total', v_total,
    'limit', coalesce(p_limit, 25),
    'offset', coalesce(p_offset, 0),
    'data', v_rows
  );
END;
$$;

COMMENT ON FUNCTION public.get_admin_paginated_disputes IS
  'Server-side paginated queue for Dispute Arbitration Centre. §62, §91';


-- ---------------------------------------------------------------------------
-- 2. SERVER-SIDE PAGINATED SAFETY REPORTS & EMERGENCY SOS (§63, §91)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_admin_paginated_safety_reports(
  p_status text DEFAULT NULL,
  p_limit integer DEFAULT 25,
  p_offset integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total integer := 0;
  v_rows jsonb;
BEGIN
  IF NOT (public.has_admin_permission('support') OR public.is_superadmin()) THEN
    RAISE EXCEPTION 'Unauthorized: Support Admin permission required (§63).';
  END IF;

  SELECT count(*) INTO v_total
  FROM public.safety_reports sr
  WHERE (p_status IS NULL OR sr.status::text = p_status);

  SELECT coalesce(jsonb_agg(r), '[]'::jsonb) INTO v_rows
  FROM (
    SELECT
      sr.id,
      sr.job_id,
      sr.reporter_id,
      sr.reporter_type,
      sr.description,
      sr.location_text,
      sr.latitude,
      sr.longitude,
      sr.status,
      sr.resolution_note,
      sr.resolved_at,
      sr.created_at,
      j.public_job_id,
      j.title AS job_title,
      p_rep.full_name AS reporter_name,
      p_rep.phone AS reporter_phone,
      p_admin.full_name AS resolved_by_name
    FROM public.safety_reports sr
    JOIN public.jobs j ON j.id = sr.job_id
    JOIN public.profiles p_rep ON p_rep.id = sr.reporter_id
    LEFT JOIN public.admin_users au ON au.id = sr.resolved_by_id
    LEFT JOIN public.profiles p_admin ON p_admin.id = au.user_id
    WHERE (p_status IS NULL OR sr.status::text = p_status)
    ORDER BY sr.created_at DESC
    LIMIT coalesce(p_limit, 25)
    OFFSET coalesce(p_offset, 0)
  ) r;

  RETURN jsonb_build_object(
    'total', v_total,
    'limit', coalesce(p_limit, 25),
    'offset', coalesce(p_offset, 0),
    'data', v_rows
  );
END;
$$;

COMMENT ON FUNCTION public.get_admin_paginated_safety_reports IS
  'Server-side paginated queue for Safety Reports & SOS Centre. §63, §91';


-- ---------------------------------------------------------------------------
-- 3. SERVER-SIDE PAGINATED WORKERS DIRECTORY (§56, §91)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_admin_paginated_workers(
  p_status text DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_limit integer DEFAULT 25,
  p_offset integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total integer := 0;
  v_rows jsonb;
BEGIN
  IF NOT (public.has_admin_permission('operations') OR public.is_superadmin()) THEN
    RAISE EXCEPTION 'Unauthorized: Operations Admin permission required (§56).';
  END IF;

  SELECT count(*) INTO v_total
  FROM public.profiles p
  JOIN public.worker_profiles wp ON wp.id = p.id
  WHERE p.account_type = 'worker'
    AND (p_status IS NULL OR p.status::text = p_status)
    AND (p_search IS NULL OR p.full_name ILIKE '%' || p_search || '%' OR p.phone ILIKE '%' || p_search || '%');

  SELECT coalesce(jsonb_agg(r), '[]'::jsonb) INTO v_rows
  FROM (
    SELECT
      p.id,
      p.full_name,
      p.phone,
      p.status,
      p.verification_status,
      p.avatar_url,
      p.created_at,
      wp.is_available,
      wp.average_rating,
      wp.total_ratings_count,
      wp.completed_jobs_count
    FROM public.profiles p
    JOIN public.worker_profiles wp ON wp.id = p.id
    WHERE p.account_type = 'worker'
      AND (p_status IS NULL OR p.status::text = p_status)
      AND (p_search IS NULL OR p.full_name ILIKE '%' || p_search || '%' OR p.phone ILIKE '%' || p_search || '%')
    ORDER BY p.created_at DESC
    LIMIT coalesce(p_limit, 25)
    OFFSET coalesce(p_offset, 0)
  ) r;

  RETURN jsonb_build_object(
    'total', v_total,
    'limit', coalesce(p_limit, 25),
    'offset', coalesce(p_offset, 0),
    'data', v_rows
  );
END;
$$;

COMMENT ON FUNCTION public.get_admin_paginated_workers IS
  'Server-side paginated directory of workers for Admin dashboard. §56, §91';


-- ---------------------------------------------------------------------------
-- 4. SERVER-SIDE PAGINATED EMPLOYERS DIRECTORY (§57, §91)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_admin_paginated_employers(
  p_status text DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_limit integer DEFAULT 25,
  p_offset integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total integer := 0;
  v_rows jsonb;
BEGIN
  IF NOT (public.has_admin_permission('operations') OR public.is_superadmin()) THEN
    RAISE EXCEPTION 'Unauthorized: Operations Admin permission required (§57).';
  END IF;

  SELECT count(*) INTO v_total
  FROM public.profiles p
  JOIN public.employer_profiles ep ON ep.id = p.id
  WHERE p.account_type = 'employer'
    AND (p_status IS NULL OR p.status::text = p_status)
    AND (p_search IS NULL OR p.full_name ILIKE '%' || p_search || '%' OR p.phone ILIKE '%' || p_search || '%');

  SELECT coalesce(jsonb_agg(r), '[]'::jsonb) INTO v_rows
  FROM (
    SELECT
      p.id,
      p.full_name,
      p.phone,
      p.status,
      p.avatar_url,
      p.created_at,
      ep.company_name,
      ep.total_jobs_posted,
      ep.total_spent
    FROM public.profiles p
    JOIN public.employer_profiles ep ON ep.id = p.id
    WHERE p.account_type = 'employer'
      AND (p_status IS NULL OR p.status::text = p_status)
      AND (p_search IS NULL OR p.full_name ILIKE '%' || p_search || '%' OR p.phone ILIKE '%' || p_search || '%')
    ORDER BY p.created_at DESC
    LIMIT coalesce(p_limit, 25)
    OFFSET coalesce(p_offset, 0)
  ) r;

  RETURN jsonb_build_object(
    'total', v_total,
    'limit', coalesce(p_limit, 25),
    'offset', coalesce(p_offset, 0),
    'data', v_rows
  );
END;
$$;

COMMENT ON FUNCTION public.get_admin_paginated_employers IS
  'Server-side paginated directory of employers for Admin dashboard. §57, §91';


-- ---------------------------------------------------------------------------
-- 5. TOGGLE USER ACCOUNT STATUS (Suspension / Reinstatement) (§55, §67)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.toggle_user_account_status(
  p_target_user_id uuid,
  p_new_status text,
  p_reason text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid;
  v_prev_status text;
BEGIN
  -- Verify caller has operations permission or is superadmin (§55)
  SELECT id INTO v_admin_id
  FROM public.admin_users
  WHERE user_id = auth.uid() AND status = 'active';

  IF v_admin_id IS NULL OR NOT (
    public.has_admin_permission('operations') OR public.is_superadmin()
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Operations Admin permission required to modify user status (§55).';
  END IF;

  IF p_new_status NOT IN ('active', 'suspended', 'deactivated') THEN
    RAISE EXCEPTION 'Invalid status value. Must be active, suspended, or deactivated.';
  END IF;

  IF p_reason IS NULL OR length(trim(p_reason)) < 5 THEN
    RAISE EXCEPTION 'A detailed reason is required to modify user account status (§55, §67).';
  END IF;

  SELECT status INTO v_prev_status
  FROM public.profiles
  WHERE id = p_target_user_id;

  IF v_prev_status IS NULL THEN
    RAISE EXCEPTION 'User profile not found.';
  END IF;

  UPDATE public.profiles
  SET status = p_new_status::user_status,
      updated_at = now()
  WHERE id = p_target_user_id;

  -- Record in immutable audit log (§67)
  INSERT INTO public.audit_logs (
    actor_id,
    actor_role,
    action,
    target_type,
    target_id,
    previous_state,
    new_state,
    reason
  ) VALUES (
    v_admin_id,
    'admin',
    'user.status_update',
    'profile',
    p_target_user_id,
    jsonb_build_object('status', v_prev_status),
    jsonb_build_object('status', p_new_status),
    p_reason
  );

  RETURN true;
END;
$$;

COMMENT ON FUNCTION public.toggle_user_account_status IS
  'Suspends or reinstates a marketplace user with mandatory audit logging. §55, §67';


-- ---------------------------------------------------------------------------
-- 6. SERVER-SIDE PAGINATED PAYOUTS QUERY (§60, §91)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_admin_paginated_payouts(
  p_status text DEFAULT NULL,
  p_limit integer DEFAULT 25,
  p_offset integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total integer := 0;
  v_rows jsonb;
BEGIN
  IF NOT (public.has_admin_permission('finance') OR public.is_superadmin()) THEN
    RAISE EXCEPTION 'Unauthorized: Finance Admin permission required (§60).';
  END IF;

  SELECT count(*) INTO v_total
  FROM public.payouts p
  WHERE (p_status IS NULL OR p.status::text = p_status);

  SELECT coalesce(jsonb_agg(r), '[]'::jsonb) INTO v_rows
  FROM (
    SELECT
      p.id,
      p.worker_id,
      p.job_id,
      p.amount,
      p.currency,
      p.status,
      p.bank_name,
      p.bank_code,
      p.account_number,
      p.account_name,
      p.transfer_reference,
      p.failure_reason,
      p.created_at,
      p.processed_at,
      prof.full_name AS worker_name,
      prof.phone AS worker_phone,
      j.public_job_id,
      j.title AS job_title
    FROM public.payouts p
    JOIN public.profiles prof ON prof.id = p.worker_id
    LEFT JOIN public.jobs j ON j.id = p.job_id
    WHERE (p_status IS NULL OR p.status::text = p_status)
    ORDER BY p.created_at DESC
    LIMIT coalesce(p_limit, 25)
    OFFSET coalesce(p_offset, 0)
  ) r;

  RETURN jsonb_build_object(
    'total', v_total,
    'limit', coalesce(p_limit, 25),
    'offset', coalesce(p_offset, 0),
    'data', v_rows
  );
END;
$$;

COMMENT ON FUNCTION public.get_admin_paginated_payouts IS
  'Server-side paginated queue of bank payouts for Finance Admin. §60, §91';


-- ---------------------------------------------------------------------------
-- 7. SERVER-SIDE PAGINATED PAYMENTS QUERY (§59, §91)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_admin_paginated_payments(
  p_status text DEFAULT NULL,
  p_limit integer DEFAULT 25,
  p_offset integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total integer := 0;
  v_rows jsonb;
BEGIN
  IF NOT (public.has_admin_permission('finance') OR public.is_superadmin()) THEN
    RAISE EXCEPTION 'Unauthorized: Finance Admin permission required (§59).';
  END IF;

  SELECT count(*) INTO v_total
  FROM public.payments py
  WHERE (p_status IS NULL OR py.status::text = p_status);

  SELECT coalesce(jsonb_agg(r), '[]'::jsonb) INTO v_rows
  FROM (
    SELECT
      py.id,
      py.job_id,
      py.employer_id,
      py.amount,
      py.currency,
      py.status,
      py.payment_method,
      py.paystack_reference,
      py.paid_at,
      py.created_at,
      prof.full_name AS employer_name,
      prof.phone AS employer_phone,
      j.public_job_id,
      j.title AS job_title
    FROM public.payments py
    JOIN public.profiles prof ON prof.id = py.employer_id
    JOIN public.jobs j ON j.id = py.job_id
    WHERE (p_status IS NULL OR py.status::text = p_status)
    ORDER BY py.created_at DESC
    LIMIT coalesce(p_limit, 25)
    OFFSET coalesce(p_offset, 0)
  ) r;

  RETURN jsonb_build_object(
    'total', v_total,
    'limit', coalesce(p_limit, 25),
    'offset', coalesce(p_offset, 0),
    'data', v_rows
  );
END;
$$;

COMMENT ON FUNCTION public.get_admin_paginated_payments IS
  'Server-side paginated log of Paystack escrow payment transactions. §59, §91';


-- ---------------------------------------------------------------------------
-- 8. SERVER-SIDE PAGINATED DOUBLE-ENTRY LEDGER QUERY (§44, §91)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_admin_paginated_ledger(
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total integer := 0;
  v_net_sum bigint := 0;
  v_rows jsonb;
BEGIN
  IF NOT (public.has_admin_permission('finance') OR public.is_superadmin()) THEN
    RAISE EXCEPTION 'Unauthorized: Finance Admin permission required (§44).';
  END IF;

  SELECT count(*), coalesce(sum(amount), 0)
  INTO v_total, v_net_sum
  FROM public.ledger_entries;

  SELECT coalesce(jsonb_agg(r), '[]'::jsonb) INTO v_rows
  FROM (
    SELECT
      le.id,
      le.batch_id,
      le.user_id,
      le.account_type,
      le.amount,
      le.currency,
      le.direction,
      le.related_type,
      le.related_id,
      le.description,
      le.created_at,
      prof.full_name AS counterparty_name
    FROM public.ledger_entries le
    LEFT JOIN public.profiles prof ON prof.id = le.user_id
    ORDER BY le.created_at DESC
    LIMIT coalesce(p_limit, 50)
    OFFSET coalesce(p_offset, 0)
  ) r;

  RETURN jsonb_build_object(
    'total', v_total,
    'limit', coalesce(p_limit, 50),
    'offset', coalesce(p_offset, 0),
    'net_balance_sum_kobo', v_net_sum,
    'is_balanced', (v_net_sum = 0),
    'data', v_rows
  );
END;
$$;

COMMENT ON FUNCTION public.get_admin_paginated_ledger IS
  'Server-side paginated immutable double-entry ledger explorer with balance invariant. §44, §91';

