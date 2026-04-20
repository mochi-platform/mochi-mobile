# Bugfixes: RecoveryPlanModal, SprintTracker y ExamSprintProgress

## Alcance de repositorio (override)

- Este documento asume repositorios individuales (sin Turborepo).
- La implementación descrita aquí corresponde al repo `mochi-mobile`.

## Resumen de problemas

Tres componentes introducidos recientemente tienen violaciones de las convenciones del
proyecto y código no funcional en NativeWind v3:

---

## 1. `src/shared/components/RecoveryPlanModal.tsx`

### Problemas

| Severidad | Problema |
|---|---|
| 🔴 BLOCKER | `bg-gradient-to-r from-pink-50 to-purple-50` — clase de Tailwind v4/web, no existe en NativeWind v3 |
| 🔴 BLOCKER | Emoji 💪 en UI — viola la convención del proyecto |
| 🟠 MAJOR | El tipo de `recovery_tasks[].difficulty` llega como `"easy" \| "medium" \| "hard"` pero `getDifficultyLabel` está en inglés |
| 🟡 MINOR | Copy mezclado: título en español, algunos strings internos en inglés |

### Correcciones

**Reemplazar `LinearGradient` con fondo sólido NativeWind:**

```tsx
// ANTES (rompe en NativeWind v3):
<LinearGradient
  colors={["#fdf2f8", "#f3e8ff"]}
  ...
  className="mb-3 rounded-xl border border-pink-200 p-3"
>

// DESPUÉS:
<View className="mb-3 rounded-xl border border-pink-200 bg-pink-50 p-3">
```

Eliminar el import de `expo-linear-gradient` del archivo.

**Eliminar emoji:**

```tsx
// ANTES:
<Text className="text-xs text-yellow-800">
  <Text className="font-semibold">Pista:</Text> Completa estos 3
  días y tu racha estará de vuelta. Tú puedes, amiga 💪
</Text>

// DESPUÉS:
<Text className="text-xs text-yellow-800">
  <Text className="font-semibold">Pista:</Text> Completa estos 3
  días y tu racha estará de vuelta. ¡Tú puedes, amiga!
</Text>
```

**Traducir `getDifficultyLabel`:**

```typescript
// ANTES:
function getDifficultyLabel(difficulty: string): string {
  const labels: Record<string, string> = {
    easy: "Fácil",
    medium: "Media",
    hard: "Difícil",
  };
  return labels[difficulty] || difficulty;
}

// Sin cambios en la lógica — solo verificar que el retorno sea el español
// Esta función ya está bien; el issue es que los strings de entrada son en inglés.
// La fuente del tipo está en src/shared/types/database.ts → StreakRecoveryPlan:
// difficulty: 'easy' | 'medium' | 'hard'
// Esto es correcto — la traducción ocurre en el label. No cambiar el valor en DB.
```

**Agregar Ionicons para botón de cierre (si aplica):**

El modal actual no tiene botón de cierre visible — los dos botones de acción son suficientes.
Verificar que `onDismiss` esté conectado al botón "Ahora no".

### Archivo a modificar

`src/shared/components/RecoveryPlanModal.tsx`

---

## 2. `src/shared/components/SprintTracker.tsx`

### Problemas

| Severidad | Problema |
|---|---|
| 🔴 BLOCKER | `<Ionicons name="checkmark">` en la grilla de días — el componente usa `<Ionicons>` correctamente pero también `size={16}` sin color definido |
| 🟠 MAJOR | Copy en inglés: "Cargando progreso...", "Horas promedio", "Meta diaria" → verificar |
| 🟠 MAJOR | `Pressable` para cada día de la grilla no tiene `activeOpacity` equivalente — usar `TouchableOpacity` |
| 🟡 MINOR | El encabezado usa "Progreso: X/Y días" — correcto en español |

### Correcciones

**Reemplazar `Pressable` por `TouchableOpacity` en la grilla:**

```tsx
// ANTES:
<Pressable
  key={day.dayNumber}
  className={`items-center justify-center rounded-lg w-12 h-12 border-2 ${...}`}
>

// DESPUÉS:
<TouchableOpacity
  key={day.dayNumber}
  activeOpacity={0.8}
  className={`items-center justify-center rounded-lg w-12 h-12 border-2 ${...}`}
>
```

**Definir color en el Ionicons de checkmark:**

```tsx
// ANTES:
<Ionicons name="checkmark" size={16} color="#16a34a" />
// Ya tiene color — verificar que está presente en el render actual
```

**Verificar copy completo en español:**

```tsx
// Revisar y corregir si alguno está en inglés:
"Cargando progreso..."   → "Cargando progreso..."  ✅
"Horas promedio"         → "Horas promedio"        ✅
"Meta diaria"            → "Meta diaria"           ✅
"Progreso: X/Y días"     → correcto               ✅
```

**`Pressable` en botón crear sprint:**

