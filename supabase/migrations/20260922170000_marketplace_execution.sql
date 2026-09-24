-- =============================================================================
-- MENIAL — MARKETPLACE JOB EXECUTION & SAFETY CHECK-INS
-- =============================================================================
-- Migration: 20260922170000_marketplace_execution.sql
-- Purpose:   Real-time execution state transitions, arrival/departure photo
--            check-ins (§49), completion confirmation (§45), and disputes (§47).
-- Reference: menial-master-spec-v2.md (Sections 31, 32, 33, 45, 46, 47, 49, 50)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. MARK WORKER ON WAY (§32)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_worker_on_way(p_job_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_job public.jobs%ROWTYPE;
  v_assignment public.job_workers%ROWTYPE;
BEGIN
  -- 1. Verify worker is assigned to this job
  SELECT * INTO v_assignment
  FROM public.job_workers
  WHERE job_id = p_job_id AND worker_id = v_user_id;

  IF v_assignment.id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Caller is not assigned to this job.';
  END IF;

  -- 2. Verify job status allows travel
  SELECT * INTO v_job FROM public.jobs WHERE id = p_job_id;

  IF v_job.status NOT IN ('payment_secured', 'worker_on_way') THEN
    RAISE EXCEPTION 'Job status (%) does not allow worker travel.', v_job.status;
  END IF;

  -- 3. Update assignment and job status (§32)
  UPDATE public.job_workers
  SET assignment_status = 'on_way'
  WHERE id = v_assignment.id;

  IF v_job.status = 'payment_secured' THEN
    UPDATE public.jobs
    SET status = 'worker_on_way', updated_at = now()
    WHERE id = p_job_id;

    -- Record transition (§33)
    INSERT INTO public.job_status_history (
      job_id,
      previous_status,
      new_status,
      actor_id,
      actor_type,
      reason
    ) VALUES (
      p_job_id,
      'payment_secured',
      'worker_on_way',
      v_user_id,
      'worker',
      'Worker commenced travel to job location'
    );
  END IF;

  -- 4. Notify employer (§50)
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    metadata
  ) VALUES (
    v_job.employer_id,
    'Worker is On The Way!',
    'Your worker is en route to ' || v_job.location_text || '.',
    jsonb_build_object('job_id', p_job_id, 'worker_id', v_user_id)
  );

  RETURN true;
END;
$$;

COMMENT ON FUNCTION public.mark_worker_on_way IS
  'Transitions worker and job status to worker_on_way. §32';


-- ---------------------------------------------------------------------------
-- 2. MARK WORKER ARRIVED (Photo Check-In) (§32, §49)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_worker_arrived(
  p_job_id uuid,
  p_checkin_photo_url text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_job public.jobs%ROWTYPE;
  v_assignment public.job_workers%ROWTYPE;
BEGIN
  -- 1. Verify worker assignment
  SELECT * INTO v_assignment
  FROM public.job_workers
  WHERE job_id = p_job_id AND worker_id = v_user_id;

  IF v_assignment.id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Caller is not assigned to this job.';
  END IF;

  SELECT * INTO v_job FROM public.jobs WHERE id = p_job_id;

  -- 2. Update assignment status
  UPDATE public.job_workers
  SET assignment_status = 'arrived',
      arrived_at = now()
  WHERE id = v_assignment.id;

  -- 3. Update job status to worker_arrived
  UPDATE public.jobs
  SET status = 'worker_arrived', updated_at = now()
  WHERE id = p_job_id;

  -- 4. Record transition with arrival photo in metadata (§33, §49)
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
    'worker_arrived',
    v_user_id,
    'worker',
    'Worker arrived at job site',
    jsonb_build_object(
      'checkin_photo_url', p_checkin_photo_url,
      'arrived_at', now()
    )
  );

  -- 5. Notify employer
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    metadata
  ) VALUES (
    v_job.employer_id,
    'Worker Arrived!',
    'Your worker has arrived at ' || v_job.location_text || '. Please provide access or work instructions.',
    jsonb_build_object('job_id', p_job_id, 'worker_id', v_user_id)
  );

  RETURN true;
