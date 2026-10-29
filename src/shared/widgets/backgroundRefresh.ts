import * as BackgroundTask from "expo-background-task";
import * as TaskManager from "expo-task-manager";
import { refreshDuoWidget } from "@/src/features/duo/widget";
import { formatTimeHHMM } from "@/src/features/home/dashboard/helpers";
import { toLocalISODate } from "@/src/shared/lib/dates";
import { saveHomeWidgetSummary } from "@/src/shared/lib/homeWidgetSummary";
import { reportError } from "@/src/shared/lib/observability/reportError";
import { supabase } from "@/src/shared/lib/supabase";

export const WIDGET_REFRESH_TASK = "mochi-widget-refresh";

/** Lo mínimo que muestran Resumen y Racha, sin montar la pantalla Hoy. */
async function refreshSummaryWidgets(userId: string): Promise<void> {
  const now = new Date();
  const todayISO = toLocalISODate(now);
  const [blocksRes, habitsRes, logsRes, streakRes, profileRes] = await Promise.all([
    supabase
      .from("study_blocks")
      .select("subject, start_time")
      .eq("user_id", userId)
      .eq("day_of_week", now.getDay())
      .order("start_time", { ascending: true }),
    supabase.from("habits").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase
      .from("habit_logs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("log_date", todayISO),
    supabase.from("streaks").select("current_streak").eq("user_id", userId).maybeSingle(),
    supabase
      .from("profiles")
      .select("total_points")
      .eq("id", userId)
      .maybeSingle<{ total_points: number }>(),
  ]);
  const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const blocks = (blocksRes.data ?? []) as { subject: string; start_time: string }[];
  // De noche ya no sirve «el primer bloque del día»: se muestra el siguiente que falta.
  const next = blocks.find((b) => b.start_time.slice(0, 5) >= hhmm);
  await saveHomeWidgetSummary({
    userId,
    points: profileRes.data?.total_points ?? 0,
    streak: (streakRes.data as { current_streak: number } | null)?.current_streak ?? 0,
    nextBlock: next ? `${next.subject} ${formatTimeHHMM(next.start_time)}` : "Día libre",
    updatedAt: now.toISOString(),
    habitsDone: logsRes.count ?? 0,
    habitsTotal: habitsRes.count ?? 0,
  });
}

// Debe definirse al cargar el módulo (también en el arranque sin interfaz del sistema).
TaskManager.defineTask(WIDGET_REFRESH_TASK, async () => {
  try {
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id;
    if (!userId) return BackgroundTask.BackgroundTaskResult.Success;
    await refreshSummaryWidgets(userId);
    const { data: settings } = await supabase
      .from("user_settings")
      .select("partner_features_enabled")
      .eq("user_id", userId)
      .maybeSingle<{ partner_features_enabled: boolean }>();
    if (settings?.partner_features_enabled) await refreshDuoWidget(userId);
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (error) {
    reportError(error, { scope: "widgets/background" });
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

/** Pide a Android refrescar los widgets cada ~30 min (el sistema decide el momento exacto). */
export async function registerWidgetRefresh(): Promise<void> {
  try {
    const status = await BackgroundTask.getStatusAsync();
    if (status !== BackgroundTask.BackgroundTaskStatus.Available) return;
    if (await TaskManager.isTaskRegisteredAsync(WIDGET_REFRESH_TASK)) return;
    await BackgroundTask.registerTaskAsync(WIDGET_REFRESH_TASK, { minimumInterval: 30 });
  } catch (error) {
    reportError(error, { scope: "widgets/register" });
  }
}

export async function unregisterWidgetRefresh(): Promise<void> {
  try {
    if (await TaskManager.isTaskRegisteredAsync(WIDGET_REFRESH_TASK))
      await BackgroundTask.unregisterTaskAsync(WIDGET_REFRESH_TASK);
  } catch (error) {
    reportError(error, { scope: "widgets/unregister" });
  }
}
