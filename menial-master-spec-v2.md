# MENIAL — MASTER ENGINEERING SPECIFICATION (v2)

## Native Mobile Worker Marketplace + Admin Dashboard + Superadmin Control

**Changelog from v1:** currency/pay-unit clarified, phone-first auth, MFA on privileged accounts, cancellation/no-show defaults, rate limiting, ratings/messaging/ledger data models, in-person safety features, NDPA privacy note, concrete performance targets, accessibility/language note, and a phased confirm-before-continuing workflow instruction. Everything else is unchanged from v1.

You are the lead software engineer and product implementation agent for **menial**, a worker-on-demand marketplace initially targeting Nigeria.

Build the actual working MVP, not merely a UI prototype.

Menial consists of three operational layers:

1. **Menial Mobile Application**
   * Employers
   * Workers
2. **Menial Admin Dashboard**
   * Regular Menial administrators/operations staff
3. **Menial Superadmin Dashboard**
   * Exactly ONE Superadmin
   * Highest level of administrative authority
   * Responsible for creating and managing Admin accounts and controlling the administrative system

All three layers must operate against the same secure backend and database.

---

# 1. PRODUCT CONCEPT

Menial connects people or businesses that need short-term physical/service labour with nearby workers.

An employer can:
* choose a service category
* describe the work
* specify location
* specify date and time
* specify number of workers
* specify proposed pay
* discover suitable nearby workers
* select/hire workers
* make payment through Menial
* monitor the job
* confirm completion
* rate workers

A worker can:
* create a worker profile
* select service categories
* specify service areas
* indicate availability
* discover suitable nearby jobs
* accept/request jobs
* receive job instructions
* indicate arrival
* perform the job
* mark work completed
* receive earnings
* view work history
* rate employers

Menial acts as the marketplace intermediary.

All important transactions, job state changes, verification decisions, disputes, payouts and administrative actions must be controlled by the backend.

---

# 2. CORE PRODUCT PRINCIPLES

Do NOT turn Menial into a conventional job board.

The core experience is:

**Employer needs labour → creates job → Menial finds suitable workers → employer hires → payment → worker performs job → completion → payout → rating**

The product should feel like an on-demand service marketplace.

Initial service examples:
* Cleaning
* Moving
* Loading
* Gardening
* Laundry
* Construction/general labour
* Event assistance
* Domestic assistance
* Errands
* Car washing
* Packing/unpacking
* General labour
* Other services

Categories must be database-driven.

---

# 3. DEVELOPMENT PRIORITY

Prioritize:

1. Authentication
2. Worker/employer profiles
3. Verification architecture
4. Job creation
5. Worker discovery
6. Hiring
7. Payment architecture
8. Job lifecycle
9. Completion
10. Ratings
11. Earnings/payout architecture
12. Disputes
13. Safety features (SOS/report, check-in verification)
14. Admin operations
15. Superadmin administration
16. Audit logs
17. Security (including MFA on privileged accounts)

Do not spend excessive development effort on decorative animations or unnecessary infrastructure.

The complete end-to-end marketplace transaction is more important than having many non-functional screens.

---

# 4. TECHNOLOGY STACK

Preferred mobile:
* React Native
* Expo
* TypeScript

Backend:
* Supabase
* PostgreSQL
* Supabase Auth
* Row Level Security
* Supabase Storage
* Edge Functions where appropriate
* Realtime only where useful

Admin/Superadmin:
* React/Next.js or appropriate TypeScript web framework
* Responsive desktop-first interface
* Same backend
* Secure role-based authorization

Do not create a separate disconnected backend for Admin or Superadmin.

**Currency:** the platform operates in Nigerian Naira (NGN) only for MVP. Store all monetary amounts as integers in kobo (1 naira = 100 kobo), never as floats. Every monetary field across every table (`jobs.worker_pay`, `jobs.platform_fee`, `jobs.total_amount`, `payments`, `payouts`, ledger entries) must carry an explicit `currency` column defaulted to `"NGN"`, even though only NGN is supported now — this avoids a schema migration when other currencies are added later.

---

# 5. COST CONTROL

Prioritize:
* free tiers
* open-source libraries
* Supabase free/low-cost infrastructure
* Expo
* serverless functions
* simple PostgreSQL queries
* mock external integrations

External services such as:
* payments
* SMS/OTP
* identity verification
* maps
* push notifications
* payouts

must be abstracted behind service interfaces.

Use mock implementations during development when providers have not yet been selected. Likely eventual Nigerian providers to design the abstraction around (do not hard-integrate yet): Paystack or Flutterwave for payments/payouts, Termii or Africa's Talking for SMS/OTP. SMS costs real money per send — the mock provider should log a simulated cost per message so the abstraction is cost-aware from day one.

---

# 6. STITCH DESIGN REFERENCE

Before substantial frontend implementation:

1. Inspect the existing Menial Stitch designs.
2. Inspect the design system.
3. Inspect Employer screens.
4. Inspect Worker screens.
5. Inspect Shared screens.
6. Inspect Admin Dashboard designs.
7. Inspect Superadmin Dashboard designs if provided.
8. Map screens to routes/components.
9. Identify reusable components.
10. Identify missing states.

The Stitch designs are the visual/UX reference.

The Master Engineering Specification is the functional/security/backend source of truth.

Do not blindly implement unsupported claims contained in Stitch.

---

# 7. VISUAL DIRECTION

Existing direction:

## Dignified Utility

Menial should communicate:
* reliability
* dignity
* professionalism
* accessibility
* speed
* trust
* simplicity

