-- =============================================================================
-- MENIAL — FOUNDATION MIGRATION
-- =============================================================================
-- Migration: 00001_foundation.sql
-- Purpose:   Complete database schema for the Menial worker marketplace MVP
-- Reference: menial-master-spec-v2.md (Sections 4, 10-14, 17, 21-50, 66-70)
--
-- Rules enforced:
--   - All monetary values stored as INTEGER (kobo). 1 NGN = 100 kobo.
--   - Every monetary column has an explicit currency column defaulted to 'NGN'.
--   - Exactly ONE Superadmin enforced via partial unique index.
--   - ledger_entries and audit_logs are append-only (no UPDATE/DELETE).
--   - All tables have RLS enabled.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 0. EXTENSIONS
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "postgis";    -- geography type for proximity


-- ---------------------------------------------------------------------------
-- 1. ENUM TYPES
-- ---------------------------------------------------------------------------

-- §10: Marketplace user account type
CREATE TYPE user_account_type AS ENUM ('employer', 'worker');

-- §21: Marketplace account statuses
CREATE TYPE user_account_status AS ENUM ('active', 'suspended', 'deactivated');

-- §17: Admin account statuses
CREATE TYPE admin_status AS ENUM ('invited', 'active', 'suspended', 'deactivated');

-- §13: Admin permission keys
CREATE TYPE admin_permission_key AS ENUM (
  'operations', 'verification', 'support', 'finance', 'moderation'
);

-- §22, §25: Verification statuses
CREATE TYPE verification_status AS ENUM ('unverified', 'pending', 'verified', 'rejected');

-- §25: Verification reviewer actions
CREATE TYPE verification_action AS ENUM ('approve', 'reject', 'request_info');

-- §32: Job lifecycle statuses
CREATE TYPE job_status AS ENUM (
  'draft', 'posted', 'matching', 'requested', 'accepted',
  'payment_pending', 'payment_secured',
  'worker_on_way', 'worker_arrived', 'in_progress',
  'completed_by_worker', 'completed',
  'cancelled', 'disputed', 'payment_failed'
);

-- §31: Per-worker assignment status within a job
CREATE TYPE job_worker_status AS ENUM (
  'invited', 'requested', 'accepted', 'rejected',
  'on_way', 'arrived', 'in_progress', 'completed',
  'cancelled', 'no_show'
);

-- §39: Payment statuses
CREATE TYPE payment_status AS ENUM (
  'pending', 'successful', 'failed', 'cancelled', 'refunded', 'disputed'
);

-- §41: Payout statuses
CREATE TYPE payout_status_enum AS ENUM (
  'pending', 'processing', 'successful', 'failed', 'reversed'
);

-- §47: Dispute statuses
CREATE TYPE dispute_status AS ENUM (
  'open', 'under_review', 'waiting_for_information', 'resolved', 'closed'
);

-- §47: Dispute reason codes
CREATE TYPE dispute_reason AS ENUM (
  'worker_no_show', 'employer_no_show', 'incomplete_work',
  'inaccurate_description', 'payment_problem', 'safety_issue', 'other'
);

-- §44: Ledger entry types
CREATE TYPE ledger_entry_type AS ENUM (
  'payment', 'payout', 'refund', 'fee', 'cancellation_fee'
);

-- §49: Safety report statuses
CREATE TYPE safety_report_status AS ENUM (
  'open', 'assigned', 'under_review', 'resolved', 'closed'
);

-- §46: Rater/ratee type (used for ratings, messages, disputes, safety)
CREATE TYPE actor_party_type AS ENUM ('employer', 'worker');


-- ---------------------------------------------------------------------------
-- 2. HELPER FUNCTIONS (SECURITY DEFINER)
-- ---------------------------------------------------------------------------
-- These functions run with the privileges of the function creator (service role)
-- and are used inside RLS policies so marketplace users cannot tamper with
-- role lookups. §18, §73: "Do not trust role information supplied by the client."
-- ---------------------------------------------------------------------------

-- Check if current auth user has an active admin_users row
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = auth.uid()
      AND status = 'active'
  );
$$;

-- Check if current auth user is the active Superadmin
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = auth.uid()
      AND is_superadmin = true
      AND status = 'active'
  );
$$;

-- Check if current auth user holds a specific admin permission
CREATE OR REPLACE FUNCTION public.has_admin_permission(required_permission admin_permission_key)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users au
    JOIN public.admin_user_permissions aup ON aup.admin_user_id = au.id
    JOIN public.admin_permissions ap ON ap.id = aup.permission_id
    WHERE au.user_id = auth.uid()
      AND au.status = 'active'
      AND ap.permission_key = required_permission
  )
  OR public.is_superadmin();  -- Superadmin implicitly has all permissions
$$;

-- Get the account_type of the current marketplace user
CREATE OR REPLACE FUNCTION public.get_user_account_type()
RETURNS user_account_type
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT account_type FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$;


-- ---------------------------------------------------------------------------
-- 3A. CORE USER TABLES
-- ---------------------------------------------------------------------------

-- §21: Base user profile — extends Supabase auth.users
CREATE TABLE public.profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   text NOT NULL,
  phone       text NOT NULL,
  email       text,
  avatar_url  text,
  account_type user_account_type NOT NULL,
  status      user_account_status NOT NULL DEFAULT 'active',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_profiles_phone ON public.profiles (phone);
