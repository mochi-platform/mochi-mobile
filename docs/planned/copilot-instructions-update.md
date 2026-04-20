# Actualización de copilot-instructions.md y archivos de agentes

## Alcance de repositorio (override)

- Este documento asume repositorios individuales (sin Turborepo).
- La implementación descrita aquí corresponde al repo `mochi-mobile`.

## Problema

`copilot-instructions.md` tiene un schema desactualizado. Faltan las siguientes tablas
que existen en el proyecto pero no están documentadas:

- `exam_prep_sprints`
- `exam_sprint_milestones`
- `exam_sprint_progress`
- `streak_recovery_plans`
- `flashcard_decks`
- `flashcards`
- `energy_levels`
- `engagement_events`
- `recipe_publications`
- `recipe_cook_sessions`

Además, hay dos archivos de agentes duplicados:
- `.github/agents/mochi-dev.agent.md` (versión actual)
- `.github/agents/mochi-dev-agent.md` (versión anterior)
- `.github/agents/mochi-db-agent.md` (versión anterior)
- `.github/agents/mochi-db.agent.md` (versión nueva)
- `.github/agents/mochi-reviewer.md` (versión actual)

## Cambios en `copilot-instructions.md`

### Sección Database Schema — agregar tablas faltantes

Reemplazar la sección `## Database Schema` completa con:

```markdown
## Database Schema

### Core
- `profiles` (id, full_name, wake_up_time, total_points, mochi_name, is_admin)
- `study_blocks` (id, user_id, subject, day_of_week, start_time, end_time, color)
- `study_sessions` (id, user_id, study_block_id, subject, duration_seconds, completed_at)
- `exam_logs` (id, user_id, subject, grade, max_grade, notes, preparation_notes, exam_date, is_upcoming)
- `exercises` (id, user_id, name, sets, reps, duration_seconds, notes)
- `routines` (id, user_id, name, days[])
- `routine_exercises` (id, routine_id, exercise_id, order_index)
- `routine_logs` (id, user_id, routine_id, completed_at)
- `habits` (id, user_id, name, icon, color)
- `habit_logs` (id, user_id, habit_id, log_date)
- `goals` (id, user_id, title, description, progress, color, target_date, is_completed)
- `mood_logs` (id, user_id, mood, note, logged_date)
- `gratitude_logs` (id, user_id, entry_1, entry_2, entry_3, logged_date)
- `energy_levels` (id, user_id, overall_rating 1-5, logged_date, notes)

### Gamification
- `achievements` (id, key, title, description, icon, category, points, is_secret)
- `user_achievements` (id, user_id, achievement_id, unlocked_at) — UNIQUE(user_id, achievement_id)
- `streaks` (id, user_id, current_streak, longest_streak, last_activity_date)
- `voucher_templates` (id, title, description, points_cost, icon, color, is_active)
- `vouchers` (id, user_id, template_id, title, description, points_cost, icon, color, is_redeemed, redeemed_at)
- `engagement_events` (id, user_id, event_name, event_key, payload, occurred_at) — UNIQUE(user_id, event_key)

### Cooking
- `recipes` (id, user_id, title, description, total_time_minutes, prep_time_minutes, cook_time_minutes, servings, difficulty, cuisine_type, tags[], user_prompt, personal_notes, is_favorite)
- `recipe_ingredients` (id, recipe_id, order_index, name, amount, unit, notes)
- `recipe_steps` (id, recipe_id, step_number, title, instructions, duration_seconds, temperature, tip)
- `recipe_cook_sessions` (id, user_id, recipe_id, last_step_completed, is_finished, rating)
- `recipe_publications` (id, source_recipe_id, owner_id, title, difficulty, generation_type, is_published)

### Settings
- `user_settings` (id, user_id, partner_features_enabled, study_enabled, exercise_enabled, habits_enabled, goals_enabled, mood_enabled, gratitude_enabled, vouchers_enabled, cooking_enabled) — UNIQUE(user_id)

### Study tools
- `flashcard_decks` (id, user_id, study_session_id, subject, topic)
- `flashcards` (id, deck_id, front, back, difficulty_rating, review_count, last_reviewed_at)
- `exam_prep_sprints` (id, user_id, exam_id, start_date, end_date, daily_target_hours, target_grade)
- `exam_sprint_milestones` (id, sprint_id, milestone_number, target_date, description, is_completed)
- `exam_sprint_progress` (id, user_id, sprint_id, progress_date, hours_studied, mood_rating, is_day_completed)
- `streak_recovery_plans` (id, user_id, recovery_tasks jsonb, is_active, completed_tasks)
```