Workers must be represented as professionals providing valuable services.

Existing design system:
* Electric Royal Cobalt: #1A4FEE (Core brand hue per official logo assets)
* Mint/Jade: #10B981
* Warm neutral backgrounds
* White surfaces
* Dark text: #0F172A
* Plus Jakarta Sans
* Rounded cards approximately 12–16px
* Minimum touch target approximately 48px

Use the established Stitch system as visual authority.

**Language and literacy:** assume a meaningful share of workers have lower digital literacy and may be more comfortable in Nigerian Pidgin than formal English. For MVP, keep all copy short, plain, and icon-reinforced (icon + label, not icon alone) rather than building a full localization system. Treat a Pidgin-English toggle as a fast-follow, not MVP-blocking, but do not write copy in a way that would be hard to later extract into a translation layer (avoid concatenated/dynamic sentence fragments in code).

---

# 8. APPLICATION STRUCTURE

The product has:

## A. MOBILE APP
For:
* Employer
* Worker

## B. ADMIN DASHBOARD
For authorized Menial Admin users.

## C. SUPERADMIN DASHBOARD
For exactly one Superadmin.

The Admin and Superadmin interfaces may share components and infrastructure, but their authorization boundaries must remain separate.

---

# 9. AUTHENTICATION

Marketplace users (Employer, Worker) are **phone-first**: phone number + OTP is the primary and default registration/login method, given the target demographic skews toward phone-only usage with lower email adoption. Email may be collected optionally (e.g. for receipts) but must never be required to use the app.

Implement:
* registration
* login
* logout
* password/account recovery where applicable
* phone-based OTP authentication as the default for marketplace users; email/password acceptable for Admin/Superadmin web login
* authenticated session persistence
* rate limiting on OTP requests (see Section 43, Rate Limiting & Abuse Prevention) to control SMS cost and prevent abuse

Do not trust role information supplied by the client.

Roles must be established and enforced server-side.

---

# 10. USER ROLES

There are two distinct categories of users.

## MARKETPLACE USERS

### EMPLOYER
Individual or business that hires workers.

### WORKER
Person who provides services.

## ADMINISTRATIVE USERS

### SUPERADMIN
Exactly ONE Superadmin exists.

The Superadmin is the highest administrative authority.

The Superadmin:
* can access the Superadmin Dashboard
* can create Admin accounts
* can activate/deactivate Admin accounts
* can assign/revoke Admin permissions
* can view all administrative operations
* can manage administrative roles
* can view audit logs
* can manage platform-level settings
* has full operational authority

The Superadmin account must NOT be creatable from the normal public registration flow.

### ADMIN
Admin users are created by the Superadmin.

Admins are operational staff with assigned permissions.

An Admin may have one or more permitted administrative responsibilities, such as:
* Operations
* Verification
* Support
* Finance
* Moderation

An Admin:
* cannot create another Admin
* cannot create a Superadmin
* cannot promote another user to Superadmin
* cannot promote themselves
* cannot modify Superadmin credentials
* cannot delete the Superadmin
* cannot alter Superadmin privileges
* cannot bypass RBAC

---

# 11. SUPERADMIN UNIQUENESS

There must be exactly one Superadmin account.

Enforce this at the backend/database level.

Do not rely on the frontend to enforce uniqueness.

There must be no public "Create Superadmin" functionality.

Superadmin initialization must be handled through a secure deployment/initialization procedure.

Once the Superadmin exists, the Superadmin can create Admin accounts.

The Superadmin should not be treated like an ordinary marketplace user.

---

# 12. ADMIN ACCOUNT CREATION

Only the Superadmin can create Admin accounts.

Admin creation flow:

Superadmin logs in → Admin Management → Create Admin → enter required information → select permissions/role → create account → system records creation → audit log entry created.

Depending on authentication architecture, the Admin may receive an invitation/password setup process rather than receiving a permanent password from the Superadmin. As part of that invitation/setup flow, the Admin must also enroll in MFA (see Section 23) before their account becomes ACTIVE.

Do not expose administrator passwords in logs.

Do not store plaintext passwords.

---

# 13. ADMIN ROLES/PERMISSIONS

Use permission-based authorization rather than relying only on UI visibility.

Suggested administrative roles:

### OPERATIONS_ADMIN
Can manage: users, jobs, workers, employers, operational issues.

### VERIFICATION_ADMIN
Can manage: verification submissions, verification decisions, requests for additional information.

### SUPPORT_ADMIN
Can manage: support cases, disputes according to assigned permissions, reports, user support actions, incoming safety reports/SOS events.

### FINANCE_ADMIN
Can access: payments, payouts, transaction/ledger records, financial operational actions.

### MODERATION_ADMIN
Can manage: reports, reviews, inappropriate content, moderation actions.

The Superadmin can assign appropriate permissions.

An Admin may have multiple permissions if the Superadmin grants them.

---

# 14. SUPERADMIN PERMISSIONS

The Superadmin has all administrative permissions, including:
* create Admin
* deactivate Admin
* reactivate Admin
* modify Admin permissions
* revoke Admin permissions
* view all users
* manage workers
* manage employers
* manage jobs
* manage verification
* manage disputes
* view payments
* manage authorized financial operations
* view payouts
* manage categories
* manage platform settings
* manage notification configuration
* view audit logs
* manage Admin accounts

However, even Superadmin operations should be auditable.

---

# 15. SUPERADMIN DASHBOARD

The Superadmin Dashboard is not simply a duplicate of the regular Admin Dashboard.

It should provide:

## Administrative Overview
* total Admins
* active Admins
* inactive Admins
* recent administrative activity
* pending operational issues
* system-level alerts
* important marketplace metrics

## Admin Management
* Admin list
* Admin status
* Admin permissions
* create Admin
* edit Admin
* activate/deactivate Admin
* revoke permissions
* view Admin activity

## Audit
* administrative activity
* configuration changes
* Admin creation
* permission changes
* Admin suspension/deactivation
* sensitive operational actions

## Platform Configuration
Where appropriate:
* platform fee
* job rules
* cancellation settings
* verification configuration
* categories
* supported locations
* payout configuration

All configuration changes must be audited.

---

# 16. SUPERADMIN ADMIN-MANAGEMENT SCREEN

Create a dedicated **Admin Management** screen.

Table should show: Admin name, email/identifier, assigned role(s), status, created date, last login, created by, last activity.

Actions: View, Edit permissions, Deactivate, Reactivate.

Superadmin can open an Admin profile and see: account information, assigned permissions, account status, created date, last login, administrative activity, audit events, MFA enrollment status.

---

# 17. ADMIN STATUS

Admin account statuses:
* INVITED
* ACTIVE
* SUSPENDED
* DEACTIVATED

A deactivated Admin cannot access the Admin Dashboard.

A suspended Admin cannot perform administrative operations.

Do not delete Admin accounts when historical audit integrity would be affected.

Prefer deactivation.

---

# 18. ADMIN AUTHORIZATION

The backend must determine: who the authenticated user is, whether they are an Admin, whether they are Superadmin, what permissions they possess, whether their account is active.

Never use frontend variables such as `isAdmin = true` as the authorization mechanism.

---

# 19. ADMIN SELF-PRIVILEGE ESCALATION PROTECTION

A normal Admin must never be able to:
* assign themselves higher privileges
* create another Admin
* create a Superadmin
* modify their own role
* modify another Admin's permissions
* bypass their permissions by manipulating API requests
* directly modify RBAC records

These restrictions must be enforced server-side.

---

# 20. SUPERADMIN PROTECTION

The system must prevent:
* creating a second Superadmin
* deleting the only Superadmin through normal admin operations
* changing Superadmin role through Admin interfaces
* normal Admin access to Superadmin-only functions
* public registration as Superadmin

Any exceptional Superadmin recovery process must be handled through a secure deployment/administrative procedure rather than an ordinary application feature.

---

# 21. BASE USER PROFILE

Base user information: ID, name, phone, email where applicable, profile photo, account type, status, created_at, updated_at.

Marketplace account statuses: ACTIVE, SUSPENDED, DEACTIVATED.

---

# 22. WORKER PROFILE

Worker profile: name, profile photo, short bio, service categories, service areas, availability, indicative rate, rating, completed jobs, verification status, work history.

Verification states: UNVERIFIED, PENDING, VERIFIED, REJECTED.

Never claim verification that has not actually occurred.

---

# 23. MFA & SESSION SECURITY (NEW)

Given the Superadmin can create/deactivate Admins and Finance Admins can view payouts, privileged accounts need protection beyond password/email login alone.

Require:
* MFA (TOTP via an authenticator app is sufficient for MVP — do not build custom SMS-based MFA) for the Superadmin account, mandatory, no exceptions
* MFA required for any Admin holding the FINANCE_ADMIN permission
* MFA optional but encouraged for other Admin roles
* session expiry/re-authentication for Admin and Superadmin dashboards after a period of inactivity (e.g. re-auth after 12 hours idle — exact value configurable, not hard-coded permanently)
* login notification (in-app or email) to the Superadmin whenever an Admin account logs in from a new device, if feasible within MVP effort

Do not implement MFA bypass flags or "skip for now" development shortcuts that could ship to production.

---

# 24. EMPLOYER PROFILE

Support: individual, business/company.

Information: name, company name where applicable, photo/logo, phone, email, verification status, jobs, ratings, disputes, payment history.

Do not overbuild company management in MVP.

---

# 25. VERIFICATION

Create `verification_records`.

Include: verification type, submitted information, uploaded documents where applicable, status, reviewer, review date, reason.

Verification types should include at least: phone verification (via OTP), ID verification. For ID verification, design the field/document type as configurable rather than hard-coded, since Nigeria-relevant ID types (e.g. NIN slip, voter's card, driver's license) may be added or changed without a schema migration.

Actions: Approve, Reject, Request More Information.

Only backend status determines a Verified badge.

---

# 26. CATEGORIES

Seed: Cleaning, Moving, Loading, Gardening, Laundry, Construction, Event Helper, Domestic Help, Errands, Car Wash, General Labour, Packing/Unpacking, Other.

Fields: ID, name, description, icon, active, display order, timestamps.

---

# 27. WORKER AVAILABILITY

Workers can: toggle availability, specify service areas, specify working periods.

Do not require continuous background GPS tracking in MVP.

---

# 28. LOCATION

Support: service area, current/recent location where permitted, job location, manual location.

Use geographic proximity queries.

Matching should primarily consider: category, availability, proximity, verification, rating, completed jobs.

---

# 29. JOB CREATION

Required: category, description, location, date, start time, number of workers, proposed pay.

**Pay unit — resolve explicitly, do not leave implicit:** "proposed pay" is a **per-worker amount**, not a total budget to be split. If a job needs 3 workers at the stated pay, the employer's total cost is `proposed pay × number_of_workers + platform_fee`, and each worker in `job_workers` gets their own `agreed_amount` (which may later be individually negotiated/adjusted per worker, but defaults to the job's proposed pay). Show the employer both the per-worker rate and the total cost before they publish.