CREATE INDEX idx_profiles_account_type ON public.profiles (account_type);
CREATE INDEX idx_profiles_status ON public.profiles (status);

COMMENT ON TABLE public.profiles IS 'Base user profile for marketplace users (employers and workers). §21';


-- §22, §27, §28: Worker-specific profile
CREATE TABLE public.worker_profiles (
  id                  uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  bio                 text,
  indicative_rate     integer,  -- kobo
  currency            text NOT NULL DEFAULT 'NGN',
  rating_avg          numeric(3,2),
  completed_jobs_count integer NOT NULL DEFAULT 0,
  is_available        boolean NOT NULL DEFAULT false,
  service_radius_km   numeric(6,2),
  latitude            double precision,
  longitude           double precision,
  verification_status verification_status NOT NULL DEFAULT 'unverified',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

COMMENT ON COLUMN public.worker_profiles.indicative_rate IS 'Worker indicative rate in kobo (1 NGN = 100 kobo)';
COMMENT ON TABLE public.worker_profiles IS 'Worker-specific profile data. §22, §27';


-- §24: Employer-specific profile
CREATE TABLE public.employer_profiles (
  id              uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_name    text,
  is_business     boolean NOT NULL DEFAULT false,
  rating_avg      numeric(3,2),
  total_jobs_count integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.employer_profiles IS 'Employer-specific profile data. §24';


-- ---------------------------------------------------------------------------
-- 3B. ADMINISTRATIVE TABLES
-- ---------------------------------------------------------------------------

-- §68: Admin user accounts
CREATE TABLE public.admin_users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  is_superadmin boolean NOT NULL DEFAULT false,
  status        admin_status NOT NULL DEFAULT 'invited',
  created_by    uuid REFERENCES public.admin_users(id),
  mfa_enrolled  boolean NOT NULL DEFAULT false,
  last_login_at timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- §11, §20: EXACTLY ONE Superadmin — enforced at database level
CREATE UNIQUE INDEX idx_unique_superadmin
  ON public.admin_users (is_superadmin)
  WHERE is_superadmin = true;

COMMENT ON INDEX idx_unique_superadmin IS
  'Guarantees exactly one Superadmin row in the system. §11, §20';
COMMENT ON TABLE public.admin_users IS 'Administrative user accounts. §68';


-- §68: Permission definitions (seeded, not user-created)
CREATE TABLE public.admin_permissions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  permission_key  admin_permission_key NOT NULL UNIQUE,
  description     text NOT NULL
);

COMMENT ON TABLE public.admin_permissions IS 'Available admin permission types. §13, §68';


-- §68: Junction table — which admin holds which permissions
CREATE TABLE public.admin_user_permissions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id   uuid NOT NULL REFERENCES public.admin_users(id) ON DELETE CASCADE,
  permission_id   uuid NOT NULL REFERENCES public.admin_permissions(id) ON DELETE CASCADE,
  granted_by      uuid NOT NULL REFERENCES public.admin_users(id),
  granted_at      timestamptz NOT NULL DEFAULT now(),

  UNIQUE (admin_user_id, permission_id)
);

COMMENT ON TABLE public.admin_user_permissions IS 'Admin permission grants. §68';


