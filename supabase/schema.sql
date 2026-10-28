


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."accept_partner_invite"("p_invite_code" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_space partner_spaces%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  SELECT * INTO v_space
  FROM partner_spaces
  WHERE invite_code = p_invite_code
    AND invite_status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Codigo de invitacion invalido o ya usado';
  END IF;

  IF v_space.owner_user_id = auth.uid() THEN
    RAISE EXCEPTION 'No puedes aceptar tu propia invitacion';
  END IF;

  UPDATE partner_spaces
  SET partner_user_id = auth.uid(),
      invite_status = 'accepted',
      updated_at = now()
  WHERE id = v_space.id;

  UPDATE user_settings
  SET partner_features_enabled = true
  WHERE user_id IN (v_space.owner_user_id, auth.uid());

  RETURN json_build_object('space_id', v_space.id, 'success', true);
END;
$$;


ALTER FUNCTION "public"."accept_partner_invite"("p_invite_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_dashboard_stats"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_users_total bigint;
  v_sessions_7d bigint;
  v_exams_upcoming bigint;
  v_tokens_24h bigint;
  v_shared_spaces bigint;
begin
  if not public.is_admin_user() then
    raise exception 'Not authorized';
  end if;

  select count(*) into v_users_total from public.profiles;

  select count(*)
    into v_sessions_7d
  from public.study_sessions ss
  where ss.completed_at >= now() - interval '7 days';

  select count(*)
    into v_exams_upcoming
  from public.exam_logs el
  where coalesce(el.is_upcoming, true) = true
    and el.exam_date >= current_date;

  select coalesce(sum(tt.amount), 0)
    into v_tokens_24h
  from public.token_transactions tt
  where tt.created_at >= now() - interval '24 hours';

  select count(*)
    into v_shared_spaces
  from public.shared_spaces;

  return jsonb_build_object(
    'users_total', v_users_total,
    'study_sessions_last_7d', v_sessions_7d,
    'upcoming_exams', v_exams_upcoming,
    'tokens_net_last_24h', v_tokens_24h,
    'shared_spaces_total', v_shared_spaces,
    'generated_at', now()
  );
end;
$$;


ALTER FUNCTION "public"."admin_dashboard_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."apply_plan_limits_for_ai"("p_reason" "text", "p_source_ref" "text" DEFAULT NULL::"text", "p_metadata" "jsonb" DEFAULT NULL::"jsonb") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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

  IF v_status IN ('active', 'grace_period')
     AND (v_period_end IS NULL OR v_period_end >= now()) THEN
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

  IF v_limits.daily_request_limit IS NOT NULL THEN
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


ALTER FUNCTION "public"."apply_plan_limits_for_ai"("p_reason" "text", "p_source_ref" "text", "p_metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_access_space"("p_shared_space_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.shared_space_members m
    where m.shared_space_id = p_shared_space_id
      and m.user_id = auth.uid()
  );
$$;


ALTER FUNCTION "public"."can_access_space"("p_shared_space_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."claim_ai_credit_from_ad"("p_reward_event_id" "text", "p_ad_network" "text" DEFAULT NULL::"text", "p_ad_unit_id" "text" DEFAULT NULL::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_today date := (now() AT TIME ZONE 'utc')::date;
  v_daily_limit integer := 5;
  v_claimed_today integer;
  v_balance integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  IF p_reward_event_id IS NULL OR length(trim(p_reward_event_id)) = 0 THEN
    RAISE EXCEPTION 'reward_event_id requerido';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(v_user_id::text));

  IF EXISTS (
    SELECT 1 FROM ai_ad_rewards_daily
    WHERE user_id = v_user_id AND reward_event_id = p_reward_event_id
  ) THEN
    SELECT COUNT(*) INTO v_claimed_today
    FROM ai_ad_rewards_daily
    WHERE user_id = v_user_id AND day_key = v_today;

    SELECT COALESCE(SUM(delta), 0) INTO v_balance
    FROM ai_credits_ledger
    WHERE user_id = v_user_id;

    RETURN json_build_object(
      'allowed', true,
      'already_claimed', true,
      'balance', v_balance,
      'daily_limit', v_daily_limit,
      'claimed_today', v_claimed_today,
      'remaining_today', GREATEST(v_daily_limit - v_claimed_today, 0)
    );
  END IF;

  SELECT COUNT(*) INTO v_claimed_today
  FROM ai_ad_rewards_daily
  WHERE user_id = v_user_id AND day_key = v_today;

  IF v_claimed_today >= v_daily_limit THEN
    SELECT COALESCE(SUM(delta), 0) INTO v_balance
    FROM ai_credits_ledger
    WHERE user_id = v_user_id;

    RETURN json_build_object(
      'allowed', false,
      'reason', 'daily_limit',
      'balance', v_balance,
      'daily_limit', v_daily_limit,
      'claimed_today', v_claimed_today,
      'remaining_today', 0
    );
  END IF;

  INSERT INTO ai_ad_rewards_daily (
    user_id, day_key, ad_network, ad_unit_id, reward_event_id, rewarded_at
  ) VALUES (
    v_user_id, v_today, p_ad_network, p_ad_unit_id, p_reward_event_id, now()
  );

  INSERT INTO ai_credits_ledger (
    user_id, delta, reason, source_ref, metadata
  ) VALUES (
    v_user_id,
    1,
    'ad_reward',
    p_reward_event_id,
    jsonb_build_object(
      'ad_network', p_ad_network,
      'ad_unit_id', p_ad_unit_id
    )
  );

  SELECT COUNT(*) INTO v_claimed_today
  FROM ai_ad_rewards_daily
  WHERE user_id = v_user_id AND day_key = v_today;

  SELECT COALESCE(SUM(delta), 0) INTO v_balance
  FROM ai_credits_ledger
  WHERE user_id = v_user_id;

  RETURN json_build_object(
    'allowed', true,
    'already_claimed', false,
    'balance', v_balance,
    'daily_limit', v_daily_limit,
    'claimed_today', v_claimed_today,
    'remaining_today', GREATEST(v_daily_limit - v_claimed_today, 0)
  );
END;
$$;


ALTER FUNCTION "public"."claim_ai_credit_from_ad"("p_reward_event_id" "text", "p_ad_network" "text", "p_ad_unit_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."consume_ai_credit"("p_reason" "text", "p_source_ref" "text" DEFAULT NULL::"text", "p_metadata" "jsonb" DEFAULT NULL::"jsonb") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_balance integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'reason requerido';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(v_user_id::text));

  SELECT COALESCE(SUM(delta), 0) INTO v_balance
  FROM ai_credits_ledger
  WHERE user_id = v_user_id;

  IF v_balance <= 0 THEN
    RETURN json_build_object(
      'allowed', false,
      'reason', 'no_credits',
      'balance', v_balance
    );
  END IF;

  INSERT INTO ai_credits_ledger (
    user_id, delta, reason, source_ref, metadata
  ) VALUES (
    v_user_id,
    -1,
    p_reason,
    p_source_ref,
    COALESCE(p_metadata, '{}'::jsonb)
  );

  SELECT COALESCE(SUM(delta), 0) INTO v_balance
  FROM ai_credits_ledger
  WHERE user_id = v_user_id;

  RETURN json_build_object(
    'allowed', true,
    'balance', v_balance
  );
END;
$$;


ALTER FUNCTION "public"."consume_ai_credit"("p_reason" "text", "p_source_ref" "text", "p_metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_partner_invite"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_code text;
  v_exists boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  IF EXISTS (
    SELECT 1 FROM partner_spaces
    WHERE (owner_user_id = auth.uid() OR partner_user_id = auth.uid())
      AND invite_status = 'accepted'
  ) THEN
    RAISE EXCEPTION 'Ya tienes un espacio de pareja activo';
  END IF;

  LOOP
    v_code := upper(substring(md5(random()::text) FROM 1 FOR 8));
    SELECT EXISTS(SELECT 1 FROM partner_spaces WHERE invite_code = v_code) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;

  INSERT INTO partner_spaces (owner_user_id, invite_code, partner_role)
  VALUES (auth.uid(), v_code, 'male_lite');

  RETURN v_code;
END;
$$;


ALTER FUNCTION "public"."create_partner_invite"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_admin_active_users_daily"("days_back" integer DEFAULT 30) RETURNS TABLE("day" "date", "active_users" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT DATE(s.completed_at) AS day, COUNT(DISTINCT s.user_id) AS active_users
  FROM study_sessions s
  WHERE s.completed_at >= now() - make_interval(days => days_back)
  GROUP BY DATE(s.completed_at)
  ORDER BY DATE(s.completed_at) ASC;
END;
$$;


ALTER FUNCTION "public"."get_admin_active_users_daily"("days_back" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_admin_stats"() RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN json_build_object(
    'total_users', (SELECT COUNT(*) FROM profiles),
    'active_last_7_days', (
      SELECT COUNT(DISTINCT user_id) FROM study_sessions
      WHERE completed_at >= now() - interval '7 days'
    ),
    'total_recipes', (SELECT COUNT(*) FROM recipes),
    'total_study_sessions', (SELECT COUNT(*) FROM study_sessions),
    'total_points_awarded', (SELECT COALESCE(SUM(total_points), 0) FROM profiles),
    'vouchers_generated', (SELECT COUNT(*) FROM vouchers),
    'vouchers_redeemed', (SELECT COUNT(*) FROM vouchers WHERE is_redeemed = true)
  );
END;
$$;


ALTER FUNCTION "public"."get_admin_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_admin_users"("page_limit" integer DEFAULT 20, "page_offset" integer DEFAULT 0) RETURNS TABLE("id" "uuid", "full_name" "text", "wake_up_time" time without time zone, "total_points" integer, "is_admin" boolean, "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    p.wake_up_time,
    p.total_points,
    p.is_admin,
    (SELECT u.created_at FROM auth.users u WHERE u.id = p.id)
  FROM profiles p
  ORDER BY p.total_points DESC
  LIMIT page_limit OFFSET page_offset;
END;
$$;


ALTER FUNCTION "public"."get_admin_users"("page_limit" integer, "page_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_ai_credit_balance"() RETURNS json
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_today date := (now() AT TIME ZONE 'utc')::date;
  v_daily_limit integer := 5;
  v_claimed_today integer;
  v_balance integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  SELECT COUNT(*) INTO v_claimed_today
  FROM ai_ad_rewards_daily
  WHERE user_id = v_user_id AND day_key = v_today;

  SELECT COALESCE(SUM(delta), 0) INTO v_balance
  FROM ai_credits_ledger
  WHERE user_id = v_user_id;

  RETURN json_build_object(
    'balance', v_balance,
    'daily_limit', v_daily_limit,
    'claimed_today', v_claimed_today,
    'remaining_today', GREATEST(v_daily_limit - v_claimed_today, 0)
  );
END;
$$;


ALTER FUNCTION "public"."get_ai_credit_balance"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_partner_space_snapshot"("p_space_id" "uuid") RETURNS json
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT json_build_object(
    'cycle_phase', (
      SELECT CASE
        WHEN cl.period_start_date IS NULL THEN 'unknown'
        WHEN current_date < cl.period_start_date THEN 'unknown'
        WHEN current_date < cl.period_start_date + 5 THEN 'menstrual'
        WHEN current_date < cl.period_start_date + 14 THEN 'folicular'
        WHEN current_date < cl.period_start_date + 17 THEN 'ovulatoria'
        WHEN current_date <= cl.period_start_date + COALESCE(cl.cycle_length, 28) THEN 'lutea'
        ELSE 'unknown'
      END
      FROM cycle_logs cl
      WHERE cl.user_id = ps.owner_user_id
      ORDER BY cl.period_start_date DESC
      LIMIT 1
    ),
    'study_week', (
      SELECT COALESCE(SUM(duration_seconds), 0)
      FROM study_sessions
      WHERE user_id = ps.owner_user_id
        AND completed_at >= now() - interval '7 days'
    ),
    'exercise_week', (
      SELECT COUNT(*)
      FROM routine_logs
      WHERE user_id = ps.owner_user_id
        AND completed_at >= now() - interval '7 days'
    ),
    'habits_week', (
      SELECT COUNT(*)
      FROM habit_logs
      WHERE user_id = ps.owner_user_id
        AND log_date >= current_date - 7
    ),
    'mood_last', (
      SELECT mood
      FROM mood_logs
      WHERE user_id = ps.owner_user_id
      ORDER BY logged_date DESC
      LIMIT 1
    ),
    'cooking_week', (
      SELECT COUNT(*)
      FROM recipe_cook_sessions
      WHERE user_id = ps.owner_user_id
        AND is_finished = true
        AND created_at >= now() - interval '7 days'
    )
  )
  FROM partner_spaces ps
  WHERE ps.id = p_space_id
    AND ps.invite_status = 'accepted'
    AND (ps.owner_user_id = auth.uid() OR ps.partner_user_id = auth.uid());
$$;


ALTER FUNCTION "public"."get_partner_space_snapshot"("p_space_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_plan"() RETURNS json
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_plan_key text := 'free';
  v_status text;
  v_period_end timestamptz;
  v_limits jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  SELECT status, current_period_ends_at
  INTO v_status, v_period_end
  FROM billing_subscriptions
  WHERE user_id = v_user_id
    AND entitlement_id = 'premium'
  ORDER BY current_period_ends_at DESC NULLS LAST
  LIMIT 1;

  IF v_status IN ('active', 'grace_period')
     AND (v_period_end IS NULL OR v_period_end >= now()) THEN
    v_plan_key := 'premium';
  END IF;

  SELECT to_jsonb(l) INTO v_limits
  FROM (
    SELECT plan_key, monthly_token_budget, daily_request_limit, features
    FROM ai_usage_limits
    WHERE plan_key = v_plan_key
    LIMIT 1
  ) l;

  RETURN json_build_object(
    'plan_key', v_plan_key,
    'is_premium', v_plan_key = 'premium',
    'status', v_status,
    'current_period_ends_at', v_period_end,
    'limits', COALESCE(v_limits, '{}'::jsonb)
  );
END;
$$;


ALTER FUNCTION "public"."get_user_plan"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."grant_mochi_tokens"("p_user_id" "uuid", "p_amount" integer, "p_source" "text", "p_note" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_user_tier text;
  v_limit integer;
  v_today integer;
  v_balance integer;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Not authorized';
  end if;

  if p_amount <= 0 then
    raise exception 'Amount must be positive';
  end if;

  insert into public.user_token_tiers (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select tier
    into v_user_tier
  from public.user_token_tiers
  where user_id = p_user_id
  limit 1;

  v_limit := public.token_daily_limit(coalesce(v_user_tier, 'free'));

  select coalesce(sum(tt.amount), 0)
    into v_today
  from public.token_transactions tt
  where tt.user_id = p_user_id
    and tt.amount > 0
    and tt.created_at >= date_trunc('day', now())
    and tt.created_at < date_trunc('day', now()) + interval '1 day';

  if v_today + p_amount > v_limit then
    raise exception 'Daily token limit reached for tier %', coalesce(v_user_tier, 'free');
  end if;

  insert into public.token_transactions (user_id, amount, source, note)
  values (p_user_id, p_amount, p_source, p_note);

  select coalesce(sum(tt.amount), 0)
    into v_balance
  from public.token_transactions tt
  where tt.user_id = p_user_id;

  return jsonb_build_object(
    'tier', coalesce(v_user_tier, 'free'),
    'daily_limit', v_limit,
    'earned_today', v_today + p_amount,
    'remaining_today', greatest(v_limit - (v_today + p_amount), 0),
    'balance', v_balance
  );
end;
$$;


ALTER FUNCTION "public"."grant_mochi_tokens"("p_user_id" "uuid", "p_amount" integer, "p_source" "text", "p_note" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."guard_user_settings_private_flags"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  jwt_role text := COALESCE(current_setting('request.jwt.claim.role', true), '');
  is_privileged boolean := (
    jwt_role = 'service_role'
    OR current_user IN ('postgres', 'supabase_admin')
  );
BEGIN
  -- Defensa en profundidad: si partner_features_enabled es false, vouchers_enabled debe ser false.
  IF COALESCE(NEW.partner_features_enabled, FALSE) = FALSE THEN
    NEW.vouchers_enabled := FALSE;
  END IF;

  -- Deny-by-default para roles no privilegiados sobre flags privadas.
  IF NOT is_privileged THEN
    IF TG_OP = 'INSERT' THEN
      IF COALESCE(NEW.partner_features_enabled, FALSE) IS DISTINCT FROM FALSE
         OR COALESCE(NEW.vouchers_enabled, FALSE) IS DISTINCT FROM FALSE THEN
        RAISE EXCEPTION 'No tienes permiso para establecer partner_features_enabled o vouchers_enabled.';
      END IF;
    ELSIF TG_OP = 'UPDATE' THEN
      IF NEW.partner_features_enabled IS DISTINCT FROM OLD.partner_features_enabled
         OR NEW.vouchers_enabled IS DISTINCT FROM OLD.vouchers_enabled THEN
        RAISE EXCEPTION 'No tienes permiso para modificar partner_features_enabled o vouchers_enabled.';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."guard_user_settings_private_flags"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user_settings"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.user_settings (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user_settings"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."import_public_recipe"("p_publication_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_publication public.recipe_publications%rowtype;
  v_recipe_id uuid;
  v_ingredient jsonb;
  v_step jsonb;
  v_order_index integer;
begin
  if auth.uid() is null then
    raise exception 'Not authorized';
  end if;

  select *
    into v_publication
  from public.recipe_publications
  where id = p_publication_id
    and is_published = true
  limit 1;

  if not found then
    raise exception 'Publication not found';
  end if;

  insert into public.recipes (
    user_id,
    title,
    description,
    total_time_minutes,
    prep_time_minutes,
    cook_time_minutes,
    servings,
    difficulty,
    cuisine_type,
    tags,
    user_prompt,
    personal_notes,
    is_favorite,
    image_url
  ) values (
    auth.uid(),
    v_publication.title,
    v_publication.description,
    v_publication.total_time_minutes,
    v_publication.prep_time_minutes,
    v_publication.cook_time_minutes,
    v_publication.servings,
    v_publication.difficulty,
    v_publication.cuisine_type,
    v_publication.tags,
    'Importada del catálogo público | Tipo: ' || v_publication.generation_type || ' | Personas: ' || v_publication.servings || ' | Complejidad: ' || v_publication.difficulty,
    null,
    false,
    v_publication.image_url
  )
  returning id into v_recipe_id;

  for v_ingredient in
    select value
    from jsonb_array_elements(v_publication.ingredients_snapshot) as value
  loop
    v_order_index := coalesce((v_ingredient->>'order_index')::integer, 0);

    insert into public.recipe_ingredients (
      recipe_id,
      order_index,
      name,
      amount,
      unit,
      notes
    ) values (
      v_recipe_id,
      v_order_index,
      coalesce(v_ingredient->>'name', ''),
      nullif(v_ingredient->>'amount', '')::numeric,
      nullif(v_ingredient->>'unit', ''),
      nullif(v_ingredient->>'notes', '')
    );
  end loop;

  for v_step in
    select value
    from jsonb_array_elements(v_publication.steps_snapshot) as value
  loop
    insert into public.recipe_steps (
      recipe_id,
      step_number,
      title,
      instructions,
      duration_seconds,
      temperature,
      tip
    ) values (
      v_recipe_id,
      coalesce((v_step->>'step_number')::integer, 0),
      coalesce(v_step->>'title', ''),
      coalesce(v_step->>'instructions', ''),
      nullif(v_step->>'duration_seconds', '')::integer,
      nullif(v_step->>'temperature', ''),
      nullif(v_step->>'tip', '')
    );
  end loop;

  return v_recipe_id;
end;
$$;


ALTER FUNCTION "public"."import_public_recipe"("p_publication_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_points"("user_id" "uuid", "points" integer) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> increment_points.user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF points IS NULL OR points <= 0 OR points > 100 THEN
    RAISE EXCEPTION 'Invalid points amount';
  END IF;

  UPDATE public.profiles
  SET total_points = COALESCE(total_points, 0) + points
  WHERE id = increment_points.user_id;
END;
$$;


ALTER FUNCTION "public"."increment_points"("user_id" "uuid", "points" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin_user"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and coalesce(p.is_admin, false) = true
  );
$$;


ALTER FUNCTION "public"."is_admin_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."leave_partner_space"("p_space_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_other_user uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  SELECT CASE
    WHEN owner_user_id = auth.uid() THEN partner_user_id
    ELSE owner_user_id
  END INTO v_other_user
  FROM partner_spaces
  WHERE id = p_space_id
    AND (owner_user_id = auth.uid() OR partner_user_id = auth.uid());

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Espacio no encontrado';
  END IF;

  UPDATE partner_spaces
  SET invite_status = 'cancelled',
      updated_at = now()
  WHERE id = p_space_id;

  UPDATE user_settings
  SET partner_features_enabled = false
  WHERE user_id IN (auth.uid(), v_other_user);
END;
$$;


ALTER FUNCTION "public"."leave_partner_space"("p_space_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."publish_recipe_to_catalog"("p_recipe_id" "uuid", "p_generation_type" "text" DEFAULT 'normal'::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_recipe public.recipes%rowtype;
  v_owner_name text := '';
  v_ingredients jsonb := '[]'::jsonb;
  v_steps jsonb := '[]'::jsonb;
  v_publication_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authorized';
  end if;

  select *
    into v_recipe
  from public.recipes
  where id = p_recipe_id
    and user_id = auth.uid()
  limit 1;

  if not found then
    raise exception 'Recipe not found';
  end if;

  select coalesce(p.full_name, '')
    into v_owner_name
  from public.profiles p
  where p.id = auth.uid();

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'order_index', ri.order_index,
        'name', ri.name,
        'amount', ri.amount,
        'unit', ri.unit,
        'notes', ri.notes
      ) order by ri.order_index
    ),
    '[]'::jsonb
  )
    into v_ingredients
  from public.recipe_ingredients ri
  where ri.recipe_id = p_recipe_id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'step_number', rs.step_number,
        'title', rs.title,
        'instructions', rs.instructions,
        'duration_seconds', rs.duration_seconds,
        'temperature', rs.temperature,
        'tip', rs.tip
      ) order by rs.step_number
    ),
    '[]'::jsonb
  )
    into v_steps
  from public.recipe_steps rs
  where rs.recipe_id = p_recipe_id;

  insert into public.recipe_publications (
    source_recipe_id,
    owner_id,
    owner_name,
    title,
    description,
    total_time_minutes,
    prep_time_minutes,
    cook_time_minutes,
    servings,
    difficulty,
    cuisine_type,
    generation_type,
    tags,
    image_url,
    ingredients_snapshot,
    steps_snapshot,
    is_published,
    published_at,
    updated_at
  ) values (
    v_recipe.id,
    v_recipe.user_id,
    v_owner_name,
    v_recipe.title,
    v_recipe.description,
    v_recipe.total_time_minutes,
    v_recipe.prep_time_minutes,
    v_recipe.cook_time_minutes,
    v_recipe.servings,
    v_recipe.difficulty,
    v_recipe.cuisine_type,
    coalesce(nullif(p_generation_type, ''), 'normal'),
    v_recipe.tags,
    v_recipe.image_url,
    v_ingredients,
    v_steps,
    true,
    now(),
    now()
  )
  on conflict (source_recipe_id) do update set
    owner_id = excluded.owner_id,
    owner_name = excluded.owner_name,
    title = excluded.title,
    description = excluded.description,
    total_time_minutes = excluded.total_time_minutes,
    prep_time_minutes = excluded.prep_time_minutes,
    cook_time_minutes = excluded.cook_time_minutes,
    servings = excluded.servings,
    difficulty = excluded.difficulty,
    cuisine_type = excluded.cuisine_type,
    generation_type = excluded.generation_type,
    tags = excluded.tags,
    image_url = excluded.image_url,
    ingredients_snapshot = excluded.ingredients_snapshot,
    steps_snapshot = excluded.steps_snapshot,
    is_published = true,
    published_at = now(),
    updated_at = now()
  returning id into v_publication_id;

  return v_publication_id;
end;
$$;


ALTER FUNCTION "public"."publish_recipe_to_catalog"("p_recipe_id" "uuid", "p_generation_type" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."spend_mochi_tokens"("p_user_id" "uuid", "p_amount" integer, "p_source" "text", "p_note" "text" DEFAULT NULL::"text") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_balance integer;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Not authorized';
  end if;

  if p_amount <= 0 then
    raise exception 'Amount must be positive';
  end if;

  select coalesce(sum(tt.amount), 0)
    into v_balance
  from public.token_transactions tt
  where tt.user_id = p_user_id;

  if v_balance < p_amount then
    raise exception 'Insufficient token balance';
  end if;

  insert into public.token_transactions (user_id, amount, source, note)
  values (p_user_id, -p_amount, p_source, p_note);

  return v_balance - p_amount;
end;
$$;


ALTER FUNCTION "public"."spend_mochi_tokens"("p_user_id" "uuid", "p_amount" integer, "p_source" "text", "p_note" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_subscription_from_revenuecat"("p_entitlement_id" "text" DEFAULT 'premium'::"text", "p_product_id" "text" DEFAULT NULL::"text", "p_status" "text" DEFAULT NULL::"text", "p_current_period_started_at" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_current_period_ends_at" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_auto_renew" boolean DEFAULT false, "p_store" "text" DEFAULT 'google_play'::"text", "p_external_customer_id" "text" DEFAULT NULL::"text", "p_event_id" "text" DEFAULT NULL::"text", "p_event_type" "text" DEFAULT NULL::"text", "p_payload" "jsonb" DEFAULT '{}'::"jsonb", "p_provider" "text" DEFAULT 'revenuecat'::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  IF p_event_id IS NOT NULL THEN
    INSERT INTO billing_events (user_id, provider, event_type, event_id, payload)
    VALUES (
      v_user_id,
      p_provider,
      COALESCE(p_event_type, 'sync'),
      p_event_id,
      COALESCE(p_payload, '{}'::jsonb)
    )
    ON CONFLICT (provider, event_id) DO NOTHING;
  END IF;

  INSERT INTO billing_subscriptions (
    user_id,
    provider,
    entitlement_id,
    product_id,
    status,
    current_period_started_at,
    current_period_ends_at,
    auto_renew,
    store,
    external_customer_id,
    raw_payload,
    updated_at
  ) VALUES (
    v_user_id,
    p_provider,
    COALESCE(p_entitlement_id, 'premium'),
    p_product_id,
    COALESCE(p_status, 'active'),
    p_current_period_started_at,
    p_current_period_ends_at,
    COALESCE(p_auto_renew, false),
    p_store,
    p_external_customer_id,
    COALESCE(p_payload, '{}'::jsonb),
    now()
  )
  ON CONFLICT (user_id, entitlement_id) DO UPDATE SET
    provider = EXCLUDED.provider,
    product_id = EXCLUDED.product_id,
    status = EXCLUDED.status,
    current_period_started_at = EXCLUDED.current_period_started_at,
    current_period_ends_at = EXCLUDED.current_period_ends_at,
    auto_renew = EXCLUDED.auto_renew,
    store = EXCLUDED.store,
    external_customer_id = EXCLUDED.external_customer_id,
    raw_payload = EXCLUDED.raw_payload,
    updated_at = now();

  RETURN get_user_plan();
END;
$$;


ALTER FUNCTION "public"."sync_subscription_from_revenuecat"("p_entitlement_id" "text", "p_product_id" "text", "p_status" "text", "p_current_period_started_at" timestamp with time zone, "p_current_period_ends_at" timestamp with time zone, "p_auto_renew" boolean, "p_store" "text", "p_external_customer_id" "text", "p_event_id" "text", "p_event_type" "text", "p_payload" "jsonb", "p_provider" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."token_daily_limit"("p_tier" "text") RETURNS integer
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select case
    when p_tier = 'pro' then 180
    when p_tier = 'plus' then 80
    else 30
  end;
$$;


ALTER FUNCTION "public"."token_daily_limit"("p_tier" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."unpublish_recipe_from_catalog"("p_recipe_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if auth.uid() is null then
    raise exception 'Not authorized';
  end if;

  update public.recipe_publications
    set is_published = false,
        updated_at = now()
  where source_recipe_id = p_recipe_id
    and owner_id = auth.uid();

  if not found then
    raise exception 'Publication not found';
  end if;
end;
$$;


ALTER FUNCTION "public"."unpublish_recipe_from_catalog"("p_recipe_id" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."achievements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "key" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "icon" "text" NOT NULL,
    "category" "text" NOT NULL,
    "points" integer DEFAULT 10 NOT NULL,
    "is_secret" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "achievements_category_check" CHECK (("category" = ANY (ARRAY['study'::"text", 'exercise'::"text", 'streak'::"text", 'special'::"text", 'cooking'::"text"])))
);


ALTER TABLE "public"."achievements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."action_conversions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "original_note" "text" NOT NULL,
    "converted_action_type" "text" NOT NULL,
    "converted_data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "confidence_score" numeric(4,3) NOT NULL,
    "ai_reasoning" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "action_conversions_action_type_check" CHECK (("converted_action_type" = ANY (ARRAY['study'::"text", 'routine'::"text", 'goal'::"text", 'habit'::"text"]))),
    CONSTRAINT "action_conversions_confidence_score_check" CHECK ((("confidence_score" >= (0)::numeric) AND ("confidence_score" <= (1)::numeric))),
    CONSTRAINT "action_conversions_original_note_check" CHECK (("char_length"(TRIM(BOTH FROM "original_note")) > 0))
);


ALTER TABLE "public"."action_conversions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ai_ad_rewards_daily" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "day_key" "date" NOT NULL,
    "ad_network" "text",
    "ad_unit_id" "text",
    "reward_event_id" "text" NOT NULL,
    "rewarded_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."ai_ad_rewards_daily" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ai_credits_ledger" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "delta" integer NOT NULL,
    "reason" "text" NOT NULL,
    "source_ref" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."ai_credits_ledger" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ai_usage_limits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "plan_key" "text" NOT NULL,
    "monthly_token_budget" integer,
    "daily_request_limit" integer,
    "features" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ai_usage_limits_plan_key_check" CHECK (("plan_key" = ANY (ARRAY['free'::"text", 'premium'::"text"])))
);


ALTER TABLE "public"."ai_usage_limits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."billing_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "provider" "text" NOT NULL,
    "event_type" "text" NOT NULL,
    "event_id" "text" NOT NULL,
    "payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "received_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."billing_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."billing_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "provider" "text" DEFAULT 'revenuecat'::"text" NOT NULL,
    "entitlement_id" "text" DEFAULT 'premium'::"text" NOT NULL,
    "product_id" "text",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "current_period_started_at" timestamp with time zone,
    "current_period_ends_at" timestamp with time zone,
    "auto_renew" boolean DEFAULT false NOT NULL,
    "store" "text",
    "external_customer_id" "text",
    "raw_payload" "jsonb",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "billing_subscriptions_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'grace_period'::"text", 'paused'::"text", 'cancelled'::"text", 'expired'::"text"])))
);


ALTER TABLE "public"."billing_subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cycle_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "period_start_date" "date" NOT NULL,
    "period_end_date" "date",
    "cycle_length" integer DEFAULT 28,
    "notes" "text",
    "source" "text" DEFAULT 'manual'::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."cycle_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."energy_levels" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "overall_rating" integer NOT NULL,
    "logged_date" "date" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "energy_levels_overall_rating_check" CHECK ((("overall_rating" >= 1) AND ("overall_rating" <= 5)))
);


ALTER TABLE "public"."energy_levels" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."engagement_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "event_name" "text" NOT NULL,
    "event_version" smallint DEFAULT 1 NOT NULL,
    "event_key" "text" NOT NULL,
    "source_table" "text",
    "source_id" "uuid",
    "processing_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "processed_at" timestamp with time zone,
    "processing_error" "text",
    "occurred_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "inserted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "context" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "dedupe_hits" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "engagement_events_context_object_check" CHECK (("jsonb_typeof"("context") = 'object'::"text")),
    CONSTRAINT "engagement_events_event_key_not_empty_check" CHECK (("btrim"("event_key") <> ''::"text")),
    CONSTRAINT "engagement_events_payload_object_check" CHECK (("jsonb_typeof"("payload") = 'object'::"text")),
    CONSTRAINT "engagement_events_processing_status_check" CHECK (("processing_status" = ANY (ARRAY['pending'::"text", 'processed'::"text", 'failed'::"text", 'ignored'::"text"]))),
    CONSTRAINT "engagement_events_source_pair_check" CHECK (((("source_table" IS NULL) AND ("source_id" IS NULL)) OR (("source_table" IS NOT NULL) AND ("source_id" IS NOT NULL))))
);


ALTER TABLE "public"."engagement_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."exam_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "subject" "text" NOT NULL,
    "grade" numeric(5,2),
    "max_grade" numeric(5,2) DEFAULT 10,
    "notes" "text",
    "exam_date" "date" DEFAULT CURRENT_DATE,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "is_upcoming" boolean DEFAULT false,
    "preparation_notes" "text"
);


ALTER TABLE "public"."exam_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."exam_prep_sprints" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "exam_id" "text" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "daily_target_hours" numeric(4,1) NOT NULL,
    "target_grade" numeric(5,2),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "exam_prep_sprints_daily_target_hours_check" CHECK ((("daily_target_hours" >= 0.5) AND ("daily_target_hours" <= (24)::numeric))),
    CONSTRAINT "exam_prep_sprints_date_range_check" CHECK (("end_date" > "start_date")),
    CONSTRAINT "exam_prep_sprints_target_grade_check" CHECK ((("target_grade" IS NULL) OR (("target_grade" >= (0)::numeric) AND ("target_grade" <= (100)::numeric))))
);


ALTER TABLE "public"."exam_prep_sprints" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."exam_sprint_milestones" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sprint_id" "uuid" NOT NULL,
    "milestone_number" integer NOT NULL,
    "target_date" "date" NOT NULL,
    "description" "text" NOT NULL,
    "is_completed" boolean DEFAULT false NOT NULL,
    CONSTRAINT "exam_sprint_milestones_milestone_number_check" CHECK (("milestone_number" > 0))
);


ALTER TABLE "public"."exam_sprint_milestones" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."exam_sprint_progress" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "sprint_id" "uuid" NOT NULL,
    "progress_date" "date" NOT NULL,
    "hours_studied" numeric(4,1) NOT NULL,
    "mood_rating" integer,
    "notes" "text",
    "is_day_completed" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "exam_sprint_progress_hours_studied_check" CHECK ((("hours_studied" >= (0)::numeric) AND ("hours_studied" <= (24)::numeric))),
    CONSTRAINT "exam_sprint_progress_mood_rating_check" CHECK ((("mood_rating" IS NULL) OR (("mood_rating" >= 1) AND ("mood_rating" <= 5))))
);


ALTER TABLE "public"."exam_sprint_progress" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."exercises" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "name" "text" NOT NULL,
    "sets" integer,
    "reps" integer,
    "duration_seconds" integer,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."exercises" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."flashcard_decks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "study_session_id" "uuid",
    "subject" "text" NOT NULL,
    "topic" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."flashcard_decks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."flashcards" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "deck_id" "uuid",
    "front" "text" NOT NULL,
    "back" "text" NOT NULL,
    "difficulty_rating" integer,
    "last_reviewed_at" timestamp with time zone,
    "review_count" integer DEFAULT 0,
    CONSTRAINT "flashcards_difficulty_rating_check" CHECK ((("difficulty_rating" >= 1) AND ("difficulty_rating" <= 3)))
);


ALTER TABLE "public"."flashcards" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."goals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "title" "text" NOT NULL,
    "description" "text",
    "target_date" "date",
    "is_completed" boolean DEFAULT false,
    "progress" integer DEFAULT 0,
    "color" "text" DEFAULT 'pink'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "goals_progress_check" CHECK ((("progress" >= 0) AND ("progress" <= 100)))
);


ALTER TABLE "public"."goals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."gratitude_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "entry_1" "text" NOT NULL,
    "entry_2" "text",
    "entry_3" "text",
    "logged_date" "date" DEFAULT CURRENT_DATE,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."gratitude_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."habit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "habit_id" "uuid",
    "log_date" "date" DEFAULT CURRENT_DATE
);


ALTER TABLE "public"."habit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."habits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "name" "text" NOT NULL,
    "icon" "text" DEFAULT 'checkmark-circle'::"text" NOT NULL,
    "color" "text" DEFAULT 'purple'::"text" NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."habits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."joint_goals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "space_id" "uuid" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "progress" integer DEFAULT 0 NOT NULL,
    "target_date" "date",
    "is_completed" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "joint_goals_progress_check" CHECK ((("progress" >= 0) AND ("progress" <= 100)))
);