Optional: duration, instructions, photos, notes.

Employer reviews before publishing.

---

# 30. JOB DATA MODEL

Suggested `jobs` table fields:
* id
* public_job_id
* employer_id
* category_id
* title
* description
* location_text
* latitude
* longitude
* date
* start_time
* duration
* number_of_workers
* worker_pay (integer, kobo)
* platform_fee (integer, kobo)
* total_amount (integer, kobo)
* currency (default "NGN")
* status
* cancellation_reason
* created_at
* updated_at
* completed_at
* cancelled_at

Platform fee must be configurable.

---

# 31. MULTI-WORKER JOBS

Use `job_workers`.

Fields: id, job_id, worker_id, assignment_status, agreed_amount (integer, kobo), assigned_at, accepted_at, arrived_at, started_at, completed_at, payout_status.

---

# 32. JOB STATUS LIFECYCLE

Suggested:

DRAFT → POSTED → MATCHING → REQUESTED → ACCEPTED → PAYMENT_PENDING → PAYMENT_SECURED → WORKER_ON_WAY → WORKER_ARRIVED → IN_PROGRESS → COMPLETED_BY_WORKER → COMPLETED

Possible: CANCELLED, DISPUTED, PAYMENT_FAILED.

Backend controls transitions.

---

# 33. JOB STATUS HISTORY

Create `job_status_history`.

Record: job, previous status, new status, actor, actor type, timestamp, reason, metadata.

Admin can view this timeline.

---

# 34. WORKER DISCOVERY

Employer can discover workers based on: category, location, availability, verification, rating, completed jobs.

Do not fabricate metrics.

---

# 35. HIRING

Backend verifies: employer owns job, worker exists, worker eligible, category matches, job available, worker not already assigned, job allows hiring.

---

# 36. CANCELLATION & NO-SHOW POLICY (NEW)

Give Antigravity a concrete default so it isn't guessed mid-build; make it configurable via Platform Settings (Section 66) for later tuning:

* Employer may cancel a job free of charge up to 2 hours before the scheduled start time.
* Employer cancellation inside the 2-hour window, after a worker has accepted, may forfeit a cancellation fee (amount configurable; 0 by default until a real policy is decided).
* Worker no-show (accepted but never arrives / marks WORKER_ARRIVED) is logged as a no-show event on the worker's record and surfaces in Admin worker management; repeated no-shows are an Admin-manageable status flag, not an automatic ban in MVP.
* Employer no-show (job location inaccessible, employer unreachable) is logged symmetrically against the employer.
* Any cancellation or no-show must write a `job_status_history` entry with a reason code, and must never silently release a payment hold — cancellation must feed into the refund path defined in the Payment Architecture.

---

# 37. PAYMENT ARCHITECTURE

Do not fake escrow. Do not create a fake wallet.

Create `PaymentService` with operations: initializePayment, verifyPayment, handleWebhook, refundPayment, initiatePayout, checkPayoutStatus.

Development provider: `MockPaymentProvider`.

Client cannot set payment success.

---

# 38. PAYMENT FLOW

Employer initiates payment → provider → provider confirms → Menial records payment → job proceeds → completion → payout eligibility → payout.

---

# 39. PAYMENT STATES

PENDING, SUCCESSFUL, FAILED, CANCELLED, REFUNDED, DISPUTED.

Handle: duplicate callbacks, webhook replay, retries, provider failures, reference mismatches.

---

# 40. FEES

Never hard-code a particular platform percentage.

Separate: worker amount, platform fee, total. Store all three in kobo with an explicit currency.

Configuration changes must be audited.

---

# 41. PAYOUTS

Fields: payout ID, worker, job, amount (kobo), provider, provider reference, status, initiated_at, completed_at, failure_reason.

Statuses: PENDING, PROCESSING, SUCCESSFUL, FAILED, REVERSED.

Use mock payouts initially.

---

# 42. EARNINGS

Worker sees: eligible earnings, pending earnings, paid earnings, transaction history, payout history.

Use actual transaction/ledger records (Section 45) as source of truth — never a cached balance the client or a mutable row can drift from.

---

# 43. RATE LIMITING & ABUSE PREVENTION (NEW)

Apply backend rate limits to at least:
* OTP request/verification attempts per phone number (protects SMS cost and prevents brute-force)
* job creation per employer account per time window (prevents spam listings)
* hire/job-request actions per worker account per time window
* login attempts per account (standard lockout/backoff)

Rate limit violations should return a clear, non-technical error to the user and log the event for Admin visibility, not silently fail.

---

# 44. LEDGER / TRANSACTION RECORDS (NEW)

In addition to the mutable-status `payments` and `payouts` tables, create an append-only `ledger_entries` table as the single source of truth for reconciliation and worker earnings display. Each entry:
* id
* related_type (payment / payout / refund / fee)
* related_id
* job_id
* actor (worker_id or employer_id)
* amount (integer, kobo, signed — positive for credit, negative for debit)
* currency
* description
* created_at

Ledger entries are never updated or deleted — a correction is a new offsetting entry, never an edit. This table, not `payments`/`payouts` directly, is what worker earnings screens and Admin financial reports read from.

---

# 45. COMPLETION

Worker: `COMPLETED_BY_WORKER`. Employer: `COMPLETED`. Disagreement: `DISPUTED`.

---

# 46. RATINGS

Employer rates worker. Worker rates employer.

Use 1–5 stars, optional review text.

