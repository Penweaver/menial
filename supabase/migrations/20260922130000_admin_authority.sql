-- =============================================================================
-- MENIAL — ADMIN AUTHORITY & RBAC PROCEDURES
-- =============================================================================
-- Migration: 20260922130000_admin_authority.sql
-- Purpose:   Server-enforced administrative procedures with atomic audit logging.
-- Reference: menial-master-spec-v2.md (Sections 10-20, 23, 67, 68, 70)
--
-- Rules enforced:
--   - Only Superadmin can create Admin accounts (§12, §70).
--   - Admins cannot self-escalate privileges or modify permissions (§19).
--   - Superadmin cannot be deactivated or altered by admin procedures (§20).
--   - All state modifications produce immutable audit_log records (§67).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. CREATE ADMIN ACCOUNT (Superadmin only)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_admin_account(
  p_user_id uuid,
  p_permissions public.admin_permission_key[],
  p_reason text DEFAULT 'Admin account creation'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_admin_id uuid;
  v_is_caller_superadmin boolean;
  v_new_admin_id uuid;
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

  -- 3. Create Admin record in 'invited' status (§17, §68)
  INSERT INTO public.admin_users (
    user_id,
    is_superadmin,
    status,
    created_by,
    mfa_enrolled
  ) VALUES (
    p_user_id,
    false,
    'invited',
    v_caller_admin_id,
    false
  )
  RETURNING id INTO v_new_admin_id;

  -- 4. Assign requested permissions (§13, §68)
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

  -- 5. Record immutable audit log entry (§67)
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
      'permissions', v_perm_names
    ),
    p_reason,
    jsonb_build_object('created_by', v_caller_admin_id)
  );

  RETURN v_new_admin_id;
END;
$$;

COMMENT ON FUNCTION public.create_admin_account IS
  'Superadmin-only procedure to create an Admin account with initial permissions and audit logging. §12, §70';


-- ---------------------------------------------------------------------------
-- 2. UPDATE ADMIN STATUS (Superadmin only)
-- ---------------------------------------------------------------------------
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
  SELECT is_superadmin, status INTO v_target_is_superadmin, v_prev_status
  FROM public.admin_users
  WHERE id = p_admin_user_id;

  IF v_target_is_superadmin IS NULL THEN
    RAISE EXCEPTION 'Admin user record not found.';
  END IF;

  IF v_target_is_superadmin IS TRUE THEN
    RAISE EXCEPTION 'Protection Error: The Superadmin account cannot be deactivated or suspended through admin procedures (§20).';
  END IF;

  -- 3. Update status
  UPDATE public.admin_users
  SET status = p_new_status, updated_at = now()
  WHERE id = p_admin_user_id;

  -- 4. Audit log entry (§67)
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
    jsonb_build_object('changed_by', v_caller_admin_id)
  );

  RETURN true;
END;
$$;

COMMENT ON FUNCTION public.update_admin_status IS
  'Superadmin-only procedure to activate, suspend, or deactivate Admin accounts with audit logging. §17, §20';