ALTER TABLE ONLY "public"."joint_goals" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."joint_goals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."joint_vouchers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "shared_space_id" "uuid" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "points_cost" integer NOT NULL,
    "is_redeemed" boolean DEFAULT false NOT NULL,
    "redeemed_by" "uuid",
    "redeemed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "joint_vouchers_points_cost_check" CHECK (("points_cost" > 0))
);

ALTER TABLE ONLY "public"."joint_vouchers" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."joint_vouchers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mood_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "mood" integer NOT NULL,
    "note" "text",
    "logged_date" "date" DEFAULT CURRENT_DATE,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "mood_logs_mood_check" CHECK ((("mood" >= 1) AND ("mood" <= 5)))
);


ALTER TABLE "public"."mood_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."partner_spaces" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_user_id" "uuid" NOT NULL,
    "partner_user_id" "uuid",
    "partner_role" "text" DEFAULT 'male_lite'::"text" NOT NULL,
    "invite_code" "text" NOT NULL,
    "invite_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "partner_spaces_invite_status_check" CHECK (("invite_status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'cancelled'::"text"]))),
    CONSTRAINT "partner_spaces_partner_role_check" CHECK (("partner_role" = 'male_lite'::"text"))
);

ALTER TABLE ONLY "public"."partner_spaces" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."partner_spaces" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "full_name" "text",
    "wake_up_time" time without time zone DEFAULT '05:20:00'::time without time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "total_points" integer DEFAULT 0,
    "is_admin" boolean DEFAULT false,
    "mochi_name" "text" DEFAULT 'Mochi'::"text" NOT NULL
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quick_notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "title" "text",
    "content" "text" NOT NULL,
    "color" "text" DEFAULT 'yellow'::"text" NOT NULL,
    "is_pinned" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."quick_notes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."recipe_cook_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "recipe_id" "uuid" NOT NULL,
    "last_step_completed" integer DEFAULT 0 NOT NULL,
    "is_finished" boolean DEFAULT false NOT NULL,
    "servings_cooked" integer,
    "rating" integer,
    "session_notes" "text",
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "finished_at" timestamp with time zone,
    CONSTRAINT "recipe_cook_sessions_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."recipe_cook_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."recipe_ingredients" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "recipe_id" "uuid" NOT NULL,
    "order_index" integer DEFAULT 0 NOT NULL,
    "name" "text" NOT NULL,
    "amount" numeric,
    "unit" "text",
    "notes" "text"
);


