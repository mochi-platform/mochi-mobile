---
description: "Agente principal para desarrollo de Mochi Mobile. Usa cuando implementes features, corrijas bugs o tomes decisiones de arquitectura. Conoce el stack completo: Expo, React Native, NativeWind, Supabase, OpenRouter."
name: "Mochi Dev"
tools: [vscode/getProjectSetupInfo, vscode/installExtension, vscode/memory, vscode/newWorkspace, vscode/resolveMemoryFileUri, vscode/runCommand, vscode/vscodeAPI, vscode/extensions, vscode/askQuestions, execute/runNotebookCell, execute/testFailure, execute/getTerminalOutput, execute/killTerminal, execute/sendToTerminal, execute/createAndRunTask, execute/runInTerminal, read/getNotebookSummary, read/problems, read/readFile, read/viewImage, read/readNotebookCellOutput, read/terminalSelection, read/terminalLastCommand, agent/runSubagent, edit/createDirectory, edit/createFile, edit/createJupyterNotebook, edit/editFiles, edit/editNotebook, edit/rename, search/changes, search/codebase, search/fileSearch, search/listDirectory, search/textSearch, search/usages, web/fetch, web/githubRepo, browser/openBrowserPage, browser/readPage, browser/screenshotPage, browser/navigatePage, browser/clickElement, browser/dragElement, browser/hoverElement, browser/typeInPage, browser/runPlaywrightCode, browser/handleDialog, todo]
---

# Mochi Dev — Agente Principal

## Stack obligatorio
- **Framework**: Expo SDK 55 + React Native 0.83 + Expo Router v4
- **Estilos**: NativeWind v4 (Tailwind v3 syntax). NUNCA `StyleSheet.create`.
- **Animaciones**: `react-native-reanimated` 4.x. NUNCA Framer Motion.
- **Backend**: Supabase — cliente siempre desde `@mochi/supabase/client`
- **IA**: OpenRouter vía `callAI()` en `src/shared/lib/ai/index.ts`
- **Paquetes**: `pnpm` únicamente. NUNCA `npm` ni `yarn`.

## Convenciones estrictas
1. TypeScript estricto. Sin `any`. Sin `.js` en `app/` ni `src/`.
2. Todo UI copy en **español**. Sin emojis — Ionicons siempre.
3. `async/await` únicamente. NUNCA `.then()`.
4. Named exports en todos los componentes y hooks.
5. Todo componente con fetch maneja: loading + error + empty state.
6. Imports de Supabase: `import { supabase } from "@/src/shared/lib/supabase"`.

## Estructura de archivos
```
app/                     → screens (Expo Router)
src/
  core/providers/        → SessionContext, CycleContext, ModuleVisibilityContext...
  features/[feature]/    → components/ + hooks/ por feature
  shared/
    components/          → componentes reutilizables
    hooks/               → hooks compartidos
    lib/
      ai/index.ts        → callAI() y funciones derivadas
      supabase/          → client.ts, types.ts, levels.ts
      gamification.ts    → addPoints, unlockAchievement, checkX...
      notifications.ts   → schedule/cancel por tipo
      healthConnect.ts   → ciclo menstrual vía Health Connect
    types/database.ts    → re-export de @mochi/supabase/types
```

## Patrones clave

### Supabase + RLS
```typescript
// ✅ Siempre filtrar por user_id; nunca service role desde cliente
const { data, error } = await supabase
  .from("table")
  .select("*")
  .eq("user_id", userId);
```

### Gamificación
```typescript
// Puntos: siempre vía addPoints (usa RPC increment_points internamente)
await addPoints(userId, 5, showAchievement);
// Logros: siempre vía unlockAchievement (idempotente)
const unlocked = await unlockAchievement(userId, "first_study");
if (unlocked) showAchievement(unlocked);
```

### Async en onPress de CustomAlert
```typescript
// ✅ Patrón correcto — no silencia errores
onPress: () => {
  void (async () => {
    await doSomething();
  })();
},
```

### IA — tokens suficientes
```typescript
// Recetas necesitan max_tokens alto (pueden llegar a ~2800 tokens)
await callAI(prompt, { maxTokens: 8192 });
// Respuestas cortas: 2048 es suficiente
```

### Módulos opcionales — siempre verificar
```typescript
const { moduleVisibility } = useModuleVisibility();
if (!moduleVisibility.cooking_enabled) return null;
```

## Gamificación — tabla de puntos
| Acción | Puntos |
|---|---|
| Sesión de estudio | +5 |
| Examen aprobado (≥70%) | +20 |
| Rutina de ejercicio | +10 |
| Sesión de cocina | +15 |
| Receta generada con IA | +5 |
| Meta completada | +15 |
| Registro de gratitud | +3 |

## Fases de ciclo menstrual
Las fases (`menstrual`, `folicular`, `ovulatoria`, `lutea`, `unknown`) vienen de
`CycleContext`. Úsalas con `useCycleRecommendation(context)` para tips.
**No hardcodear lógica de ciclo fuera de `cyclePersonality.ts`.**
Importar tipos desde `@/src/shared/lib/healthConnect` y nunca usar valores en inglés.

## Expo Go vs APK
Módulos nativos (`react-native-health-connect`, `react-native-edge-to-edge`,
`expo-notifications`) DEBEN estar bajo guard `isExpoGo` con dynamic import.
```typescript
import { isExpoGo } from "@/lib/env";
if (!isExpoGo) {
  const module = await import("react-native-health-connect");
}
```

## Workflow al implementar
1. Leer schema relevante antes de escribir código (`information_schema.columns`).
2. Verificar que la tabla existe y tiene RLS.
3. Escribir código completo — sin `TODO:` ni placeholders.
4. Mencionar nuevas env vars o dependencias necesarias.
5. Si nueva tabla: incluir SQL con RLS + GRANT a `authenticated`.