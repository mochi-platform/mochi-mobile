import { tc } from "@/src/shared/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getFabBottomOffset } from "@/src/shared/lib/layout";

type FloatingActionButtonProps = {
  onPress: () => void;
  containerClassName: string;
  borderClassName?: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  showSparkles?: boolean;
  accessibilityLabel: string;
  bottomOffset?: number;
};

const fabBorderColorMap: Record<string, string> = {
  "border-teal-300 dark:border-teal-700": tc("#5eead4"),
  "border-pink-300 dark:border-pink-700": tc("#f9a8d4"),
  "border-orange-300 dark:border-orange-700": tc("#fdba74"),
  "border-purple-300 dark:border-purple-700": tc("#d8b4fe"),
  "border-yellow-300 dark:border-yellow-700": tc("#fde047"),
  "border-slate-300 dark:border-slate-700": tc("#cbd5e1"),
};

export function FloatingActionButton({
  onPress,
  containerClassName,
  borderClassName = "border-slate-300 dark:border-slate-700",
  iconName = "add",
  showSparkles = false,
  accessibilityLabel,
  bottomOffset = 0,
}: FloatingActionButtonProps) {
  const insets = useSafeAreaInsets();
  const borderColor = fabBorderColorMap[borderClassName] ?? tc("#cbd5e1");

  return (
    <TouchableOpacity
      className={`absolute right-5 z-20 h-14 w-14 items-center justify-center rounded-full border-4 ${borderClassName} ${containerClassName}`}
      style={{
        bottom: getFabBottomOffset(insets.bottom) + bottomOffset,
        borderColor,
      }}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      {showSparkles ? (
        <View className="absolute inset-0 items-center justify-center">
          <Ionicons name="sparkles" size={18} color="white" />
        </View>
      ) : (
        <Ionicons name={iconName} size={26} color="white" />
      )}
    </TouchableOpacity>
  );
}
