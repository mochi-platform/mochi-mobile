import { tc } from "@/src/shared/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";

type DashboardHeaderProps = {
  greetingIcon: keyof typeof Ionicons.glyphMap;
  greetingText: string;
  today: string;
};

export function DashboardHeader({ greetingIcon, greetingText, today }: DashboardHeaderProps) {
  return (
    <View>
      <View className="flex-row items-center justify-between">
        <View>
          <View className="flex-row items-center">
            <Ionicons name={greetingIcon} size={18} color={tc("#1e40af")} />
            <Text className="ml-2 text-2xl font-extrabold text-blue-900 dark:text-blue-100">
              {greetingText}
            </Text>
          </View>
          <Text className="mt-1 text-sm font-semibold text-blue-700 dark:text-blue-300">
            {today}
          </Text>
        </View>
        <TouchableOpacity
          className="h-9 w-9 items-center justify-center rounded-full border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950"
          onPress={() => router.push("/profile")}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Ir al perfil"
        >
          <Ionicons name="person" size={16} color={tc("#1e40af")} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
