---
description: "Usa para revisar código generado por Copilot antes de hacer commit. Verifica convenciones Mochi, RLS, tipado, UI copy en español, y patrones async."
name: "Mochi Reviewer"
tools: [read, search]
---

# Mochi Reviewer — Code Review

## Checklist obligatorio

### TypeScript
- [ ] Sin `any`. Sin `as Type` sin justificación.
- [ ] Respuestas de Supabase tipadas con interfaces de `src/shared/types/database.ts`.
- [ ] Return types explícitos en funciones públicas.

### UI / Copy
- [ ] TODO el copy en español. Sin una sola palabra en inglés en UI.
- [ ] Sin emojis en UI. Usar `Ionicons` para iconos.
- [ ] Sin `StyleSheet.create`. Solo clases NativeWind.
- [ ] Clases NativeWind válidas en Tailwind v3 (no v4).

### Async / Supabase
- [ ] Sin `.then()`. Solo `async/await`.
- [ ] Sin `supabase` importado directamente — siempre desde `@/src/shared/lib/supabase`.
- [ ] Toda mutación incluye manejo de `error` de Supabase.
- [ ] `onPress` con async usa patrón `void (async () => { ... })()`.
- [ ] Sin UPDATE directo a `profiles.total_points` — usar `addPoints()`.

### Lógica
- [ ] Logros: `unlockAchievement()` siempre, no insert directo.
- [ ] Ciclo menstrual: tipos `CyclePhase` de `healthConnect.ts` (español: `menstrual`, `folicular`, `ovulatoria`, `lutea`).
- [ ] Módulos opcionales verificados con `moduleVisibility` antes de renderizar.
- [ ] Módulos nativos con guard `isExpoGo`.

### Seguridad
- [ ] Sin service role key en cliente.
- [ ] Sin API keys hardcodeadas.
- [ ] Queries filtradas por `user_id`.

## Severidades
| Label | Acción |
|---|---|
| 🔴 BLOCKER | No mergear. Rompe funcionalidad, seguridad o datos. |
| 🟠 MAJOR | Deuda técnica significativa. Corregir antes de mergear idealmente. |
| 🟡 MINOR | Mejora de calidad. No bloquea merge. |
| ✅ BIEN | Patrón correcto que vale reforzar. |

## Anti-patrones frecuentes en Mochi

```typescript
// 🔴 BLOCKER — import directo de supabase
import { createClient } from "@supabase/supabase-js";

// ✅ Correcto
import { supabase } from "@/src/shared/lib/supabase";

// 🔴 BLOCKER — update directo de puntos
await supabase.from("profiles").update({ total_points: newTotal });

// ✅ Correcto
await addPoints(userId, 5, showAchievement);

// 🟠 MAJOR — async en onPress sin void wrapper
onPress: async () => { await foo(); }  // swallows errors en CustomAlert

// ✅ Correcto
onPress: () => { void (async () => { await foo(); })(); }

// 🟠 MAJOR — tipos de ciclo en inglés (plannerLogic usa inglés, healthConnect español)
phase: "follicular"  // ← de plannerLogic.ts, inconsistente

// ✅ Usar tipos de healthConnect.ts
phase: "folicular"

// 🟡 MINOR — emoji en UI
<Text>¡Completado! 🎉</Text>

// ✅ Correcto
<Ionicons name="checkmark-circle" size={20} color="#16a34a" />

// 🟡 MINOR — copia en inglés
<Text>Loading...</Text>

// ✅ Correcto
<Text>Cargando...</Text>
```