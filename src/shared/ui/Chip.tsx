import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text } from "react-native";
import { COLORS } from "@/src/shared/theme/tokens";
import { ELEVATION } from "./elevation";
import { haptic } from "./haptics";
import Animated from "react-native-reanimated";
import { usePressScale } from "./usePressScale";

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Dentro de una tarjeta blanca: fondo hundido en vez de sombra, para que se distinga. */
  onSurface?: boolean;
};

export function Chip({ label, selected = false, onPress, icon, onSurface = false }: ChipProps) {
  const press = usePressScale();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      disabled={!onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      onPress={
        onPress
          ? () => {
              haptic("selection");
              onPress();
            }
          : undefined
      }
    >
      <Animated.View
        style={[selected || onSurface ? null : ELEVATION[1], press.style]}
        className={`min-h-[44px] flex-row items-center gap-2 rounded-2xl px-4 ${selected ? "bg-accent" : onSurface ? "bg-surface-muted" : "bg-surface"}`}
      >
        {icon ? (
          <Ionicons name={icon} size={17} color={selected ? COLORS.accentInk : COLORS.accent} />
        ) : null}
        <Text className={`font-body-extrabold text-[14.5px] ${selected ? "text-accent-ink" : "text-ink"}`}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}
