-- =============================================================================
-- MENIAL — DYNAMIC RUNTIME INTEGRATION PROVIDERS & SWITCHBOARD
-- =============================================================================
-- Migration: 20260926130000_dynamic_integration_providers.sql
-- Purpose:   Runtime database-backed external provider switchboard for Payments,
--            SMS/OTP, and Identity/KYC. Enables Superadmin to switch providers,
--            update API keys/secrets, and toggle sandbox/live modes without
--            redeploying code or editing configuration files.
-- Reference: menial-master-spec-v2.md (Sections 5, 8, 22, 39, 41, 66, 67, 72)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. INTEGRATION PROVIDERS TABLE
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.integration_providers (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category            text NOT NULL CHECK (category IN ('payment', 'sms', 'kyc')),
  provider_id         text NOT NULL, -- e.g. 'paystack', 'flutterwave', 'monnify', 'mock', 'termii', 'twilio', 'africastalking', 'prembly', 'dojah'
  provider_name       text NOT NULL,
  is_active           boolean NOT NULL DEFAULT false,
  environment         text NOT NULL DEFAULT 'sandbox' CHECK (environment IN ('sandbox', 'live')),
  config              jsonb NOT NULL DEFAULT '{}'::jsonb, -- non-sensitive: base_url, sender_id, account_sid, public_key
  encrypted_secrets   jsonb NOT NULL DEFAULT '{}'::jsonb, -- sensitive: secret_key, webhook_secret, api_key, auth_token
  updated_by          uuid REFERENCES public.admin_users(id),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  created_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_integration_category_provider UNIQUE (category, provider_id)
);

COMMENT ON TABLE public.integration_providers IS
  'Runtime provider configuration and encrypted credentials for Payment, SMS, and KYC switchboard. §66';

-- Enable RLS
ALTER TABLE public.integration_providers ENABLE ROW LEVEL SECURITY;

-- Service role has full access
CREATE POLICY integration_providers_service_role ON public.integration_providers
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Authenticated superadmins have read access through SECURITY DEFINER RPCs (no direct table access)
CREATE POLICY integration_providers_no_direct_client_access ON public.integration_providers
  FOR ALL TO authenticated USING (false);

-- ---------------------------------------------------------------------------
-- 2. SEED DEFAULT PROVIDERS
-- ---------------------------------------------------------------------------
INSERT INTO public.integration_providers (category, provider_id, provider_name, is_active, environment, config, encrypted_secrets)
VALUES
  -- Payments
  ('payment', 'mock', 'Development Sandbox (Mock)', true, 'sandbox', '{"name": "Local Sandbox Mock"}'::jsonb, '{}'::jsonb),
  ('payment', 'paystack', 'Paystack Nigeria', false, 'sandbox', '{"base_url": "https://api.paystack.co", "currency": "NGN"}'::jsonb, '{"public_key": "", "secret_key": "", "webhook_secret": ""}'::jsonb),
  ('payment', 'flutterwave', 'Flutterwave v3', false, 'sandbox', '{"base_url": "https://api.flutterwave.com/v3", "currency": "NGN"}'::jsonb, '{"public_key": "", "secret_key": "", "webhook_secret": ""}'::jsonb),
  ('payment', 'monnify', 'Monnify by TeamApt', false, 'sandbox', '{"base_url": "https://api.monnify.com"}'::jsonb, '{"api_key": "", "secret_key": "", "contract_code": ""}'::jsonb),
  
  -- SMS & OTP
  ('sms', 'mock', 'Development Sandbox (Mock)', true, 'sandbox', '{"name": "Local Simulated SMS"}'::jsonb, '{}'::jsonb),
  ('sms', 'termii', 'Termii Nigeria SMS', false, 'sandbox', '{"base_url": "https://api.ng.termii.com/api", "sender_id": "Menial", "channel": "dnd"}'::jsonb, '{"api_key": ""}'::jsonb),
  ('sms', 'twilio', 'Twilio Global SMS', false, 'sandbox', '{"base_url": "https://api.twilio.com"}'::jsonb, '{"account_sid": "", "auth_token": "", "from_number": ""}'::jsonb),
  ('sms', 'africastalking', 'Africa''s Talking', false, 'sandbox', '{"base_url": "https://api.africastalking.com/version1"}'::jsonb, '{"username": "sandbox", "api_key": "", "sender_id": "Menial"}'::jsonb),
  
  -- Identity / KYC
  ('kyc', 'mock', 'Development Sandbox (Mock)', true, 'sandbox', '{"name": "Local KYC Sandbox"}'::jsonb, '{}'::jsonb),
  ('kyc', 'prembly', 'Prembly (Identitypass)', false, 'sandbox', '{"base_url": "https://api.identitypass.com/api/v1"}'::jsonb, '{"app_id": "", "api_key": ""}'::jsonb),
  ('kyc', 'dojah', 'Dojah KYC Nigeria', false, 'sandbox', '{"base_url": "https://api.dojah.io/api/v1"}'::jsonb, '{"app_id": "", "api_key": ""}'::jsonb)
