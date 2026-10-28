import { isExpoGo } from "@/lib/env";
import { toLocalISODate } from "@/src/shared/lib/dates";
import { addManualPeriodStart } from "@/src/shared/lib/manualCycle";
import { reportError } from "@/src/shared/lib/observability/reportError";

export const WIDGET_TARGET_PERIOD_TODAY = "period_today";

/** Acciones tocadas en el widget Android. El registro del ciclo se queda solo en el dispositivo. */
export async function handleWidgetTarget(
  target: string,
  onPeriodLogged?: () => void,
): Promise<void> {
  if (target !== WIDGET_TARGET_PERIOD_TODAY) return;
  try {
    await addManualPeriodStart(toLocalISODate(new Date()));
    onPeriodLogged?.();
  } catch (error) {
    reportError(error, { scope: "widget/period-today" });
  }
}

/** Escucha los toques del widget mientras la app está viva; devuelve la función para soltarla. */
export async function listenWidgetActions(onPeriodLogged?: () => void): Promise<() => void> {
  if (isExpoGo) return () => {};
  const { addUserInteractionListener } = await import("expo-widgets");
  const subscription = addUserInteractionListener((event) => {
    void handleWidgetTarget(event.target, onPeriodLogged);
  });
  return () => subscription.remove();
}
