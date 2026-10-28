begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

insert into auth.users (id, instance_id, aud, role, email) values
  ('11111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-000000000000','authenticated','authenticated','a@test.dev'),
  ('22222222-2222-2222-2222-222222222222','00000000-0000-0000-0000-000000000000','authenticated','authenticated','b@test.dev');
insert into public.profiles (id, full_name) values
  ('11111111-1111-1111-1111-111111111111','A'),('22222222-2222-2222-2222-222222222222','B') on conflict (id) do nothing;
insert into public.user_settings (user_id) values ('11111111-1111-1111-1111-111111111111'),('22222222-2222-2222-2222-222222222222')
  on conflict (user_id) do nothing;
insert into public.partner_spaces (id, owner_user_id, invite_code, invite_status, created_at) values
  ('aaaaaaaa-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','OLDCODE1','pending', now() - interval '8 days'),
  ('aaaaaaaa-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','NEWCODE1','pending', now());

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
select throws_ok($$select public.accept_partner_invite('NEWCODE1')$$, null, 'No puedes aceptar tu propia invitacion', 'no acepta la propia');
update public.user_settings set partner_features_enabled = true where user_id = '11111111-1111-1111-1111-111111111111';
select is((select partner_features_enabled from public.user_settings where user_id = '11111111-1111-1111-1111-111111111111'), false,
  'no activa flags privadas directamente');

select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
select throws_ok($$select public.accept_partner_invite('OLDCODE1')$$, null, 'Codigo de invitacion invalido, vencido o ya usado', 'código vencido');
select lives_ok($$select public.accept_partner_invite('NEWCODE1')$$, 'acepta invitación vigente');
select throws_ok($$select public.accept_partner_invite('NEWCODE1')$$, null, 'Codigo de invitacion invalido, vencido o ya usado', 'un solo uso');

select * from finish();
rollback;
