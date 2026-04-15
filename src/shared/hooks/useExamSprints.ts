import { useEffect, useState } from "react";
import { supabase } from "@/src/shared/lib/supabase";
import type {
  ExamPrepSprint,
  ExamSprintMilestone,
} from "@mochi/supabase/types";

interface SprintWithMilestones extends ExamPrepSprint {
  milestones: ExamSprintMilestone[];
}

export function useExamSprints(userId: string | undefined) {
  const [sprints, setSprints] = useState<SprintWithMilestones[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSprints = async () => {
    if (!userId) {
      setSprints([]);
      return;
    }

    try {
      setIsLoading(true);

      const { data: sprintsData, error: sprintsError } = await supabase
        .from("exam_prep_sprints")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (sprintsError && sprintsError.code !== "PGRST116") {
        throw sprintsError;
      }

      if (!sprintsData) {
        setSprints([]);
        return;
      }

      // Fetch milestones for each sprint
      const sprintsWithMilestones: SprintWithMilestones[] = await Promise.all(
        (sprintsData as ExamPrepSprint[]).map(async (sprint) => {
          const { data: milestonesData, error: milestonesError } =
            await supabase
              .from("exam_sprint_milestones")
              .select("*")
              .eq("sprint_id", sprint.id)
              .order("milestone_number", { ascending: true });

          if (milestonesError && milestonesError.code !== "PGRST116") {
            throw milestonesError;
          }

          return {
            ...sprint,
            milestones: (milestonesData as ExamSprintMilestone[]) ?? [],
          };
        }),
      );

      setSprints(sprintsWithMilestones);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Error fetching sprints"),
      );
      console.error("useExamSprints error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchSprints();
  }, [userId]);

  const createSprint = async (
    examId: string,
    startDate: string,
    endDate: string,
    dailyHours: number,
    targetGrade: number | null,
  ) => {
    if (!userId) throw new Error("User not authenticated");

    try {
      const { data, error } = await supabase
        .from("exam_prep_sprints")
        .insert({
          user_id: userId,
          exam_id: examId,
          start_date: startDate,
          end_date: endDate,
          daily_target_hours: dailyHours,
          target_grade: targetGrade,
        })
        .select();

      if (error) throw error;

      // Refresh sprints list
      void fetchSprints();

      return (data as ExamPrepSprint[])[0];
    } catch (err) {
      console.error("Error creating sprint:", err);
      throw err;
    }
  };

  const updateSprint = async (
    sprintId: string,
    updates: Partial<ExamPrepSprint>,
  ) => {
    try {
      const { error } = await supabase
        .from("exam_prep_sprints")
        .update(updates)
        .eq("id", sprintId);

      if (error) throw error;

      // Refresh sprints list
      void fetchSprints();
    } catch (err) {
      console.error("Error updating sprint:", err);
      throw err;
    }
  };

  const deleteSprint = async (sprintId: string) => {
    try {
      const { error } = await supabase
        .from("exam_prep_sprints")
        .delete()
        .eq("id", sprintId);

      if (error) throw error;

      // Refresh sprints list
      void fetchSprints();
    } catch (err) {
      console.error("Error deleting sprint:", err);
      throw err;
    }
  };

  return {
    sprints,
    isLoading,
    error,
    createSprint,
    updateSprint,
    deleteSprint,
  };
}
