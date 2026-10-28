-- Duo, modo pareja (Remaster, Fase 3):
--   1. profiles.app_mode: quien llega solo por su pareja usa la app en modo «partner».
--   2. partner_checkins: el ánimo del día que cada miembro comparte con el otro.
--   3. partner_notes: notas cortas entre los dos.
-- Escritura solo por RPC; lectura solo para los dos miembros de un espacio aceptado.

-- 1. Modo de la app ---------------------------------------------------------------
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS app_mode text NOT NULL DEFAULT 'personal'
  CHECK (app_mode IN ('personal', 'partner'));

CREATE OR REPLACE FUNCTION public.set_app_mode(p_mode text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  IF p_mode NOT IN ('personal', 'partner') THEN RAISE EXCEPTION 'Modo no válido'; END IF;
  UPDATE public.profiles SET app_mode = p_mode WHERE id = v_uid;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.set_app_mode(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_app_mode(text) TO authenticated, service_role;

-- 2. Pertenencia a un espacio aceptado ----------------------------------------------
CREATE OR REPLACE FUNCTION public.is_space_member(p_space_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.partner_spaces ps
    WHERE ps.id = p_space_id AND ps.invite_status = 'accepted'
      AND auth.uid() IN (ps.owner_user_id, ps.partner_user_id));
$$;
REVOKE EXECUTE ON FUNCTION public.is_space_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_space_member(uuid) TO authenticated, service_role;

-- 3. Check-in compartido -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.partner_checkins (
  space_id uuid NOT NULL REFERENCES public.partner_spaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day date NOT NULL,
  mood smallint NOT NULL CHECK (mood BETWEEN 1 AND 5),
  note text CHECK (note IS NULL OR char_length(note) <= 140),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (space_id, user_id, day)
);
ALTER TABLE public.partner_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_checkins FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.partner_checkins FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.partner_checkins TO authenticated;
GRANT ALL ON public.partner_checkins TO service_role;
CREATE POLICY partner_checkins_members_read ON public.partner_checkins FOR SELECT TO authenticated
  USING (public.is_space_member(space_id));

-- El día lo manda el teléfono (fecha local); se acepta hasta un día de diferencia con el servidor.
CREATE OR REPLACE FUNCTION public.upsert_partner_checkin(p_space_id uuid, p_day date, p_mood smallint, p_note text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  IF NOT public.is_space_member(p_space_id) THEN RAISE EXCEPTION 'No perteneces a este espacio'; END IF;
  IF p_day IS NULL OR abs(p_day - current_date) > 1 THEN RAISE EXCEPTION 'Fecha no válida'; END IF;
  IF p_mood IS NULL OR p_mood NOT BETWEEN 1 AND 5 THEN RAISE EXCEPTION 'Ánimo no válido'; END IF;
  IF p_note IS NOT NULL AND char_length(p_note) > 140 THEN RAISE EXCEPTION 'La nota es muy larga'; END IF;
  INSERT INTO public.partner_checkins (space_id, user_id, day, mood, note)
  VALUES (p_space_id, v_uid, p_day, p_mood, NULLIF(trim(p_note), ''))
  ON CONFLICT (space_id, user_id, day)
  DO UPDATE SET mood = EXCLUDED.mood, note = EXCLUDED.note, updated_at = now();
END;
$$;
REVOKE EXECUTE ON FUNCTION public.upsert_partner_checkin(uuid, date, smallint, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.upsert_partner_checkin(uuid, date, smallint, text) TO authenticated, service_role;

-- 4. Notas -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.partner_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES public.partner_spaces(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);
CREATE INDEX IF NOT EXISTS partner_notes_space_created_idx ON public.partner_notes (space_id, created_at DESC);
ALTER TABLE public.partner_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_notes FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.partner_notes FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.partner_notes TO authenticated;
GRANT ALL ON public.partner_notes TO service_role;
CREATE POLICY partner_notes_members_read ON public.partner_notes FOR SELECT TO authenticated
  USING (public.is_space_member(space_id));

-- Antiabuso: hasta 100 notas por persona al día.
CREATE OR REPLACE FUNCTION public.send_partner_note(p_space_id uuid, p_content text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_text text := trim(COALESCE(p_content, ''));
  v_today integer;
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  IF NOT public.is_space_member(p_space_id) THEN RAISE EXCEPTION 'No perteneces a este espacio'; END IF;
  IF char_length(v_text) = 0 OR char_length(v_text) > 500 THEN RAISE EXCEPTION 'La nota debe tener entre 1 y 500 caracteres'; END IF;
  SELECT count(*) INTO v_today FROM public.partner_notes
   WHERE author_id = v_uid AND created_at > now() - interval '1 day';
  IF v_today >= 100 THEN RAISE EXCEPTION 'Llegaste al límite de notas por hoy'; END IF;
  INSERT INTO public.partner_notes (space_id, author_id, content) VALUES (p_space_id, v_uid, v_text)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.send_partner_note(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_partner_note(uuid, text) TO authenticated, service_role;

-- Marca como leídas las notas del otro (nunca las propias).
CREATE OR REPLACE FUNCTION public.mark_partner_notes_read(p_space_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  IF NOT public.is_space_member(p_space_id) THEN RAISE EXCEPTION 'No perteneces a este espacio'; END IF;
  UPDATE public.partner_notes SET read_at = now()
   WHERE space_id = p_space_id AND author_id <> v_uid AND read_at IS NULL;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.mark_partner_notes_read(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_partner_notes_read(uuid) TO authenticated, service_role;