-- §67: Immutable audit log — append-only, no UPDATE/DELETE
CREATE TABLE public.audit_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id        uuid NOT NULL,
  actor_role      text NOT NULL,           -- 'superadmin', 'admin', 'employer', 'worker', 'system'
  action          text NOT NULL,           -- e.g. 'admin.create', 'verification.approve'
  target_type     text,                    -- e.g. 'admin_user', 'job', 'payment'
  target_id       uuid,
  previous_state  jsonb,
  new_state       jsonb,
  reason          text,
  metadata        jsonb,
  ip_address      inet,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_actor ON public.audit_logs (actor_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs (action);
CREATE INDEX idx_audit_logs_target ON public.audit_logs (target_type, target_id);
CREATE INDEX idx_audit_logs_created ON public.audit_logs (created_at DESC);

COMMENT ON TABLE public.audit_logs IS 'Immutable audit log. Never UPDATE or DELETE. §67';


-- ---------------------------------------------------------------------------
-- 3C. CATEGORIES & WORKER-CATEGORY JUNCTION
-- ---------------------------------------------------------------------------

-- §26: Service categories (database-driven)
CREATE TABLE public.categories (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL UNIQUE,
  description   text,
  icon          text,                      -- icon identifier or URL
  is_active     boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.categories IS 'Service categories. Database-driven per §2, §26';

-- §22: Worker service category selections (many-to-many)
CREATE TABLE public.worker_categories (
  worker_id   uuid NOT NULL REFERENCES public.worker_profiles(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  PRIMARY KEY (worker_id, category_id)
);

COMMENT ON TABLE public.worker_categories IS 'Worker-to-category many-to-many. §22';


-- ---------------------------------------------------------------------------
-- 3D. JOB TABLES
-- ---------------------------------------------------------------------------

-- Sequence for human-readable public job IDs (MNL-00001, MNL-00002, ...)
CREATE SEQUENCE public.job_id_seq START WITH 1 INCREMENT BY 1;

-- §29, §30: Jobs table
CREATE TABLE public.jobs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_job_id     text NOT NULL UNIQUE,
  employer_id       uuid NOT NULL REFERENCES public.profiles(id),
  category_id       uuid NOT NULL REFERENCES public.categories(id),
  title             text NOT NULL,
  description       text,
  location_text     text NOT NULL,
  latitude          double precision,
  longitude         double precision,
  scheduled_date    date NOT NULL,
  start_time        time,
  duration_minutes  integer,
  number_of_workers integer NOT NULL DEFAULT 1 CHECK (number_of_workers >= 1),
  worker_pay        integer NOT NULL CHECK (worker_pay > 0),          -- kobo, per worker
  platform_fee      integer NOT NULL DEFAULT 0 CHECK (platform_fee >= 0), -- kobo
  total_amount      integer NOT NULL CHECK (total_amount > 0),        -- kobo
  currency          text NOT NULL DEFAULT 'NGN',
  status            job_status NOT NULL DEFAULT 'draft',
  cancellation_reason text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  completed_at      timestamptz,
  cancelled_at      timestamptz
);

CREATE INDEX idx_jobs_employer ON public.jobs (employer_id);
CREATE INDEX idx_jobs_category ON public.jobs (category_id);
CREATE INDEX idx_jobs_status ON public.jobs (status);
CREATE INDEX idx_jobs_scheduled ON public.jobs (scheduled_date, start_time);
CREATE INDEX idx_jobs_location ON public.jobs USING gist (
  ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

COMMENT ON COLUMN public.jobs.worker_pay IS 'Per-worker pay amount in kobo. §29: "proposed pay is a per-worker amount"';
COMMENT ON COLUMN public.jobs.platform_fee IS 'Platform fee in kobo. §40: never hard-code percentage';
COMMENT ON COLUMN public.jobs.total_amount IS 'Total in kobo = (worker_pay × number_of_workers) + platform_fee';
COMMENT ON TABLE public.jobs IS 'Job postings. §29, §30';


-- Function to auto-generate public_job_id on INSERT
-- Prefix is read from platform_settings (changeable by Superadmin)
CREATE OR REPLACE FUNCTION public.generate_public_job_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prefix text;
  seq_val bigint;
BEGIN
  -- Read prefix from platform_settings; default to 'MNL' if not set
  SELECT value INTO prefix
  FROM public.platform_settings
  WHERE key = 'job_id_prefix';

  IF prefix IS NULL THEN
    prefix := 'MNL';
  END IF;

  seq_val := nextval('public.job_id_seq');
  NEW.public_job_id := prefix || '-' || lpad(seq_val::text, 5, '0');
  RETURN NEW;
END;
$$;

-- NOTE: Trigger will be created AFTER platform_settings table is defined (see below)


-- §31: Multi-worker job assignments
CREATE TABLE public.job_workers (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id            uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  worker_id         uuid NOT NULL REFERENCES public.profiles(id),
  assignment_status job_worker_status NOT NULL DEFAULT 'invited',
  agreed_amount     integer NOT NULL CHECK (agreed_amount > 0),       -- kobo, per this worker
  currency          text NOT NULL DEFAULT 'NGN',
  assigned_at       timestamptz NOT NULL DEFAULT now(),
  accepted_at       timestamptz,
  arrived_at        timestamptz,
  started_at        timestamptz,
  completed_at      timestamptz,
  payout_status     payout_status_enum NOT NULL DEFAULT 'pending',

  UNIQUE (job_id, worker_id)
);

CREATE INDEX idx_job_workers_worker ON public.job_workers (worker_id);
CREATE INDEX idx_job_workers_status ON public.job_workers (assignment_status);

COMMENT ON COLUMN public.job_workers.agreed_amount IS 'This worker''s agreed pay in kobo. Defaults to job.worker_pay but can be individually adjusted. §29';
COMMENT ON TABLE public.job_workers IS 'Per-worker assignments within a job. §31';


-- §33: Job status history (append-only audit trail)
CREATE TABLE public.job_status_history (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id          uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  previous_status job_status,
  new_status      job_status NOT NULL,
  actor_id        uuid NOT NULL,
  actor_type      text NOT NULL,           -- 'employer', 'worker', 'admin', 'system'
  reason          text,
  metadata        jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_job_status_history_job ON public.job_status_history (job_id, created_at);

COMMENT ON TABLE public.job_status_history IS 'Immutable job status transitions. §33, §36';


-- ---------------------------------------------------------------------------
-- 3E. VERIFICATION TABLE
-- ---------------------------------------------------------------------------

-- §25: Verification records
CREATE TABLE public.verification_records (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  verification_type text NOT NULL,         -- 'phone', 'id_document' — configurable per §25
  document_type     text,                  -- 'nin', 'voters_card', 'drivers_license' etc.
  document_url      text,                  -- Supabase Storage path
  submitted_data    jsonb,
  status            verification_status NOT NULL DEFAULT 'pending',
  reviewer_id       uuid REFERENCES public.admin_users(id),
  reviewed_at       timestamptz,
  rejection_reason  text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_verification_user ON public.verification_records (user_id);
CREATE INDEX idx_verification_status ON public.verification_records (status);

COMMENT ON TABLE public.verification_records IS 'User verification submissions and decisions. §25';


-- ---------------------------------------------------------------------------
-- 3F. FINANCIAL TABLES
-- ---------------------------------------------------------------------------

-- §37, §38, §39: Payment records
CREATE TABLE public.payments (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id             uuid NOT NULL REFERENCES public.jobs(id),
  employer_id        uuid NOT NULL REFERENCES public.profiles(id),
  worker_amount      integer NOT NULL CHECK (worker_amount >= 0),      -- kobo
  platform_fee       integer NOT NULL CHECK (platform_fee >= 0),       -- kobo
  total_amount       integer NOT NULL CHECK (total_amount > 0),        -- kobo
  currency           text NOT NULL DEFAULT 'NGN',
  provider           text,                -- 'mock', 'paystack', 'flutterwave'
  provider_reference text,
  status             payment_status NOT NULL DEFAULT 'pending',
  metadata           jsonb,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_job ON public.payments (job_id);
CREATE INDEX idx_payments_employer ON public.payments (employer_id);
CREATE INDEX idx_payments_status ON public.payments (status);
CREATE INDEX idx_payments_provider_ref ON public.payments (provider_reference)
  WHERE provider_reference IS NOT NULL;

COMMENT ON COLUMN public.payments.worker_amount IS 'Total worker portion in kobo (worker_pay × number_of_workers)';
COMMENT ON TABLE public.payments IS 'Payment records. §37-§39';


-- §41: Payout records
CREATE TABLE public.payouts (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id          uuid NOT NULL REFERENCES public.profiles(id),
  job_id             uuid NOT NULL REFERENCES public.jobs(id),
  amount             integer NOT NULL CHECK (amount > 0),              -- kobo
  currency           text NOT NULL DEFAULT 'NGN',
  provider           text,
  provider_reference text,
  status             payout_status_enum NOT NULL DEFAULT 'pending',
  initiated_at       timestamptz NOT NULL DEFAULT now(),
  completed_at       timestamptz,
  failure_reason     text
);

CREATE INDEX idx_payouts_worker ON public.payouts (worker_id);
CREATE INDEX idx_payouts_job ON public.payouts (job_id);
CREATE INDEX idx_payouts_status ON public.payouts (status);

COMMENT ON COLUMN public.payouts.amount IS 'Payout amount in kobo';
COMMENT ON TABLE public.payouts IS 'Worker payout records. §41';


-- §44: Append-only ledger — SINGLE SOURCE OF TRUTH for reconciliation
CREATE TABLE public.ledger_entries (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  related_type  ledger_entry_type NOT NULL,
  related_id    uuid NOT NULL,
  job_id        uuid REFERENCES public.jobs(id),
  actor_id      uuid NOT NULL,             -- worker_id or employer_id
  amount        integer NOT NULL,          -- kobo, SIGNED: positive=credit, negative=debit
  currency      text NOT NULL DEFAULT 'NGN',
  description   text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ledger_actor ON public.ledger_entries (actor_id);
CREATE INDEX idx_ledger_job ON public.ledger_entries (job_id);
CREATE INDEX idx_ledger_type ON public.ledger_entries (related_type);
CREATE INDEX idx_ledger_created ON public.ledger_entries (created_at DESC);

COMMENT ON COLUMN public.ledger_entries.amount IS 'Signed kobo amount. Positive=credit, Negative=debit. §44';
COMMENT ON TABLE public.ledger_entries IS 'Append-only ledger. Never UPDATE or DELETE. §44';


-- ---------------------------------------------------------------------------
-- 3G. COMMUNICATION TABLES
-- ---------------------------------------------------------------------------

-- §48: Job-scoped conversations
CREATE TABLE public.conversations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id      uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  employer_id uuid NOT NULL REFERENCES public.profiles(id),
  worker_id   uuid NOT NULL REFERENCES public.profiles(id),
  created_at  timestamptz NOT NULL DEFAULT now(),

  UNIQUE (job_id, worker_id)
);

COMMENT ON TABLE public.conversations IS 'Job-scoped messaging conversations. §48';


-- §48: Messages within a conversation
CREATE TABLE public.messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id       uuid NOT NULL,
  sender_type     actor_party_type NOT NULL,
  body            text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  read_at         timestamptz
);

CREATE INDEX idx_messages_conversation ON public.messages (conversation_id, created_at);

COMMENT ON TABLE public.messages IS 'Messages within job conversations. Read-only after terminal job status. §48';


-- ---------------------------------------------------------------------------
-- 3H. RATINGS & DISPUTES
-- ---------------------------------------------------------------------------

-- §46: Ratings
CREATE TABLE public.ratings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id      uuid NOT NULL REFERENCES public.jobs(id),
  rater_id    uuid NOT NULL REFERENCES public.profiles(id),
  rater_type  actor_party_type NOT NULL,
  ratee_id    uuid NOT NULL REFERENCES public.profiles(id),
  ratee_type  actor_party_type NOT NULL,
  stars       smallint NOT NULL CHECK (stars >= 1 AND stars <= 5),
  review_text text,
  created_at  timestamptz NOT NULL DEFAULT now(),

  -- §46: "one rating per rater per job at the database level"
  UNIQUE (job_id, rater_id)
);

CREATE INDEX idx_ratings_ratee ON public.ratings (ratee_id);

COMMENT ON TABLE public.ratings IS 'User ratings. One per rater per job. §46';


-- §47: Disputes
CREATE TABLE public.disputes (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id            uuid NOT NULL REFERENCES public.jobs(id),
  filed_by_id       uuid NOT NULL REFERENCES public.profiles(id),
  filed_by_type     actor_party_type NOT NULL,
  reason            dispute_reason NOT NULL,
  description       text,
  status            dispute_status NOT NULL DEFAULT 'open',
  assigned_admin_id uuid REFERENCES public.admin_users(id),
  resolution_note   text,
  resolved_at       timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_disputes_job ON public.disputes (job_id);
CREATE INDEX idx_disputes_status ON public.disputes (status);
CREATE INDEX idx_disputes_admin ON public.disputes (assigned_admin_id)
  WHERE assigned_admin_id IS NOT NULL;

COMMENT ON TABLE public.disputes IS 'Job disputes. §47';


-- ---------------------------------------------------------------------------
-- 3I. SAFETY REPORTS
-- ---------------------------------------------------------------------------

-- §49: Safety reports — core MVP scope
CREATE TABLE public.safety_reports (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id            uuid NOT NULL REFERENCES public.jobs(id),
  reporter_id       uuid NOT NULL REFERENCES public.profiles(id),
  reporter_type     actor_party_type NOT NULL,
  description       text NOT NULL,
  location_text     text,
  latitude          double precision,
  longitude         double precision,
  status            safety_report_status NOT NULL DEFAULT 'open',
  assigned_admin_id uuid REFERENCES public.admin_users(id),
  resolution_note   text,
  resolved_by_id    uuid REFERENCES public.admin_users(id),
  resolved_at       timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_safety_reports_job ON public.safety_reports (job_id);
CREATE INDEX idx_safety_reports_status ON public.safety_reports (status);

COMMENT ON TABLE public.safety_reports IS 'SOS / safety reports. Cannot be silently closed. §49';


-- ---------------------------------------------------------------------------
-- 3J. NOTIFICATIONS
-- ---------------------------------------------------------------------------

-- §50: In-app notifications (architecture-ready for push/SMS/email)
CREATE TABLE public.notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       text NOT NULL,
  message     text NOT NULL,
  is_read     boolean NOT NULL DEFAULT false,
  metadata    jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON public.notifications (user_id, is_read, created_at DESC);

COMMENT ON TABLE public.notifications IS 'In-app notifications. §50';


-- ---------------------------------------------------------------------------
-- 3K. PLATFORM SETTINGS
-- ---------------------------------------------------------------------------

-- §66: Key-value platform configuration
CREATE TABLE public.platform_settings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key         text NOT NULL UNIQUE,
  value       text NOT NULL,
  description text,
  updated_by  uuid REFERENCES public.admin_users(id),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.platform_settings IS 'Platform configuration. Changes audited. Superadmin-only writes. §66';


-- Now create the trigger for public_job_id generation
-- (platform_settings table must exist before this trigger can read from it)
CREATE TRIGGER trg_generate_public_job_id
  BEFORE INSERT ON public.jobs
  FOR EACH ROW
  WHEN (NEW.public_job_id IS NULL OR NEW.public_job_id = '')
  EXECUTE FUNCTION public.generate_public_job_id();


-- ---------------------------------------------------------------------------
-- 4. UPDATED_AT TRIGGER FUNCTION
-- ---------------------------------------------------------------------------
-- Auto-update updated_at on any UPDATE to tables that have it.

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Apply to all tables with updated_at
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.worker_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.employer_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.admin_users
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.verification_records
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.disputes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.safety_reports
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ---------------------------------------------------------------------------
-- 5. ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;


-- ---------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY POLICIES
-- ---------------------------------------------------------------------------
-- Convention:
--   - Policies named: {table}_{action}_{who}
--   - Service-role/edge-function operations bypass RLS (supabase default)
--   - "Backend only" means no anon/authenticated policy; only service_role
-- ---------------------------------------------------------------------------

-- ======================== PROFILES ========================

-- Users can read their own profile
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- Admins can read all profiles (for user management)
CREATE POLICY profiles_select_admin ON public.profiles
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- Workers can see employer profiles for jobs they're involved with
CREATE POLICY profiles_select_job_parties ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT j.employer_id FROM public.jobs j
      JOIN public.job_workers jw ON jw.job_id = j.id
      WHERE jw.worker_id = auth.uid()
    )
    OR
    id IN (
      SELECT jw.worker_id FROM public.job_workers jw
      JOIN public.jobs j ON j.id = jw.job_id
      WHERE j.employer_id = auth.uid()
    )
  );

-- Users can insert their own profile on registration
CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- Users can update their own profile (limited fields enforced at API layer)
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Admins can update profiles (suspend/deactivate)
CREATE POLICY profiles_update_admin ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.has_admin_permission('operations'))
  WITH CHECK (public.has_admin_permission('operations'));


-- ======================== WORKER PROFILES ========================

-- Worker can read/update their own profile
CREATE POLICY worker_profiles_select_own ON public.worker_profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- Public discovery: anyone authenticated can see available workers
CREATE POLICY worker_profiles_select_discovery ON public.worker_profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = worker_profiles.id AND p.status = 'active')
  );

-- Admins can see all worker profiles
CREATE POLICY worker_profiles_select_admin ON public.worker_profiles
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- Worker creates their own profile
CREATE POLICY worker_profiles_insert_own ON public.worker_profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- Worker updates their own profile
CREATE POLICY worker_profiles_update_own ON public.worker_profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());


