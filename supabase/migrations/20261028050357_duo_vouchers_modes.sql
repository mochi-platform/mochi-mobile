-- Duo: vales con modo, canje atómico, límites del plan gratuito y limpieza de tablas heredadas.

-- 1. Tablas heredadas (vacías) y su función.
DROP FUNCTION IF EXISTS public.can_access_space(uuid) CASCADE;
DROP TABLE IF EXISTS public.joint_vouchers CASCADE;
DROP TABLE IF EXISTS public.shared_space_members CASCADE;
DROP TABLE IF EXISTS public.shared_spaces CASCADE;

-- 2. Vales: modo y autoría.
ALTER TABLE public.vouchers ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.vouchers ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'prepaid'
  CHECK (mode IN ('prepaid', 'points', 'gift'));
ALTER TABLE public.vouchers ADD COLUMN IF NOT EXISTS image_url text;

-- 3. Premium de cualquiera de los dos miembros del espacio (Duo Plus).
CREATE OR REPLACE FUNCTION public.user_is_premium(p_uid uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT public.has_active_grant(p_uid, 'premium') OR EXISTS (
    SELECT 1 FROM public.billing_subscriptions b
    WHERE b.user_id = p_uid AND b.entitlement_id = 'premium'
      AND b.status IN ('active', 'grace_period')
      AND (b.current_period_ends_at IS NULL OR b.current_period_ends_at >= now()));
$$;
REVOKE EXECUTE ON FUNCTION public.user_is_premium(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.user_is_premium(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.space_is_plus(p_space_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT COALESCE((SELECT public.user_is_premium(ps.owner_user_id) OR public.user_is_premium(ps.partner_user_id)
                   FROM public.partner_spaces ps WHERE ps.id = p_space_id), false);
$$;
REVOKE EXECUTE ON FUNCTION public.space_is_plus(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.space_is_plus(uuid) TO service_role;

-- 4. La pareja crea un vale para ella: por puntos (ella los canjea) o regalo directo.
CREATE OR REPLACE FUNCTION public.create_partner_voucher(
  p_space_id uuid, p_title text, p_description text, p_points_cost integer,
  p_icon text, p_color text, p_mode text, p_image_url text DEFAULT NULL, p_template_id uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_space public.partner_spaces%ROWTYPE;
  v_pending integer;
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  SELECT * INTO v_space FROM public.partner_spaces
   WHERE id = p_space_id AND invite_status = 'accepted' AND partner_user_id = v_uid;
  IF NOT FOUND THEN RAISE EXCEPTION 'Solo la pareja del espacio puede crear vales'; END IF;

  IF p_mode NOT IN ('points', 'gift') THEN RAISE EXCEPTION 'Modo no válido'; END IF;
  IF length(trim(COALESCE(p_title, ''))) = 0 OR length(p_title) > 80 THEN RAISE EXCEPTION 'Título no válido'; END IF;
  IF p_mode = 'points' AND (p_points_cost IS NULL OR p_points_cost < 1 OR p_points_cost > 1000) THEN
    RAISE EXCEPTION 'Costo en puntos no válido';
  END IF;

  IF NOT public.space_is_plus(p_space_id) THEN
    SELECT count(*) INTO v_pending FROM public.vouchers WHERE space_id = p_space_id AND is_redeemed = false;
    IF v_pending >= 3 THEN RAISE EXCEPTION 'El plan gratuito permite 3 vales pendientes. Duo Plus no tiene límite'; END IF;
    IF p_image_url IS NOT NULL THEN RAISE EXCEPTION 'Los vales con imagen son parte de Duo Plus'; END IF;
  END IF;

  INSERT INTO public.vouchers (user_id, created_by, space_id, template_id, title, description, points_cost, icon, color, mode, image_url, is_redeemed)
  VALUES (v_space.owner_user_id, v_uid, p_space_id, p_template_id, trim(p_title), p_description,
          CASE WHEN p_mode = 'gift' THEN 0 ELSE p_points_cost END,
          COALESCE(p_icon, 'ticket-outline'), COALESCE(p_color, 'yellow'), p_mode, p_image_url, false)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.create_partner_voucher(uuid, text, text, integer, text, text, text, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_partner_voucher(uuid, text, text, integer, text, text, text, text, uuid) TO authenticated, service_role;

-- 5. Canje atómico. Por puntos: solo ella, y se descuentan en la misma transacción.
CREATE OR REPLACE FUNCTION public.redeem_voucher(p_voucher_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v public.vouchers%ROWTYPE;
  v_is_partner boolean;
  v_points integer;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  SELECT * INTO v FROM public.vouchers WHERE id = p_voucher_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Vale no encontrado'; END IF;
  IF v.is_redeemed THEN RAISE EXCEPTION 'Este vale ya fue canjeado'; END IF;

  v_is_partner := v.space_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.partner_spaces ps
    WHERE ps.id = v.space_id AND ps.partner_user_id = v_uid AND ps.invite_status = 'accepted');
  IF v.user_id <> v_uid AND NOT v_is_partner THEN RAISE EXCEPTION 'No tienes permiso sobre este vale'; END IF;

  IF v.mode = 'points' THEN
    IF v.user_id <> v_uid THEN RAISE EXCEPTION 'Solo ella puede canjear este vale con sus puntos'; END IF;
    SELECT total_points INTO v_points FROM public.profiles WHERE id = v_uid FOR UPDATE;
    IF COALESCE(v_points, 0) < v.points_cost THEN RAISE EXCEPTION 'No tienes suficientes puntos'; END IF;
    UPDATE public.profiles SET total_points = total_points - v.points_cost WHERE id = v_uid;
  END IF;

  UPDATE public.vouchers
     SET is_redeemed = true, redeemed_at = now(), redeemed_by = v_uid, updated_by_partner = (v.user_id <> v_uid)
   WHERE id = p_voucher_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.redeem_voucher(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_voucher(uuid) TO authenticated, service_role;

-- Todo cambio de vales pasa por RPC.
REVOKE UPDATE ON public.vouchers FROM authenticated;
DROP POLICY IF EXISTS owner_update_own_vouchers ON public.vouchers;
DROP POLICY IF EXISTS partner_update_shared_vouchers ON public.vouchers;

-- 6. Metas compartidas: 3 activas en el plan gratuito.
CREATE OR REPLACE FUNCTION public.joint_goals_plan_limit() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.space_is_plus(NEW.space_id)
     AND (SELECT count(*) FROM public.joint_goals WHERE space_id = NEW.space_id AND is_completed = false) >= 3 THEN
    RAISE EXCEPTION 'El plan gratuito permite 3 metas compartidas activas. Duo Plus no tiene límite';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.joint_goals_plan_limit() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS joint_goals_plan_limit ON public.joint_goals;
CREATE TRIGGER joint_goals_plan_limit BEFORE INSERT ON public.joint_goals
  FOR EACH ROW EXECUTE FUNCTION public.joint_goals_plan_limit();

-- 7. Imágenes de vales (Duo Plus): bucket privado; la pareja sube a la carpeta de su espacio.
INSERT INTO storage.buckets (id, name, public) VALUES ('voucher-images', 'voucher-images', false)
ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS voucher_images_partner_write ON storage.objects;
CREATE POLICY voucher_images_partner_write ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'voucher-images' AND EXISTS (
    SELECT 1 FROM public.partner_spaces ps
    WHERE ps.id::text = (storage.foldername(name))[1] AND ps.partner_user_id = auth.uid()
      AND ps.invite_status = 'accepted') AND public.space_is_plus((storage.foldername(name))[1]::uuid));
DROP POLICY IF EXISTS voucher_images_members_read ON storage.objects;
CREATE POLICY voucher_images_members_read ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'voucher-images' AND EXISTS (
    SELECT 1 FROM public.partner_spaces ps
    WHERE ps.id::text = (storage.foldername(name))[1]
      AND (ps.owner_user_id = auth.uid() OR ps.partner_user_id = auth.uid())));
