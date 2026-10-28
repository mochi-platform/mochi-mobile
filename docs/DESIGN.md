# Sistema de diseño de Mochi

Dirección **«Compañera cálida»** (Remaster, oct-2026; maquetas aprobadas en `docs/remaster/`):
fondo crema, **sin bordes** (la profundidad viene de sombras suaves), tipografía con carácter,
un solo acento rosa-lavanda y Mochi grande, viva y hablando primero.

## Reglas
- Nada de cajas dentro de cajas ni bordes de color: una tarjeta = `Surface`; las filas se agrupan en `ListGroup`.
- El color de un módulo solo vive en su `IconTile` (tintes). Ninguna pantalla cambia el color de fondo.
- Un solo acento (`accent`) para la acción principal de cada pantalla.
- Mochi nunca se superpone al texto ni queda recortada: siempre con espacio reservado (fila flex).
- Todo lo pulsable usa `PressableScale` (o un componente que lo use): escala + vibración.

## Tipografía (`src/shared/theme/fonts.ts`, embebidas con el plugin `expo-font`)
| Clase | Fuente | Uso |
|---|---|---|
| `font-display` | Fredoka 600 | Títulos y cifras (`Display`, `Title`, `Stat`) |
| `font-body`, `font-body-bold`, `font-body-extrabold` | Nunito 600/700/800 | Texto (`Body`, `Strong`, `Caption`, `Eyebrow`) |
| `font-quote` | Fraunces itálica | La voz de Mochi (`MochiQuote`, `MochiBubble`) |

En Android `fontWeight` no elige el archivo de una fuente propia: usa la clase de familia, nunca `font-bold` con estas fuentes.

## Tokens (`global.css`; en hex para iconos/SVG en `src/shared/theme/tokens.ts`)
| Clase | Uso |
|---|---|
| `bg-canvas` (#FBF6EF) | Fondo de todas las pantallas |
| `bg-surface` / `bg-surface-muted` | Tarjetas / zonas hundidas (campos, notas) |
| `text-ink` / `text-ink-muted` / `text-ink-faint` | Texto principal / secundario / marcadores |
| `bg-line` | Separadores finos (no bordes de tarjeta) |
| `bg-accent`, `text-accent-strong`, `bg-accent-soft` | Acción principal, enlaces, acento suave |
| `bg-tint-{study,me,kitchen,duo,ok}` + `-ink` | Solo fondos e iconos de `IconTile` |
| `rounded-card` (26) / `rounded-control` (18) / `rounded-tile` (14) | Radios |

Elevación (`src/shared/ui/elevation.ts`): `ELEVATION[0..3]` con `boxShadow` marrón cálido; `ACCENT_GLOW` para el botón principal.

## Componentes (`src/shared/ui/`)
`Screen` (andamio con título grande y espacio para la barra), `Surface`, `Card`, `ListGroup`/`ListRow`, `IconTile`,
`SectionHeader`, `Button` (primary · soft · outline · ghost · danger), `Chip` (con icono), `Input`, `Toggle`,
`ProgressRing`, `Stat`, `MochiBubble`, `Sheet`, `EmptyState`, `ErrorState`, `Skeleton`, tipografía
(`Display`, `Title`, `Body`, `Strong`, `Caption`, `Eyebrow`, `MochiQuote`) y `PressableScale`.

## Movimiento y vibración
- `motion.ts`: `EASE_OUT`, `DURATION` (150/250/400 ms), `SPRING`, `staggerDelay` (40 ms, máx. 6) y `REDUCE` en toda animación.
- `haptics.ts`: `selection` (pestañas, chips, interruptores), `light` (acción), `success` (completar), `warning` (destructivo). Nunca al desplazar.

## Freno a la deuda
- `pnpm lint` corre `scripts/ui-debt.mjs`: cuenta clases de color sueltas, hex, `tc()`, `TouchableOpacity` y
  llamadas a Supabase en `app/`, y falla si alguna sube. Tras migrar una pantalla: `node scripts/ui-debt.mjs --update`.
- Los archivos listados en `MIGRATED` (`eslint.config.js`) no pueden usar esos patrones. Añade cada pantalla al terminarla.

## Mochi
Mochi se dibuja en código con Skia (`src/shared/mochi/`), fiel al PNG original:
- `geometry.ts`: siluetas, colores y anclajes (lienzo 170 × 160).
- `expressions.ts`: 11 expresiones como combinación de ojos, cejas, boca, rubor y extra. Añadir una = una entrada.
- `useMochiRig.ts`: respira, parpadea, mira y reacciona (`tap`, `pop`, `jump`, `celebrate`, `nod`, `shy`). Con "reducir movimiento" solo parpadea.
- `MochiCanvas.tsx`: el lienzo; `ref.react()` y `ref.lookAt()`. Sobresale de su caja para animarse sin recortarse, sin cambiar el layout.
- `MochiCharacter` sigue siendo la fachada (usa la vectorial salvo `EXPO_PUBLIC_VECTOR_MOCHI=false`). Anima sola a partir de 100 pt.
- Regla: una sola Mochi animada por pantalla; las pequeñas con `animated={false}`.
- Galería para revisar el arte: `mochi://mochi-gallery`.

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
