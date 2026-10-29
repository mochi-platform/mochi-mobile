import { saveDuoWidget } from "@/src/shared/lib/homeWidgetSummary";
import { reportError } from "@/src/shared/lib/observability/reportError";
import { loadDuo, type DuoState } from "./api";

/** Datos del widget de Duo a partir del estado ya cargado. */
export function duoWidgetFrom(state: DuoState, userId: string) {
  const space = state.space;
  const partner = space ? (space.isOwner ? space.partner : space.owner) : null;
  return {
    hasPartner: Boolean(partner && space?.inviteStatus === "accepted"),
    partnerName: partner?.name ?? "tu pareja",
    note: state.notes.find((n) => n.authorId !== userId)?.content ?? "",
    mood: state.checkins.find((c) => c.userId !== userId)?.mood ?? 0,
  };
}

/**
 * Refresca el widget de Duo sin abrir la pestaña: se llama al abrir la app y al volver a ella.
 * Los widgets no consultan la red por su cuenta; muestran lo último que la app les mandó.
 */
export async function refreshDuoWidget(userId: string): Promise<void> {
  try {
    await saveDuoWidget(duoWidgetFrom(await loadDuo(userId), userId));
  } catch (error) {
    reportError(error, { scope: "duo/widget-refresh" });
  }
}
