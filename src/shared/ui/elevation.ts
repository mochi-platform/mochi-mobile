import type { ViewStyle } from "react-native";

/**
 * Profundidad sin bordes: sombras cálidas (marrón de Mochi, alfa baja) con `boxShadow`
 * de la nueva arquitectura. 0 = plano, 1 = tarjeta, 2 = destacada, 3 = flotante (barra, hojas).
 */
export type Elevation = 0 | 1 | 2 | 3;

export const ELEVATION: Record<Elevation, ViewStyle> = {
  0: {},
  1: { boxShadow: "0 1px 2px rgba(90, 47, 47, 0.05), 0 4px 14px rgba(90, 47, 47, 0.05)" },
  2: { boxShadow: "0 1px 2px rgba(90, 47, 47, 0.06), 0 12px 32px rgba(90, 47, 47, 0.09)" },
  3: { boxShadow: "0 2px 6px rgba(90, 47, 47, 0.08), 0 18px 40px rgba(90, 47, 47, 0.14)" },
};

/** Sombra de color para la acción principal (botón acento). */
export const ACCENT_GLOW: ViewStyle = { boxShadow: "0 8px 20px rgba(163, 92, 138, 0.32)" };
