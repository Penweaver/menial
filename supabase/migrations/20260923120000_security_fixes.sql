-- =============================================================================
-- MENIAL — SECURITY AUDIT & SPECIFICATION FIXES (Section 89)
-- Migration: 20260923120000_security_fixes.sql
-- Purpose:
--   1. Restrict confirm_payment_webhook to service_role ONLY (mitigates forged calls).
--   2. Add invitation_token & 72-hour invitation_expires_at to admin_users (§17, §68).
--   3. Add accept_admin_invitation procedure requiring mandatory MFA enrollment (§23).
--   4. Update update_admin_status to block activating any admin without MFA (§23).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. WEBHOOK RPC ACCESS LOCKDOWN (§37, §39, §89)
-- ---------------------------------------------------------------------------
-- Under no circumstances may an authenticated user or anon client invoke
-- confirm_payment_webhook directly. Only backend edge functions running with
-- service_role credentials after validating HMAC-SHA512 signatures may invoke it.

REVOKE ALL ON FUNCTION public.confirm_payment_webhook(text, text, integer, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.confirm_payment_webhook(text, text, integer, jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.confirm_payment_webhook(text, text, integer, jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_payment_webhook(text, text, integer, jsonb) TO service_role;

-- ---------------------------------------------------------------------------
-- 2. ADMIN INVITATION TOKEN & 72-HOUR EXPIRATION (§17, §68)
-- ---------------------------------------------------------------------------

ALTER TABLE public.admin_users
  ADD COLUMN IF NOT EXISTS invitation_token text UNIQUE,
  ADD COLUMN IF NOT EXISTS invitation_expires_at timestamptz;

COMMENT ON COLUMN public.admin_users.invitation_token IS
  'Cryptographically secure token for admin onboarding invitation. Cleared upon activation.';
COMMENT ON COLUMN public.admin_users.invitation_expires_at IS
  'Expiration timestamp for admin onboarding invitation (72 hours default).';

-- ---------------------------------------------------------------------------
-- 3. UPDATE CREATE_ADMIN_ACCOUNT TO ISSUE 72-HOUR EXPIRES TOKEN
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_admin_account(
  p_user_id uuid,
  p_permissions public.admin_permission_key[],
  p_reason text DEFAULT 'Admin account creation'
)
RETURNS TABLE (
  admin_id uuid,
  invitation_token text,
  invitation_expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_admin_id uuid;
  v_is_caller_superadmin boolean;
  v_new_admin_id uuid;
  v_token text;
  v_expires_at timestamptz;
  v_perm public.admin_permission_key;
  v_perm_id uuid;
  v_perm_names text[] := ARRAY[]::text[];
BEGIN
  -- 1. Verify caller is active Superadmin (§12, §19)
  SELECT id, is_superadmin INTO v_caller_admin_id, v_is_caller_superadmin
  FROM public.admin_users
  WHERE user_id = auth.uid() AND status = 'active';

  IF v_caller_admin_id IS NULL OR v_is_caller_superadmin IS NOT TRUE THEN
    RAISE EXCEPTION 'Unauthorized: Only the Superadmin can create Admin accounts (§12, §70).';
  END IF;

  -- 2. Verify target user is not already an admin
  IF EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = p_user_id) THEN
    RAISE EXCEPTION 'Target user is already an administrative user.';
  END IF;

  -- 3. Generate cryptographic 72-hour invitation token (§17)
  v_token := encode(gen_random_bytes(32), 'hex');
  v_expires_at := now() + interval '72 hours';

  -- 4. Create Admin record in 'invited' status
  INSERT INTO public.admin_users (
    user_id,
    is_superadmin,
    status,
    created_by,
    mfa_enrolled,
    invitation_token,
    invitation_expires_at
  ) VALUES (
    p_user_id,
    false,
    'invited',
    v_caller_admin_id,
    false,
    v_token,
    v_expires_at
  )
  RETURNING id INTO v_new_admin_id;

  -- 5. Assign requested permissions (§13, §68)
  IF p_permissions IS NOT NULL AND array_length(p_permissions, 1) > 0 THEN
    FOREACH v_perm IN ARRAY p_permissions LOOP
      SELECT id INTO v_perm_id
      FROM public.admin_permissions
      WHERE permission_key = v_perm;

      IF v_perm_id IS NOT NULL THEN
        INSERT INTO public.admin_user_permissions (
          admin_user_id,
          permission_id,
          granted_by
        ) VALUES (
          v_new_admin_id,
          v_perm_id,
          v_caller_admin_id
        )
        ON CONFLICT (admin_user_id, permission_id) DO NOTHING;

        v_perm_names := array_append(v_perm_names, v_perm::text);
      END IF;
    END LOOP;
  END IF;

  -- 6. Record immutable audit log entry (§67)
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
    v_caller_admin_id,
    'superadmin',
    'admin.create',
    'admin_user',
    v_new_admin_id,
    NULL,
    jsonb_build_object(
      'user_id', p_user_id,
      'status', 'invited',
      'is_superadmin', false,
      'permissions', v_perm_names,
      'invitation_expires_at', v_expires_at
    ),
    p_reason,
    jsonb_build_object('created_by', v_caller_admin_id)
  );

  RETURN QUERY SELECT v_new_admin_id, v_token, v_expires_at;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. ACCEPT ADMIN INVITATION & MANDATORY MFA ENROLLMENT (§23)
-- ---------------------------------------------------------------------------
-- Flow for invited admin:
--   1. Provides valid, unexpired invitation token.
--   2. Confirms password setup & MFA enrollment completed.
--   3. Strictly blocks activation if MFA enrollment is not completed.
CREATE OR REPLACE FUNCTION public.accept_admin_invitation(
  p_invitation_token text,
  p_mfa_enrolled boolean
)
RETURNS TABLE (
  admin_id uuid,
  user_id uuid,
  status public.admin_status,
  mfa_enrolled boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin public.admin_users%ROWTYPE;
BEGIN
  -- 1. Validate token presence
  IF p_invitation_token IS NULL OR trim(p_invitation_token) = '' THEN
    RAISE EXCEPTION 'Invalid invitation: Token is required.';
  END IF;

  -- 2. Locate admin user by token
  SELECT * INTO v_admin
  FROM public.admin_users
  WHERE invitation_token = p_invitation_token;

  IF v_admin.id IS NULL THEN
    RAISE EXCEPTION 'Invalid invitation: Token not found or already consumed.';
  END IF;

  -- 3. Check status
  IF v_admin.status != 'invited' THEN
    RAISE EXCEPTION 'Invalid invitation: Account is already %.', v_admin.status;
  END IF;

  -- 4. Verify 72-hour expiry (§17)
  IF v_admin.invitation_expires_at IS NOT NULL AND v_admin.invitation_expires_at < now() THEN
    RAISE EXCEPTION 'Invitation expired: The invitation link has expired. Request a new invite from the Superadmin.';
  END IF;

  -- 5. MANDATORY MFA REQUIREMENT (§23)
  -- An administrator account CANNOT reach 'active' status without completed MFA enrollment.
  IF p_mfa_enrolled IS NOT TRUE THEN
    RAISE EXCEPTION 'MFA Requirement (§23): Multi-Factor Authentication enrollment is mandatory before activating an administrator account.';
  END IF;

  -- 6. Transition to active & clear invitation token
  UPDATE public.admin_users
  SET status = 'active',
      mfa_enrolled = true,
      invitation_token = NULL,
      invitation_expires_at = NULL,
      updated_at = now()
  WHERE id = v_admin.id;

  -- 7. Audit log transition (§67)
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
    v_admin.id,
    'admin',
    'admin.invitation_accepted',
    'admin_user',
    v_admin.id,
    jsonb_build_object('status', 'invited', 'mfa_enrolled', false),
    jsonb_build_object('status', 'active', 'mfa_enrolled', true),
    'Admin accepted invitation and completed MFA enrollment',
    jsonb_build_object('user_id', v_admin.user_id)
  );

  RETURN QUERY SELECT v_admin.id, v_admin.user_id, 'active'::public.admin_status, true;
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. UPDATE UPDATE_ADMIN_STATUS TO DEFEND MFA REQUIREMENT (§23)
-- ---------------------------------------------------------------------------
-- Ensure that Superadmin cannot manually toggle an admin to 'active'
-- if the admin has not enrolled in MFA.
CREATE OR REPLACE FUNCTION public.update_admin_status(
  p_admin_user_id uuid,
  p_new_status public.admin_status,
  p_reason text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_admin_id uuid;
  v_is_caller_superadmin boolean;
  v_target_is_superadmin boolean;
  v_target_mfa_enrolled boolean;
  v_prev_status public.admin_status;
BEGIN
  -- 1. Caller verification
  SELECT id, is_superadmin INTO v_caller_admin_id, v_is_caller_superadmin
  FROM public.admin_users
  WHERE user_id = auth.uid() AND status = 'active';

  IF v_caller_admin_id IS NULL OR v_is_caller_superadmin IS NOT TRUE THEN
    RAISE EXCEPTION 'Unauthorized: Only the Superadmin can alter Admin account status (§14, §19).';
  END IF;

  -- 2. Target check: Cannot alter Superadmin account status (§20)
  SELECT is_superadmin, status, mfa_enrolled
  INTO v_target_is_superadmin, v_prev_status, v_target_mfa_enrolled
  FROM public.admin_users
  WHERE id = p_admin_user_id;

  IF v_target_is_superadmin IS NULL THEN
    RAISE EXCEPTION 'Admin user record not found.';
  END IF;

  IF v_target_is_superadmin IS TRUE THEN
    RAISE EXCEPTION 'Protection Error: The Superadmin account cannot be deactivated or suspended through admin procedures (§20).';
  END IF;

  -- 3. MFA Guard (§23): Cannot set status to 'active' without MFA enrollment
  IF p_new_status = 'active' AND v_target_mfa_enrolled IS NOT TRUE THEN
    RAISE EXCEPTION 'Policy Error: An administrator account cannot reach active status without completed MFA enrollment (§23).';
  END IF;

  -- 4. Update status
  UPDATE public.admin_users
  SET status = p_new_status, updated_at = now()
  WHERE id = p_admin_user_id;

  -- 5. Audit log entry (§67)
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
    v_caller_admin_id,
    'superadmin',
    'admin.status_change',
    'admin_user',
    p_admin_user_id,
    jsonb_build_object('status', v_prev_status),
    jsonb_build_object('status', p_new_status),
    p_reason,
    jsonb_build_object('target_admin_id', p_admin_user_id)
  );

  RETURN true;
END;
$$;