-- ======================== EMPLOYER PROFILES ========================

-- Employer reads own profile
CREATE POLICY employer_profiles_select_own ON public.employer_profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- Workers can see employer profiles (for job context)
CREATE POLICY employer_profiles_select_public ON public.employer_profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = employer_profiles.id AND p.status = 'active')
  );

-- Admins can see all
CREATE POLICY employer_profiles_select_admin ON public.employer_profiles
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- Employer creates own
CREATE POLICY employer_profiles_insert_own ON public.employer_profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- Employer updates own
CREATE POLICY employer_profiles_update_own ON public.employer_profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());


-- ======================== ADMIN USERS ========================

-- Superadmin sees all admin users
CREATE POLICY admin_users_select_superadmin ON public.admin_users
  FOR SELECT TO authenticated
  USING (public.is_superadmin());

-- Admin sees their own record
CREATE POLICY admin_users_select_own ON public.admin_users
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Only Superadmin can insert (create admin accounts). §12, §19
CREATE POLICY admin_users_insert_superadmin ON public.admin_users
  FOR INSERT TO authenticated
  WITH CHECK (public.is_superadmin());

-- Only Superadmin can update admin accounts (status, mfa, etc.)
CREATE POLICY admin_users_update_superadmin ON public.admin_users
  FOR UPDATE TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

