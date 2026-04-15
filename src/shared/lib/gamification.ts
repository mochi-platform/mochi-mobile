import { supabase } from "@/src/shared/lib/supabase";
import { getMochiLevel } from "@mochi/supabase/levels";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type UnlockedAchievement = {
  title: string;
  description: string;
  points: number;
  icon?: string;
};

type OnUnlock = (achievement: UnlockedAchievement) => void;

type EngagementEventName = "study_session_completed" | "exam_result_logged";

interface TrackEngagementEventInput {
  userId: string;
  eventName: EngagementEventName;
  eventKey: string;
  sourceTable?: string;
  sourceId?: string;
  payload: Record<string, unknown>;
  context?: Record<string, unknown>;
  occurredAt?: string;
  eventVersion?: number;
}

/**
 * Registra un evento de engagement con idempotencia por user_id + event_key.
 */
export async function trackEngagementEvent({
  userId,
  eventName,
  eventKey,
  sourceTable,
  sourceId,
  payload,
  context,
  occurredAt,
  eventVersion = 1,
}: TrackEngagementEventInput): Promise<"created" | "duplicate"> {
  const { data, error } = await supabase
    .from("engagement_events")
    .upsert(
      {
        user_id: userId,
        event_name: eventName,
        event_version: eventVersion,
        event_key: eventKey,
        source_table: sourceTable ?? null,
        source_id: sourceId ?? null,
        payload,
        context: context ?? {},
        occurred_at: occurredAt ?? new Date().toISOString(),
      },
      {
        onConflict: "user_id,event_key",
        ignoreDuplicates: true,
      },
    )
    .select("id");

  if (error) {
    throw error;
  }

  return data && data.length > 0 ? "created" : "duplicate";
}

// ─── Puntos ───────────────────────────────────────────────────────────────────

export async function addPoints(
  userId: string,
  points: number,
  onLevelUp?: OnUnlock,
): Promise<void> {
  const { data: beforeProfile } = await supabase
    .from("profiles")
    .select("total_points")
    .eq("id", userId)
    .maybeSingle<{ total_points: number }>();

  const previousPoints = beforeProfile?.total_points ?? 0;
  const previousLevel = getMochiLevel(previousPoints);

  await supabase.rpc("increment_points", { user_id: userId, points });

  const { data: afterProfile } = await supabase
    .from("profiles")
    .select("total_points")
    .eq("id", userId)
    .maybeSingle<{ total_points: number }>();

  const nextPoints = afterProfile?.total_points ?? previousPoints + points;
  const nextLevel = getMochiLevel(nextPoints);

  if (nextLevel.level > previousLevel.level && onLevelUp) {
    onLevelUp({
      title: `¡Subiste a ${nextLevel.name}!`,
      description: `Alcanzaste el nivel ${nextLevel.level}`,
      points: 0,
      icon: "trophy",
    });
  }
}

// ─── Desbloqueo de logros ─────────────────────────────────────────────────────

/**
 * Intenta desbloquear un logro por su key.
 * Retorna los datos del logro si fue NUEVO (primera vez que se desbloquea).
 * Retorna null si ya estaba desbloqueado o si no existe.
 */
export async function unlockAchievement(
  userId: string,
  achievementKey: string,
): Promise<UnlockedAchievement | null> {
  // 1. Buscar el logro
  const { data: achievement, error: achError } = await supabase
    .from("achievements")
    .select("id, title, description, points, icon")
    .eq("key", achievementKey)
    .single();

  if (achError || !achievement) return null;

  // 2. Intentar insertar — si ya existe, ignoreDuplicates lo descarta
  const { data: inserted, error: insertError } = await supabase
    .from("user_achievements")
    .upsert(
      { user_id: userId, achievement_id: achievement.id },
      { onConflict: "user_id,achievement_id", ignoreDuplicates: true },
    )
    .select("id");

  if (insertError) return null;

  // upsert con ignoreDuplicates retorna [] si ya existía, [row] si fue nuevo
  const wasNew = Array.isArray(inserted) && inserted.length > 0;
  if (!wasNew) return null;

  return {
    title: achievement.title,
    description: achievement.description,
    points: achievement.points,
    icon: achievement.icon ?? undefined,
  };
}

// ─── Recuperación de Racha ───────────────────────────────────────────────────

/**
 * Crea un plan de recuperación de racha cuando la racha se rompe (streak = 0).
 * Este plan sugiere 3 tareas para los próximos 3 días.
 */
export async function createStreakRecoveryPlan(
  userId: string,
): Promise<string | null> {
  try {
    const recoveryTasks = [
      {
        day: 1,
        description:
          "Haz una pequeña actividad: 15 min de estudio o una rutina corta",
        difficulty: "easy" as const,
      },
      {
        day: 2,
        description:
          "Completa una meta diaria: 30 min de estudio o una rutina completa",
        difficulty: "medium" as const,
      },
      {
        day: 3,
        description: "Vuelve a tu rutina normal con toda la energía",
        difficulty: "hard" as const,
      },
    ];

    const { data, error } = await supabase
      .from("streak_recovery_plans")
      .insert({
        user_id: userId,
        recovery_tasks: recoveryTasks,
        is_active: true,
        completed_tasks: 0,
      })
      .select("id");

    if (error) {
      console.error("Error creating recovery plan:", error);
      return null;
    }

    return (data?.[0] as { id: string })?.id ?? null;
  } catch (err) {
    console.error("Error creating recovery plan:", err);
    return null;
  }
}

