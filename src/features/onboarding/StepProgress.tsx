import { useEffect } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { EASE_OUT, REDUCE } from "@/src/shared/ui/motion";

type StepProgressProps = { index: number; total: number };

/** Barra de progreso continua: el relleno avanza con ease-out al cambiar de paso. */
export function StepProgress({ index, total }: StepProgressProps) {
  const fraction = (index + 1) / total;
  const width = useSharedValue(fraction);

  useEffect(() => {
    width.set(withTiming(fraction, { duration: 320, easing: EASE_OUT, reduceMotion: REDUCE }));
  }, [fraction, width]);

  // Hijo absoluto y sin contenido: animar `width` no vuelve a calcular el layout de nadie.
  const fillStyle = useAnimatedStyle(() => ({ width: `${width.get() * 100}%` }));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={`Paso ${index + 1} de ${total}`}
      accessibilityValue={{ min: 1, max: total, now: index + 1 }}
      className="h-2 flex-1 overflow-hidden rounded-full bg-accent-soft"
    >
      <Animated.View
        className="absolute bottom-0 left-0 top-0 rounded-full bg-accent"
        style={fillStyle}
      />
    </View>
  );
}
