# CODEBASE SNAPSHOT

## Estado actual por módulo

| Módulo | Mobile | Web | Archivos clave |
|---|---|---|---|
| Estudio | implementado | pendiente | app/study-create.tsx, app/study-timer.tsx, src/features/study/components/StudySchedule.tsx |
| Ejercicio | implementado | pendiente | app/exercise-list.tsx, app/routine-player.tsx, src/features/exercise/components/ExerciseRoutine.tsx |
| Cocina | implementado | pendiente | app/cooking.tsx, app/recipe-detail.tsx, app/recipe-player.tsx |
| Gamificación | parcial | pendiente | src/shared/lib/gamification.ts, src/core/providers/AchievementContext.tsx, src/shared/components/AchievementToast.tsx |
| Estado de ánimo | implementado | pendiente | app/mood.tsx, src/shared/hooks/useEnergyDaily.ts, src/shared/lib/cyclePersonality.ts |
| Gratitud | implementado | pendiente | app/gratitude.tsx, src/shared/lib/gamification.ts, src/features/home/components/HomeDashboard.tsx |
| Metas | implementado | pendiente | app/goals.tsx, src/features/goals/components/GoalCard.tsx, src/shared/lib/plannerLogic.ts |
| Hábitos | implementado | pendiente | app/habits.tsx, src/features/habits/components/HabitCard.tsx, src/shared/hooks/useStreaks.ts |
| Ciclo menstrual | parcial | pendiente | src/core/providers/CycleContext.tsx, src/shared/lib/healthConnect.ts, src/shared/components/CycleWidget.tsx |

Notas:
- El estado Web figura como pendiente porque este repositorio contiene mobile y no incluye apps/web.
- En Gamificación hay lógica sólida de puntos/logros, pero falta robustez de observabilidad y protección global de errores.

## Patrones establecidos

- Cómo se hace un fetch con TanStack Query en web:
No es verificable en este repositorio (no hay código de apps/web ni uso de @tanstack/react-query aquí). Mantener como requisito para el repo web.

- Cómo se llama a Supabase desde un hook en mobile:
Patrón observado: hook con estado local loading/error + función fetch async + useEffect que invoca con void.
Ejemplo: src/shared/hooks/useExamSprints.ts usa supabase importado desde src/shared/lib/supabase y actualiza estado en try/catch/finally.

- Cómo se registran puntos de gamificación:
Patrón: registrar evento idempotente y sumar puntos vía RPC.
En src/shared/lib/gamification.ts:
1) trackEngagementEvent hace upsert en engagement_events con onConflict user_id,event_key e ignoreDuplicates.
2) addPoints llama supabase.rpc("increment_points", { user_id, points }).
3) Luego re-lee perfil para detectar level-up.

- Cómo se desbloquea un achievement:
Patrón en src/shared/lib/gamification.ts:
1) Buscar achievements por key.
2) Upsert en user_achievements con onConflict user_id,achievement_id e ignoreDuplicates.
3) Si insertó fila nueva, devolver payload para UI; si ya existía, retornar null.

- Cómo se muestra un toast de achievement:
Patrón en src/core/providers/AchievementContext.tsx:
1) showAchievement encola si ya hay toast visible.
2) AchievementToast maneja animación y timeout de cierre.
3) handleHide muestra siguiente item de cola tras delay corto.

## Dependencias críticas

- expo 55.0.7: runtime principal Expo.
- react-native 0.83.4: base nativa mobile.
- expo-router 55.0.7: navegación/ruteo.
- nativewind 4.2.3 + tailwindcss 3.4.17: estilos utility-first en mobile.
- @supabase/supabase-js 2.99.2: auth, storage de sesión y acceso a datos.
- react-native-edge-to-edge 1.8.1: manejo de barras del sistema edge-to-edge.
- react-native-health-connect 3.5.0: lectura de datos de ciclo menstrual en Android.
- expo-notifications 55.0.13: notificaciones locales y listeners.
- openai 6.32.0: cliente para OpenRouter vía baseURL custom.
- react-native-reanimated 4.2.1: animaciones de UI y toasts.

## Variables de entorno requeridas

Mobile (confirmadas por uso en código):
- EXPO_PUBLIC_SUPABASE_URL
- EXPO_PUBLIC_SUPABASE_ANON_KEY
- EXPO_PUBLIC_OPENROUTER_API_KEY
- EXPO_PUBLIC_UNSPLASH_ACCESS_KEY

Web:
- VITE_OPENROUTER_API_KEY (referenciada en src/shared/lib/ai/index.ts como fallback)

Notas:
- No existe .env.example en este repositorio.
- No se pudo confirmar lista completa de env vars del repo web porque no está presente aquí.

## Riesgos identificados

1) Falta ErrorBoundary global en raíz
- Evidencia: app/_layout.tsx no exporta ErrorBoundary ni envuelve Stack con boundary.
- Riesgo: un error de render en runtime puede cerrar pantalla/app sin fallback visual.

2) Navegación de tabs con router.push
- Evidencia: app/index.tsx usa router.push para home/study/exercise/habits/cooking en handleNavigate.
- Riesgo: historial de navegación más frágil e inconsistencias al cambiar tabs.

3) Tokens IA por defecto bajos en rutas internas
- Evidencia: src/shared/lib/ai/index.ts usa max_tokens 2048 (callAIText default) y 1024 (callAIWithMessages).
- Riesgo: respuestas truncadas en prompts largos, especialmente en demo con contenido extenso.

4) Silenciamiento de errores con .catch(() => {})
- Evidencia: src/shared/lib/notifications.ts y src/shared/lib/ai-client.ts (setItem cache).
- Riesgo: fallos intermitentes quedan invisibles y son difíciles de diagnosticar.

5) Logging de objetos completos en producción
- Evidencia: varios console.error con objeto raw, por ejemplo app/habits.tsx y app/exercise-create.tsx.
- Riesgo: ruido de logs, potencial impacto de performance y exposición de payloads grandes.

6) Sin .env.example versionado
- Evidencia: no hay archivos .env* en raíz.
- Riesgo: configuración inconsistente entre entornos, errores en demo por variables faltantes.

7) Tipado de Supabase no consistente y cast inseguro
- Evidencia: src/shared/lib/ai/index.ts contiene messages as any; además múltiples selects sin genéricos explícitos.
- Riesgo: errores de datos en runtime no detectados en compilación.

8) Placeholder de Supabase para evitar crash de arranque
- Evidencia: src/shared/lib/supabase.ts usa FALLBACK_SUPABASE_URL/FALLBACK_SUPABASE_ANON_KEY.
- Riesgo: app no cae al iniciar, pero falla funcionalmente después (fallo diferido y más difícil de detectar).

9) Imposible validar RLS/constraints/RPC en esta codebase
- Evidencia: no hay migraciones SQL ni schema DB en repo.
- Riesgo: reglas de seguridad y constraints críticos pueden estar ausentes sin visibilidad local.

10) Divergencia potencial entre capas AI
- Evidencia: coexisten src/shared/lib/ai.ts y src/shared/lib/ai-client.ts con lógica muy similar.
- Riesgo: drift de comportamiento y fixes aplicados en una capa pero no en la otra.
