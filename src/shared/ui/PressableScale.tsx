import type { ReactNode } from "react";
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
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
    <Pressable
      accessibilityRole={accessibilityRole}
      {...rest}
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
      <Animated.View className={className} style={[style, press.style]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
