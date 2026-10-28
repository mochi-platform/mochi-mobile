-- Matriz gratis/Premium en el servidor e insignia exclusiva de Doménica.

INSERT INTO public.achievements (key, title, description, icon, category, points, is_secret)
VALUES ('musa_de_mochi', 'Musa de Mochi', 'La primera inspiración de Mochi.', 'heart', 'special', 0, true)
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.guard_exclusive_achievements() RETURNS trigger
LANGUAGE plpgsql SET search_path TO 'public'
AS $$
DECLARE
  v_key text;
BEGIN
  SELECT key INTO v_key FROM public.achievements WHERE id = NEW.achievement_id;
  IF v_key = 'musa_de_mochi'
     AND current_user NOT IN ('postgres', 'supabase_admin', 'service_role') THEN
    RAISE EXCEPTION 'Logro no disponible';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.guard_exclusive_achievements() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS guard_exclusive_achievements ON public.user_achievements;
CREATE TRIGGER guard_exclusive_achievements BEFORE INSERT ON public.user_achievements
  FOR EACH ROW EXECUTE FUNCTION public.guard_exclusive_achievements();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = 'fd781ba2-0c1c-4b98-bdc8-f29db453fa0d') THEN
    INSERT INTO public.user_achievements (user_id, achievement_id)
    SELECT 'fd781ba2-0c1c-4b98-bdc8-f29db453fa0d', id FROM public.achievements
     WHERE key = 'musa_de_mochi'
       AND NOT EXISTS (SELECT 1 FROM public.user_achievements ua
                       WHERE ua.user_id = 'fd781ba2-0c1c-4b98-bdc8-f29db453fa0d' AND ua.achievement_id = achievements.id);
  END IF;
END $$;

-- get_user_plan expone las funciones disponibles según el plan (la UI solo refleja esto).
CREATE OR REPLACE FUNCTION public.plan_features(p_is_premium boolean) RETURNS jsonb
LANGUAGE sql IMMUTABLE SET search_path TO 'public'
AS $$
  SELECT CASE WHEN p_is_premium THEN
    jsonb_build_object('analytics_history', true, 'analytics_correlation', true, 'themes', true,
                       'duo_plus', true, 'ads', false)
  ELSE
    jsonb_build_object('analytics_history', false, 'analytics_correlation', false, 'themes', false,
                       'duo_plus', false, 'ads', true)
  END;
$$;

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

  SELECT status, current_period_ends_at INTO v_status, v_period_end
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
    'limits', COALESCE(v_limits, '{}'::jsonb),
    'features', plan_features(v_plan_key = 'premium')
  );
END;
$$;
