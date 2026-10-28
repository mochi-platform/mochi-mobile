begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

insert into auth.users (id, instance_id, aud, role, email)
select ('aaaaaaaa-0000-0000-0000-00000000000' || n)::uuid, '00000000-0000-0000-0000-000000000000','authenticated','authenticated', 'u' || n || '@test.dev' from generate_series(1,5) n;
insert into public.profiles (id, full_name, is_admin)
select ('aaaaaaaa-0000-0000-0000-00000000000' || n)::uuid, 'U' || n, n = 5 from generate_series(1,5) n on conflict (id) do update set is_admin = excluded.is_admin;
insert into public.recipes (id, user_id, title) values ('bbbbbbbb-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','Arroz');
insert into public.recipe_publications (id, source_recipe_id, owner_id, owner_name, title, difficulty)
values ('cccccccc-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','U1','Arroz','media');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
select throws_ok($$select public.report_recipe('cccccccc-0000-0000-0000-000000000001','spam')$$, null, 'No puedes reportar tu propia receta', 'no puede reportar la suya');
update public.recipe_publications set is_hidden = true where id = 'cccccccc-0000-0000-0000-000000000001';
select is((select is_hidden from public.recipe_publications where id = 'cccccccc-0000-0000-0000-000000000001'), false, 'la dueña no puede ocultar ni mostrar por su cuenta');

select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated"}', true);
select lives_ok($$select public.report_recipe('cccccccc-0000-0000-0000-000000000001','spam')$$, 'reporta');
select lives_ok($$select public.report_recipe('cccccccc-0000-0000-0000-000000000001','spam')$$, 'reportar dos veces no duplica');
select throws_ok($$select * from public.admin_list_recipe_reports()$$, '42501', null, 'no admin no ve reportes');
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000003","role":"authenticated"}', true);
select public.report_recipe('cccccccc-0000-0000-0000-000000000001','dangerous');
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000004","role":"authenticated"}', true);
select public.report_recipe('cccccccc-0000-0000-0000-000000000001','inappropriate');
select is((select count(*)::int from public.recipe_publications where id = 'cccccccc-0000-0000-0000-000000000001'), 0, 'con 3 reportes se oculta al público');

select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000005","role":"authenticated"}', true);
select is((select open_reports::int from public.admin_list_recipe_reports()), 3, 'el admin ve 3 reportes abiertos');
select public.admin_resolve_recipe_reports('cccccccc-0000-0000-0000-000000000001', false);
select is((select count(*)::int from public.recipe_publications where id = 'cccccccc-0000-0000-0000-000000000001'), 1, 'descartar reportes vuelve a mostrarla');

select * from finish();
rollback;
