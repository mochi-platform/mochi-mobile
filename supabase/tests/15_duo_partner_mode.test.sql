begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

insert into auth.users (id, instance_id, aud, role, email) values
  ('11111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-000000000000','authenticated','authenticated','ella@test.dev'),
  ('22222222-2222-2222-2222-222222222222','00000000-0000-0000-0000-000000000000','authenticated','authenticated','el@test.dev'),
  ('33333333-3333-3333-3333-333333333333','00000000-0000-0000-0000-000000000000','authenticated','authenticated','otro@test.dev');
insert into public.profiles (id, full_name) values
  ('11111111-1111-1111-1111-111111111111','Ella'),('22222222-2222-2222-2222-222222222222','El'),('33333333-3333-3333-3333-333333333333','Otro')
  on conflict (id) do nothing;
insert into public.partner_spaces (id, owner_user_id, partner_user_id, invite_code, invite_status) values
  ('aaaaaaaa-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','DUOMODE1','accepted');

set local role authenticated;

-- Modo de la app
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
select lives_ok($$select public.set_app_mode('partner')$$, 'él pasa a modo pareja');
select is((select app_mode from public.profiles where id = '22222222-2222-2222-2222-222222222222'), 'partner', 'app_mode guardado');
select throws_ok($$select public.set_app_mode('admin')$$, null, 'Modo no válido', 'no acepta modos inventados');
select throws_ok($$update public.profiles set app_mode = 'personal' where id = auth.uid()$$, '42501', null, 'app_mode no se edita directo');

-- Check-ins
select lives_ok($$select public.upsert_partner_checkin('aaaaaaaa-0000-0000-0000-000000000001', current_date, 4::smallint, 'Te espero con café')$$, 'él comparte su ánimo');
select lives_ok($$select public.upsert_partner_checkin('aaaaaaaa-0000-0000-0000-000000000001', current_date, 5::smallint, null)$$, 'corrige el mismo día (upsert)');
select is((select count(*)::int from public.partner_checkins), 1, 'un solo check-in por día');
select throws_ok($$select public.upsert_partner_checkin('aaaaaaaa-0000-0000-0000-000000000001', current_date - 5, 3::smallint, null)$$, null, 'Fecha no válida', 'no se escriben días lejanos');
select throws_ok($$insert into public.partner_checkins (space_id, user_id, day, mood) values ('aaaaaaaa-0000-0000-0000-000000000001', auth.uid(), current_date + 1, 3)$$, '42501', null, 'sin INSERT directo');

-- Notas
select lives_ok($$select public.send_partner_note('aaaaaaaa-0000-0000-0000-000000000001', 'Mucha suerte hoy')$$, 'él manda una nota');
select throws_ok($$select public.send_partner_note('aaaaaaaa-0000-0000-0000-000000000001', '   ')$$, null, null, 'no hay notas vacías');

-- Ella lee y marca como leídas
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
select is((select count(*)::int from public.partner_notes), 1, 'ella ve la nota');
select is((select mood::int from public.partner_checkins), 5, 'ella ve el ánimo de él');
select lives_ok($$select public.mark_partner_notes_read('aaaaaaaa-0000-0000-0000-000000000001')$$, 'ella marca leídas');

-- Un tercero no ve ni escribe
select set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);
select is((select count(*)::int from public.partner_notes) + (select count(*)::int from public.partner_checkins), 0, 'un tercero no ve nada');
select throws_ok($$select public.send_partner_note('aaaaaaaa-0000-0000-0000-000000000001', 'hola')$$, null, 'No perteneces a este espacio', 'un tercero no escribe');

select * from finish();
rollback;
