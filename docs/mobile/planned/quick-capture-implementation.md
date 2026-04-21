# Quick Capture — Implementación completa

## Alcance de repositorio (override)

- Este documento asume repositorios individuales (sin Turborepo).
- La implementación descrita aquí corresponde al repo `mochi-mobile`.

## Aplicación del override en este documento

- Todos los cambios de UI/flujo y persistencia se implementan en pantallas/componentes móviles.
- Las inserciones se hacen contra tablas Supabase ya consumidas desde este repo.
- No se requiere ninguna pieza de `mochi-web` para completar el alcance.

## Estado actual

El `QuickCaptureModal` existe y llama a `convertNoteToAction` de la IA, pero el callback
`onActionCreated` en `app/(tabs)/index.tsx` recibe el resultado y **no hace nada con él**.
Las notas se analizan pero nunca se persisten en Supabase.

```typescript
// app/(tabs)/index.tsx — actualmente vacío
<QuickCaptureModal
  visible={quickCaptureOpen}
  onClose={() => setQuickCaptureOpen(false)}
  // onActionCreated no está pasado → las acciones se pierden
/>
```

Además, el FAB que abre el modal está declarado pero **nunca se renderiza** — no hay botón
flotante en `HomeDashboard` que lo dispare.

## Objetivo

1. Conectar el resultado de IA a inserciones reales en Supabase según el tipo detectado.
2. Agregar el FAB de captura rápida al dashboard principal.
3. Mostrar feedback a la usuaria después de crear la acción.

## Tablas involucradas

| Tipo detectado | Tabla destino | Campos mínimos |
|---|---|---|
| `study_block` | `study_blocks` | `user_id`, `subject`, `day_of_week`, `start_time`, `end_time`, `color` |
| `exercise` | `exercises` | `user_id`, `name`, `sets`, `reps`, `duration_seconds` |
| `goal` | `goals` | `user_id`, `title`, `description`, `color`, `progress`, `is_completed` |
| `habit` | `habits` | `user_id`, `name`, `icon`, `color` |

Todas tienen RLS con `user_id = auth.uid()`.

## Cambios requeridos

### 1. `app/(tabs)/index.tsx`

Agregar `onActionCreated` handler que persiste en Supabase según tipo:

```typescript
const handleActionCreated = useCallback(
  async (action: ActionConversionResult) => {
    const userId = session?.user.id;
    if (!userId) return;

    try {
      switch (action.type) {
        case "study_block": {
          await supabase.from("study_blocks").insert({
            user_id: userId,
            subject: action.data.title ?? "Estudio",
            day_of_week: new Date().getDay(),
            start_time: "09:00",
            end_time: "10:30",
            color: "purple",
          });
          break;
        }
        case "exercise": {
          await supabase.from("exercises").insert({
            user_id: userId,
            name: action.data.title ?? "Ejercicio",
            sets: 3,
            reps: 10,
            duration_seconds: (action.data.duration ?? 30) * 60,
            notes: action.data.description ?? null,
          });
          break;
        }
        case "goal": {
          await supabase.from("goals").insert({
            user_id: userId,
            title: action.data.title ?? "Nueva meta",
            description: action.data.description ?? null,
            color: "purple",
            progress: 0,
            is_completed: false,
          });
          break;
        }
        case "habit": {
          await supabase.from("habits").insert({
            user_id: userId,
            name: action.data.title ?? "Nuevo hábito",
            icon: "leaf",
            color: "purple",
          });
          break;
        }
      }
    } catch (err) {
      console.error("[QuickCapture] error persistiendo acción:", err);
    }
  },
  [session?.user.id],
);
```

Pasar el handler al modal:

```tsx
<QuickCaptureModal
  visible={quickCaptureOpen}
  onClose={() => setQuickCaptureOpen(false)}
  onActionCreated={(action) => {
    void handleActionCreated(action);
  }}
/>
```

### 2. FAB en `HomeDashboard.tsx`

Agregar al final del componente, antes de cerrar el `ScrollView`, un botón flotante que
abra el modal. El estado `quickCaptureOpen` debe subir a `index.tsx` o manejarse internamente
en `HomeDashboard`.

Opción recomendada: pasar `onOpenQuickCapture` como prop a `HomeDashboard`:

```typescript
// En HomeDashboardProps agregar:
onOpenQuickCapture: () => void;
```

Dentro del componente, después del último `AnimatedDashboardCard`:

```tsx
<FloatingActionButton
  onPress={onOpenQuickCapture}
  containerClassName="bg-violet-500"
  borderClassName="border-violet-300"
  iconName="flash"
  accessibilityLabel="Captura rápida"
  bottomOffset={72}
/>
```

### 3. `src/shared/components/QuickCaptureModal.tsx`

El modal actualmente mezcla copy en inglés. Correcciones:

```typescript
// Cambiar:
placeholder="¿Qué está en tu mente?"  // ✅ ya en español
// Cambiar textos de botones en inglés:
"Analizar"     // ✅
"No, gracias"  // ✅
"Crear"        // ✅
// Revisar estado "typeSelect" — tiene copy en inglés mezclado
```

En `getTipoLabel` agregar traducción completa (ya existe — verificar que se use en todos los estados).

### 4. Gamificación tras crear acción

Después de una inserción exitosa, sumar puntos según tipo:

| Tipo | Puntos |
|---|---|
| `study_block` | +0 (se suman al completar la sesión) |
| `exercise` | +0 (se suman al completar rutina) |
| `goal` | +0 (se suman al completar meta) |
| `habit` | +0 (se suman al completar hábito diario) |

No sumar puntos por la captura en sí — se suman al ejecutar. Solo mostrar un toast de confirmación.

### 5. Toast de confirmación

Después del switch de inserciones:

```typescript
const label = {
  study_block: "Bloque de estudio",
  exercise: "Ejercicio",
  goal: "Meta",
  habit: "Hábito",
}[action.type];

showAchievement({
  title: `${label} creado`,
  description: action.data.title ?? "Acción guardada desde captura rápida",
  points: 0,
  icon: "flash",
});
```

## Archivos a modificar

1. `app/(tabs)/index.tsx` — handler + pasar prop
2. `src/features/home/components/HomeDashboard.tsx` — agregar prop + FAB
3. `src/shared/components/QuickCaptureModal.tsx` — copy en español

## Criterios de aceptación

- La usuaria escribe una nota, la IA la clasifica, y la acción se crea en Supabase.
- El FAB de captura rápida es visible en el home dashboard.
- Todo el copy está en español.
- Si la IA falla, se muestra el tipo genérico sin bloquear el flujo.
- No hay `any`, no hay `.then()`.
