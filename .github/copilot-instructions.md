# Mochi — GitHub Copilot Instructions

## Project Overview

Mochi is a personal productivity app designed 100% for women students. It combines study scheduling, exercise routines, gamification, and AI assistance. It is a monorepo with a React web app and an Expo mobile app sharing a Supabase backend.

---

## Monorepo Structure

```
mochi/
├── apps/
│   ├── web/          # React + Vite + TypeScript + Tailwind v4 + shadcn/ui
│   └── mobile/       # Expo + React Native + TypeScript + NativeWind
└── packages/
    ├── supabase/     # Shared Supabase client — import as @mochi/supabase
    └── ai/           # Shared AI client — import as @mochi/ai (planned)
```

---

## Tech Rules

### General
- Always use **TypeScript**. No `.js` files in `apps/`.
- Use `pnpm` for all package management. Never suggest `npm install` or `yarn`.
- Add new packages with `pnpm add` in the correct workspace (`--filter mochi-web` or `--filter mochi-mobile`).
- All UI copy, labels, placeholders, error messages and notifications must be in **Spanish**.
- No emojis anywhere in the UI. Use **Ionicons** (mobile) or **Lucide** (web) for all icons.

### Web (`apps/web`)
- Use **Tailwind v4** with CSS variables. Do NOT use `tailwind.config.js`.
- Use **shadcn/ui** components from `@/components/ui`.
- Path alias `@/` for all imports from `src/`.
- Use **Framer Motion** for animations.
- Use **React Kawaii** for empty states and completion screens.

### Mobile (`apps/mobile`)
- Use **NativeWind** (Tailwind v3 syntax) for all styling. Never `StyleSheet.create`.
- Use **Expo Router** for navigation. All screens go in `apps/mobile/app/`.
- Path alias `@/` for all imports from the root of `apps/mobile/`.
- Always import React Native primitives from `react-native`.

#### Mobile Screens (Implemented)
- `app/vouchers.tsx` — gestión de vales y recompensas canjeables
- `app/mood.tsx` — registro diario de estado de ánimo
- `app/gratitude.tsx` — diario de gratitud
- `app/settings.tsx` — ajustes de perfil, módulos y cierre de sesión con confirmación

#### Current Component Notes
- `HomeDashboard` no longer accepts an `onSignOut` prop.
- `TimePickerModal` is used in onboarding, settings, and study-create flows.

### Supabase
- Always use the shared client from `@mochi/supabase/client`.
- Web env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- Mobile env vars: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- All queries must respect RLS. Never use service role from client code.
- New tables must have RLS enabled with user-scoped policies and explicit GRANT to `authenticated`.

### AI
- Provider: **OpenRouter** free models (nvidia/nemotron) via `openai` SDK to `https://openrouter.ai/api/v1`
- All AI calls go through shared `callAI()` function in mobile app
- Web env vars: `VITE_OPENROUTER_API_KEY`
- Mobile env vars: `EXPO_PUBLIC_OPENROUTER_API_KEY`
- AI responses must always be in Spanish

### Tipos de fase de ciclo menstrual
- Fuente de verdad: `src/shared/lib/healthConnect.ts`
- Valores válidos: `"menstrual" | "folicular" | "ovulatoria" | "lutea" | "unknown"`
- NUNCA usar valores en inglés ("follicular", "luteal", etc.)
- Import: `import type { CyclePhase } from "@/src/shared/lib/healthConnect"`

### Plugins nativos activos
- `with-mochi-health-connect-delegate.js` — inyecta delegado de permisos en MainActivity
- `expo-build-properties` — minSdkVersion 26
- `react-native-edge-to-edge` — edge-to-edge display
- `expo-notifications` — push notifications
- `expo-widgets` — widget iOS (MochiResumenWidget); Android pendiente
- `react-native-health-connect` — lectura de datos de ciclo menstrual

---

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

---

## Gamification Rules

- Completing a routine → add points to `profiles.total_points` + check/unlock achievements
- Completing a study block → add points + update `streaks`
- Logging a good exam grade → unlock `exam_ace` achievement
- Achievements insert into `user_achievements` with `ON CONFLICT DO NOTHING`
- Rewards (vouchers) are generated when user has enough points
- Public users: visual recognition only (achievements, streaks, badges)

---

## Design System

- **Palette:** pastel yellow, pink, purple, mint green, baby blue
- **Style:** colorful, adorable, Pinterest-inspired. Never flat or corporate.
- **Icons:** Ionicons (mobile), Lucide (web). No emojis.
- **Language:** 100% Spanish UI copy
- **Typography:** Geist Variable (web), system font (mobile)

---

## Code Style

- `async/await` only, never `.then()`.
- Named exports for all components and hooks.
- Hooks in `hooks/`, utilities in `lib/`.
- Keep components small — extract logic into custom hooks.
- Always handle loading, error and empty states.
- The app targets women — copy must be warm, encouraging and positive.

---

## Agent System

Para tareas complejas, bugs o decisiones técnicas, invoca el agente correcto desde `.github/agents/`. Todos los agentes conocen el stack y las convenciones de Mochi.

### Cuándo usar cada agente

| Situación | Agente a invocar |
|-----------|-----------------|
| No sé por dónde empezar una tarea grande | `@mochi-orchestrator` |
| Feature que toca 2+ archivos o requiere una tabla nueva | `@mochi-planner` |
| Duda de arquitectura o diseño de schema | `@mochi-architect` |
| Trabajo en `apps/web` | `@mochi-web-dev` |
| Trabajo en `apps/mobile` | `@mochi-mobile-dev` |
| Migración SQL, RLS o RPC en Supabase | `@mochi-database` |
| Feature con IA (OpenRouter, prompts, parsing) | `@mochi-ai-integration` |
| Diseño de pantalla nueva o decisión de UX | `@mochi-design` |
| Verificar edge cases y flujos de error | `@mochi-qa` |
| Revisar código generado antes de commit | `@mochi-reviewer` |
| Feature que atraviesa 3+ agentes a la vez | `@mochi-coordinator` |
| Problema de CI/CD, EAS build o Vercel | `@mochi-devops` |
| La app está lenta o el bundle creció | `@mochi-optimizer` |
| Evaluar si una feature vale la pena construirla | `@mochi-product` |
| Brainstorming de features nuevas e innovadoras | `@mochi-creative` |
| Un agente produce output de baja calidad repetidamente | `@mochi-prompt-engineer` |

### Flujo recomendado por tipo de tarea

```
Bug reportado
  └── @mochi-reviewer (diagnosis) → agente del área → @mochi-qa

Feature pequeña (1 archivo, sin DB)
  └── agente del área directamente

Feature mediana (2-3 archivos, posible tabla nueva)
  └── @mochi-planner → agente del área → @mochi-qa

Feature grande (múltiples módulos, nueva tabla, web + mobile)
  └── @mochi-orchestrator
        ├── @mochi-planner
        ├── @mochi-architect
        ├── @mochi-database (primero — el schema bloquea todo)
        ├── @mochi-web-dev + @mochi-mobile-dev (paralelos)
        ├── @mochi-qa
        └── @mochi-reviewer
```

### Reglas de los agentes (heredan las reglas globales)

Todos los agentes en `.github/agents/` siguen las mismas convenciones técnicas de este archivo. Si hay contradicción entre un agente y este archivo, **este archivo gana**. Para corregir un agente, invocar `@mochi-prompt-engineer`.