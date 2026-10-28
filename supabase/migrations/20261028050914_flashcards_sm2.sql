-- Repaso espaciado (SM-2) calculado en el servidor.
ALTER TABLE public.flashcards ADD COLUMN IF NOT EXISTS ease_factor numeric(4,2) NOT NULL DEFAULT 2.5;
ALTER TABLE public.flashcards ADD COLUMN IF NOT EXISTS interval_days integer NOT NULL DEFAULT 0;
ALTER TABLE public.flashcards ADD COLUMN IF NOT EXISTS repetitions integer NOT NULL DEFAULT 0;
ALTER TABLE public.flashcards ADD COLUMN IF NOT EXISTS due_at timestamptz NOT NULL DEFAULT now();
CREATE INDEX IF NOT EXISTS flashcards_due_idx ON public.flashcards (deck_id, due_at);

-- Los campos de repaso solo cambian con la RPC; el cliente solo edita el texto.
REVOKE UPDATE ON public.flashcards FROM authenticated;
GRANT UPDATE (front, back) ON public.flashcards TO authenticated;

-- q: 0 (olvidé) a 5 (fácil). Algoritmo SM-2.
CREATE OR REPLACE FUNCTION public.review_flashcard(p_card_id uuid, p_quality integer) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  c public.flashcards%ROWTYPE;
  v_ef numeric;
  v_reps integer;
  v_interval integer;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  IF p_quality IS NULL OR p_quality < 0 OR p_quality > 5 THEN RAISE EXCEPTION 'Calidad no válida'; END IF;

  SELECT f.* INTO c FROM public.flashcards f
   JOIN public.flashcard_decks d ON d.id = f.deck_id
   WHERE f.id = p_card_id AND d.user_id = v_uid FOR UPDATE OF f;
  IF NOT FOUND THEN RAISE EXCEPTION 'Tarjeta no encontrada'; END IF;

  v_ef := GREATEST(1.3, c.ease_factor + 0.1 - (5 - p_quality) * (0.08 + (5 - p_quality) * 0.02));
  IF p_quality < 3 THEN
    v_reps := 0;
    v_interval := 1;
    v_ef := c.ease_factor; -- fallar no cambia la facilidad
  ELSE
    v_reps := c.repetitions + 1;
    v_interval := CASE v_reps WHEN 1 THEN 1 WHEN 2 THEN 6 ELSE round(GREATEST(c.interval_days, 1) * v_ef)::integer END;
  END IF;

  UPDATE public.flashcards
     SET ease_factor = v_ef, repetitions = v_reps, interval_days = v_interval,
         due_at = now() + make_interval(days => v_interval),
         last_reviewed_at = now(), review_count = COALESCE(review_count, 0) + 1,
         difficulty_rating = CASE WHEN p_quality >= 4 THEN 1 WHEN p_quality = 3 THEN 2 ELSE 3 END
   WHERE id = p_card_id;

  RETURN jsonb_build_object('interval_days', v_interval, 'ease_factor', v_ef, 'repetitions', v_reps);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.review_flashcard(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_flashcard(uuid, integer) TO authenticated, service_role;