**Data model (`ratings`):** id, job_id, rater_id, rater_type (employer/worker), ratee_id, ratee_type, stars (1-5), review_text (nullable), created_at. Enforce one rating per rater per job at the database level (unique constraint on job_id + rater_id).

Prevent: unauthorized ratings, duplicate ratings, ratings before valid completion.

---

# 47. DISPUTES

Reasons: worker no-show, employer no-show, incomplete work, inaccurate description, payment problem, safety issue, other.

Statuses: OPEN, UNDER_REVIEW, WAITING_FOR_INFORMATION, RESOLVED, CLOSED.

Admin manages disputes according to permission. Superadmin can oversee all disputes.

---

# 48. MESSAGING

Implement job-specific messaging. Do not create a social network.

**Data model:** `conversations` (id, job_id, employer_id, worker_id, created_at) and `messages` (id, conversation_id, sender_id, sender_type, body, created_at, read_at). Messages are scoped strictly to a single job's conversation and become read-only once the job reaches a terminal status (COMPLETED, CANCELLED) — no open-ended chat outside job context.

---

# 49. SAFETY (NEW)

This is in-person manual labor between strangers — treat safety as core scope, not a stretch goal.

MVP safety features:
* **SOS / Report Issue** button visible on the Active Job screen (both Employer and Worker apps) that immediately creates a high-priority record visible to SUPPORT_ADMIN and logs job/location/timestamp/both parties' contact info.
* **Share job details** — worker (or employer) can share job location, scheduled time, and the other party's name/photo to an external contact via native share sheet (SMS/WhatsApp), without building in-app contact management.
* **Photo check-in/out** — worker optionally attaches a photo at WORKER_ARRIVED and at COMPLETED_BY_WORKER, stored via Supabase Storage, visible to Admin if a dispute or safety report is opened.
* Safety reports are never silently closed — closing one requires a SUPPORT_ADMIN action and is audit-logged like any other administrative action.

Do not build in-app calling, live GPS tracking, or panic-button-to-police integration for MVP — those are meaningfully harder and out of scope; the above gives a real safety net without that complexity.

---

# 50. NOTIFICATIONS

MVP: in-app notifications. Architecture ready for: push, SMS, email.

---

# 51. LOW-BANDWIDTH & PERFORMANCE TARGETS

Optimize: images, pagination, caching, API calls, retry, loading, low-end Android performance.

