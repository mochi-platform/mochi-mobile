import { reportError } from "@/src/shared/lib/observability/reportError";
import { toLocalISODate } from "@/src/shared/lib/dates";
import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/src/shared/lib/supabase";
import type { StudyBlock, RoutineWithExercises, Recipe } from "@/src/shared/types/database";
import { saveHomeWidgetSummary } from "@/src/shared/lib/homeWidgetSummary";
import type {
  HomeDashboardCache,
  UpcomingExam,
  WeeklySummary,
} from "@/src/features/home/dashboard/types";
import { buildDashboardCacheKey, formatTimeHHMM } from "@/src/features/home/dashboard/helpers";

export function useDashboardData(userId: string | undefined) {
  const [todayBlocks, setTodayBlocks] = useState<StudyBlock[]>([]);
  const [todayRoutines, setTodayRoutines] = useState<RoutineWithExercises[]>([]);
  const [habitCount, setHabitCount] = useState(0);
  const [habitLogsCount, setHabitLogsCount] = useState(0);
  const [latestRecipe, setLatestRecipe] = useState<Recipe | null>(null);
  const [recipeCount, setRecipeCount] = useState(0);
  const [upcomingExams, setUpcomingExams] = useState<UpcomingExam[]>([]);
  const [weeklySummary, setWeeklySummary] = useState<WeeklySummary>({
    studySessions: 0,
    currentStreak: 0,
    habitsProgress: 0,
    pointsGained: 0,
    moodDots: [] as (number | null)[],
  });
  const [loading, setLoading] = useState(true);
  const [studyError, setStudyError] = useState<string | null>(null);
  const [routineError, setRoutineError] = useState<string | null>(null);
  const [recipeError, setRecipeError] = useState<string | null>(null);
  const [animationSeed, setAnimationSeed] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const refresh = useCallback(() => {
    setRefreshing(true);
    setRefreshKey((key) => key + 1);
  }, []);

  useEffect(() => {
    if (!userId) {
      setTodayBlocks([]);
      setTodayRoutines([]);
      setHabitCount(0);
      setHabitLogsCount(0);
      setLatestRecipe(null);
      setRecipeCount(0);
      setUpcomingExams([]);
      setWeeklySummary({
        studySessions: 0,
        currentStreak: 0,
        habitsProgress: 0,
        pointsGained: 0,
        moodDots: [],
      });
      setLoading(false);
      return;
    }
    const scopedUserId: string = userId;

    let mounted = true;

    async function loadTodayData() {
      const cacheKey = buildDashboardCacheKey(scopedUserId);
      let cacheHydrated = false;

      try {
        setLoading(true);
        setStudyError(null);
        setRoutineError(null);
        setRecipeError(null);

        try {
          const cachedRaw = await AsyncStorage.getItem(cacheKey);
          if (cachedRaw && mounted) {
            const cached = JSON.parse(cachedRaw) as HomeDashboardCache;
            setTodayBlocks(cached.todayBlocks ?? []);
            setTodayRoutines(cached.todayRoutines ?? []);
            setHabitCount(cached.habitCount ?? 0);
            setHabitLogsCount(cached.habitLogsCount ?? 0);
            setLatestRecipe(cached.latestRecipe ?? null);
            setRecipeCount(cached.recipeCount ?? 0);
            setUpcomingExams(cached.upcomingExams ?? []);
            setWeeklySummary(
              cached.weeklySummary ?? {
                studySessions: 0,
                currentStreak: 0,
                habitsProgress: 0,
                pointsGained: 0,
                moodDots: [],
              },
            );
            setAnimationSeed((prev) => prev + 1);
            cacheHydrated = true;
            setLoading(false);
          }
        } catch (error) {
          // Si el cache falla, seguimos con fetch remoto.
          reportError(error, { scope: "src/features/home/components/HomeDashboard.tsx" });
        }

        if (!cacheHydrated && mounted) {
          setLoading(true);
        }

        const todayDate = new Date();
        const todayDayOfWeek = todayDate.getDay();
        const todayISO = toLocalISODate(todayDate);
        const weekStart = new Date(todayDate);
        weekStart.setDate(todayDate.getDate() - todayDate.getDay() + 1);
        weekStart.setHours(0, 0, 0, 0);
        const weekStartISO = toLocalISODate(weekStart);
        const moodDays = Array.from({ length: 7 }, (_, index) => {
          const day = new Date(weekStart);
          day.setDate(weekStart.getDate() + index);
          return toLocalISODate(day);
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
          profileRes,
        ] = await Promise.all([
          supabase
            .from("study_blocks")
            .select("*")
            .eq("user_id", scopedUserId)
            .eq("day_of_week", todayDayOfWeek)
            .order("start_time", { ascending: true }),
          supabase
            .from("routines")
            .select(
              `*, routine_exercises (id, routine_id, exercise_id, order_index, exercise:exercises (id, name, sets, reps, duration_seconds, notes))`,
            )
            .eq("user_id", scopedUserId),
          supabase
            .from("habits")
            .select("id", { count: "exact", head: true })
            .eq("user_id", scopedUserId),
          supabase
            .from("habit_logs")
            .select("id", { count: "exact", head: true })
            .eq("user_id", scopedUserId)
            .eq("log_date", todayISO),
          supabase
            .from("recipes")
            .select("*")
            .eq("user_id", scopedUserId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from("recipes")
            .select("id", { count: "exact", head: true })
            .eq("user_id", scopedUserId),
          supabase
            .from("exam_logs")
            .select("id, subject, exam_date")
            .eq("user_id", scopedUserId)
            .gte("exam_date", todayISO)
            .order("exam_date", { ascending: true })
            .limit(3),
          supabase
            .from("study_sessions")
            .select("id", { count: "exact", head: true })
            .eq("user_id", scopedUserId)
            .gte("completed_at", weekStartISO),
          supabase
            .from("routine_logs")
            .select("id", { count: "exact", head: true })
            .eq("user_id", scopedUserId)
            .gte("completed_at", weekStartISO),
          supabase
            .from("gratitude_logs")
            .select("id", { count: "exact", head: true })
            .eq("user_id", scopedUserId)
            .gte("logged_date", weekStartISO),
          supabase
            .from("habit_logs")
            .select("log_date")
            .eq("user_id", scopedUserId)
            .gte("log_date", weekStartISO),
          supabase
            .from("mood_logs")
            .select("mood, logged_date")
            .eq("user_id", scopedUserId)
            .in("logged_date", moodDays),
          supabase
            .from("streaks")
            .select("current_streak")
            .eq("user_id", scopedUserId)
            .maybeSingle(),
          supabase
            .from("profiles")
            .select("total_points")
            .eq("id", scopedUserId)
            .maybeSingle<{ total_points: number }>(),
        ]);

        if (!mounted) {
          return;
        }

        let nextStudyError: string | null = null;
        let nextRoutineError: string | null = null;
        let nextRecipeError: string | null = null;

        let nextTodayBlocks: StudyBlock[] = [];
        if (blocksRes.error) {
          nextStudyError = "No se pudo cargar. Intenta de nuevo.";
        } else {
          nextTodayBlocks = (blocksRes.data ?? []) as StudyBlock[];
        }

        let nextTodayRoutines: RoutineWithExercises[] = [];
        if (routinesRes.error) {
          nextRoutineError = "No se pudo cargar. Intenta de nuevo.";
        } else {
          const routineRows = (routinesRes.data as RoutineWithExercises[] | null) ?? [];
          nextTodayRoutines = routineRows.filter((routine) =>
            routine.days.includes(todayDayOfWeek),
          );
        }

        const nextHabitCount = habitsCountRes.count ?? 0;
        const nextHabitLogsCount = habitsLogsRes.count ?? 0;

        let nextLatestRecipe: Recipe | null = null;
        let nextRecipeCount = 0;

        const hasRecipeError = Boolean(latestRecipeRes.error) || Boolean(recipeCountRes.error);
        if (hasRecipeError) {
          nextRecipeError = "No se pudo cargar. Intenta de nuevo.";
        } else {
          nextLatestRecipe = (latestRecipeRes.data as Recipe | null) ?? null;
          nextRecipeCount = recipeCountRes.count ?? 0;
        }

        const nextUpcomingExams = (upcomingExamsRes.data as UpcomingExam[] | null) ?? [];

        const moodMap = new Map<string, number>();
        (
          (weeklyMoodRes.data as
            | {
                mood: number;
                logged_date: string;
              }[]
            | null) ?? []
        ).forEach((row) => {
          moodMap.set(row.logged_date, row.mood);
        });

        const habitLogs = (weeklyHabitLogsRes.data as { log_date: string }[] | null) ?? [];
        const uniqueHabitDays = new Set(habitLogs.map((item) => item.log_date)).size;
        const totalHabits = habitsCountRes.count ?? 0;
        const avgPerDay =
          uniqueHabitDays > 0 ? Math.round((habitLogs.length / uniqueHabitDays) * 10) / 10 : 0;

        const studyPoints = (weeklySessionsRes.count ?? 0) * 5;
        const routinePoints = (weeklyRoutineLogsRes.count ?? 0) * 10;
        const gratitudePoints = (weeklyGratitudeRes.count ?? 0) * 3;

        const nextCurrentStreak =
          (streakRes.data as { current_streak: number } | null)?.current_streak ?? 0;

        const nextWeeklySummary = {
          studySessions: weeklySessionsRes.count ?? 0,
          currentStreak: nextCurrentStreak,
          habitsProgress: totalHabits > 0 ? avgPerDay / totalHabits : 0,
          pointsGained: studyPoints + routinePoints + gratitudePoints,
          moodDots: moodDays.map((day) => moodMap.get(day) ?? null),
        };

        setStudyError(nextStudyError);
        setRoutineError(nextRoutineError);
        setRecipeError(nextRecipeError);
        setTodayBlocks(nextTodayBlocks);
        setTodayRoutines(nextTodayRoutines);
        setHabitCount(nextHabitCount);
        setHabitLogsCount(nextHabitLogsCount);
        setLatestRecipe(nextLatestRecipe);
        setRecipeCount(nextRecipeCount);
        setUpcomingExams(nextUpcomingExams);
        setWeeklySummary(nextWeeklySummary);
        setAnimationSeed((prev) => prev + 1);

        const nextTotalPoints = profileRes.data?.total_points ?? 0;
        const firstBlock = nextTodayBlocks[0];
        const nextBlockLabel = firstBlock
          ? `${firstBlock.subject} ${formatTimeHHMM(firstBlock.start_time)}`
          : "Día libre";

        const cachePayload: HomeDashboardCache = {
          todayBlocks: nextTodayBlocks,
          todayRoutines: nextTodayRoutines,
          habitCount: nextHabitCount,
          habitLogsCount: nextHabitLogsCount,
          latestRecipe: nextLatestRecipe,
          recipeCount: nextRecipeCount,
          upcomingExams: nextUpcomingExams,
          weeklySummary: nextWeeklySummary,
          totalPoints: nextTotalPoints,
          cachedAt: new Date().toISOString(),
        };

        AsyncStorage.setItem(cacheKey, JSON.stringify(cachePayload)).catch((error) =>
          reportError(error, { scope: "HomeDashboard" }),
        );

        void saveHomeWidgetSummary({
          userId: scopedUserId,
          points: nextTotalPoints,
          streak: nextCurrentStreak,
          nextBlock: nextBlockLabel,
          updatedAt: new Date().toISOString(),
          habitsDone: nextHabitLogsCount,
          habitsTotal: nextHabitCount,
        });
      } catch (err) {
        if (!mounted) {
          return;
        }

        const fallbackError =
          err instanceof Error ? err.message : "No se pudo cargar. Intenta de nuevo.";
        setStudyError((prev) => prev ?? fallbackError);
        setRoutineError((prev) => prev ?? fallbackError);
        setRecipeError((prev) => prev ?? fallbackError);
      } finally {
        if (mounted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }

    void loadTodayData();

    return () => {
      mounted = false;
    };
  }, [userId, refreshKey]);

  return {
    todayBlocks,
    todayRoutines,
    habitCount,
    habitLogsCount,
    latestRecipe,
    recipeCount,
    upcomingExams,
    weeklySummary,
    loading,
    studyError,
    routineError,
    recipeError,
    animationSeed,
    refreshing,
    refresh,
  };
}
