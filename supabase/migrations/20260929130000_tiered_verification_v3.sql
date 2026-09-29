-- =============================================================================
-- MENIAL — SPEC ADDENDUM (v3): TIERED VERIFICATION & CATEGORY TAXONOMY
-- =============================================================================
-- Migration: 20260929130000_tiered_verification_v3.sql
-- Purpose:   Implements Spec Addendum v3:
--            1. Tiered verification model: Standard, Care, Technical Trades (§B).
--            2. Category taxonomy with verification_tier & wage bounds (§A, §G).
--            3. Category wage floor (hard block) and ceiling (soft warning) enforcement (§G).
--            4. Multi-category worker support via worker_categories (§I).
--            5. Care police certificate + 2 references and Technical trade review (§B, §C).
--            6. SOS audible alert acknowledgment (§L).
--            7. Emergency contact storage for workers and employers (§L).
--
-- Wage bounds policy (§G):
--   min_pay_kobo and max_pay_kobo default to NULL.
--   No floor/ceiling enforcement is active until explicitly set by an Admin.
--   When bounds are NULL, the job creation check skips gracefully without error.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. ENUM TYPES (§A, §B, §C)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verification_tier') THEN
    CREATE TYPE public.verification_tier AS ENUM ('standard', 'care', 'technical_trade');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'technical_sub_status') THEN
    CREATE TYPE public.technical_sub_status AS ENUM ('experience_verified', 'trade_test_certified');
  END IF;
END $$;

COMMENT ON TYPE public.verification_tier IS
  'Verification tiers: standard (NIN+phone), care (police cert+references), technical_trade (experience+portfolio/cert). §A, §B';

COMMENT ON TYPE public.technical_sub_status IS
  'Sub-status for technical trades: experience_verified (baseline) or trade_test_certified (premium). §B.3';


-- ---------------------------------------------------------------------------
-- 2. CATEGORIES TABLE EXTENSIONS (§A, §G)
-- ---------------------------------------------------------------------------
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS verification_tier public.verification_tier NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS min_pay_kobo bigint NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS max_pay_kobo bigint NULL DEFAULT NULL;

COMMENT ON COLUMN public.categories.verification_tier IS
  'Verification tier required to provide services in this category. §A, §B';
COMMENT ON COLUMN public.categories.min_pay_kobo IS
  'Hard floor minimum wage in kobo. Set by Admin from real local market data. NULL = inactive. §G';
COMMENT ON COLUMN public.categories.max_pay_kobo IS
  'Soft warning ceiling in kobo. Flags unusually high bids for user confirmation. NULL = inactive. §G';


-- ---------------------------------------------------------------------------
-- 3. SEED CATEGORY TAXONOMY (§A)
-- ---------------------------------------------------------------------------
-- Update existing categories to ensure verification_tier is correctly configured
UPDATE public.categories SET verification_tier = 'standard' WHERE name IN (
  'Cleaning', 'Moving', 'Loading', 'Gardening', 'Laundry', 'Construction',
  'Event Helper', 'Domestic Help', 'Errands', 'Car Wash', 'General Labour',
  'Packing/Unpacking', 'Other'
);

