import { Ionicons } from "@expo/vector-icons";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Bar,
  CartesianChart,
  Line,
} from "victory-native";
import { useSession } from "@/src/core/providers/SessionContext";
import { MochiCharacter } from "@/src/shared/components/MochiCharacter";
import { supabase } from "@/src/shared/lib/supabase";

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
  return date.toISOString().slice(0, 10);
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
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>(
    createEmptyAnalyticsData,
  );

  const chartWidth = useMemo(
    () => Math.max(320, Dimensions.get("window").width - 48),
    [],
  );

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
        (studySessionsRes.data as
          | Array<{ duration_seconds: number; completed_at: string }>
          | null) ?? [];

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

      const habitRows =
        (habitLogsRes.data as Array<{ log_date: string }> | null) ?? [];

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
      (
        (studyActivityRes.data as Array<{ completed_at: string }> | null) ?? []
      ).forEach((row) => {
        activeDays.add(row.completed_at.slice(0, 10));
      });
      (
        (routineActivityRes.data as Array<{ completed_at: string }> | null) ?? []
      ).forEach((row) => {
        activeDays.add(row.completed_at.slice(0, 10));
      });
      ((habitActivityRes.data as Array<{ log_date: string }> | null) ?? []).forEach(
        (row) => {
          activeDays.add(row.log_date);
        },
      );
      (
        (gratitudeActivityRes.data as Array<{ logged_date: string }> | null) ?? []
      ).forEach((row) => {
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
      setError(
        err instanceof Error
          ? err.message
          : "No se pudieron cargar tus analiticas",
      );
    } finally {
      setLoading(false);
    }
  }, [session?.user.id]);

  useFocusEffect(
    useCallback(() => {
      void loadAnalytics();
    }, [loadAnalytics]),
  );

  const totalWeeklyHours = useMemo(
    () =>
      analyticsData.weeklyStudy.reduce((sum, point) => sum + point.hours, 0),
    [analyticsData.weeklyStudy],
  );

  const weeklyChartData = useMemo(
    () =>
      analyticsData.weeklyStudy.map((point, index) => ({
        x: index + 1,
        label: point.label,
        hours: point.hours,
      })),
    [analyticsData.weeklyStudy],
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
      <SafeAreaView className="flex-1 items-center justify-center bg-sky-50">
        <ActivityIndicator size="small" color="#0369a1" />
        <Text className="mt-3 text-sm font-semibold text-sky-700">
          Cargando analiticas...
        </Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-sky-50 px-6">
        <MochiCharacter mood="sleepy" size={78} />
        <Text className="mt-4 text-center text-sm font-semibold text-red-600">
          {error}
        </Text>
        <TouchableOpacity
          className="mt-6 rounded-2xl bg-sky-600 px-6 py-3"
          onPress={() => {
            void loadAnalytics();
          }}
        >
          <Text className="font-extrabold text-white">Reintentar</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-sky-50">
      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
        <TouchableOpacity
          className="mt-4 flex-row items-center"
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={22} color="#0369a1" />
          <Text className="ml-1 font-bold text-sky-800">Volver</Text>
        </TouchableOpacity>

        <View className="mt-6 rounded-3xl border-2 border-sky-200 bg-white p-5">
          <Text className="text-2xl font-extrabold text-sky-900">
            Analiticas personales
          </Text>
          <Text className="mt-1 text-sm font-semibold text-sky-700">
            Visualiza tu avance real y ajusta tu plan semanal.
          </Text>

          <View className="mt-4 flex-row gap-3">
            <View className="flex-1 rounded-2xl bg-sky-100 px-3 py-3">
              <Text className="text-xs font-bold uppercase text-sky-700">
                Horas (8 sem)
              </Text>
              <Text className="mt-1 text-xl font-extrabold text-sky-900">
                {totalWeeklyHours.toFixed(1)}h
              </Text>
            </View>
            <View className="flex-1 rounded-2xl bg-indigo-100 px-3 py-3">
              <Text className="text-xs font-bold uppercase text-indigo-700">
                Racha actual
              </Text>
              <Text className="mt-1 text-xl font-extrabold text-indigo-900">
                {analyticsData.currentStreak} dias
              </Text>
            </View>
          </View>
        </View>

        <View className="mt-4 rounded-3xl border-2 border-sky-200 bg-white p-4">
          <Text className="text-base font-extrabold text-sky-900">
            Horas de estudio por semana
          </Text>
          {weeklyChartData.length === 0 ? (
            <Text className="mt-2 text-xs font-semibold text-sky-700">
              Aun no hay datos de estudio para mostrar.
            </Text>
          ) : (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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
                        color="#0284c7"
                        roundedCorners={{ topLeft: 6, topRight: 6 }}
                      />
                    )}
                  </CartesianChart>
                </View>
              </ScrollView>
              <View className="mt-2 flex-row justify-between px-1">
                {weeklyChartData.map((point) => (
                  <Text key={`week-label-${point.x}`} className="text-[10px] font-bold text-sky-700">
                    {point.label}
                  </Text>
                ))}
              </View>
            </>
          )}
        </View>

        <View className="mt-4 rounded-3xl border-2 border-emerald-200 bg-white p-4">
          <Text className="text-base font-extrabold text-emerald-900">
            Habitos completados por mes
          </Text>
          {monthlyChartData.length === 0 ? (
            <Text className="mt-2 text-xs font-semibold text-emerald-700">
              Aun no hay registros de habitos para mostrar.
            </Text>
          ) : (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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
                        color="#10b981"
                        roundedCorners={{ topLeft: 6, topRight: 6 }}
                      />
                    )}
                  </CartesianChart>
                </View>
              </ScrollView>
              <View className="mt-2 flex-row justify-between px-2">
                {monthlyChartData.map((point) => (
                  <Text key={`month-label-${point.x}`} className="text-[10px] font-bold text-emerald-700">
                    {point.label}
                  </Text>
                ))}
              </View>
            </>
          )}
        </View>

        <View className="mb-8 mt-4 rounded-3xl border-2 border-violet-200 bg-white p-4">
          <Text className="text-base font-extrabold text-violet-900">
            Evolucion de racha (30 dias)
          </Text>
          {streakChartData.length === 0 ? (
            <Text className="mt-2 text-xs font-semibold text-violet-700">
              Aun no hay actividad suficiente para ver la evolucion de racha.
            </Text>
          ) : (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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
                        color="#8b5cf6"
                        strokeWidth={2.6}
                        curveType="monotoneX"
                      />
                    )}
                  </CartesianChart>
                </View>
              </ScrollView>
              <View className="mt-2 flex-row items-center justify-between px-1">
                <Text className="text-[10px] font-bold text-violet-700">
                  {streakChartData[0]?.label ?? ""}
                </Text>
                <Text className="text-[10px] font-bold text-violet-700">
                  {streakChartData[Math.floor(streakChartData.length / 2)]?.label ?? ""}
                </Text>
                <Text className="text-[10px] font-bold text-violet-700">
                  {streakChartData[streakChartData.length - 1]?.label ?? ""}
                </Text>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default AnalyticsScreen;
