import type { ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { ELEVATION, type Elevation } from "./elevation";
import { PressableScale } from "./PressableScale";

type Tone = "surface" | "sunken";

type SurfaceProps = {
  children: ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
  /** 1 por defecto (tarjeta). Las zonas hundidas no llevan sombra. */
  elevation?: Elevation;
  tone?: Tone;
  /** Si se pasa, toda la superficie es pulsable (escala 0.98 y vibración ligera). */
  onPress?: () => void;
  accessibilityLabel?: string;
};

const TONE: Record<Tone, string> = {
  surface: "bg-surface rounded-card",
  sunken: "bg-surface-muted rounded-control",
};

/** Tarjeta sin borde: la profundidad viene de la sombra, no de un contorno. */
export function Surface({
  children,
  className = "",
  style,
  elevation = 1,
  tone = "surface",
  onPress,
  accessibilityLabel,
}: SurfaceProps) {
  const shadow = tone === "sunken" ? ELEVATION[0] : ELEVATION[elevation];
  // Un fondo propio en className reemplaza al del tono (el orden del string no decide en NativeWind).
  const toneClasses = /(^|\s)bg-/.test(className)
    ? TONE[tone].replace(/\bbg-[\w-]+/g, "").trim()
    : TONE[tone];
  const classes = `${toneClasses} ${className}`;
  if (onPress) {
    return (
      <PressableScale
        scaleTo={0.98}
        onPress={onPress}
        accessibilityLabel={accessibilityLabel}
        className={classes}
        style={[shadow, style]}
      >
        {children}
      </PressableScale>
    );
  }
  return (
    <View className={classes} style={[shadow, style]}>
      {children}
    </View>
  );
}
