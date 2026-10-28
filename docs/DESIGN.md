# Sistema de diseño de Mochi

Dirección: **suave y cálido** (crema, lavanda y durazno; esquinas muy redondeadas; Mochi protagonista). Claro y oscuro automáticos.

## Tokens
Definidos en `global.css` (canales RGB, claro y `prefers-color-scheme: dark`) y expuestos en `tailwind.config.js`:

| Clase | Uso |
|---|---|
| `bg-canvas` | Fondo de pantalla |
| `bg-surface` / `bg-surface-muted` | Tarjetas / zonas secundarias |
| `text-ink` / `text-ink-muted` | Texto principal / secundario |
| `border-line` | Bordes |
| `bg-accent` + `text-accent-ink` | Acción principal |
| `bg-accent-soft` | Acento suave |
| `bg-peach`, `text-positive`, `text-warning`, `text-danger` | Estados |
| `rounded-card` (24) / `rounded-control` (16) | Radios |

Regla: no usar colores sueltos (`bg-purple-50`, hex) en pantallas nuevas; solo tokens.

## Componentes (`src/shared/ui/`)
`Button`, `Card`, `Chip`, `Toggle`, `Input`, `EmptyState`, `ErrorState`, `Skeleton`. Cada uno: tamaño táctil ≥ 44, rol y estado de accesibilidad, y test en `__tests__/`. `Skeleton` respeta reduced-motion.

## Mochi
`MochiCharacter` recibe `expression` (10) y `outfit`. El manifiesto está en `src/shared/mochi/manifest.ts`; guía de arte en `assets/mochi/README.md`.

## Estado de la migración
- **Modo oscuro activo** (`userInterfaceStyle: automatic`). Se logró con una migración mecánica de todas las pantallas: cada clase de color claro (`bg-purple-50`, `text-slate-900`, `border-pink-200`, `bg-white`) tiene su variante `dark:`, y los colores hex de iconos/props pasan por `tc()` (`src/shared/theme/colors.ts`), que invierte la luminosidad en oscuro.
- Pantallas nuevas y componentes de `src/shared/ui` usan tokens semánticos directamente.
- **Sin verificar visualmente** en dispositivo: revisar contraste en cada pantalla y ajustar casos sueltos (texto oscuro sobre fondos saturados 400/500, gradientes con `rgba`, imágenes).
- Limitación: `tc()` se evalúa al renderizar; cambiar el tema del sistema con la app abierta puede dejar iconos con el color anterior hasta re-renderizar.
- Pendiente (no hecho): partir los archivos de más de 700 líneas (`settings`, `HomeDashboard`, `exam-log`, `study-timer`, `cooking`) y la navegación por tabs Hoy · Estudio · Bienestar · Duo · Perfil.
- Widget Android: resumen (puntos, racha, bloque del día); falta el botón "Me llegó hoy".

## Modo oscuro (feature flag, apagado)

El modo oscuro está implementado pero **desactivado por defecto**: la app se ve siempre en claro.

- Flag: `EXPO_PUBLIC_DARK_MODE=true` (ver `src/shared/config/flags.ts` y `.env.example`). Se lee al compilar; hay que recompilar para cambiarla.
- Apagado: `userInterfaceStyle` queda en `light` (app.config.js) y `tc()` no invierte colores.
- Encendido: sigue el modo del sistema. Las escalas de color van por variables CSS; en oscuro, los tonos 700–950 se mezclan con la base lavanda del tema (`src/shared/theme/darkScale.ts`).
- Estado al activarlo: la paleta ya es coherente en Inicio, Estudio, Bienestar y Perfil, pero falta revisar pantalla por pantalla (la barra inferior cambia de color por pestaña y algunos iconos tienen poco contraste).
