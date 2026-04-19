import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { isExpoGo } from "@/lib/env";

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

async function syncIOSWidgetSnapshot(
  payload: HomeWidgetSummaryPayload,
): Promise<void> {
  if (Platform.OS !== "ios" || isExpoGo) {
    return;
  }

  try {
    const widgetModule = await import("@/src/shared/widgets/mochiSummaryWidget");
    widgetModule.mochiSummaryWidget.updateSnapshot({
      points: payload.points,
      streak: payload.streak,
      nextBlock: payload.nextBlock,
      updatedAtLabel: formatUpdatedLabel(payload.updatedAt),
    });
    widgetModule.mochiSummaryWidget.reload();
  } catch (error) {
    console.warn(
      "[HomeWidget] no se pudo sincronizar el widget nativo:",
      error instanceof Error ? error.message : String(error),
    );
  }
}

export async function saveHomeWidgetSummary(
  payload: HomeWidgetSummaryPayload,
): Promise<void> {
  await AsyncStorage.setItem(
    buildHomeWidgetKey(payload.userId),
    JSON.stringify(payload),
  );
  await syncIOSWidgetSnapshot(payload);
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
