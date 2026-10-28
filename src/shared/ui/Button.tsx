import { ActivityIndicator, Pressable, Text } from "react-native";
import Animated from "react-native-reanimated";
import { COLORS } from "@/src/shared/theme/tokens";
import { ACCENT_GLOW } from "./elevation";
import { haptic } from "./haptics";
import { usePressScale } from "./usePressScale";

type Variant = "primary" | "soft" | "outline" | "ghost" | "danger";

const container: Record<Variant, string> = {
  primary: "bg-accent",
  soft: "bg-accent-soft",
  outline: "border-[1.5px] border-ink-faint/50 bg-surface",
  ghost: "",
  danger: "bg-danger",
};
const label: Record<Variant, string> = {
  primary: "text-accent-ink",
  soft: "text-accent-strong",
  outline: "text-ink",
  ghost: "text-accent-strong",
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
      onPress={() => {
        haptic(variant === "danger" ? "warning" : "light");
        onPress();
      }}
    >
      <Animated.View
        style={[variant === "primary" && !inactive ? ACCENT_GLOW : null, press.style]}
        className={`min-h-[54px] items-center justify-center rounded-control px-5 ${container[variant]} ${inactive ? "opacity-60" : ""}`}
      >
        {loading ? (
          <ActivityIndicator
            color={
              variant === "primary" || variant === "danger" ? COLORS.accentInk : COLORS.accentStrong
            }
          />
        ) : (
          <Text className={`font-body-extrabold text-[16.5px] ${label[variant]}`}>{title}</Text>
        )}
      </Animated.View>
    </Pressable>
  );
}
