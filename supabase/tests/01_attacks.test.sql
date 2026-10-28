begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

insert into auth.users (id, instance_id, aud, role, email) values
  ('11111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-000000000000','authenticated','authenticated','a@test.dev'),
  ('22222222-2222-2222-2222-222222222222','00000000-0000-0000-0000-000000000000','authenticated','authenticated','b@test.dev');
insert into public.profiles (id, full_name) values
  ('11111111-1111-1111-1111-111111111111','A'),
  ('22222222-2222-2222-2222-222222222222','B')
on conflict (id) do nothing;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

select throws_ok($$update public.profiles set is_admin = true where id = '11111111-1111-1111-1111-111111111111'$$,
  '42501', null, 'no puede hacerse admin');
select throws_ok($$select public.sync_subscription_from_revenuecat('premium','p','active')$$,
  '42501', null, 'no puede darse premium');
select throws_ok($$select public.claim_ai_credit_from_ad('fake-1')$$,
  '42501', null, 'no puede inventar créditos');
select throws_ok($$insert into public.token_transactions (user_id) values ('11111111-1111-1111-1111-111111111111')$$,
  '42501', null, 'no puede insertarse tokens');
select throws_ok($$select public.set_admin('11111111-1111-1111-1111-111111111111', true)$$,
  '42501', null, 'no puede llamar set_admin');
select throws_ok($$update public.partner_spaces set invite_status = 'accepted'$$,
  '42501', null, 'no puede modificar espacios Duo directamente');
select is((select count(*)::int from public.profiles where id <> '11111111-1111-1111-1111-111111111111'), 0,
  'no lee perfiles ajenos');

reset role;
insert into public.entitlement_grants (user_id, entitlement, reason)
  values ('11111111-1111-1111-1111-111111111111','premium','test');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
select is((public.get_user_plan()->>'is_premium')::boolean, true, 'concesión vigente da premium');

select * from finish();
rollback;
