begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

insert into auth.users (id, instance_id, aud, role, email) values
  ('11111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-000000000000','authenticated','authenticated','ella@test.dev'),
  ('22222222-2222-2222-2222-222222222222','00000000-0000-0000-0000-000000000000','authenticated','authenticated','el@test.dev'),
  ('33333333-3333-3333-3333-333333333333','00000000-0000-0000-0000-000000000000','authenticated','authenticated','otro@test.dev');
insert into public.profiles (id, full_name, total_points) values
  ('11111111-1111-1111-1111-111111111111','Ella', 100),('22222222-2222-2222-2222-222222222222','El', 0),('33333333-3333-3333-3333-333333333333','Otro', 0)
  on conflict (id) do update set total_points = excluded.total_points;
insert into public.partner_spaces (id, owner_user_id, partner_user_id, invite_code, invite_status) values
  ('aaaaaaaa-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','DUOCODE1','accepted');

-- Él crea vales
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
select lives_ok($$select public.create_partner_voucher('aaaaaaaa-0000-0000-0000-000000000001','Cena','Fuera',60,'restaurant','pink','points')$$, 'la pareja crea un vale por puntos');
select lives_ok($$select public.create_partner_voucher('aaaaaaaa-0000-0000-0000-000000000001','Abrazo','Hoy',0,'heart','pink','gift')$$, 'la pareja crea un regalo');
select lives_ok($$select public.create_partner_voucher('aaaaaaaa-0000-0000-0000-000000000001','Cine','Peli',10,'film','blue','points')$$, 'tercer vale');
select throws_ok($$select public.create_partner_voucher('aaaaaaaa-0000-0000-0000-000000000001','Cuarto','x',10,'film','blue','points')$$, null, null, 'plan gratuito: máximo 3 pendientes');
select throws_ok($$update public.vouchers set is_redeemed = true$$, '42501', null, 'no hay UPDATE directo a vales');

-- Ella canjea
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
select lives_ok($$select public.redeem_voucher((select id from public.vouchers where title='Cena'))$$, 'ella canjea por puntos');
select is((select total_points from public.profiles where id='11111111-1111-1111-1111-111111111111'), 40, 'se descontaron 60 puntos');
select throws_ok($$select public.redeem_voucher((select id from public.vouchers where title='Cena'))$$, null, 'Este vale ya fue canjeado', 'no se canjea dos veces');
select lives_ok($$select public.redeem_voucher((select id from public.vouchers where title='Abrazo'))$$, 'ella canjea el regalo sin costo');
select is((select total_points from public.profiles where id='11111111-1111-1111-1111-111111111111'), 40, 'el regalo no descuenta puntos');

-- Un tercero no puede canjear (el id se guarda antes: por RLS él no ve el vale)
reset role;
create temp table ids as select id from public.vouchers where title = 'Cine';
grant select on ids to authenticated;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);
select throws_ok($$select public.redeem_voucher((select id from ids))$$, null, 'No tienes permiso sobre este vale', 'un tercero no puede canjear');

select * from finish();
rollback;
