import { useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import HomeDashboard from "@/src/features/home/components/HomeDashboard";
import { QuickCaptureModal } from "@/src/shared/components/QuickCaptureModal";
import { RecoveryPlanModal } from "@/src/shared/components/RecoveryPlanModal";
import { useStreakRecovery } from "@/src/shared/hooks/useStreakRecovery";
import { useSession } from "@/src/core/providers/SessionContext";
import { useModuleVisibility } from "@/src/core/providers/ModuleVisibilityContext";

export default function Home() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session } = useSession();
  const { moduleVisibility } = useModuleVisibility();
  const [recoveryDismissed, setRecoveryDismissed] = useState(false);
  const [quickCaptureOpen, setQuickCaptureOpen] = useState(false);

  const { activeRecoveryPlan, createRecoveryPlan, dismissRecoveryPlan } =
    useStreakRecovery(session?.user.id);

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
