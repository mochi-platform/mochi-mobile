import { toLocalISODate } from "@/src/shared/lib/dates";
import { supabase } from "@/src/shared/lib/supabase";

export type MoodEntry = { date: string; mood: number; note: string | null };
export type MoodData = { today: MoodEntry | null; energy: number | null; recent: MoodEntry[] };

export async function fetchMood(userId: string): Promise<MoodData> {
  const today = toLocalISODate(new Date());
  const since = new Date();
  since.setDate(since.getDate() - 13);
  const [recent, energy] = await Promise.all([
    supabase
      .from("mood_logs")
      .select("logged_date, mood, note")
      .eq("user_id", userId)
      .gte("logged_date", toLocalISODate(since))
      .order("logged_date", { ascending: false }),
    supabase
      .from("energy_levels")
      .select("overall_rating")
      .eq("user_id", userId)
      .eq("logged_date", today)
      .maybeSingle(),
  ]);
  if (recent.error) throw recent.error;
  const entries = (recent.data ?? [])
    .filter((r) => r.logged_date)
    .map((r) => ({ date: r.logged_date as string, mood: r.mood, note: r.note }));
  return {
    today: entries.find((e) => e.date === today) ?? null,
    energy: energy.data?.overall_rating ?? null,
    recent: entries,
  };
}

export async function saveMood(userId: string, mood: number, note: string, energy: number | null): Promise<void> {
  const today = toLocalISODate(new Date());
  const { error } = await supabase
    .from("mood_logs")
    .upsert({ user_id: userId, mood, note: note.trim() || null, logged_date: today }, { onConflict: "user_id,logged_date" });
  if (error) throw error;
  if (energy !== null) {
    const { error: energyError } = await supabase
      .from("energy_levels")
      .upsert({ user_id: userId, logged_date: today, overall_rating: energy, notes: null }, { onConflict: "user_id,logged_date" });
    if (energyError) throw energyError;
  }
}