-- NO DELETE policy — deactivate instead. §17


-- ======================== ADMIN PERMISSIONS ========================

-- All admins can read permission definitions
CREATE POLICY admin_permissions_select_admin ON public.admin_permissions
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- No INSERT/UPDATE/DELETE — these are seeded. Changes require migration.


-- ======================== ADMIN USER PERMISSIONS ========================

-- Superadmin sees all grants
CREATE POLICY admin_user_perms_select_superadmin ON public.admin_user_permissions
  FOR SELECT TO authenticated
  USING (public.is_superadmin());

-- Admin sees their own grants
CREATE POLICY admin_user_perms_select_own ON public.admin_user_permissions
  FOR SELECT TO authenticated
  USING (
    admin_user_id IN (
      SELECT id FROM public.admin_users WHERE user_id = auth.uid()
    )
  );

-- Only Superadmin can grant permissions. §13, §19
CREATE POLICY admin_user_perms_insert_superadmin ON public.admin_user_permissions
  FOR INSERT TO authenticated
  WITH CHECK (public.is_superadmin());

-- Only Superadmin can revoke permissions
CREATE POLICY admin_user_perms_delete_superadmin ON public.admin_user_permissions
  FOR DELETE TO authenticated
  USING (public.is_superadmin());


-- ======================== AUDIT LOGS ========================
-- §67: Admins must not silently modify/delete audit history

