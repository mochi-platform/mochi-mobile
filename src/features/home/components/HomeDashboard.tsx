import { reportError } from "@/src/shared/lib/observability/reportError";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { View, ScrollView, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useSession } from "@/src/core/providers/SessionContext";
import { useCycle } from "@/src/core/providers/CycleContext";
import { CycleWidget } from "@/src/shared/components/CycleWidget";
import { FloatingActionButton } from "@/src/shared/components/FloatingActionButton";
import { DailyMotivation } from "@/src/features/home/components/DailyMotivation";
import { getGreeting, getTimeIcon, getTimeOfDay } from "@/src/shared/lib/timeContext";
import { getHomeBottomSpacerHeight } from "@/src/shared/lib/layout";
import type { QuickAccessItem } from "@/src/features/home/dashboard/types";
import {
  buildCurrentWeekDays,
  buildCycleDismissKey,
  quickAccessItems,
  quickAccessRouteMap,
} from "@/src/features/home/dashboard/helpers";
import { useDashboardData } from "@/src/features/home/dashboard/useDashboardData";
import { useLoadingPulseStyle } from "@/src/features/home/dashboard/useLoadingPulse";
import { DashboardHeader } from "@/src/features/home/dashboard/components/DashboardHeader";
import { QuickAccessRow } from "@/src/features/home/dashboard/components/QuickAccessRow";
import { HabitsCard } from "@/src/features/home/dashboard/components/HabitsCard";
import { StudyBlocksCard } from "@/src/features/home/dashboard/components/StudyBlocksCard";
import { UpcomingExamsCard } from "@/src/features/home/dashboard/components/UpcomingExamsCard";
import { RoutinesCard } from "@/src/features/home/dashboard/components/RoutinesCard";
import { CookingCard } from "@/src/features/home/dashboard/components/CookingCard";
import { WeeklySummaryCard } from "@/src/features/home/dashboard/components/WeeklySummaryCard";

type HomeDashboardProps = {
  userName: string;
  onNavigateToStudy: () => void;
  onNavigateToExercise: () => void;
  onNavigateToHabits: () => void;
  onNavigateToCooking: () => void;
  onOpenQuickCapture: () => void;
  moduleVisibility: {
    partner_features_enabled: boolean;
    quick_capture_enabled: boolean;
    study_enabled: boolean;
    exercise_enabled: boolean;
    habits_enabled: boolean;
    goals_enabled: boolean;
    mood_enabled: boolean;
    gratitude_enabled: boolean;
    vouchers_enabled: boolean;
    cooking_enabled: boolean;
  };
};

export function HomeDashboard({
  userName,
  onNavigateToStudy,
  onNavigateToExercise,
  onNavigateToHabits,
  onNavigateToCooking,
  onOpenQuickCapture,
  moduleVisibility,
}: HomeDashboardProps) {
  const insets = useSafeAreaInsets();
  const { session } = useSession();
  const { cycleData, isAvailable, hasPermission, requestPermission, logPeriodToday } = useCycle();
  const todayRaw = new Date().toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const today = todayRaw.charAt(0).toUpperCase() + todayRaw.slice(1);
  const timeOfDay = getTimeOfDay();
  const greetingText = getGreeting(userName);
  const greetingIcon = getTimeIcon() as keyof typeof Ionicons.glyphMap;
  const currentWeekDays = useMemo(() => buildCurrentWeekDays(), []);

  const {
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
  } = useDashboardData(session?.user.id);
  const [isCyclePromptDismissed, setIsCyclePromptDismissed] = useState(false);

  const loadingAnimatedStyle = useLoadingPulseStyle(loading);

  const handleQuickAccessPress = (route: QuickAccessItem["route"]) => {
    router.replace(quickAccessRouteMap[route]);
  };

  const visibleQuickAccessItems = quickAccessItems.filter((item) => {
    return moduleVisibility[item.enabledKey];
  });
  const shouldShowCycleWidget =
    cycleData !== null || (isAvailable && (hasPermission || !isCyclePromptDismissed));
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
        const value = await AsyncStorage.getItem(buildCycleDismissKey(scopedUserId));
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

  const habitCompletionProgress = habitCount > 0 ? habitLogsCount / habitCount : 0;
  const weeklyHabitProgress = Math.min(Math.max(weeklySummary.habitsProgress, 0), 1);

  return (
    <View className="flex-1">
      <ScrollView
        className="flex-1 bg-blue-50 px-5 pt-12 dark:bg-blue-950"
        contentContainerStyle={{ paddingBottom: bottomSpacerHeight }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        {/* Header */}
        <DashboardHeader greetingIcon={greetingIcon} greetingText={greetingText} today={today} />

        {/* Motivación */}
        <View className="mt-4">
          <DailyMotivation
            studyBlockCount={moduleVisibility.study_enabled ? todayBlocks.length : 0}
            hasRoutine={moduleVisibility.exercise_enabled && todayRoutines.length > 0}
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
            onLogPeriod={logPeriodToday}
            onDismissPrompt={() => {
              const userId = session?.user.id;
              setIsCyclePromptDismissed(true);
              if (!userId) return;
              AsyncStorage.setItem(buildCycleDismissKey(userId), "true").catch((error) =>
                reportError(error, { scope: "HomeDashboard" }),
              );
            }}
          />
        )}

        {/* Quick access */}
        {visibleQuickAccessItems.length > 0 && (
          <QuickAccessRow items={visibleQuickAccessItems} onPressItem={handleQuickAccessPress} />
        )}

        {moduleVisibility.habits_enabled && (
          <HabitsCard
            loading={loading}
            habitCompletionProgress={habitCompletionProgress}
            onPress={onNavigateToHabits}
          />
        )}

        {moduleVisibility.study_enabled && (
          <StudyBlocksCard
            animationSeed={animationSeed}
            loading={loading}
            loadingStyle={loadingAnimatedStyle}
            studyError={studyError}
            todayBlocks={todayBlocks}
            onNavigateToStudy={onNavigateToStudy}
          />
        )}

        {moduleVisibility.study_enabled && upcomingExams.length > 0 && (
          <UpcomingExamsCard animationSeed={animationSeed} upcomingExams={upcomingExams} />
        )}

        {moduleVisibility.exercise_enabled && (
          <RoutinesCard
            animationSeed={animationSeed}
            loading={loading}
            loadingStyle={loadingAnimatedStyle}
            todayRoutines={todayRoutines}
            routineError={routineError}
            onNavigateToExercise={onNavigateToExercise}
          />
        )}

        {/* ─── Cocina ─── */}
        {moduleVisibility.cooking_enabled && (
          <CookingCard
            animationSeed={animationSeed}
            loading={loading}
            loadingStyle={loadingAnimatedStyle}
            recipeCount={recipeCount}
            recipeError={recipeError}
            latestRecipe={latestRecipe}
            onNavigateToCooking={onNavigateToCooking}
          />
        )}

        <WeeklySummaryCard
          animationSeed={animationSeed}
          weeklySummary={weeklySummary}
          currentWeekDays={currentWeekDays}
          weeklyHabitProgress={weeklyHabitProgress}
        />
      </ScrollView>

      {moduleVisibility.quick_capture_enabled && (
        <FloatingActionButton
          onPress={onOpenQuickCapture}
          containerClassName="bg-violet-500"
          borderClassName="border-violet-300 dark:border-violet-700"
          iconName="flash"
          accessibilityLabel="Captura rápida"
        />
      )}
    </View>
  );
}

export default HomeDashboard;
