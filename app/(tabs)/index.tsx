import { useEffect, useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";

import HomeDashboard from "@/src/features/home/components/HomeDashboard";
import { QuickCaptureModal } from "@/src/shared/components/QuickCaptureModal";
import { RecoveryPlanModal } from "@/src/shared/components/RecoveryPlanModal";
import { useStreakRecovery } from "@/src/shared/hooks/useStreakRecovery";
import { useSession } from "@/src/core/providers/SessionContext";
import { useModuleVisibility } from "@/src/core/providers/ModuleVisibilityContext";
import { supabase } from "@/src/shared/lib/supabase";

function pickDisplayName(raw: string | null | undefined): string | null {
  const cleaned = raw?.trim();
  if (!cleaned) return null;
  const [firstToken] = cleaned.split(/\s+/);
  return firstToken || null;
}

export default function Home() {
  const router = useRouter();
  const { session } = useSession();
  const { moduleVisibility } = useModuleVisibility();
  const [displayName, setDisplayName] = useState("Amiga");
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

  useEffect(() => {
    let mounted = true;

    async function resolveDisplayName() {
      const userId = session?.user.id;
      if (!userId) {
        setDisplayName("Amiga");
        return;
      }

      const metadataName = pickDisplayName(
        (session.user.user_metadata as { full_name?: string } | null)
          ?.full_name,
      );

      if (metadataName && mounted) {
        setDisplayName(metadataName);
      }

      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", userId)
        .maybeSingle();

      if (!mounted) return;

      const profileName = pickDisplayName(
        (data as { full_name?: string } | null)?.full_name,
      );
      if (profileName) {
        setDisplayName(profileName);
        return;
      }

      if (metadataName) {
        setDisplayName(metadataName);
        return;
      }

      const emailAlias = pickDisplayName(session.user.email?.split("@")[0]);
      setDisplayName(emailAlias ?? "Amiga");
    }

    void resolveDisplayName();

    return () => {
      mounted = false;
    };
  }, [session?.user.id, session?.user.email, session?.user.user_metadata]);

  return (
    <View className="flex-1">
      <View className="flex-1">
        <HomeDashboard
          userName={displayName}
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
