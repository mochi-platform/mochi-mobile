-- Datos de producción: no se ejecuta en entornos sin esa cuenta.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = 'fd781ba2-0c1c-4b98-bdc8-f29db453fa0d') THEN
    INSERT INTO public.entitlement_grants (user_id, entitlement, reason, granted_by) VALUES
      ('fd781ba2-0c1c-4b98-bdc8-f29db453fa0d','premium','Premium de por vida','owner'),
      ('fd781ba2-0c1c-4b98-bdc8-f29db453fa0d','unlimited_ai','IA sin límites (tope antiabuso)','owner')
    ON CONFLICT (user_id, entitlement) DO NOTHING;
    PERFORM public.set_admin('fd781ba2-0c1c-4b98-bdc8-f29db453fa0d', true);
  END IF;
END $$;
