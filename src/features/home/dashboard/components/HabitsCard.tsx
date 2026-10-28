import { tc } from "@/src/shared/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";

type HabitsCardProps = {
  loading: boolean;
  habitCompletionProgress: number;
  onPress: () => void;
};

export function HabitsCard({ loading, habitCompletionProgress, onPress }: HabitsCardProps) {
  return (
    <TouchableOpacity
      className="mt-4 rounded-3xl border-2 border-purple-200 bg-white p-4 dark:border-purple-800 dark:bg-surface"
      onPress={onPress}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          <Ionicons name="leaf" size={18} color={tc("#7c3aed")} />
          <Text className="ml-2 text-base font-bold text-purple-900 dark:text-purple-100">
            Tus hábitos
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={tc("#7c3aed")} />
      </View>
      {loading ? (
        <Text className="mt-2 text-sm font-semibold text-purple-700 dark:text-purple-300">
          Cargando hábitos...
        </Text>
      ) : (
        <View className="mt-3 rounded-2xl border border-purple-100 bg-purple-50 px-3 py-3 dark:border-purple-900 dark:bg-purple-950">
          <View className="mb-2 flex-row items-center justify-between">
            <Text className="text-xs font-extrabold uppercase tracking-wide text-purple-500">
              Progreso de hoy
            </Text>
            <Text className="text-xs font-extrabold text-purple-700 dark:text-purple-300">
              {Math.round(habitCompletionProgress * 100)}%
            </Text>
          </View>
          <View className="h-2.5 overflow-hidden rounded-full bg-purple-100 dark:bg-purple-900">
            <View
              className="h-full rounded-full bg-purple-500"
              style={{ width: `${habitCompletionProgress * 100}%` }}
            />
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}
