begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

insert into auth.users (id, instance_id, aud, role, email) values
  ('11111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-000000000000','authenticated','authenticated','admin@test.dev'),
  ('22222222-2222-2222-2222-222222222222','00000000-0000-0000-0000-000000000000','authenticated','authenticated','user@test.dev');
insert into public.profiles (id, full_name, is_admin) values ('11111111-1111-1111-1111-111111111111','Admin',true),('22222222-2222-2222-2222-222222222222','Usuaria',false) on conflict (id) do update set is_admin = excluded.is_admin;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
select throws_ok($$select * from public.admin_list_grants()$$, '42501', null, 'no admin no lista concesiones');
select throws_ok($$select public.admin_grant_entitlement('22222222-2222-2222-2222-222222222222','premium','yo')$$, '42501', null, 'no admin no se concede nada');
select throws_ok($$select * from public.admin_revenue_summary()$$, '42501', null, 'no admin no ve ingresos');

select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
select lives_ok($$select public.admin_grant_entitlement('22222222-2222-2222-2222-222222222222','premium','Beta tester')$$, 'admin concede');
select throws_ok($$select public.admin_grant_entitlement('22222222-2222-2222-2222-222222222222','root','x')$$, null, 'Concesión no válida', 'rechaza concesiones desconocidas');
select is((select count(*)::int from public.admin_list_grants() where entitlement = 'premium'), 1, 'la concesión aparece');
select lives_ok($$select public.admin_revoke_grant((select id from public.admin_list_grants() limit 1))$$, 'admin revoca');

select * from finish();
rollback;
