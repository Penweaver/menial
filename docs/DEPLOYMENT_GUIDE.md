# Menial Platform — Production Deployment Guide

This guide outlines the production deployment procedure for the **Menial** worker marketplace backend, Supabase instance, mobile application services, and administrative control dashboards.

---

## 1. Production Architecture Overview

The Menial platform operates as a unified, multi-tiered marketplace:

```
                  ┌──────────────────────────────┐
                  │    SUPABASE PRODUCTION CLOUD │
                  │  PostgreSQL 15 + PostgREST   │
                  │  RLS + Storage + Auth + RPC  │
                  └──────────────┬───────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
┌────────▼────────┐     ┌────────▼────────┐     ┌────────▼────────┐
│  MENIAL MOBILE  │     │  ADMIN WEB APP  │     │   SUPERADMIN    │
│  React Native / │     │  Next.js 14     │     │   DASHBOARD     │
│  Expo (iOS/And) │     │  Staff Ops      │     │   Governance    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

---

## 2. Supabase Infrastructure Setup

### Step 2.1: Link Production Project
Install the Supabase CLI (v2.116+) and authenticate with your production organization:

```bash
# Login to Supabase CLI
supabase login

# Link your local repository to your remote production Supabase project
supabase link --project-ref <your-production-project-ref>
```

### Step 2.2: Apply Migrations
Apply all 10 sequential migrations in cryptographic order:

```bash
supabase db push
```

The migrations execute the following sequence:
1. `20260922120000_foundation.sql`: 16 custom enums, 22 core tables, RLS policies, append-only triggers.
2. `20260922130000_admin_authority.sql`: Admin account creation, role assignment, MFA enforcement.
3. `20260922140000_marketplace_users.sql`: Worker/employer onboarding, NDPA-compliant NIN verification.
4. `20260922150000_marketplace_jobs.sql`: Job lifecycle, per-worker pricing calculation, hiring validation.
5. `20260922160000_marketplace_transactions.sql`: Escrow payments, webhook idempotency, double-entry ledger.
6. `20260922170000_marketplace_execution.sql`: In-person check-in/out photos, completion sign-off.
7. `20260922180000_marketplace_trust_safety.sql`: Mutual 5-star ratings, SOS dispatch, terminal chat lock.
8. `20260922190000_admin_operations.sql`: Operational metrics, pagination, category management.
9. `20260922200000_superadmin_governance.sql`: Admin management, system health, double-entry audit.
10. `20260922210000_hardening_security.sql`: Search-path security, financial constraints, phone/NUBAN checks.

### Step 2.3: Seed Production Categories & Settings
Apply the baseline categories (§26), admin permissions (§13), and platform settings (§66):

```bash
supabase db execute --file supabase/seed.sql
```

---

## 3. Bootstrapping the Unique Superadmin

Per Section 11 and Section 20, the platform has **exactly ONE Superadmin**. It is enforced at the database level by a partial unique index (`idx_unique_superadmin`).

Run the bootstrap script to create the initial Superadmin:

```bash
# Provide production credentials via environment variables:
SUPERADMIN_EMAIL="superadmin@menial.ng" \
SUPERADMIN_PASSWORD="<STRONG_SECURE_PASSWORD>" \
SUPERADMIN_NAME="Chief Administrator" \
npm run init:superadmin
```

> [!IMPORTANT]
> Immediately log in as Superadmin and enroll an Authenticator App (TOTP MFA). Multi-Factor Authentication is strictly mandatory for Superadmin access (§23).

---

## 4. Production Integration Providers

### A. Payment Provider (Paystack)
1. In the Paystack Dashboard, configure your Webhook URL:
   `https://api.menial.ng/api/webhooks/paystack` (or Supabase Edge Function).
2. Configure webhook events:
   - `charge.success`
3. Ensure webhook signature verification is enabled in production using `PAYSTACK_SECRET_KEY`.
4. Webhook handler calls `confirm_payment_webhook` RPC, which enforces idempotency and blocks replay attacks (§39).

### B. SMS & OTP Gateway (Termii / Twilio)
1. Configure Termii / Twilio credentials in your production environment:
   - `SMS_PROVIDER=termii`
   - `TERMII_API_KEY=<key>`
   - `TERMII_SENDER_ID=Menial`
2. Sliding-window rate limiters (§43) defend against OTP SMS flooding:
   - Maximum 3 OTP requests per 15 minutes per phone.
   - Maximum 5 failed verification attempts before 15-minute phone lockout.

### C. Bank Payout Transfers (NIP / Paystack Transfers)
1. Configure NIP bank transfer credentials for worker payouts (§41).
2. All accounts are validated against 10-digit Nigerian NUBAN standards before transfer dispatch.
3. Every payout generates corresponding balanced debit/credit entries in `ledger_entries`.

---

## 5. Production Environment Variables Checklist

Create your production `.env` file based on `.env.example`:

```ini
# Supabase Production
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<production-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<production-service-role-key>

# Paystack Payment Gateway
PAYSTACK_PUBLIC_KEY=pk_live_...
PAYSTACK_SECRET_KEY=sk_live_...
PAYSTACK_WEBHOOK_SECRET=whsec_...

# SMS Gateway (Termii / Twilio)
SMS_PROVIDER=termii
TERMII_API_KEY=...
TERMII_SENDER_ID=Menial

# Application Configuration
NODE_ENV=production
APP_BASE_URL=https://menial.ng
ADMIN_BASE_URL=https://admin.menial.ng
```

---

## 6. Health Audits & Disaster Recovery

### Automated Schema & Ledger Health Check
Run the built-in integrity RPC to verify zero-sum ledger balancing and constraint enforcement:

```sql
SELECT * FROM public.verify_schema_integrity();
```

Expected result:
```
         check_name          | is_valid |                                details                                 
-----------------------------+----------+------------------------------------------------------------------------
 ledger_zero_sum_integrity   | t        | All completed ledger batches are balanced (net zero).
 job_pricing_formula_integrity| t       | All jobs comply with (worker_pay * number_of_workers) + platform_fee formula.
```

### Superadmin Disaster Recovery
If the Superadmin account credentials or MFA device are lost, follow the audited Standard Operating Procedure in [docs/SUPERADMIN_RECOVERY.md](SUPERADMIN_RECOVERY.md) (§74).