ALTER TABLE "public"."recipe_ingredients" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."recipe_publications" (
    "source_recipe_id" "uuid" NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_id" "uuid" NOT NULL,
    "owner_name" "text" DEFAULT ''::"text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "total_time_minutes" integer DEFAULT 0 NOT NULL,
    "prep_time_minutes" integer DEFAULT 0 NOT NULL,
    "cook_time_minutes" integer DEFAULT 0 NOT NULL,
    "servings" integer DEFAULT 1 NOT NULL,
    "difficulty" "text" NOT NULL,
    "cuisine_type" "text",
    "generation_type" "text" DEFAULT 'normal'::"text" NOT NULL,
    "tags" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "image_url" "text",
    "ingredients_snapshot" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "steps_snapshot" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "is_published" boolean DEFAULT true NOT NULL,
    "published_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "recipe_publications_cook_time_minutes_check" CHECK (("cook_time_minutes" >= 0)),
    CONSTRAINT "recipe_publications_difficulty_check" CHECK (("difficulty" = ANY (ARRAY['fácil'::"text", 'media'::"text", 'difícil'::"text"]))),
    CONSTRAINT "recipe_publications_generation_type_check" CHECK (("generation_type" = ANY (ARRAY['normal'::"text", 'keto'::"text", 'vegetariana'::"text", 'vegana'::"text", 'alta_proteina'::"text"]))),
    CONSTRAINT "recipe_publications_prep_time_minutes_check" CHECK (("prep_time_minutes" >= 0)),
    CONSTRAINT "recipe_publications_servings_check" CHECK (("servings" > 0)),
    CONSTRAINT "recipe_publications_total_time_minutes_check" CHECK (("total_time_minutes" >= 0))
);

