import type { ReactNode } from "react";
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import { cssInterop } from "nativewind";
import Animated from "react-native-reanimated";
import { haptic, type HapticKind } from "./haptics";
import { usePressScale } from "./usePressScale";

type PressableScaleProps = Omit<PressableProps, "children" | "style"> & {
  children: ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
  /** Vibración al pulsar; `false` para ninguna. */
  haptics?: HapticKind | false;
  /** Escala al presionar (0.97 por defecto; 0.98 para superficies grandes). */
  scaleTo?: number;
};

/** Un solo elemento: así `className` (flex-1, márgenes, w-1/2) afecta al área pulsable y al layout. */
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
cssInterop(AnimatedPressable, { className: "style" });

/**
 * Base de todo lo pulsable: escala en el hilo de UI y vibración opcional.
 * Reemplaza a TouchableOpacity en pantallas nuevas.
 */
export function PressableScale({
  children,
  className = "",
  style,
  haptics = "light",
  scaleTo,
  onPress,
  onPressIn,
  onPressOut,
  accessibilityRole = "button",
  ...rest
}: PressableScaleProps) {
  const press = usePressScale(scaleTo);
  return (
    <AnimatedPressable
      accessibilityRole={accessibilityRole}
      {...rest}
      className={className}
      style={[style, press.style]}
      onPressIn={(event) => {
        press.onPressIn();
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        press.onPressOut();
        onPressOut?.(event);
      }}
      onPress={
        onPress
          ? (event) => {
              if (haptics) haptic(haptics);
              onPress(event);
            }
          : undefined
      }
    >
      {children}
    </AnimatedPressable>
  );
}