Concrete targets (so "optimize" isn't left to interpretation): mobile app installable/functional on a device with 2GB RAM; release APK size target under 30MB; initial screen interactive within a few seconds on a throttled 3G-equivalent connection. Treat these as MVP targets to design against, not hard contractual limits.

---

# 52. MOBILE SCREENS

Shared: Splash, Welcome, Login, Registration, Verification, Role selection, Notifications, Profile, Settings, Help, Report/SOS.

Employer: Home, Categories, Create Job, Location, Date/Time, Pay, Review, Nearby Workers, Worker Profile, Hire Confirmation, Payment, Active Job (incl. Share/SOS), Completion, Rating, History.

Worker: Home, Availability, Nearby Jobs, Job Details, Accept, Active Job (incl. Share/SOS, photo check-in), On Way, Arrived, Start, Complete, Earnings, Withdraw/Payout, Reviews, Work History.

---

# 53. ADMIN DASHBOARD

Regular Admin Dashboard is for authorized Admin users.

Navigation: Overview, Users, Workers, Employers, Jobs, Payments, Payouts, Verifications, Disputes, Safety Reports, Reviews & Reports, Categories, Notifications, Settings, Audit Log.

The exact navigation visible to an Admin should depend on their permissions. A Verification Admin should not automatically see financial operations. A Finance Admin should not automatically be able to manage Admin accounts.

---

# 54. ADMIN OVERVIEW

Actual metrics: workers, employers, new users, jobs today, active jobs, completed jobs, pending verification, disputes, open safety reports, pending payouts, failed payments, platform revenue.

Attention queue: pending verification, disputes, open safety reports, failed payouts, failed payments, reports, suspicious activity.

---

# 55. USER MANAGEMENT

Authorized Admins can: search, filter, inspect, suspend, reactivate, deactivate — according to permissions.

---

# 56. WORKER MANAGEMENT

Show: profile, categories, verification, jobs, ratings, earnings, disputes, reports, no-show history, status.

Verification actions require appropriate permission.

---

# 57. EMPLOYER MANAGEMENT

Show: profile, verification, jobs, spending, payments, ratings, disputes, reports, no-show history, status.

---

# 58. JOB MANAGEMENT

Show: public job ID, category, employer, worker(s), location, pay, status, created date, scheduled date.

Detail: job information, participants, payment, payout, timeline, messages where appropriate, disputes, ratings.

---

# 59. PAYMENT MANAGEMENT

Show: Payment ID, Job ID, Employer, Worker, Worker amount, Menial fee, Total, Provider, Provider reference, Status, Date.

Financial actions require appropriate permission.

---

# 60. PAYOUT MANAGEMENT

Show: payout ID, worker, job, amount, provider, reference, status, dates, failure reason.

Finance permissions required for financial operations.

---

# 61. VERIFICATION CENTRE

Queue: Pending, Approved, Rejected, Request More Information.

Actions: Approve, Reject, Request information.

All decisions audited.

---

# 62. DISPUTE CENTRE

Show: dispute, job, employer, worker, amount, reason, status, assigned Admin, date.

Detail: job, participants, payment, timeline, messages, evidence.

Resolution must be audited.

---

# 63. REVIEWS, REPORTS & SAFETY CENTRE

Manage: reported users, jobs, messages, reviews, and SOS/safety reports (Section 49).

Actions: dismiss, remove where justified, warn, suspend, escalate. Safety reports specifically require an assigned SUPPORT_ADMIN and cannot be closed without a resolution note.

---

# 64. CATEGORY MANAGEMENT

Authorized administrators can: create, edit, activate, deactivate, reorder.

---

# 65. NOTIFICATIONS (ADMIN)

Support: title, message, target audience, status, creator, timestamp.

---

# 66. PLATFORM SETTINGS

Potential configuration: platform fee, cancellation rules (default policy in Section 36), minimum job amount, maximum job amount, verification requirements, supported locations, payout settings, currency (fixed to NGN for MVP).

Only authorized administrators may change settings. Superadmin has ultimate authority. Every change must be audited.

---

# 67. ADMIN AUDIT LOG

Create an immutable audit log.

Record: Admin creation, Admin deactivation, Admin reactivation, Admin permission changes, Verification decisions, User suspension, Job intervention, Dispute resolution, Safety report resolution, Payment operations, Payout operations, Fee changes, Platform setting changes, Category changes, Moderation actions, Superadmin operations.

Each event: actor ID, actor role, action, target type, target ID, timestamp, previous state where appropriate, new state where appropriate, reason, metadata.

Admins must not be able to silently modify/delete audit history. Superadmin should have read access to the complete administrative audit trail.

---

# 68. ADMIN DATA MODEL

Create a dedicated administrative authorization structure.

Conceptually:

`admin_users`: id, user_id, admin_role/status, status, created_by, created_at, updated_at, last_login_at, mfa_enrolled.

`admin_permissions`: id, permission_key, description.

`admin_user_permissions`: admin_user_id, permission_id, granted_by, granted_at.

Alternatively, use a robust role-permission model if cleaner.

The architecture must support: exactly one Superadmin, multiple Admins, different Admin permissions, permission changes, account deactivation, auditability.

---

# 69. ROLE HIERARCHY

**SUPERADMIN → ADMIN → MARKETPLACE USERS**

Marketplace users: Employer, Worker.

Administrative authority must never be granted based on marketplace role. An Employer or Worker cannot become an Admin through public application functionality. Only the Superadmin creates Admin accounts.

---

# 70. ADMIN CREATION SECURITY

Admin creation must occur through a protected backend operation, e.g. `createAdmin()`.

Backend verifies: authenticated user exists, authenticated user is the Superadmin, Superadmin account is active, requested Admin role/permissions are valid, new account does not conflict with an existing administrative account, account is created securely, audit event is written.

Do not implement this as a client-side database insert.

---

# 71. ADMIN LOGIN

Flow: Authentication → backend checks administrative status → identifies SUPERADMIN / ADMIN / marketplace user → loads appropriate permissions → routes to appropriate dashboard.

A normal marketplace user must not gain access merely by changing the URL.

---

# 72. SUPERADMIN LOGIN

Superadmin accesses a protected Superadmin route, e.g. `/superadmin`. Admin: `/admin`.

The actual routing structure can differ, but authorization must be backend-enforced, and MFA (Section 23) is mandatory here.

---

# 73. ADMIN ROUTE SECURITY

Do not rely on: hidden menu items, frontend route guards alone, local storage roles, URL obscurity, client-side `isAdmin`.

Every sensitive operation must be authorized server-side.

---

# 74. SUPERADMIN ACCOUNT RECOVERY

Because there is exactly one Superadmin, recovery requires special consideration.

Do not implement a normal feature allowing an Admin to reset or replace the Superadmin.

Use the underlying secure authentication/deployment/recovery mechanism. Document this process.

---

# 75. FILE STORAGE

Use Supabase Storage for: profile images, verification documents, job photos, check-in/out safety photos, dispute evidence.

Private documents must remain protected.

---

# 76. MAPS/GPS

Do not make advanced maps mandatory. Support manual location. No continuous background tracking in MVP.

---

# 77. CALLING

Do not make direct phone calling a core feature. Use job-specific messaging (and the safety share-sheet in Section 49 for reaching outside contacts).

---

# 78. ERROR HANDLING

Every operation needs: loading, success, failure, retry, useful error messages.

Never expose raw database errors.

---

# 79. EMPTY STATES

Create meaningful empty states, e.g. "No nearby jobs right now.", "No pending verifications.", "No disputes assigned to you."

---

# 80. ACCESSIBILITY, LANGUAGE & DATA PROTECTION

Support: readable text, sufficient contrast, large touch targets, clear labels, accessible forms, meaningful error states, non-color-only status communication, plain/simple copy (Section 7).

**Data protection:** Menial collects PII including phone numbers, ID verification documents, and location. Design storage, retention, and access controls to comply with Nigeria's Data Protection Act (NDPA) — minimum necessary collection, access restricted to authorized Admin roles, and a documented retention/deletion approach for verification documents. This does not require a full legal compliance build in MVP, but the schema and storage access rules must not make later compliance work a rewrite.

---

# 81. TESTING

Test:

**Authentication:** login, logout, registration, unauthorized access, OTP rate limiting.

**RBAC:** marketplace user cannot access Admin; Admin cannot access Superadmin-only operations; Admin cannot create Admin; Admin cannot create Superadmin; Admin cannot modify own privileges; Admin cannot modify another Admin without permission; Superadmin can create Admin; Superadmin can deactivate Admin; Superadmin can change Admin permissions; MFA is enforced for Superadmin and Finance Admin login.

**Jobs:** create, publish, discovery, acceptance, hiring, status transitions, completion, cancellation, no-show handling.

**Payments:** initialization, success, failure, duplicate callback, webhook replay, refund.

**Payouts:** eligibility, success, failure.

**Ratings:** valid, duplicate prevention, unauthorized prevention.

**Disputes:** creation, review, resolution.

**Verification:** approval, rejection, more information.

**Safety:** SOS report creation and routing to Support Admin, photo check-in/out storage and access control.

**Audit:** verify that all sensitive Admin/Superadmin operations generate audit records.

---

# 82. SEED DATA

Development seed data should include: categories, worker, employer, jobs, completed job, ratings, dispute, safety report (for testing the flow), payment, payout, development Admin, development Superadmin where appropriate.

Clearly identify development accounts. Never commit production credentials.

---

# 83. ENVIRONMENT CONFIGURATION

Use environment variables for: Supabase URL, Supabase keys, payment configuration, SMS/OTP provider configuration, maps, notification providers, other secrets.

Never commit secrets. Provide `.env.example`.

---

# 84. PROJECT STRUCTURE

Suggested:
```text
/mobile
/admin
/shared
/supabase
/docs
```
Within `/admin`, keep Admin/Superadmin functionality modular.

Do not duplicate entire applications unnecessarily.

---

# 85. SERVICE ABSTRACTIONS

Create: AuthService, PaymentService, PayoutService, NotificationService, LocationService, VerificationService, SmsService, AdminService.

Use mocks during development.

---

# 86. DO NOT OVERENGINEER

Do not build: AI matching, blockchain, complex wallet, continuous GPS, social feed, subscriptions, elaborate HR system, unnecessary microservices, custom in-house MFA (use TOTP standard), in-app calling, live GPS tracking, police integration.

Build the smallest secure architecture supporting a real Menial transaction — safety features in Section 49 are the one addition to "smallest," included because the physical nature of the work makes them core, not extra.

---

# 87. ANALYTICS

Basic: jobs, completed jobs, cancelled jobs, active jobs, workers, employers, payment volume, platform fees, payouts, disputes, safety reports, verification queue.

Superadmin may see broader system-level analytics.

---

# 88. PRIVACY

Collect only necessary information. Protect: phone numbers, verification documents, banking/payment information, private messages, dispute/safety evidence.

Use RLS and storage policies. See also Section 80 (NDPA).

---

# 89. SECURITY REVIEW

Before completion inspect: RLS bypass, IDOR, exposed secrets, insecure Admin routes, Admin privilege escalation, Superadmin impersonation, MFA bypass paths, client-controlled payment status, client-controlled job status, client-controlled verification, unauthorized file access, duplicate transaction, webhook replay, privilege escalation, rate limit bypass.

Fix critical issues.

---

# 90. MOBILE PERFORMANCE

Optimize for low-end Android, slow networks, intermittent connectivity (see concrete targets, Section 51).

Avoid unnecessary: animation, oversized assets, polling, realtime subscriptions, API calls.

---

# 91. ADMIN PERFORMANCE

Use: pagination, server-side filtering, server-side sorting, indexed queries.

Do not load thousands of records into browser memory.

---

# 92. ADMIN UX

Desktop-first.

Structure: Sidebar → top bar → page title/actions → metrics → filters → table → detail panel/page.

Use: dense readable tables, status badges, filters, search, timelines, confirmation dialogs, clear actions.

---

# 93. SUPERADMIN UX

Superadmin interface should clearly distinguish privileged functions.

Provide dedicated access to: Admin Management, administrative permissions, system settings, audit logs, administrative activity.

Do not make the interface unnecessarily complex. The Superadmin should be able to understand **what is happening in Menial** and **who is administering Menial**.

---

# 94. DO NOT FABRICATE FUNCTIONALITY

Do not display claims such as: Background Checked, Insurance Included, Escrow Protected, NIN Verified, Police Verified, Live Tracking — unless actually implemented.

Do not fabricate: balances, payments, users, jobs, statistics, verification results.

Development seed data is acceptable in development environments only.

---

# 95. END-TO-END MARKETPLACE TEST

Test: Employer registration → Worker registration → Worker verification → Worker availability → Employer creates job → Worker discovers job → Worker accepts → Employer hires → Payment initialized → Payment confirmed → Worker travels → Worker arrives (photo check-in) → Work starts → Work completed (photo check-out) → Employer confirms → Payout eligible → Payout processed → Ratings → History → Admin sees transaction and ledger entries → Audit log records relevant events.

Also test the unhappy paths: employer cancels within policy window, worker no-show, SOS report raised mid-job and routed to Support Admin.

---

# 96. SUPERADMIN TEST

Verify: Superadmin can log in with MFA; Superadmin can access Superadmin Dashboard; Superadmin can see Admin Management; Superadmin can create an Admin; new Admin receives invitation/setup including MFA enrollment; Admin appears in Admin Management; audit log records Admin creation; Superadmin can assign permissions; Admin can access only permitted modules; Admin cannot create another Admin; Admin cannot create Superadmin; Admin cannot modify their own privileges; Superadmin can deactivate Admin; deactivated Admin cannot access Admin Dashboard; Superadmin can reactivate Admin; Superadmin can revoke permissions; all sensitive actions appear in the audit log.

---

# 97. ADMIN TEST

Verify: Admin can log in (with MFA if Finance Admin); Admin sees only authorized modules; Admin can manage assigned operational tasks; Admin cannot access Superadmin-only functions; Admin cannot create another Admin; Admin cannot promote users; Admin cannot modify RBAC directly; sensitive actions create audit entries.

---

# 98. IMPLEMENTATION STRATEGY

Do not build every screen first. Build vertical slices.

**PHASE 1 — FOUNDATION:** repository, mobile, admin, Supabase, authentication (phone OTP), database, RLS, shared types.

**PHASE 2 — ADMIN AUTHORITY:** user roles, Superadmin initialization, Admin creation, Admin permissions, MFA enrollment, Admin login, Superadmin login, RBAC, audit logging.

**PHASE 3 — MARKETPLACE USERS:** profiles, worker profile, employer profile, categories, verification.

**PHASE 4 — MARKETPLACE:** availability, jobs, job creation, discovery, assignments, hiring.

**PHASE 5 — TRANSACTIONS:** payment abstraction, mock payment, payment records, ledger entries, payout abstraction, mock payout, earnings.

**PHASE 6 — JOB EXECUTION:** arrival/photo check-in, start, completion/photo check-out, status history, notifications, cancellation/no-show handling.

**PHASE 7 — TRUST & SAFETY:** ratings, reviews, disputes, reports, messaging, SOS/safety reporting.

**PHASE 8 — ADMIN OPERATIONS:** overview, users, workers, employers, jobs, payments, payouts, verification, disputes, safety centre, reports, categories, settings.

**PHASE 9 — SUPERADMIN:** Admin Management, Admin creation, Admin permissions, Admin status, administrative activity, system settings, full audit visibility.

**PHASE 10 — HARDENING:** security, RLS, authorization, transaction safety, rate limiting, performance, testing, seed data, documentation.

**Checkpoint requirement:** before starting each phase, output a short task breakdown for that phase and wait for explicit confirmation before writing code. Do not proceed silently from one phase to the next.

---

# 99. ANTIGRAVITY WORKFLOW

Before each major module:

1. Inspect existing code.
2. Inspect existing database.
3. Inspect Stitch designs.
4. Determine what already works.
5. Do not duplicate functionality.
6. Implement smallest correct version.
7. Run tests.
8. Run TypeScript checks.
9. Check migrations.
10. Check RLS.
11. Test actual user flow.
12. Fix errors before continuing.
13. Output a one-paragraph summary of what was built and any assumptions made, before moving to the next module.

Do not repeatedly rewrite working components.

---

# 100. DATABASE MIGRATIONS

All schema changes must use migrations. Do not make undocumented production database changes. Keep schema reproducible.

---

# 101. DOCUMENTATION

README must explain: architecture, mobile, Admin, Superadmin, database, authentication, RBAC, RLS, MFA setup, Admin creation, Superadmin initialization, local development, environment variables, migrations, seed data, tests, mock payment, mock payout, mock SMS, deployment, security considerations, business rules (including cancellation policy and pay-unit convention).

---

# 102. DEFINITION OF DONE

## MOBILE
Authentication (phone OTP), employer onboarding, worker onboarding, verification, categories, availability, job creation, discovery, hiring, payment, job lifecycle, completion, payout, ratings, messaging, safety (SOS, share, photo check-in/out), notifications architecture, history.

## ADMIN
Secure login, RBAC, overview, user management, worker management, employer management, job management, payment management, payout management, verification, disputes, safety centre, reports/reviews, categories, notifications, settings, audit logs.

## SUPERADMIN
Secure Superadmin login with MFA, unique Superadmin account, Superadmin Dashboard, Admin Management, create Admin, activate/deactivate Admin, assign/revoke permissions, view Admin activity, view complete audit history, manage platform-level configuration, full administrative visibility.

## BACKEND
Migrations, RLS, server-side authorization, secure state transitions, rate limiting, payment protection, payout protection, ledger integrity, transaction safety, RBAC, Superadmin uniqueness, Admin creation protection, MFA enforcement, audit logging, secrets protection.

## QUALITY
TypeScript passes, tests pass, no critical runtime errors, Android functionality, desktop Admin functionality, reasonable low-bandwidth performance against Section 51 targets, documentation.

---

# 103. FINAL INSTRUCTION TO ANTIGRAVITY

You are not being asked to merely generate a visual prototype. You are building the foundation of a real marketplace.

Prioritize: **correctness > security > working transactions > maintainability > performance > visual polish**.

Use the existing Stitch designs as the visual reference. Use this specification as the functional and architectural source of truth. Build the Mobile App, Admin Dashboard and Superadmin Dashboard against the same secure backend.

The administrative hierarchy is: **ONE SUPERADMIN → MULTIPLE ADMINS → MARKETPLACE USERS**. The Superadmin is the only role capable of creating and managing Admin accounts. Regular Admins must never be able to create, promote, modify or replace administrative privileges beyond what the Superadmin has explicitly granted.

The platform currency is NGN; all amounts are stored in kobo. "Proposed pay" on a job is a per-worker amount, not a total to be split.

Safety features (Section 49) are core MVP scope given the in-person, physical nature of this work — do not deprioritize them as polish.

Do not invent unsupported product claims. Do not hard-code changeable business rules. Do not fake financial transactions. Do not trust the client with privileged state changes. Do not disable security controls, including MFA, for convenience. Do not overengineer the MVP.

When a requirement is ambiguous, choose the simplest implementation that preserves the product intent and document the assumption. When an external service has not been selected, implement an abstraction and mock provider.

Before starting each implementation phase (Section 98), output a task breakdown for that phase and wait for confirmation before writing code.

The final result should be a functional, secure, testable, low-cost MVP of **menial** capable of transitioning from development mocks to production providers without requiring a fundamental rewrite.
