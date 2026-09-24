-- =============================================================================
-- MENIAL — MARKETPLACE USERS & PROFILES PROCEDURES
-- =============================================================================
-- Migration: 20260922140000_marketplace_users.sql
-- Purpose:   User onboarding, profile synchronization, category management,
--            worker availability toggles, and verification review workflow.
-- Reference: menial-master-spec-v2.md (Sections 21, 22, 24, 25, 27, 28, 61, 80)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. AUTH USER PROFILE SYNCHRONIZATION TRIGGER
-- ---------------------------------------------------------------------------
-- Automatically runs on auth.users insert to ensure a base profile and
-- role-specific profile row exist before client interaction.

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account_type public.user_account_type;
  v_full_name text;
  v_phone text;
BEGIN
  -- Extract metadata provided during registration
  v_full_name := coalesce(NEW.raw_user_meta_data->>'full_name', 'New User');
  v_phone := coalesce(NEW.phone, NEW.raw_user_meta_data->>'phone', '+2340000000000');
  
  -- Determine account type (default to worker if not specified)
  IF (NEW.raw_user_meta_data->>'account_type') = 'employer' THEN
    v_account_type := 'employer';
  ELSE
    v_account_type := 'worker';
  END IF;

  -- 1. Create base profile (§21)
  INSERT INTO public.profiles (
    id,
    full_name,
    phone,
    email,
    account_type,
    status
  ) VALUES (
    NEW.id,
    v_full_name,
    v_phone,
    NEW.email,
    v_account_type,
    'active'
  )
  ON CONFLICT (id) DO UPDATE
  SET full_name = EXCLUDED.full_name,
      phone = EXCLUDED.phone,
      email = EXCLUDED.email;

  -- 2. Create role-specific profile extension (§22, §24)
  IF v_account_type = 'worker' THEN
    INSERT INTO public.worker_profiles (
      id,
      verification_status,
      is_available
    ) VALUES (
      NEW.id,
      'unverified',
      false
    )
    ON CONFLICT (id) DO NOTHING;
  ELSE
    INSERT INTO public.employer_profiles (
      id,
      is_business
    ) VALUES (
      NEW.id,
      false
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Note: Trigger attaches to auth.users in Supabase
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();


-- ---------------------------------------------------------------------------
-- 2. WORKER ONBOARDING PROCEDURE
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.complete_worker_onboarding(
  p_bio text,
  p_indicative_rate integer,          -- kobo
  p_service_radius_km numeric,
  p_category_ids uuid[],
  p_latitude double precision DEFAULT NULL,
  p_longitude double precision DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_account_type public.user_account_type;
  v_cat_id uuid;
  v_min_kobo integer;
  v_max_kobo integer;
BEGIN
  -- 1. Verify caller exists and is a worker
  SELECT account_type INTO v_account_type
  FROM public.profiles
  WHERE id = v_user_id;

  IF v_account_type IS NULL OR v_account_type != 'worker' THEN
    RAISE EXCEPTION 'Unauthorized: Only workers can complete worker onboarding (§22).';
  END IF;

  -- 2. Validate indicative rate in kobo against platform limits (§66)
  IF p_indicative_rate IS NOT NULL THEN
    SELECT coalesce(value::integer, 50000) INTO v_min_kobo
    FROM public.platform_settings WHERE key = 'min_job_amount_kobo';
    SELECT coalesce(value::integer, 50000000) INTO v_max_kobo
    FROM public.platform_settings WHERE key = 'max_job_amount_kobo';

    IF p_indicative_rate < v_min_kobo OR p_indicative_rate > v_max_kobo THEN
      RAISE EXCEPTION 'Indicative rate must be between ₦% and ₦% (§66).',
        v_min_kobo / 100, v_max_kobo / 100;
    END IF;
  END IF;

  -- 3. Update worker profile details
  UPDATE public.worker_profiles
  SET bio = p_bio,
      indicative_rate = p_indicative_rate,
      service_radius_km = coalesce(p_service_radius_km, 10.0),
      latitude = p_latitude,
      longitude = p_longitude,
      updated_at = now()
  WHERE id = v_user_id;

  -- 4. Map worker categories
  IF p_category_ids IS NOT NULL AND array_length(p_category_ids, 1) > 0 THEN
    DELETE FROM public.worker_categories WHERE worker_id = v_user_id;

    FOREACH v_cat_id IN ARRAY p_category_ids LOOP
      IF EXISTS (SELECT 1 FROM public.categories WHERE id = v_cat_id AND is_active = true) THEN
        INSERT INTO public.worker_categories (worker_id, category_id)
        VALUES (v_user_id, v_cat_id)
        ON CONFLICT (worker_id, category_id) DO NOTHING;
      END IF;
    END LOOP;
  END IF;

  RETURN true;
END;
$$;

COMMENT ON FUNCTION public.complete_worker_onboarding IS
  'Worker profile onboarding with category selection and rate in kobo. §22, §26';


-- ---------------------------------------------------------------------------
-- 3. EMPLOYER ONBOARDING PROCEDURE
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.complete_employer_onboarding(
  p_company_name text DEFAULT NULL,
  p_is_business boolean DEFAULT false
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_account_type public.user_account_type;
BEGIN
  -- Verify caller exists and is an employer
  SELECT account_type INTO v_account_type
  FROM public.profiles
  WHERE id = v_user_id;

  IF v_account_type IS NULL OR v_account_type != 'employer' THEN
    RAISE EXCEPTION 'Unauthorized: Only employers can complete employer onboarding (§24).';
  END IF;

  UPDATE public.employer_profiles
  SET company_name = p_company_name,
      is_business = p_is_business,
      updated_at = now()
  WHERE id = v_user_id;

  RETURN true;
END;
$$;

COMMENT ON FUNCTION public.complete_employer_onboarding IS
  'Employer onboarding configuring individual or business profile. §24';


-- ---------------------------------------------------------------------------
-- 4. TOGGLE WORKER AVAILABILITY
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.toggle_worker_availability(p_is_available boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  UPDATE public.worker_profiles
  SET is_available = p_is_available,
      updated_at = now()
  WHERE id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Worker profile not found.';
  END IF;

  RETURN p_is_available;
END;
$$;

COMMENT ON FUNCTION public.toggle_worker_availability IS
  'Fast toggle for worker active dispatch status. §27';


-- ---------------------------------------------------------------------------
-- 5. SUBMIT VERIFICATION REQUEST
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_verification_request(
  p_verification_type text,      -- e.g. 'phone', 'id_document'
  p_document_type text,          -- e.g. 'nin', 'voters_card', 'drivers_license'
  p_document_url text,           -- secure storage reference
  p_submitted_data jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_verification_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  -- 1. Create verification record in 'pending' status (§25)
  INSERT INTO public.verification_records (
    user_id,
    verification_type,
    document_type,
    document_url,
    submitted_data,
    status
  ) VALUES (
    v_user_id,
    p_verification_type,
    p_document_type,
    p_document_url,
    p_submitted_data,
    'pending'
  )
  RETURNING id INTO v_verification_id;

  -- 2. Update worker profile to pending verification
  UPDATE public.worker_profiles
  SET verification_status = 'pending',
      updated_at = now()
  WHERE id = v_user_id;

  RETURN v_verification_id;
END;
$$;

COMMENT ON FUNCTION public.submit_verification_request IS
  'Submits worker identity or document verification submission. §25';


-- ---------------------------------------------------------------------------
-- 6. REVIEW VERIFICATION SUBMISSION (VERIFICATION_ADMIN only)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.review_verification_submission(
  p_verification_id uuid,
  p_action public.verification_action,
  p_rejection_reason text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid;
  v_submission public.verification_records%ROWTYPE;
  v_new_status public.verification_status;
  v_worker_status public.verification_status;
  v_notification_title text;
  v_notification_msg text;
BEGIN
  -- 1. Verify caller has verification permission or is superadmin (§13, §61)
  SELECT id INTO v_admin_id
  FROM public.admin_users
  WHERE user_id = auth.uid() AND status = 'active';

  IF v_admin_id IS NULL OR NOT (
    public.has_admin_permission('verification') OR public.is_superadmin()
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Verification Admin permission required to review submissions (§13, §61).';
  END IF;

  -- 2. Fetch submission record
  SELECT * INTO v_submission
  FROM public.verification_records
  WHERE id = p_verification_id;

  IF v_submission.id IS NULL THEN
    RAISE EXCEPTION 'Verification submission not found.';
  END IF;

  -- 3. Determine status updates based on action
  IF p_action = 'approve' THEN
    v_new_status := 'verified';
    v_worker_status := 'verified';
    v_notification_title := 'Profile Verified!';
    v_notification_msg := 'Congratulations! Your identity verification has been approved. You are now a Verified Pro on Menial.';
  ELSIF p_action = 'reject' THEN
    v_new_status := 'rejected';
    v_worker_status := 'rejected';
    v_notification_title := 'Verification Update';
    v_notification_msg := coalesce(
      'Your verification submission could not be approved: ' || p_rejection_reason,
      'Your verification submission was not approved. Please review requirements and re-apply.'
    );
  ELSIF p_action = 'request_info' THEN
    v_new_status := 'pending';
    v_worker_status := 'pending';
    v_notification_title := 'Additional Information Needed';
    v_notification_msg := coalesce(
      'Our team needs additional information to complete your verification: ' || p_rejection_reason,
      'Please submit additional identity documentation to complete verification.'
    );
  ELSE
    RAISE EXCEPTION 'Invalid verification action.';
  END IF;

  -- 4. Update verification record
  UPDATE public.verification_records
  SET status = v_new_status,
      reviewer_id = v_admin_id,
      reviewed_at = now(),
      rejection_reason = p_rejection_reason,
      updated_at = now()
  WHERE id = p_verification_id;

  -- 5. Update worker profile (§25: "Only backend status determines a Verified badge")
  UPDATE public.worker_profiles
  SET verification_status = v_worker_status,
      updated_at = now()
  WHERE id = v_submission.user_id;

  -- 6. Insert audit log entry (§61, §67)
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
    'verification.review',
    'verification_record',
    p_verification_id,
    jsonb_build_object('status', v_submission.status),
    jsonb_build_object('status', v_new_status, 'action', p_action),
    p_rejection_reason,
    jsonb_build_object(
      'worker_id', v_submission.user_id,
      'verification_type', v_submission.verification_type,
      'document_type', v_submission.document_type
    )
  );

  -- 7. Send in-app notification to worker (§50)
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    metadata
  ) VALUES (
    v_submission.user_id,
    v_notification_title,
    v_notification_msg,
    jsonb_build_object(
      'verification_id', p_verification_id,
      'status', v_new_status
    )
  );

  RETURN true;
END;
$$;

COMMENT ON FUNCTION public.review_verification_submission IS
  'Admin procedure to approve, reject, or request information on worker verifications with audit logging and notification. §25, §61';
