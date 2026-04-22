---
description: "Usa para migraciones SQL, diseño de schema, políticas RLS, RPCs y consultas Supabase en Mochi. Conoce todos los patrones y gotchas del proyecto."
name: "Mochi Database"
tools: [vscode/getProjectSetupInfo, vscode/installExtension, vscode/memory, vscode/newWorkspace, vscode/resolveMemoryFileUri, vscode/runCommand, vscode/vscodeAPI, vscode/extensions, vscode/askQuestions, execute/runNotebookCell, execute/testFailure, execute/getTerminalOutput, execute/killTerminal, execute/sendToTerminal, execute/createAndRunTask, execute/runInTerminal, read/getNotebookSummary, read/problems, read/readFile, read/viewImage, read/readNotebookCellOutput, read/terminalSelection, read/terminalLastCommand, agent/runSubagent, edit/createDirectory, edit/createFile, edit/createJupyterNotebook, edit/editFiles, edit/editNotebook, edit/rename, search/changes, search/codebase, search/fileSearch, search/listDirectory, search/textSearch, search/usages, web/fetch, web/githubRepo, browser/openBrowserPage, browser/readPage, browser/screenshotPage, browser/navigatePage, browser/clickElement, browser/dragElement, browser/hoverElement, browser/typeInPage, browser/runPlaywrightCode, browser/handleDialog, supabase/apply_migration, supabase/create_branch, supabase/delete_branch, supabase/deploy_edge_function, supabase/execute_sql, supabase/generate_typescript_types, supabase/get_advisors, supabase/get_edge_function, supabase/get_logs, supabase/get_project_url, supabase/get_publishable_keys, supabase/list_branches, supabase/list_edge_functions, supabase/list_extensions, supabase/list_migrations, supabase/list_tables, supabase/merge_branch, supabase/rebase_branch, supabase/reset_branch, supabase/search_docs, todo]
---

# Mochi Database — Agente de Base de Datos

## Proyecto Supabase
- **Project ID**: `bsfndytlugjqritwvonp`
- **Cliente**: siempre desde `@mochi/supabase/client`
- **RLS**: habilitado en TODAS las tablas. Sin excepciones.

## Schema completo

### Tablas core
| Tabla | PK | user_id FK | Notas |
|---|---|---|---|
| `profiles` | id (= auth.uid) | — | `total_points`, `wake_up_time`, `mochi_name` |
| `study_blocks` | uuid | profiles.id | `day_of_week` 0-6 (0=domingo) |
| `study_sessions` | uuid | profiles.id | `study_block_id` nullable |
| `exam_logs` | uuid | profiles.id | `is_upcoming` bool |
| `exercises` | uuid | profiles.id | |
| `routines` | uuid | profiles.id | `days[]` array de int |
| `routine_exercises` | uuid | — | FK a routine + exercise |
| `routine_logs` | uuid | profiles.id | |
| `habits` | uuid | profiles.id | |
| `habit_logs` | uuid | profiles.id | `log_date` date |
| `goals` | uuid | profiles.id | `progress` 0-100 |
| `mood_logs` | uuid | profiles.id | `mood` 1-5, `logged_date` |
| `gratitude_logs` | uuid | profiles.id | `entry_1/2/3`, `logged_date` |
| `recipes` | uuid | profiles.id | |
| `recipe_ingredients` | uuid | — | FK a recipe |
| `recipe_steps` | uuid | — | FK a recipe |
| `recipe_cook_sessions` | uuid | profiles.id | |

### Tablas globales (sin user_id)
| Tabla | Notas |
|---|---|
| `achievements` | catálogo global; `key` único |
| `voucher_templates` | catálogo global; gestionado por admin |

### Tablas relacionales
| Tabla | Notas |
|---|---|
| `user_achievements` | UNIQUE(user_id, achievement_id) |
| `streaks` | una fila por usuario |
| `vouchers` | generados por usuario desde templates |
| `user_settings` | UNIQUE(user_id); módulos on/off |
| `engagement_events` | UNIQUE(user_id, event_key); idempotencia |

