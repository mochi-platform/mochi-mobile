-- Fase 1: endurecimiento de seguridad del backend.

-- 1. Premium y créditos por anuncio: solo el servidor (service_role) puede invocarlos.
REVOKE EXECUTE ON FUNCTION public.sync_subscription_from_revenuecat(text, text, text, timestamptz, timestamptz, boolean, text, text, text, text, jsonb, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_ai_credit_from_ad(text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_subscription_from_revenuecat(text, text, text, timestamptz, timestamptz, boolean, text, text, text, text, jsonb, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_ai_credit_from_ad(text, text, text) TO service_role;

-- 2. Concesiones manuales (Premium de por vida, IA ilimitada, etc.).
CREATE TABLE IF NOT EXISTS public.entitlement_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entitlement text NOT NULL,
  reason text,
  granted_by text,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS entitlement_grants_user_ent_uidx ON public.entitlement_grants (user_id, entitlement);
ALTER TABLE public.entitlement_grants ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.entitlement_grants FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.entitlement_grants TO authenticated;
GRANT ALL ON public.entitlement_grants TO service_role;
CREATE POLICY entitlement_grants_select_own ON public.entitlement_grants
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_active_grant(p_user_id uuid, p_entitlement text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.entitlement_grants
    WHERE user_id = p_user_id AND entitlement = p_entitlement
      AND (expires_at IS NULL OR expires_at > now())
  );
$$;
REVOKE EXECUTE ON FUNCTION public.has_active_grant(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_grant(uuid, text) TO service_role;

-- get_user_plan: suscripción activa O concesión vigente.
CREATE OR REPLACE FUNCTION public.get_user_plan() RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_plan_key text := 'free';
  v_status text;
  v_period_end timestamptz;
  v_limits jsonb;
  v_granted boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  SELECT status, current_period_ends_at
  INTO v_status, v_period_end
  FROM billing_subscriptions
  WHERE user_id = v_user_id AND entitlement_id = 'premium'
  ORDER BY current_period_ends_at DESC NULLS LAST
  LIMIT 1;

  v_granted := has_active_grant(v_user_id, 'premium');

  IF v_granted
     OR (v_status IN ('active', 'grace_period')
         AND (v_period_end IS NULL OR v_period_end >= now())) THEN
    v_plan_key := 'premium';
  END IF;

  SELECT to_jsonb(l) INTO v_limits
  FROM (
    SELECT plan_key, monthly_token_budget, daily_request_limit, features
    FROM ai_usage_limits WHERE plan_key = v_plan_key LIMIT 1
  ) l;

  RETURN json_build_object(
    'plan_key', v_plan_key,
    'is_premium', v_plan_key = 'premium',
    'status', CASE WHEN v_granted THEN 'granted' ELSE v_status END,
    'current_period_ends_at', v_period_end,
    'limits', COALESCE(v_limits, '{}'::jsonb)
  );
END;
$$;

-- 3. Tokens heredados: nadie se inserta tokens.
DROP POLICY IF EXISTS token_transactions_insert_own ON public.token_transactions;
REVOKE INSERT, UPDATE, DELETE ON public.token_transactions FROM anon, authenticated;

-- 4. Duo: los espacios solo se modifican mediante RPC SECURITY DEFINER.
REVOKE INSERT, UPDATE, DELETE ON public.partner_spaces FROM anon, authenticated;

-- 5. Guard de user_settings realmente asociado.
DROP TRIGGER IF EXISTS guard_user_settings_private_flags ON public.user_settings;
CREATE TRIGGER guard_user_settings_private_flags
  BEFORE INSERT OR UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.guard_user_settings_private_flags();

-- 6. Admin: is_admin solo cambia con service_role.
CREATE OR REPLACE FUNCTION public.set_admin(p_user_id uuid, p_value boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.profiles SET is_admin = p_value WHERE id = p_user_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.set_admin(uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_admin(uuid, boolean) TO service_role;

-- 7. Permisos de ejecución y search_path fijo en todas las funciones de public.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid, p.oid::regprocedure AS sig, p.prorettype, p.proconfig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prokind = 'f'
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', r.sig);
    IF r.prorettype = 'trigger'::regtype THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM authenticated', r.sig);
    END IF;
    IF r.proconfig IS NULL OR NOT EXISTS (
      SELECT 1 FROM unnest(r.proconfig) c WHERE c LIKE 'search_path=%'
    ) THEN
      EXECUTE format('ALTER FUNCTION %s SET search_path = public', r.sig);
    END IF;
  END LOOP;
END $$;