-- Upsert full Section A taxonomy with default NULL pay bounds (no invented figures)
INSERT INTO public.categories (name, description, icon, verification_tier, is_active, display_order, min_pay_kobo, max_pay_kobo)
VALUES
  -- A.1 Standard Tier
  ('Ironing/Pressing',                        'Clothes ironing, steaming, and pressing',                                    'ironing',           'standard',        true, 14, NULL, NULL),
  ('Moving / Loading / Warehouse Labour',     'Heavy lifting, truck loading/offloading, warehouse logistics',              'warehouse',         'standard',        true, 15, NULL, NULL),
  ('Gardening / Landscaping',                 'Lawn mowing, flower tending, weed clearance, landscape work',               'landscaping',       'standard',        true, 16, NULL, NULL),
  ('Fumigation / Pest Control Assistant',     'Pest control support, chemical spraying assistance, sanitation',            'fumigation',        'standard',        true, 17, NULL, NULL),
  ('Gutter & Water Tank Cleaning',            'Drainage clearance, water reservoir washing and decontamination',           'tank_cleaning',     'standard',        true, 18, NULL, NULL),
  ('Generator Servicing/Cleaning',            'Routine generator oil changes, filter cleanup, and surface wipe-down',       'generator',         'standard',        true, 19, NULL, NULL),
  ('Event Helper: Ushering',                  'Guest reception, ticketing, seat coordination, and hall guidance',          'ushering',          'standard',        true, 20, NULL, NULL),
  ('Event Helper: Waitstaff / Serving',       'Food and beverage serving, table bussing, and hospitality service',          'waitstaff',         'standard',        true, 21, NULL, NULL),
  ('Event Helper: Event Setup & Teardown',    'Canopy assembly, chair placement, stage arrangement, and venue pack-down',  'setup_teardown',    'standard',        true, 22, NULL, NULL),
  ('Event Helper: Event Equipment Loading',   'Sound system hauling, generator shifting, and stage gear loading',           'gear_loading',      'standard',        true, 23, NULL, NULL),
  ('Retail / Business Support',               'Stocktaking, flyer hand-out, inventory counts, and brand promotion labour', 'retail_support',    'standard',        true, 24, NULL, NULL),
  ('Farm / Smallholding Day Labour',          'Planting, weeding, crop harvesting, and manual agricultural assistance',    'farming',           'standard',        true, 25, NULL, NULL),

  -- A.2 Enhanced Tier — Care Services
  ('Childcare / Babysitting',                 'Professional infant, toddler, and after-school child minding',              'childcare',         'care',            true, 30, NULL, NULL),
  ('Elderly Care / Companion Care',           'Non-medical senior assistance, mobility accompaniment, and daily support',   'elderly_care',      'care',            true, 31, NULL, NULL),

  -- A.3 Enhanced Tier — Technical Trades
  ('Electrical Installation & Repair',        'Wiring diagnostics, socket repair, lighting setup, and breaker fixes',       'electrical',        'technical_trade', true, 40, NULL, NULL),
  ('Plumbing',                                'Pipe installation, leak stoppage, drainage fixes, and tap repair',          'plumbing',          'technical_trade', true, 41, NULL, NULL),
  ('AC / Refrigeration Servicing & Repair',   'Air conditioner gas refilling, coil cleaning, and compressor repair',       'ac_repair',         'technical_trade', true, 42, NULL, NULL),
  ('Welding & Fabrication',                   'Metal gates, burglar bars, structural steel welding, and fence repairs',    'welding',           'technical_trade', true, 43, NULL, NULL),
  ('Carpentry & Joinery',                     'Roof trusses, structural woodwork, door hanging, and cabinetry repairs',    'carpentry',         'technical_trade', true, 44, NULL, NULL)
ON CONFLICT (name) DO UPDATE SET
  verification_tier = EXCLUDED.verification_tier,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon;


-- ---------------------------------------------------------------------------
-- 4. VERIFICATION RECORDS TABLE EXTENSIONS (§B, §C)
-- ---------------------------------------------------------------------------
ALTER TABLE public.verification_records
  ADD COLUMN IF NOT EXISTS tier public.verification_tier NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.categories(id) ON DELETE CASCADE NULL,
  ADD COLUMN IF NOT EXISTS sub_status public.technical_sub_status NULL,
  ADD COLUMN IF NOT EXISTS references jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS certificate_type text NULL,
  ADD COLUMN IF NOT EXISTS certificate_grade text NULL,
  ADD COLUMN IF NOT EXISTS experience_years integer NULL,
  ADD COLUMN IF NOT EXISTS portfolio_urls text[] DEFAULT '{}'::text[];

CREATE INDEX IF NOT EXISTS idx_verification_records_tier_status
  ON public.verification_records (tier, status);

CREATE INDEX IF NOT EXISTS idx_verification_records_cat_user
  ON public.verification_records (category_id, user_id)
  WHERE category_id IS NOT NULL;

COMMENT ON COLUMN public.verification_records.tier IS
  'Verification tier of this submission. §B, §C';
COMMENT ON COLUMN public.verification_records.category_id IS
  'Associated category for Care and Technical Trade tier verification records. §C, §I';
COMMENT ON COLUMN public.verification_records.references IS
  'Structured references for Care tier: array of {name, relationship, phone, admin_contact_outcome, contacted_at}. §B.2, §C';
COMMENT ON COLUMN public.verification_records.sub_status IS
  'Technical trade sub-status: experience_verified or trade_test_certified. §B.3, §C';