ALTER TABLE ONLY "public"."recipe_publications" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."recipe_publications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."recipe_steps" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "recipe_id" "uuid" NOT NULL,
    "step_number" integer NOT NULL,
    "title" "text" NOT NULL,
    "instructions" "text" NOT NULL,
    "duration_seconds" integer,
    "temperature" "text",
    "tip" "text"
);


ALTER TABLE "public"."recipe_steps" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."recipes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "total_time_minutes" integer DEFAULT 0 NOT NULL,
    "prep_time_minutes" integer DEFAULT 0 NOT NULL,
    "cook_time_minutes" integer DEFAULT 0 NOT NULL,
    "servings" integer DEFAULT 2 NOT NULL,
    "difficulty" "text" DEFAULT 'media'::"text" NOT NULL,
    "cuisine_type" "text",
    "tags" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "user_prompt" "text",
    "personal_notes" "text",
    "is_favorite" boolean DEFAULT false NOT NULL,
    "image_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "recipes_difficulty_check" CHECK (("difficulty" = ANY (ARRAY['fácil'::"text", 'media'::"text", 'difícil'::"text"])))
);


ALTER TABLE "public"."recipes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rewards" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "title" "text" NOT NULL,
    "description" "text",
    "points_cost" integer DEFAULT 0 NOT NULL,
    "is_redeemed" boolean DEFAULT false,
    "redeemed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."rewards" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."routine_exercises" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "routine_id" "uuid",
    "exercise_id" "uuid",
    "order_index" integer DEFAULT 0
);


ALTER TABLE "public"."routine_exercises" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."routine_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "routine_id" "uuid",
    "completed_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."routine_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."routines" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "name" "text" NOT NULL,
    "days" integer[] NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."routines" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."shared_space_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "shared_space_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'member'::"text" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "shared_space_members_role_check" CHECK (("role" = ANY (ARRAY['owner'::"text", 'member'::"text"])))
);

ALTER TABLE ONLY "public"."shared_space_members" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."shared_space_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."shared_spaces" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_by" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "invite_code" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."shared_spaces" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."shared_spaces" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."streak_recovery_plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "initiated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "recovery_tasks" "jsonb" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "completed_tasks" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "streak_recovery_plans_completed_tasks_check" CHECK (("completed_tasks" >= 0)),
    CONSTRAINT "streak_recovery_plans_recovery_tasks_array_check" CHECK (("jsonb_typeof"("recovery_tasks") = 'array'::"text"))
);


ALTER TABLE "public"."streak_recovery_plans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."streaks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "current_streak" integer DEFAULT 0,
    "longest_streak" integer DEFAULT 0,
    "last_activity_date" "date",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."streaks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."study_blocks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "subject" "text" NOT NULL,
    "day_of_week" integer NOT NULL,
    "start_time" time without time zone NOT NULL,
    "end_time" time without time zone NOT NULL,
    "color" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "study_blocks_day_of_week_check" CHECK ((("day_of_week" >= 0) AND ("day_of_week" <= 6)))
);


ALTER TABLE "public"."study_blocks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."study_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "study_block_id" "uuid",
    "subject" "text" NOT NULL,
    "duration_seconds" integer NOT NULL,
    "completed_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."study_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."token_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "amount" integer NOT NULL,
    "source" "text" NOT NULL,
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "token_transactions_amount_check" CHECK (("amount" <> 0))
);

ALTER TABLE ONLY "public"."token_transactions" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."token_transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_achievements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "achievement_id" "uuid",
    "unlocked_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_achievements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "study_enabled" boolean DEFAULT true,
    "exercise_enabled" boolean DEFAULT true,
    "habits_enabled" boolean DEFAULT true,
    "goals_enabled" boolean DEFAULT true,
    "mood_enabled" boolean DEFAULT true,
    "gratitude_enabled" boolean DEFAULT true,
    "vouchers_enabled" boolean DEFAULT true,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "cooking_enabled" boolean DEFAULT true NOT NULL,
    "partner_features_enabled" boolean DEFAULT false NOT NULL,
    "notes_enabled" boolean DEFAULT true,
    "quick_capture_enabled" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."user_settings" OWNER TO "postgres";


COMMENT ON COLUMN "public"."user_settings"."partner_features_enabled" IS 'Habilita funciones privadas/premium para la usuaria (ej. vales para pareja).';



CREATE TABLE IF NOT EXISTS "public"."user_token_tiers" (
    "user_id" "uuid" NOT NULL,
    "tier" "text" DEFAULT 'free'::"text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_token_tiers_tier_check" CHECK (("tier" = ANY (ARRAY['free'::"text", 'plus'::"text", 'pro'::"text"])))
);

