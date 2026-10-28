/**
 * Feature flags de compilación. Se leen de variables EXPO_PUBLIC_* (se incrustan al compilar).
 *
 * DARK_MODE_ENABLED: apagado por defecto. Con `EXPO_PUBLIC_DARK_MODE=true` la app sigue el modo
 * oscuro del sistema; apagado, siempre se ve en claro. Para activarlo, cambiar también
 * `userInterfaceStyle` (app.config.js lo hace con la misma variable) y recompilar.
 */
export const DARK_MODE_ENABLED = process.env.EXPO_PUBLIC_DARK_MODE === "true";

/**
 * VECTOR_MOCHI_ENABLED: Mochi dibujada en código con Skia (respira, parpadea, reacciona al toque)
 * en lugar de los PNG. Con `EXPO_PUBLIC_VECTOR_MOCHI=false` vuelve a los PNG. Encendida por
 * defecto desde que se aprobaron las maquetas del Remaster (docs/remaster/).
 */
export const VECTOR_MOCHI_ENABLED = process.env.EXPO_PUBLIC_VECTOR_MOCHI !== "false";
