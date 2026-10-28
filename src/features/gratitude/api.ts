import { toLocalISODate } from "@/src/shared/lib/dates";
import { supabase } from "@/src/shared/lib/supabase";

export type GratitudeEntry = { date: string; items: string[] };

export async function fetchGratitude(userId: string): Promise<{ today: GratitudeEntry | null; history: GratitudeEntry[] }> {
  const { data, error } = await supabase
    .from("gratitude_logs")
    .select("logged_date, entry_1, entry_2, entry_3")
    .eq("user_id", userId)
    .order("logged_date", { ascending: false })
    .limit(8);
  if (error) throw error;
  const today = toLocalISODate(new Date());
  const entries = (data ?? [])
    .filter((r) => r.logged_date)
    .map((r) => ({
      date: r.logged_date as string,
      items: [r.entry_1, r.entry_2, r.entry_3].filter((t): t is string => Boolean(t?.trim())),
    }));
  return { today: entries.find((e) => e.date === today) ?? null, history: entries.filter((e) => e.date !== today) };
}

export async function saveGratitude(userId: string, items: string[]): Promise<void> {
  const [e1, e2, e3] = items.map((t) => t.trim());
  const { error } = await supabase.from("gratitude_logs").upsert(
    {
      user_id: userId,
      entry_1: e1,
      entry_2: e2 || null,
      entry_3: e3 || null,
      logged_date: toLocalISODate(new Date()),
    },
    { onConflict: "user_id,logged_date" },
  );
  if (error) throw error;
}
