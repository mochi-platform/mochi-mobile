import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { supabase } from "@/src/shared/lib/supabase";
import { useSession } from "@/src/core/providers/SessionContext";
import { useCycle } from "@/src/core/providers/CycleContext";
import type {
  StudyBlock,
  RoutineWithExercises,
  Recipe,
} from "@/src/shared/types/database";
import { MochiCharacter } from "@/src/shared/components/MochiCharacter";
import { DailyMotivation } from "@/src/features/home/components/DailyMotivation";
import { CycleWidget } from "@/src/shared/components/CycleWidget";
import {
  getGreeting,
  getTimeIcon,
  getTimeOfDay,
} from "@/src/shared/lib/timeContext";
import { getHomeBottomSpacerHeight } from "@/src/shared/lib/layout";

type HomeDashboardProps = {
  userName: string;
  onNavigateToStudy: () => void;
  onNavigateToExercise: () => void;
  onNavigateToHabits: () => void;
  onNavigateToCooking: () => void;
  moduleVisibility: {
    partner_features_enabled: boolean;
    study_enabled: boolean;
    exercise_enabled: boolean;
    habits_enabled: boolean;
    goals_enabled: boolean;
    mood_enabled: boolean;
    gratitude_enabled: boolean;
    vouchers_enabled: boolean;
    cooking_enabled: boolean;
    notes_enabled: boolean;
  };
};

type UpcomingExam = {
  id: string;
  subject: string;
  exam_date: string;
};

type QuickAccessItem = {
  label: string;
  route: "/goals" | "/vouchers" | "/mood" | "/gratitude" | "/notes";
  enabledKey:
    | "goals_enabled"
    | "vouchers_enabled"
    | "mood_enabled"
    | "gratitude_enabled"
    | "notes_enabled";
  icon: keyof typeof Ionicons.glyphMap;
  cardClass: string;
  iconColor: string;
};

const colorMap: Record<string, string> = {
  pink: "bg-pink-200",
  blue: "bg-blue-200",
  yellow: "bg-yellow-200",
  teal: "bg-teal-200",
  purple: "bg-purple-200",
  green: "bg-green-200",
};

const quickAccessItems: QuickAccessItem[] = [
  {
    label: "Metas",
    route: "/goals",
    enabledKey: "goals_enabled",
    icon: "flag",
    cardClass: "border-pink-200 bg-pink-100",
    iconColor: "#be185d",
  },
  {
    label: "Vales",
    route: "/vouchers",
    enabledKey: "vouchers_enabled",
    icon: "ticket",
    cardClass: "border-yellow-200 bg-yellow-100",
    iconColor: "#92400e",
  },
  {
    label: "Estado de ánimo",
    route: "/mood",
    enabledKey: "mood_enabled",
    icon: "heart",
    cardClass: "border-purple-200 bg-purple-100",
    iconColor: "#7c3aed",
  },
  {
    label: "Gratitud",
    route: "/gratitude",
    enabledKey: "gratitude_enabled",
    icon: "flower",
    cardClass: "border-emerald-200 bg-emerald-100",
    iconColor: "#047857",
  }
];

const quickAccessRouteMap: Record<QuickAccessItem["route"], string> = {
  "/goals": "/(tabs)/goals",
  "/vouchers": "/vouchers",
  "/mood": "/(tabs)/mood",
  "/gratitude": "/(tabs)/gratitude",
  "/notes": "/notes",
};

function buildCycleDismissKey(userId: string): string {
  return `dashboard:cycle_prompt_dismissed:${userId}`;
}

type AnimatedDashboardCardProps = {
  children: React.ReactNode;
  delay: number;
  animationSeed: number;
  className: string;
};

type DashboardActionTone = "blue" | "pink" | "teal" | "orange" | "indigo";

type DashboardActionButtonProps = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone: DashboardActionTone;
  onPress: () => void;
};

function AnimatedDashboardCard({
  children,
  delay,
  animationSeed,
  className,
}: AnimatedDashboardCardProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(16);

  useEffect(() => {
    opacity.value = 0;
    translateY.value = 16;
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) }),
    );
    translateY.value = withDelay(
      delay,
      withTiming(0, { duration: 360, easing: Easing.out(Easing.cubic) }),
    );
  }, [animationSeed, delay, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={animatedStyle} className={className}>
      {children}
    </Animated.View>
  );
}


