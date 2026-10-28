-- Envoltorios para Edge Functions: fijan el usuario y llaman a las RPC existentes.
CREATE OR REPLACE FUNCTION public.server_sync_subscription(
  p_user_id uuid, p_entitlement_id text, p_product_id text, p_status text,
  p_period_start timestamptz, p_period_end timestamptz, p_auto_renew boolean,
  p_store text, p_external_customer_id text, p_event_id text, p_event_type text, p_payload jsonb
) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub', p_user_id, 'role', 'authenticated')::text, true);
  RETURN public.sync_subscription_from_revenuecat(
    p_entitlement_id, p_product_id, p_status, p_period_start, p_period_end, p_auto_renew,
    p_store, p_external_customer_id, p_event_id, p_event_type, p_payload, 'revenuecat');
END;
$$;

CREATE OR REPLACE FUNCTION public.server_claim_ad_credit(
  p_user_id uuid, p_reward_event_id text, p_ad_network text, p_ad_unit_id text
) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub', p_user_id, 'role', 'authenticated')::text, true);
  RETURN public.claim_ai_credit_from_ad(p_reward_event_id, p_ad_network, p_ad_unit_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.server_sync_subscription(uuid, text, text, text, timestamptz, timestamptz, boolean, text, text, text, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.server_claim_ad_credit(uuid, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_sync_subscription(uuid, text, text, text, timestamptz, timestamptz, boolean, text, text, text, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.server_claim_ad_credit(uuid, text, text, text) TO service_role;
