import { useEffect, useState } from "react";
import { supabase } from "@/src/shared/lib/supabase";
import type { Streak } from "@mochi/supabase/types";

export function useStreaks() {
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setIsLoading(true);

        const user = await supabase.auth.getUser();
        const userId = user.data?.user?.id;

        if (!userId) {
          setCurrentStreak(0);
          setLongestStreak(0);
          return;
        }

        const { data: streakData, error: streakError } = await supabase
          .from("streaks")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();

        if (streakError && streakError.code !== "PGRST116") {
          throw streakError;
        }

        const streak = streakData as Streak;
        setCurrentStreak(streak?.current_streak ?? 0);
        setLongestStreak(streak?.longest_streak ?? 0);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Error fetching streaks"),
        );
        console.error(
          "[useStreaks] error cargando rachas:",
          err instanceof Error ? err.message : String(err),
        );
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  return { currentStreak, longestStreak, isLoading, error };
}
