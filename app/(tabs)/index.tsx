import { reportError } from "@/src/shared/lib/observability/reportError";
import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";

import { TodayScreen } from "@/src/features/today/TodayScreen";
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
  const { session } = useSession();
  const { moduleVisibility } = useModuleVisibility();
  const { showAchievement } = useAchievement();
  const [displayName, setDisplayName] = useState("Amiga");
  const [recoveryDismissed, setRecoveryDismissed] = useState(false);
  const [quickCaptureOpen, setQuickCaptureOpen] = useState(false);

  const { activeRecoveryPlan, createRecoveryPlan, dismissRecoveryPlan } = useStreakRecovery(
    session?.user.id,
  );

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

  const handleActionCreated = useCallback(
    async (action: ActionConversionResult, originalNote: string) => {
      const userId = session?.user.id;
      if (!userId) return;

      try {
        // Registro de la conversión (nota original, acción elegida y confianza).
        const { error: conversionError } = await supabase.from("action_conversions").insert({
          user_id: userId,
          original_note: originalNote || action.data.title || "nota",
          converted_action_type:
            action.type === "study_block"
              ? "study"
              : action.type === "exercise"
                ? "routine"
                : action.type,
          converted_data: action.data,
          confidence_score: Math.min(1, Math.max(0, action.confidence)),
          ai_reasoning: action.reasoning || null,
        });
        if (conversionError)
          reportError(conversionError, { scope: "quick-capture/log-conversion" });

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
          description: action.data.title ?? "Acción guardada desde captura rápida",
          points: 0,
          icon: "flash",
        });
      } catch (err) {
        reportError(err, { scope: "quick-capture/persist" });
      }
    },
    [session?.user.id, showAchievement],
  );

  const handleNoteSaved = useCallback(
    async (note: string) => {
      const userId = session?.user.id;
      if (!userId) return;
      const { error } = await supabase
        .from("quick_notes")
        .insert({ user_id: userId, content: note });
      if (error) {
        reportError(error, { scope: "quick-capture/save-note" });
        return;
      }
      showAchievement({
        title: "Nota guardada",
        description: note.slice(0, 60),
        points: 0,
        icon: "document-text",
      });
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
        (session.user.user_metadata as { full_name?: string } | null)?.full_name,
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

      const profileName = pickDisplayName((data as { full_name?: string } | null)?.full_name);
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
        <TodayScreen
          userName={displayName}
          moduleVisibility={moduleVisibility}
          onOpenQuickCapture={() => setQuickCaptureOpen(true)}
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
        onActionCreated={(action, note) => {
          void handleActionCreated(action, note);
        }}
        onNoteSaved={(note) => {
          void handleNoteSaved(note);
        }}
      />
    </View>
  );
}
