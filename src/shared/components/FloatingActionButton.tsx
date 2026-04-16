import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity, View } from "react-native";

type FloatingActionButtonProps = {
  onPress: () => void;
  containerClassName: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  showSparkles?: boolean;
  accessibilityLabel: string;
};

export function FloatingActionButton({
  onPress,
  containerClassName,
  iconName = "add",
  showSparkles = false,
  accessibilityLabel,
}: FloatingActionButtonProps) {
  return (
    <TouchableOpacity
      className={`absolute bottom-8 right-6 z-20 h-14 w-14 items-center justify-center rounded-full border-4 border-white ${containerClassName}`}
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
