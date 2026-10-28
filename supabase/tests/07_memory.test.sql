begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

insert into auth.users (id, instance_id, aud, role, email) values
  ('11111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-000000000000','authenticated','authenticated','a@test.dev');
insert into public.profiles (id, full_name) values ('11111111-1111-1111-1111-111111111111','A') on conflict (id) do nothing;
insert into public.goals (user_id, title) values ('11111111-1111-1111-1111-111111111111', 'Aprobar cálculo');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

select lives_ok($$select public.refresh_mochi_memory()$$, 'refresh sin consentimiento no falla');
select is((select count(*)::int from public.mochi_memory), 0, 'sin consentimiento no guarda memoria');
select throws_ok($$insert into public.mochi_memory (user_id, kind, content) values ('11111111-1111-1111-1111-111111111111','tone','x')$$,
  '42501', null, 'no escribe memoria directamente');

select public.set_consent('mochi_memory', true);
select public.refresh_mochi_memory();
select is((select content from public.mochi_memory where kind='goals'), 'Metas activas: Aprobar cálculo', 'recuerda las metas');
select throws_ok($$select public.set_mochi_tone('agresivo')$$, null, 'Tono no válido', 'valida el tono');

select public.set_consent('mochi_memory', false);
select is((select count(*)::int from public.mochi_memory), 0, 'revocar borra la memoria');

reset role;
select is(public.server_get_mochi_memory('11111111-1111-1111-1111-111111111111'), '', 'gateway no ve memoria sin consentimiento');

select * from finish();
rollback;
