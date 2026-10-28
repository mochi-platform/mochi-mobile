-- Correcciones de la revisión de seguridad.

-- 1. Guard de user_settings: no lanza excepción; conserva los valores anteriores.
CREATE OR REPLACE FUNCTION public.guard_user_settings_private_flags() RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  jwt_role text := COALESCE(NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '');
  is_privileged boolean := (jwt_role = 'service_role' OR current_user IN ('postgres', 'supabase_admin'));
BEGIN
  IF NOT is_privileged THEN
    IF TG_OP = 'INSERT' THEN
      NEW.partner_features_enabled := FALSE;
    ELSE
      NEW.partner_features_enabled := OLD.partner_features_enabled;
    END IF;
  END IF;
  -- Defensa en profundidad: sin Duo no hay vales.
  IF COALESCE(NEW.partner_features_enabled, FALSE) = FALSE THEN
    NEW.vouchers_enabled := FALSE;
  ELSIF NOT is_privileged AND TG_OP = 'UPDATE' THEN
    NEW.vouchers_enabled := OLD.vouchers_enabled;
  END IF;
  RETURN NEW;
END;
$$;
UPDATE public.user_settings SET vouchers_enabled = FALSE
  WHERE COALESCE(partner_features_enabled, FALSE) = FALSE AND vouchers_enabled IS DISTINCT FROM FALSE;

-- 3. Vales: el cliente solo puede marcar como canjeado; nunca insertar, borrar ni des-canjear.
REVOKE INSERT, UPDATE, DELETE ON public.vouchers FROM anon, authenticated;
GRANT UPDATE (is_redeemed, redeemed_at, redeemed_by, updated_by_partner) ON public.vouchers TO authenticated;
DROP POLICY IF EXISTS "Users manage their own vouchers" ON public.vouchers;
DROP POLICY IF EXISTS "owner_manage_own_vouchers" ON public.vouchers;
CREATE POLICY owner_select_own_vouchers ON public.vouchers FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY partner_select_shared_vouchers ON public.vouchers FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.partner_spaces ps
    WHERE ps.id = vouchers.space_id AND ps.partner_user_id = auth.uid()
      AND ps.invite_status = 'accepted' AND ps.owner_user_id = vouchers.user_id));
CREATE POLICY owner_update_own_vouchers ON public.vouchers FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.vouchers_no_unredeem() RETURNS trigger
LANGUAGE plpgsql SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.is_redeemed AND NOT COALESCE(NEW.is_redeemed, FALSE)
     AND current_user NOT IN ('postgres', 'supabase_admin', 'service_role') THEN
    RAISE EXCEPTION 'Un vale canjeado no se puede reutilizar';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.vouchers_no_unredeem() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS vouchers_no_unredeem ON public.vouchers;
CREATE TRIGGER vouchers_no_unredeem BEFORE UPDATE ON public.vouchers
  FOR EACH ROW EXECUTE FUNCTION public.vouchers_no_unredeem();

-- Políticas muertas de partner_spaces.
DROP POLICY IF EXISTS partner_update_space ON public.partner_spaces;
DROP POLICY IF EXISTS creator_insert_space ON public.partner_spaces;

-- 6. Puntos: topes más bajos y bloqueo contra concurrencia.
UPDATE public.point_rules SET daily_cap = CASE event
  WHEN 'routine_completed' THEN 5 WHEN 'recipe_completed' THEN 5 WHEN 'study_session' THEN 12
  WHEN 'goal_completed' THEN 5 WHEN 'exam_logged' THEN 3 WHEN 'cooking_session' THEN 10
  WHEN 'gratitude_entry' THEN 1 ELSE daily_cap END;

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

  PERFORM pg_advisory_xact_lock(hashtext('pts' || v_uid::text));

  SELECT COALESCE(sum(points), 0) INTO v_today FROM public.points_ledger
   WHERE user_id = v_uid AND event = p_event
     AND created_at >= date_trunc('day', now() AT TIME ZONE 'America/Guayaquil') AT TIME ZONE 'America/Guayaquil';
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

-- 2. Cobro de créditos en el servidor (gateway de IA) con reembolso si falla el proveedor.
CREATE OR REPLACE FUNCTION public.server_apply_plan_limits(p_user_id uuid, p_source_ref text)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub', p_user_id, 'role', 'authenticated')::text, true);
  RETURN public.apply_plan_limits_for_ai('ai_gateway', p_source_ref, NULL);
END;
$$;

CREATE OR REPLACE FUNCTION public.server_refund_ai_credit(p_user_id uuid, p_source_ref text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text));
  -- Plan gratis: devolver el crédito consumido.
  IF EXISTS (SELECT 1 FROM public.ai_credits_ledger
             WHERE user_id = p_user_id AND source_ref = p_source_ref AND delta < 0)
     AND NOT EXISTS (SELECT 1 FROM public.ai_credits_ledger
             WHERE user_id = p_user_id AND source_ref = p_source_ref AND reason = 'refund') THEN
    INSERT INTO public.ai_credits_ledger (user_id, delta, reason, source_ref)
    VALUES (p_user_id, 1, 'refund', p_source_ref);
  END IF;
  -- Premium: la fila de delta 0 deja de contar para el tope diario.
  DELETE FROM public.ai_credits_ledger
   WHERE user_id = p_user_id AND source_ref = p_source_ref AND delta = 0 AND reason = 'ai_gateway';
END;
$$;

-- Comprobación sin consumo, para que el cliente muestre el aviso antes de llamar.
CREATE OR REPLACE FUNCTION public.check_ai_allowance() RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_premium boolean;
  v_balance integer;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  v_premium := (public.get_user_plan()->>'is_premium')::boolean;
  SELECT COALESCE(SUM(delta), 0) INTO v_balance FROM public.ai_credits_ledger WHERE user_id = v_uid;
  RETURN json_build_object('allowed', v_premium OR v_balance > 0, 'plan_key', CASE WHEN v_premium THEN 'premium' ELSE 'free' END,
    'balance', v_balance, 'reason', CASE WHEN v_premium OR v_balance > 0 THEN NULL ELSE 'no_credits' END);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.server_apply_plan_limits(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.server_refund_ai_credit(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_apply_plan_limits(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.server_refund_ai_credit(uuid, text) TO service_role;
REVOKE EXECUTE ON FUNCTION public.check_ai_allowance() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_ai_allowance() TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.award_points(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.award_points(text, text) TO authenticated, service_role;

-- Los clientes ya no consumen créditos directamente: lo hace el gateway.
REVOKE EXECUTE ON FUNCTION public.apply_plan_limits_for_ai(text, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.consume_ai_credit(text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_plan_limits_for_ai(text, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_ai_credit(text, text, jsonb) TO service_role;

-- Purga del registro del gateway.
CREATE OR REPLACE FUNCTION public.purge_ai_gateway_requests() RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path TO 'public'
AS $$ DELETE FROM public.ai_gateway_requests WHERE created_at < now() - interval '2 days'; $$;
REVOKE EXECUTE ON FUNCTION public.purge_ai_gateway_requests() FROM PUBLIC, anon, authenticated;
