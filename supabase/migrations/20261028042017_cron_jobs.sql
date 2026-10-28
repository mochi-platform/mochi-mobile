-- Trabajos programados: limpieza y resumen semanal para la memoria de Mochi.
CREATE EXTENSION IF NOT EXISTS pg_cron;

ALTER TABLE public.mochi_memory DROP CONSTRAINT IF EXISTS mochi_memory_kind_check;
ALTER TABLE public.mochi_memory ADD CONSTRAINT mochi_memory_kind_check
  CHECK (kind IN ('goals', 'exams', 'streak', 'tone', 'week'));

-- Resumen de la semana pasada para quienes activaron la memoria (sin datos de salud).
CREATE OR REPLACE FUNCTION public.refresh_weekly_mochi_memory() RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  r record;
  v_seconds bigint;
  v_sessions integer;
  v_updated integer := 0;
BEGIN
  FOR r IN SELECT user_id FROM public.user_consents WHERE kind = 'mochi_memory' AND granted LOOP
    SELECT COALESCE(sum(duration_seconds), 0), count(*) INTO v_seconds, v_sessions
    FROM public.study_sessions
    WHERE user_id = r.user_id AND completed_at >= now() - interval '7 days';

    IF v_sessions > 0 THEN
      INSERT INTO public.mochi_memory (user_id, kind, content)
      VALUES (r.user_id, 'week',
              'Última semana: ' || round(v_seconds / 3600.0, 1) || ' h de estudio en ' || v_sessions || ' sesiones')
      ON CONFLICT (user_id, kind) DO UPDATE SET content = EXCLUDED.content, updated_at = now();
    ELSE
      DELETE FROM public.mochi_memory WHERE user_id = r.user_id AND kind = 'week';
    END IF;
    v_updated := v_updated + 1;
  END LOOP;
  RETURN v_updated;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.refresh_weekly_mochi_memory() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_weekly_mochi_memory() TO service_role;

CREATE OR REPLACE FUNCTION public.purge_ai_cache() RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path TO 'public'
AS $$ DELETE FROM public.ai_cache WHERE expires_at < now(); $$;
REVOKE EXECUTE ON FUNCTION public.purge_ai_cache() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_ai_cache() TO service_role;

-- Domingo 05:00 UTC (00:00 en Ecuador): resumen semanal. Cada día 06:00 UTC: limpieza.
SELECT cron.schedule('mochi-weekly-memory', '0 5 * * 0', $$SELECT public.refresh_weekly_mochi_memory()$$);
SELECT cron.schedule('mochi-purge-gateway', '0 6 * * *', $$SELECT public.purge_ai_gateway_requests()$$);
SELECT cron.schedule('mochi-purge-ai-cache', '5 6 * * *', $$SELECT public.purge_ai_cache()$$);
