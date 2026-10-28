-- Verificación de edad (16+) y consentimiento de tutor para 16-17.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS age_group text CHECK (age_group IN ('16_17', '18_plus'));

ALTER TABLE public.user_consents DROP CONSTRAINT IF EXISTS user_consents_kind_check;
ALTER TABLE public.user_consents ADD CONSTRAINT user_consents_kind_check
  CHECK (kind IN ('cycle_server', 'ai_usage', 'analytics', 'mochi_memory', 'guardian'));

-- La usuaria declara su grupo de edad una vez; para 16-17 exige el consentimiento de madre, padre o tutor.
CREATE OR REPLACE FUNCTION public.set_age_group(p_group text, p_guardian_ok boolean DEFAULT false) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  IF p_group NOT IN ('16_17', '18_plus') THEN RAISE EXCEPTION 'Grupo de edad no válido'; END IF;
  IF p_group = '16_17' AND NOT p_guardian_ok THEN
    RAISE EXCEPTION 'Se requiere el consentimiento de madre, padre o tutor';
  END IF;

  UPDATE public.profiles SET age_group = p_group WHERE id = v_uid;
  IF p_group = '16_17' THEN
    INSERT INTO public.user_consents (user_id, kind, granted, updated_at) VALUES (v_uid, 'guardian', true, now())
    ON CONFLICT (user_id, kind) DO UPDATE SET granted = true, updated_at = now();
  END IF;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.set_age_group(text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_age_group(text, boolean) TO authenticated, service_role;

-- Los clientes no pueden escribir age_group directamente (ya solo tienen UPDATE por columna).
REVOKE UPDATE (age_group) ON public.profiles FROM authenticated;