ON CONFLICT (category, provider_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. GET INTEGRATION PROVIDERS RPC (Superadmin Only, Masked Secrets)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_superadmin_integration_providers()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows jsonb;
BEGIN
  -- Strict Superadmin check (§14, §72)
  IF NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'Unauthorized: Superadmin authority required (§14, §72).';
  END IF;

  SELECT coalesce(jsonb_agg(r ORDER BY r.category, r.is_active DESC, r.provider_name), '[]'::jsonb)
  INTO v_rows
  FROM (
    SELECT
      ip.id,
      ip.category,
      ip.provider_id,
      ip.provider_name,
      ip.is_active,
      ip.environment,
      ip.config,
      -- Mask sensitive secrets so full secrets are never returned to client: sk_live_••••••382a
      (
        SELECT jsonb_object_agg(
          key,
          CASE
            WHEN length(value) <= 8 THEN '••••••••'
            ELSE substr(value, 1, 7) || '••••••••' || substr(value, length(value) - 3)
          END
        )
        FROM jsonb_each_text(ip.encrypted_secrets)
      ) AS masked_secrets,
      ip.updated_at,
      p.full_name AS updated_by_name
    FROM public.integration_providers ip
    LEFT JOIN public.admin_users au ON au.id = ip.updated_by
    LEFT JOIN public.profiles p ON p.id = au.user_id
  ) r;

  RETURN v_rows;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. UPDATE INTEGRATION PROVIDER RPC (Superadmin Only, Audited §66, §67)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_superadmin_integration_provider(
  p_category text,
  p_provider_id text,
  p_is_active boolean,
  p_environment text,
  p_config jsonb,
  p_secrets jsonb,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_admin_id uuid;
  v_old_row public.integration_providers%ROWTYPE;
  v_merged_secrets jsonb;
  v_secret_key text;
  v_secret_val text;
BEGIN
  -- 1. Strict Superadmin check (§14, §72)
  IF NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'Unauthorized: Superadmin authority required (§14, §72).';
  END IF;

  -- 2. Audit rationale is mandatory (§66, §67)
  IF p_reason IS NULL OR length(trim(p_reason)) < 5 THEN
    RAISE EXCEPTION 'A security audit rationale (min 5 characters) is mandatory (§66).';
  END IF;

  -- 3. Get caller admin_user id
  SELECT id INTO v_caller_admin_id
  FROM public.admin_users
  WHERE user_id = auth.uid() AND is_superadmin = true;

  -- 4. Retrieve existing row
  SELECT * INTO v_old_row
  FROM public.integration_providers
  WHERE category = p_category AND provider_id = p_provider_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Provider "%" in category "%" not found.', p_provider_id, p_category;
  END IF;

  -- 5. Merge secrets safely (do not overwrite existing secret if incoming value contains masked characters)
  v_merged_secrets := v_old_row.encrypted_secrets;
  IF p_secrets IS NOT NULL THEN
    FOR v_secret_key, v_secret_val IN SELECT * FROM jsonb_each_text(p_secrets)
    LOOP
      IF v_secret_val IS NOT NULL AND v_secret_val NOT LIKE '%••••%' AND trim(v_secret_val) <> '' THEN
        v_merged_secrets := jsonb_set(v_merged_secrets, ARRAY[v_secret_key], to_jsonb(v_secret_val));
      END IF;
    END LOOP;
  END IF;

  -- 6. If activating this provider, atomically deactivate all other providers in the same category
  IF p_is_active = true THEN
    UPDATE public.integration_providers
    SET is_active = false, updated_at = now()
    WHERE category = p_category AND provider_id <> p_provider_id;
  END IF;

  -- 7. Update provider record
  UPDATE public.integration_providers
  SET
    is_active = coalesce(p_is_active, is_active),
    environment = coalesce(p_environment, environment),
    config = coalesce(p_config, config),
    encrypted_secrets = v_merged_secrets,
    updated_by = v_caller_admin_id,
    updated_at = now()
  WHERE category = p_category AND provider_id = p_provider_id;

  -- 8. Write immutable audit log entry (§67)
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
    'integration_provider.update',
    'integration_provider',
    p_category || ':' || p_provider_id,
    jsonb_build_object(
      'is_active', v_old_row.is_active,
      'environment', v_old_row.environment,
      'config', v_old_row.config
    ),
    jsonb_build_object(
      'is_active', p_is_active,
      'environment', p_environment,
      'config', p_config
    ),
    p_reason,
    jsonb_build_object(
      'category', p_category,
      'provider_id', p_provider_id
    )
  );

  RETURN jsonb_build_object('success', true, 'provider_id', p_provider_id, 'is_active', p_is_active);
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. GET ACTIVE INTEGRATION PROVIDER (Backend internal / service_role)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_active_integration_provider(p_category text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row jsonb;
BEGIN
  SELECT jsonb_build_object(
    'provider_id', provider_id,
    'provider_name', provider_name,
    'environment', environment,
    'config', config,
    'secrets', encrypted_secrets
  ) INTO v_row
  FROM public.integration_providers
  WHERE category = p_category AND is_active = true
  LIMIT 1;

  -- Fallback to mock if nothing is active
  IF v_row IS NULL THEN
    RETURN jsonb_build_object(
      'provider_id', 'mock',
      'provider_name', 'Default Mock Provider',
      'environment', 'sandbox',
      'config', '{}'::jsonb,
      'secrets', '{}'::jsonb
    );
  END IF;

  RETURN v_row;
END;
$$;
