import { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { EASE_OUT, PRESS_IN_MS, PRESS_OUT_MS, PRESS_SCALE, REDUCE } from "./motion";

/** Escala al presionar: baja en onPressIn y vuelve en onPressOut. Corre en el hilo de UI. */
export function usePressScale(scaleTo: number = PRESS_SCALE) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  return {
    style,
    onPressIn: () => {
      scale.set(
        withTiming(scaleTo, { duration: PRESS_IN_MS, easing: EASE_OUT, reduceMotion: REDUCE }),
      );
    },
    onPressOut: () => {
      scale.set(withTiming(1, { duration: PRESS_OUT_MS, easing: EASE_OUT, reduceMotion: REDUCE }));
    },
  };
}
