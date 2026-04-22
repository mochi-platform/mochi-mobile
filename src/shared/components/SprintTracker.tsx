import { Ionicons } from "@expo/vector-icons";
import { Text, View, ScrollView, TouchableOpacity } from "react-native";
import { useExamSprintProgress } from "@/src/shared/hooks/useExamSprintProgress";
import type { ExamPrepSprint, ExamSprintMilestone } from "@mochi/supabase/types";

interface SprintTrackerProps {
  sprint: ExamPrepSprint & { milestones?: ExamSprintMilestone[] };
}

export function SprintTracker({ sprint }: SprintTrackerProps) {
  const { progressEntries, isLoading } = useExamSprintProgress(sprint.id);

  if (isLoading) {
    return (
      <View className="bg-white rounded-2xl p-4">
        <Text className="text-center text-slate-500 text-sm">
          Cargando progreso...
        </Text>
      </View>
    );
  }

  // Calculate total days in sprint
  const startDate = new Date(sprint.start_date);
  const endDate = new Date(sprint.end_date);
  const totalDays = Math.max(
    1,
    Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) +
      1,
  );

  // Calculate completed days
  const completedDays = progressEntries.filter(
    (p) => p.is_day_completed,
  ).length;

  // Generate array of days
  const days = Array.from({ length: totalDays }, (_, i) => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split("T")[0];

    const entry = progressEntries.find((p) => p.progress_date === dateStr);
    return {
      dayNumber: i + 1,
      date: dateStr,
      completed: entry?.is_day_completed ?? false,
      hoursStudied: entry?.hours_studied ?? 0,
      moodRating: entry?.mood_rating ?? null,
    };
  });

  return (
    <View className="bg-white rounded-2xl p-4 border border-purple-100">
      {/* Header */}
      <View className="mb-4">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="font-bold text-slate-800 text-base">
            Progreso: {completedDays}/{totalDays} días
          </Text>
        </View>

        {/* Progress Bar */}
        <View className="bg-slate-200 rounded-full h-2 overflow-hidden">
          <View
            className="bg-green-500 h-full"
            style={{ width: `${(completedDays / totalDays) * 100}%` }}
          />
        </View>
      </View>

      {/* Days Calendar Grid */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row gap-2">
          {days.map((day) => (
            <TouchableOpacity
              key={day.dayNumber}
              activeOpacity={0.85}
              className={`items-center justify-center rounded-lg w-12 h-12 border-2 ${
                day.completed
                  ? "bg-green-100 border-green-400"
                  : "bg-slate-50 border-slate-200"
              }`}
            >
              <Text className="font-semibold text-center text-xs">
                {day.dayNumber}
              </Text>
              {day.completed && (
                <Ionicons name="checkmark" size={16} color="#16a34a" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Stats */}
      <View className="border-t border-slate-200 mt-4 pt-3">
        <View className="flex-row justify-between">
          <View>
            <Text className="text-xs text-slate-600">Horas promedio</Text>
            <Text className="font-bold text-slate-800 text-sm">
              {(
                progressEntries.reduce((sum, p) => sum + p.hours_studied, 0) /
                (completedDays || 1)
              ).toFixed(1)}
              h
            </Text>
          </View>
          <View>
            <Text className="text-xs text-slate-600">Meta diaria</Text>
            <Text className="font-bold text-slate-800 text-sm">
              {sprint.daily_target_hours}h
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
