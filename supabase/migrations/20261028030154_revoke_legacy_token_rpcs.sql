REVOKE EXECUTE ON FUNCTION public.grant_mochi_tokens(uuid, integer, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.spend_mochi_tokens(uuid, integer, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_mochi_tokens(uuid, integer, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.spend_mochi_tokens(uuid, integer, text, text) TO service_role;