-- ---------------------------------------------------------------------------
-- 5. WORKER CATEGORIES JOIN TABLE EXTENSIONS (§I)
-- ---------------------------------------------------------------------------
ALTER TABLE public.worker_categories
  ADD COLUMN IF NOT EXISTS added_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS indicative_rate_kobo bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS completed_jobs_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS average_rating numeric(3,2) NOT NULL DEFAULT 0.00;

COMMENT ON TABLE public.worker_categories IS
  'Worker multi-category assignments with per-category indicative rates and performance metrics. §I';


-- ---------------------------------------------------------------------------
-- 6. EMERGENCY CONTACTS (§L)
-- ---------------------------------------------------------------------------
ALTER TABLE public.worker_profiles
  ADD COLUMN IF NOT EXISTS emergency_contact jsonb NULL;

ALTER TABLE public.employer_profiles
  ADD COLUMN IF NOT EXISTS emergency_contact jsonb NULL;

COMMENT ON COLUMN public.worker_profiles.emergency_contact IS
  'Worker emergency contact: { name, relationship, phone }. §L';
COMMENT ON COLUMN public.employer_profiles.emergency_contact IS
  'Employer emergency contact: { name, relationship, phone }. §L';


-- ---------------------------------------------------------------------------
-- 7. SAFETY REPORTS AUDIBLE SOS ACKNOWLEDGMENT (§L)
-- ---------------------------------------------------------------------------
ALTER TABLE public.safety_reports
  ADD COLUMN IF NOT EXISTS acknowledged_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS acknowledged_by uuid REFERENCES public.admin_users(id) NULL;

CREATE INDEX IF NOT EXISTS idx_safety_reports_unacknowledged
  ON public.safety_reports (status, created_at DESC)
  WHERE acknowledged_at IS NULL AND status = 'open';

COMMENT ON COLUMN public.safety_reports.acknowledged_at IS
  'Timestamp when a Support Admin explicitly acknowledged and silenced the audible SOS alert. §L';


-- ---------------------------------------------------------------------------
-- 8. PLATFORM SETTINGS (§I)
-- ---------------------------------------------------------------------------
INSERT INTO public.platform_settings (key, value, description)
VALUES ('worker_max_categories', '5', 'Maximum number of service categories a worker can select (§I)')
ON CONFLICT (key) DO NOTHING;


-- ---------------------------------------------------------------------------
-- 9. UPDATED RPC: CREATE JOB LISTING (Wage bounds hard-floor enforcement §G)
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
  v_cat_name text;
  v_cat_min_kobo bigint;
  v_cat_max_kobo bigint;
  v_fee_pct numeric;
  v_min_kobo integer;
  v_max_kobo integer;
  v_subtotal_kobo bigint;
  v_platform_fee_kobo integer;
  v_total_amount_kobo integer;
  v_new_job_id uuid;
  v_public_id text;
  v_recent_jobs_count integer;
  v_is_above_ceiling boolean := false;
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

  -- 4. Global Platform Pay Bounds (§29, §66)
  SELECT coalesce(value::integer, 50000) INTO v_min_kobo
  FROM public.platform_settings WHERE key = 'min_job_amount_kobo';
  SELECT coalesce(value::integer, 50000000) INTO v_max_kobo
  FROM public.platform_settings WHERE key = 'max_job_amount_kobo';

  IF p_worker_pay_kobo < v_min_kobo OR p_worker_pay_kobo > v_max_kobo THEN
    RAISE EXCEPTION 'Worker pay must be between ₦% and ₦% per worker (§29, §66).',
      v_min_kobo / 100, v_max_kobo / 100;
  END IF;

  -- 5. Category-Specific Pay Bounds (§G)
  -- If min_pay_kobo is configured (NOT NULL), enforce as a hard block.
  -- If NULL, this check is gracefully skipped.
  SELECT name, min_pay_kobo, max_pay_kobo
  INTO v_cat_name, v_cat_min_kobo, v_cat_max_kobo
  FROM public.categories
  WHERE id = p_category_id;

  IF v_cat_name IS NULL THEN
    RAISE EXCEPTION 'Invalid category specified.';
  END IF;

  IF v_cat_min_kobo IS NOT NULL AND p_worker_pay_kobo < v_cat_min_kobo THEN
    RAISE EXCEPTION 'Worker pay of ₦% is below the required minimum wage floor for % (minimum: ₦%) (§G).',
      (p_worker_pay_kobo / 100), v_cat_name, (v_cat_min_kobo / 100);
  END IF;

  -- Check if proposed pay exceeds the soft warning ceiling
  IF v_cat_max_kobo IS NOT NULL AND p_worker_pay_kobo > v_cat_max_kobo THEN
    v_is_above_ceiling := true;
  END IF;

  -- 6. Calculate platform fee and total cost (§29, §40)
  SELECT coalesce(value::numeric, 10.0) INTO v_fee_pct
  FROM public.platform_settings WHERE key = 'platform_fee_percentage';

  v_subtotal_kobo := (p_worker_pay_kobo::bigint) * p_number_of_workers;
  v_platform_fee_kobo := round((v_subtotal_kobo * v_fee_pct) / 100.0);
  v_total_amount_kobo := (v_subtotal_kobo + v_platform_fee_kobo)::integer;

  -- 7. Insert job in 'draft' status
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

  -- 8. Record in job_status_history
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
    'Job draft created with wage bounds validation',
    jsonb_build_object(
      'worker_pay', p_worker_pay_kobo,
      'number_of_workers', p_number_of_workers,
      'platform_fee', v_platform_fee_kobo,
      'total_amount', v_total_amount_kobo,
      'above_category_ceiling', v_is_above_ceiling
    )
  );

  RETURN jsonb_build_object(
    'job_id', v_new_job_id,
    'public_job_id', v_public_id,
    'worker_pay_kobo', p_worker_pay_kobo,
    'number_of_workers', p_number_of_workers,
    'platform_fee_kobo', v_platform_fee_kobo,
    'total_amount_kobo', v_total_amount_kobo,
    'above_category_ceiling', v_is_above_ceiling,
    'status', 'draft'
  );
