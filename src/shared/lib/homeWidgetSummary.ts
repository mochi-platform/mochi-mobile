import { reportError } from "@/src/shared/lib/observability/reportError";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { isExpoGo } from "@/lib/env";
import { pickLine, WIDGET_LINES } from "@/src/features/companion/lines";
import { toLocalISODate } from "@/src/shared/lib/dates";

export type HomeWidgetSummaryPayload = {
  userId: string;
  points: number;
  streak: number;
  nextBlock: string;
  updatedAt: string;
};

const HOME_WIDGET_STORAGE_PREFIX = "widget:home-summary:";

function buildHomeWidgetKey(userId: string): string {
  return `${HOME_WIDGET_STORAGE_PREFIX}${userId}`;
}

function formatUpdatedLabel(dateISO: string): string {
  const date = new Date(dateISO);
  if (Number.isNaN(date.getTime())) {
    return "ahora";
  }

  return new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

async function syncWidgetSnapshot(payload: HomeWidgetSummaryPayload): Promise<void> {
  if ((Platform.OS !== "ios" && Platform.OS !== "android") || isExpoGo) {
    return;
  }

  try {
    // eslint-disable-next-line import/no-unresolved -- módulo con sufijo de plataforma (.ios/.android), lo resuelve Metro
    const widgetModule = await import("@/src/shared/widgets/mochiSummaryWidget");
    widgetModule.mochiSummaryWidget.updateSnapshot({
      points: payload.points,
      streak: payload.streak,
      nextBlock: payload.nextBlock,
      updatedAtLabel: formatUpdatedLabel(payload.updatedAt),
      line: pickLine(WIDGET_LINES, toLocalISODate(new Date())),
    });
    widgetModule.mochiSummaryWidget.reload();
  } catch (error) {
    reportError(error, { scope: "HomeWidget" });
  }
}

export async function saveHomeWidgetSummary(payload: HomeWidgetSummaryPayload): Promise<void> {
  await AsyncStorage.setItem(buildHomeWidgetKey(payload.userId), JSON.stringify(payload));
  await syncWidgetSnapshot(payload);
}

export async function loadHomeWidgetSummary(
  userId: string,
): Promise<HomeWidgetSummaryPayload | null> {
  const raw = await AsyncStorage.getItem(buildHomeWidgetKey(userId));
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<HomeWidgetSummaryPayload>;
    if (
      typeof parsed.userId !== "string" ||
      typeof parsed.points !== "number" ||
      typeof parsed.streak !== "number" ||
      typeof parsed.nextBlock !== "string" ||
      typeof parsed.updatedAt !== "string"
    ) {
      return null;
    }

    return parsed as HomeWidgetSummaryPayload;
  } catch {
    return null;
  }
}
