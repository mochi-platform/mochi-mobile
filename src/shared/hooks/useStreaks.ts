import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/src/core/providers/SessionContext";
import { supabase } from "@/src/shared/lib/supabase";
import type { Streak } from "@mochi/supabase/types";

export function useStreaks() {
  const { session } = useSession();
  const userId = session?.user.id;

  const { data, isLoading, error } = useQuery({
    queryKey: ["streaks", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data: streak, error: streakError } = await supabase
        .from("streaks")
        .select("*")
        .eq("user_id", userId!)
        .maybeSingle();
      if (streakError && streakError.code !== "PGRST116") throw streakError;
      return (streak as Streak | null) ?? null;
    },
  });

  return {
    currentStreak: data?.current_streak ?? 0,
    longestStreak: data?.longest_streak ?? 0,
    isLoading: Boolean(userId) && isLoading,
    error: error instanceof Error ? error : null,
  };
}
