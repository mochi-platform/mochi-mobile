-- Memoria ligera de Mochi: opt-in, sin datos de salud, visible y borrable por la usuaria.

ALTER TABLE public.user_consents DROP CONSTRAINT IF EXISTS user_consents_kind_check;
ALTER TABLE public.user_consents ADD CONSTRAINT user_consents_kind_check
  CHECK (kind IN ('cycle_server', 'ai_usage', 'analytics', 'mochi_memory'));

CREATE TABLE IF NOT EXISTS public.mochi_memory (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('goals', 'exams', 'streak', 'tone')),
  content text NOT NULL CHECK (length(content) <= 400),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, kind)
);
ALTER TABLE public.mochi_memory ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.mochi_memory FROM PUBLIC, anon, authenticated;
GRANT SELECT, DELETE ON public.mochi_memory TO authenticated;
GRANT ALL ON public.mochi_memory TO service_role;
CREATE POLICY mochi_memory_select_own ON public.mochi_memory FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY mochi_memory_delete_own ON public.mochi_memory FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Recalcula la memoria desde metas, exámenes y racha (solo con consentimiento).
CREATE OR REPLACE FUNCTION public.refresh_mochi_memory() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_goals text;
  v_exams text;
  v_streak integer;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  IF NOT public.has_consent(v_uid, 'mochi_memory') THEN RETURN; END IF;

  SELECT left(string_agg(left(title, 60), '; '), 380) INTO v_goals
  FROM (SELECT title FROM public.goals
        WHERE user_id = v_uid AND COALESCE(is_completed, false) = false
        ORDER BY created_at DESC LIMIT 3) g;

  SELECT left(string_agg(left(subject, 40) || ' (' || to_char(exam_date, 'DD/MM') || ')', '; '), 380) INTO v_exams
  FROM (SELECT subject, exam_date FROM public.exam_logs
        WHERE user_id = v_uid AND is_upcoming = true AND exam_date >= current_date
        ORDER BY exam_date LIMIT 3) e;

  SELECT current_streak INTO v_streak FROM public.streaks WHERE user_id = v_uid;

  IF v_goals IS NOT NULL THEN
    INSERT INTO public.mochi_memory (user_id, kind, content) VALUES (v_uid, 'goals', 'Metas activas: ' || v_goals)
    ON CONFLICT (user_id, kind) DO UPDATE SET content = EXCLUDED.content, updated_at = now();
  ELSE
    DELETE FROM public.mochi_memory WHERE user_id = v_uid AND kind = 'goals';
  END IF;

  IF v_exams IS NOT NULL THEN
    INSERT INTO public.mochi_memory (user_id, kind, content) VALUES (v_uid, 'exams', 'Próximos exámenes: ' || v_exams)
    ON CONFLICT (user_id, kind) DO UPDATE SET content = EXCLUDED.content, updated_at = now();
  ELSE
    DELETE FROM public.mochi_memory WHERE user_id = v_uid AND kind = 'exams';
  END IF;

  IF COALESCE(v_streak, 0) > 0 THEN
    INSERT INTO public.mochi_memory (user_id, kind, content) VALUES (v_uid, 'streak', 'Racha actual: ' || v_streak || ' días')
    ON CONFLICT (user_id, kind) DO UPDATE SET content = EXCLUDED.content, updated_at = now();
  ELSE
    DELETE FROM public.mochi_memory WHERE user_id = v_uid AND kind = 'streak';
  END IF;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.refresh_mochi_memory() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.refresh_mochi_memory() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.set_mochi_tone(p_tone text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  IF NOT public.has_consent(v_uid, 'mochi_memory') THEN RAISE EXCEPTION 'Activa primero la memoria de Mochi'; END IF;
  IF p_tone NOT IN ('cálido', 'directo', 'tranquilo') THEN RAISE EXCEPTION 'Tono no válido'; END IF;
  INSERT INTO public.mochi_memory (user_id, kind, content) VALUES (v_uid, 'tone', 'Prefiere un tono ' || p_tone)
  ON CONFLICT (user_id, kind) DO UPDATE SET content = EXCLUDED.content, updated_at = now();
END;
$$;
REVOKE EXECUTE ON FUNCTION public.set_mochi_tone(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_mochi_tone(text) TO authenticated, service_role;

-- Retirar el consentimiento borra la memoria.
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
    UPDATE public.partner_spaces SET shared_fields = shared_fields - 'cycle' WHERE owner_user_id = v_uid;
  END IF;
  IF p_kind = 'mochi_memory' AND NOT p_granted THEN
    DELETE FROM public.mochi_memory WHERE user_id = v_uid;
  END IF;
END;
$$;

-- Texto de memoria para el gateway de IA (vacío sin consentimiento).
CREATE OR REPLACE FUNCTION public.server_get_mochi_memory(p_user_id uuid) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT COALESCE(left(string_agg(content, '. ' ORDER BY kind), 700), '')
  FROM public.mochi_memory
  WHERE user_id = p_user_id AND public.has_consent(p_user_id, 'mochi_memory');
$$;
REVOKE EXECUTE ON FUNCTION public.server_get_mochi_memory(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_get_mochi_memory(uuid) TO service_role;