export function HomeDashboard({
  userName,
  onNavigateToStudy,
  onNavigateToExercise,
  onNavigateToHabits,
  onNavigateToCooking,
  moduleVisibility,
}: HomeDashboardProps) {
  const insets = useSafeAreaInsets();
  const { session } = useSession();
  const { cycleData, isAvailable, hasPermission, requestPermission } =
    useCycle();
  const todayRaw = new Date().toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const today = todayRaw.charAt(0).toUpperCase() + todayRaw.slice(1);
  const timeOfDay = getTimeOfDay();
  const greetingText = getGreeting(userName);
  const greetingIcon = getTimeIcon() as keyof typeof Ionicons.glyphMap;

  const [todayBlocks, setTodayBlocks] = useState<StudyBlock[]>([]);
  const [todayRoutines, setTodayRoutines] = useState<RoutineWithExercises[]>(
    [],
  );
  const [habitCount, setHabitCount] = useState(0);
  const [habitLogsCount, setHabitLogsCount] = useState(0);
  const [latestRecipe, setLatestRecipe] = useState<Recipe | null>(null);
  const [recipeCount, setRecipeCount] = useState(0);
  const [upcomingExams, setUpcomingExams] = useState<UpcomingExam[]>([]);
  const [weeklySummary, setWeeklySummary] = useState({
    studySessions: 0,
    currentStreak: 0,
    habitsAverageLabel: "0/0",
    pointsGained: 0,
    moodDots: [] as Array<number | null>,
  });
  const [loading, setLoading] = useState(true);
  const [studyError, setStudyError] = useState<string | null>(null);
  const [routineError, setRoutineError] = useState<string | null>(null);
  const [recipeError, setRecipeError] = useState<string | null>(null);
  const [animationSeed, setAnimationSeed] = useState(0);
  const [isCyclePromptDismissed, setIsCyclePromptDismissed] = useState(false);

  const loadingScale = useSharedValue(1);

  useEffect(() => {
    if (loading) {
      loadingScale.value = withRepeat(
        withSequence(
          withTiming(1.06, {
            duration: 650,
            easing: Easing.inOut(Easing.quad),
          }),
          withTiming(1, { duration: 650, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      );
      return;
    }
    loadingScale.value = withTiming(1, { duration: 180 });
  }, [loading, loadingScale]);

  const loadingAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: loadingScale.value }],
  }));

  const handleQuickAccessPress = (route: QuickAccessItem["route"]) => {
    router.replace(quickAccessRouteMap[route]);
  };

  const visibleQuickAccessItems = quickAccessItems.filter((item) => {
    if (item.enabledKey === "vouchers_enabled") {
      return (
        moduleVisibility.vouchers_enabled &&
        moduleVisibility.partner_features_enabled
      );
    }
    return moduleVisibility[item.enabledKey];
  });
  const shouldShowCycleWidget =
    isAvailable && (hasPermission || !isCyclePromptDismissed);
  const bottomSpacerHeight = getHomeBottomSpacerHeight(insets.bottom);

  useEffect(() => {
    const userId = session?.user.id;
    if (!userId) {
      setIsCyclePromptDismissed(false);
      return;
    }
    const scopedUserId: string = userId;

    let mounted = true;

    async function loadDismissedState() {
      try {
        const value = await AsyncStorage.getItem(
          buildCycleDismissKey(scopedUserId),
        );
        if (!mounted) return;
        setIsCyclePromptDismissed(value === "true");
      } catch {
        if (!mounted) return;
        setIsCyclePromptDismissed(false);
      }
    }

    void loadDismissedState();

    return () => {
      mounted = false;
    };
  }, [session?.user.id]);

  useEffect(() => {
    if (hasPermission) {
      setIsCyclePromptDismissed(false);
    }
  }, [hasPermission]);

  useEffect(() => {
    const userId = session?.user.id;
    if (!userId) {
      setLoading(false);
      return;
    }

    async function loadTodayData() {
      try {
        setLoading(true);
        setStudyError(null);
        setRoutineError(null);
        setRecipeError(null);

        const todayDate = new Date();
        const todayDayOfWeek = todayDate.getDay();
        const todayISO = todayDate.toISOString().slice(0, 10);
        const weekStart = new Date(todayDate);
        weekStart.setDate(todayDate.getDate() - todayDate.getDay() + 1);
        weekStart.setHours(0, 0, 0, 0);
        const weekStartISO = weekStart.toISOString().slice(0, 10);
        const moodDays = Array.from({ length: 7 }, (_, index) => {
          const day = new Date(weekStart);
          day.setDate(weekStart.getDate() + index);
          return day.toISOString().slice(0, 10);
        });

        const [
          blocksRes,
          routinesRes,
          habitsCountRes,
          habitsLogsRes,
          latestRecipeRes,
          recipeCountRes,
          upcomingExamsRes,
          weeklySessionsRes,
          weeklyRoutineLogsRes,
          weeklyGratitudeRes,
          weeklyHabitLogsRes,
          weeklyMoodRes,
          streakRes,
        ] = await Promise.all([
          supabase
            .from("study_blocks")
            .select("*")
            .eq("user_id", userId)
            .eq("day_of_week", todayDayOfWeek)
            .order("start_time", { ascending: true }),
          supabase
            .from("routines")
            .select(
              `*, routine_exercises (id, routine_id, exercise_id, order_index, exercise:exercises (id, name, sets, reps, duration_seconds, notes))`,
            )
            .eq("user_id", userId),
          supabase
            .from("habits")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId),
          supabase
            .from("habit_logs")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId)
            .eq("log_date", todayISO),
          supabase
            .from("recipes")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from("recipes")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId),
          supabase
            .from("exam_logs")
            .select("id, subject, exam_date")
            .eq("user_id", userId)
            .gte("exam_date", todayISO)
            .order("exam_date", { ascending: true })
            .limit(3),
          supabase
            .from("study_sessions")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId)
            .gte("completed_at", weekStartISO),
          supabase
            .from("routine_logs")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId)
            .gte("completed_at", weekStartISO),
          supabase
            .from("gratitude_logs")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId)
            .gte("logged_date", weekStartISO),
          supabase
            .from("habit_logs")
            .select("log_date")
            .eq("user_id", userId)
            .gte("log_date", weekStartISO),
          supabase
            .from("mood_logs")
            .select("mood, logged_date")
            .eq("user_id", userId)
            .in("logged_date", moodDays),
          supabase
            .from("streaks")
            .select("current_streak")
            .eq("user_id", userId)
            .maybeSingle(),
        ]);

        if (blocksRes.error) {
          setStudyError("No se pudo cargar. Intenta de nuevo.");
          setTodayBlocks([]);
        } else {
          setTodayBlocks(blocksRes.data ?? []);
        }

        if (routinesRes.error) {
          setRoutineError("No se pudo cargar. Intenta de nuevo.");
          setTodayRoutines([]);
        } else {
          setTodayRoutines(
            (routinesRes.data ?? []).filter((r) =>
              r.days.includes(todayDayOfWeek),
            ),
          );
        }

        setHabitCount(habitsCountRes.count ?? 0);
        setHabitLogsCount(habitsLogsRes.count ?? 0);

        const hasRecipeError =
          Boolean(latestRecipeRes.error) || Boolean(recipeCountRes.error);
        if (hasRecipeError) {
          setRecipeError("No se pudo cargar. Intenta de nuevo.");
          setLatestRecipe(null);
          setRecipeCount(0);
        } else {
          setLatestRecipe((latestRecipeRes.data as Recipe | null) ?? null);
          setRecipeCount(recipeCountRes.count ?? 0);
        }

        setUpcomingExams(
          (upcomingExamsRes.data as UpcomingExam[] | null) ?? [],
        );

        const moodMap = new Map<string, number>();
        (
          (weeklyMoodRes.data as Array<{
            mood: number;
            logged_date: string;
          }> | null) ?? []
        ).forEach((row) => {
          moodMap.set(row.logged_date, row.mood);
        });

        const habitLogs =
          (weeklyHabitLogsRes.data as Array<{ log_date: string }> | null) ?? [];
        const uniqueHabitDays = new Set(habitLogs.map((item) => item.log_date))
          .size;
        const totalHabits = habitsCountRes.count ?? 0;
        const avgPerDay =
          uniqueHabitDays > 0
            ? Math.round((habitLogs.length / uniqueHabitDays) * 10) / 10
            : 0;

        const studyPoints = (weeklySessionsRes.count ?? 0) * 5;
        const routinePoints = (weeklyRoutineLogsRes.count ?? 0) * 10;
        const gratitudePoints = (weeklyGratitudeRes.count ?? 0) * 3;

        setWeeklySummary({
          studySessions: weeklySessionsRes.count ?? 0,
          currentStreak:
            (streakRes.data as { current_streak: number } | null)
              ?.current_streak ?? 0,
          habitsAverageLabel: `${avgPerDay}/${totalHabits}`,
          pointsGained: studyPoints + routinePoints + gratitudePoints,
          moodDots: moodDays.map((day) => moodMap.get(day) ?? null),
        });
        setAnimationSeed((prev) => prev + 1);
      } catch (err) {
        const fallbackError =
          err instanceof Error ? err.message : "No se pudo cargar. Intenta de nuevo.";
        setStudyError((prev) => prev ?? fallbackError);
        setRoutineError((prev) => prev ?? fallbackError);
        setRecipeError((prev) => prev ?? fallbackError);
      } finally {
        setLoading(false);
      }
    }

    void loadTodayData();
  }, [session?.user.id]);

  const handleTotalTime = (routine: RoutineWithExercises): string => {
    const totalSeconds = routine.routine_exercises.reduce(
      (sum, re) => sum + (re.exercise?.duration_seconds ?? 0),
      0,
    );
    return `${Math.ceil(totalSeconds / 60)} min`;
  };

  const getDaysUntilExam = (examDate: string): number => {
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    const exam = new Date(`${examDate}T00:00:00`);
    exam.setHours(0, 0, 0, 0);

    return Math.round(
      (exam.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24),
    );
  };

  const getUrgencyStyles = (
    days: number,
  ): { badgeClass: string; text: string } => {
    if (days <= 0)
      return { badgeClass: "bg-red-100 text-red-700", text: "Hoy" };
    if (days === 1)
      return { badgeClass: "bg-red-100 text-red-700", text: "Mañana" };
    if (days <= 3)
      return {
        badgeClass: "bg-pink-100 text-pink-700",
        text: `En ${days} días`,
      };
    if (days <= 7)
      return {
        badgeClass: "bg-yellow-100 text-yellow-800",
        text: `En ${days} días`,
      };
    return {
      badgeClass: "bg-emerald-100 text-emerald-700",
      text: `En ${days} días`,
    };
  };

  return (
    <ScrollView
      className="flex-1 bg-blue-50 px-5 pt-12"
      contentContainerStyle={{ paddingBottom: bottomSpacerHeight }}
    >
      {/* Header */}
      <View>
        <View className="flex-row items-center justify-between">
          <View>
            <View className="flex-row items-center">
              <Ionicons name={greetingIcon} size={18} color="#1e40af" />
              <Text className="ml-2 text-2xl font-extrabold text-blue-900">
                {greetingText}
              </Text>
            </View>
            <Text className="mt-1 text-sm font-semibold text-blue-700">{today}</Text>
          </View>
          <TouchableOpacity
            className="h-9 w-9 items-center justify-center rounded-full border border-blue-200 bg-blue-50"
            onPress={() => router.push("/profile")}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Ir al perfil"
          >
            <Ionicons name="person" size={16} color="#1e40af" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Motivación */}
      <View className="mt-4">
        <DailyMotivation
          studyBlockCount={
            moduleVisibility.study_enabled ? todayBlocks.length : 0
          }
          hasRoutine={
            moduleVisibility.exercise_enabled && todayRoutines.length > 0
          }
          timeOfDay={timeOfDay}
          cyclePhase={cycleData?.phase}
        />
      </View>

      {shouldShowCycleWidget && (
        <CycleWidget
          cycleData={cycleData}
          isAvailable={isAvailable}
          hasPermission={hasPermission}
          onRequestPermission={requestPermission}
          onDismissPrompt={() => {
            const userId = session?.user.id;
            setIsCyclePromptDismissed(true);
            if (!userId) return;
            AsyncStorage.setItem(buildCycleDismissKey(userId), "true").catch(
              (error) =>
                console.error(
                  "[HomeDashboard] error guardando estado de ciclo:",
                  error instanceof Error ? error.message : String(error),
                ),
            );
          }}
        />
      )}

      {/* Quick access */}
      {visibleQuickAccessItems.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-4"
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
        >
          {visibleQuickAccessItems.map((item) => (
            <TouchableOpacity
              key={item.route}
              className={`mr-3 h-14 w-14 items-center justify-center rounded-2xl border-2 ${item.cardClass}`}
              onPress={() => handleQuickAccessPress(item.route)}
              accessibilityRole="button"
              accessibilityLabel={item.label}
            >
              <Ionicons name={item.icon} size={22} color={item.iconColor} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {moduleVisibility.habits_enabled && (
        <TouchableOpacity
          className="mt-4 rounded-3xl border-2 border-purple-200 bg-white p-4"
          onPress={onNavigateToHabits}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Ionicons name="leaf" size={18} color="#7c3aed" />
              <Text className="ml-2 text-base font-bold text-purple-900">
                Hábitos de hoy
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#7c3aed" />
          </View>
          <Text className="mt-2 text-sm font-semibold text-purple-700">
            {loading
              ? "Cargando hábitos..."
              : `${habitLogsCount}/${habitCount} hábitos completados hoy`}
          </Text>
        </TouchableOpacity>
      )}

      {moduleVisibility.study_enabled && (
        <AnimatedDashboardCard
          delay={0}
          animationSeed={animationSeed}
          className="mt-4 rounded-3xl border-2 border-pink-200 bg-white p-5"
        >
          <View className="mb-3 flex-row items-center">
            <Ionicons name="book" size={18} color="#be185d" />
            <Text className="ml-2 text-base font-bold text-pink-900">
              Bloques de estudio
            </Text>
          </View>

          {loading ? (
            <View className="items-center py-6">
              <Animated.View style={loadingAnimatedStyle}>
                <MochiCharacter mood="thinking" size={82} />
              </Animated.View>
              <Text className="mt-3 text-sm font-semibold text-pink-700">
                Cargando tu agenda...
              </Text>
            </View>
          ) : studyError ? (
            <Text className="text-sm font-semibold text-red-600">
              {studyError}
            </Text>
          ) : todayBlocks.length === 0 ? (
            <TouchableOpacity
              className="items-center py-2"
              onPress={onNavigateToStudy}
              activeOpacity={0.8}
            >
              <MochiCharacter mood="sleepy" size={78} />
              <Text className="mt-3 text-sm font-semibold text-slate-500">
                No hay bloques para este día
              </Text>
            </TouchableOpacity>
          ) : (
            todayBlocks.map((block) => (
              <TouchableOpacity
                key={block.id}
                className="mb-3 flex-row items-center justify-between rounded-2xl border border-pink-200 bg-pink-50 p-3"
                style={{ borderColor: "#fbcfe8" }}
                onPress={onNavigateToStudy}
              >
                <View className="flex-row items-center">
                  <View
                    className={`mr-3 h-10 w-10 items-center justify-center rounded-xl ${colorMap[block.color] ?? "bg-purple-200"}`}
                  >
                    <Text className="text-xs font-extrabold text-slate-700">
                      {block.subject[0]}
                    </Text>
                  </View>
                  <View>
                    <Text className="text-sm font-bold text-slate-800">
                      {block.subject}
                    </Text>
                    <Text className="text-xs font-semibold text-slate-500">
                      {block.start_time} - {block.end_time}
                    </Text>
                  </View>
                </View>
                <View className="rounded-full bg-white px-3 py-1">
                  <Text className="text-xs font-bold text-slate-600">
                    {`${parseInt(block.end_time.split(":")[0]) - parseInt(block.start_time.split(":")[0])}h`}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </AnimatedDashboardCard>
      )}

      {moduleVisibility.study_enabled && upcomingExams.length > 0 && (
        <AnimatedDashboardCard
          delay={80}
          animationSeed={animationSeed}
          className="mt-4 rounded-3xl border-2 border-yellow-300 bg-white p-5"
        >
          <View className="mb-3 flex-row items-center">
            <Ionicons name="time" size={18} color="#b45309" />
            <Text className="ml-2 text-base font-bold text-yellow-900">
              Próximos exámenes
            </Text>
          </View>

          {upcomingExams.map((exam) => {
            const days = getDaysUntilExam(exam.exam_date);
            const urgency = getUrgencyStyles(days);

            return (
              <View
                key={exam.id}
                className="mb-2 rounded-2xl border border-yellow-200 bg-yellow-50 p-3"
              >
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm font-extrabold text-yellow-900">
                    {exam.subject}
                  </Text>
                  <View
                    className={`rounded-full px-2 py-1 ${urgency.badgeClass}`}
                  >
                    <Text className="text-xs font-bold">{urgency.text}</Text>
                  </View>
                </View>
              </View>
            );
          })}

          {upcomingExams.some(
            (exam) => getDaysUntilExam(exam.exam_date) === 0,
          ) && (
            <View className="mt-1 flex-row items-center rounded-2xl border border-pink-200 bg-pink-50 px-3 py-2">
              <MochiCharacter mood="excited" size={34} />
              <Text className="ml-2 flex-1 text-xs font-semibold text-pink-700">
                Hoy tienes examen. Respira, confía en tu proceso y hazlo
                increíble.
              </Text>
            </View>
          )}
        </AnimatedDashboardCard>
      )}

      {moduleVisibility.exercise_enabled && (
        <AnimatedDashboardCard
          delay={100}
          animationSeed={animationSeed}
          className="mt-4 rounded-3xl border-2 border-teal-200 bg-white p-5"
        >
          <View className="mb-2 flex-row items-center">
            <Ionicons name="barbell" size={18} color="#0d9488" />
            <Text className="ml-2 text-base font-bold text-teal-900">
              Rutinas de hoy
            </Text>
          </View>
          {loading ? (
            <View className="items-center py-6">
              <Animated.View style={loadingAnimatedStyle}>
                <MochiCharacter mood="thinking" size={82} />
              </Animated.View>
              <Text className="mt-3 text-sm font-semibold text-teal-700">
                Preparando tus rutinas...
              </Text>
            </View>
          ) : todayRoutines.length > 0 ? (
            todayRoutines.map((routine) => (
              <TouchableOpacity
                key={routine.id}
                className="mb-3 rounded-2xl border border-teal-200 bg-teal-50 p-3"
                onPress={onNavigateToExercise}
              >
                <Text className="text-sm font-bold text-slate-800">
                  {routine.name}
                </Text>
                <Text className="mt-1 text-xs font-semibold text-teal-700">
                  {routine.routine_exercises.length} ejercicios •{" "}
                  {handleTotalTime(routine)}
                </Text>
                <View className="mt-2 self-start rounded-xl border border-teal-200 bg-white px-3 py-1">
                  <Text className="text-xs font-bold text-teal-800">
                    Iniciar rutina
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          ) : routineError ? (
            <Text className="text-xs font-semibold text-red-500">
              {routineError}
            </Text>
          ) : (
            <TouchableOpacity
              className="items-center py-2"
              onPress={onNavigateToExercise}
              activeOpacity={0.8}
            >
              <MochiCharacter mood="happy" size={78} />
              <Text className="mt-3 text-sm font-semibold text-slate-500">
                Crea tu primera rutina
              </Text>
            </TouchableOpacity>
          )}
        </AnimatedDashboardCard>
      )}

      {/* ─── Cocina ─── */}
      {moduleVisibility.cooking_enabled && (
        <AnimatedDashboardCard
          delay={200}
          animationSeed={animationSeed}
          className="mt-4 rounded-3xl border-2 border-orange-200 bg-white p-5"
        >
          <View className="mb-3 flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Ionicons name="restaurant" size={18} color="#c2410c" />
              <Text className="ml-2 text-base font-bold text-orange-900">
                Cocina
              </Text>
            </View>
            {recipeCount > 0 && (
              <View className="rounded-full bg-orange-100 px-3 py-1">
                <Text className="text-xs font-bold text-orange-700">
                  {recipeCount} {recipeCount === 1 ? "receta" : "recetas"}
                </Text>
              </View>
            )}
          </View>

          {loading ? (
            <View className="items-center py-4">
              <Animated.View style={loadingAnimatedStyle}>
                <MochiCharacter mood="thinking" size={72} />
              </Animated.View>
            </View>
          ) : recipeError ? (
            <Text className="text-xs font-semibold text-red-500">
              {recipeError}
            </Text>
          ) : latestRecipe ? (
            <>
              <TouchableOpacity
                className="rounded-2xl border border-orange-200 bg-orange-50 p-3"
                onPress={onNavigateToCooking}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 pr-3">
                    <Text
                      className="text-sm font-extrabold text-orange-950"
                      numberOfLines={1}
                    >
                      {latestRecipe.title}
                    </Text>
                    {latestRecipe.description ? (
                      <Text
                        className="mt-0.5 text-xs font-semibold text-orange-700"
                        numberOfLines={1}
                      >
                        {latestRecipe.description}
                      </Text>
                    ) : null}
                  </View>
                  <View className="flex-row items-center gap-1">
                    {latestRecipe.is_favorite && (
                      <Ionicons name="heart" size={14} color="#ec4899" />
                    )}
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color="#c2410c"
                    />
                  </View>
                </View>
                {(latestRecipe.total_time_minutes > 0 ||
                  latestRecipe.difficulty) && (
                  <View className="mt-2 flex-row gap-2">
                    {latestRecipe.total_time_minutes > 0 && (
                      <View className="flex-row items-center rounded-full bg-orange-200 px-2 py-0.5">
                        <Ionicons
                          name="time"
                          size={11}
                          color="#c2410c"
                        />
                        <Text className="ml-0.5 text-xs font-bold text-orange-800">
                          {latestRecipe.total_time_minutes} min
                        </Text>
                      </View>
                    )}
                    <View className="rounded-full bg-orange-200 px-2 py-0.5">
                      <Text className="text-xs font-bold text-orange-800 capitalize">
                        {latestRecipe.difficulty}
                      </Text>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              className="items-center py-2"
              onPress={onNavigateToCooking}
              activeOpacity={0.8}
            >
              <MochiCharacter mood="happy" size={72} />
              <Text className="mt-2 text-center text-sm font-semibold text-orange-700">
                Cuéntame qué quieres cocinar hoy
              </Text>
            </TouchableOpacity>
          )}
        </AnimatedDashboardCard>
      )}

      <AnimatedDashboardCard
        delay={240}
        animationSeed={animationSeed}
        className="mt-4 rounded-3xl border-2 border-purple-200 bg-white p-5"
      >
        <View className="mb-3 flex-row items-center">
          <Ionicons name="stats-chart" size={18} color="#6d28d9" />
          <Text className="ml-2 text-base font-bold text-purple-900">
            Esta semana
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-3"
        >
          <View className="mr-2 flex-row items-center rounded-2xl bg-purple-50 px-3 py-2">
            <Ionicons name="book" size={14} color="#7c3aed" />
            <Text className="ml-1 text-xs font-bold text-purple-900">
              {weeklySummary.studySessions} sesiones
            </Text>
          </View>
          <View className="mr-2 flex-row items-center rounded-2xl bg-pink-50 px-3 py-2">
            <Ionicons name="flame" size={14} color="#be185d" />
            <Text className="ml-1 text-xs font-bold text-pink-900">
              {weeklySummary.currentStreak} días
            </Text>
          </View>
          <View className="mr-2 flex-row items-center rounded-2xl bg-green-50 px-3 py-2">
            <Ionicons name="leaf" size={14} color="#15803d" />
            <Text className="ml-1 text-xs font-bold text-green-900">
              {weeklySummary.habitsAverageLabel} hábitos/día
            </Text>
          </View>
          <View className="mr-2 flex-row items-center rounded-2xl bg-yellow-50 px-3 py-2">
            <Ionicons name="star" size={14} color="#a16207" />
            <Text className="ml-1 text-xs font-bold text-yellow-900">
              {weeklySummary.pointsGained} puntos
            </Text>
          </View>
        </ScrollView>

        <View className="mb-3 flex-row items-center">
          {weeklySummary.moodDots.map((mood, index) => {
            const bgClass =
              mood === null
                ? "bg-slate-200"
                : mood <= 2
                  ? "bg-pink-300"
                  : mood === 3
                    ? "bg-yellow-300"
                    : "bg-emerald-300";

            return (
              <View
                key={`${index}-${mood ?? "none"}`}
                className={`mr-2 h-2 w-2 rounded-full ${bgClass}`}
              />
            );
          })}
        </View>
      </AnimatedDashboardCard>

    </ScrollView>
  );
}

export default HomeDashboard;
