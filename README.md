# Menial — On-Demand Worker Marketplace (Nigeria)

> Connecting people and businesses that need short-term manual/physical labour with nearby, verified workers across Nigeria.

Menial is built according to the **Menial Master Engineering Specification (v2)**. It provides a robust, low-cost, secure, and production-ready backend supporting three operational layers:
1. **Menial Mobile Application** (Workers & Employers)
2. **Menial Admin Operations Dashboard** (Operations, Verification, Support, Finance, Moderation)
3. **Menial Superadmin Dashboard** (Governance, Admin Lifecycle, Platform Control)

---

## 1. System Architecture

Menial is architected around a single PostgreSQL 15 database managed through Supabase with Row Level Security (RLS) enforcing multi-tenant isolation, immutable audit trails, and financial integrity.

```
                  ┌───────────────────────────────────┐
                  │    SUPABASE BACKEND (PostgreSQL)  │
                  │   RLS + 22 Tables + 45+ RPCs      │
                  │   Double-Entry Append-Only Ledger │
                  └─────────────────┬─────────────────┘
                                    │
       ┌────────────────────────────┼────────────────────────────┐
       │                            │                            │
┌──────▼─────────────┐    ┌─────────▼──────────┐       ┌─────────▼──────────┐
│   MOBILE CLIENT    │    │  ADMIN DASHBOARD   │       │ SUPERADMIN CONTROL │
│  React Native/Expo │    │  Next.js 14 Web    │       │ Unique Authority   │
│  Employers/Workers │    │  Operational Staff │       │ Admin Mgmt & Config│
└────────────────────┘    └────────────────────┘       └────────────────────┘
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/API_REFERENCE.md](docs/API_REFERENCE.md) for full technical documentation.

---

## 2. Key Business Rules & Conventions

### A. Currency & Pay-Unit Convention (§4, §29)
- **Currency:** All platform monetary amounts are stored in **Nigerian Kobo** (`1 NGN = 100 kobo`).
- **Data Integrity:** Float values are prohibited; all amounts are `bigint` integers.
- **Per-Worker Pay Rule (§29):** Proposed pay (`worker_pay`) is strictly a **per-worker amount**, not a total budget to be divided.
- **Dynamic Fee Calculation (§40):**
  $$\text{Total Amount} = (\text{worker\_pay} \times \text{number\_of\_workers}) + \text{platform\_fee}$$
  Where `platform_fee` is dynamically computed (default 10% in kobo).

### B. Double-Entry Append-Only Ledger (§42, §44)
- Balances and earnings are **never stored as mutable columns** on worker profiles.
- All worker payouts and earnings are dynamically derived from `ledger_entries`.
- PostgreSQL triggers (`prevent_modify()`) defend `ledger_entries`, `audit_logs`, and `job_status_history` against any `UPDATE` or `DELETE` operations.
- Every payment refund is an offsetting credit entry; every completed job transaction batch balances to net zero (`\sum \text{amount} = 0`).

### C. Cancellation Policy & 2-Hour Window (§36)
- **Free Cancellation (> 2 hours prior):** Full 100% refund of escrow deposit, no cancellation fee.
- **Late Cancellation (< 2 hours prior):** Assesses a platform cancellation penalty fee (₦1,000 / 100,000 kobo default), with remainder refunded.

---

## 3. Administrative Hierarchy & RBAC

```
ONE SUPERADMIN (§11, §20)
       │
       ├─► Operations Admin (§13)   — Job monitoring, category management
       ├─► Verification Admin (§13) — Worker KYC, NIN review, NDPA masking
       ├─► Support Admin (§13)      — Dispute resolution, emergency SOS
       ├─► Finance Admin (§13)      — Escrow oversight, NIP payout approval (MFA Mandatory)
       └─► Moderation Admin (§13)   — User suspensions, review moderation
```

- **Superadmin Uniqueness (§20):** Enforced via partial unique index `idx_unique_superadmin ON admin_users (is_superadmin) WHERE is_superadmin = true`. The system strictly blocks creating a second Superadmin or deleting/demoting the Superadmin.
- **Mandatory MFA (§23):** Required for Superadmin and Finance Admin before accessing privileged endpoints.

---

## 4. Local Development & Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (v2.116+)
- [Docker Desktop](https://www.docker.com/) (for running Supabase local containers)

### Quick Start

```bash
# 1. Clone the repository
git clone <repo-url>
cd menial

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env

# 4. Initialize local Supabase
supabase start

# 5. Apply migrations and seed data
supabase db reset

# 6. Bootstrap the unique Superadmin account (§11, §20)
npm run init:superadmin

# 7. Start the Admin Operations & Superadmin Governance Portal
npm run admin:dev
# Access portal at: http://localhost:3000