// ─── Helper interno ───────────────────────────────────────────────────────────

/**
 * Desbloquea y notifica si fue nuevo.
 */
async function tryUnlock(
  userId: string,
  key: string,
  onUnlock?: OnUnlock,
): Promise<void> {
  const result = await unlockAchievement(userId, key);
  if (result && onUnlock) onUnlock(result);
}

// ─── Checks por categoría ─────────────────────────────────────────────────────

export async function checkStudyAchievements(
  userId: string,
  onUnlock?: OnUnlock,
): Promise<void> {
  const { count } = await supabase
    .from("study_sessions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);
  const sessionCount = count ?? 0;
  if (sessionCount >= 1) await tryUnlock(userId, "first_study", onUnlock);
  if (sessionCount >= 10) await tryUnlock(userId, "study_10", onUnlock);
}

export async function checkExerciseAchievements(
  userId: string,
  onUnlock?: OnUnlock,
): Promise<void> {
  const { count: totalCount } = await supabase
    .from("routine_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);
  if ((totalCount ?? 0) >= 1)
    await tryUnlock(userId, "first_routine", onUnlock);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const { count: weekCount } = await supabase
    .from("routine_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("completed_at", sevenDaysAgo.toISOString());
  if ((weekCount ?? 0) >= 7) await tryUnlock(userId, "routine_7", onUnlock);
}

export async function checkStreakAchievements(
  userId: string,
  onUnlock?: OnUnlock,
): Promise<void> {
  const { data } = await supabase
    .from("streaks")
    .select("current_streak")
    .eq("user_id", userId)
    .single();
  const streak = data?.current_streak ?? 0;
  if (streak >= 3) await tryUnlock(userId, "streak_3", onUnlock);
  if (streak >= 7) await tryUnlock(userId, "streak_7", onUnlock);
  if (streak >= 30) await tryUnlock(userId, "streak_30", onUnlock);
  if (streak >= 365) await tryUnlock(userId, "streak_365", onUnlock);
}

// ─── Logros de Cocina ─────────────────────────────────────────────────────────

export async function checkCookingRecipeAchievements(
  userId: string,
  onUnlock?: OnUnlock,
): Promise<void> {
  const { count } = await supabase
    .from("recipes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  const total = count ?? 0;
  if (total >= 1) await tryUnlock(userId, "first_recipe", onUnlock);
  if (total >= 5) await tryUnlock(userId, "recipes_5", onUnlock);
  if (total >= 10) await tryUnlock(userId, "recipes_10", onUnlock);
}

export async function checkCookingSessionAchievements(
  userId: string,
  onUnlock?: OnUnlock,
): Promise<void> {
  const { count: totalSessions } = await supabase
    .from("recipe_cook_sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_finished", true);

  if ((totalSessions ?? 0) >= 1)
    await tryUnlock(userId, "first_cook", onUnlock);

  const { data: distinctRecipes } = await supabase
    .from("recipe_cook_sessions")
    .select("recipe_id")
    .eq("user_id", userId)
    .eq("is_finished", true);

  const uniqueRecipes = new Set(
    (distinctRecipes ?? []).map((s) => s.recipe_id),
  );
  if (uniqueRecipes.size >= 3)
    await tryUnlock(userId, "cook_streak_3", onUnlock);
}

export async function checkPerfectRecipeAchievement(
  userId: string,
  onUnlock?: OnUnlock,
): Promise<void> {
  const { count } = await supabase
    .from("recipe_cook_sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("rating", 5);

  if ((count ?? 0) >= 1) await tryUnlock(userId, "perfect_recipe", onUnlock);
}

export async function checkFavoriteRecipeAchievement(
  userId: string,
  onUnlock?: OnUnlock,
): Promise<void> {
  const { count } = await supabase
    .from("recipes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_favorite", true);

  if ((count ?? 0) >= 1) await tryUnlock(userId, "favorite_recipe", onUnlock);
}

// ─── Streak ───────────────────────────────────────────────────────────────────

export async function updateStreak(userId: string): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  const { data: existing } = await supabase
    .from("streaks")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (!existing) {
    await supabase.from("streaks").insert({
      user_id: userId,
      current_streak: 1,
      longest_streak: 1,
      last_activity_date: today,
    });
    return;
  }

  if (existing.last_activity_date === today) return;

  let newStreak = 1;
  if (existing.last_activity_date === yesterdayStr) {
    newStreak = existing.current_streak + 1;
  }
  const newLongest = Math.max(newStreak, existing.longest_streak);

  await supabase
    .from("streaks")
    .update({
      current_streak: newStreak,
      longest_streak: newLongest,
      last_activity_date: today,
    })
    .eq("user_id", userId);
}
