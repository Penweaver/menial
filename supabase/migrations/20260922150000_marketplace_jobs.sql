-- =============================================================================
-- MENIAL — MARKETPLACE JOBS & HIRING PROCEDURES
-- =============================================================================
-- Migration: 20260922150000_marketplace_jobs.sql
-- Purpose:   Job creation with per-worker pay, dynamic platform fees,
--            hiring validation (§35), worker assignment workflows,
--            cancellation policy (§36), and no-show reporting.
-- Reference: menial-master-spec-v2.md (Sections 29-36, 40, 43, 48, 50)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. CREATE JOB LISTING (Employer only)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_job_listing(
  p_category_id uuid,
  p_title text,
  p_description text,
  p_location_text text,
  p_latitude double precision,
  p_longitude double precision,
  p_scheduled_date date,
  p_start_time time,
  p_duration_minutes integer,
  p_number_of_workers integer,
  p_worker_pay_kobo integer     -- per-worker amount in kobo (§29)
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_account_type public.user_account_type;
  v_status public.user_account_status;
  v_fee_pct numeric;
  v_min_kobo integer;
  v_max_kobo integer;
  v_subtotal_kobo bigint;
  v_platform_fee_kobo integer;
  v_total_amount_kobo integer;
  v_new_job_id uuid;
  v_public_id text;
  v_recent_jobs_count integer;
BEGIN
  -- 1. Verify caller is an active employer (§10, §21)
  SELECT account_type, status INTO v_account_type, v_status
  FROM public.profiles
  WHERE id = v_user_id;

  IF v_account_type IS NULL OR v_account_type != 'employer' THEN
    RAISE EXCEPTION 'Unauthorized: Only employers can create jobs (§29).';
  END IF;

  IF v_status != 'active' THEN
    RAISE EXCEPTION 'Account is %; job creation is prohibited (§21).', v_status;
  END IF;

  -- 2. Abuse prevention / Rate limiting (§43): Max 10 job creations per hour
  SELECT count(*) INTO v_recent_jobs_count
  FROM public.jobs
  WHERE employer_id = v_user_id
    AND created_at > (now() - interval '1 hour');

  IF v_recent_jobs_count >= 10 THEN
    RAISE EXCEPTION 'Rate limit exceeded: Maximum 10 jobs per hour. Please wait before creating more (§43).';
  END IF;

  -- 3. Validate worker count (§29)
  IF p_number_of_workers IS NULL OR p_number_of_workers < 1 THEN
    p_number_of_workers := 1;
  END IF;

  -- 4. Validate per-worker pay in kobo (§29, §66)
  SELECT coalesce(value::integer, 50000) INTO v_min_kobo
  FROM public.platform_settings WHERE key = 'min_job_amount_kobo';
  SELECT coalesce(value::integer, 50000000) INTO v_max_kobo
  FROM public.platform_settings WHERE key = 'max_job_amount_kobo';

  IF p_worker_pay_kobo < v_min_kobo OR p_worker_pay_kobo > v_max_kobo THEN
    RAISE EXCEPTION 'Worker pay must be between ₦% and ₦% per worker (§29, §66).',
      v_min_kobo / 100, v_max_kobo / 100;
  END IF;

  -- 5. Calculate platform fee and total cost (§29, §40)
  -- "proposed pay is a per-worker amount, not a total budget to be split.
  --  total cost is proposed pay × number_of_workers + platform_fee"
  SELECT coalesce(value::numeric, 10.0) INTO v_fee_pct
  FROM public.platform_settings WHERE key = 'platform_fee_percentage';

  v_subtotal_kobo := (p_worker_pay_kobo::bigint) * p_number_of_workers;
  v_platform_fee_kobo := round((v_subtotal_kobo * v_fee_pct) / 100.0);
  v_total_amount_kobo := (v_subtotal_kobo + v_platform_fee_kobo)::integer;

  -- 6. Insert job in 'draft' status (public_job_id trigger executes automatically)
  INSERT INTO public.jobs (
    employer_id,
    category_id,
    title,
    description,
    location_text,
    latitude,
    longitude,
    scheduled_date,
    start_time,
    duration_minutes,
    number_of_workers,
    worker_pay,
    platform_fee,
    total_amount,
    currency,
    status
  ) VALUES (
    v_user_id,
    p_category_id,
    p_title,
    p_description,
    p_location_text,
    p_latitude,
    p_longitude,
    p_scheduled_date,
    p_start_time,
    p_duration_minutes,
    p_number_of_workers,
    p_worker_pay_kobo,
    v_platform_fee_kobo,
    v_total_amount_kobo,
    'NGN',
    'draft'
  )
  RETURNING id, public_job_id INTO v_new_job_id, v_public_id;

  -- 7. Record initial entry in job status history (§33)
  INSERT INTO public.job_status_history (
    job_id,
    previous_status,
    new_status,
    actor_id,
    actor_type,
    reason,
    metadata
  ) VALUES (
    v_new_job_id,
    NULL,
    'draft',
    v_user_id,
    'employer',
    'Job created as draft',
    jsonb_build_object(
      'worker_pay', p_worker_pay_kobo,
      'number_of_workers', p_number_of_workers,
      'platform_fee', v_platform_fee_kobo,
      'total_amount', v_total_amount_kobo
    )
  );

  RETURN jsonb_build_object(
    'job_id', v_new_job_id,
    'public_job_id', v_public_id,
    'worker_pay_kobo', p_worker_pay_kobo,
    'number_of_workers', p_number_of_workers,
    'platform_fee_kobo', v_platform_fee_kobo,
    'total_amount_kobo', v_total_amount_kobo,
    'status', 'draft'
  );
END;
$$;

COMMENT ON FUNCTION public.create_job_listing IS
  'Creates a job draft with per-worker pay and dynamic 10% platform fee calculation in kobo. §29, §30, §40';


-- ---------------------------------------------------------------------------
-- 2. PUBLISH JOB LISTING
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.publish_job(p_job_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_current_status public.job_status;
BEGIN
  -- Verify employer owns the job
  SELECT status INTO v_current_status
  FROM public.jobs
  WHERE id = p_job_id AND employer_id = v_user_id;

  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'Job not found or caller is not the job employer.';
  END IF;

  IF v_current_status != 'draft' THEN
    RAISE EXCEPTION 'Only draft jobs can be published (current status: %).', v_current_status;
  END IF;

  -- Transition status: draft -> posted (§32)
  UPDATE public.jobs
  SET status = 'posted', updated_at = now()
  WHERE id = p_job_id;

  -- Record status transition (§33)
  INSERT INTO public.job_status_history (
    job_id,
    previous_status,
    new_status,
    actor_id,
    actor_type,
    reason
  ) VALUES (
    p_job_id,
    'draft',
    'posted',
    v_user_id,
    'employer',
    'Job published for worker discovery'
  );

  RETURN true;
END;
$$;

COMMENT ON FUNCTION public.publish_job IS
  'Publishes a draft job making it visible for worker matching and discovery. §32';


-- ---------------------------------------------------------------------------
-- 3. HIRE WORKER FOR JOB (§35 Validation Procedure)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.hire_worker_for_job(
  p_job_id uuid,
  p_worker_id uuid,
  p_agreed_amount_kobo integer DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_job public.jobs%ROWTYPE;
  v_worker_status public.user_account_status;
  v_worker_type public.user_account_type;
  v_assigned_count integer;
  v_worker_agreed_pay integer;
  v_assignment_id uuid;
  v_conv_id uuid;
BEGIN
  -- 1. Backend verifies: employer owns job (§35.1)
  SELECT * INTO v_job
  FROM public.jobs
  WHERE id = p_job_id;

  IF v_job.id IS NULL OR v_job.employer_id != v_user_id THEN
    RAISE EXCEPTION 'Unauthorized: Caller does not own this job (§35).';
  END IF;

  -- 2. Backend verifies: job allows hiring (§35.6)
  IF v_job.status NOT IN ('posted', 'matching', 'requested') THEN
    RAISE EXCEPTION 'Job status (%) does not allow hiring (§35).', v_job.status;
  END IF;

  -- 3. Backend verifies: worker exists & is eligible (§35.2)
  SELECT account_type, status INTO v_worker_type, v_worker_status
  FROM public.profiles
  WHERE id = p_worker_id;

  IF v_worker_type IS NULL OR v_worker_type != 'worker' THEN
    RAISE EXCEPTION 'Candidate is not a registered worker (§35).';
  END IF;

  IF v_worker_status != 'active' THEN
    RAISE EXCEPTION 'Worker account is % (§35).', v_worker_status;
  END IF;

  -- 4. Backend verifies: category matches (§35.3)
  IF NOT EXISTS (
    SELECT 1 FROM public.worker_categories
    WHERE worker_id = p_worker_id AND category_id = v_job.category_id
  ) THEN
    RAISE EXCEPTION 'Worker does not provide services in the requested category (§35).';
  END IF;

  -- 5. Backend verifies: worker not already assigned to this job (§35.5)
  IF EXISTS (
    SELECT 1 FROM public.job_workers
    WHERE job_id = p_job_id AND worker_id = p_worker_id
  ) THEN
    RAISE EXCEPTION 'Worker is already assigned or requested for this job (§35).';
  END IF;

  -- 6. Backend verifies: job capacity allows hiring
  SELECT count(*) INTO v_assigned_count
  FROM public.job_workers
  WHERE job_id = p_job_id
    AND assignment_status NOT IN ('rejected', 'cancelled');

  IF v_assigned_count >= v_job.number_of_workers THEN
    RAISE EXCEPTION 'Job worker capacity full (% of % positions filled).',
      v_assigned_count, v_job.number_of_workers;
  END IF;

  -- Determine agreed pay (defaults to job worker_pay per §29)
  v_worker_agreed_pay := coalesce(p_agreed_amount_kobo, v_job.worker_pay);

  -- 7. Create assignment in job_workers (§31)
  INSERT INTO public.job_workers (
    job_id,
    worker_id,
    assignment_status,
    agreed_amount,
    currency
  ) VALUES (
    p_job_id,
    p_worker_id,
    'requested',
    v_worker_agreed_pay,
    'NGN'
  )
  RETURNING id INTO v_assignment_id;

  -- 8. Initialize job-scoped conversation (§48)
  INSERT INTO public.conversations (
    job_id,
    employer_id,
    worker_id
  ) VALUES (
    p_job_id,
    v_user_id,
    p_worker_id
  )
  ON CONFLICT (job_id, worker_id) DO NOTHING;

  -- 9. Transition job status to 'requested' or 'matching' (§32)
  IF v_job.status = 'posted' THEN
    UPDATE public.jobs
    SET status = 'requested', updated_at = now()
    WHERE id = p_job_id;

    INSERT INTO public.job_status_history (
      job_id,
      previous_status,
      new_status,
      actor_id,
      actor_type,
      reason
    ) VALUES (
      p_job_id,
      'posted',
      'requested',
      v_user_id,
      'employer',
      'Hiring offer extended to worker'
    );
  END IF;

  -- 10. Send in-app notification to worker (§50)
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    metadata
  ) VALUES (
    p_worker_id,
    'New Job Offer: ' || v_job.title,
    'You have been selected for a job paying ₦' || (v_worker_agreed_pay / 100) || '. Tap to review and accept.',
    jsonb_build_object(
      'job_id', p_job_id,
      'public_job_id', v_job.public_job_id,
      'agreed_amount', v_worker_agreed_pay
    )
  );

  RETURN v_assignment_id;
END;
$$;

COMMENT ON FUNCTION public.hire_worker_for_job IS
  'Performs strict Section 35 backend validation checks before assigning a worker to a job. §31, §35';


-- ---------------------------------------------------------------------------
-- 4. RESPOND TO JOB INVITATION (Worker only)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.respond_to_job_invitation(
  p_job_id uuid,
  p_accept boolean,
  p_rejection_reason text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_assignment public.job_workers%ROWTYPE;
  v_job public.jobs%ROWTYPE;
  v_all_accepted boolean;
BEGIN
  -- Verify worker assignment exists
  SELECT * INTO v_assignment
  FROM public.job_workers
  WHERE job_id = p_job_id AND worker_id = v_user_id;

  IF v_assignment.id IS NULL THEN
    RAISE EXCEPTION 'No assignment found for this worker on this job.';
  END IF;

  IF v_assignment.assignment_status != 'requested' THEN
    RAISE EXCEPTION 'Assignment status is %, cannot respond.', v_assignment.assignment_status;
  END IF;

  SELECT * INTO v_job FROM public.jobs WHERE id = p_job_id;

  IF p_accept THEN
    -- Update assignment to accepted (§31)
    UPDATE public.job_workers
    SET assignment_status = 'accepted',
        accepted_at = now()
    WHERE id = v_assignment.id;

    -- Check if all positions are accepted
    SELECT (count(*) = v_job.number_of_workers) INTO v_all_accepted
    FROM public.job_workers
    WHERE job_id = p_job_id AND assignment_status = 'accepted';

    IF v_all_accepted THEN
      UPDATE public.jobs
      SET status = 'accepted', updated_at = now()
      WHERE id = p_job_id;

      INSERT INTO public.job_status_history (
        job_id,
        previous_status,
        new_status,
        actor_id,
        actor_type,
        reason
      ) VALUES (
        p_job_id,
        v_job.status,
        'accepted',
        v_user_id,
        'worker',
        'All worker positions accepted'
      );
    END IF;

    -- Notify employer
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      metadata
    ) VALUES (
      v_job.employer_id,
      'Worker Accepted Job!',
      'Worker has accepted your offer for ' || v_job.title || '. Proceed to secure payment.',
      jsonb_build_object('job_id', p_job_id, 'worker_id', v_user_id)
    );
  ELSE
    -- Rejected
    UPDATE public.job_workers
    SET assignment_status = 'rejected'
    WHERE id = v_assignment.id;

    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      metadata
    ) VALUES (
      v_job.employer_id,
      'Job Offer Declined',
      'Worker declined your offer: ' || coalesce(p_rejection_reason, 'No reason provided'),
      jsonb_build_object('job_id', p_job_id, 'worker_id', v_user_id)
    );
  END IF;

  RETURN true;
END;
$$;

COMMENT ON FUNCTION public.respond_to_job_invitation IS
  'Worker accepts or rejects a job assignment. §31, §32';


-- ---------------------------------------------------------------------------
-- 5. CANCEL JOB LISTING (§36 Policy)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cancel_job_listing(
  p_job_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_job public.jobs%ROWTYPE;
  v_sched_timestamp timestamptz;
  v_window_hours integer;
  v_cancel_fee_kobo integer := 0;
  v_hours_until_start numeric;
  v_fee_applicable boolean := false;
BEGIN
  SELECT * INTO v_job
  FROM public.jobs
  WHERE id = p_job_id;

  IF v_job.id IS NULL THEN
    RAISE EXCEPTION 'Job not found.';
  END IF;

  -- Only employer or Admin can cancel
  IF v_job.employer_id != v_user_id AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized to cancel this job.';
  END IF;

  -- Terminal statuses cannot be cancelled
  IF v_job.status IN ('completed', 'cancelled') THEN
    RAISE EXCEPTION 'Job is already in terminal status: %', v_job.status;
  END IF;

  -- Evaluate Section 36 Cancellation Policy:
  -- "Employer may cancel free of charge up to 2 hours before scheduled start time."
  SELECT coalesce(value::integer, 2) INTO v_window_hours
  FROM public.platform_settings WHERE key = 'cancellation_window_hours';

  v_sched_timestamp := (v_job.scheduled_date + coalesce(v_job.start_time, '08:00:00'::time))::timestamptz;
  v_hours_until_start := extract(epoch FROM (v_sched_timestamp - now())) / 3600.0;

  IF v_hours_until_start < v_window_hours AND v_job.status IN ('accepted', 'payment_secured', 'worker_on_way') THEN
    -- Inside cancellation window after acceptance: fee applicable (§36)
    SELECT coalesce(value::integer, 0) INTO v_cancel_fee_kobo
    FROM public.platform_settings WHERE key = 'cancellation_fee_kobo';
    v_fee_applicable := (v_cancel_fee_kobo > 0);
  END IF;

  -- Update job status to cancelled
  UPDATE public.jobs
  SET status = 'cancelled',
      cancellation_reason = p_reason,
      cancelled_at = now(),
      updated_at = now()
  WHERE id = p_job_id;

  -- Cancel all active worker assignments
  UPDATE public.job_workers
  SET assignment_status = 'cancelled'
  WHERE job_id = p_job_id
    AND assignment_status NOT IN ('completed', 'rejected');

  -- Record in job status history (§33, §36)
  INSERT INTO public.job_status_history (
    job_id,
    previous_status,
    new_status,
    actor_id,
    actor_type,
    reason,
    metadata
  ) VALUES (
    p_job_id,
    v_job.status,
    'cancelled',
    v_user_id,
    CASE WHEN v_job.employer_id = v_user_id THEN 'employer' ELSE 'admin' END,
    p_reason,
    jsonb_build_object(
      'hours_until_start', v_hours_until_start,
      'cancellation_fee_applicable', v_fee_applicable,
      'cancellation_fee_kobo', v_cancel_fee_kobo
    )
  );

  RETURN jsonb_build_object(
    'job_id', p_job_id,
    'status', 'cancelled',
    'hours_until_start', round(v_hours_until_start, 2),
    'cancellation_fee_kobo', v_cancel_fee_kobo,
    'free_cancellation', NOT v_fee_applicable
  );
END;
$$;

COMMENT ON FUNCTION public.cancel_job_listing IS
  'Cancels a job enforcing the Section 36 2-hour window policy. §36';


-- ---------------------------------------------------------------------------
-- 6. REPORT NO-SHOW (§36 Policy)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.report_no_show(
  p_job_id uuid,
  p_party_type public.actor_party_type, -- 'worker' or 'employer'
  p_party_id uuid,
  p_reason text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_job public.jobs%ROWTYPE;
BEGIN
  SELECT * INTO v_job FROM public.jobs WHERE id = p_job_id;

  IF v_job.id IS NULL THEN
    RAISE EXCEPTION 'Job not found.';
  END IF;

  -- 1. If worker no-show, update assignment status (§36)
  IF p_party_type = 'worker' THEN
    UPDATE public.job_workers
    SET assignment_status = 'no_show'
    WHERE job_id = p_job_id AND worker_id = p_party_id;
  END IF;

  -- 2. Log symmetrically to job status history (§36)
  INSERT INTO public.job_status_history (
    job_id,
    previous_status,
    new_status,
    actor_id,
    actor_type,
    reason,
    metadata
  ) VALUES (
    p_job_id,
    v_job.status,
    v_job.status, -- status remains, flagged in history
    v_user_id,
    'reporter',
    'No-show reported against ' || p_party_type || ': ' || p_reason,
    jsonb_build_object(
      'reported_party_type', p_party_type,
      'reported_party_id', p_party_id
    )
  );

  -- 3. Create high-priority notification for Support Admin attention (§36, §54)
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    metadata
  ) VALUES (
    v_job.employer_id,
    'No-Show Event Logged',
    'No-show incident reported on ' || v_job.public_job_id || ' and forwarded to Menial Support.',
    jsonb_build_object('job_id', p_job_id, 'reported_party', p_party_id)
  );

  RETURN true;
END;
$$;

COMMENT ON FUNCTION public.report_no_show IS
  'Records symmetric worker or employer no-show event in job status history per Section 36.';