-- ---------------------------------------------------------------------------
-- 3. UPDATE ADMIN PERMISSIONS (Superadmin only)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_admin_permissions(
  p_admin_user_id uuid,
  p_new_permissions public.admin_permission_key[],
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
  v_prev_permissions text[];
  v_new_permissions_text text[] := ARRAY[]::text[];
  v_perm public.admin_permission_key;
  v_perm_id uuid;
BEGIN
  -- 1. Caller verification
  SELECT id, is_superadmin INTO v_caller_admin_id, v_is_caller_superadmin
  FROM public.admin_users
  WHERE user_id = auth.uid() AND status = 'active';

  IF v_caller_admin_id IS NULL OR v_is_caller_superadmin IS NOT TRUE THEN
    RAISE EXCEPTION 'Unauthorized: Only the Superadmin can modify Admin permissions (§14, §19).';
  END IF;

  -- 2. Target check: Superadmin already possesses all privileges implicitly
  SELECT is_superadmin INTO v_target_is_superadmin
  FROM public.admin_users
  WHERE id = p_admin_user_id;

  IF v_target_is_superadmin IS NULL THEN
    RAISE EXCEPTION 'Admin user record not found.';
  END IF;

  IF v_target_is_superadmin IS TRUE THEN
    RAISE EXCEPTION 'Protection Error: Superadmin permissions are implicit and cannot be modified (§14, §20).';
  END IF;

  -- 3. Fetch previous permissions for audit trail
  SELECT array_agg(ap.permission_key::text) INTO v_prev_permissions
  FROM public.admin_user_permissions aup
  JOIN public.admin_permissions ap ON ap.id = aup.permission_id
  WHERE aup.admin_user_id = p_admin_user_id;

  -- 4. Replace permissions atomically
  DELETE FROM public.admin_user_permissions
  WHERE admin_user_id = p_admin_user_id;

  IF p_new_permissions IS NOT NULL AND array_length(p_new_permissions, 1) > 0 THEN
    FOREACH v_perm IN ARRAY p_new_permissions LOOP
      SELECT id INTO v_perm_id
      FROM public.admin_permissions
      WHERE permission_key = v_perm;

      IF v_perm_id IS NOT NULL THEN
        INSERT INTO public.admin_user_permissions (
          admin_user_id,
          permission_id,
          granted_by
        ) VALUES (
          p_admin_user_id,
          v_perm_id,
          v_caller_admin_id
        );

        v_new_permissions_text := array_append(v_new_permissions_text, v_perm::text);
      END IF;
    END LOOP;
  END IF;

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
    'admin.permissions_update',
    'admin_user',
    p_admin_user_id,
    jsonb_build_object('permissions', coalesce(v_prev_permissions, ARRAY[]::text[])),
    jsonb_build_object('permissions', v_new_permissions_text),
    p_reason,
    jsonb_build_object('updated_by', v_caller_admin_id)
  );

  RETURN true;
END;
$$;

COMMENT ON FUNCTION public.update_admin_permissions IS
  'Superadmin-only procedure to atomically reassign admin permissions with audit trail. §13, §19, §67';


-- ---------------------------------------------------------------------------
-- 4. CHECK ADMIN ACCESS (Any authenticated admin user)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_admin_access(p_user_id uuid DEFAULT auth.uid())
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_user public.admin_users%ROWTYPE;
  v_perms text[];
  v_requires_mfa boolean := false;
BEGIN
  SELECT * INTO v_admin_user
  FROM public.admin_users
  WHERE user_id = p_user_id;

  IF v_admin_user.id IS NULL THEN
    RETURN jsonb_build_object(
      'is_admin', false,
      'is_superadmin', false,
      'status', NULL,
      'permissions', ARRAY[]::text[],
      'mfa_enrolled', false,
      'requires_mfa', false
    );
  END IF;

  -- If superadmin, all permissions apply implicitly
  IF v_admin_user.is_superadmin THEN
    SELECT array_agg(permission_key::text) INTO v_perms
    FROM public.admin_permissions;
    v_requires_mfa := true; -- §23: mandatory for Superadmin
  ELSE
    SELECT array_agg(ap.permission_key::text) INTO v_perms
    FROM public.admin_user_permissions aup
    JOIN public.admin_permissions ap ON ap.id = aup.permission_id
    WHERE aup.admin_user_id = v_admin_user.id;

    -- §23: mandatory for Finance Admin
    IF v_perms IS NOT NULL AND 'finance' = ANY(v_perms) THEN
      v_requires_mfa := true;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'is_admin', true,
    'admin_id', v_admin_user.id,
    'is_superadmin', v_admin_user.is_superadmin,
    'status', v_admin_user.status,
    'permissions', coalesce(v_perms, ARRAY[]::text[]),
    'mfa_enrolled', v_admin_user.mfa_enrolled,
    'requires_mfa', v_requires_mfa
  );
END;
$$;

COMMENT ON FUNCTION public.check_admin_access IS
  'Returns the administrative authorization state, permissions, and MFA requirements for a user. §18, §23';
