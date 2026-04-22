# Mochi Mobile 🍡

> Aplicación de productividad personal diseñada 100% para mujeres estudiantes. Combina planificación académica, rutinas de ejercicio, hábitos, cocina con IA y bienestar emocional en una sola app.

---

## ¿Qué es Mochi?

Mochi es tu compañera de estudio y bienestar. Entiende tu ciclo menstrual, adapta sus recomendaciones a tu energía del día, y te acompaña con gamificación, recetas generadas por IA y un sistema de logros diseñado para que cada avance cuente.

---

## Stack técnico

| Capa | Tecnología |
|---|---|
| Framework | Expo SDK 55 + React Native 0.83 |
| Navegación | Expo Router v4 |
| Estilos | NativeWind v4 (Tailwind v3 syntax) |
| Animaciones | react-native-reanimated 4.x |
| Backend | Supabase (PostgreSQL + Auth + RLS) |
| IA | OpenRouter (`nvidia/nemotron`, `gemini-2.0-flash`) |
| Imágenes | Unsplash API |
| Anuncios | react-native-google-mobile-ads |
| Suscripciones | RevenueCat (Google Play Billing) |
| Salud | react-native-health-connect (ciclo menstrual) |
| Package manager | pnpm |

---

## Módulos de la app

| Módulo | Descripción |
|---|---|
| **Estudio** | Bloques semanales, timer Pomodoro, compañera de estudio con IA, flashcards generadas automáticamente |
| **Ejercicio** | Banco de ejercicios personalizado, rutinas, player paso a paso con imágenes |
| **Hábitos** | Seguimiento diario con rachas, dots semanales y recordatorios por hábito |
| **Cocina** | Recetas generadas por IA según tipo, porciones y complejidad; modo cocina paso a paso |
| **Metas** | Creación con progreso visual, colores y fecha objetivo |
| **Estado de ánimo** | Check-in emocional diario + nivel de energía |
| **Gratitud** | Diario de 3 entradas diarias con historial |
| **Mochi Duo™** | Espacio compartido con pareja: metas conjuntas, vales y snapshot de bienestar |
| **Vales** | Sistema de recompensas canjeables con puntos acumulados |
| **Weekly Planner** | Sugerencias proactivas de bloques según exámenes, ciclo y energía |
| **Analíticas** | Gráficas de estudio, hábitos y evolución de racha |

---

## Arquitectura

```
app/                      → Pantallas (Expo Router file-based routing)
src/
  core/providers/         → SessionContext, CycleContext, ModuleVisibilityContext…
  features/[feature]/     → components/ + hooks/ por dominio
  shared/
    components/           → Componentes reutilizables (MochiCharacter, CustomAlert…)
    hooks/                → Hooks compartidos (useCycleRecommendation, useStreakRecovery…)
    lib/
      ai/                 → Cliente OpenRouter con fallback y retry
      supabase/           → client.ts, types.ts, levels.ts
      gamification.ts     → addPoints, unlockAchievement, updateStreak
      notifications.ts    → Recordatorios por tipo (hábitos, estudio, exámenes, cocina)
      healthConnect.ts    → Ciclo menstrual vía Health Connect
    types/database.ts     → Re-export centralizado de todos los tipos
plugins/
  with-mochi-health-connect-delegate.js  → Config plugin para permisos en MainActivity
```

---

## Gamificación

| Acción | Puntos |
|---|---|
| Completar sesión de estudio | +5 |
| Examen aprobado (≥70%) | +20 |
| Completar rutina de ejercicio | +10 |
| Completar sesión de cocina | +15 |
| Generar receta con IA | +5 |
| Completar meta | +15 |
| Registrar gratitud | +3 |

Los puntos acumulados desbloquean niveles (Semilla → Brote → Estudiante → … → Leyenda Mochi) y permiten canjear vales de recompensa.

---

## Base de datos (Supabase)

RLS habilitado en todas las tablas. Principales grupos:

- **Core**: `profiles`, `study_blocks`, `study_sessions`, `exam_logs`, `exercises`, `routines`, `habits`, `goals`, `mood_logs`, `gratitude_logs`, `energy_levels`
- **Gamificación**: `achievements`, `user_achievements`, `streaks`, `vouchers`, `voucher_templates`, `engagement_events`
- **Cocina**: `recipes`, `recipe_ingredients`, `recipe_steps`, `recipe_cook_sessions`, `recipe_publications`
- **Herramientas de estudio**: `flashcard_decks`, `flashcards`, `exam_prep_sprints`, `exam_sprint_milestones`, `exam_sprint_progress`
- **Mochi Duo™**: `partner_spaces`, `joint_goals`
- **Monetización**: `ai_credits_ledger`, `ai_ad_rewards_daily`, `billing_subscriptions`, `ai_usage_limits`
- **Ajustes**: `user_settings`, `streak_recovery_plans`

---

## Configuración local

### 1. Requisitos

- Node.js 20+
- pnpm 9+
- Expo CLI

### 2. Variables de entorno

Copia `.env.example` y rellena los valores:

```bash
cp .env.example .env
```

```env
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_OPENROUTER_API_KEY=
EXPO_PUBLIC_UNSPLASH_ACCESS_KEY=
```

### 3. Instalar dependencias

```bash
pnpm install
```

### 4. Iniciar en Expo Go

```bash
pnpm start
```

> **Nota:** Módulos nativos (Health Connect, notificaciones, anuncios, widgets) requieren un Dev Client o build de producción. No funcionan en Expo Go.

### 5. Build de desarrollo (Android)

```bash
eas build --platform android --profile development --local
```

---

## CI/CD

| Workflow | Trigger | Descripción |
|---|---|---|
| `mobile-production-apk.yml` | Manual | Build APK + draft release en GitHub |
| `mobile-production-aab.yml` | Manual | Build AAB para Play Store + draft release |

Ambos ejecutan tres quality gates antes del build: formato (Prettier), tipos (tsc) y validación de export (Expo).

---

## Convenciones de código

- TypeScript estricto. Sin `any`. Sin `.js` en `app/` ni `src/`.
- Todo UI copy en **español**. Sin emojis — Ionicons siempre.
- `async/await` únicamente. Nunca `.then()`.
- Named exports en todos los componentes y hooks.
- Todo componente con fetch maneja: loading + error + empty state.
- Estilos solo con clases NativeWind. Nunca `StyleSheet.create`.
- Puntos de gamificación: siempre via `addPoints()` → RPC `increment_points`. Nunca UPDATE directo a `profiles.total_points`.
- Módulos nativos bajo guard `isExpoGo` con dynamic import.

---

## Fase de ciclo menstrual

Fuente de verdad: `src/shared/lib/healthConnect.ts`

```typescript
type CyclePhase = "menstrual" | "folicular" | "ovulatoria" | "lutea" | "unknown"
```

Los valores son **siempre en español**. Nunca usar "follicular", "luteal", etc.

---

## Licencia

Proyecto privado — © Siramong. Todos los derechos reservados.
