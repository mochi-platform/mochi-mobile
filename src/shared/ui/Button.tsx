import { ActivityIndicator, Pressable, Text } from "react-native";
import Animated from "react-native-reanimated";
import { usePressScale } from "./usePressScale";

type Variant = "primary" | "soft" | "outline" | "danger";

const container: Record<Variant, string> = {
  primary: "bg-accent",
  soft: "bg-accent-soft",
  outline: "border-2 border-line bg-surface",
  danger: "bg-danger",
};
const label: Record<Variant, string> = {
  primary: "text-accent-ink",
  soft: "text-ink",
  outline: "text-ink",
  danger: "text-white",
};

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
};

export function Button({
  title,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  accessibilityLabel,
}: ButtonProps) {
  const inactive = disabled || loading;
  const press = usePressScale();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      onPress={onPress}
    >
      <Animated.View
        style={press.style}
        className={`min-h-[48px] items-center justify-center rounded-control px-5 ${container[variant]} ${inactive ? "opacity-60" : ""}`}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text className={`text-base font-extrabold ${label[variant]}`}>{title}</Text>
        )}
      </Animated.View>
    </Pressable>
  );
}
