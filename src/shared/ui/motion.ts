import { Easing, ReduceMotion } from "react-native-reanimated";

/** Curvas del sistema de movimiento (ease-out fuerte para UI; nunca ease-in). */
export const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

/** Respuesta al toque: 100–150 ms y escala 0.97. */
export const PRESS_SCALE = 0.97;
export const PRESS_IN_MS = 100;
export const PRESS_OUT_MS = 150;

/** Con "reducir movimiento" activo, las animaciones de capa no se ejecutan. */
export const REDUCE = ReduceMotion.System;

/** Duraciones estándar (ms). */
export const DURATION = { fast: 150, base: 250, slow: 400 } as const;

/** Resorte común: asienta rápido, sin rebote exagerado. */
export const SPRING = { damping: 18, stiffness: 220, mass: 1 } as const;

/** Entradas escalonadas: 40 ms entre elementos, como máximo 6 animados (el resto entra sin retraso). */
export const STAGGER_MS = 40;
export const STAGGER_MAX = 6;
export function staggerDelay(index: number): number {
  return Math.min(index, STAGGER_MAX) * STAGGER_MS;
}
