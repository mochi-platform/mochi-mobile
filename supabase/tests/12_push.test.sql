begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

insert into auth.users (id, instance_id, aud, role, email) values
  ('11111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-000000000000','authenticated','authenticated','ella@test.dev'),
  ('22222222-2222-2222-2222-222222222222','00000000-0000-0000-0000-000000000000','authenticated','authenticated','el@test.dev');
insert into public.profiles (id, full_name) values ('11111111-1111-1111-1111-111111111111','Ella'),('22222222-2222-2222-2222-222222222222','El') on conflict (id) do nothing;
insert into public.vouchers (id, user_id, created_by, title, mode) values
  ('eeeeeeee-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','Cena','gift');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
select lives_ok($$select public.register_push_token('ExponentPushToken[ella-token-123]')$$, 'registra su token');
select throws_ok($$select public.register_push_token('x')$$, null, 'Token no válido', 'rechaza tokens inválidos');
select is((select count(*)::int from public.push_tokens), 1, 've su token');

select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
select is((select count(*)::int from public.push_tokens), 0, 'él no ve los tokens de ella');
select throws_ok($$select * from public.server_voucher_push_targets('eeeeeeee-0000-0000-0000-000000000001','22222222-2222-2222-2222-222222222222')$$, '42501', null, 'el cliente no obtiene destinatarios');

reset role;
select is((select count(*)::int from public.server_voucher_push_targets('eeeeeeee-0000-0000-0000-000000000001','22222222-2222-2222-2222-222222222222')), 1, 'el servidor obtiene el token de ella para quien creó el vale');
select is((select count(*)::int from public.server_voucher_push_targets('eeeeeeee-0000-0000-0000-000000000001','33333333-3333-3333-3333-333333333333')), 0, 'quien no creó el vale no obtiene destinatarios');

select * from finish();
rollback;
