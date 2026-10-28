import { supabase } from "@/src/shared/lib/supabase";

export type GoalItem = {
  id: string;
  title: string;
  description: string | null;
  targetDate: string | null;
  progress: number;
  completed: boolean;
};

const clamp = (v: number) => Math.min(100, Math.max(0, Math.round(v)));

export async function fetchGoals(userId: string): Promise<GoalItem[]> {
  const { data, error } = await supabase
    .from("goals")
    .select("id, title, description, target_date, progress, is_completed")
    .eq("user_id", userId)
    .order("is_completed", { ascending: true })
    .order("target_date", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((g) => ({
    id: g.id,
    title: g.title,
    description: g.description,
    targetDate: g.target_date,
    progress: clamp(g.progress ?? (g.is_completed ? 100 : 0)),
    completed: g.is_completed,
  }));
}

export type GoalDraft = {
  title: string;
  description: string;
  targetDate: string;
  progress: number;
};

export async function createGoal(userId: string, draft: GoalDraft): Promise<void> {
  const { error } = await supabase.from("goals").insert({
    user_id: userId,
    title: draft.title.trim(),
    description: draft.description.trim() || null,
    target_date: draft.targetDate.trim() || null,
    color: "purple",
    progress: 0,
    is_completed: false,
  });
  if (error) throw error;
}

/** Guarda cambios; al llegar a 100 % la meta queda cumplida. Devuelve si se acaba de cumplir. */
export async function updateGoal(
  userId: string,
  goal: GoalItem,
  draft: GoalDraft,
): Promise<boolean> {
  const progress = clamp(draft.progress);
  const completed = progress >= 100;
  const { error } = await supabase
    .from("goals")
    .update({
      title: draft.title.trim(),
      description: draft.description.trim() || null,
      target_date: draft.targetDate.trim() || null,
      progress,
      is_completed: completed,
    })
    .eq("id", goal.id)
    .eq("user_id", userId);
  if (error) throw error;
  return completed && !goal.completed;
}

export async function deleteGoal(userId: string, goalId: string): Promise<void> {
  const { error } = await supabase.from("goals").delete().eq("id", goalId).eq("user_id", userId);
  if (error) throw error;
}