ALTER TABLE ONLY "public"."user_token_tiers" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_token_tiers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."voucher_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "points_cost" integer DEFAULT 50 NOT NULL,
    "icon" "text" DEFAULT 'gift'::"text" NOT NULL,
    "color" "text" DEFAULT 'pink'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."voucher_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vouchers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "title" "text" NOT NULL,
    "description" "text",
    "points_cost" integer DEFAULT 50 NOT NULL,
    "is_redeemed" boolean DEFAULT false,
    "redeemed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "template_id" "uuid",
    "icon" "text" DEFAULT 'ticket-outline'::"text" NOT NULL,
    "color" "text" DEFAULT 'yellow'::"text" NOT NULL,
    "space_id" "uuid",
    "redeemed_by" "uuid",
    "updated_by_partner" boolean DEFAULT false NOT NULL
);

ALTER TABLE ONLY "public"."vouchers" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."vouchers" OWNER TO "postgres";


ALTER TABLE ONLY "public"."achievements"
    ADD CONSTRAINT "achievements_key_key" UNIQUE ("key");



ALTER TABLE ONLY "public"."achievements"
    ADD CONSTRAINT "achievements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."action_conversions"
    ADD CONSTRAINT "action_conversions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_ad_rewards_daily"
    ADD CONSTRAINT "ai_ad_rewards_daily_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_ad_rewards_daily"
    ADD CONSTRAINT "ai_ad_rewards_daily_user_reward_event_id_key" UNIQUE ("user_id", "reward_event_id");



ALTER TABLE ONLY "public"."ai_credits_ledger"
    ADD CONSTRAINT "ai_credits_ledger_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_usage_limits"
    ADD CONSTRAINT "ai_usage_limits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."billing_events"
    ADD CONSTRAINT "billing_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."billing_subscriptions"
    ADD CONSTRAINT "billing_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cycle_logs"
    ADD CONSTRAINT "cycle_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cycle_logs"
    ADD CONSTRAINT "cycle_logs_user_id_period_start_date_key" UNIQUE ("user_id", "period_start_date");



ALTER TABLE ONLY "public"."energy_levels"
    ADD CONSTRAINT "energy_levels_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."energy_levels"
    ADD CONSTRAINT "energy_levels_user_date_unique" UNIQUE ("user_id", "logged_date");



ALTER TABLE ONLY "public"."engagement_events"
    ADD CONSTRAINT "engagement_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."exam_logs"
    ADD CONSTRAINT "exam_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."exam_prep_sprints"
    ADD CONSTRAINT "exam_prep_sprints_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."exam_sprint_milestones"
    ADD CONSTRAINT "exam_sprint_milestones_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."exam_sprint_milestones"
    ADD CONSTRAINT "exam_sprint_milestones_sprint_milestone_unique" UNIQUE ("sprint_id", "milestone_number");



ALTER TABLE ONLY "public"."exam_sprint_progress"
    ADD CONSTRAINT "exam_sprint_progress_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."exam_sprint_progress"
    ADD CONSTRAINT "exam_sprint_progress_sprint_date_unique" UNIQUE ("sprint_id", "progress_date");



ALTER TABLE ONLY "public"."exercises"
    ADD CONSTRAINT "exercises_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."flashcard_decks"
    ADD CONSTRAINT "flashcard_decks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."flashcards"
    ADD CONSTRAINT "flashcards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."goals"
    ADD CONSTRAINT "goals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gratitude_logs"
    ADD CONSTRAINT "gratitude_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gratitude_logs"
    ADD CONSTRAINT "gratitude_logs_user_id_logged_date_key" UNIQUE ("user_id", "logged_date");



ALTER TABLE ONLY "public"."habit_logs"
    ADD CONSTRAINT "habit_logs_habit_id_completed_date_key" UNIQUE ("habit_id", "log_date");



ALTER TABLE ONLY "public"."habit_logs"
    ADD CONSTRAINT "habit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."habits"
    ADD CONSTRAINT "habits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."joint_goals"
    ADD CONSTRAINT "joint_goals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."joint_vouchers"
    ADD CONSTRAINT "joint_vouchers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mood_logs"
    ADD CONSTRAINT "mood_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mood_logs"
    ADD CONSTRAINT "mood_logs_user_id_logged_date_key" UNIQUE ("user_id", "logged_date");



ALTER TABLE ONLY "public"."partner_spaces"
    ADD CONSTRAINT "partner_spaces_invite_code_key" UNIQUE ("invite_code");



ALTER TABLE ONLY "public"."partner_spaces"
    ADD CONSTRAINT "partner_spaces_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quick_notes"
    ADD CONSTRAINT "quick_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recipe_cook_sessions"
    ADD CONSTRAINT "recipe_cook_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recipe_ingredients"
    ADD CONSTRAINT "recipe_ingredients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recipe_publications"
    ADD CONSTRAINT "recipe_publications_id_key" UNIQUE ("id");



ALTER TABLE ONLY "public"."recipe_publications"
    ADD CONSTRAINT "recipe_publications_pkey" PRIMARY KEY ("source_recipe_id");



ALTER TABLE ONLY "public"."recipe_steps"
    ADD CONSTRAINT "recipe_steps_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recipes"
    ADD CONSTRAINT "recipes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rewards"
    ADD CONSTRAINT "rewards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."routine_exercises"
    ADD CONSTRAINT "routine_exercises_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."routine_logs"
    ADD CONSTRAINT "routine_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."routines"
    ADD CONSTRAINT "routines_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shared_space_members"
    ADD CONSTRAINT "shared_space_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shared_space_members"
    ADD CONSTRAINT "shared_space_members_shared_space_id_user_id_key" UNIQUE ("shared_space_id", "user_id");



ALTER TABLE ONLY "public"."shared_spaces"
    ADD CONSTRAINT "shared_spaces_invite_code_key" UNIQUE ("invite_code");



ALTER TABLE ONLY "public"."shared_spaces"
    ADD CONSTRAINT "shared_spaces_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."streak_recovery_plans"
    ADD CONSTRAINT "streak_recovery_plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."streaks"
    ADD CONSTRAINT "streaks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."streaks"
    ADD CONSTRAINT "streaks_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."study_blocks"
    ADD CONSTRAINT "study_blocks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."study_sessions"
    ADD CONSTRAINT "study_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."token_transactions"
    ADD CONSTRAINT "token_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_achievements"
    ADD CONSTRAINT "user_achievements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_achievements"
    ADD CONSTRAINT "user_achievements_user_id_achievement_id_key" UNIQUE ("user_id", "achievement_id");



ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."user_token_tiers"
    ADD CONSTRAINT "user_token_tiers_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."voucher_templates"
    ADD CONSTRAINT "voucher_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vouchers"
    ADD CONSTRAINT "vouchers_pkey" PRIMARY KEY ("id");



CREATE INDEX "ai_ad_rewards_daily_user_day_idx" ON "public"."ai_ad_rewards_daily" USING "btree" ("user_id", "day_key");



CREATE INDEX "ai_credits_ledger_user_created_at_idx" ON "public"."ai_credits_ledger" USING "btree" ("user_id", "created_at" DESC);



CREATE UNIQUE INDEX "ai_usage_limits_plan_key_idx" ON "public"."ai_usage_limits" USING "btree" ("plan_key");



CREATE UNIQUE INDEX "billing_events_provider_event_id_idx" ON "public"."billing_events" USING "btree" ("provider", "event_id");



CREATE INDEX "billing_events_user_received_idx" ON "public"."billing_events" USING "btree" ("user_id", "received_at");



CREATE INDEX "billing_subscriptions_period_end_idx" ON "public"."billing_subscriptions" USING "btree" ("current_period_ends_at");



CREATE INDEX "billing_subscriptions_status_idx" ON "public"."billing_subscriptions" USING "btree" ("status");



CREATE UNIQUE INDEX "billing_subscriptions_user_entitlement_idx" ON "public"."billing_subscriptions" USING "btree" ("user_id", "entitlement_id");



CREATE INDEX "engagement_events_event_name_occurred_at_desc_idx" ON "public"."engagement_events" USING "btree" ("event_name", "occurred_at" DESC);



CREATE INDEX "engagement_events_pending_idx" ON "public"."engagement_events" USING "btree" ("occurred_at" DESC) WHERE ("processing_status" = 'pending'::"text");



CREATE INDEX "engagement_events_source_pair_idx" ON "public"."engagement_events" USING "btree" ("source_table", "source_id") WHERE (("source_table" IS NOT NULL) AND ("source_id" IS NOT NULL));



CREATE UNIQUE INDEX "engagement_events_user_id_event_key_key" ON "public"."engagement_events" USING "btree" ("user_id", "event_key");



CREATE INDEX "engagement_events_user_id_occurred_at_desc_idx" ON "public"."engagement_events" USING "btree" ("user_id", "occurred_at" DESC);



CREATE INDEX "idx_action_conversions_action_type" ON "public"."action_conversions" USING "btree" ("converted_action_type");



CREATE INDEX "idx_action_conversions_user_created_at" ON "public"."action_conversions" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_action_conversions_user_id" ON "public"."action_conversions" USING "btree" ("user_id");



CREATE INDEX "idx_energy_levels_user_id" ON "public"."energy_levels" USING "btree" ("user_id");



CREATE INDEX "idx_energy_levels_user_logged_date" ON "public"."energy_levels" USING "btree" ("user_id", "logged_date" DESC);



CREATE INDEX "idx_exam_prep_sprints_date_range" ON "public"."exam_prep_sprints" USING "btree" ("start_date", "end_date");



CREATE INDEX "idx_exam_prep_sprints_user_exam" ON "public"."exam_prep_sprints" USING "btree" ("user_id", "exam_id");



CREATE INDEX "idx_exam_prep_sprints_user_id" ON "public"."exam_prep_sprints" USING "btree" ("user_id");



CREATE INDEX "idx_exam_sprint_milestones_sprint_id" ON "public"."exam_sprint_milestones" USING "btree" ("sprint_id");



CREATE INDEX "idx_exam_sprint_milestones_target_date" ON "public"."exam_sprint_milestones" USING "btree" ("target_date");



CREATE INDEX "idx_exam_sprint_progress_sprint_date" ON "public"."exam_sprint_progress" USING "btree" ("sprint_id", "progress_date");



CREATE INDEX "idx_exam_sprint_progress_sprint_id" ON "public"."exam_sprint_progress" USING "btree" ("sprint_id");



CREATE INDEX "idx_exam_sprint_progress_user_id" ON "public"."exam_sprint_progress" USING "btree" ("user_id");



CREATE INDEX "idx_joint_goals_space" ON "public"."joint_goals" USING "btree" ("space_id");



CREATE INDEX "idx_joint_vouchers_space" ON "public"."joint_vouchers" USING "btree" ("shared_space_id");



CREATE INDEX "idx_recipe_cook_sessions_user_recipe" ON "public"."recipe_cook_sessions" USING "btree" ("user_id", "recipe_id");



CREATE INDEX "idx_recipe_ingredients_recipe" ON "public"."recipe_ingredients" USING "btree" ("recipe_id", "order_index");



CREATE INDEX "idx_recipe_publications_owner" ON "public"."recipe_publications" USING "btree" ("owner_id", "published_at" DESC);



CREATE INDEX "idx_recipe_publications_published_at" ON "public"."recipe_publications" USING "btree" ("published_at" DESC);



CREATE INDEX "idx_recipe_steps_recipe" ON "public"."recipe_steps" USING "btree" ("recipe_id", "step_number");



CREATE INDEX "idx_recipes_user_favorite" ON "public"."recipes" USING "btree" ("user_id", "is_favorite") WHERE ("is_favorite" = true);



CREATE INDEX "idx_recipes_user_id" ON "public"."recipes" USING "btree" ("user_id");



CREATE INDEX "idx_shared_space_members_space" ON "public"."shared_space_members" USING "btree" ("shared_space_id");



