-- Puntos decididos por el servidor, idempotentes y con tope diario.
CREATE TABLE IF NOT EXISTS public.point_rules (
  event text PRIMARY KEY,
  points integer NOT NULL CHECK (points > 0),
  daily_cap integer NOT NULL DEFAULT 20 CHECK (daily_cap > 0)
);
ALTER TABLE public.point_rules ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.point_rules FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.point_rules TO authenticated;
GRANT ALL ON public.point_rules TO service_role;
CREATE POLICY point_rules_read ON public.point_rules FOR SELECT TO authenticated USING (true);

INSERT INTO public.point_rules (event, points, daily_cap) VALUES
  ('routine_completed', 10, 10),
  ('recipe_completed', 15, 10),
  ('study_session', 5, 40),
  ('goal_completed', 15, 10),
  ('exam_logged', 20, 10),
  ('cooking_session', 5, 20),
  ('gratitude_entry', 3, 3)
ON CONFLICT (event) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.points_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event text NOT NULL,
  ref text,
  points integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS points_ledger_user_event_ref_uidx
  ON public.points_ledger (user_id, event, ref) WHERE ref IS NOT NULL;
CREATE INDEX IF NOT EXISTS points_ledger_user_day_idx ON public.points_ledger (user_id, event, created_at);
ALTER TABLE public.points_ledger ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.points_ledger FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.points_ledger TO authenticated;
GRANT ALL ON public.points_ledger TO service_role;
CREATE POLICY points_ledger_select_own ON public.points_ledger FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.award_points(p_event text, p_ref text DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_rule public.point_rules%ROWTYPE;
  v_today integer;
  v_inserted integer;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  SELECT * INTO v_rule FROM public.point_rules WHERE event = p_event;
  IF NOT FOUND THEN RAISE EXCEPTION 'Evento desconocido'; END IF;

  SELECT COALESCE(sum(points), 0) INTO v_today FROM public.points_ledger
   WHERE user_id = v_uid AND event = p_event AND created_at >= date_trunc('day', now() AT TIME ZONE 'America/Guayaquil') AT TIME ZONE 'America/Guayaquil';
  IF v_today + v_rule.points > v_rule.daily_cap * v_rule.points THEN RETURN 0; END IF;

  INSERT INTO public.points_ledger (user_id, event, ref, points)
  VALUES (v_uid, p_event, p_ref, v_rule.points)
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  IF v_inserted = 0 THEN RETURN 0; END IF;

  UPDATE public.profiles SET total_points = COALESCE(total_points, 0) + v_rule.points WHERE id = v_uid;
  RETURN v_rule.points;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.award_points(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.award_points(text, text) TO authenticated, service_role;

-- Generar vale: descuenta puntos y crea el vale en una sola transacción.
CREATE OR REPLACE FUNCTION public.generate_voucher(p_template_id uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_t public.voucher_templates%ROWTYPE;
  v_points integer;
  v_space uuid;
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  SELECT * INTO v_t FROM public.voucher_templates WHERE id = p_template_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Plantilla no encontrada'; END IF;

  SELECT total_points INTO v_points FROM public.profiles WHERE id = v_uid FOR UPDATE;
  IF COALESCE(v_points, 0) < v_t.points_cost THEN RAISE EXCEPTION 'No tienes suficientes puntos'; END IF;

  SELECT id INTO v_space FROM public.partner_spaces
   WHERE invite_status = 'accepted' AND (owner_user_id = v_uid OR partner_user_id = v_uid) LIMIT 1;

  UPDATE public.profiles SET total_points = total_points - v_t.points_cost WHERE id = v_uid;
  INSERT INTO public.vouchers (user_id, template_id, title, description, points_cost, icon, color, is_redeemed, space_id)
  VALUES (v_uid, v_t.id, v_t.title, v_t.description, v_t.points_cost, v_t.icon, v_t.color, false, v_space)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.generate_voucher(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_voucher(uuid) TO authenticated, service_role;

-- Cierre: el cliente ya no escribe puntos ni usa increment_points.
REVOKE UPDATE (total_points) ON public.profiles FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_points(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_points(uuid, integer) TO service_role;
