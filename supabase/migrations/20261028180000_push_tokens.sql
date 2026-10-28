-- Tokens de notificaciones push (solo Duo) con horas de silencio.
CREATE TABLE IF NOT EXISTS public.push_tokens (
  token text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform text NOT NULL DEFAULT 'android',
  quiet_enabled boolean NOT NULL DEFAULT true,
  quiet_start smallint NOT NULL DEFAULT 22 CHECK (quiet_start BETWEEN 0 AND 23),
  quiet_end smallint NOT NULL DEFAULT 7 CHECK (quiet_end BETWEEN 0 AND 23),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS push_tokens_user_idx ON public.push_tokens (user_id);
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.push_tokens FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_tokens TO authenticated;
GRANT ALL ON public.push_tokens TO service_role;
CREATE POLICY push_tokens_own ON public.push_tokens FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Un token pertenece a una sola usuaria (si cambia de cuenta en el teléfono, se reasigna).
CREATE OR REPLACE FUNCTION public.register_push_token(p_token text, p_platform text DEFAULT 'android') RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  IF p_token IS NULL OR length(p_token) < 10 OR length(p_token) > 300 THEN RAISE EXCEPTION 'Token no válido'; END IF;
  INSERT INTO public.push_tokens (token, user_id, platform) VALUES (p_token, v_uid, COALESCE(p_platform, 'android'))
  ON CONFLICT (token) DO UPDATE SET user_id = v_uid, platform = EXCLUDED.platform, updated_at = now();
END;
$$;
REVOKE EXECUTE ON FUNCTION public.register_push_token(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_push_token(text, text) TO authenticated, service_role;

-- Destinatarios de un vale: solo los tokens de ella, y solo si quien llama creó ese vale (service_role).
CREATE OR REPLACE FUNCTION public.server_voucher_push_targets(p_voucher_id uuid, p_caller uuid) RETURNS TABLE(token text, title text, quiet_enabled boolean, quiet_start smallint, quiet_end smallint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT t.token, v.title, t.quiet_enabled, t.quiet_start, t.quiet_end
  FROM public.vouchers v
  JOIN public.push_tokens t ON t.user_id = v.user_id
  WHERE v.id = p_voucher_id AND v.created_by = p_caller AND v.is_redeemed = false;
$$;
REVOKE EXECUTE ON FUNCTION public.server_voucher_push_targets(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_voucher_push_targets(uuid, uuid) TO service_role;
