# Menial — Architecture Overview

> Reference: [menial-master-spec-v2.md](file:///c:/Projects/menial/menial-master-spec-v2.md)

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         MENIAL PLATFORM                             │
├────────────────────────────────┬────────────────────────────────────┤
│       MOBILE APPLICATION       │         WEB DASHBOARDS             │
│  (React Native / Expo / TS)    │     (Next.js / TypeScript)         │
│                                │                                    │
│  ┌──────────┐  ┌──────────┐   │   ┌────────────┐  ┌────────────┐  │
│  │ Employer  │  │  Worker  │   │   │   Admin    │  │ Superadmin │  │
│  │   App     │  │   App    │   │   │ Dashboard  │  │ Dashboard  │  │
│  └──────────┘  └──────────┘   │   └────────────┘  └────────────┘  │
├────────────────────────────────┴────────────────────────────────────┤
│                        SHARED TYPES (TypeScript)                    │
├─────────────────────────────────────────────────────────────────────┤
│                    SUPABASE BACKEND (Single Instance)                │
│  ┌──────────┐ ┌───────┐ ┌─────────┐ ┌─────────┐ ┌──────────────┐  │
│  │   Auth   │ │  RLS  │ │ Storage │ │Realtime │ │Edge Functions│  │
│  │(Phone OTP)│ │Policies│ │ (Files) │ │(Selective)│(Business Logic)│  │
│  └──────────┘ └───────┘ └─────────┘ └─────────┘ └──────────────┘  │
├─────────────────────────────────────────────────────────────────────┤
│                     POSTGRESQL DATABASE                              │
│  22 tables, 16 enum types, RLS on all tables                        │
│  Append-only: ledger_entries, audit_logs                            │
│  Superadmin uniqueness: partial unique index                        │
│  All monetary values: INTEGER (kobo) + currency column              │
└─────────────────────────────────────────────────────────────────────┘
```

## Role Hierarchy (§69)

```
SUPERADMIN (exactly 1)
    │
    ├── Creates/manages Admin accounts
    ├── All permissions implicitly
    └── Platform configuration authority
         │
    ADMIN (multiple, created by Superadmin)
         │
         ├── OPERATIONS_ADMIN  — users, jobs, workers, employers
         ├── VERIFICATION_ADMIN — verification submissions & decisions
         ├── SUPPORT_ADMIN — disputes, safety reports, support cases
         ├── FINANCE_ADMIN — payments, payouts, ledger (MFA required)
         └── MODERATION_ADMIN — reviews, reports, content moderation
              │
    MARKETPLACE USERS (self-registered)
              │
              ├── EMPLOYER — creates jobs, hires workers, pays
              └── WORKER — accepts jobs, performs work, earns
```

## Directory Structure

```
/menial
├── mobile/                 # React Native / Expo mobile app
├── admin/                  # Next.js Admin + Superadmin dashboards
├── shared/types/           # Shared TypeScript types & enums
├── supabase/
│   ├── migrations/         # PostgreSQL migration files
│   ├── seed.sql            # Development seed data
│   └── config.toml         # Supabase project configuration
├── docs/                   # Architecture & documentation
├── .env.example            # Environment variable template
├── DESIGN.md               # Design system specification
└── menial-master-spec-v2.md # Master Engineering Specification
```

## Key Design Decisions

1. **Phone-first auth** (§9): Marketplace users authenticate via phone OTP. Email optional.
2. **Kobo integers** (§4): All monetary values stored as integers in kobo (100 kobo = 1 NGN). Never floats.
3. **Explicit currency column** (§4): Every monetary table has `currency DEFAULT 'NGN'` for future multi-currency.
4. **Append-only ledger** (§44): `ledger_entries` is the single source of truth for earnings. Never updated/deleted.
5. **Immutable audit log** (§67): `audit_logs` records all admin/system actions. Never updated/deleted.
6. **Service abstractions** (§85): Payment, SMS, payout, notification services use interfaces with mock providers.
7. **Per-worker pay** (§29): `worker_pay` on a job is per-worker, not a total to be split.
8. **Safety is core scope** (§49): SOS reports, photo check-in/out, and share-to-contact are MVP features.
