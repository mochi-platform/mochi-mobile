import { COLORS } from "@/src/shared/theme/tokens";
import { toLocalISODate } from "@/src/shared/lib/dates";
import { Ionicons } from "@expo/vector-icons";
import { Text, View, ScrollView } from "react-native";
import { useExamSprintProgress } from "@/src/shared/hooks/useExamSprintProgress";
import type { ExamPrepSprint, ExamSprintMilestone } from "@mochi/supabase/types";
import { Caption, Stat, Strong, Surface } from "@/src/shared/ui";

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

  const average =
    progressEntries.reduce((sum, p) => sum + p.hours_studied, 0) / (completedDays || 1);
  return (
    <Surface className="p-4">
      <View className="flex-row items-center justify-between">
        <Strong>
          {completedDays} de {totalDays} días
        </Strong>
        <Caption>{Math.round((completedDays / totalDays) * 100)}%</Caption>
      </View>
      <View className="mt-2 h-2 overflow-hidden rounded-full bg-surface-muted">
        <View
          className="h-full rounded-full bg-positive"
          style={{ width: `${(completedDays / totalDays) * 100}%` }}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-4 mt-4">
        <View className="flex-row gap-2 px-4">
          {days.map((day) => (
            <View
              key={day.dayNumber}
              accessibilityLabel={`Día ${day.dayNumber}${day.completed ? ", completado" : ""}`}
              className={`h-12 w-12 items-center justify-center rounded-[14px] ${day.completed ? "bg-tint-ok" : "bg-surface-muted"}`}
            >
              {day.completed ? (
                <Ionicons name="checkmark" size={18} color={COLORS.positive} />
              ) : (
                <Text className="font-body-extrabold text-sm text-ink-muted">{day.dayNumber}</Text>
              )}
            </View>
          ))}
        </View>
      </ScrollView>

      <View className="mt-4 flex-row">
        <Stat className="flex-1" value={`${average.toFixed(1)}h`} label="promedio al día" />
        <Stat className="flex-1" value={`${sprint.daily_target_hours}h`} label="meta diaria" />
      </View>
    </Surface>
  );
}
