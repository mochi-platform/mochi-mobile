import { Easing, ReduceMotion } from "react-native-reanimated";

/** Curvas del sistema de movimiento (ease-out fuerte para UI; nunca ease-in). */
export const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

/** Respuesta al toque: 100–150 ms y escala 0.97. */
export const PRESS_SCALE = 0.97;
export const PRESS_IN_MS = 100;
export const PRESS_OUT_MS = 150;

/** Con "reducir movimiento" activo, las animaciones de capa no se ejecutan. */
export const REDUCE = ReduceMotion.System;
