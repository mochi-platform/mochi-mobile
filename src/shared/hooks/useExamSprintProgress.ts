import { reportError } from "@/src/shared/lib/observability/reportError";
import { useEffect, useState } from "react";
import { supabase } from "@/src/shared/lib/supabase";
import type { ExamSprintProgress } from "@mochi/supabase/types";

export function useExamSprintProgress(sprintId: string) {
  const [progressEntries, setProgressEntries] = useState<ExamSprintProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProgress = async () => {
    try {
      setIsLoading(true);

      const { data, error: fetchError } = await supabase
        .from("exam_sprint_progress")
        .select("*")
        .eq("sprint_id", sprintId)
        .order("progress_date", { ascending: true });

      if (fetchError && fetchError.code !== "PGRST116") {
        throw fetchError;
      }

      setProgressEntries((data as ExamSprintProgress[]) ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Error fetching progress"));
      reportError(err, { scope: "useExamSprintProgress" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchProgress();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- las dependencias omitidas son estables o se excluyen a propósito para no reiniciar el efecto
  }, [sprintId]);

  const logProgress = async (
    userId: string,
    progressDate: string,
    hoursStudied: number,
    moodRating: number | null,
    notes: string | null,
    isDayCompleted: boolean,
  ) => {
    try {
      const { data, error } = await supabase
        .from("exam_sprint_progress")
        .insert({
          user_id: userId,
          sprint_id: sprintId,
          progress_date: progressDate,
          hours_studied: hoursStudied,
          mood_rating: moodRating,
          notes,
          is_day_completed: isDayCompleted,
        })
        .select();

      if (error) throw error;

      // Refresh progress list
      void fetchProgress();

      return data;
    } catch (err) {
      reportError(err, { scope: "useExamSprintProgress" });
      throw err;
    }
  };

  const updateProgressEntry = async (progressId: string, updates: Partial<ExamSprintProgress>) => {
    try {
      const { error } = await supabase
        .from("exam_sprint_progress")
        .update(updates)
        .eq("id", progressId);

      if (error) throw error;

      // Refresh progress list
      void fetchProgress();
    } catch (err) {
      reportError(err, { scope: "useExamSprintProgress" });
      throw err;
    }
  };

  return {
    progressEntries,
    isLoading,
    error,
    logProgress,
    updateProgressEntry,
  };
}
