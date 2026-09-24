-- =============================================================================
-- MENIAL — MARKETPLACE TRUST, SAFETY & RATINGS PROCEDURES
-- =============================================================================
-- Migration: 20260922180000_marketplace_trust_safety.sql
-- Purpose:   Ratings with running average calculation (§46), Active Job SOS
--            reporting (§49), non-silent safety resolution (§63), job-scoped
--            messaging with terminal read-only lock (§48), and dispute resolution.
-- Reference: menial-master-spec-v2.md (Sections 46, 47, 48, 49, 62, 63, 67)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. SUBMIT JOB RATING (§46)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_job_rating(
  p_job_id uuid,
  p_stars smallint,
  p_review_text text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_job public.jobs%ROWTYPE;
  v_rater_type public.actor_party_type;
  v_ratee_id uuid;
  v_ratee_type public.actor_party_type;
  v_new_rating_id uuid;
  v_new_avg numeric(3,2);
  v_worker_assignment public.job_workers%ROWTYPE;
BEGIN
  -- 1. Verify star rating bounds (1 to 5)
  IF p_stars < 1 OR p_stars > 5 THEN
    RAISE EXCEPTION 'Rating stars must be an integer between 1 and 5 (§46).';
  END IF;

  -- 2. Verify job exists and is in terminal completed status (§46)
  SELECT * INTO v_job FROM public.jobs WHERE id = p_job_id;

  IF v_job.id IS NULL THEN
    RAISE EXCEPTION 'Job not found.';
  END IF;

  IF v_job.status != 'completed' THEN
    RAISE EXCEPTION 'Ratings can only be submitted after valid job completion (§46). Current status: %', v_job.status;
  END IF;

  -- 3. Determine rater and ratee roles
  IF v_job.employer_id = v_user_id THEN
    -- Employer is rating the worker
    v_rater_type := 'employer';
    v_ratee_type := 'worker';

    -- Identify assigned worker
    SELECT * INTO v_worker_assignment
    FROM public.job_workers
    WHERE job_id = p_job_id
    LIMIT 1;

    IF v_worker_assignment.id IS NULL THEN
      RAISE EXCEPTION 'No worker assignment found for this job.';
    END IF;
    v_ratee_id := v_worker_assignment.worker_id;

  ELSE
    -- Worker is rating the employer
    SELECT * INTO v_worker_assignment
    FROM public.job_workers
    WHERE job_id = p_job_id AND worker_id = v_user_id;

    IF v_assignment_check(v_worker_assignment.id) IS NULL AND v_worker_assignment.id IS NULL THEN
      RAISE EXCEPTION 'Unauthorized: Caller is not a participant in this job (§46).';
    END IF;

    v_rater_type := 'worker';
    v_ratee_type := 'employer';
    v_ratee_id := v_job.employer_id;
  END IF;

  -- 4. Check duplicate rating constraint (§46: one rating per rater per job)
  IF EXISTS (SELECT 1 FROM public.ratings WHERE job_id = p_job_id AND rater_id = v_user_id) THEN
    RAISE EXCEPTION 'Duplicate rating: You have already submitted a review for this job (§46).';
  END IF;

  -- 5. Insert rating record
  INSERT INTO public.ratings (
    job_id,
    rater_id,
    rater_type,
    ratee_id,
    ratee_type,
    stars,
    review_text
  ) VALUES (
    p_job_id,
    v_user_id,
    v_rater_type,
    v_ratee_id,
    v_ratee_type,
    p_stars,
    p_review_text
  )
  RETURNING id INTO v_new_rating_id;

  -- 6. Recalculate ratee's running average rating
  SELECT round(avg(stars)::numeric, 2) INTO v_new_avg
  FROM public.ratings
  WHERE ratee_id = v_ratee_id;

  IF v_ratee_type = 'worker' THEN
    UPDATE public.worker_profiles
    SET rating_avg = v_new_avg, updated_at = now()
    WHERE id = v_ratee_id;
  ELSE
    UPDATE public.employer_profiles
    SET rating_avg = v_new_avg, updated_at = now()
    WHERE id = v_ratee_id;
  END IF;

  -- 7. Notify ratee
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    metadata
  ) VALUES (
    v_ratee_id,
    'New Rating Received!',
    'You received a ' || p_stars || '-star rating for ' || v_job.title || '.',
    jsonb_build_object('job_id', p_job_id, 'stars', p_stars)
  );

  RETURN jsonb_build_object(
    'rating_id', v_new_rating_id,
    'job_id', p_job_id,
    'rater_id', v_user_id,
    'ratee_id', v_ratee_id,
    'stars', p_stars,
    'new_average_rating', v_new_avg
  );
