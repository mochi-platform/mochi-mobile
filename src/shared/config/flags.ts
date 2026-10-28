/**
 * Feature flags de compilación. Se leen de variables EXPO_PUBLIC_* (se incrustan al compilar).
 *
 * DARK_MODE_ENABLED: apagado por defecto. Con `EXPO_PUBLIC_DARK_MODE=true` la app sigue el modo
 * oscuro del sistema; apagado, siempre se ve en claro. Para activarlo, cambiar también
 * `userInterfaceStyle` (app.config.js lo hace con la misma variable) y recompilar.
 */
export const DARK_MODE_ENABLED = process.env.EXPO_PUBLIC_DARK_MODE === "true";
