begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

insert into auth.users (id, instance_id, aud, role, email) values
  ('11111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-000000000000','authenticated','authenticated','a@test.dev'),
  ('22222222-2222-2222-2222-222222222222','00000000-0000-0000-0000-000000000000','authenticated','authenticated','b@test.dev');
insert into public.profiles (id, full_name) values ('11111111-1111-1111-1111-111111111111','A'),('22222222-2222-2222-2222-222222222222','B') on conflict (id) do nothing;
insert into public.flashcard_decks (id, user_id, subject, topic) values ('dddddddd-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','Mate','Límites');
insert into public.flashcards (id, deck_id, front, back) values ('cccccccc-0000-0000-0000-000000000001','dddddddd-0000-0000-0000-000000000001','¿Q?','R');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

select is((public.review_flashcard('cccccccc-0000-0000-0000-000000000001', 4)->>'interval_days')::int, 1, 'primera repetición exitosa: 1 día');
select is((public.review_flashcard('cccccccc-0000-0000-0000-000000000001', 4)->>'interval_days')::int, 6, 'segunda: 6 días');
select is((public.review_flashcard('cccccccc-0000-0000-0000-000000000001', 5)->>'interval_days')::int, 16, 'tercera: 6 × factor de facilidad');
select is((public.review_flashcard('cccccccc-0000-0000-0000-000000000001', 1)->>'interval_days')::int, 1, 'olvidar reinicia a 1 día');
select is((select repetitions from public.flashcards where id='cccccccc-0000-0000-0000-000000000001'), 0, 'olvidar reinicia las repeticiones');
select throws_ok($$select public.review_flashcard('cccccccc-0000-0000-0000-000000000001', 9)$$, null, 'Calidad no válida', 'valida la calidad');
select throws_ok($$update public.flashcards set due_at = now() - interval '10 years'$$, '42501', null, 'no edita campos de repaso directamente');
select lives_ok($$update public.flashcards set front = 'Nueva pregunta' where id='cccccccc-0000-0000-0000-000000000001'$$, 'sí edita el texto');

select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
select throws_ok($$select public.review_flashcard('cccccccc-0000-0000-0000-000000000001', 4)$$, null, 'Tarjeta no encontrada', 'no repasa tarjetas ajenas');

select * from finish();
rollback;
