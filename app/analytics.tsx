import { COLORS } from "@/src/shared/theme/tokens";
import { EnergyStudyCorrelationCard } from "@/src/features/analytics/components/EnergyStudyCorrelationCard";
import { usePlan } from "@/src/shared/hooks/usePlan";
import { toLocalISODate } from "@/src/shared/lib/dates";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useMemo, useState } from "react";
import { Dimensions, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Bar, CartesianChart, Line } from "victory-native";
import { useSession } from "@/src/core/providers/SessionContext";
import { supabase } from "@/src/shared/lib/supabase";
import {
  Caption,
  ErrorState,
  PressableScale,
  Screen,
  SectionHeader,
  Skeleton,
  Stat,
  Surface,
} from "@/src/shared/ui";

type WeeklyStudyPoint = {
  weekKey: string;
  label: string;
  hours: number;
};

type MonthlyHabitPoint = {
  monthKey: string;
  label: string;
  completed: number;
};

type StreakPoint = {
  dateKey: string;
  label: string;
  streak: number;
};

type AnalyticsData = {
  weeklyStudy: WeeklyStudyPoint[];
  monthlyHabits: MonthlyHabitPoint[];
  streakEvolution: StreakPoint[];
  currentStreak: number;
};

function createEmptyAnalyticsData(): AnalyticsData {
  return {
    weeklyStudy: [],
    monthlyHabits: [],
    streakEvolution: [],
    currentStreak: 0,
  };
}

function toISODate(date: Date): string {
  return toLocalISODate(date);
}

function getMonday(date: Date): Date {
  const monday = new Date(date);
  const day = monday.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  monday.setDate(monday.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function formatWeekLabel(dateISO: string): string {
  const date = new Date(`${dateISO}T00:00:00`);
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
  })
    .format(date)
    .replace(".", "");
}

function formatMonthLabel(dateISO: string): string {
  const date = new Date(`${dateISO}T00:00:00`);
  return new Intl.DateTimeFormat("es-ES", {
    month: "short",
  })
    .format(date)
    .replace(".", "")
    .toUpperCase();
}

function getMonthStart(date: Date): Date {
  const monthStart = new Date(date);
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  return monthStart;
}

function buildStreakSeries(
  startDate: Date,
  totalDays: number,
  activeDays: Set<string>,
): StreakPoint[] {
  const points: StreakPoint[] = [];
  let rollingStreak = 0;

  for (let index = 0; index < totalDays; index += 1) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + index);

    const dateKey = toISODate(currentDate);
    if (activeDays.has(dateKey)) {
      rollingStreak += 1;
    } else {
      rollingStreak = 0;
    }

    points.push({
      dateKey,
      label: new Intl.DateTimeFormat("es-ES", {
        day: "2-digit",
        month: "2-digit",
      }).format(currentDate),
      streak: rollingStreak,
    });
  }

  return points;
}

