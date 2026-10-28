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
 * Clases que definen la caja exterior (cuánto ocupa y dónde está): van al Pressable.
 * El resto (fondo, bordes, relleno, alineación de los hijos) va a la vista animada de adentro,
 * que llena esa caja. Es el mismo patrón que Button, verificado en el teléfono: un
 * Animated.createAnimatedComponent(Pressable) con cssInterop no aplicaba ninguna clase.
 */
const OUTER =
  /^-?(m|mx|my|mt|mb|ml|mr|ms|me)-|^(flex-1|flex-auto|flex-initial|flex-none|grow|grow-0|shrink|shrink-0|basis-.+)$|^self-|^(w|h|min-w|min-h|max-w|max-h|size)-|^(absolute|relative)$|^-?(inset|inset-x|inset-y|top|left|right|bottom|start|end)-|^z-/;

export function splitPressableClasses(className: string): { outer: string; inner: string } {
  const outer: string[] = [];
  const inner: string[] = [];
  for (const token of className.split(/\s+/).filter(Boolean)) {
    (OUTER.test(token) ? outer : inner).push(token);
  }
  return { outer: outer.join(" "), inner: inner.join(" ") };
}

const FILL: ViewStyle = { flexGrow: 1 };
/** Solo si la caja exterior tiene tamaño propio la vista de adentro crece para llenarla;
 * con alto automático, flexGrow hacía que un botón se estirara a toda la pantalla (Cocina). */
const SIZED = /(^|\s)(-?(h|min-h|size)-|flex-1|grow|basis-|absolute|inset)/;

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
  const { outer, inner } = splitPressableClasses(className);
  return (
    <Pressable
      accessibilityRole={accessibilityRole}
      {...rest}
      className={outer}
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
      <Animated.View className={inner} style={[SIZED.test(outer) ? FILL : null, style, press.style]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
