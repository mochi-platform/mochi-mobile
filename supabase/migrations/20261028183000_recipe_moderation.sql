-- Moderación de recetas publicadas: reportes de usuarias, ocultamiento automático y revisión admin.
ALTER TABLE public.recipe_publications
  ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hidden_reason text;

CREATE TABLE IF NOT EXISTS public.recipe_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id uuid NOT NULL REFERENCES public.recipe_publications(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL CHECK (reason IN ('inappropriate', 'spam', 'dangerous', 'copyright', 'other')),
  details text CHECK (details IS NULL OR length(details) <= 300),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'dismissed', 'actioned')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (publication_id, reporter_id)
);
CREATE INDEX IF NOT EXISTS recipe_reports_status_idx ON public.recipe_reports (status, created_at DESC);
ALTER TABLE public.recipe_reports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.recipe_reports FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.recipe_reports TO service_role;
-- Sin políticas para authenticated: solo se escribe vía report_recipe y solo lee el admin vía RPC.

-- La visibilidad pública excluye lo oculto; la dueña sigue viendo lo suyo.
DROP POLICY IF EXISTS recipe_publications_select_public ON public.recipe_publications;
CREATE POLICY recipe_publications_select_public ON public.recipe_publications FOR SELECT
  USING ((is_published = true AND is_hidden = false) OR auth.uid() = owner_id);

-- La dueña no puede levantar un ocultamiento editando su fila.
CREATE OR REPLACE FUNCTION public.guard_publication_moderation() RETURNS trigger
LANGUAGE plpgsql SET search_path TO 'public'
AS $$
BEGIN
  IF current_user NOT IN ('postgres', 'supabase_admin', 'service_role') AND NOT public.is_admin_user() THEN
    IF TG_OP = 'INSERT' THEN
      NEW.is_hidden := false; NEW.hidden_reason := NULL;
    ELSE
      NEW.is_hidden := OLD.is_hidden; NEW.hidden_reason := OLD.hidden_reason;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_publication_moderation ON public.recipe_publications;
CREATE TRIGGER guard_publication_moderation BEFORE INSERT OR UPDATE ON public.recipe_publications
  FOR EACH ROW EXECUTE FUNCTION public.guard_publication_moderation();

-- Reportar: una vez por persona; con 3 reportes distintos abiertos se oculta hasta que el admin revise.
CREATE OR REPLACE FUNCTION public.report_recipe(p_publication_id uuid, p_reason text, p_details text DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_uid uuid := auth.uid(); v_owner uuid; v_open integer;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  SELECT owner_id INTO v_owner FROM public.recipe_publications WHERE id = p_publication_id AND is_published = true;
  IF v_owner IS NULL THEN RAISE EXCEPTION 'Receta no encontrada'; END IF;
  IF v_owner = v_uid THEN RAISE EXCEPTION 'No puedes reportar tu propia receta'; END IF;
  INSERT INTO public.recipe_reports (publication_id, reporter_id, reason, details)
  VALUES (p_publication_id, v_uid, p_reason, left(p_details, 300))
  ON CONFLICT (publication_id, reporter_id) DO NOTHING;
  SELECT count(*) INTO v_open FROM public.recipe_reports WHERE publication_id = p_publication_id AND status = 'open';
  IF v_open >= 3 THEN
    UPDATE public.recipe_publications SET is_hidden = true, hidden_reason = 'Ocultada por reportes' WHERE id = p_publication_id AND is_hidden = false;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_recipe_reports()
RETURNS TABLE(publication_id uuid, title text, owner_name text, is_hidden boolean, open_reports bigint, reasons text[], last_report_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_admin_user() THEN RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501'; END IF;
  RETURN QUERY
    SELECT p.id, p.title, p.owner_name, p.is_hidden, count(r.id), array_agg(DISTINCT r.reason), max(r.created_at)
    FROM public.recipe_reports r JOIN public.recipe_publications p ON p.id = r.publication_id
    WHERE r.status = 'open'
    GROUP BY p.id, p.title, p.owner_name, p.is_hidden ORDER BY max(r.created_at) DESC LIMIT 200;
END;
$$;

-- Resolver: ocultar de forma definitiva (actioned) o descartar los reportes y volver a mostrar (dismissed).
CREATE OR REPLACE FUNCTION public.admin_resolve_recipe_reports(p_publication_id uuid, p_hide boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_admin_user() THEN RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501'; END IF;
  UPDATE public.recipe_reports SET status = CASE WHEN p_hide THEN 'actioned' ELSE 'dismissed' END
    WHERE publication_id = p_publication_id AND status = 'open';
  UPDATE public.recipe_publications
    SET is_hidden = p_hide, hidden_reason = CASE WHEN p_hide THEN 'Retirada por moderación' ELSE NULL END
    WHERE id = p_publication_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.report_recipe(uuid, text, text), public.admin_list_recipe_reports(),
  public.admin_resolve_recipe_reports(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.report_recipe(uuid, text, text), public.admin_list_recipe_reports(),
  public.admin_resolve_recipe_reports(uuid, boolean) TO authenticated, service_role;
