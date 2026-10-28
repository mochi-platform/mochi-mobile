begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

insert into auth.users (id, instance_id, aud, role, email) values
  ('11111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-000000000000','authenticated','authenticated','a@test.dev'),
  ('22222222-2222-2222-2222-222222222222','00000000-0000-0000-0000-000000000000','authenticated','authenticated','b@test.dev');
insert into public.profiles (id, full_name) values
  ('11111111-1111-1111-1111-111111111111','A'),('22222222-2222-2222-2222-222222222222','B') on conflict (id) do nothing;
insert into public.partner_spaces (id, owner_user_id, partner_user_id, invite_code, invite_status) values
  ('aaaaaaaa-0000-0000-0000-000000000009','11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','SNAPCODE','accepted');
insert into public.mood_logs (user_id, mood, logged_date) values ('11111111-1111-1111-1111-111111111111', 4, current_date);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

select throws_ok($$select public.log_cycle_summary(current_date - 3)$$, null, 'Sin consentimiento', 'no guarda ciclo sin consentimiento');
select throws_ok($$insert into public.cycle_logs (user_id, period_start_date) values ('11111111-1111-1111-1111-111111111111', current_date)$$,
  '42501', null, 'no inserta ciclo directamente');
select lives_ok($$select public.set_consent('cycle_server', true)$$, 'otorga consentimiento');
select lives_ok($$select public.log_cycle_summary(current_date - 3)$$, 'guarda ciclo con consentimiento');

select is((public.get_partner_space_snapshot('aaaaaaaa-0000-0000-0000-000000000009')::jsonb ->> 'cycle_phase'), null,
  'ciclo no se comparte por defecto');
select is((public.get_partner_space_snapshot('aaaaaaaa-0000-0000-0000-000000000009')::jsonb ->> 'mood_last'), null,
  'ánimo no se comparte por defecto');

select lives_ok($$select public.update_partner_space_prefs('aaaaaaaa-0000-0000-0000-000000000009', '{"cycle": true}')$$, 'la dueña activa el ciclo');
select is((public.get_partner_space_snapshot('aaaaaaaa-0000-0000-0000-000000000009')::jsonb ->> 'cycle_phase'), 'menstrual',
  'con interruptor y consentimiento, la pareja ve la fase');

select public.set_consent('cycle_server', false);
select is((select count(*)::int from public.cycle_logs where user_id='11111111-1111-1111-1111-111111111111'), 0,
  'revocar el consentimiento borra los datos del ciclo');

select * from finish();
rollback;