-- Superadmin can read all audit logs
CREATE POLICY audit_logs_select_superadmin ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.is_superadmin());

-- Admins with appropriate permissions can read audit logs
CREATE POLICY audit_logs_select_admin ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- INSERT: only via service_role (backend/edge functions). No authenticated INSERT.
-- UPDATE: DENIED — no policy means denied by default with RLS on
-- DELETE: DENIED — no policy means denied by default with RLS on


-- ======================== CATEGORIES ========================

-- Anyone authenticated can read active categories
CREATE POLICY categories_select_active ON public.categories
  FOR SELECT TO authenticated
  USING (is_active = true);

-- Admins can read all categories (including inactive)
CREATE POLICY categories_select_admin ON public.categories
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- Operations Admin or Superadmin can manage categories. §64
CREATE POLICY categories_insert_admin ON public.categories
  FOR INSERT TO authenticated
  WITH CHECK (public.has_admin_permission('operations'));

CREATE POLICY categories_update_admin ON public.categories
  FOR UPDATE TO authenticated
  USING (public.has_admin_permission('operations'))
  WITH CHECK (public.has_admin_permission('operations'));

-- No DELETE — deactivate instead


-- ======================== WORKER CATEGORIES ========================

-- Worker manages their own category selections
CREATE POLICY worker_categories_select_own ON public.worker_categories
  FOR SELECT TO authenticated
  USING (worker_id = auth.uid());

-- Public: used for worker discovery
CREATE POLICY worker_categories_select_public ON public.worker_categories
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY worker_categories_insert_own ON public.worker_categories
  FOR INSERT TO authenticated
  WITH CHECK (worker_id = auth.uid());

CREATE POLICY worker_categories_delete_own ON public.worker_categories
  FOR DELETE TO authenticated
  USING (worker_id = auth.uid());


-- ======================== JOBS ========================

-- Employer sees their own jobs
CREATE POLICY jobs_select_employer ON public.jobs
  FOR SELECT TO authenticated
  USING (employer_id = auth.uid());

-- Workers can see posted/matching jobs for discovery
CREATE POLICY jobs_select_discovery ON public.jobs
  FOR SELECT TO authenticated
  USING (status IN ('posted', 'matching'));

-- Workers can see jobs they're assigned to
CREATE POLICY jobs_select_assigned_worker ON public.jobs
  FOR SELECT TO authenticated
  USING (
    id IN (SELECT job_id FROM public.job_workers WHERE worker_id = auth.uid())
  );

-- Admins see all jobs
CREATE POLICY jobs_select_admin ON public.jobs
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- Only employers can create jobs (draft). §29
CREATE POLICY jobs_insert_employer ON public.jobs
  FOR INSERT TO authenticated
  WITH CHECK (
    employer_id = auth.uid()
    AND public.get_user_account_type() = 'employer'
  );

-- Employer can update own jobs (limited — status transitions via backend)
CREATE POLICY jobs_update_employer ON public.jobs
  FOR UPDATE TO authenticated
  USING (employer_id = auth.uid())
  WITH CHECK (employer_id = auth.uid());

