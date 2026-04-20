# Unificación del tipo CyclePhase

## Alcance de repositorio (override)

- Este documento asume repositorios individuales (sin Turborepo).
- La implementación descrita aquí corresponde al repo `mochi-mobile`.

## Aplicación del override en este documento

- La unificación de tipos se resuelve solo en código TypeScript de `mochi-mobile`.
- No depende de paquetes compartidos de un monorepo; se toma como fuente local del repo.
- Cualquier ajuste de tipos de Supabase se consume por alias ya configurados en este workspace.

## Problema

Existen **dos definiciones incompatibles** de `CyclePhase` en el proyecto:

### Definición A — `src/shared/lib/healthConnect.ts` (en español, fuente de verdad)
```typescript
export type CyclePhase =
  | "menstrual"
  | "folicular"
  | "ovulatoria"
  | "lutea"
  | "unknown";
```

### Definición B — `src/shared/lib/plannerLogic.ts` (en inglés, duplicada)
```typescript
export type { CyclePhase } from "@/src/shared/lib/healthConnect";
// plannerLogic re-exporta el tipo correcto pero el archivo TAMBIÉN usa strings
// en inglés en su lógica interna: "menstrual" | "follicular" | "ovulation" | "luteal"
```

### Cast inseguro — `src/shared/hooks/useCyclePhase.ts`
```typescript
// La función retorna CyclePhase de healthConnect pero el cast no garantiza nada
return cycleData.phase as CyclePhase; // si cycleData.phase viene en inglés, silencia el error
```

### Consecuencias

- `plannerLogic.ts` → `typeScoreByCycle()` usa los valores en español porque los recibe
  de `CycleContext` (correcto), pero el tipo exportado puede confundir a futuros desarrolladores.
- `getCyclePersonality()` en `cyclePersonality.ts` espera el tipo de `healthConnect.ts`
  (español). Si algún componente pasa un valor en inglés, el `switch` cae en `unknown`
  silenciosamente y se pierde la personalización.
- Cualquier código generado por Copilot que importe `CyclePhase` puede usar valores en
  inglés si mira `plannerLogic.ts` en lugar de `healthConnect.ts`.

## Solución

### Paso 1: `plannerLogic.ts` — eliminar re-export y usar import directo

```typescript
// ANTES (re-export que confunde):
export type { CyclePhase } from "@/src/shared/lib/healthConnect";

// DESPUÉS (import limpio sin re-export):
import type { CyclePhase } from "@/src/shared/lib/healthConnect";
// usar CyclePhase directamente en las firmas de funciones
```

Asegurarse de que `typeScoreByCycle` en `plannerLogic.ts` tiene el switch completo:

```typescript
function typeScoreByCycle(phase: CyclePhase): number {
  switch (phase) {
    case "menstrual":  return -20;
    case "folicular":  return 10;
    case "ovulatoria": return 20;
    case "lutea":      return -10;
    case "unknown":    return 0;
    default: {
      // Garantiza exhaustividad en TypeScript
      const _exhaustive: never = phase;
      return 0;
    }
  }
}
```

### Paso 2: `useCyclePhase.ts` — eliminar cast inseguro

```typescript
// ANTES:
return cycleData.phase as CyclePhase;

// DESPUÉS (cycleData.phase ya es CyclePhase por el tipo de CyclePhaseData):
return cycleData.phase;
```

No se necesita cast porque `CyclePhaseData.phase` ya está tipado como `CyclePhase`.

### Paso 3: `src/shared/types/database.ts` — agregar re-export de CyclePhase

Para que los agentes de Copilot tengan un único lugar de importación:

```typescript
// database.ts ya tiene: export * from "@mochi/supabase/types";
// Agregar:
export type { CyclePhase, CyclePhaseData } from "@/src/shared/lib/healthConnect";
```

### Paso 4: Actualizar `copilot-instructions.md` y agentes

En la sección de fases de ciclo en `mochi-dev-agent.md` y `mochi-reviewer.md`, el
checklist de review ya tiene:

```markdown
- [ ] Ciclo menstrual: tipos CyclePhase de healthConnect.ts
      (español: menstrual, folicular, ovulatoria, lutea)
```

Verificar que `copilot-instructions.md` también lo mencione explícitamente.

## Archivos a modificar

| Archivo | Cambio |
|---|---|
| `src/shared/lib/plannerLogic.ts` | Cambiar re-export a import, agregar default exhaustivo |
| `src/shared/hooks/useCyclePhase.ts` | Eliminar cast `as CyclePhase` |
| `src/shared/types/database.ts` | Agregar re-export de `CyclePhase` y `CyclePhaseData` |
| `.github/copilot-instructions.md` | Documentar que CyclePhase usa español |

## Criterios de aceptación

- `tsc --noEmit` pasa sin errores ni warnings relacionados con CyclePhase.
- `typeScoreByCycle` tiene el tipo de retorno explícito y cubre los 5 casos.
- No existe ningún `as CyclePhase` cast en el codebase.
- La única fuente de los valores de fase es `healthConnect.ts`.
- Los valores en inglés ("follicular", "luteal") no aparecen en ningún archivo de `src/`.
