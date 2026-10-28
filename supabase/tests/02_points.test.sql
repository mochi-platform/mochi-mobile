begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

insert into auth.users (id, instance_id, aud, role, email) values
  ('11111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-000000000000','authenticated','authenticated','a@test.dev');
insert into public.profiles (id, full_name) values ('11111111-1111-1111-1111-111111111111','A') on conflict (id) do nothing;
insert into public.voucher_templates (id, title, points_cost) values ('33333333-3333-3333-3333-333333333333','Cena', 50);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

select throws_ok($$update public.profiles set total_points = 99999 where id = '11111111-1111-1111-1111-111111111111'$$,
  '42501', null, 'no puede editar total_points');
select throws_ok($$select public.increment_points('11111111-1111-1111-1111-111111111111', 10)$$,
  '42501', null, 'increment_points cerrado');
select is(public.award_points('study_session', 'r1'), 5, 'otorga puntos de la regla');
select is(public.award_points('study_session', 'r1'), 0, 'idempotente por ref');
select throws_ok($$select public.award_points('inventado')$$, null, 'Evento desconocido', 'evento desconocido');
select throws_ok($$select public.generate_voucher('33333333-3333-3333-3333-333333333333')$$, null, 'No tienes suficientes puntos', 'puntos insuficientes');

reset role;
update public.profiles set total_points = 100 where id = '11111111-1111-1111-1111-111111111111';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
select ok(public.generate_voucher('33333333-3333-3333-3333-333333333333') is not null, 'genera vale');

select * from finish();
rollback;