-- Admins can update jobs (intervention). §58
CREATE POLICY jobs_update_admin ON public.jobs
  FOR UPDATE TO authenticated
  USING (public.has_admin_permission('operations'))
  WITH CHECK (public.has_admin_permission('operations'));


-- ======================== JOB WORKERS ========================

-- Workers see their own assignments
CREATE POLICY job_workers_select_worker ON public.job_workers
  FOR SELECT TO authenticated
  USING (worker_id = auth.uid());

-- Employers see workers assigned to their jobs
CREATE POLICY job_workers_select_employer ON public.job_workers
  FOR SELECT TO authenticated
  USING (
    job_id IN (SELECT id FROM public.jobs WHERE employer_id = auth.uid())
  );

-- Admins see all
CREATE POLICY job_workers_select_admin ON public.job_workers
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- INSERT/UPDATE: service_role only (backend controls assignments). §35


-- ======================== JOB STATUS HISTORY ========================

-- Job parties can see history for their jobs
CREATE POLICY job_status_history_select_parties ON public.job_status_history
  FOR SELECT TO authenticated
  USING (
    job_id IN (SELECT id FROM public.jobs WHERE employer_id = auth.uid())
    OR job_id IN (SELECT job_id FROM public.job_workers WHERE worker_id = auth.uid())
  );

-- Admins see all
CREATE POLICY job_status_history_select_admin ON public.job_status_history
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- INSERT: service_role only (backend writes status history). §33


-- ======================== VERIFICATION RECORDS ========================

-- Users see their own verification records
CREATE POLICY verification_select_own ON public.verification_records
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Verification Admins see all
CREATE POLICY verification_select_admin ON public.verification_records
  FOR SELECT TO authenticated
  USING (public.has_admin_permission('verification'));

-- Users can submit verification requests
CREATE POLICY verification_insert_own ON public.verification_records
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Verification Admins can update (approve/reject). §25
CREATE POLICY verification_update_admin ON public.verification_records
  FOR UPDATE TO authenticated
  USING (public.has_admin_permission('verification'))
  WITH CHECK (public.has_admin_permission('verification'));


-- ======================== PAYMENTS ========================

-- Employer sees payments for their jobs
CREATE POLICY payments_select_employer ON public.payments
  FOR SELECT TO authenticated
  USING (employer_id = auth.uid());

-- Workers see payments for jobs they're assigned to
CREATE POLICY payments_select_worker ON public.payments
  FOR SELECT TO authenticated
  USING (
    job_id IN (SELECT job_id FROM public.job_workers WHERE worker_id = auth.uid())
  );

-- Finance Admin sees all payments
CREATE POLICY payments_select_finance ON public.payments
  FOR SELECT TO authenticated
  USING (public.has_admin_permission('finance'));

-- INSERT/UPDATE: service_role only. §37: "Client cannot set payment success"


-- ======================== PAYOUTS ========================

-- Worker sees their own payouts
CREATE POLICY payouts_select_worker ON public.payouts
  FOR SELECT TO authenticated
  USING (worker_id = auth.uid());

-- Finance Admin sees all
CREATE POLICY payouts_select_finance ON public.payouts
  FOR SELECT TO authenticated
  USING (public.has_admin_permission('finance'));

-- INSERT/UPDATE: service_role only


-- ======================== LEDGER ENTRIES ========================
-- §44: APPEND-ONLY. Never updated or deleted.

-- Actor (worker or employer) can read their own entries
CREATE POLICY ledger_select_own ON public.ledger_entries
  FOR SELECT TO authenticated
  USING (actor_id = auth.uid());

-- Finance Admin reads all
CREATE POLICY ledger_select_finance ON public.ledger_entries
  FOR SELECT TO authenticated
  USING (public.has_admin_permission('finance'));

-- INSERT: service_role only
-- UPDATE: DENIED (no policy = denied with RLS enabled)
-- DELETE: DENIED (no policy = denied with RLS enabled)


-- ======================== CONVERSATIONS ========================

-- Participants can see their conversations
CREATE POLICY conversations_select_parties ON public.conversations
  FOR SELECT TO authenticated
  USING (employer_id = auth.uid() OR worker_id = auth.uid());

-- Support Admin can see conversations (for dispute/safety review)
CREATE POLICY conversations_select_support ON public.conversations
  FOR SELECT TO authenticated
  USING (public.has_admin_permission('support'));

-- INSERT: service_role only (created on first message)


-- ======================== MESSAGES ========================

-- Conversation participants can read messages
CREATE POLICY messages_select_parties ON public.messages
  FOR SELECT TO authenticated
  USING (
    conversation_id IN (
      SELECT id FROM public.conversations
      WHERE employer_id = auth.uid() OR worker_id = auth.uid()
    )
  );

-- Support Admin can read
CREATE POLICY messages_select_support ON public.messages
  FOR SELECT TO authenticated
  USING (public.has_admin_permission('support'));

-- Participants can send messages (if job is active — enforced at API layer)
CREATE POLICY messages_insert_parties ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND conversation_id IN (
      SELECT id FROM public.conversations
      WHERE employer_id = auth.uid() OR worker_id = auth.uid()
    )
  );

-- Only recipient can mark as read (update read_at)
CREATE POLICY messages_update_read ON public.messages
  FOR UPDATE TO authenticated
  USING (
    sender_id != auth.uid()
    AND conversation_id IN (
      SELECT id FROM public.conversations
      WHERE employer_id = auth.uid() OR worker_id = auth.uid()
    )
  );


-- ======================== RATINGS ========================

