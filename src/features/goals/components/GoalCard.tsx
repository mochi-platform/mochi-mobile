import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";
import type { Goal } from "@/src/shared/types/database";

type GoalCardProps = {
  goal: Goal;
  onPress: () => void;
};

const colorMap: Record<string, string> = {
  pink: "#f472b6",
  purple: "#a855f7",
  mint: "#34d399",
  blue: "#60a5fa",
  yellow: "#facc15",
};

function formatDate(value: string | null): string {
  if (!value) return "Sin fecha objetivo";

  const parsedDate = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsedDate.getTime())) return "Sin fecha objetivo";

  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
    .format(parsedDate)
    .replace(".", "");
}

export function GoalCard({ goal, onPress }: GoalCardProps) {
  const normalizedProgress = Math.max(
    0,
    Math.min(100, Math.round(goal.progress ?? 0)),
  );
  const accentColor = colorMap[goal.color ?? ""] ?? "#a855f7";

  return (
    <TouchableOpacity
      className="mb-3 rounded-3xl border border-purple-200 bg-white p-4"
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View className="flex-row items-center justify-between">
        <Text className="flex-1 pr-3 text-base font-extrabold text-purple-900">
          {goal.title}
        </Text>
        {goal.is_completed ? (
          <View className="rounded-full bg-green-100 px-3 py-1">
            <Text className="text-xs font-bold text-green-700">Completada</Text>
          </View>
        ) : (
          <View className="rounded-full bg-purple-100 p-2">
            <Ionicons name="create" size={14} color="#7c3aed" />
          </View>
        )}
      </View>

      {goal.description ? (
        <Text
          className="mt-2 text-sm font-semibold text-slate-600"
          numberOfLines={2}
        >
          {goal.description}
        </Text>
      ) : (
        <Text className="mt-2 text-sm font-semibold text-slate-400">
          Sin descripción
        </Text>
      )}

      <View className="mt-4">
        <View className="mb-1 flex-row items-center justify-between">
          <Text className="text-xs font-bold uppercase tracking-wide text-purple-600">
            Progreso
          </Text>
          <Text className="text-xs font-extrabold text-purple-800">
            {normalizedProgress}%
          </Text>
        </View>
        <View className="h-3 rounded-full bg-purple-100">
          <View
            className="h-3 rounded-full"
            style={{
              width: `${normalizedProgress}%`,
              backgroundColor: accentColor,
            }}
          />
        </View>
      </View>

      <View className="mt-4 flex-row items-center justify-between">
        <Text className="text-xs font-semibold text-purple-600">
          Objetivo: {formatDate(goal.target_date)}
        </Text>
        <View
          className="h-3 w-3 rounded-full"
          style={{ backgroundColor: accentColor }}
        />
      </View>
    </TouchableOpacity>
  );
}

export default GoalCard;