END;
$$;

COMMENT ON FUNCTION public.mark_worker_arrived IS
  'Marks worker arrival with optional safety check-in photo. §32, §49';


-- ---------------------------------------------------------------------------
-- 3. START JOB WORK (§32)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.start_job_work(p_job_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_job public.jobs%ROWTYPE;
  v_assignment public.job_workers%ROWTYPE;
BEGIN
  SELECT * INTO v_assignment
  FROM public.job_workers
  WHERE job_id = p_job_id AND worker_id = v_user_id;

  IF v_assignment.id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Caller is not assigned to this job.';
  END IF;

  SELECT * INTO v_job FROM public.jobs WHERE id = p_job_id;

  -- Update assignment and job
  UPDATE public.job_workers
  SET assignment_status = 'in_progress',
      started_at = now()
  WHERE id = v_assignment.id;

  UPDATE public.jobs
  SET status = 'in_progress', updated_at = now()
  WHERE id = p_job_id;

  -- Record transition
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
    'in_progress',
    v_user_id,
    'worker',
    'Work commenced'
  );

  -- Notify employer
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    metadata
  ) VALUES (
    v_job.employer_id,
    'Work in Progress',
    'Work has officially started for ' || v_job.title || '.',
    jsonb_build_object('job_id', p_job_id)
  );

  RETURN true;
END;
$$;

COMMENT ON FUNCTION public.start_job_work IS
  'Marks job and worker as actively in_progress. §32';


-- ---------------------------------------------------------------------------
-- 4. COMPLETE JOB BY WORKER (Photo Check-Out) (§32, §45, §49)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.complete_job_by_worker(
  p_job_id uuid,
  p_checkout_photo_url text DEFAULT NULL,
  p_completion_notes text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_job public.jobs%ROWTYPE;
  v_assignment public.job_workers%ROWTYPE;
  v_all_completed boolean;
BEGIN
  -- 1. Verify worker assignment
  SELECT * INTO v_assignment
  FROM public.job_workers
  WHERE job_id = p_job_id AND worker_id = v_user_id;

  IF v_assignment.id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Caller is not assigned to this job.';
  END IF;

  SELECT * INTO v_job FROM public.jobs WHERE id = p_job_id;

  -- 2. Mark this worker completed
  UPDATE public.job_workers
  SET assignment_status = 'completed',
      completed_at = now()
  WHERE id = v_assignment.id;

  -- 3. Check if all required workers have completed
  SELECT (count(*) = v_job.number_of_workers) INTO v_all_completed
  FROM public.job_workers
  WHERE job_id = p_job_id AND assignment_status = 'completed';

  IF v_all_completed THEN
    UPDATE public.jobs
    SET status = 'completed_by_worker', updated_at = now()
    WHERE id = p_job_id;

    -- Record transition with checkout photo (§49)
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
      'in_progress',
      'completed_by_worker',
      v_user_id,
      'worker',
      'All workers marked job completed',
      jsonb_build_object(
        'checkout_photo_url', p_checkout_photo_url,
        'completion_notes', p_completion_notes
      )
    );

    -- Notify employer to review work and confirm completion (§45)
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      metadata
    ) VALUES (
      v_job.employer_id,
      'Work Finished — Please Confirm',
      'The worker has completed ' || v_job.title || '. Please inspect and confirm to release payment.',
      jsonb_build_object('job_id', p_job_id)
    );
  END IF;

  RETURN true;
END;
$$;

COMMENT ON FUNCTION public.complete_job_by_worker IS
  'Worker signals completion with optional checkout safety photo. §45, §49';


