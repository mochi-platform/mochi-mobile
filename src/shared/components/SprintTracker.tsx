import { COLORS } from "@/src/shared/theme/tokens";
import { toLocalISODate } from "@/src/shared/lib/dates";
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
      <View className="rounded-2xl bg-surface p-4">
        <Text className="text-center text-sm text-ink-muted">Cargando progreso...</Text>
      </View>
    );
  }

  // Calculate total days in sprint
  const startDate = new Date(sprint.start_date);
  const endDate = new Date(sprint.end_date);
  const totalDays = Math.max(
    1,
    Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1,
  );

  // Calculate completed days
  const completedDays = progressEntries.filter((p) => p.is_day_completed).length;

  // Generate array of days
  const days = Array.from({ length: totalDays }, (_, i) => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateStr = toLocalISODate(date);

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
    <View className="rounded-2xl bg-surface p-4">
      {/* Header */}
      <View className="mb-4">
        <View className="mb-2 flex-row items-center justify-between">
          <Text className="text-base font-bold text-ink">
            Progreso: {completedDays}/{totalDays} días
          </Text>
        </View>

        {/* Progress Bar */}
        <View className="h-2 overflow-hidden rounded-full bg-surface-muted">
          <View
            className="h-full bg-positive"
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
              className={`h-12 w-12 items-center justify-center rounded-lg border-2 ${
                day.completed ? "bg-tint-ok" : "bg-surface-muted"
              }`}
            >
              <Text className="text-center text-xs font-semibold">{day.dayNumber}</Text>
              {day.completed && <Ionicons name="checkmark" size={16} color={COLORS.positive} />}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Stats */}
      <View className="mt-4 pt-3">
        <View className="flex-row justify-between">
          <View>
            <Text className="text-xs text-ink">Horas promedio</Text>
            <Text className="text-sm font-bold text-ink">
              {(
                progressEntries.reduce((sum, p) => sum + p.hours_studied, 0) / (completedDays || 1)
              ).toFixed(1)}
              h
            </Text>
          </View>
          <View>
            <Text className="text-xs text-ink">Meta diaria</Text>
            <Text className="text-sm font-bold text-ink">{sprint.daily_target_hours}h</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