# 8. Start the Mobile Application (React Native / Expo)
npm run mobile:start
```

---

## 5. Environment Variables Reference

See [.env.example](.env.example) for a complete template:

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `SUPABASE_URL` | Supabase API URL | `http://127.0.0.1:54321` |
| `SUPABASE_ANON_KEY` | Public anonymous key | (from `supabase status`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Privileged backend key | (from `supabase status`) |
| `SUPERADMIN_EMAIL` | Bootstrap Superadmin email | `superadmin@menial.ng` |
| `SUPERADMIN_PASSWORD` | Bootstrap Superadmin password | (secure secret) |
| `SUPERADMIN_NAME` | Bootstrap Superadmin full name | `System Superadmin` |
| `SMS_PROVIDER` | Active SMS provider | `mock` / `termii` / `twilio` |
| `PAYMENT_PROVIDER` | Payment provider | `mock` / `paystack` |
| `PAYOUT_PROVIDER` | Bank transfer provider | `mock` / `nip` |

---

## 6. Service Abstractions & Mock Providers

The backend implements pluggable provider abstractions allowing seamless transitions between local test mocks and live production gateways:

1. **SMS & OTP Gateway:**
   - Abstraction: `shared/services/sms/SmsService.ts`
   - Mock: `shared/services/sms/MockSmsProvider.ts` (tracks carrier costs @ 400 kobo/SMS, enforces sliding-window rate limit: 3 OTP requests / 15 min per §43).
   - Production adapters: Termii, Twilio.

2. **Identity Verification & KYC:**
   - Abstraction: `shared/services/verification/VerificationService.ts`
   - Mock: `shared/services/verification/MockVerificationProvider.ts` (enforces Nigeria Data Protection Act masking `*******8901` per §80).
   - Production adapters: Prembly (Identitypass), Dojah.

3. **Escrow Payments:**
   - Abstraction: `shared/services/payment/PaymentService.ts`
   - Mock: `shared/services/payment/MockPaymentProvider.ts` (idempotent webhook confirmation, replay attack defense per §39).
   - Production adapter: Paystack.

4. **Bank Disbursements (Payouts):**
   - Abstraction: `shared/services/payment/PayoutService.ts`
   - Mock: `shared/services/payment/MockPayoutProvider.ts` (Nigerian 10-digit NUBAN validation, NIP instant transfer simulation per §41).
   - Production adapter: Paystack Transfers / NIBSS.

---

## 7. Security, In-Person Safety & NDPA Compliance

- **Nigeria Data Protection Act (NDPA) (§80):** National Identity Numbers (NIN) and sensitive ID numbers are strictly masked before persistence (`*******8901`). Raw identifiers are never leaked in API payloads or audit logs.
- **In-Person Safety Suite (§49):**
  - **Arrival Check-In:** Photo check-in required when arriving on-site.
  - **Checkout Completion:** Photo check-out required upon job completion.
  - **Emergency SOS Dispatch:** Real-time SOS dispatch to the Support Admin Attention Queue with GPS coordinates.
  - **Native Share Sheet:** One-tap WhatsApp/SMS share sheet formatting allowing workers and employers to share live job details with loved ones.
- **Terminal Chat Lock (§48):** In-app messaging is strictly restricted to job participants and locks into read-only mode once a job reaches `completed` or `cancelled`.
- **Search-Path Injection Defenses:** All `SECURITY DEFINER` stored procedures execute with explicit `SET search_path = public`.

---

## 8. Verification & Test Suites

The comprehensive test suite exercises all 10 implementation phases, all 6 mobile application slices, all admin operational corridors, and all security boundaries:

```bash
# Run all 22 verification test suites across all layers (Backend + Admin + Mobile + Security)
npm test

# Run mobile application test suites (Slices 1 through 6)
npm run test:mobile

# Run admin dashboard test suites (Slices 8A, 8B, 8C, Slice 9)
npm run test:admin

# Run individual backend/feature suites
npm run test:phase2   # Admin Authority & Auth
npm run test:phase3   # Marketplace Users & Verification
npm run test:phase4   # Marketplace & Job Creation
npm run test:phase5   # Transactions & Double-Entry Ledger
npm run test:phase6   # Job Execution & Check-ins
npm run test:phase7   # Trust & Safety
npm run test:phase8   # Admin Operations
npm run test:phase9   # Superadmin Governance
npm run test:e2e      # End-to-End Marketplace Lifecycle
npm run test:security # Section 89 Pen-Test (15 Attack Vectors)

# TypeScript type verification across all workspaces (Root + Mobile + Admin)
npm run typecheck:all
```

---

## 9. Deployment & Disaster Recovery

- **Production Setup:** See [docs/DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md) for step-by-step production database push, secret management, and webhook configurations.
- **Emergency Superadmin Recovery:** See [docs/SUPERADMIN_RECOVERY.md](docs/SUPERADMIN_RECOVERY.md) for audited standard operating procedures in the event of lost Superadmin credentials or MFA devices (§74).

---

## License

Private — All rights reserved. Menial Marketplace Ltd.
