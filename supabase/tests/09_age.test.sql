begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

insert into auth.users (id, instance_id, aud, role, email) values
  ('11111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-000000000000','authenticated','authenticated','a@test.dev');
insert into public.profiles (id, full_name) values ('11111111-1111-1111-1111-111111111111','A') on conflict (id) do nothing;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

select throws_ok($$update public.profiles set age_group = '18_plus' where id = '11111111-1111-1111-1111-111111111111'$$,
  '42501', null, 'no escribe age_group directamente');
select throws_ok($$select public.set_age_group('menor_de_16')$$, null, 'Grupo de edad no válido', 'rechaza grupos inválidos');
select throws_ok($$select public.set_age_group('16_17', false)$$, null, 'Se requiere el consentimiento de madre, padre o tutor', '16-17 exige consentimiento del tutor');
select lives_ok($$select public.set_age_group('16_17', true)$$, '16-17 con consentimiento');
select is((select age_group from public.profiles where id = '11111111-1111-1111-1111-111111111111'), '16_17', 'guarda el grupo');
select is((select granted from public.user_consents where kind='guardian'), true, 'registra el consentimiento del tutor');

select * from finish();
rollback;