### Tablas nuevas (features recientes)
| Tabla | Notas |
|---|---|
| `exam_prep_sprints` | sprints de preparación para exámenes |
| `exam_sprint_milestones` | hitos por sprint |
| `exam_sprint_progress` | progreso diario por sprint |
| `streak_recovery_plans` | plan de recuperación de racha |
| `flashcard_decks` | mazos de flashcards |
| `flashcards` | tarjetas individuales |
| `energy_levels` | registro de energía diaria |
| `partner_spaces` | espacios de pareja (Mochi Duo™) |
| `joint_goals` | metas compartidas de pareja |
| `ai_credits_ledger` | ledger de créditos de IA |
| `ai_ad_rewards_daily` | eventos diarios de anuncios recompensados |
| `billing_subscriptions` | estado de suscripción premium |
| `billing_events` | bitácora de eventos de facturación |
| `ai_usage_limits` | límites por plan (free/premium) |

## Patrones críticos

### Upsert con conflicto
```sql
-- Logs diarios: conflicto por (user_id, logged_date)
INSERT INTO mood_logs (user_id, mood, logged_date)
VALUES (...)
ON CONFLICT (user_id, logged_date) DO UPDATE SET mood = EXCLUDED.mood;
```

### ON CONFLICT DO NOTHING requiere constraint único
```sql
-- ⚠️ Solo funciona si existe UNIQUE constraint en la tabla
INSERT INTO user_achievements (user_id, achievement_id)
VALUES (...)
ON CONFLICT (user_id, achievement_id) DO NOTHING;
```

### Puntos — siempre vía RPC
```sql
-- NUNCA hacer UPDATE profiles SET total_points = total_points + X
-- SIEMPRE usar:
SELECT increment_points(user_id := $1, points := $2);
```

### Crear usuario en auth (seed / demo)
```sql
DO $$
DECLARE
  v_user_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email,
    encrypted_password, email_confirmed_at,
    created_at, updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user_id, 'authenticated', 'authenticated',
    'user@example.com',
    crypt('password', gen_salt('bf')),
    now(), now(), now()
  );
  -- Luego insertar en profiles, user_settings, etc.
END $$;
```

### RLS template para tabla nueva
```sql
-- 1. Habilitar RLS
ALTER TABLE nueva_tabla ENABLE ROW LEVEL SECURITY;

-- 2. Policy SELECT
CREATE POLICY "users_select_own" ON nueva_tabla
  FOR SELECT USING (auth.uid() = user_id);

-- 3. Policy INSERT
CREATE POLICY "users_insert_own" ON nueva_tabla
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 4. Policy UPDATE
CREATE POLICY "users_update_own" ON nueva_tabla
  FOR UPDATE USING (auth.uid() = user_id);

-- 5. Policy DELETE
CREATE POLICY "users_delete_own" ON nueva_tabla
  FOR DELETE USING (auth.uid() = user_id);

-- 6. GRANT
GRANT ALL ON nueva_tabla TO authenticated;
GRANT USAGE ON SEQUENCE nueva_tabla_id_seq TO authenticated; -- si aplica
```

### Expandir CHECK constraint
```sql
-- NO modificar en el lugar — siempre DROP y re-ADD
ALTER TABLE tabla DROP CONSTRAINT IF EXISTS check_nombre;
ALTER TABLE tabla ADD CONSTRAINT check_nombre
  CHECK (columna IN ('val1', 'val2', 'val3_nuevo'));
```

## Gotchas conocidos
- `execute_sql` vía MCP solo retorna el último result set. Una query a la vez.
- `apply_migration` falla si se reutiliza el mismo `name`. Usar nombre único en retry.
- `ON CONFLICT DO NOTHING` sin unique constraint → silenciosamente no inserta.
- Variables en `DO $$` con `RETURNING INTO`: declarar al inicio del bloque.
- `pg_get_constraintdef(oid)` para inspeccionar valores de CHECK constraints existentes.