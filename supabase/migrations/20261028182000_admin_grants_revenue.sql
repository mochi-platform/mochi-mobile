-- Panel admin: concesiones manuales y resumen de ingresos. Todas exigen is_admin_user().
CREATE OR REPLACE FUNCTION public.admin_list_grants()
RETURNS TABLE(id uuid, user_id uuid, full_name text, entitlement text, reason text, granted_by text, expires_at timestamptz, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_admin_user() THEN RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501'; END IF;
  RETURN QUERY
    SELECT g.id, g.user_id, p.full_name, g.entitlement, g.reason, g.granted_by, g.expires_at, g.created_at
    FROM public.entitlement_grants g LEFT JOIN public.profiles p ON p.id = g.user_id
    ORDER BY g.created_at DESC LIMIT 200;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_grant_entitlement(p_user_id uuid, p_entitlement text, p_reason text, p_expires_at timestamptz DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_admin_user() THEN RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501'; END IF;
  IF p_entitlement NOT IN ('premium', 'unlimited_ai') THEN RAISE EXCEPTION 'Concesión no válida'; END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN RAISE EXCEPTION 'Usuaria no encontrada'; END IF;
  INSERT INTO public.entitlement_grants (user_id, entitlement, reason, granted_by, expires_at)
  VALUES (p_user_id, p_entitlement, left(p_reason, 200), 'admin:' || auth.uid()::text, p_expires_at)
  ON CONFLICT (user_id, entitlement) DO UPDATE
    SET reason = EXCLUDED.reason, granted_by = EXCLUDED.granted_by, expires_at = EXCLUDED.expires_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_revoke_grant(p_grant_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_admin_user() THEN RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501'; END IF;
  DELETE FROM public.entitlement_grants WHERE id = p_grant_id;
END;
$$;

-- Suscripciones activas por producto y tienda (el precio lo aplica el panel).
CREATE OR REPLACE FUNCTION public.admin_revenue_summary()
RETURNS TABLE(product_id text, store text, active_count bigint, renewing_count bigint, cancelled_30d bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_admin_user() THEN RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501'; END IF;
  RETURN QUERY
    SELECT b.product_id, b.store,
      count(*) FILTER (WHERE b.status IN ('active', 'grace_period')),
      count(*) FILTER (WHERE b.status IN ('active', 'grace_period') AND b.auto_renew),
      count(*) FILTER (WHERE b.status IN ('cancelled', 'expired') AND b.updated_at > now() - interval '30 days')
    FROM public.billing_subscriptions b
    GROUP BY b.product_id, b.store
    ORDER BY 3 DESC;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_list_grants(), public.admin_grant_entitlement(uuid, text, text, timestamptz),
  public.admin_revoke_grant(uuid), public.admin_revenue_summary() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_grants(), public.admin_grant_entitlement(uuid, text, text, timestamptz),
  public.admin_revoke_grant(uuid), public.admin_revenue_summary() TO authenticated, service_role;
