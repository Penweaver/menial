-- =============================================================================
-- MENIAL — ADMIN OPERATIONS & OBSERVABILITY PROCEDURES
-- =============================================================================
-- Migration: 20260922190000_admin_operations.sql
-- Purpose:   Metrics aggregation (§54), high-performance pagination (§91),
--            category management (§64), platform settings management (§66),
--            and immutable audit trail inspection (§67).
-- Reference: menial-master-spec-v2.md (Sections 53-67, 91, 92)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. ADMIN OVERVIEW & ATTENTION QUEUE METRICS (§54)
-- ---------------------------------------------------------------------------
-- Aggregates real platform data without fabrication (§94).
CREATE OR REPLACE FUNCTION public.get_admin_overview_metrics()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_total_workers integer := 0;
  v_total_employers integer := 0;
  v_new_users_today integer := 0;
  v_active_jobs_count integer := 0;
  v_completed_jobs_count integer := 0;
  v_cancelled_jobs_count integer := 0;
  v_platform_revenue_kobo bigint := 0;
  v_pending_verifications integer := 0;
  v_open_disputes integer := 0;
  v_open_safety_reports integer := 0;
  v_failed_payments integer := 0;
  v_failed_payouts integer := 0;
BEGIN
  -- Verify caller is an active Admin or Superadmin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Administrative access required (§53).';
  END IF;

  -- 1. User counts
  SELECT count(*) INTO v_total_workers
  FROM public.profiles WHERE account_type = 'worker' AND status = 'active';

  SELECT count(*) INTO v_total_employers
  FROM public.profiles WHERE account_type = 'employer' AND status = 'active';

  SELECT count(*) INTO v_new_users_today
  FROM public.profiles
  WHERE created_at >= date_trunc('day', now());

  -- 2. Job counts
  SELECT count(*) INTO v_active_jobs_count
  FROM public.jobs
  WHERE status IN (
    'posted', 'matching', 'requested', 'accepted',
    'payment_pending', 'payment_secured',
    'worker_on_way', 'worker_arrived', 'in_progress', 'completed_by_worker'
  );

  SELECT count(*) INTO v_completed_jobs_count
  FROM public.jobs WHERE status = 'completed';

  SELECT count(*) INTO v_cancelled_jobs_count
  FROM public.jobs WHERE status = 'cancelled';

  -- 3. Platform revenue (sum of platform fee entries in ledger per §44)
  SELECT coalesce(sum(amount), 0) INTO v_platform_revenue_kobo
  FROM public.ledger_entries
  WHERE related_type = 'fee';

  -- 4. ATTENTION QUEUE (§54)
  SELECT count(*) INTO v_pending_verifications
  FROM public.verification_records WHERE status = 'pending';

  SELECT count(*) INTO v_open_disputes
  FROM public.disputes WHERE status IN ('open', 'under_review', 'waiting_for_information');

  SELECT count(*) INTO v_open_safety_reports
  FROM public.safety_reports WHERE status IN ('open', 'assigned', 'under_review');

  SELECT count(*) INTO v_failed_payments
  FROM public.payments WHERE status = 'failed';

  SELECT count(*) INTO v_failed_payouts
  FROM public.payouts WHERE status = 'failed';

  RETURN jsonb_build_object(
    'metrics', jsonb_build_object(
      'total_workers', v_total_workers,
      'total_employers', v_total_employers,
      'new_users_today', v_new_users_today,
      'active_jobs_count', v_active_jobs_count,
      'completed_jobs_count', v_completed_jobs_count,
      'cancelled_jobs_count', v_cancelled_jobs_count,
      'platform_revenue_kobo', v_platform_revenue_kobo,
      'currency', 'NGN'
    ),
    'attention_queue', jsonb_build_object(
      'pending_verifications', v_pending_verifications,
      'open_disputes', v_open_disputes,
      'open_safety_reports', v_open_safety_reports,
      'failed_payments', v_failed_payments,
      'failed_payouts', v_failed_payouts
    )
  );
END;
$$;

COMMENT ON FUNCTION public.get_admin_overview_metrics IS
  'Returns real-time platform overview metrics and operational attention queue counts. §54';


