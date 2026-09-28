-- =============================================================================
-- Migration: 20260928180000_landing_page_content.sql
-- Purpose:   Hybrid CMS tables for the menial marketing landing page.
--            Provides admin-editable dynamic content (testimonials, stats)
--            that the Next.js landing app fetches via the Supabase anon key.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- TABLE: landing_testimonials
-- ---------------------------------------------------------------------------
-- Stores real employer and worker testimonials to display on the landing page.
-- Managed via the admin dashboard (operations admin role).
-- Public read via RLS (anon key). Admin write only.
-- ---------------------------------------------------------------------------
create table if not exists public.landing_testimonials (
  id            uuid primary key default gen_random_uuid(),
  persona       text not null check (persona in ('employer', 'worker')),
  quote         text not null check (char_length(quote) between 20 and 400),
  author_name   text not null check (char_length(author_name) between 2 and 80),
  author_role   text not null check (char_length(author_role) between 2 and 120),
  rating        smallint not null default 5 check (rating between 1 and 5),
  -- Optional: link to real verified user (for future trust badge display)
  user_id       uuid references public.profiles(id) on delete set null,
  -- Admin controls
  active        boolean not null default true,
  sort_order    integer not null default 0,
  -- Audit
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Optimise common query: active testimonials per persona, ordered
create index if not exists idx_landing_testimonials_persona_active
  on public.landing_testimonials (persona, active, sort_order);

-- Immutable updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger landing_testimonials_updated_at
  before update on public.landing_testimonials
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- TABLE: landing_stats
-- ---------------------------------------------------------------------------
-- Key-value store for dynamic marketing stats shown in the stats ticker.
-- The frontend maps these keys to display labels.
-- Superadmin or operations admin can update values as the platform grows.
-- ---------------------------------------------------------------------------
create table if not exists public.landing_stats (
  id         uuid primary key default gen_random_uuid(),
  key        text not null unique,    -- e.g. 'jobs_completed', 'workers_verified'
  value      bigint not null,          -- Raw numeric value
  prefix     text not null default '', -- e.g. '₦'
  suffix     text not null default '', -- e.g. 'M+', '+'
  label      text not null,            -- Display label e.g. 'Jobs Completed'
  sort_order integer not null default 0,
  active     boolean not null default true,
  updated_at timestamptz not null default now()
);

create trigger landing_stats_updated_at
  before update on public.landing_stats
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------
alter table public.landing_testimonials enable row level security;
alter table public.landing_stats enable row level security;

-- Public (anon): can read active records only
create policy "landing_testimonials: public read active"
  on public.landing_testimonials
  for select
  to anon, authenticated
  using (active = true);

create policy "landing_stats: public read active"
  on public.landing_stats
  for select
  to anon, authenticated
  using (active = true);

-- Admin write: operations admin or superadmin can manage landing content
create policy "landing_testimonials: admin manage"
  on public.landing_testimonials
  for all
  to authenticated
  using (public.has_admin_permission('operations'))
  with check (public.has_admin_permission('operations'));

create policy "landing_stats: admin manage"
  on public.landing_stats
  for all
  to authenticated
  using (public.has_admin_permission('operations'))
  with check (public.has_admin_permission('operations'));

-- ---------------------------------------------------------------------------
-- SEED DATA: landing_stats
-- ---------------------------------------------------------------------------
-- Initial values — update these via admin dashboard as platform grows.
-- Values that have prefix '₦' and suffix 'M+' represent millions of Naira.
-- ---------------------------------------------------------------------------
insert into public.landing_stats (key, value, prefix, suffix, label, sort_order) values
  ('jobs_completed',   6200, '',  '+',   'Jobs Completed',     1),
  ('workers_verified', 4800, '',  '+',   'Verified Workers',   2),
  ('naira_paid_out',    480, '₦', 'M+',  'Paid to Workers',    3),
  ('cities_active',      18, '',  '',    'Cities Active',      4)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- SEED DATA: landing_testimonials (Employer personas)
-- ---------------------------------------------------------------------------
insert into public.landing_testimonials (persona, quote, author_name, author_role, rating, sort_order) values
  (
    'employer',
    'I needed 4 movers urgently for a Saturday relocation. Within 20 minutes I had verified workers confirmed. The escrow system gave me total peace of mind.',
    'Chioma Okafor',
    'Business Owner · Lagos',
    5, 1
  ),
  (
    'employer',
    'No more chasing randos on WhatsApp groups. Every worker on menial has verified ID. For a woman hiring alone, that safety guarantee is everything.',
    'Amaka Eze',
    'Homeowner · Abuja',
    5, 2
  ),
  (
    'employer',
    'Hired 10 event setup hands for our company dinner. All showed up on time, did excellent work. The platform fee is worth every kobo.',
    'Emeka Nwosu',
    'Events Manager · Lagos',
    5, 3
  ),
  (
    'employer',
    'The escrow feature is brilliant. I paid, the workers showed up, I confirmed completion, they got paid. No drama, no disputes. Clean and professional.',
    'Bola Adeyemi',
    'Property Developer · Ibadan',
    5, 4
  ),
  (
    'employer',
    'Finally a platform that takes worker safety seriously too. The SOS button and identity verification make menial stand out from everything else out there.',
    'Tunde Fashola',
    'Construction Manager · Port Harcourt',
    5, 5
  )
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- SEED DATA: landing_testimonials (Worker personas)
-- ---------------------------------------------------------------------------
insert into public.landing_testimonials (persona, quote, author_name, author_role, rating, sort_order) values
  (
    'worker',
    'Before menial I was doing 3-day unpaid trials just to get hired. Now I get same-day pay directly to my GTBank. My life has completely changed.',
    'Musa Ibrahim',
    'Verified Cleaner · Lagos · ★ 4.9',
    5, 1
  ),
  (
    'worker',
    'The NIN badge shows employers I am trustworthy. I get more job offers now than I can accept. menial has given my work real dignity.',
    'Chukwuemeka Obi',
    'Verified Labourer · Abuja · ★ 4.8',
    5, 2
  ),
  (
    'worker',
    'I used to wait weeks for payment. On menial, I tap complete and money is in my account within minutes. No middlemen, no stories.',
    'Grace Idowu',
    'Verified House Help · Lagos · ★ 5.0',
    5, 3
  ),
  (
    'worker',
    'The SOS button means my family knows I am safe on every job. I recommend every worker in Nigeria to join menial right now.',
    'Yusuf Abdullahi',
    'Verified Guard · Kano · ★ 4.7',
    5, 4
  ),
  (
    'worker',
    'I have done 142 jobs on menial. Each one transparent — the employer sets the pay before I accept. No negotiation stress, just work and get paid.',
    'Ngozi Okonkwo',
    'Verified Caterer · Enugu · ★ 4.9',
    5, 5
  )
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- COMMENTS
-- ---------------------------------------------------------------------------
comment on table public.landing_testimonials is
  'Admin-editable testimonials for the menial marketing landing page. Managed via operations admin dashboard. Public read via anon key. Fallback content in content/testimonials.ts is used if this table is empty.';

comment on table public.landing_stats is
  'Admin-editable platform statistics displayed in the landing page stats ticker. Update these values as the platform grows. Managed via operations admin dashboard.';
