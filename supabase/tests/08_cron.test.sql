begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

insert into auth.users (id, instance_id, aud, role, email) values
  ('11111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-000000000000','authenticated','authenticated','a@test.dev'),
  ('22222222-2222-2222-2222-222222222222','00000000-0000-0000-0000-000000000000','authenticated','authenticated','b@test.dev');
insert into public.profiles (id, full_name) values ('11111111-1111-1111-1111-111111111111','A'),('22222222-2222-2222-2222-222222222222','B') on conflict (id) do nothing;
insert into public.user_consents (user_id, kind, granted) values ('11111111-1111-1111-1111-111111111111','mochi_memory', true);
insert into public.study_sessions (user_id, duration_seconds, completed_at, subject) values
  ('11111111-1111-1111-1111-111111111111', 3600, now() - interval '1 day', 'Mate'),
  ('11111111-1111-1111-1111-111111111111', 1800, now() - interval '2 days', 'Mate'),
  ('22222222-2222-2222-2222-222222222222', 3600, now() - interval '1 day', 'Mate');

select is(public.refresh_weekly_mochi_memory(), 1, 'solo procesa a quien activó la memoria');
select is((select content from public.mochi_memory where user_id='11111111-1111-1111-1111-111111111111' and kind='week'),
  'Última semana: 1.5 h de estudio en 2 sesiones', 'resume la semana');
select is((select count(*)::int from public.mochi_memory where user_id='22222222-2222-2222-2222-222222222222'), 0, 'sin consentimiento no guarda nada');

set local role authenticated;
select throws_ok($$select public.refresh_weekly_mochi_memory()$$, '42501', null, 'el cliente no puede ejecutar el trabajo');

select * from finish();
rollback;
