import { useEffect, useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import HomeDashboard from "@/src/features/home/components/HomeDashboard";
import {
  BottomNav,
  type MobileScreen,
} from "@/src/features/home/components/BottomNav";
import { QuickCaptureModal } from "@/src/shared/components/QuickCaptureModal";
import { RecoveryPlanModal } from "@/src/shared/components/RecoveryPlanModal";
import { useStreakRecovery } from "@/src/shared/hooks/useStreakRecovery";
import { supabase } from "@/src/shared/lib/supabase";
import { useSession } from "@/src/core/providers/SessionContext";

type ModuleVisibility = {
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

const defaultModuleVisibility: ModuleVisibility = {
  partner_features_enabled: false,
  study_enabled: true,
  exercise_enabled: true,
  habits_enabled: true,
  goals_enabled: true,
  mood_enabled: true,
  gratitude_enabled: true,
  vouchers_enabled: false,
  cooking_enabled: true,
  notes_enabled: true,
};

export default function Home() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session } = useSession();
  const [recoveryDismissed, setRecoveryDismissed] = useState(false);
  const [quickCaptureOpen, setQuickCaptureOpen] = useState(false);
  const [moduleVisibility, setModuleVisibility] = useState<ModuleVisibility>(
    defaultModuleVisibility,
  );

  const { activeRecoveryPlan, createRecoveryPlan, dismissRecoveryPlan } =
    useStreakRecovery(session?.user.id);

  useEffect(() => {
    let mounted = true;

    async function loadModuleVisibility(): Promise<void> {
      if (!session?.user.id) {
        if (mounted) {
          setModuleVisibility(defaultModuleVisibility);
        }
        return;
      }

      const { data, error } = await supabase
        .from("user_settings")
        .select(
          "partner_features_enabled, study_enabled, exercise_enabled, habits_enabled, goals_enabled, mood_enabled, gratitude_enabled, vouchers_enabled, cooking_enabled, notes_enabled",
        )
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!mounted) return;

      if (error) {
        setModuleVisibility(defaultModuleVisibility);
        return;
      }

      setModuleVisibility({
        ...defaultModuleVisibility,
        ...((data as Partial<ModuleVisibility> | null) ?? {}),
      });
    }

    void loadModuleVisibility();

    return () => {
      mounted = false;
    };
  }, [session?.user.id]);

  const handleRecoveryStart = () => {
    if (!session?.user.id) return;

    void (async () => {
      await createRecoveryPlan(session.user.id);
      setRecoveryDismissed(true);
    })();
  };

  const handleRecoveryDismiss = () => {
    setRecoveryDismissed(true);

    if (!activeRecoveryPlan?.id) return;
    void dismissRecoveryPlan(activeRecoveryPlan.id);
  };

  // Show recovery modal if streak recovery is active and not dismissed yet
  const showRecoveryModal = activeRecoveryPlan !== null && !recoveryDismissed;

  const visibleTabs: MobileScreen[] = [
    "home",
    ...(moduleVisibility.study_enabled ? (["study"] as const) : []),
    ...(moduleVisibility.exercise_enabled ? (["exercise"] as const) : []),
    ...(moduleVisibility.habits_enabled ? (["habits"] as const) : []),
    ...(moduleVisibility.cooking_enabled ? (["cooking"] as const) : []),
  ];

  const navigateToHome = () => {
    router.replace("/");
  };

  const navigateToStudy = () => {
    router.replace("/study-history");
  };

  const navigateToExercise = () => {
    router.replace("/exercise-list");
  };

  const navigateToHabits = () => {
    router.replace("/habits");
  };

  const navigateToCooking = () => {
    router.replace("/cooking");
  };

  const handleNavigate = (screen: MobileScreen) => {
    if (screen === "home") {
      navigateToHome();
      return;
    }

    if (screen === "study") {
      navigateToStudy();
      return;
    }

    if (screen === "exercise") {
      navigateToExercise();
      return;
    }

    if (screen === "habits") {
      navigateToHabits();
      return;
    }

    navigateToCooking();
  };

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      <View className="flex-1">
        <HomeDashboard
          userName="Amiga"
          onNavigateToStudy={navigateToStudy}
          onNavigateToExercise={navigateToExercise}
          onNavigateToHabits={navigateToHabits}
          onNavigateToCooking={navigateToCooking}
          moduleVisibility={moduleVisibility}
        />
      </View>

      <BottomNav
        currentScreen="home"
        onNavigate={handleNavigate}
        visibleTabs={visibleTabs}
      />

      {/* Recovery Plan Modal - appears when streak = 0 */}
      <RecoveryPlanModal
        visible={showRecoveryModal}
        plan={activeRecoveryPlan}
        onStart={handleRecoveryStart}
        onDismiss={handleRecoveryDismiss}
      />

      {/* Quick Capture Modal - FAB */}
      <QuickCaptureModal
        visible={quickCaptureOpen}
        onClose={() => setQuickCaptureOpen(false)}
      />
    </View>
  );
}
