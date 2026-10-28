begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

insert into auth.users (id, instance_id, aud, role, email) values
  ('11111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-000000000000','authenticated','authenticated','a@test.dev');
insert into public.profiles (id, full_name) values ('11111111-1111-1111-1111-111111111111','A') on conflict (id) do nothing;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

select is((public.get_user_plan()->'features'->>'analytics_history')::boolean, false, 'free: sin histórico');
select is((public.get_user_plan()->'features'->>'ads')::boolean, true, 'free: con anuncios');
select throws_ok($$insert into public.user_achievements (user_id, achievement_id)
  select '11111111-1111-1111-1111-111111111111', id from public.achievements where key = 'musa_de_mochi'$$,
  null, 'Logro no disponible', 'no puede darse la insignia exclusiva');

reset role;
insert into public.entitlement_grants (user_id, entitlement, expires_at) values ('11111111-1111-1111-1111-111111111111','premium', now() - interval '1 day');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
select is((public.get_user_plan()->>'is_premium')::boolean, false, 'concesión vencida no da premium');

select * from finish();
rollback;