END;
$$;


-- ---------------------------------------------------------------------------
-- 10. UPDATED RPC: HIRE WORKER FOR JOB (Tiered Eligibility Verification §B)
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
  v_cat_tier public.verification_tier;
  v_cat_name text;
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

  -- 5. Tiered Verification Eligibility Check (§B.2, §B.3)
  SELECT verification_tier, name INTO v_cat_tier, v_cat_name
  FROM public.categories
  WHERE id = v_job.category_id;

  IF v_cat_tier = 'care' THEN
    -- Care-tier requires CARE_VERIFIED status
    IF NOT EXISTS (
      SELECT 1 FROM public.verification_records
      WHERE user_id = p_worker_id
        AND tier = 'care'
        AND status = 'verified'
        AND (category_id = v_job.category_id OR category_id IS NULL)
    ) THEN
      RAISE EXCEPTION 'Worker does not hold required CARE_VERIFIED status for % (§B.2).', v_cat_name;
    END IF;
  ELSIF v_cat_tier = 'technical_trade' THEN
    -- Technical-trade requires TECHNICAL_VERIFIED status (experience_verified or trade_test_certified)
    IF NOT EXISTS (
      SELECT 1 FROM public.verification_records
      WHERE user_id = p_worker_id
        AND tier = 'technical_trade'
        AND status = 'verified'
        AND (category_id = v_job.category_id OR category_id IS NULL)
    ) THEN
      RAISE EXCEPTION 'Worker does not hold required TECHNICAL_VERIFIED status for % (§B.3).', v_cat_name;
    END IF;
  END IF;

  -- 6. Backend verifies: worker not already assigned to this job (§35.5)
  IF EXISTS (
    SELECT 1 FROM public.job_workers
    WHERE job_id = p_job_id AND worker_id = p_worker_id
  ) THEN
    RAISE EXCEPTION 'Worker is already assigned or requested for this job (§35).';
  END IF;

  -- 7. Backend verifies: job capacity allows hiring
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

  -- 8. Create assignment in job_workers (§31)
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

  -- 9. Auto-create conversation for job messaging (§48)
  INSERT INTO public.conversations (
    job_id,
    employer_id,
    worker_id
  ) VALUES (
    p_job_id,
    v_user_id,
    p_worker_id
  )
  ON CONFLICT (job_id, worker_id) DO NOTHING
  RETURNING id INTO v_conv_id;

  -- 10. Update job status to 'requested'
  UPDATE public.jobs
  SET status = 'requested', updated_at = now()
  WHERE id = p_job_id;

  -- 11. Record in job_status_history (§33)
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
    'requested',
    v_user_id,
    'employer',
    'Worker requested for job',
    jsonb_build_object(
      'worker_id', p_worker_id,
      'assignment_id', v_assignment_id,
      'agreed_amount', v_worker_agreed_pay
    )
  );

  -- 12. Notify worker of hire request (§50)
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    metadata
  ) VALUES (
    p_worker_id,
    'Job Request: ' || v_job.title,
    'You have been requested for a job paying ₦' || (v_worker_agreed_pay / 100) || '. Review and accept.',
    jsonb_build_object(
      'job_id', p_job_id,
      'assignment_id', v_assignment_id,
      'agreed_amount', v_worker_agreed_pay
    )
  );

  RETURN v_assignment_id;
