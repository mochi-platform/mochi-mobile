import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";

import HomeDashboard from "@/src/features/home/components/HomeDashboard";
import { QuickCaptureModal } from "@/src/shared/components/QuickCaptureModal";
import { RecoveryPlanModal } from "@/src/shared/components/RecoveryPlanModal";
import { useStreakRecovery } from "@/src/shared/hooks/useStreakRecovery";
import { useSession } from "@/src/core/providers/SessionContext";
import { useModuleVisibility } from "@/src/core/providers/ModuleVisibilityContext";
import { supabase } from "@/src/shared/lib/supabase";
import { useAchievement } from "@/src/core/providers/AchievementContext";
import type { ActionConversionResult } from "@/src/shared/hooks/useActionConversion";

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
  const { showAchievement } = useAchievement();
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
    router.replace("/(tabs)/study");
  };

  const navigateToExercise = () => {
    router.replace("/(tabs)/exercise");
  };

  const navigateToHabits = () => {
    router.replace("/(tabs)/habits");
  };

  const navigateToCooking = () => {
    router.replace("/(tabs)/cooking");
  };

  const handleActionCreated = useCallback(
    async (action: ActionConversionResult) => {
      const userId = session?.user.id;
      if (!userId) return;

      try {
        switch (action.type) {
          case "study_block": {
            const { error } = await supabase.from("study_blocks").insert({
              user_id: userId,
              subject: action.data.title ?? "Estudio",
              day_of_week: new Date().getDay(),
              start_time: "09:00",
              end_time: "10:30",
              color: "purple",
            });
            if (error) throw error;
            break;
          }
          case "exercise": {
            const { error } = await supabase.from("exercises").insert({
              user_id: userId,
              name: action.data.title ?? "Ejercicio",
              sets: 3,
              reps: 10,
              duration_seconds: (action.data.duration ?? 30) * 60,
              notes: action.data.description ?? null,
            });
            if (error) throw error;
            break;
          }
          case "goal": {
            const { error } = await supabase.from("goals").insert({
              user_id: userId,
              title: action.data.title ?? "Nueva meta",
              description: action.data.description ?? null,
              color: "purple",
              progress: 0,
              is_completed: false,
            });
            if (error) throw error;
            break;
          }
          case "habit": {
            const { error } = await supabase.from("habits").insert({
              user_id: userId,
              name: action.data.title ?? "Nuevo hábito",
              icon: "leaf",
              color: "purple",
            });
            if (error) throw error;
            break;
          }
        }

        const label = {
          study_block: "Bloque de estudio",
          exercise: "Ejercicio",
          goal: "Meta",
          habit: "Hábito",
        }[action.type];

        showAchievement({
          title: `${label} creado`,
          description:
            action.data.title ??
            "Acción guardada desde captura rápida",
          points: 0,
          icon: "flash",
        });
      } catch (err) {
        console.error(
          "[QuickCapture] error persistiendo acción:",
          err instanceof Error ? err.message : String(err),
        );
      }
    },
    [session?.user.id, showAchievement],
  );

  useEffect(() => {
    if (!moduleVisibility.quick_capture_enabled) {
      setQuickCaptureOpen(false);
    }
  }, [moduleVisibility.quick_capture_enabled]);

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
          onOpenQuickCapture={() => setQuickCaptureOpen(true)}
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
        visible={moduleVisibility.quick_capture_enabled && quickCaptureOpen}
        onClose={() => setQuickCaptureOpen(false)}
        onActionCreated={(action) => {
          void handleActionCreated(action);
        }}
      />
    </View>
  );
}
