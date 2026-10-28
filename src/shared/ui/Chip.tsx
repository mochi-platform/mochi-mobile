import { Pressable, Text } from "react-native";
import Animated from "react-native-reanimated";
import { usePressScale } from "./usePressScale";

type ChipProps = { label: string; selected?: boolean; onPress?: () => void };

export function Chip({ label, selected = false, onPress }: ChipProps) {
  const press = usePressScale();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      disabled={!onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      onPress={onPress}
    >
      <Animated.View
        style={press.style}
        className={`min-h-[44px] justify-center rounded-full border px-4 ${selected ? "border-accent bg-accent" : "border-line bg-surface-muted"}`}
      >
        <Text className={`text-xs font-extrabold ${selected ? "text-accent-ink" : "text-ink"}`}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}