-- ---------------------------------------------------------------------------
-- 5. CONFIRM JOB COMPLETION (Employer only) (§45, §46)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.confirm_job_completion(p_job_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_job public.jobs%ROWTYPE;
  v_jw record;
BEGIN
  -- 1. Verify employer owns the job
  SELECT * INTO v_job FROM public.jobs WHERE id = p_job_id;

  IF v_job.id IS NULL OR v_job.employer_id != v_user_id THEN
    RAISE EXCEPTION 'Unauthorized: Caller does not own this job.';
  END IF;

  IF v_job.status != 'completed_by_worker' THEN
    RAISE EXCEPTION 'Job cannot be confirmed in % status.', v_job.status;
  END IF;

  -- 2. Mark job completed
  UPDATE public.jobs
  SET status = 'completed',
      completed_at = now(),
      updated_at = now()
  WHERE id = p_job_id;

  -- 3. Increment completed jobs counters (§22, §24)
  UPDATE public.employer_profiles
  SET total_jobs_count = total_jobs_count + 1
  WHERE id = v_user_id;

  FOR v_jw IN (SELECT worker_id FROM public.job_workers WHERE job_id = p_job_id) LOOP
    UPDATE public.worker_profiles
    SET completed_jobs_count = completed_jobs_count + 1
    WHERE id = v_jw.worker_id;

    -- Notify workers that payment is confirmed and invite rating (§46, §50)
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      metadata
    ) VALUES (
      v_jw.worker_id,
      'Job Confirmed & Payment Released!',
      'The employer has confirmed completion for ' || v_job.title || '. Funds are now available for payout.',
      jsonb_build_object('job_id', p_job_id)
    );
  END LOOP;

  -- 4. Record transition in job status history
  INSERT INTO public.job_status_history (
    job_id,
    previous_status,
    new_status,
    actor_id,
    actor_type,
    reason
  ) VALUES (
    p_job_id,
    'completed_by_worker',
    'completed',
    v_user_id,
    'employer',
    'Employer confirmed satisfactory job completion'
  );

  RETURN true;
END;
$$;

COMMENT ON FUNCTION public.confirm_job_completion IS
  'Employer confirms completion, releasing payout eligibility and updating completed job counts. §45';


-- ---------------------------------------------------------------------------
-- 6. RAISE COMPLETION DISPUTE (§45, §47)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.raise_completion_dispute(
  p_job_id uuid,
  p_reason public.dispute_reason,
  p_description text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_job public.jobs%ROWTYPE;
  v_dispute_id uuid;
  v_actor_party public.actor_party_type;
BEGIN
  SELECT * INTO v_job FROM public.jobs WHERE id = p_job_id;

  IF v_job.id IS NULL THEN
    RAISE EXCEPTION 'Job not found.';
  END IF;

  -- Determine caller party type
  IF v_job.employer_id = v_user_id THEN
    v_actor_party := 'employer';
  ELSIF EXISTS (SELECT 1 FROM public.job_workers WHERE job_id = p_job_id AND worker_id = v_user_id) THEN
    v_actor_party := 'worker';
  ELSE
    RAISE EXCEPTION 'Unauthorized: Caller is not a participant in this job.';
  END IF;

  -- 1. Create dispute record in 'open' status (§47)
  INSERT INTO public.disputes (
    job_id,
    filed_by_id,
    filed_by_type,
    reason,
    description,
    status
  ) VALUES (
    p_job_id,
    v_user_id,
    v_actor_party,
    p_reason,
    p_description,
    'open'
  )
  RETURNING id INTO v_dispute_id;

  -- 2. Transition job to 'disputed' status (§32, §45)
  UPDATE public.jobs
  SET status = 'disputed', updated_at = now()
  WHERE id = p_job_id;

  -- 3. Record transition in job status history
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
    'disputed',
    v_user_id,
    v_actor_party::text,
    'Dispute raised: ' || p_reason::text,
    jsonb_build_object('dispute_id', v_dispute_id)
  );

  RETURN v_dispute_id;
END;
$$;

COMMENT ON FUNCTION public.raise_completion_dispute IS
  'Transitions job to disputed status and creates an open dispute case for Support Admin intervention. §45, §47';
