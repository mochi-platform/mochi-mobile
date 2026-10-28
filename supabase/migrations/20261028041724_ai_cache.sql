-- Caché de respuestas deterministas de IA (solo servicio).
CREATE TABLE IF NOT EXISTS public.ai_cache (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS ai_cache_expires_idx ON public.ai_cache (expires_at);
ALTER TABLE public.ai_cache ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_cache FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.ai_cache TO service_role;