CREATE UNIQUE INDEX "idx_streak_recovery_plans_one_active_per_user" ON "public"."streak_recovery_plans" USING "btree" ("user_id") WHERE ("is_active" = true);



CREATE INDEX "idx_streak_recovery_plans_user_active" ON "public"."streak_recovery_plans" USING "btree" ("user_id", "is_active");



CREATE INDEX "idx_streak_recovery_plans_user_id" ON "public"."streak_recovery_plans" USING "btree" ("user_id");



CREATE INDEX "idx_token_transactions_created" ON "public"."token_transactions" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_token_transactions_user_created" ON "public"."token_transactions" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "joint_goals_space_id_idx" ON "public"."joint_goals" USING "btree" ("space_id");



CREATE INDEX "partner_spaces_owner_user_id_idx" ON "public"."partner_spaces" USING "btree" ("owner_user_id");



CREATE INDEX "partner_spaces_partner_user_id_idx" ON "public"."partner_spaces" USING "btree" ("partner_user_id");



CREATE INDEX "vouchers_space_id_idx" ON "public"."vouchers" USING "btree" ("space_id");



CREATE OR REPLACE TRIGGER "on_profile_created_settings" AFTER INSERT ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_user_settings"();



CREATE OR REPLACE TRIGGER "recipes_set_updated_at" BEFORE UPDATE ON "public"."recipes" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



ALTER TABLE ONLY "public"."action_conversions"
    ADD CONSTRAINT "action_conversions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_ad_rewards_daily"
    ADD CONSTRAINT "ai_ad_rewards_daily_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_credits_ledger"
    ADD CONSTRAINT "ai_credits_ledger_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."billing_events"
    ADD CONSTRAINT "billing_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."billing_subscriptions"
    ADD CONSTRAINT "billing_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cycle_logs"
    ADD CONSTRAINT "cycle_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."energy_levels"
    ADD CONSTRAINT "energy_levels_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."engagement_events"
    ADD CONSTRAINT "engagement_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exam_logs"
    ADD CONSTRAINT "exam_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exam_prep_sprints"
    ADD CONSTRAINT "exam_prep_sprints_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exam_sprint_milestones"
    ADD CONSTRAINT "exam_sprint_milestones_sprint_id_fkey" FOREIGN KEY ("sprint_id") REFERENCES "public"."exam_prep_sprints"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exam_sprint_progress"
    ADD CONSTRAINT "exam_sprint_progress_sprint_id_fkey" FOREIGN KEY ("sprint_id") REFERENCES "public"."exam_prep_sprints"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exam_sprint_progress"
    ADD CONSTRAINT "exam_sprint_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exercises"
    ADD CONSTRAINT "exercises_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."flashcard_decks"
    ADD CONSTRAINT "flashcard_decks_study_session_id_fkey" FOREIGN KEY ("study_session_id") REFERENCES "public"."study_sessions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."flashcard_decks"
    ADD CONSTRAINT "flashcard_decks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."flashcards"
    ADD CONSTRAINT "flashcards_deck_id_fkey" FOREIGN KEY ("deck_id") REFERENCES "public"."flashcard_decks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."goals"
    ADD CONSTRAINT "goals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."gratitude_logs"
    ADD CONSTRAINT "gratitude_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."habit_logs"
    ADD CONSTRAINT "habit_logs_habit_id_fkey" FOREIGN KEY ("habit_id") REFERENCES "public"."habits"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."habit_logs"
    ADD CONSTRAINT "habit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."habits"
    ADD CONSTRAINT "habits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."joint_goals"
    ADD CONSTRAINT "joint_goals_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."joint_goals"
    ADD CONSTRAINT "joint_goals_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."partner_spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."joint_vouchers"
    ADD CONSTRAINT "joint_vouchers_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."joint_vouchers"
    ADD CONSTRAINT "joint_vouchers_redeemed_by_fkey" FOREIGN KEY ("redeemed_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."joint_vouchers"
    ADD CONSTRAINT "joint_vouchers_shared_space_id_fkey" FOREIGN KEY ("shared_space_id") REFERENCES "public"."shared_spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mood_logs"
    ADD CONSTRAINT "mood_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."partner_spaces"
    ADD CONSTRAINT "partner_spaces_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."partner_spaces"
    ADD CONSTRAINT "partner_spaces_partner_user_id_fkey" FOREIGN KEY ("partner_user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quick_notes"
    ADD CONSTRAINT "quick_notes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recipe_cook_sessions"
    ADD CONSTRAINT "recipe_cook_sessions_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recipe_cook_sessions"
    ADD CONSTRAINT "recipe_cook_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recipe_ingredients"
    ADD CONSTRAINT "recipe_ingredients_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recipe_publications"
    ADD CONSTRAINT "recipe_publications_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recipe_publications"
    ADD CONSTRAINT "recipe_publications_source_recipe_id_fkey" FOREIGN KEY ("source_recipe_id") REFERENCES "public"."recipes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recipe_steps"
    ADD CONSTRAINT "recipe_steps_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recipes"
    ADD CONSTRAINT "recipes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rewards"
    ADD CONSTRAINT "rewards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."routine_exercises"
    ADD CONSTRAINT "routine_exercises_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."routine_exercises"
    ADD CONSTRAINT "routine_exercises_routine_id_fkey" FOREIGN KEY ("routine_id") REFERENCES "public"."routines"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."routine_logs"
    ADD CONSTRAINT "routine_logs_routine_id_fkey" FOREIGN KEY ("routine_id") REFERENCES "public"."routines"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."routine_logs"
    ADD CONSTRAINT "routine_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."routines"
    ADD CONSTRAINT "routines_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shared_space_members"
    ADD CONSTRAINT "shared_space_members_shared_space_id_fkey" FOREIGN KEY ("shared_space_id") REFERENCES "public"."shared_spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shared_space_members"
    ADD CONSTRAINT "shared_space_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shared_spaces"
    ADD CONSTRAINT "shared_spaces_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."streak_recovery_plans"
    ADD CONSTRAINT "streak_recovery_plans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."streaks"
    ADD CONSTRAINT "streaks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."study_blocks"
    ADD CONSTRAINT "study_blocks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."study_sessions"
    ADD CONSTRAINT "study_sessions_study_block_id_fkey" FOREIGN KEY ("study_block_id") REFERENCES "public"."study_blocks"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."study_sessions"
    ADD CONSTRAINT "study_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."token_transactions"
    ADD CONSTRAINT "token_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_achievements"
    ADD CONSTRAINT "user_achievements_achievement_id_fkey" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievements"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_achievements"
    ADD CONSTRAINT "user_achievements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_token_tiers"
    ADD CONSTRAINT "user_token_tiers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vouchers"
    ADD CONSTRAINT "vouchers_redeemed_by_fkey" FOREIGN KEY ("redeemed_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."vouchers"
    ADD CONSTRAINT "vouchers_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."partner_spaces"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."vouchers"
    ADD CONSTRAINT "vouchers_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."voucher_templates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."vouchers"
    ADD CONSTRAINT "vouchers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



CREATE POLICY "Achievements are public" ON "public"."achievements" FOR SELECT USING (true);



CREATE POLICY "Admins can manage templates" ON "public"."voucher_templates" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_admin" = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_admin" = true)))));



CREATE POLICY "Users can insert their own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can insert their settings" ON "public"."user_settings" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own cycle logs" ON "public"."cycle_logs" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own exercises" ON "public"."exercises" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own routine exercises" ON "public"."routine_exercises" USING ((EXISTS ( SELECT 1
   FROM "public"."routines"
  WHERE (("routines"."id" = "routine_exercises"."routine_id") AND ("routines"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can manage their own routine logs" ON "public"."routine_logs" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own routines" ON "public"."routines" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own study blocks" ON "public"."study_blocks" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read their own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can read their settings" ON "public"."user_settings" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update their settings" ON "public"."user_settings" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users delete own decks" ON "public"."flashcard_decks" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users delete own notes" ON "public"."quick_notes" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users insert own cards" ON "public"."flashcards" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."flashcard_decks" "d"
  WHERE (("d"."id" = "flashcards"."deck_id") AND ("d"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users insert own decks" ON "public"."flashcard_decks" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users insert own notes" ON "public"."quick_notes" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users insert their own settings" ON "public"."user_settings" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users manage own cycle logs" ON "public"."cycle_logs" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users manage their own achievements" ON "public"."user_achievements" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users manage their own exam logs" ON "public"."exam_logs" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users manage their own goals" ON "public"."goals" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users manage their own gratitude_logs" ON "public"."gratitude_logs" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users manage their own habit_logs" ON "public"."habit_logs" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users manage their own habits" ON "public"."habits" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users manage their own mood_logs" ON "public"."mood_logs" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users manage their own rewards" ON "public"."rewards" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users manage their own streaks" ON "public"."streaks" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users manage their own study sessions" ON "public"."study_sessions" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users manage their own vouchers" ON "public"."vouchers" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users read own cards via deck" ON "public"."flashcards" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."flashcard_decks" "d"
  WHERE (("d"."id" = "flashcards"."deck_id") AND ("d"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users read own decks" ON "public"."flashcard_decks" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users read own notes" ON "public"."quick_notes" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users update own cards" ON "public"."flashcards" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."flashcard_decks" "d"
  WHERE (("d"."id" = "flashcards"."deck_id") AND ("d"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users update own notes" ON "public"."quick_notes" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users update their own settings" ON "public"."user_settings" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Voucher templates are public" ON "public"."voucher_templates" FOR SELECT USING (true);



ALTER TABLE "public"."achievements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."action_conversions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "action_conversions_delete_own" ON "public"."action_conversions" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "action_conversions_insert_own" ON "public"."action_conversions" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "action_conversions_select_own" ON "public"."action_conversions" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "action_conversions_update_own" ON "public"."action_conversions" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."ai_ad_rewards_daily" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ai_ad_rewards_daily_select_own" ON "public"."ai_ad_rewards_daily" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."ai_credits_ledger" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ai_credits_ledger_select_own" ON "public"."ai_credits_ledger" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."ai_usage_limits" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ai_usage_limits_select_all" ON "public"."ai_usage_limits" FOR SELECT USING (true);



ALTER TABLE "public"."billing_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "billing_events_select_own" ON "public"."billing_events" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."billing_subscriptions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "billing_subscriptions_select_own" ON "public"."billing_subscriptions" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "creator_insert_space" ON "public"."partner_spaces" FOR INSERT WITH CHECK (("auth"."uid"() = "owner_user_id"));



ALTER TABLE "public"."cycle_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."energy_levels" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "energy_levels_delete_own" ON "public"."energy_levels" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "energy_levels_insert_own" ON "public"."energy_levels" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "energy_levels_select_own" ON "public"."energy_levels" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "energy_levels_update_own" ON "public"."energy_levels" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."engagement_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "engagement_events_insert_own" ON "public"."engagement_events" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "engagement_events_select_own" ON "public"."engagement_events" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."exam_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."exam_prep_sprints" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "exam_prep_sprints_delete_own" ON "public"."exam_prep_sprints" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "exam_prep_sprints_insert_own" ON "public"."exam_prep_sprints" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "exam_prep_sprints_select_own" ON "public"."exam_prep_sprints" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "exam_prep_sprints_update_own" ON "public"."exam_prep_sprints" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."exam_sprint_milestones" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "exam_sprint_milestones_delete_owner_sprint" ON "public"."exam_sprint_milestones" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."exam_prep_sprints" "s"
  WHERE (("s"."id" = "exam_sprint_milestones"."sprint_id") AND ("s"."user_id" = "auth"."uid"())))));



CREATE POLICY "exam_sprint_milestones_insert_owner_sprint" ON "public"."exam_sprint_milestones" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."exam_prep_sprints" "s"
  WHERE (("s"."id" = "exam_sprint_milestones"."sprint_id") AND ("s"."user_id" = "auth"."uid"())))));



CREATE POLICY "exam_sprint_milestones_select_owner_sprint" ON "public"."exam_sprint_milestones" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."exam_prep_sprints" "s"
  WHERE (("s"."id" = "exam_sprint_milestones"."sprint_id") AND ("s"."user_id" = "auth"."uid"())))));



