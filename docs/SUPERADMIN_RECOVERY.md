# Standard Operating Procedure: Superadmin Account Recovery

**Document Version:** 1.0  
**Classification:** Restricted — Core Infrastructure Engineering Only  
**Reference:** Master Engineering Specification v2 (§11, §14, §20, §23, §74)

---

## 1. Purpose & Scope

In accordance with Section 11 and Section 20 of the Menial platform specification, there is strictly **ONE** Superadmin account on the platform, and no public "Forgot Password" or self-serve recovery flow exists for this account.

This Standard Operating Procedure (SOP) governs the disaster recovery process when:
1. The Superadmin credentials (email / password) are compromised, inaccessible, or lost.
2. The Superadmin's Multi-Factor Authentication (TOTP authenticator device) is lost, stolen, or destroyed.

---

## 2. Mandatory Pre-Conditions

To execute this recovery procedure, the operator must have:
* Direct, authorized administrative access to the hosting infrastructure (Supabase Dashboard, AWS/GCP console, or direct PostgreSQL connection via `psql`).
* Access to the platform's `SUPABASE_SERVICE_ROLE_KEY` or `postgres` database role.
* Formal, documented dual-custody authorization from company leadership.

---

## 3. Recovery Execution Steps

### Step 1: Create or Designate New Auth Identity
In the Supabase Dashboard (`Authentication -> Users`) or via Supabase Admin API:
1. Create a new user with the designated new Superadmin email address.
2. Ensure the user's email is confirmed.
3. Note the new user's UUID (`NEW_USER_UUID`).

### Step 2: Execute Database Re-Linking Procedure
Connect to the database via `psql` or the Supabase SQL Editor as a database superuser and execute:

```sql
-- Replace '00000000-0000-0000-0000-000000000000' with NEW_USER_UUID
SELECT public.execute_superadmin_recovery(
  '00000000-0000-0000-0000-000000000000'::uuid,
  'Authorized disaster recovery: Device loss recovery authorized by Leadership Ticket #SEC-2026-09'
);
```

### What this Procedure Performs:
1. Re-links the single `is_superadmin = true` row in `public.admin_users` to `NEW_USER_UUID`.
2. Resets `mfa_enrolled = false` on the Superadmin account, allowing initial login and fresh TOTP pairing.
3. Automatically writes an immutable event `superadmin.recovery` to `public.audit_logs`.
4. Fully revokes authority from the previous identity.

---

## 4. Post-Recovery Verification

1. **Verify Uniqueness:**
   Confirm that exactly one row remains in `admin_users` where `is_superadmin = true`:
   ```sql
   SELECT count(*) FROM public.admin_users WHERE is_superadmin = true;
   -- Must return exactly 1
   ```

2. **Verify Audit Trail:**
   Confirm that the recovery action was recorded:
   ```sql
   SELECT * FROM public.audit_logs WHERE action = 'superadmin.recovery' ORDER BY created_at DESC LIMIT 1;
   ```

3. **Mandatory MFA Enrollment (§23):**
   The new Superadmin must log in immediately and scan the new TOTP QR code. Administrative operations will remain locked until MFA is enrolled.
