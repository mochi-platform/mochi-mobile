-- Premium por concesión y IA ilimitada (con tope en el gateway); registro de peticiones del gateway.
CREATE OR REPLACE FUNCTION public.apply_plan_limits_for_ai(p_reason text, p_source_ref text DEFAULT NULL::text, p_metadata jsonb DEFAULT NULL::jsonb) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_plan_key text := 'free';
  v_status text;
  v_period_end timestamptz;
  v_limits ai_usage_limits%ROWTYPE;
  v_today_start timestamptz := date_trunc('day', now() AT TIME ZONE 'utc');
  v_requests_today integer;
  v_balance integer;
  v_consume json;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'reason requerido';
  END IF;

  SELECT status, current_period_ends_at
  INTO v_status, v_period_end
  FROM billing_subscriptions
  WHERE user_id = v_user_id
    AND entitlement_id = 'premium'
  ORDER BY current_period_ends_at DESC NULLS LAST
  LIMIT 1;

  IF has_active_grant(v_user_id, 'premium')
     OR (v_status IN ('active', 'grace_period')
         AND (v_period_end IS NULL OR v_period_end >= now())) THEN
    v_plan_key := 'premium';
  END IF;

  SELECT * INTO v_limits
  FROM ai_usage_limits
  WHERE plan_key = v_plan_key
  LIMIT 1;

  IF v_plan_key = 'free' THEN
    v_consume := consume_ai_credit(p_reason, p_source_ref, p_metadata);
    RETURN json_build_object(
      'plan_key', v_plan_key,
      'allowed', (v_consume->>'allowed')::boolean,
      'balance', COALESCE((v_consume->>'balance')::int, 0),
      'reason', v_consume->>'reason',
      'limits', COALESCE(to_jsonb(v_limits), '{}'::jsonb)
    );
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(v_user_id::text));

  IF v_limits.daily_request_limit IS NOT NULL AND NOT has_active_grant(v_user_id, 'unlimited_ai') THEN
    SELECT COUNT(*) INTO v_requests_today
    FROM ai_credits_ledger
    WHERE user_id = v_user_id
      AND reason LIKE 'ai_%'
      AND created_at >= v_today_start;

    IF v_requests_today >= v_limits.daily_request_limit THEN
      RETURN json_build_object(
        'plan_key', v_plan_key,
        'allowed', false,
        'reason', 'daily_limit',
        'limits', COALESCE(to_jsonb(v_limits), '{}'::jsonb)
      );
    END IF;
  END IF;

  INSERT INTO ai_credits_ledger (
    user_id, delta, reason, source_ref, metadata
  ) VALUES (
    v_user_id,
    0,
    p_reason,
    p_source_ref,
    COALESCE(p_metadata, '{}'::jsonb)
  );

  SELECT COALESCE(SUM(delta), 0) INTO v_balance
  FROM ai_credits_ledger
  WHERE user_id = v_user_id;

  RETURN json_build_object(
    'plan_key', v_plan_key,
    'allowed', true,
    'balance', v_balance,
    'limits', COALESCE(to_jsonb(v_limits), '{}'::jsonb)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.apply_plan_limits_for_ai(text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_plan_limits_for_ai(text, text, jsonb) TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.ai_gateway_requests (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_gateway_requests_user_time_idx ON public.ai_gateway_requests (user_id, created_at DESC);
ALTER TABLE public.ai_gateway_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_gateway_requests FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.ai_gateway_requests TO service_role;

-- Tope antiabuso del gateway: por minuto y por día. Devuelve false si se excede.
CREATE OR REPLACE FUNCTION public.server_ai_gateway_check(p_user_id uuid, p_model text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_day_cap integer := CASE WHEN public.has_active_grant(p_user_id, 'unlimited_ai') THEN 1000 ELSE 300 END;
  v_minute integer;
  v_day integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('aigw' || p_user_id::text));
  SELECT count(*) INTO v_minute FROM public.ai_gateway_requests
    WHERE user_id = p_user_id AND created_at > now() - interval '1 minute';
  IF v_minute >= 20 THEN RETURN false; END IF;
  SELECT count(*) INTO v_day FROM public.ai_gateway_requests
    WHERE user_id = p_user_id AND created_at > now() - interval '1 day';
  IF v_day >= v_day_cap THEN RETURN false; END IF;
  INSERT INTO public.ai_gateway_requests (user_id, model) VALUES (p_user_id, p_model);
  RETURN true;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.server_ai_gateway_check(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_ai_gateway_check(uuid, text) TO service_role;
