-- =============================================================================
-- MENIAL — DEVELOPMENT SEED DATA
-- =============================================================================
-- Reference: menial-master-spec-v2.md §26, §13, §66, §82
--
-- WARNING: This is development seed data ONLY. Never commit production
-- credentials or Superadmin accounts in seed files. §82, §83
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1. CATEGORIES (§26)
-- ---------------------------------------------------------------------------
-- "Seed: Cleaning, Moving, Loading, Gardening, Laundry, Construction,
--  Event Helper, Domestic Help, Errands, Car Wash, General Labour,
--  Packing/Unpacking, Other."
-- "Fields: ID, name, description, icon, active, display order, timestamps."
-- ---------------------------------------------------------------------------

INSERT INTO public.categories (name, description, icon, is_active, display_order) VALUES
  ('Cleaning',           'House cleaning, office cleaning, deep cleaning',            'cleaning',           true,  1),
  ('Moving',             'Furniture moving, house moving, office relocation',          'moving',             true,  2),
  ('Loading',            'Loading and unloading goods, trucks, containers',            'loading',            true,  3),
  ('Gardening',          'Garden maintenance, landscaping, lawn care',                 'gardening',          true,  4),
  ('Laundry',            'Washing, ironing, dry cleaning pickup/delivery',             'laundry',            true,  5),
  ('Construction',       'Construction work, general building labour',                 'construction',       true,  6),
  ('Event Helper',       'Event setup, catering assistance, event support',            'event_helper',       true,  7),
  ('Domestic Help',      'Household chores, cooking, childcare assistance',            'domestic_help',      true,  8),
  ('Errands',            'Shopping, deliveries, personal errands',                     'errands',            true,  9),
  ('Car Wash',           'Vehicle washing, interior cleaning, detailing',              'car_wash',           true, 10),
  ('General Labour',     'Miscellaneous physical labour tasks',                        'general_labour',     true, 11),
  ('Packing/Unpacking',  'Packing goods, unpacking at destination, organizing',        'packing',            true, 12),
  ('Other',              'Services not covered by other categories',                   'other',              true, 13)
ON CONFLICT (name) DO NOTHING;


-- ---------------------------------------------------------------------------
-- 2. ADMIN PERMISSIONS (§13, §68)
-- ---------------------------------------------------------------------------
-- "Suggested administrative roles: OPERATIONS_ADMIN, VERIFICATION_ADMIN,
--  SUPPORT_ADMIN, FINANCE_ADMIN, MODERATION_ADMIN"
-- ---------------------------------------------------------------------------

INSERT INTO public.admin_permissions (permission_key, description) VALUES
  ('operations',    'Can manage: users, jobs, workers, employers, operational issues'),
  ('verification',  'Can manage: verification submissions, decisions, requests for additional information'),
  ('support',       'Can manage: support cases, disputes, reports, user support actions, safety reports/SOS events'),
  ('finance',       'Can access: payments, payouts, transaction/ledger records, financial operational actions'),
  ('moderation',    'Can manage: reports, reviews, inappropriate content, moderation actions')
ON CONFLICT (permission_key) DO NOTHING;


-- ---------------------------------------------------------------------------
-- 3. PLATFORM SETTINGS (§66)
-- ---------------------------------------------------------------------------
-- "Potential configuration: platform fee, cancellation rules, minimum job
--  amount, maximum job amount, verification requirements, supported locations,
--  payout settings, currency"
--
-- Default platform fee: 10% (user-specified)
-- Job ID prefix: MNL (user-specified, Superadmin-changeable only)
-- Cancellation window: 2 hours before scheduled start (§36)
-- Session expiry: 12 hours idle (§23)
-- ---------------------------------------------------------------------------

INSERT INTO public.platform_settings (key, value, description) VALUES
  ('platform_fee_percentage',   '10',    'Platform fee percentage applied to each job. Applied as: fee = (worker_pay × number_of_workers) × (percentage / 100). Superadmin-only.'),
  ('job_id_prefix',             'MNL',   'Prefix for human-readable public job IDs (e.g., MNL-00001). Superadmin-only.'),
  ('cancellation_window_hours', '2',     'Hours before scheduled start time during which employer can cancel free of charge. §36'),
  ('cancellation_fee_kobo',     '0',     'Cancellation fee in kobo charged when employer cancels inside the window. 0 by default until policy decided. §36'),
  ('min_job_amount_kobo',       '50000', 'Minimum per-worker job pay in kobo (₦500). Prevents spam/trivial listings.'),
  ('max_job_amount_kobo',       '50000000', 'Maximum per-worker job pay in kobo (₦500,000). Safety cap.'),
  ('session_expiry_hours',      '12',    'Admin/Superadmin session idle timeout in hours before re-authentication required. §23'),
  ('currency',                  'NGN',   'Platform operating currency. Fixed to NGN for MVP. §4')
ON CONFLICT (key) DO NOTHING;


-- ---------------------------------------------------------------------------
-- END OF SEED DATA
-- ---------------------------------------------------------------------------
-- NOTE: §82 says seed data should also include dev users, jobs, payments etc.
-- Those will be added in later phases when the auth flow and job engine exist,
-- because they depend on auth.users records that can't be seeded via raw SQL
-- without the Supabase Auth API.
-- ---------------------------------------------------------------------------