CREATE POLICY "exam_sprint_milestones_update_owner_sprint" ON "public"."exam_sprint_milestones" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."exam_prep_sprints" "s"
  WHERE (("s"."id" = "exam_sprint_milestones"."sprint_id") AND ("s"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."exam_prep_sprints" "s"
  WHERE (("s"."id" = "exam_sprint_milestones"."sprint_id") AND ("s"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."exam_sprint_progress" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "exam_sprint_progress_delete_own" ON "public"."exam_sprint_progress" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "exam_sprint_progress_insert_own" ON "public"."exam_sprint_progress" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "exam_sprint_progress_select_own" ON "public"."exam_sprint_progress" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "exam_sprint_progress_update_own" ON "public"."exam_sprint_progress" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."exercises" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."flashcard_decks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."flashcards" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."goals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."gratitude_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."habit_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."habits" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."joint_goals" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "joint_goals_delete_member" ON "public"."joint_goals" FOR DELETE USING ("public"."can_access_space"("space_id"));



CREATE POLICY "joint_goals_insert_member" ON "public"."joint_goals" FOR INSERT WITH CHECK (("public"."can_access_space"("space_id") AND ("created_by" = "auth"."uid"())));



CREATE POLICY "joint_goals_select_member" ON "public"."joint_goals" FOR SELECT USING ("public"."can_access_space"("space_id"));



CREATE POLICY "joint_goals_update_member" ON "public"."joint_goals" FOR UPDATE USING ("public"."can_access_space"("space_id")) WITH CHECK ("public"."can_access_space"("space_id"));



ALTER TABLE "public"."joint_vouchers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "joint_vouchers_delete_member" ON "public"."joint_vouchers" FOR DELETE USING ("public"."can_access_space"("shared_space_id"));



CREATE POLICY "joint_vouchers_insert_member" ON "public"."joint_vouchers" FOR INSERT WITH CHECK (("public"."can_access_space"("shared_space_id") AND ("created_by" = "auth"."uid"())));



CREATE POLICY "joint_vouchers_select_member" ON "public"."joint_vouchers" FOR SELECT USING ("public"."can_access_space"("shared_space_id"));



CREATE POLICY "joint_vouchers_update_member" ON "public"."joint_vouchers" FOR UPDATE USING ("public"."can_access_space"("shared_space_id")) WITH CHECK ("public"."can_access_space"("shared_space_id"));



ALTER TABLE "public"."mood_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "owner_manage_own_vouchers" ON "public"."vouchers" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."partner_spaces" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "partner_update_shared_vouchers" ON "public"."vouchers" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."partner_spaces" "ps"
  WHERE (("ps"."id" = "vouchers"."space_id") AND ("ps"."partner_user_id" = "auth"."uid"()) AND ("ps"."invite_status" = 'accepted'::"text") AND ("ps"."owner_user_id" = "vouchers"."user_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."partner_spaces" "ps"
  WHERE (("ps"."id" = "vouchers"."space_id") AND ("ps"."partner_user_id" = "auth"."uid"()) AND ("ps"."invite_status" = 'accepted'::"text") AND ("ps"."owner_user_id" = "vouchers"."user_id")))));



CREATE POLICY "partner_update_space" ON "public"."partner_spaces" FOR UPDATE USING ((("auth"."uid"() = "owner_user_id") OR ("auth"."uid"() = "partner_user_id"))) WITH CHECK ((("auth"."uid"() = "owner_user_id") OR ("auth"."uid"() = "partner_user_id")));



CREATE POLICY "partners_can_read_each_other_profiles" ON "public"."profiles" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."partner_spaces" "ps"
  WHERE ((("ps"."owner_user_id" = "auth"."uid"()) AND ("ps"."partner_user_id" = "profiles"."id")) OR (("ps"."partner_user_id" = "auth"."uid"()) AND ("ps"."owner_user_id" = "profiles"."id"))))));



CREATE POLICY "partners_select_own_space" ON "public"."partner_spaces" FOR SELECT USING ((("auth"."uid"() = "owner_user_id") OR ("auth"."uid"() = "partner_user_id")));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quick_notes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."recipe_cook_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."recipe_ingredients" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."recipe_publications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "recipe_publications_delete_owner" ON "public"."recipe_publications" FOR DELETE USING (("auth"."uid"() = "owner_id"));



CREATE POLICY "recipe_publications_insert_owner" ON "public"."recipe_publications" FOR INSERT WITH CHECK (("auth"."uid"() = "owner_id"));



CREATE POLICY "recipe_publications_select_public" ON "public"."recipe_publications" FOR SELECT USING ((("is_published" = true) OR ("auth"."uid"() = "owner_id")));



CREATE POLICY "recipe_publications_update_owner" ON "public"."recipe_publications" FOR UPDATE USING (("auth"."uid"() = "owner_id")) WITH CHECK (("auth"."uid"() = "owner_id"));



ALTER TABLE "public"."recipe_steps" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."recipes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rewards" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."routine_exercises" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."routine_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."routines" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."shared_space_members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "shared_space_members_delete_owner" ON "public"."shared_space_members" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."shared_spaces" "s"
  WHERE (("s"."id" = "shared_space_members"."shared_space_id") AND ("s"."created_by" = "auth"."uid"())))));



CREATE POLICY "shared_space_members_insert_owner" ON "public"."shared_space_members" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."shared_spaces" "s"
  WHERE (("s"."id" = "shared_space_members"."shared_space_id") AND ("s"."created_by" = "auth"."uid"())))));



CREATE POLICY "shared_space_members_select_member" ON "public"."shared_space_members" FOR SELECT USING ("public"."can_access_space"("shared_space_id"));



CREATE POLICY "shared_space_members_update_owner" ON "public"."shared_space_members" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."shared_spaces" "s"
  WHERE (("s"."id" = "shared_space_members"."shared_space_id") AND ("s"."created_by" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."shared_spaces" "s"
  WHERE (("s"."id" = "shared_space_members"."shared_space_id") AND ("s"."created_by" = "auth"."uid"())))));



ALTER TABLE "public"."shared_spaces" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "shared_spaces_delete_owner" ON "public"."shared_spaces" FOR DELETE USING (("auth"."uid"() = "created_by"));



CREATE POLICY "shared_spaces_insert_owner" ON "public"."shared_spaces" FOR INSERT WITH CHECK (("auth"."uid"() = "created_by"));



CREATE POLICY "shared_spaces_select_member" ON "public"."shared_spaces" FOR SELECT USING (("public"."can_access_space"("id") OR ("auth"."uid"() = "created_by")));



CREATE POLICY "shared_spaces_update_owner" ON "public"."shared_spaces" FOR UPDATE USING (("auth"."uid"() = "created_by")) WITH CHECK (("auth"."uid"() = "created_by"));



CREATE POLICY "space_members_insert_joint_goals" ON "public"."joint_goals" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."partner_spaces" "ps"
  WHERE (("ps"."id" = "joint_goals"."space_id") AND (("ps"."owner_user_id" = "auth"."uid"()) OR ("ps"."partner_user_id" = "auth"."uid"())) AND ("ps"."invite_status" = 'accepted'::"text")))));



CREATE POLICY "space_members_select_joint_goals" ON "public"."joint_goals" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."partner_spaces" "ps"
  WHERE (("ps"."id" = "joint_goals"."space_id") AND (("ps"."owner_user_id" = "auth"."uid"()) OR ("ps"."partner_user_id" = "auth"."uid"()))))));



CREATE POLICY "space_members_update_joint_goals" ON "public"."joint_goals" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."partner_spaces" "ps"
  WHERE (("ps"."id" = "joint_goals"."space_id") AND (("ps"."owner_user_id" = "auth"."uid"()) OR ("ps"."partner_user_id" = "auth"."uid"())))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."partner_spaces" "ps"
  WHERE (("ps"."id" = "joint_goals"."space_id") AND (("ps"."owner_user_id" = "auth"."uid"()) OR ("ps"."partner_user_id" = "auth"."uid"()))))));



ALTER TABLE "public"."streak_recovery_plans" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "streak_recovery_plans_delete_own" ON "public"."streak_recovery_plans" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "streak_recovery_plans_insert_own" ON "public"."streak_recovery_plans" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "streak_recovery_plans_select_own" ON "public"."streak_recovery_plans" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "streak_recovery_plans_update_own" ON "public"."streak_recovery_plans" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."streaks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."study_blocks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "study_blocks_delete_own" ON "public"."study_blocks" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "study_blocks_insert_own" ON "public"."study_blocks" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "study_blocks_select_own" ON "public"."study_blocks" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "study_blocks_update_own" ON "public"."study_blocks" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."study_sessions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "token_tiers_delete_admin" ON "public"."user_token_tiers" FOR DELETE USING ("public"."is_admin_user"());



CREATE POLICY "token_tiers_insert_own" ON "public"."user_token_tiers" FOR INSERT WITH CHECK (((("auth"."uid"() = "user_id") AND ("tier" = 'free'::"text")) OR "public"."is_admin_user"()));



CREATE POLICY "token_tiers_select_own" ON "public"."user_token_tiers" FOR SELECT USING ((("auth"."uid"() = "user_id") OR "public"."is_admin_user"()));



CREATE POLICY "token_tiers_update_admin" ON "public"."user_token_tiers" FOR UPDATE USING ("public"."is_admin_user"()) WITH CHECK ("public"."is_admin_user"());



ALTER TABLE "public"."token_transactions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "token_transactions_delete_admin" ON "public"."token_transactions" FOR DELETE USING ("public"."is_admin_user"());



CREATE POLICY "token_transactions_insert_own" ON "public"."token_transactions" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") OR "public"."is_admin_user"()));



CREATE POLICY "token_transactions_select_own" ON "public"."token_transactions" FOR SELECT USING ((("auth"."uid"() = "user_id") OR "public"."is_admin_user"()));



CREATE POLICY "token_transactions_update_admin" ON "public"."token_transactions" FOR UPDATE USING ("public"."is_admin_user"()) WITH CHECK ("public"."is_admin_user"());



ALTER TABLE "public"."user_achievements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_token_tiers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "usuarios actualizan sus sesiones de cocina" ON "public"."recipe_cook_sessions" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "usuarios crean ingredientes en sus recetas" ON "public"."recipe_ingredients" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."recipes" "r"
  WHERE (("r"."id" = "recipe_ingredients"."recipe_id") AND ("r"."user_id" = "auth"."uid"())))));



CREATE POLICY "usuarios crean pasos en sus recetas" ON "public"."recipe_steps" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."recipes" "r"
  WHERE (("r"."id" = "recipe_steps"."recipe_id") AND ("r"."user_id" = "auth"."uid"())))));



CREATE POLICY "usuarios crean sesiones de cocina" ON "public"."recipe_cook_sessions" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "usuarios crean sus recetas" ON "public"."recipes" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "usuarios editan ingredientes de sus recetas" ON "public"."recipe_ingredients" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."recipes" "r"
  WHERE (("r"."id" = "recipe_ingredients"."recipe_id") AND ("r"."user_id" = "auth"."uid"())))));



