import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { isExpoGo } from "@/lib/env";
import { reportError } from "@/src/shared/lib/observability/reportError";
import { supabase } from "@/src/shared/lib/supabase";

const KEY = {
  enabled: "duo:quiet_enabled",
  start: "duo:quiet_start",
  end: "duo:quiet_end",
} as const;

export type QuietHours = { enabled: boolean; start: number; end: number };

export async function loadQuietHours(): Promise<QuietHours> {
  const [enabled, start, end] = await Promise.all([
    AsyncStorage.getItem(KEY.enabled),
    AsyncStorage.getItem(KEY.start),
    AsyncStorage.getItem(KEY.end),
  ]);
  return {
    enabled: enabled !== "false",
    start: start === null ? 22 : Number(start),
    end: end === null ? 7 : Number(end),
  };
}

export async function saveQuietHours(next: QuietHours): Promise<void> {
  await AsyncStorage.multiSet([
    [KEY.enabled, String(next.enabled)],
    [KEY.start, String(next.start)],
    [KEY.end, String(next.end)],
  ]);
  await registerDuoPush();
}

/** Registra el token de esta persona (solo si ya concedió el permiso; nunca lo pide por su cuenta). */
export async function registerDuoPush(): Promise<void> {
  if (isExpoGo) return;
  try {
    const Notifications = await import("expo-notifications");
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") return;

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("duo", {
        name: "Mochi Duo",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    const { data: token } = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    const quiet = await loadQuietHours();
    const { error } = await supabase.rpc("register_push_token", {
      p_token: token,
      p_platform: Platform.OS,
      p_tz_offset_min: -new Date().getTimezoneOffset(),
      p_quiet_enabled: quiet.enabled,
      p_quiet_start: quiet.start,
      p_quiet_end: quiet.end,
    });
    if (error) throw error;
  } catch (error) {
    reportError(error, { scope: "duo/register-push" });
  }
}

/** Avisa a su pareja de un vale nuevo. Es un extra: si falla, el vale ya existe. */
export async function notifyVoucherGift(voucherId: string): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke("duo-push", { body: { voucherId } });
    if (error) throw error;
  } catch (error) {
    reportError(error, { scope: "duo/notify-voucher" });
  }
}
