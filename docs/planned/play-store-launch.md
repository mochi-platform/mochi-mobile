# Checklist de lanzamiento en Play Store

## Alcance de repositorio (override)

- Este documento asume repositorios individuales (sin Turborepo).
- La implementación descrita aquí corresponde al repo `mochi-mobile`.

## Estado actual

La app se distribuye como APK directo vía GitHub Releases con el perfil `production-apk`.
El lanzamiento en Play Store requiere un AAB (Android App Bundle) y configuración
específica que difiere del flujo actual.

## Cambios técnicos necesarios

### 1. Nuevo perfil EAS para Play Store (AAB)

En `eas.json`, agregar:

```json
{
  "build": {
    "production-aab": {
      "extends": "production",
      "android": {
        "buildType": "app-bundle"
      }
    }
  }
}
```

El perfil `production` ya tiene `autoIncrement: true` — el versionCode se incrementa
automáticamente. Verificar que `appVersionSource: "remote"` en el CLI también aplique.

### 2. GitHub Actions — workflow para AAB

Duplicar `.github/workflows/mobile-production-apk.yml` como
`.github/workflows/mobile-production-aab.yml` con los cambios:

- `profile: production-aab`
- `buildType: aab`
- El artifact generado será `.aab` en lugar de `.apk`
- El release no es draft — se sube a Play Store via `google-play` fastlane o manualmente

### 3. Signing keystore

EAS maneja el keystore en la nube con `eas credentials`. Verificar:

```bash
eas credentials --platform android
```

Confirmar que existe un keystore de producción registrado. Si no:

```bash
eas credentials:create --platform android
```

**No commitear el keystore al repositorio.**

### 4. `app.json` — verificaciones previas al lanzamiento

```json
{
  "expo": {
    "version": "5.0.0",           // ← versión semántica visible al usuario
    "android": {
      "package": "com.siramong.mochi",    // ← bundle ID definitivo
      "versionCode": "auto",       // ← manejado por EAS remote
      "permissions": [
        "android.permission.health.READ_MENSTRUATION"
      ]
    }
  }
}
```

Verificar que `com.siramong.mochi` está disponible en Play Console (el package name
no se puede cambiar después del primer lanzamiento).

### 5. Íconos y assets

Play Store requiere:
- Ícono de alta resolución: 512×512 px (ya existe `icon.png`)
- Feature graphic: 1024×500 px (no existe — crear)
- Screenshots: mínimo 2, máximo 8 por tipo de dispositivo
- Ícono adaptativo Android: ya configurado en `app.json` con `foregroundImage` y `backgroundImage`

Crear el feature graphic en `assets/play-store-feature-graphic.png`.

### 6. Privacy Policy

Play Store requiere URL de política de privacidad.

Crear página estática en `mochi.siramong.tech/privacy` o en un Notion público.
Contenido mínimo:
- Datos recolectados (email, datos de ciclo menstrual via Health Connect)
- Cómo se usan (personalización de la app)
- Terceros (Supabase, OpenRouter, Unsplash)
- Derecho a eliminar cuenta

### 7. Eliminar o condicionar el plugin duplicado

Antes del lanzamiento, limpiar `plugins/with-health-connect-permission-delegate.js`
que es una copia de `with-mochi-health-connect-delegate.js`. Solo debe usarse uno
(el que está referenciado en `app.config.js`):

```bash
# Verificar cuál se usa realmente:
grep -r "with-health-connect-permission-delegate" . --include="*.js" --include="*.json"
```

Si no está referenciado en ningún lado, eliminar el archivo.

### 8. Target SDK version

Play Store exige `targetSdkVersion >= 34` desde agosto 2024. Verificar en
`expo-build-properties`:

```json
{
  "plugins": [
    [
      "expo-build-properties",
      {
        "android": {
          "minSdkVersion": 26,
          "targetSdkVersion": 35
        }
      }
    ]
  ]
}
```

### 9. `predictiveBackGestureEnabled: false`

Ya configurado en `app.json` — correcto para evitar conflictos con gestos de Expo Router.

## Checklist de Play Console

### Antes de subir el primer AAB

- [ ] Crear app en Play Console con package `com.siramong.mochi`
- [ ] Configurar cuenta de desarrollador (pago único ~$25 USD)
- [ ] Completar perfil de la app (descripción, categoría: Productividad)
- [ ] Agregar política de privacidad
- [ ] Completar cuestionario de clasificación de contenido (clasificación E — para todos)
- [ ] Completar declaración de permisos sensibles (Health Connect — menstruación)
- [ ] Subir feature graphic 1024×500

### Declaración de Health Connect

Play Store requiere declaración explícita para apps que usen Health Connect:
- Tipo de datos: Menstruation (período menstrual)
- Propósito: Personalizar recomendaciones de estudio y ejercicio
- Sin compartir con terceros

Completar el formulario en Play Console → Configuración de la app → Seguridad de los datos.

### Release tracks recomendados

1. **Internal testing** — primero, con 5-10 tester accounts (Doménica + equipo)
2. **Closed testing (alpha)** — grupo cerrado de 50-100 usuarias
3. **Open testing (beta)** — público limitado
4. **Production** — lanzamiento completo

No saltar directo a Production sin validar en al menos Internal testing.

## Descripción para Play Store (borrador)

**Nombre:** Mochi

**Descripción corta (80 caracteres):**
Tu asistente personal para estudiar, ejercitarte y organizarte.

**Descripción larga (4000 caracteres max):**
```
Mochi es tu compañera personal diseñada para mujeres estudiantes que quieren
organizar su vida académica, cuidar su bienestar y mantener hábitos constantes.

Con Mochi puedes:

• Planificar tu semana de estudio con bloques personalizados y timer Pomodoro
• Recibir sugerencias de estudio basadas en tu ciclo menstrual y nivel de energía
• Crear y completar rutinas de ejercicio con seguimiento de progreso
• Registrar hábitos diarios y mantener tu racha activa
• Generar recetas con inteligencia artificial según tus preferencias
• Llevar un diario de gratitud y registro de tu estado de ánimo
• Ganar puntos, desbloquear logros y canjear recompensas

Mochi se adapta a ti: conoce tu ciclo menstrual a través de Health Connect para
sugerirte el ritmo de estudio y ejercicio más adecuado para cada fase.

Todo en español, sin anuncios y diseñado con amor.
```

## Archivo de referencia de versiones

Crear `docs/release-history.md` para llevar control manual de:
- Versión semántica
- versionCode
- Fecha de lanzamiento
- Cambios incluidos

## Criterios de aceptación del lanzamiento

- El AAB se genera sin errores con `eas build --platform android --profile production-aab`
- El build pasa la validación de Play Console (target SDK, permisos, etc.)
- La app supera revisión de Internal testing sin crashes reportados
- Privacy policy está publicada y accesible
- La declaración de Health Connect está completada en Play Console
- La clasificación de contenido está configurada
