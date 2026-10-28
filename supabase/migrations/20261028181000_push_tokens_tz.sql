ALTER TABLE public.push_tokens ADD COLUMN IF NOT EXISTS tz_offset_min integer NOT NULL DEFAULT 0 CHECK (tz_offset_min BETWEEN -840 AND 840);

DROP FUNCTION IF EXISTS public.register_push_token(text, text);
CREATE OR REPLACE FUNCTION public.register_push_token(
  p_token text, p_platform text DEFAULT 'android', p_tz_offset_min integer DEFAULT 0,
  p_quiet_enabled boolean DEFAULT true, p_quiet_start smallint DEFAULT 22, p_quiet_end smallint DEFAULT 7
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  IF p_token IS NULL OR length(p_token) < 10 OR length(p_token) > 300 THEN RAISE EXCEPTION 'Token no válido'; END IF;
  INSERT INTO public.push_tokens (token, user_id, platform, tz_offset_min, quiet_enabled, quiet_start, quiet_end)
  VALUES (p_token, v_uid, COALESCE(p_platform, 'android'), LEAST(840, GREATEST(-840, COALESCE(p_tz_offset_min, 0))),
          COALESCE(p_quiet_enabled, true), LEAST(23, GREATEST(0, COALESCE(p_quiet_start, 22))), LEAST(23, GREATEST(0, COALESCE(p_quiet_end, 7))))
  ON CONFLICT (token) DO UPDATE SET user_id = v_uid, platform = EXCLUDED.platform, tz_offset_min = EXCLUDED.tz_offset_min,
    quiet_enabled = EXCLUDED.quiet_enabled, quiet_start = EXCLUDED.quiet_start, quiet_end = EXCLUDED.quiet_end, updated_at = now();
END;
$$;
REVOKE EXECUTE ON FUNCTION public.register_push_token(text, text, integer, boolean, smallint, smallint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_push_token(text, text, integer, boolean, smallint, smallint) TO authenticated, service_role;

DROP FUNCTION IF EXISTS public.server_voucher_push_targets(uuid, uuid);
CREATE OR REPLACE FUNCTION public.server_voucher_push_targets(p_voucher_id uuid, p_caller uuid)
RETURNS TABLE(token text, title text, quiet_enabled boolean, quiet_start smallint, quiet_end smallint, tz_offset_min integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT t.token, v.title, t.quiet_enabled, t.quiet_start, t.quiet_end, t.tz_offset_min
  FROM public.vouchers v
  JOIN public.push_tokens t ON t.user_id = v.user_id
  WHERE v.id = p_voucher_id AND v.created_by = p_caller AND v.is_redeemed = false;
$$;
REVOKE EXECUTE ON FUNCTION public.server_voucher_push_targets(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_voucher_push_targets(uuid, uuid) TO service_role;
