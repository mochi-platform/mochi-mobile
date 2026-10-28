import { tc } from "@/src/shared/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { AnimatedDashboardCard } from "@/src/features/home/dashboard/AnimatedDashboardCard";
import type { WeeklySummary } from "@/src/features/home/dashboard/types";
import { getMoodDisplay } from "@/src/features/home/dashboard/helpers";

type WeeklySummaryCardProps = {
  animationSeed: number;
  weeklySummary: WeeklySummary;
  currentWeekDays: string[];
  weeklyHabitProgress: number;
};

export function WeeklySummaryCard({
  animationSeed,
  weeklySummary,
  currentWeekDays,
  weeklyHabitProgress,
}: WeeklySummaryCardProps) {
  return (
    <AnimatedDashboardCard
      delay={240}
      animationSeed={animationSeed}
      className="mt-4 rounded-3xl border-2 border-purple-200 bg-white p-5 dark:border-purple-800 dark:bg-surface"
    >
      <View className="mb-3 flex-row items-center">
        <Ionicons name="stats-chart" size={18} color={tc("#6d28d9")} />
        <Text className="ml-2 text-base font-bold text-purple-900 dark:text-purple-100">
          Esta semana
        </Text>
      </View>

      <View className="mb-2">
        <View className="mb-2 flex-row">
          <View className="mr-2 flex-1 flex-row items-center rounded-2xl bg-purple-50 px-3 py-2 dark:bg-purple-950">
            <Ionicons name="book" size={14} color={tc("#7c3aed")} />
            <Text className="ml-1 flex-1 text-xs font-bold text-purple-900 dark:text-purple-100">
              {weeklySummary.studySessions} sesiones
            </Text>
          </View>
          <View className="ml-2 flex-1 flex-row items-center rounded-2xl bg-pink-50 px-3 py-2 dark:bg-pink-950">
            <Ionicons name="flame" size={14} color={tc("#be185d")} />
            <Text className="ml-1 flex-1 text-xs font-bold text-pink-900 dark:text-pink-100">
              {weeklySummary.currentStreak} días
            </Text>
          </View>
        </View>

        <View className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 dark:border-slate-800 dark:bg-slate-950">
          <View className="mb-2 flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Ionicons name="happy" size={14} color={tc("#475569")} />
              <Text className="ml-1 text-xs font-bold text-slate-800 dark:text-slate-200">
                Ánimo semanal
              </Text>
            </View>
          </View>

          <View className="flex-row">
            {currentWeekDays.map((day, index) => {
              const moodDisplay = getMoodDisplay(weeklySummary.moodDots[index]);

              return (
                <View
                  key={day}
                  className={`mx-0.5 flex-1 items-center rounded-2xl px-1.5 py-2 ${moodDisplay.cardClass}`}
                >
                  <Ionicons
                    name={moodDisplay.icon}
                    size={18}
                    color={moodDisplay.iconColor}
                    style={{ marginTop: 4 }}
                  />
                </View>
              );
            })}
          </View>
        </View>

        <View className="mt-2 rounded-2xl border border-green-100 bg-green-50 px-3 py-3 dark:border-green-900 dark:bg-green-950">
          <View className="mb-2 flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Ionicons name="leaf" size={14} color={tc("#15803d")} />
              <Text className="ml-1 text-xs font-bold text-green-900 dark:text-green-100">
                Hábitos de la semana
              </Text>
            </View>
            <Text className="text-xs font-extrabold text-green-700 dark:text-green-300">
              {Math.round(weeklyHabitProgress * 100)}%
            </Text>
          </View>
          <View className="h-2.5 overflow-hidden rounded-full bg-green-100 dark:bg-green-900">
            <View
              className="h-full rounded-full bg-green-500"
              style={{ width: `${weeklyHabitProgress * 100}%` }}
            />
          </View>
        </View>

        <View className="mt-2 flex-row">
          <View className="flex-1 flex-row items-center rounded-2xl bg-yellow-50 px-3 py-2 dark:bg-yellow-950">
            <Ionicons name="star" size={14} color={tc("#a16207")} />
            <Text className="ml-1 flex-1 text-xs font-bold text-yellow-900 dark:text-yellow-100">
              {weeklySummary.pointsGained} puntos
            </Text>
          </View>
        </View>
      </View>
    </AnimatedDashboardCard>
  );
}
