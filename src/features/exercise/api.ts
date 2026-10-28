import { supabase } from "@/src/shared/lib/supabase";

export type RoutineItem = {
  id: string;
  name: string;
  days: number[];
  exerciseCount: number;
  minutes: number;
};
export type ExerciseItem = {
  id: string;
  name: string;
  sets: number;
  reps: number;
  minutes: number;
  notes: string | null;
};

export async function fetchExercise(
  userId: string,
): Promise<{ routines: RoutineItem[]; exercises: ExerciseItem[] }> {
  const [exercises, routines] = await Promise.all([
    supabase
      .from("exercises")
      .select("id, name, sets, reps, duration_seconds, notes")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("routines")
      .select("id, name, days, routine_exercises (id, exercise:exercises (duration_seconds))")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
  ]);
  if (exercises.error) throw exercises.error;
  if (routines.error) throw routines.error;
  return {
    exercises: (exercises.data ?? []).map((e) => ({
      id: e.id,
      name: e.name,
      sets: e.sets ?? 0,
      reps: e.reps ?? 0,
      minutes: Math.ceil((e.duration_seconds ?? 0) / 60),
      notes: e.notes,
    })),
    routines: (routines.data ?? []).map((r) => {
      // PostgREST devuelve la relación como objeto; los tipos generados la ven como arreglo.
      type Rel = { duration_seconds: number | null };
      const items = (r.routine_exercises ?? []) as unknown as { exercise: Rel | Rel[] | null }[];
      const secondsOf = (rel: Rel | Rel[] | null) =>
        Array.isArray(rel) ? (rel[0]?.duration_seconds ?? 0) : (rel?.duration_seconds ?? 0);
      const seconds = items.reduce((sum, it) => sum + secondsOf(it.exercise), 0);
      return {
        id: r.id,
        name: r.name,
        days: (r.days ?? []) as number[],
        exerciseCount: items.length,
        minutes: Math.max(1, Math.ceil(seconds / 60)),
      };
    }),
  };
}

export async function deleteExercise(userId: string, id: string): Promise<void> {
  const { error } = await supabase.from("exercises").delete().eq("id", id).eq("user_id", userId);
  if (error) throw error;
}