```tsx
// En exam-sprint-progress.tsx el botón "Crear Sprint" usa Pressable:
<Pressable
  onPress={() => setShowCreateModal(true)}
  className="mt-8 bg-green-500 rounded-xl px-6 py-3 active:opacity-70"
>

// Cambiar a TouchableOpacity para consistencia:
<TouchableOpacity
  onPress={() => setShowCreateModal(true)}
  activeOpacity={0.85}
  className="mt-8 bg-green-500 rounded-xl px-6 py-3"
>
```

### Archivo a modificar

`src/shared/components/SprintTracker.tsx`

---

## 3. `app/exam-sprint-progress.tsx`

### Problemas

| Severidad | Problema |
|---|---|
| 🔴 BLOCKER | Copy extenso en inglés en toda la pantalla |
| 🔴 BLOCKER | Múltiples `Pressable` — usar `TouchableOpacity` |
| 🟠 MAJOR | Textos "Centro de preparación con sprints", "Tu Sprint Actual", "Sprints Anteriores", "No hay sprint activo", "Crear Sprint" etc. en inglés |
| 🟠 MAJOR | Los placeholders del modal de creación están en inglés |
| 🟡 MINOR | `Text className` con colores hard-coded `text-gray-600` en lugar de NativeWind semántico del proyecto |

### Correcciones de copy

```tsx
// ANTES → DESPUÉS

"Centro de preparación con sprints"
→ "Centro de preparación"

"Tu Sprint Actual"
→ "Sprint activo"

"No hay sprint activo"
→ "Sin sprint activo"

"Crea un plan de estudio estructurado para este examen"
→ "Crea un plan de estudio estructurado para este examen"  // ✅ ya en español

"Crear Sprint"
→ "Crear sprint"

"Sprints Anteriores"
→ "Sprints anteriores"

"Volver"
→ "Volver"  // ✅ ya en español

// Placeholders del modal:
"2026-03-29" → "AAAA-MM-DD"  // más claro para usuaria hispanohablante
"2026-04-10" → "AAAA-MM-DD"

// Labels:
"Fecha de inicio (AAAA-MM-DD)"  // ✅ ya en español
"Fecha de fin (AAAA-MM-DD)"     // ✅ ya en español
"Horas de estudio por día"      // ✅ ya en español
"Meta de calificación (opcional)" // ✅ ya en español

// Botones del modal:
"Crear Sprint" → "Crear sprint"
"Cancelar"     // ✅ ya en español

// Mensajes de error:
"Por favor completa todos los campos"
→ "Completa todos los campos para continuar"

"La fecha de inicio debe ser anterior a la de fin"
→ "La fecha de inicio debe ser antes de la fecha de fin"

"Error al crear sprint"
→ "No se pudo crear el sprint"

// Sprint pasado:
"h diarias" → "h diarias"  // ✅

// Cargando:
"Cargando sprints..." → "Cargando sprints..."  // ✅

// Consejo:
"Mantén consistencia diaria para una preparación efectiva. ¡Tú puedes!"
→ "La constancia diaria es tu mejor herramienta. ¡Adelante!"
```

### Reemplazar `Pressable` por `TouchableOpacity`

En todo el archivo, reemplazar:
```tsx
<Pressable onPress={...} className="... active:opacity-70">
// por:
<TouchableOpacity onPress={...} activeOpacity={0.85} className="...">
```

Eliminar las clases `active:opacity-70` — no funcionan en NativeWind v3 igual que en web.

### Colores grises

Reemplazar `text-gray-600`, `text-gray-800`, `bg-gray-200` etc. por equivalentes del
sistema de colores del proyecto (verdes, para mantener coherencia con el módulo de exámenes
que usa colores `green-*`):

```tsx
text-gray-800  → text-slate-800
text-gray-600  → text-slate-600
bg-gray-200    → bg-slate-200
bg-gray-50     → bg-slate-50
border-gray-300 → border-slate-300
border-gray-200 → border-slate-200
```

### Archivo a modificar

`app/exam-sprint-progress.tsx`

---

## Archivos a modificar (resumen)

| Archivo | Cambios |
|---|---|
| `src/shared/components/RecoveryPlanModal.tsx` | LinearGradient → View, eliminar emoji, verificar copy |
| `src/shared/components/SprintTracker.tsx` | Pressable → TouchableOpacity, verificar copy |
| `app/exam-sprint-progress.tsx` | Copy completo a español, Pressable → TouchableOpacity, colores grises → slate |

## Criterios de aceptación

- No existe ningún emoji en los tres archivos.
- No existe ninguna clase `bg-gradient-to-r` ni `from-*` en componentes móviles.
- No existe ningún `Pressable` — todo usa `TouchableOpacity` con `activeOpacity`.
- Todo el copy visible para la usuaria está en español.
- `tsc --noEmit` pasa sin errores.
- Los colores siguen la paleta del proyecto (no `gray-*`, sino `slate-*` o el color temático del módulo).