-- Public read: anyone can see ratings (for worker/employer discovery)
CREATE POLICY ratings_select_public ON public.ratings
  FOR SELECT TO authenticated
  USING (true);

-- Job participants can create ratings after completion. §46
CREATE POLICY ratings_insert_parties ON public.ratings
  FOR INSERT TO authenticated
  WITH CHECK (
    rater_id = auth.uid()
    AND job_id IN (
      SELECT id FROM public.jobs WHERE status = 'completed'
        AND (employer_id = auth.uid() OR id IN (
          SELECT job_id FROM public.job_workers WHERE worker_id = auth.uid()
        ))
    )
  );

-- Moderation Admin can delete inappropriate reviews. §63
CREATE POLICY ratings_delete_moderation ON public.ratings
  FOR DELETE TO authenticated
  USING (public.has_admin_permission('moderation'));


-- ======================== DISPUTES ========================

-- Filed-by user sees their disputes
CREATE POLICY disputes_select_filer ON public.disputes
  FOR SELECT TO authenticated
  USING (filed_by_id = auth.uid());

-- Other job party can also see the dispute
CREATE POLICY disputes_select_job_party ON public.disputes
  FOR SELECT TO authenticated
  USING (
    job_id IN (
      SELECT id FROM public.jobs WHERE employer_id = auth.uid()
      UNION
      SELECT job_id FROM public.job_workers WHERE worker_id = auth.uid()
    )
  );

-- Support Admin sees all
CREATE POLICY disputes_select_support ON public.disputes
  FOR SELECT TO authenticated
  USING (public.has_admin_permission('support'));

-- Job participants can file disputes
CREATE POLICY disputes_insert_parties ON public.disputes
  FOR INSERT TO authenticated
  WITH CHECK (
    filed_by_id = auth.uid()
    AND job_id IN (
      SELECT id FROM public.jobs WHERE employer_id = auth.uid()
      UNION
      SELECT job_id FROM public.job_workers WHERE worker_id = auth.uid()
    )
  );

-- Support Admin can update disputes (status, assignment, resolution). §47
CREATE POLICY disputes_update_support ON public.disputes
  FOR UPDATE TO authenticated
  USING (public.has_admin_permission('support'))
  WITH CHECK (public.has_admin_permission('support'));


-- ======================== SAFETY REPORTS ========================

-- Reporter sees their own reports
CREATE POLICY safety_reports_select_reporter ON public.safety_reports
  FOR SELECT TO authenticated
  USING (reporter_id = auth.uid());

-- Support Admin sees all. §49
CREATE POLICY safety_reports_select_support ON public.safety_reports
  FOR SELECT TO authenticated
  USING (public.has_admin_permission('support'));

-- Superadmin sees all
CREATE POLICY safety_reports_select_superadmin ON public.safety_reports
  FOR SELECT TO authenticated
  USING (public.is_superadmin());

-- Job participants can file safety reports
CREATE POLICY safety_reports_insert_parties ON public.safety_reports
  FOR INSERT TO authenticated
  WITH CHECK (
    reporter_id = auth.uid()
    AND job_id IN (
      SELECT id FROM public.jobs WHERE employer_id = auth.uid()
      UNION
      SELECT job_id FROM public.job_workers WHERE worker_id = auth.uid()
    )
  );

-- Only Support Admin can update (assign, resolve). §49: cannot be silently closed
CREATE POLICY safety_reports_update_support ON public.safety_reports
  FOR UPDATE TO authenticated
  USING (public.has_admin_permission('support'))
  WITH CHECK (public.has_admin_permission('support'));


-- ======================== NOTIFICATIONS ========================

-- Users see their own notifications
CREATE POLICY notifications_select_own ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Users can mark their own notifications as read
CREATE POLICY notifications_update_own ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- INSERT: service_role only (backend creates notifications)


-- ======================== PLATFORM SETTINGS ========================

-- All admins can read settings
CREATE POLICY platform_settings_select_admin ON public.platform_settings
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- Only Superadmin can insert/update. §66
CREATE POLICY platform_settings_insert_superadmin ON public.platform_settings
  FOR INSERT TO authenticated
  WITH CHECK (public.is_superadmin());

CREATE POLICY platform_settings_update_superadmin ON public.platform_settings
  FOR UPDATE TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

-- No DELETE


-- ---------------------------------------------------------------------------
-- 7. PREVENT UPDATE/DELETE ON APPEND-ONLY TABLES VIA TRIGGERS
-- ---------------------------------------------------------------------------
-- RLS denies these for authenticated users, but as defense-in-depth
-- we also add triggers that abort even service_role attempts.

CREATE OR REPLACE FUNCTION public.prevent_modify()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'This table is append-only. % operations are not permitted.', TG_OP;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_ledger_no_update
  BEFORE UPDATE ON public.ledger_entries
  FOR EACH ROW EXECUTE FUNCTION public.prevent_modify();

CREATE TRIGGER trg_ledger_no_delete
  BEFORE DELETE ON public.ledger_entries
  FOR EACH ROW EXECUTE FUNCTION public.prevent_modify();

CREATE TRIGGER trg_audit_no_update
  BEFORE UPDATE ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.prevent_modify();

CREATE TRIGGER trg_audit_no_delete
  BEFORE DELETE ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.prevent_modify();


-- ---------------------------------------------------------------------------
-- END OF FOUNDATION MIGRATION
-- ---------------------------------------------------------------------------