export function AnalyticsScreen() {
  const { session } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>(createEmptyAnalyticsData);

  const chartWidth = useMemo(() => Math.max(280, Dimensions.get("window").width - 72), []);

  const loadAnalytics = useCallback(async () => {
    const userId = session?.user.id;

    if (!userId) {
      setAnalyticsData(createEmptyAnalyticsData());
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const now = new Date();
      const weekStart = getMonday(now);
      weekStart.setDate(weekStart.getDate() - 7 * 7);

      const monthStart = getMonthStart(now);
      monthStart.setMonth(monthStart.getMonth() - 5);

      const streakStart = new Date(now);
      streakStart.setDate(streakStart.getDate() - 29);
      streakStart.setHours(0, 0, 0, 0);

      const [
        studySessionsRes,
        habitLogsRes,
        streakRes,
        studyActivityRes,
        routineActivityRes,
        habitActivityRes,
        gratitudeActivityRes,
      ] = await Promise.all([
        supabase
          .from("study_sessions")
          .select("duration_seconds, completed_at")
          .eq("user_id", userId)
          .gte("completed_at", weekStart.toISOString()),
        supabase
          .from("habit_logs")
          .select("log_date")
          .eq("user_id", userId)
          .gte("log_date", toISODate(monthStart)),
        supabase
          .from("streaks")
          .select("current_streak")
          .eq("user_id", userId)
          .maybeSingle<{ current_streak: number }>(),
        supabase
          .from("study_sessions")
          .select("completed_at")
          .eq("user_id", userId)
          .gte("completed_at", streakStart.toISOString()),
        supabase
          .from("routine_logs")
          .select("completed_at")
          .eq("user_id", userId)
          .gte("completed_at", streakStart.toISOString()),
        supabase
          .from("habit_logs")
          .select("log_date")
          .eq("user_id", userId)
          .gte("log_date", toISODate(streakStart)),
        supabase
          .from("gratitude_logs")
          .select("logged_date")
          .eq("user_id", userId)
          .gte("logged_date", toISODate(streakStart)),
      ]);

      const baseError =
        studySessionsRes.error ??
        habitLogsRes.error ??
        streakRes.error ??
        studyActivityRes.error ??
        routineActivityRes.error ??
        habitActivityRes.error ??
        gratitudeActivityRes.error;

      if (baseError) {
        throw baseError;
      }

      const weeklyMap = new Map<string, number>();
      const weeklyOrder: string[] = [];

      for (let index = 0; index < 8; index += 1) {
        const currentMonday = new Date(weekStart);
        currentMonday.setDate(weekStart.getDate() + index * 7);
        const key = toISODate(currentMonday);
        weeklyMap.set(key, 0);
        weeklyOrder.push(key);
      }

      const studyRows =
        (studySessionsRes.data as { duration_seconds: number; completed_at: string }[] | null) ??
        [];

      studyRows.forEach((row) => {
        const completedDate = new Date(row.completed_at);
        const weekKey = toISODate(getMonday(completedDate));

        if (!weeklyMap.has(weekKey)) {
          return;
        }

        const current = weeklyMap.get(weekKey) ?? 0;
        weeklyMap.set(weekKey, current + row.duration_seconds / 3600);
      });

      const weeklyStudy = weeklyOrder.map((weekKey) => ({
        weekKey,
        label: formatWeekLabel(weekKey),
        hours: Number((weeklyMap.get(weekKey) ?? 0).toFixed(1)),
      }));

      const monthlyMap = new Map<string, number>();
      const monthlyOrder: string[] = [];

      for (let index = 0; index < 6; index += 1) {
        const currentMonth = new Date(monthStart);
        currentMonth.setMonth(monthStart.getMonth() + index);
        const key = toISODate(getMonthStart(currentMonth));
        monthlyMap.set(key, 0);
        monthlyOrder.push(key);
      }

      const habitRows = (habitLogsRes.data as { log_date: string }[] | null) ?? [];

      habitRows.forEach((row) => {
        const monthKey = `${row.log_date.slice(0, 7)}-01`;
        if (!monthlyMap.has(monthKey)) {
          return;
        }

        monthlyMap.set(monthKey, (monthlyMap.get(monthKey) ?? 0) + 1);
      });

      const monthlyHabits = monthlyOrder.map((monthKey) => ({
        monthKey,
        label: formatMonthLabel(monthKey),
        completed: monthlyMap.get(monthKey) ?? 0,
      }));

      const activeDays = new Set<string>();
      ((studyActivityRes.data as { completed_at: string }[] | null) ?? []).forEach((row) => {
        activeDays.add(row.completed_at.slice(0, 10));
      });
      ((routineActivityRes.data as { completed_at: string }[] | null) ?? []).forEach((row) => {
        activeDays.add(row.completed_at.slice(0, 10));
      });
      ((habitActivityRes.data as { log_date: string }[] | null) ?? []).forEach((row) => {
        activeDays.add(row.log_date);
      });
      ((gratitudeActivityRes.data as { logged_date: string }[] | null) ?? []).forEach((row) => {
        activeDays.add(row.logged_date);
      });

      const streakEvolution = buildStreakSeries(streakStart, 30, activeDays);

      setAnalyticsData({
        weeklyStudy,
        monthlyHabits,
        streakEvolution,
        currentStreak: streakRes.data?.current_streak ?? 0,
      });
    } catch (err) {
      setAnalyticsData(createEmptyAnalyticsData());
      setError(err instanceof Error ? err.message : "No se pudieron cargar tus analiticas");
    } finally {
      setLoading(false);
    }
  }, [session?.user.id]);

  useFocusEffect(
    useCallback(() => {
      void loadAnalytics();
    }, [loadAnalytics]),
  );

  const { plan } = usePlan();
  const visibleWeekly = useMemo(
    () =>
      plan.features.analytics_history
        ? analyticsData.weeklyStudy
        : analyticsData.weeklyStudy.slice(-1),
    [plan.features.analytics_history, analyticsData.weeklyStudy],
  );

  const totalWeeklyHours = useMemo(
    () => visibleWeekly.reduce((sum, point) => sum + point.hours, 0),
    [visibleWeekly],
  );

  const weeklyChartData = useMemo(
    () =>
      visibleWeekly.map((point, index) => ({
        x: index + 1,
        label: point.label,
        hours: point.hours,
      })),
    [visibleWeekly],
  );

  const monthlyChartData = useMemo(
    () =>
      analyticsData.monthlyHabits.map((point, index) => ({
        x: index + 1,
        label: point.label,
        completed: point.completed,
      })),
    [analyticsData.monthlyHabits],
  );

  const streakChartData = useMemo(
    () =>
      analyticsData.streakEvolution.map((point, index) => ({
        x: index + 1,
        label: point.label,
        streak: point.streak,
      })),
    [analyticsData.streakEvolution],
  );

  if (loading) {
    return (
      <Screen title="Tus avances" withTabBar={false} closable>
        <View className="mt-4 gap-3">
          <Skeleton height={110} className="rounded-card" />
          <Skeleton height={260} className="rounded-card" />
        </View>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen title="Tus avances" withTabBar={false} closable>
        <ErrorState message={error} onRetry={() => void loadAnalytics()} />
      </Screen>
    );
  }

  return (
    <Screen
      title="Tus avances"
      subtitle="Tu avance real, para ajustar tu semana."
      withTabBar={false}
      closable
    >
      <Surface elevation={2} className="mt-3 flex-row p-4">
        <Stat className="flex-1" value={`${totalWeeklyHours.toFixed(1)}h`} label="en 8 semanas" />
        <Stat
          className="flex-1"
          value={String(analyticsData.currentStreak)}
          label={analyticsData.currentStreak === 1 ? "día de racha" : "días de racha"}
        />
      </Surface>

      <EnergyStudyCorrelationCard allowed={plan.features.analytics_correlation} />

      <SectionHeader title="Horas por semana" />
      <Surface className="p-4">
        {!plan.features.analytics_history ? (
          <PressableScale
            onPress={() => router.push("/premium")}
            accessibilityLabel="Conoce Premium"
            className="mb-3 flex-row items-center gap-2.5 rounded-[16px] bg-accent-soft px-3.5 py-3"
          >
            <Ionicons name="sparkles" size={16} color={COLORS.accentStrong} />
            <Text className="flex-1 font-body-bold text-[13px] text-accent-strong">
              Con Premium ves las 8 semanas completas.
            </Text>
          </PressableScale>
        ) : null}
        {weeklyChartData.every((p) => p.hours === 0) ? (
          <Caption>Aún no hay horas de estudio para mostrar.</Caption>
        ) : (
          <>
            <View style={{ width: chartWidth, height: 230 }}>
              <CartesianChart
                data={weeklyChartData}
                xKey="x"
                yKeys={["hours"]}
                domainPadding={{ left: 18, right: 18, top: 24, bottom: 10 }}
                padding={{ left: 8, right: 8, top: 12, bottom: 12 }}
              >
                {({ points, chartBounds }) => (
                  <Bar
                    points={points.hours}
                    chartBounds={chartBounds}
                    color={COLORS.accent}
                    roundedCorners={{ topLeft: 6, topRight: 6 }}
                  />
                )}
              </CartesianChart>
            </View>
            <View className="mt-2 flex-row justify-between px-1">
              {weeklyChartData.map((point) => (
                <Caption key={`week-label-${point.x}`} className="text-[10.5px]">
                  {point.label}
                </Caption>
              ))}
            </View>
          </>
        )}
      </Surface>

      <SectionHeader title="Hábitos por mes" />
      <Surface className="p-4">
        {monthlyChartData.every((p) => p.completed === 0) ? (
          <Caption>Aún no hay hábitos registrados para mostrar.</Caption>
        ) : (
          <>
            <View style={{ width: chartWidth, height: 230 }}>
              <CartesianChart
                data={monthlyChartData}
                xKey="x"
                yKeys={["completed"]}
                domainPadding={{ left: 18, right: 18, top: 24, bottom: 10 }}
                padding={{ left: 8, right: 8, top: 12, bottom: 12 }}
              >
                {({ points, chartBounds }) => (
                  <Bar
                    points={points.completed}
                    chartBounds={chartBounds}
                    color={COLORS.positive}
                    roundedCorners={{ topLeft: 6, topRight: 6 }}
                  />
                )}
              </CartesianChart>
            </View>
            <View className="mt-2 flex-row justify-between px-2">
              {monthlyChartData.map((point) => (
                <Caption key={`month-label-${point.x}`} className="text-[10.5px]">
                  {point.label}
                </Caption>
              ))}
            </View>
          </>
        )}
      </Surface>

      <SectionHeader title="Tu racha, 30 días" />
      <Surface className="p-4">
        {streakChartData.every((p) => p.streak === 0) ? (
          <Caption>Aún no hay actividad suficiente para ver tu racha.</Caption>
        ) : (
          <>
            <View style={{ width: chartWidth, height: 240 }}>
              <CartesianChart
                data={streakChartData}
                xKey="x"
                yKeys={["streak"]}
                domainPadding={{ left: 12, right: 12, top: 24, bottom: 10 }}
                padding={{ left: 8, right: 8, top: 12, bottom: 12 }}
              >
                {({ points }) => (
                  <Line
                    points={points.streak}
                    color={COLORS.accent}
                    strokeWidth={2.6}
                    curveType="monotoneX"
                  />
                )}
              </CartesianChart>
            </View>
            <View className="mt-2 flex-row items-center justify-between px-1">
              <Caption className="text-[10.5px]">{streakChartData[0]?.label ?? ""}</Caption>
              <Caption className="text-[10.5px]">
                {streakChartData[Math.floor(streakChartData.length / 2)]?.label ?? ""}
              </Caption>
              <Caption className="text-[10.5px]">
                {streakChartData[streakChartData.length - 1]?.label ?? ""}
              </Caption>
            </View>
          </>
        )}
      </Surface>
    </Screen>
  );
}

export default AnalyticsScreen;
