import { toLocalISODate } from "@/src/shared/lib/dates";
import { supabase } from "@/src/shared/lib/supabase";

/** Un día del diario: ánimo y gratitud juntos, como los vive la usuaria. */
export type DiaryDay = {
  date: string;
  mood: number | null;
  text: string | null;
};

type MoodRow = { logged_date: string | null; mood: number; note: string | null };
type GratitudeRow = {
  logged_date: string | null;
  entry_1: string;
  entry_2: string | null;
  entry_3: string | null;
};

/** Une ánimo y gratitud por fecha, de la más reciente a la más antigua. Puro y testeable. */
export function mergeDiary(moods: MoodRow[], gratitude: GratitudeRow[], limit = 10): DiaryDay[] {
  const days = new Map<string, DiaryDay>();
  const day = (date: string) => {
    const existing = days.get(date);
    if (existing) return existing;
    const created: DiaryDay = { date, mood: null, text: null };
    days.set(date, created);
    return created;
  };
  for (const m of moods) {
    if (!m.logged_date) continue;
    const d = day(m.logged_date);
    d.mood = m.mood;
    if (m.note?.trim()) d.text = m.note.trim();
  }
  for (const g of gratitude) {
    if (!g.logged_date) continue;
    const entries = [g.entry_1, g.entry_2, g.entry_3].map((e) => e?.trim()).filter(Boolean);
    if (entries.length === 0) continue;
    const d = day(g.logged_date);
    const thanks = `Agradezco ${entries.map((e) => (e as string).replace(/^agradezco\s+/i, "")).join(", ")}.`;
    d.text = d.text ? `${d.text} ${thanks}` : thanks;
  }
  return [...days.values()].sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
}

export async function fetchDiary(userId: string): Promise<DiaryDay[]> {
  const since = new Date();
  since.setDate(since.getDate() - 30);
  const from = toLocalISODate(since);
  const [moods, gratitude] = await Promise.all([
    supabase.from("mood_logs").select("logged_date, mood, note").eq("user_id", userId).gte("logged_date", from),
    supabase
      .from("gratitude_logs")
      .select("logged_date, entry_1, entry_2, entry_3")
      .eq("user_id", userId)
      .gte("logged_date", from),
  ]);
  if (moods.error) throw moods.error;
  if (gratitude.error) throw gratitude.error;
  return mergeDiary(moods.data ?? [], gratitude.data ?? []);
}

/** «Hoy», «Ayer» o «lunes 26». */
export function diaryDateLabel(date: string, today: Date = new Date()): string {
  const todayKey = toLocalISODate(today);
  const y = new Date(today);
  y.setDate(y.getDate() - 1);
  if (date === todayKey) return "Hoy";
  if (date === toLocalISODate(y)) return "Ayer";
  const [yy, mm, dd] = date.split("-").map(Number);
  return new Date(yy, mm - 1, dd).toLocaleDateString("es-EC", { weekday: "long", day: "numeric" });
}
