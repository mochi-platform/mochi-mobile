import { useEffect, useState } from "react";
import { supabase } from "@/src/shared/lib/supabase";
import type { MergedTask } from "@/src/shared/lib/plannerLogic";
import type { StudyBlock, Routine, Goal, Habit } from "@mochi/supabase/types";

export function useTodaysPlannedTasks() {
  const [tasks, setTasks] = useState<MergedTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setIsLoading(true);

        const user = await supabase.auth.getUser();
        const userId = user.data?.user?.id;

        if (!userId) {
          setTasks([]);
          setError(null);
          return;
        }

        // Get today's day of week (0 = Sunday, 6 = Saturday)
        const today = new Date().getDay();

        // Fetch study blocks for today
        const { data: studyBlocks, error: studyError } = await supabase
          .from("study_blocks")
          .select("*")
          .eq("user_id", userId)
          .eq("day_of_week", today);

        if (studyError && studyError.code !== "PGRST116") {
          throw studyError;
        }

        // Fetch routines for today
        const { data: routines, error: routinesError } = await supabase
          .from("routines")
          .select("*")
          .eq("user_id", userId);

        if (routinesError && routinesError.code !== "PGRST116") {
          throw routinesError;
        }

        // Filter routines by today's day of week
        const todaysRoutines =
          (routines as Routine[])?.filter((r) => r.days.includes(today)) ?? [];

        // Fetch goals
        const { data: goals, error: goalsError } = await supabase
          .from("goals")
          .select("*")
          .eq("user_id", userId)
          .eq("is_completed", false);

        if (goalsError && goalsError.code !== "PGRST116") {
          throw goalsError;
        }

        // Fetch habits for today
        const { data: habits, error: habitsError } = await supabase
          .from("habits")
          .select("*")
          .eq("user_id", userId);

        if (habitsError && habitsError.code !== "PGRST116") {
          throw habitsError;
        }

        // Merge all tasks
        const mergedTasks: MergedTask[] = [
          ...((studyBlocks as StudyBlock[])?.map((sb) => ({
            id: sb.id,
            type: "study" as const,
            title: sb.subject,
            description: `${sb.start_time}-${sb.end_time}`,
          })) ?? []),
          ...todaysRoutines.map((r) => ({
            id: r.id,
            type: "routine" as const,
            title: r.name,
          })),
          ...((goals as Goal[])?.map((g) => ({
            id: g.id,
            type: "goal" as const,
            title: g.title,
            description: g.description ?? undefined,
          })) ?? []),
          ...((habits as Habit[])?.map((h) => ({
            id: h.id,
            type: "habit" as const,
            title: h.name,
          })) ?? []),
        ];

        setTasks(mergedTasks);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Error fetching tasks"),
        );
        console.error("useTodaysPlannedTasks error:", err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  return { tasks, isLoading, error };
}
