import { toLocalISODate } from "@/src/shared/lib/dates";
import { supabase } from "@/src/shared/lib/supabase";

export type HabitItem = {
  id: string;
  name: string;
  icon: string;
  reminderEnabled: boolean;
};

export type HabitsData = {
  habits: HabitItem[];
  doneToday: Set<string>;
  /** Fechas (ISO local) de la última semana en que se cumplió cada hábito. */
  week: Map<string, Set<string>>;
};

/** Los últimos 7 días en fecha local, del más antiguo a hoy. */
export function last7Days(now: Date = new Date()): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (6 - i));
    return toLocalISODate(d);
  });
}

export async function fetchHabits(userId: string): Promise<HabitsData> {
  const days = last7Days();
  const today = days[6];
  const [habits, logs] = await Promise.all([
    supabase
      .from("habits")
      .select("id, name, icon, reminder_enabled")
      .eq("user_id", userId)
      .order("created_at", { ascending: true }),
    supabase
      .from("habit_logs")
      .select("habit_id, log_date")
      .eq("user_id", userId)
      .gte("log_date", days[0])
      .lte("log_date", today),
  ]);
  if (habits.error) throw habits.error;
  if (logs.error) throw logs.error;

  const week = new Map<string, Set<string>>();
  const doneToday = new Set<string>();
  for (const log of logs.data ?? []) {
    if (!week.has(log.habit_id)) week.set(log.habit_id, new Set());
    week.get(log.habit_id)?.add(log.log_date);
    if (log.log_date === today) doneToday.add(log.habit_id);
  }
  return {
    habits: (habits.data ?? []).map((h) => ({
      id: h.id,
      name: h.name,
      icon: h.icon ?? "leaf",
      reminderEnabled: h.reminder_enabled !== false,
    })),
    doneToday,
    week,
  };
}

export async function setHabitDone(userId: string, habitId: string, done: boolean): Promise<void> {
  const today = toLocalISODate(new Date());
  const { error } = done
    ? await supabase.from("habit_logs").insert({ user_id: userId, habit_id: habitId, log_date: today })
    : await supabase
        .from("habit_logs")
        .delete()
        .eq("user_id", userId)
        .eq("habit_id", habitId)
        .eq("log_date", today);
  if (error) throw error;
}

export async function createHabit(userId: string, name: string, icon: string): Promise<{ id: string; name: string }> {
  const { data, error } = await supabase
    .from("habits")
    .insert({ user_id: userId, name, icon, color: "pink" })
    .select("id, name")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteHabit(userId: string, habitId: string): Promise<void> {
  const { error } = await supabase.from("habits").delete().eq("id", habitId).eq("user_id", userId);
  if (error) throw error;
}

export async function setHabitReminder(habitId: string, enabled: boolean): Promise<void> {
  const { error } = await supabase.from("habits").update({ reminder_enabled: enabled }).eq("id", habitId);
  if (error) throw error;
}