END;
$$;

COMMENT ON FUNCTION public.submit_job_rating IS
  'Submits a 1-5 star rating and recalculates the ratee running average. §46';


-- ---------------------------------------------------------------------------
-- 2. TRIGGER EMERGENCY SOS (§49)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trigger_emergency_sos(
  p_job_id uuid,
  p_description text,
  p_location_text text DEFAULT NULL,
  p_latitude double precision DEFAULT NULL,
  p_longitude double precision DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_job public.jobs%ROWTYPE;
  v_reporter_type public.actor_party_type;
  v_report_id uuid;
  v_admin_rec record;
BEGIN
  SELECT * INTO v_job FROM public.jobs WHERE id = p_job_id;

  IF v_job.id IS NULL THEN
    RAISE EXCEPTION 'Job not found.';
  END IF;

  IF v_job.employer_id = v_user_id THEN
    v_reporter_type := 'employer';
  ELSIF EXISTS (SELECT 1 FROM public.job_workers WHERE job_id = p_job_id AND worker_id = v_user_id) THEN
    v_reporter_type := 'worker';
  ELSE
    RAISE EXCEPTION 'Unauthorized: Caller is not a participant in this job.';
  END IF;

  -- 1. Create safety report in 'open' status (§49)
  INSERT INTO public.safety_reports (
    job_id,
    reporter_id,
    reporter_type,
    description,
    location_text,
    latitude,
    longitude,
    status
  ) VALUES (
    p_job_id,
    v_user_id,
    v_reporter_type,
    p_description,
    coalesce(p_location_text, v_job.location_text),
    coalesce(p_latitude, v_job.latitude),
    coalesce(p_longitude, v_job.longitude),
    'open'
  )
  RETURNING id INTO v_report_id;

  -- 2. Notify all active Support Admins immediately (§49, §54)
  FOR v_admin_rec IN (
    SELECT au.user_id
    FROM public.admin_users au
    JOIN public.admin_user_permissions aup ON aup.admin_user_id = au.id
    JOIN public.admin_permissions ap ON ap.id = aup.permission_id
    WHERE au.status = 'active' AND ap.permission_key = 'support'
  ) LOOP
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      metadata
    ) VALUES (
      v_admin_rec.user_id,
      '🚨 EMERGENCY SOS REPORT: ' || v_job.public_job_id,
      'High-priority SOS raised by ' || v_reporter_type || ' at ' || coalesce(p_location_text, v_job.location_text) || '. Immediate attention required.',
      jsonb_build_object(
        'safety_report_id', v_report_id,
        'job_id', p_job_id,
        'urgency', 'high'
      )
    );
  END LOOP;

  -- 3. Record in audit logs (§67)
  INSERT INTO public.audit_logs (
    actor_id,
    actor_role,
    action,
    target_type,
    target_id,
    new_state,
    reason,
    metadata
  ) VALUES (
    v_user_id,
    v_reporter_type::text,
    'safety.sos_triggered',
    'safety_report',
    v_report_id,
    jsonb_build_object('status', 'open', 'description', p_description),
    'Emergency SOS triggered from Active Job screen (§49)',
    jsonb_build_object('job_id', p_job_id, 'public_job_id', v_job.public_job_id)
  );

  RETURN v_report_id;
