import { toLocalISODate } from "@/src/shared/lib/dates";
import { supabase } from "@/src/shared/lib/supabase";
import type { Mood } from "@/src/features/companion/lines";

/** Ánimo de hoy (fecha local, no UTC) o null si aún no hizo el check-in. */
export async function fetchTodayMood(userId: string): Promise<Mood | null> {
  const { data, error } = await supabase
    .from("mood_logs")
    .select("mood")
    .eq("user_id", userId)
    .eq("logged_date", toLocalISODate(new Date()))
    .maybeSingle();
  if (error) throw error;
  return (data?.mood as Mood | undefined) ?? null;
}

/** Guarda o corrige el check-in de hoy (uno por día, como la pantalla de Ánimo). */
export async function saveTodayMood(userId: string, mood: Mood): Promise<void> {
  const { error } = await supabase
    .from("mood_logs")
    .upsert(
      { user_id: userId, mood, logged_date: toLocalISODate(new Date()) },
      { onConflict: "user_id,logged_date" },
    );
  if (error) throw error;
}
