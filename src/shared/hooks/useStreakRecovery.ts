import { useEffect, useState } from "react";
import { supabase } from "@/src/shared/lib/supabase";
import type { StreakRecoveryPlan } from "@mochi/supabase/types";

export function useStreakRecovery(userId: string | undefined) {
  const [activeRecoveryPlan, setActiveRecoveryPlan] =
    useState<StreakRecoveryPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchActiveRecoveryPlan = async () => {
    if (!userId) {
      setActiveRecoveryPlan(null);
      return;
    }

    try {
      setIsLoading(true);

      const { data, error: fetchError } = await supabase
        .from("streak_recovery_plans")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError && fetchError.code !== "PGRST116") {
        throw fetchError;
      }

      setActiveRecoveryPlan((data as StreakRecoveryPlan) ?? null);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Error fetching recovery plan"),
      );
      console.error("useStreakRecovery error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchActiveRecoveryPlan();
  }, [userId]);

  const createRecoveryPlan = async (userId: string) => {
    try {
      // Generate 3 suggested recovery tasks
      const recoveryTasks = [
        {
          day: 1,
          description:
            "Haz una pequeña actividad: 15 min de estudio o una rutina corta",
          difficulty: "easy" as const,
        },
        {
          day: 2,
          description:
            "Completa una meta diaria: 30 min de estudio o una rutina completa",
          difficulty: "medium" as const,
        },
        {
          day: 3,
          description: "Vuelve a tu rutina normal con toda la energía",
          difficulty: "hard" as const,
        },
      ];

      const { data, error } = await supabase
        .from("streak_recovery_plans")
        .insert({
          user_id: userId,
          recovery_tasks: recoveryTasks,
          is_active: true,
          completed_tasks: 0,
        })
        .select();

      if (error) throw error;

      const newPlan = (data as StreakRecoveryPlan[])[0];
      setActiveRecoveryPlan(newPlan);
      return newPlan;
    } catch (err) {
      console.error("Error creating recovery plan:", err);
      throw err;
    }
  };

  const completeRecoveryTask = async (planId: string) => {
    try {
      const plan = activeRecoveryPlan;
      if (!plan) throw new Error("No active recovery plan");

      const newCompletedTasks = plan.completed_tasks + 1;
      const isComplete = newCompletedTasks >= plan.recovery_tasks.length;

      const { error } = await supabase
        .from("streak_recovery_plans")
        .update({
          completed_tasks: newCompletedTasks,
          is_active: !isComplete,
        })
        .eq("id", planId);

      if (error) throw error;

      // Refresh plan
      void fetchActiveRecoveryPlan();
    } catch (err) {
      console.error("Error completing recovery task:", err);
      throw err;
    }
  };

  const dismissRecoveryPlan = async (planId: string) => {
    try {
      const { error } = await supabase
        .from("streak_recovery_plans")
        .update({ is_active: false })
        .eq("id", planId);

      if (error) throw error;

      setActiveRecoveryPlan(null);
    } catch (err) {
      console.error("Error dismissing recovery plan:", err);
      throw err;
    }
  };

  return {
    activeRecoveryPlan,
    isLoading,
    error,
    createRecoveryPlan,
    completeRecoveryTask,
    dismissRecoveryPlan,
  };
}