END;
$$;

COMMENT ON FUNCTION public.trigger_emergency_sos IS
  'Creates high-priority SOS safety record and routes immediate alerts to Support Admins. §49';


-- ---------------------------------------------------------------------------
-- 3. RESOLVE SAFETY REPORT (SUPPORT_ADMIN Only) (§49, §63, §67)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.resolve_safety_report(
  p_report_id uuid,
  p_resolution_note text,
  p_new_status public.safety_report_status DEFAULT 'resolved'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid;
  v_report public.safety_reports%ROWTYPE;
BEGIN
  -- 1. Caller must have SUPPORT permission or be Superadmin (§13, §63)
  SELECT id INTO v_admin_id
  FROM public.admin_users
  WHERE user_id = auth.uid() AND status = 'active';

  IF v_admin_id IS NULL OR NOT (
    public.has_admin_permission('support') OR public.is_superadmin()
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Support Admin permission required to resolve safety reports.';
  END IF;

  -- 2. No silent closures (§49, §63): non-empty resolution note mandatory
  IF p_resolution_note IS NULL OR length(trim(p_resolution_note)) < 5 THEN
    RAISE EXCEPTION 'Resolution note is mandatory for closing or resolving safety reports (§49, §63).';
  END IF;

  SELECT * INTO v_report FROM public.safety_reports WHERE id = p_report_id;
  IF v_report.id IS NULL THEN
    RAISE EXCEPTION 'Safety report not found.';
  END IF;

  -- 3. Update report status
  UPDATE public.safety_reports
  SET status = p_new_status,
      resolution_note = p_resolution_note,
      resolved_by_id = v_admin_id,
      resolved_at = now(),
      updated_at = now()
  WHERE id = p_report_id;

  -- 4. Record resolution in immutable audit log (§67)
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
    v_admin_id,
    'admin',
    'safety.resolve',
    'safety_report',
    p_report_id,
    jsonb_build_object('status', v_report.status),
    jsonb_build_object('status', p_new_status, 'resolved_by', v_admin_id),
    p_resolution_note,
    jsonb_build_object('job_id', v_report.job_id)
  );

  RETURN true;
END;
$$;

COMMENT ON FUNCTION public.resolve_safety_report IS
  'Non-silent safety report resolution by Support Admin with required resolution notes and audit logging. §49, §63';


-- ---------------------------------------------------------------------------
-- 4. SEND JOB MESSAGE (Job-Scoped Chat with Terminal Read-Only Lock) (§48)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.send_job_message(
  p_conversation_id uuid,
  p_body text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_conv public.conversations%ROWTYPE;
  v_job public.jobs%ROWTYPE;
  v_sender_type public.actor_party_type;
  v_recipient_id uuid;
  v_message_id uuid;
BEGIN
  -- 1. Locate conversation
  SELECT * INTO v_conv FROM public.conversations WHERE id = p_conversation_id;
  IF v_conv.id IS NULL THEN
    RAISE EXCEPTION 'Conversation not found.';
  END IF;

  -- 2. Verify caller is a participant in this conversation
  IF v_conv.employer_id = v_user_id THEN
    v_sender_type := 'employer';
    v_recipient_id := v_conv.worker_id;
  ELSIF v_conv.worker_id = v_user_id THEN
    v_sender_type := 'worker';
    v_recipient_id := v_conv.employer_id;
  ELSE
    RAISE EXCEPTION 'Unauthorized: Caller is not a participant in this conversation.';
  END IF;

  -- 3. Enforce Terminal Status Read-Only Lock (§48):
  -- "Messages are scoped strictly to a single job's conversation and become read-only
  --  once the job reaches a terminal status (COMPLETED, CANCELLED)"
  SELECT * INTO v_job FROM public.jobs WHERE id = v_conv.job_id;

  IF v_job.status IN ('completed', 'cancelled') THEN
    RAISE EXCEPTION 'Conversation is locked: Job is in terminal status (%). Messages cannot be sent (§48).', v_job.status;
  END IF;

  -- 4. Insert message
  INSERT INTO public.messages (
    conversation_id,
    sender_id,
    sender_type,
    body
  ) VALUES (
    p_conversation_id,
    v_user_id,
    v_sender_type,
    p_body
  )
  RETURNING id INTO v_message_id;

  -- 5. Notify recipient in-app
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    metadata
  ) VALUES (
    v_recipient_id,
    'New Message on ' || v_job.title,
    p_body,
    jsonb_build_object('conversation_id', p_conversation_id, 'job_id', v_job.id)
  );

  RETURN v_message_id;
END;
$$;

COMMENT ON FUNCTION public.send_job_message IS
  'Sends a job-scoped message and enforces read-only chat locking upon terminal job completion. §48';


-- ---------------------------------------------------------------------------
-- 5. RESOLVE DISPUTE CASE (SUPPORT_ADMIN Only) (§47, §62, §67)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.resolve_dispute_case(
  p_dispute_id uuid,
  p_resolution_note text,
  p_financial_action text DEFAULT 'none' -- 'none', 'refund_employer', 'release_payout'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid;
  v_dispute public.disputes%ROWTYPE;
  v_job public.jobs%ROWTYPE;
BEGIN
  -- 1. Caller verification
  SELECT id INTO v_admin_id
  FROM public.admin_users
  WHERE user_id = auth.uid() AND status = 'active';

  IF v_admin_id IS NULL OR NOT (
    public.has_admin_permission('support') OR public.is_superadmin()
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Support Admin permission required to resolve disputes.';
  END IF;

  IF p_resolution_note IS NULL OR length(trim(p_resolution_note)) < 5 THEN
    RAISE EXCEPTION 'Resolution note is required for resolving disputes.';
  END IF;

  SELECT * INTO v_dispute FROM public.disputes WHERE id = p_dispute_id;
  IF v_dispute.id IS NULL THEN
    RAISE EXCEPTION 'Dispute not found.';
  END IF;

  SELECT * INTO v_job FROM public.jobs WHERE id = v_dispute.job_id;

  -- 2. Execute linked financial action if specified (§44)
  IF p_financial_action = 'refund_employer' THEN
    PERFORM public.process_payment_refund(v_dispute.job_id, 'Dispute resolution: ' || p_resolution_note);
  ELSIF p_financial_action = 'release_payout' THEN
    -- Mark job completed to allow payout release
    UPDATE public.jobs SET status = 'completed', completed_at = now() WHERE id = v_dispute.job_id;
    -- Find assigned worker and disburse
    PERFORM public.process_job_payout(v_dispute.job_id, (SELECT worker_id FROM public.job_workers WHERE job_id = v_dispute.job_id LIMIT 1));
  END IF;

  -- 3. Update dispute record
  UPDATE public.disputes
  SET status = 'resolved',
      resolution_note = p_resolution_note,
      assigned_admin_id = v_admin_id,
      resolved_at = now(),
      updated_at = now()
  WHERE id = p_dispute_id;

  -- 4. Record resolution in immutable audit log (§67)
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
    v_admin_id,
    'admin',
    'dispute.resolve',
    'dispute',
    p_dispute_id,
    jsonb_build_object('status', v_dispute.status),
    jsonb_build_object('status', 'resolved', 'financial_action', p_financial_action),
    p_resolution_note,
    jsonb_build_object('job_id', v_dispute.job_id)
  );

  RETURN true;
END;
$$;

COMMENT ON FUNCTION public.resolve_dispute_case IS
  'Resolves an open dispute case with optional financial action and audit logging. §47, §62, §67';
