# Widget de inicio Android — verificación y corrección

## Alcance de repositorio (override)

- Este documento asume repositorios individuales (sin Turborepo).
- La implementación descrita aquí corresponde al repo `mochi-mobile`.

## Aplicación del override en este documento

- Toda la validación y corrección se ejecuta en código móvil de este repo.
- No se asume infraestructura web compartida para widgets.
- Cualquier pieza nativa Android pendiente se documenta como trabajo local de `mochi-mobile`.

## Estado actual

`expo-widgets` está configurado en `app.json` con el widget `MochiResumenWidget`.
El código del widget vive en `src/shared/widgets/mochiSummaryWidget.tsx` y usa
`@expo/ui/swift-ui` — librería orientada a iOS.

`saveHomeWidgetSummary` guarda datos en AsyncStorage y llama a
`mochiSummaryWidget.updateSnapshot()` solo en iOS. En Android, la función simplemente
no hace nada con el widget nativo.

### Problemas identificados

1. **`@expo/ui/swift-ui`** — Solo disponible en iOS. No existe un equivalente de
   `expo-widgets` para Android que use SwiftUI components. Los widgets de Android
   usan Glance (Jetpack Compose) o RemoteViews.

2. **`expo-widgets`** — Al revisar el paquete en el contexto de Expo SDK 55, la API
   de `createWidget` con SwiftUI primitivos solo genera widgets iOS. Para Android
   se requiere una implementación nativa separada o un config plugin.

3. **`mochiSummaryWidget.tsx`** — El archivo importa `@expo/ui/swift-ui` que en un
   build Android simplemente no existe, lo que puede causar errores en runtime si
   el guard `Platform.OS !== "ios"` no está en todos los puntos de llamada.

4. **`homeWidgetSummary.ts`** — El guard `Platform.OS !== "ios"` en
   `syncIOSWidgetSnapshot` está correcto para iOS, pero en Android el widget nativo
   **no se actualiza nunca**.

## Diagnóstico rápido

Verificar si el widget renderiza en un build de desarrollo Android:

```bash
# Build APK de desarrollo
eas build --platform android --profile development --local

# Instalar en dispositivo y comprobar si el widget aparece en la galería de widgets
```

Si el widget no aparece en la galería de Android → confirma el problema.

## Opciones

### Opción A: Solo iOS por ahora (mínimo esfuerzo)

Aceptar que el widget solo funciona en iOS en esta versión. Actualizar el código para
que en Android no intente ninguna operación de widget:

```typescript
// homeWidgetSummary.ts — sin cambios en la lógica ya existente
// El guard Platform.OS !== "ios" ya está en syncIOSWidgetSnapshot
// Solo documentar que Android queda para versión futura
```

En `app.json`, mover la configuración del widget al bloque `ios` si aplica, o mantenerla
con nota de que Android se implementará después.

**Acción inmediata:** asegurar que `mochiSummaryWidget.tsx` nunca se importa en Android:

```typescript
// homeWidgetSummary.ts
async function syncIOSWidgetSnapshot(payload): Promise<void> {
  if (Platform.OS !== "ios" || isExpoGo) return; // ← guard ya existe ✅
  // ...
}
```

Verificar que no hay ningún otro import de `@expo/ui/swift-ui` fuera de este archivo.

### Opción B: Widget Android nativo con config plugin (más esfuerzo, pendiente)

Requiere:
1. Config plugin personalizado que genera un `AppWidget` de Android con `RemoteViews`
2. Módulo nativo (Kotlin) que lee de AsyncStorage o SharedPreferences el JSON del widget
3. `BroadcastReceiver` para actualizar el widget cuando la app llama a `updateAppWidget`

Esto está fuera del scope de Expo Go y requiere un custom dev client.

**Esta opción se documenta como tarea futura** — ver sección "Siguiente versión" abajo.

## Acciones inmediatas (Opción A)

### 1. Verificar que el import es seguro en Android

```typescript
// src/shared/lib/homeWidgetSummary.ts
// El import dinámico ya está envuelto en try/catch — verificar:

try {
  const widgetModule = await import("@/src/shared/widgets/mochiSummaryWidget");
  widgetModule.mochiSummaryWidget.updateSnapshot({ ... });
  widgetModule.mochiSummaryWidget.reload();
} catch (error) {
  console.warn("[HomeWidget] no se pudo sincronizar el widget nativo:", ...);
}
```

El `try/catch` protege el runtime. Si `@expo/ui/swift-ui` no existe en Android, el
catch lo captura sin crashear la app. ✅

### 2. Agregar guard explícito antes del import dinámico

```typescript
// ANTES (depende del catch para no crashear):
async function syncIOSWidgetSnapshot(payload): Promise<void> {
  if (Platform.OS !== "ios" || isExpoGo) return;
  try {
    const widgetModule = await import("@/src/shared/widgets/mochiSummaryWidget");
    ...
  }
}

// DESPUÉS (idéntico — el guard de Platform.OS ya es suficiente):
// Sin cambios necesarios si el guard está presente ✅
```

### 3. Actualizar `copilot-instructions.md`

Agregar nota en la sección de plugins:

```markdown
### expo-widgets
- Widget `MochiResumenWidget` configurado para iOS únicamente en esta versión.
- En Android, `saveHomeWidgetSummary` solo persiste en AsyncStorage (sin widget nativo).
- La implementación del widget Android nativo está pendiente (requiere config plugin Kotlin).
```

## Siguiente versión — Widget Android nativo

Cuando se implemente, los pasos son:

1. Crear `plugins/with-android-home-widget.js` — config plugin que:
   - Genera `res/layout/mochi_widget.xml` con RemoteViews
   - Agrega `AppWidgetProvider` al `AndroidManifest.xml`
   - Crea `MochiWidgetProvider.kt` que lee SharedPreferences

2. En `homeWidgetSummary.ts`, además de AsyncStorage, escribir a SharedPreferences
   via un módulo nativo:
   ```typescript
   await NativeModules.MochiWidget?.update({
     points: payload.points,
     streak: payload.streak,
     nextBlock: payload.nextBlock,
   });
   ```

3. El `AppWidgetProvider.kt` hace `appWidgetManager.updateAppWidget()` con los datos
   de SharedPreferences al recibir `ACTION_APPWIDGET_UPDATE`.

## Archivos a revisar/modificar

| Archivo | Acción |
|---|---|
| `src/shared/lib/homeWidgetSummary.ts` | Verificar guard `Platform.OS !== "ios"` ✅ |
| `src/shared/widgets/mochiSummaryWidget.tsx` | Sin cambios — solo se importa en iOS |
| `app.json` | Dejar configuración actual — no rompe el build Android |
| `.github/copilot-instructions.md` | Agregar nota sobre estado del widget |

## Criterios de aceptación

- El build Android no crashea por imports de `@expo/ui/swift-ui`.
- En iOS, el widget muestra puntos, racha y próximo bloque.
- En Android, la app funciona normalmente sin widget (graceful degradation).
- `tsc --noEmit` pasa sin errores relacionados con el widget.