CREATE POLICY "usuarios editan pasos de sus recetas" ON "public"."recipe_steps" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."recipes" "r"
  WHERE (("r"."id" = "recipe_steps"."recipe_id") AND ("r"."user_id" = "auth"."uid"())))));



CREATE POLICY "usuarios editan sus recetas" ON "public"."recipes" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "usuarios eliminan ingredientes de sus recetas" ON "public"."recipe_ingredients" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."recipes" "r"
  WHERE (("r"."id" = "recipe_ingredients"."recipe_id") AND ("r"."user_id" = "auth"."uid"())))));



CREATE POLICY "usuarios eliminan pasos de sus recetas" ON "public"."recipe_steps" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."recipes" "r"
  WHERE (("r"."id" = "recipe_steps"."recipe_id") AND ("r"."user_id" = "auth"."uid"())))));



CREATE POLICY "usuarios eliminan sus recetas" ON "public"."recipes" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "usuarios eliminan sus sesiones de cocina" ON "public"."recipe_cook_sessions" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "usuarios ven ingredientes de sus recetas" ON "public"."recipe_ingredients" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."recipes" "r"
  WHERE (("r"."id" = "recipe_ingredients"."recipe_id") AND ("r"."user_id" = "auth"."uid"())))));



CREATE POLICY "usuarios ven pasos de sus recetas" ON "public"."recipe_steps" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."recipes" "r"
  WHERE (("r"."id" = "recipe_steps"."recipe_id") AND ("r"."user_id" = "auth"."uid"())))));



CREATE POLICY "usuarios ven sus recetas" ON "public"."recipes" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "usuarios ven sus sesiones de cocina" ON "public"."recipe_cook_sessions" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."voucher_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."vouchers" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."accept_partner_invite"("p_invite_code" "text") TO "authenticated";



GRANT ALL ON FUNCTION "public"."admin_dashboard_stats"() TO "authenticated";



GRANT ALL ON FUNCTION "public"."apply_plan_limits_for_ai"("p_reason" "text", "p_source_ref" "text", "p_metadata" "jsonb") TO "authenticated";



GRANT ALL ON FUNCTION "public"."can_access_space"("p_shared_space_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."claim_ai_credit_from_ad"("p_reward_event_id" "text", "p_ad_network" "text", "p_ad_unit_id" "text") TO "authenticated";



GRANT ALL ON FUNCTION "public"."consume_ai_credit"("p_reason" "text", "p_source_ref" "text", "p_metadata" "jsonb") TO "authenticated";



GRANT ALL ON FUNCTION "public"."create_partner_invite"() TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_admin_active_users_daily"("days_back" integer) TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_admin_stats"() TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_admin_users"("page_limit" integer, "page_offset" integer) TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_ai_credit_balance"() TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_partner_space_snapshot"("p_space_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_user_plan"() TO "authenticated";



GRANT ALL ON FUNCTION "public"."grant_mochi_tokens"("p_user_id" "uuid", "p_amount" integer, "p_source" "text", "p_note" "text") TO "authenticated";



GRANT ALL ON FUNCTION "public"."import_public_recipe"("p_publication_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."increment_points"("user_id" "uuid", "points" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."increment_points"("user_id" "uuid", "points" integer) TO "authenticated";



GRANT ALL ON FUNCTION "public"."is_admin_user"() TO "authenticated";



GRANT ALL ON FUNCTION "public"."leave_partner_space"("p_space_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."publish_recipe_to_catalog"("p_recipe_id" "uuid", "p_generation_type" "text") TO "authenticated";



GRANT ALL ON FUNCTION "public"."spend_mochi_tokens"("p_user_id" "uuid", "p_amount" integer, "p_source" "text", "p_note" "text") TO "authenticated";



GRANT ALL ON FUNCTION "public"."sync_subscription_from_revenuecat"("p_entitlement_id" "text", "p_product_id" "text", "p_status" "text", "p_current_period_started_at" timestamp with time zone, "p_current_period_ends_at" timestamp with time zone, "p_auto_renew" boolean, "p_store" "text", "p_external_customer_id" "text", "p_event_id" "text", "p_event_type" "text", "p_payload" "jsonb", "p_provider" "text") TO "authenticated";



GRANT ALL ON FUNCTION "public"."token_daily_limit"("p_tier" "text") TO "authenticated";



GRANT ALL ON FUNCTION "public"."unpublish_recipe_from_catalog"("p_recipe_id" "uuid") TO "authenticated";


















GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."achievements" TO "anon";
GRANT ALL ON TABLE "public"."achievements" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."achievements" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."action_conversions" TO "anon";
GRANT ALL ON TABLE "public"."action_conversions" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."action_conversions" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."ai_ad_rewards_daily" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."ai_ad_rewards_daily" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."ai_ad_rewards_daily" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."ai_credits_ledger" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."ai_credits_ledger" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."ai_credits_ledger" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."ai_usage_limits" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."ai_usage_limits" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."ai_usage_limits" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."billing_events" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."billing_events" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."billing_events" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."billing_subscriptions" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."billing_subscriptions" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."billing_subscriptions" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."cycle_logs" TO "anon";
GRANT ALL ON TABLE "public"."cycle_logs" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."cycle_logs" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."energy_levels" TO "anon";
GRANT ALL ON TABLE "public"."energy_levels" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."energy_levels" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."engagement_events" TO "anon";
GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."engagement_events" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."engagement_events" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."exam_logs" TO "anon";
GRANT ALL ON TABLE "public"."exam_logs" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."exam_logs" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."exam_prep_sprints" TO "anon";
GRANT ALL ON TABLE "public"."exam_prep_sprints" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."exam_prep_sprints" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."exam_sprint_milestones" TO "anon";
GRANT ALL ON TABLE "public"."exam_sprint_milestones" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."exam_sprint_milestones" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."exam_sprint_progress" TO "anon";
GRANT ALL ON TABLE "public"."exam_sprint_progress" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."exam_sprint_progress" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."exercises" TO "anon";
GRANT ALL ON TABLE "public"."exercises" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."exercises" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."flashcard_decks" TO "anon";
GRANT ALL ON TABLE "public"."flashcard_decks" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."flashcard_decks" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."flashcards" TO "anon";
GRANT ALL ON TABLE "public"."flashcards" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."flashcards" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."goals" TO "anon";
GRANT ALL ON TABLE "public"."goals" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."goals" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."gratitude_logs" TO "anon";
GRANT ALL ON TABLE "public"."gratitude_logs" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."gratitude_logs" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."habit_logs" TO "anon";
GRANT ALL ON TABLE "public"."habit_logs" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."habit_logs" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."habits" TO "anon";
GRANT ALL ON TABLE "public"."habits" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."habits" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."joint_goals" TO "anon";
GRANT ALL ON TABLE "public"."joint_goals" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."joint_goals" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."joint_vouchers" TO "anon";
GRANT ALL ON TABLE "public"."joint_vouchers" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."joint_vouchers" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."mood_logs" TO "anon";
GRANT ALL ON TABLE "public"."mood_logs" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."mood_logs" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."partner_spaces" TO "anon";
GRANT ALL ON TABLE "public"."partner_spaces" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."partner_spaces" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."profiles" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."profiles" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."profiles" TO "service_role";



GRANT INSERT("id") ON TABLE "public"."profiles" TO "authenticated";



GRANT INSERT("full_name"),UPDATE("full_name") ON TABLE "public"."profiles" TO "authenticated";



GRANT INSERT("wake_up_time"),UPDATE("wake_up_time") ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("total_points") ON TABLE "public"."profiles" TO "authenticated";



GRANT INSERT("mochi_name"),UPDATE("mochi_name") ON TABLE "public"."profiles" TO "authenticated";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."quick_notes" TO "anon";
GRANT ALL ON TABLE "public"."quick_notes" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."quick_notes" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."recipe_cook_sessions" TO "anon";
GRANT ALL ON TABLE "public"."recipe_cook_sessions" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."recipe_cook_sessions" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."recipe_ingredients" TO "anon";
GRANT ALL ON TABLE "public"."recipe_ingredients" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."recipe_ingredients" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."recipe_publications" TO "anon";
GRANT ALL ON TABLE "public"."recipe_publications" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."recipe_publications" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."recipe_steps" TO "anon";
GRANT ALL ON TABLE "public"."recipe_steps" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."recipe_steps" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."recipes" TO "anon";
GRANT ALL ON TABLE "public"."recipes" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."recipes" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."rewards" TO "anon";
GRANT ALL ON TABLE "public"."rewards" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."rewards" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."routine_exercises" TO "anon";
GRANT ALL ON TABLE "public"."routine_exercises" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."routine_exercises" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."routine_logs" TO "anon";
GRANT ALL ON TABLE "public"."routine_logs" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."routine_logs" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."routines" TO "anon";
GRANT ALL ON TABLE "public"."routines" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."routines" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."shared_space_members" TO "anon";
GRANT ALL ON TABLE "public"."shared_space_members" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."shared_space_members" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."shared_spaces" TO "anon";
GRANT ALL ON TABLE "public"."shared_spaces" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."shared_spaces" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."streak_recovery_plans" TO "anon";
GRANT ALL ON TABLE "public"."streak_recovery_plans" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."streak_recovery_plans" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."streaks" TO "anon";
GRANT ALL ON TABLE "public"."streaks" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."streaks" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."study_blocks" TO "anon";
GRANT ALL ON TABLE "public"."study_blocks" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."study_blocks" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."study_sessions" TO "anon";
GRANT ALL ON TABLE "public"."study_sessions" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."study_sessions" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."token_transactions" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."token_transactions" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."token_transactions" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."user_achievements" TO "anon";
GRANT ALL ON TABLE "public"."user_achievements" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."user_achievements" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."user_settings" TO "anon";
GRANT ALL ON TABLE "public"."user_settings" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."user_settings" TO "service_role";



GRANT INSERT("user_id") ON TABLE "public"."user_settings" TO "authenticated";



GRANT INSERT("study_enabled"),UPDATE("study_enabled") ON TABLE "public"."user_settings" TO "authenticated";



GRANT INSERT("exercise_enabled"),UPDATE("exercise_enabled") ON TABLE "public"."user_settings" TO "authenticated";



GRANT INSERT("habits_enabled"),UPDATE("habits_enabled") ON TABLE "public"."user_settings" TO "authenticated";



GRANT INSERT("goals_enabled"),UPDATE("goals_enabled") ON TABLE "public"."user_settings" TO "authenticated";



GRANT INSERT("mood_enabled"),UPDATE("mood_enabled") ON TABLE "public"."user_settings" TO "authenticated";



GRANT INSERT("gratitude_enabled"),UPDATE("gratitude_enabled") ON TABLE "public"."user_settings" TO "authenticated";



GRANT UPDATE("updated_at") ON TABLE "public"."user_settings" TO "authenticated";



GRANT INSERT("cooking_enabled"),UPDATE("cooking_enabled") ON TABLE "public"."user_settings" TO "authenticated";



GRANT INSERT("notes_enabled"),UPDATE("notes_enabled") ON TABLE "public"."user_settings" TO "authenticated";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."user_token_tiers" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."user_token_tiers" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."user_token_tiers" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."voucher_templates" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."voucher_templates" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."voucher_templates" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."vouchers" TO "anon";
GRANT ALL ON TABLE "public"."vouchers" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."vouchers" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT UPDATE ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT UPDATE ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT UPDATE ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "service_role";