END;
$$;


-- ---------------------------------------------------------------------------
-- 11. RPC: SUBMIT CARE VERIFICATION (§B.2)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_care_verification(
  p_category_id uuid,
  p_police_cert_url text,
  p_references jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_cat_tier public.verification_tier;
  v_verification_id uuid;
  v_ref_count integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  -- Verify category is care tier
  SELECT verification_tier INTO v_cat_tier
  FROM public.categories
  WHERE id = p_category_id;

  IF v_cat_tier != 'care' THEN
    RAISE EXCEPTION 'Category is not a Care Services category (§B.2).';
  END IF;

  -- Validate police certificate URL
  IF p_police_cert_url IS NULL OR trim(p_police_cert_url) = '' THEN
    RAISE EXCEPTION 'Police Character Certificate is mandatory for Care verification (§B.2).';
  END IF;

  -- Validate at least two structured references
  v_ref_count := jsonb_array_length(coalesce(p_references, '[]'::jsonb));
  IF v_ref_count < 2 THEN
    RAISE EXCEPTION 'Minimum of two contactable references required for Care verification (received %) (§B.2).', v_ref_count;
  END IF;

  -- Insert verification record in 'pending' status (NO auto-progression per §B.2)
  INSERT INTO public.verification_records (
    user_id,
    category_id,
    verification_type,
    tier,
    document_type,
    document_url,
    references,
    status
  ) VALUES (
    v_user_id,
    p_category_id,
    'care_vetting',
    'care',
    'police_character_certificate',
    p_police_cert_url,
    p_references,
    'pending'
  )
  RETURNING id INTO v_verification_id;

  RETURN v_verification_id;
END;
$$;


-- ---------------------------------------------------------------------------
-- 12. RPC: SUBMIT TECHNICAL TRADE VERIFICATION (§B.3)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_technical_verification(
  p_category_id uuid,
  p_experience_years integer,
  p_portfolio_urls text[],
  p_certificate_type text DEFAULT NULL,
  p_certificate_grade text DEFAULT NULL,
  p_certificate_url text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_cat_tier public.verification_tier;
  v_verification_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  -- Verify category is technical_trade tier
  SELECT verification_tier INTO v_cat_tier
  FROM public.categories
  WHERE id = p_category_id;

  IF v_cat_tier != 'technical_trade' THEN
    RAISE EXCEPTION 'Category is not a Technical Trade category (§B.3).';
  END IF;

  -- Validate experience years and portfolio photo
  IF p_experience_years IS NULL OR p_experience_years < 0 THEN
    RAISE EXCEPTION 'Self-declared years of experience is required (§B.3).';
  END IF;

  IF p_portfolio_urls IS NULL OR array_length(p_portfolio_urls, 1) < 1 THEN
    RAISE EXCEPTION 'At least one photo/portfolio example of prior work is required (§B.3).';
  END IF;

  -- Insert verification record in 'pending' status
  INSERT INTO public.verification_records (
    user_id,
    category_id,
    verification_type,
    tier,
    document_type,
    document_url,
    experience_years,
    portfolio_urls,
    certificate_type,
    certificate_grade,
    status
  ) VALUES (
    v_user_id,
    p_category_id,
    'trade_credentials',
    'technical_trade',
    coalesce(p_certificate_type, 'work_portfolio'),
    p_certificate_url,
    p_experience_years,
    p_portfolio_urls,
    p_certificate_type,
    p_certificate_grade,
    'pending'
  )
  RETURNING id INTO v_verification_id;

  RETURN v_verification_id;
END;
$$;


-- ---------------------------------------------------------------------------
-- 13. RPC: REVIEW TIERED VERIFICATION (VERIFICATION_ADMIN only §B, §D)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.review_tiered_verification(
  p_verification_id uuid,
  p_action public.verification_action,
  p_rejection_reason text DEFAULT NULL,
  p_sub_status public.technical_sub_status DEFAULT NULL,
  p_references_outcome jsonb DEFAULT NULL
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
  v_assigned_sub_status public.technical_sub_status;
BEGIN
  -- 1. Check Verification Admin or Superadmin permission (§13)
  SELECT id INTO v_admin_id
  FROM public.admin_users
  WHERE user_id = auth.uid() AND status = 'active';

  IF v_admin_id IS NULL OR NOT (
    public.has_admin_permission('verification') OR public.is_superadmin()
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Verification Admin permission required (§13).';
  END IF;

  -- 2. Fetch submission record
  SELECT * INTO v_submission
  FROM public.verification_records
  WHERE id = p_verification_id;

  IF v_submission.id IS NULL THEN
    RAISE EXCEPTION 'Verification submission not found.';
  END IF;

  -- 3. Compute new status
  IF p_action = 'approve' THEN
    v_new_status := 'verified';
    IF v_submission.tier = 'technical_trade' THEN
      v_assigned_sub_status := coalesce(p_sub_status, 'experience_verified');
    END IF;
  ELSIF p_action = 'reject' THEN
    v_new_status := 'rejected';
  ELSE
    v_new_status := 'pending';
  END IF;

  -- 4. Update verification record
  UPDATE public.verification_records
  SET status = v_new_status,
      reviewer_id = v_admin_id,
      reviewed_at = now(),
      rejection_reason = p_rejection_reason,
      sub_status = coalesce(v_assigned_sub_status, sub_status),
      references = coalesce(p_references_outcome, references),
      updated_at = now()
  WHERE id = p_verification_id;

  -- 5. Audit log
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
    auth.uid(),
    CASE WHEN public.is_superadmin() THEN 'superadmin' ELSE 'admin' END,
    'verification.review_tiered',
    'verification_record',
    p_verification_id,
    jsonb_build_object('status', v_submission.status),
    jsonb_build_object('status', v_new_status, 'tier', v_submission.tier, 'sub_status', v_assigned_sub_status),
    p_rejection_reason
  );

  RETURN true;
END;
$$;


-- ---------------------------------------------------------------------------
-- 14. RPC: SET WORKER CATEGORIES (Multi-Category Selection §I)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_worker_categories(
  p_categories jsonb -- Array of { "category_id": uuid, "indicative_rate_kobo": number }
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_max_cats integer;
  v_cat_count integer;
  v_item jsonb;
  v_cat_id uuid;
  v_rate bigint;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  -- Fetch maximum categories platform setting (default 5 per §I)
  SELECT coalesce(value::integer, 5) INTO v_max_cats
  FROM public.platform_settings
  WHERE key = 'worker_max_categories';

  v_cat_count := jsonb_array_length(coalesce(p_categories, '[]'::jsonb));
  IF v_cat_count > v_max_cats THEN
    RAISE EXCEPTION 'Category limit exceeded: You may select a maximum of % categories (attempted %) (§I).',
      v_max_cats, v_cat_count;
  END IF;

  -- Delete existing categories
  DELETE FROM public.worker_categories WHERE worker_id = v_user_id;

  -- Insert new categories with per-category indicative rates
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_categories) LOOP
    v_cat_id := (v_item->>'category_id')::uuid;
    v_rate := coalesce((v_item->>'indicative_rate_kobo')::bigint, 0);

    IF EXISTS (SELECT 1 FROM public.categories WHERE id = v_cat_id AND is_active = true) THEN
      INSERT INTO public.worker_categories (
        worker_id,
        category_id,
        indicative_rate_kobo,
        added_at
      ) VALUES (
        v_user_id,
        v_cat_id,
        v_rate,
        now()
      )
      ON CONFLICT (worker_id, category_id) DO UPDATE SET
        indicative_rate_kobo = EXCLUDED.indicative_rate_kobo;
    END IF;
  END LOOP;

  RETURN true;
END;
$$;


-- ---------------------------------------------------------------------------
-- 15. RPC: ACKNOWLEDGE SAFETY SOS (§L)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.acknowledge_safety_sos(
  p_report_id uuid
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
  -- 1. Verify caller has Support Admin or Superadmin permission (§13, §49, §L)
  SELECT id INTO v_admin_id
  FROM public.admin_users
  WHERE user_id = auth.uid() AND status = 'active';

  IF v_admin_id IS NULL OR NOT (
    public.has_admin_permission('support') OR public.is_superadmin()
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Support Admin permission required to acknowledge SOS alerts (§L).';
  END IF;

  -- 2. Fetch and update safety report
  SELECT * INTO v_report
  FROM public.safety_reports
  WHERE id = p_report_id;

  IF v_report.id IS NULL THEN
    RAISE EXCEPTION 'Safety report not found.';
  END IF;

  UPDATE public.safety_reports
  SET acknowledged_at = now(),
      acknowledged_by = v_admin_id,
      updated_at = now()
  WHERE id = p_report_id;

  -- 3. Audit log the acknowledgment (§67, §L)
  INSERT INTO public.audit_logs (
    actor_id,
    actor_role,
    action,
    target_type,
    target_id,
    reason
  ) VALUES (
    auth.uid(),
    CASE WHEN public.is_superadmin() THEN 'superadmin' ELSE 'admin' END,
    'safety.sos_acknowledged',
    'safety_report',
    p_report_id,
    'Audible SOS alert explicitly acknowledged and silenced by Support Admin'
  );

  RETURN true;
END;
$$;

COMMENT ON FUNCTION public.acknowledge_safety_sos IS
  'Explicitly acknowledges and silences repeating audible SOS alert in Admin/Superadmin dashboard. §L';


-- ---------------------------------------------------------------------------
-- 16. RPC: UPDATE USER EMERGENCY CONTACT (§L)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_user_emergency_contact(
  p_emergency_contact jsonb
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
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  SELECT account_type INTO v_account_type
  FROM public.profiles
  WHERE id = v_user_id;

  IF v_account_type = 'worker' THEN
    UPDATE public.worker_profiles
    SET emergency_contact = p_emergency_contact, updated_at = now()
    WHERE id = v_user_id;
  ELSE
    UPDATE public.employer_profiles
    SET emergency_contact = p_emergency_contact, updated_at = now()
    WHERE id = v_user_id;
  END IF;

  RETURN true;
END;
$$;

COMMENT ON FUNCTION public.update_user_emergency_contact IS
  'Updates structured emergency contact details on worker or employer profile. §L';


-- ---------------------------------------------------------------------------
-- 17. RPC: GET ADMIN PAGINATED VERIFICATIONS (TIER-AWARE) (§B, §C, §61, §91)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_admin_paginated_verifications(
  p_status text DEFAULT 'pending',
  p_tier text DEFAULT NULL,
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
  WHERE (p_status IS NULL OR vr.status::text = p_status)
    AND (p_tier IS NULL OR vr.tier::text = p_tier);

  SELECT coalesce(jsonb_agg(r), '[]'::jsonb) INTO v_rows
  FROM (
    SELECT
      vr.id,
      vr.user_id,
      vr.verification_type,
      vr.document_type,
      vr.document_url,
      vr.tier,
      vr.category_id,
      c.name AS category_name,
      vr.sub_status,
      vr.references,
      vr.certificate_type,
      vr.certificate_grade,
      vr.experience_years,
      vr.portfolio_urls,
      vr.status,
      vr.rejection_reason,
      vr.created_at,
      vr.reviewed_at,
      p.full_name AS worker_name,
      p.phone AS worker_phone
    FROM public.verification_records vr
    JOIN public.profiles p ON p.id = vr.user_id
    LEFT JOIN public.categories c ON c.id = vr.category_id
    WHERE (p_status IS NULL OR vr.status::text = p_status)
      AND (p_tier IS NULL OR vr.tier::text = p_tier)
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
  'Server-side paginated queue for Verification Centre with tier filtering and full tiered fields. §B, §C, §61, §91';


-- ---------------------------------------------------------------------------
-- 18. RPC: GET ADMIN PAGINATED SAFETY REPORTS (SOS-AWARE) (§63, §91, §L)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_admin_paginated_safety_reports(
  p_status text DEFAULT 'open',
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
      sr.acknowledged_at,
      sr.acknowledged_by,
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
  'Server-side paginated queue for Safety Reports & SOS Centre with acknowledged_at tracking. §63, §91, §L';


