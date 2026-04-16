import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type FloatingActionButtonProps = {
  onPress: () => void;
  containerClassName: string;
  borderClassName?: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  showSparkles?: boolean;
  accessibilityLabel: string;
};

const fabBorderColorMap: Record<string, string> = {
  "border-teal-300": "#5eead4",
  "border-pink-300": "#f9a8d4",
  "border-orange-300": "#fdba74",
  "border-purple-300": "#d8b4fe",
  "border-yellow-300": "#fde047",
  "border-slate-300": "#cbd5e1",
};

export function FloatingActionButton({
  onPress,
  containerClassName,
  borderClassName = "border-slate-300",
  iconName = "add",
  showSparkles = false,
  accessibilityLabel,
}: FloatingActionButtonProps) {
  const insets = useSafeAreaInsets();
  const borderColor = fabBorderColorMap[borderClassName] ?? "#cbd5e1";

  return (
    <TouchableOpacity
      className={`absolute right-6 z-20 h-14 w-14 items-center justify-center rounded-full border-4 ${borderClassName} ${containerClassName}`}
      style={{ bottom: insets.bottom + 98, borderColor }}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Ionicons name={iconName} size={26} color="white" />
      {showSparkles ? (
        <View className="absolute -right-1 -top-1 h-6 w-6 items-center justify-center rounded-full border border-orange-200 bg-orange-100">
          <Ionicons name="sparkles" size={12} color="#c2410c" />
        </View>
      ) : null}
    </TouchableOpacity>
  );
}