### Agregar nota sobre CyclePhase

En la sección de convenciones técnicas, agregar:

```markdown
### Tipos de fase de ciclo menstrual
- Fuente de verdad: `src/shared/lib/healthConnect.ts`
- Valores válidos: `"menstrual" | "folicular" | "ovulatoria" | "lutea" | "unknown"`
- NUNCA usar valores en inglés ("follicular", "luteal", etc.)
- Import: `import type { CyclePhase } from "@/src/shared/lib/healthConnect"`
```

### Agregar nota sobre plugins

```markdown
### Plugins nativos activos
- `with-mochi-health-connect-delegate.js` — inyecta delegado de permisos en MainActivity
- `expo-build-properties` — minSdkVersion 26
- `react-native-edge-to-edge` — edge-to-edge display
- `expo-notifications` — push notifications
- `expo-widgets` — widget iOS (MochiResumenWidget); Android pendiente
- `react-native-health-connect` — lectura de datos de ciclo menstrual

NOTA: El archivo `plugins/with-health-connect-permission-delegate.js` es un duplicado
sin uso del archivo anterior. Puede eliminarse de forma segura.
```

## Limpieza de archivos de agentes duplicados

### Archivos a eliminar

```
.github/agents/mochi-dev.agent.md     ← duplicado de mochi-dev-agent.md
```

### Verificar cuál es la versión actual

El archivo `.github/agents/mochi-dev-agent.md` (sin el punto antes de "agent") es el
que se referencia en `copilot-instructions.md` con `@mochi-dev`. Verificar con:

```bash
grep -r "mochi-dev" .github/copilot-instructions.md
```

Mantener solo la versión más completa y eliminar la otra.

### Archivos de agentes a actualizar

Agregar en todos los agentes relevantes la misma nota de CyclePhase:

```markdown
## Tipos de ciclo menstrual
Los valores de CyclePhase son SIEMPRE en español (menstrual, folicular, ovulatoria, lutea).
Importar desde: @/src/shared/lib/healthConnect
```

## Plugin duplicado — eliminación segura

```bash
# Verificar que no está referenciado en ningún lado
grep -r "with-health-connect-permission-delegate" . \
  --include="*.js" --include="*.json" --include="*.ts" \
  --exclude-dir=node_modules

# Si el único resultado es el archivo mismo → eliminar
rm plugins/with-health-connect-permission-delegate.js
```

## Archivos a modificar

| Archivo | Cambio |
|---|---|
| `.github/copilot-instructions.md` | Schema completo, nota CyclePhase, nota plugins |
| `.github/agents/mochi-dev-agent.md` | Agregar nota CyclePhase, actualizar schema |
| `.github/agents/mochi-db-agent.md` | Agregar tablas faltantes al schema |
| `.github/agents/mochi-reviewer.md` | (sin cambios — ya tiene la nota de CyclePhase) |
| `plugins/with-health-connect-permission-delegate.js` | Eliminar si no está referenciado |

## Criterios de aceptación

- `copilot-instructions.md` lista todas las tablas del proyecto.
- Los valores de CyclePhase en español están documentados en todos los agentes.
- No existe el plugin duplicado.
- No existen archivos de agentes duplicados con contenido idéntico.
