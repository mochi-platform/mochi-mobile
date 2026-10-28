-- Políticas duplicadas.
DROP POLICY IF EXISTS "Users insert their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users update their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users manage own cycle logs" ON public.cycle_logs;

-- Las invitaciones pendientes caducan a los 7 días.
CREATE OR REPLACE FUNCTION public.accept_partner_invite(p_invite_code text) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
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
    AND invite_status = 'pending'
    AND created_at > now() - interval '7 days';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Codigo de invitacion invalido, vencido o ya usado';
  END IF;

  IF v_space.owner_user_id = auth.uid() THEN
    RAISE EXCEPTION 'No puedes aceptar tu propia invitacion';
  END IF;

  UPDATE partner_spaces
  SET partner_user_id = auth.uid(), invite_status = 'accepted', updated_at = now()
  WHERE id = v_space.id;

  UPDATE user_settings
  SET partner_features_enabled = true
  WHERE user_id IN (v_space.owner_user_id, auth.uid());

  RETURN json_build_object('space_id', v_space.id, 'success', true);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.accept_partner_invite(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_partner_invite(text) TO authenticated, service_role;
