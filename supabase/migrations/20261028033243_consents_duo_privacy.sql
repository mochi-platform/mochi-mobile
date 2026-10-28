-- Consentimientos (LOPDP) y privacidad granular de Duo.

CREATE TABLE IF NOT EXISTS public.user_consents (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('cycle_server', 'ai_usage', 'analytics')),
  granted boolean NOT NULL,
  policy_version text NOT NULL DEFAULT '2026-10',
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, kind)
);
ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_consents FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.user_consents TO authenticated;
GRANT ALL ON public.user_consents TO service_role;
CREATE POLICY user_consents_select_own ON public.user_consents FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_consent(p_user_id uuid, p_kind text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT COALESCE((SELECT granted FROM public.user_consents WHERE user_id = p_user_id AND kind = p_kind), false); $$;
REVOKE EXECUTE ON FUNCTION public.has_consent(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_consent(uuid, text) TO service_role;

-- Otorga o revoca un consentimiento. Revocar el del ciclo borra los datos del ciclo en el servidor.
CREATE OR REPLACE FUNCTION public.set_consent(p_kind text, p_granted boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  INSERT INTO public.user_consents (user_id, kind, granted, updated_at)
  VALUES (v_uid, p_kind, p_granted, now())
  ON CONFLICT (user_id, kind) DO UPDATE SET granted = EXCLUDED.granted, updated_at = now();
  IF p_kind = 'cycle_server' AND NOT p_granted THEN
    DELETE FROM public.cycle_logs WHERE user_id = v_uid;
    UPDATE public.partner_spaces
       SET shared_fields = shared_fields - 'cycle'
     WHERE owner_user_id = v_uid;
  END IF;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.set_consent(text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_consent(text, boolean) TO authenticated, service_role;

-- Resumen mínimo del ciclo en el servidor: solo con consentimiento explícito.
REVOKE INSERT, UPDATE ON public.cycle_logs FROM anon, authenticated;
DROP POLICY IF EXISTS "Users can manage their own cycle logs" ON public.cycle_logs;
CREATE POLICY cycle_logs_select_own ON public.cycle_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY cycle_logs_delete_own ON public.cycle_logs FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.log_cycle_summary(
  p_period_start date, p_period_end date DEFAULT NULL, p_cycle_length integer DEFAULT NULL, p_source text DEFAULT 'manual'
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  IF NOT public.has_consent(v_uid, 'cycle_server') THEN RAISE EXCEPTION 'Sin consentimiento'; END IF;
  IF p_period_start > current_date OR p_period_start < current_date - 400 THEN RAISE EXCEPTION 'Fecha inválida'; END IF;
  IF p_cycle_length IS NOT NULL AND (p_cycle_length < 15 OR p_cycle_length > 60) THEN RAISE EXCEPTION 'Duración inválida'; END IF;
  IF p_source NOT IN ('manual', 'health_connect') THEN RAISE EXCEPTION 'Fuente inválida'; END IF;
  DELETE FROM public.cycle_logs WHERE user_id = v_uid AND period_start_date = p_period_start;
  INSERT INTO public.cycle_logs (user_id, period_start_date, period_end_date, cycle_length, source)
  VALUES (v_uid, p_period_start, p_period_end, COALESCE(p_cycle_length, 28), p_source);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.log_cycle_summary(date, date, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_cycle_summary(date, date, integer, text) TO authenticated, service_role;

-- Duo: cada dato se comparte solo si la dueña lo activa (todo apagado por defecto).
ALTER TABLE public.partner_spaces ADD COLUMN IF NOT EXISTS shared_fields jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE OR REPLACE FUNCTION public.update_partner_space_prefs(p_space_id uuid, p_fields jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_clean jsonb := '{}'::jsonb;
  v_key text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  FOREACH v_key IN ARRAY ARRAY['cycle', 'mood', 'study', 'exercise', 'habits', 'cooking'] LOOP
    IF p_fields ? v_key THEN
      v_clean := v_clean || jsonb_build_object(v_key, COALESCE((p_fields ->> v_key)::boolean, false));
    END IF;
  END LOOP;
  IF (v_clean ->> 'cycle')::boolean IS TRUE AND NOT public.has_consent(v_uid, 'cycle_server') THEN
    RAISE EXCEPTION 'Activa primero el consentimiento del ciclo';
  END IF;
  UPDATE public.partner_spaces
     SET shared_fields = shared_fields || v_clean, updated_at = now()
   WHERE id = p_space_id AND owner_user_id = v_uid AND invite_status = 'accepted'
  RETURNING shared_fields INTO v_clean;
  IF v_clean IS NULL THEN RAISE EXCEPTION 'Espacio no encontrado'; END IF;
  RETURN v_clean;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.update_partner_space_prefs(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_partner_space_prefs(uuid, jsonb) TO authenticated, service_role;

-- Snapshot: respeta los interruptores y usa el mismo modelo de fases que la app.
CREATE OR REPLACE FUNCTION public.get_partner_space_snapshot(p_space_id uuid) RETURNS json
LANGUAGE sql SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT json_build_object(
    'shared_fields', ps.shared_fields,
    'cycle_phase', CASE WHEN COALESCE((ps.shared_fields ->> 'cycle')::boolean, false)
                          AND public.has_consent(ps.owner_user_id, 'cycle_server') THEN (
      SELECT CASE
        WHEN cl.period_start_date IS NULL OR current_date < cl.period_start_date THEN 'unknown'
        ELSE (
          WITH d AS (
            SELECT ((current_date - cl.period_start_date) % COALESCE(cl.cycle_length, 28)) + 1 AS day,
                   COALESCE(cl.cycle_length, 28) AS len
          )
          SELECT CASE
            WHEN d.day <= 5 THEN 'menstrual'
            WHEN d.day >= GREATEST(7, d.len - 14) - 1 AND d.day <= GREATEST(7, d.len - 14) + 1 THEN 'ovulatoria'
            WHEN d.day < GREATEST(7, d.len - 14) - 1 THEN 'folicular'
            ELSE 'lutea' END
          FROM d)
      END
      FROM cycle_logs cl WHERE cl.user_id = ps.owner_user_id
      ORDER BY cl.period_start_date DESC LIMIT 1
    ) ELSE NULL END,
    'study_week', CASE WHEN COALESCE((ps.shared_fields ->> 'study')::boolean, false) THEN (
      SELECT COALESCE(SUM(duration_seconds), 0) FROM study_sessions
      WHERE user_id = ps.owner_user_id AND completed_at >= now() - interval '7 days') END,
    'exercise_week', CASE WHEN COALESCE((ps.shared_fields ->> 'exercise')::boolean, false) THEN (
      SELECT COUNT(*) FROM routine_logs
      WHERE user_id = ps.owner_user_id AND completed_at >= now() - interval '7 days') END,
    'habits_week', CASE WHEN COALESCE((ps.shared_fields ->> 'habits')::boolean, false) THEN (
      SELECT COUNT(*) FROM habit_logs
      WHERE user_id = ps.owner_user_id AND log_date >= current_date - 7) END,
    'mood_last', CASE WHEN COALESCE((ps.shared_fields ->> 'mood')::boolean, false) THEN (
      SELECT mood FROM mood_logs WHERE user_id = ps.owner_user_id ORDER BY logged_date DESC LIMIT 1) END,
    'cooking_week', CASE WHEN COALESCE((ps.shared_fields ->> 'cooking')::boolean, false) THEN (
      SELECT COUNT(*) FROM recipe_cook_sessions
      WHERE user_id = ps.owner_user_id AND is_finished = true AND created_at >= now() - interval '7 days') END
  )
  FROM partner_spaces ps
  WHERE ps.id = p_space_id
    AND ps.invite_status = 'accepted'
    AND (ps.owner_user_id = auth.uid() OR ps.partner_user_id = auth.uid());
$$;
REVOKE EXECUTE ON FUNCTION public.get_partner_space_snapshot(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_partner_space_snapshot(uuid) TO authenticated, service_role;
