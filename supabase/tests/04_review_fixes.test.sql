begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

insert into auth.users (id, instance_id, aud, role, email) values
  ('11111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-000000000000','authenticated','authenticated','a@test.dev');
insert into public.profiles (id, full_name) values ('11111111-1111-1111-1111-111111111111','A') on conflict (id) do nothing;
insert into public.user_settings (user_id, partner_features_enabled, vouchers_enabled)
  values ('11111111-1111-1111-1111-111111111111', true, true) on conflict (user_id) do update set partner_features_enabled = true, vouchers_enabled = true;
insert into public.vouchers (id, user_id, title, is_redeemed) values
  ('44444444-4444-4444-4444-444444444444','11111111-1111-1111-1111-111111111111','V', true),
  ('55555555-5555-5555-5555-555555555555','11111111-1111-1111-1111-111111111111','W', false);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

select lives_ok($$insert into public.user_settings (user_id, partner_features_enabled, study_enabled)
  values ('11111111-1111-1111-1111-111111111111', true, false)
  on conflict (user_id) do update set partner_features_enabled = excluded.partner_features_enabled, study_enabled = excluded.study_enabled$$,
  'upsert de ajustes de usuaria Duo funciona');
select is((select partner_features_enabled from public.user_settings where user_id='11111111-1111-1111-1111-111111111111'), true,
  'el upsert no apaga Duo');
select is((select study_enabled from public.user_settings where user_id='11111111-1111-1111-1111-111111111111'), false,
  'el upsert sí cambia study_enabled');

select throws_ok($$insert into public.vouchers (user_id, title) values ('11111111-1111-1111-1111-111111111111','gratis')$$,
  '42501', null, 'no inserta vales directamente');
select throws_ok($$update public.vouchers set points_cost = 0 where id='55555555-5555-5555-5555-555555555555'$$,
  '42501', null, 'no edita el costo de un vale');
select throws_ok($$update public.vouchers set is_redeemed = false where id='44444444-4444-4444-4444-444444444444'$$,
  '42501', null, 'no hay UPDATE directo: no puede des-canjear');
select lives_ok($$select public.redeem_voucher('55555555-5555-5555-5555-555555555555')$$,
  'sí canjea un vale propio por la RPC');
select throws_ok($$select public.apply_plan_limits_for_ai('x')$$, '42501', null, 'el cliente no consume créditos directamente');
select is((public.check_ai_allowance()->>'allowed')::boolean, false, 'free sin créditos: no permitido');

select * from finish();
rollback;