-- ---------------------------------------------------------------------------
-- 2. SERVER-SIDE PAGINATED JOBS QUERY (§91)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_admin_paginated_jobs(
  p_status text DEFAULT NULL,
  p_category_id uuid DEFAULT NULL,
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
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized.';
  END IF;

  -- Count total matching rows
  SELECT count(*) INTO v_total
  FROM public.jobs j
  WHERE (p_status IS NULL OR j.status::text = p_status)
    AND (p_category_id IS NULL OR j.category_id = p_category_id)
    AND (p_search IS NULL OR j.title ILIKE '%' || p_search || '%' OR j.public_job_id ILIKE '%' || p_search || '%');

  -- Fetch paginated rows with joined category and employer info
  SELECT coalesce(jsonb_agg(r), '[]'::jsonb) INTO v_rows
  FROM (
    SELECT
      j.id,
      j.public_job_id,
      j.title,
      j.status,
      j.scheduled_date,
      j.start_time,
      j.worker_pay,
      j.platform_fee,
      j.total_amount,
      j.number_of_workers,
      j.created_at,
      c.name AS category_name,
      p.full_name AS employer_name,
      p.phone AS employer_phone
    FROM public.jobs j
    JOIN public.categories c ON c.id = j.category_id
    JOIN public.profiles p ON p.id = j.employer_id
    WHERE (p_status IS NULL OR j.status::text = p_status)
      AND (p_category_id IS NULL OR j.category_id = p_category_id)
      AND (p_search IS NULL OR j.title ILIKE '%' || p_search || '%' OR j.public_job_id ILIKE '%' || p_search || '%')
    ORDER BY j.created_at DESC
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

COMMENT ON FUNCTION public.get_admin_paginated_jobs IS
  'High-performance server-side paginated jobs query for Admin dashboard. §58, §91';


-- ---------------------------------------------------------------------------
-- 3. SERVER-SIDE PAGINATED VERIFICATION QUEUE (§61, §91)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_admin_paginated_verifications(
  p_status text DEFAULT 'pending',
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
  IF NOT (public.has_admin_permission('verification') OR public.is_superadmin()) THEN
    RAISE EXCEPTION 'Unauthorized: Verification Admin permission required (§61).';
  END IF;

  SELECT count(*) INTO v_total
  FROM public.verification_records vr
  WHERE (p_status IS NULL OR vr.status::text = p_status);

  SELECT coalesce(jsonb_agg(r), '[]'::jsonb) INTO v_rows
  FROM (
    SELECT
      vr.id,
      vr.user_id,
      vr.verification_type,
      vr.document_type,
      vr.document_url,
      vr.status,
      vr.rejection_reason,
      vr.created_at,
      vr.reviewed_at,
      p.full_name AS worker_name,
      p.phone AS worker_phone
    FROM public.verification_records vr
    JOIN public.profiles p ON p.id = vr.user_id
    WHERE (p_status IS NULL OR vr.status::text = p_status)
    ORDER BY vr.created_at ASC
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

COMMENT ON FUNCTION public.get_admin_paginated_verifications IS
  'Server-side paginated queue for Verification Centre. §61, §91';


-- ---------------------------------------------------------------------------
-- 4. MANAGE CATEGORY PROCEDURE (§64, §67)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.manage_category(
  p_id uuid DEFAULT NULL,
  p_name text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_icon text DEFAULT NULL,
  p_is_active boolean DEFAULT true,
  p_display_order integer DEFAULT 0
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_admin_id uuid;
  v_target_id uuid;
  v_prev_state jsonb;
  v_action text;
BEGIN
  -- 1. Verify caller has OPERATIONS permission or is Superadmin (§64)
  SELECT id INTO v_admin_id
  FROM public.admin_users
  WHERE user_id = v_user_id AND status = 'active';

  IF v_admin_id IS NULL OR NOT (
    public.has_admin_permission('operations') OR public.is_superadmin()
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Operations Admin permission required (§64).';
  END IF;

  IF p_name IS NULL OR length(trim(p_name)) < 2 THEN
    RAISE EXCEPTION 'Category name must be at least 2 characters.';
  END IF;

  IF p_id IS NOT NULL THEN
    -- Update existing
    SELECT to_jsonb(c) INTO v_prev_state
    FROM public.categories c WHERE id = p_id;

    IF v_prev_state IS NULL THEN
      RAISE EXCEPTION 'Category not found.';
    END IF;

    UPDATE public.categories
    SET name = p_name,
        description = p_description,
        icon = p_icon,
        is_active = p_is_active,
        display_order = p_display_order,
        updated_at = now()
    WHERE id = p_id
    RETURNING id INTO v_target_id;

    v_action := 'category.update';
  ELSE
    -- Create new
    INSERT INTO public.categories (
      name,
      description,
      icon,
      is_active,
      display_order
    ) VALUES (
      p_name,
      p_description,
      p_icon,
      p_is_active,
      p_display_order
    )
    RETURNING id INTO v_target_id;

    v_prev_state := NULL;
    v_action := 'category.create';
  END IF;

  -- 2. Audit log entry (§67)
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
    v_action,
    'category',
    v_target_id,
    v_prev_state,
    jsonb_build_object(
      'name', p_name,
      'is_active', p_is_active,
      'display_order', p_display_order
    ),
    'Category managed via Admin Operations (§64)'
  );

  RETURN v_target_id;
END;
$$;

COMMENT ON FUNCTION public.manage_category IS
  'Creates or updates service categories with audit logging. §64, §67';


-- ---------------------------------------------------------------------------
-- 5. UPDATE PLATFORM SETTING (Superadmin Only) (§66, §67)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_platform_setting(
  p_key text,
  p_value text,
  p_reason text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_admin_id uuid;
  v_prev_value text;
BEGIN
  -- 1. Superadmin verification (§66: "Only Superadmin has ultimate authority")
  SELECT id INTO v_admin_id
  FROM public.admin_users
  WHERE user_id = v_user_id AND status = 'active' AND is_superadmin = true;

  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Only the Superadmin can modify platform settings (§66).';
  END IF;

  IF p_reason IS NULL OR length(trim(p_reason)) < 5 THEN
    RAISE EXCEPTION 'A detailed reason is required to modify platform settings (§66).';
  END IF;

  SELECT value INTO v_prev_value
  FROM public.platform_settings
  WHERE key = p_key;

  IF v_prev_value IS NULL THEN
    RAISE EXCEPTION 'Platform setting key % not found.', p_key;
  END IF;

  -- 2. Update setting
  UPDATE public.platform_settings
  SET value = p_value,
      updated_by = v_admin_id,
      updated_at = now()
  WHERE key = p_key;

  -- 3. Audit log entry (§67)
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
    'superadmin',
    'setting.update',
    'platform_setting',
    NULL,
    jsonb_build_object('key', p_key, 'value', v_prev_value),
    jsonb_build_object('key', p_key, 'value', p_value),
    p_reason
  );

  RETURN true;
END;
$$;

COMMENT ON FUNCTION public.update_platform_setting IS
  'Superadmin-only procedure to update platform configuration with audit logging. §66, §67';


-- ---------------------------------------------------------------------------
-- 6. GET ADMIN AUDIT LOGS (§67, §91)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_admin_audit_logs(
  p_action text DEFAULT NULL,
  p_target_type text DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL,
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
  v_rows jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Administrative access required (§67).';
  END IF;

  SELECT count(*) INTO v_total
  FROM public.audit_logs al
  WHERE (p_action IS NULL OR al.action = p_action)
    AND (p_target_type IS NULL OR al.target_type = p_target_type)
    AND (p_actor_id IS NULL OR al.actor_id = p_actor_id);

  SELECT coalesce(jsonb_agg(r), '[]'::jsonb) INTO v_rows
  FROM (
    SELECT
      al.id,
      al.actor_id,
      al.actor_role,
      al.action,
      al.target_type,
      al.target_id,
      al.previous_state,
      al.new_state,
      al.reason,
      al.metadata,
      al.created_at
    FROM public.audit_logs al
    WHERE (p_action IS NULL OR al.action = p_action)
      AND (p_target_type IS NULL OR al.target_type = p_target_type)
      AND (p_actor_id IS NULL OR al.actor_id = p_actor_id)
    ORDER BY al.created_at DESC
    LIMIT coalesce(p_limit, 50)
    OFFSET coalesce(p_offset, 0)
  ) r;

  RETURN jsonb_build_object(
    'total', v_total,
    'limit', coalesce(p_limit, 50),
    'offset', coalesce(p_offset, 0),
    'data', v_rows
  );
END;
$$;

COMMENT ON FUNCTION public.get_admin_audit_logs IS
  'Filtered server-side paginated retrieval of immutable audit events. §67, §91';
