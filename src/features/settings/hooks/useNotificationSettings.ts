import { useState } from "react";
import { Linking } from "react-native";
import type { useCustomAlert } from "@/src/shared/components/CustomAlert";
import {
  cancelAllNotifications,
  cancelAllStudyBlockReminders,
  cancelCookingReminder,
  cancelWeeklySummaryNotification,
  cancelHabitReminder,
  cancelMorningReminder,
  requestNotificationPermissions,
  scheduleHabitRemindersForHabits,
  scheduleWeeklySummaryNotification,
  saveNotificationPrefs,
  scheduleCookingReminder,
  scheduleMorningReminder,
  scheduleStudyBlockReminders,
  type NotificationPrefs,
} from "@/src/shared/lib/notifications";
import type { StudyBlock } from "@/src/shared/types/database";
import type { HabitNotificationTarget } from "../types";

type UseNotificationSettingsParams = {
  wakeUpTime: string | null;
  studyBlocks: StudyBlock[];
  habitTargets: HabitNotificationTarget[];
  showAlert: ReturnType<typeof useCustomAlert>["showAlert"];
};

export function useNotificationSettings({
  wakeUpTime,
  studyBlocks,
  habitTargets,
  showAlert,
}: UseNotificationSettingsParams) {
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>({
    enabled: false,
    morningEnabled: true,
    studyEnabled: true,
    habitEnabled: true,
    weeklyEnabled: false,
    habitTime: "21:00",
    cookingEnabled: false,
    cookingTime: "19:00",
  });
  const [permissionStatus, setPermissionStatus] = useState<string>("undetermined");
  const [showHabitTimePicker, setShowHabitTimePicker] = useState(false);
  const [showCookingTimePicker, setShowCookingTimePicker] = useState(false);
  const [habitNotificationMap, setHabitNotificationMap] = useState<Record<string, boolean>>({});
  const [savingNotif, setSavingNotif] = useState(false);

  const handleToggleNotifications = async (value: boolean) => {
    if (value && permissionStatus !== "granted") {
      const status = await requestNotificationPermissions();
      setPermissionStatus(status);

      if (status !== "granted") {
        showAlert({
          title: "Permiso requerido",
          message: "Para recibir notificaciones, actívalas en los ajustes de tu dispositivo.",
          buttons: [
            { text: "Cancelar", style: "cancel" },
            {
              text: "Abrir ajustes",
              style: "default",
              onPress: () => {
                void Linking.openSettings();
              },
            },
          ],
        });
        return;
      }
    }

    setSavingNotif(true);
    try {
      const updated = { ...notifPrefs, enabled: value };
      setNotifPrefs(updated);
      await saveNotificationPrefs({ enabled: value });

      if (!value) {
        await cancelAllNotifications();
        return;
      }

      const morningTime = wakeUpTime ?? "06:00";
      if (updated.morningEnabled) await scheduleMorningReminder(morningTime);
      if (updated.studyEnabled) await scheduleStudyBlockReminders(studyBlocks);
      if (updated.habitEnabled) {
        await scheduleHabitRemindersForHabits(
          habitTargets,
          updated.habitTime,
          habitNotificationMap,
        );
      }
      if (updated.weeklyEnabled) await scheduleWeeklySummaryNotification();
      if (updated.cookingEnabled) await scheduleCookingReminder(updated.cookingTime);
    } catch {
      setNotifPrefs((prev) => ({ ...prev, enabled: !value }));
    } finally {
      setSavingNotif(false);
    }
  };

  const handleToggleMorning = async (value: boolean) => {
    const updated = { ...notifPrefs, morningEnabled: value };
    setNotifPrefs(updated);
    await saveNotificationPrefs({ morningEnabled: value });

    if (!notifPrefs.enabled) return;
    if (value) {
      await scheduleMorningReminder(wakeUpTime ?? "06:00");
    } else {
      await cancelMorningReminder();
    }
  };

  const handleToggleStudyReminders = async (value: boolean) => {
    setSavingNotif(true);
    try {
      const updated = { ...notifPrefs, studyEnabled: value };
      setNotifPrefs(updated);
      await saveNotificationPrefs({ studyEnabled: value });

      if (!notifPrefs.enabled) return;
      if (value) {
        await scheduleStudyBlockReminders(studyBlocks);
      } else {
        await cancelAllStudyBlockReminders();
      }
    } finally {
      setSavingNotif(false);
    }
  };

  const handleToggleHabitReminder = async (value: boolean) => {
    const updated = { ...notifPrefs, habitEnabled: value };
    setNotifPrefs(updated);
    await saveNotificationPrefs({ habitEnabled: value });

    if (!notifPrefs.enabled) return;
    if (value) {
      await scheduleHabitRemindersForHabits(
        habitTargets,
        notifPrefs.habitTime,
        habitNotificationMap,
      );
    } else {
      await cancelHabitReminder();
    }
  };

  const handleToggleWeeklySummary = async (value: boolean) => {
    const updated = { ...notifPrefs, weeklyEnabled: value };
    setNotifPrefs(updated);
    await saveNotificationPrefs({ weeklyEnabled: value });

    if (!notifPrefs.enabled) return;
    if (value) {
      await scheduleWeeklySummaryNotification();
    } else {
      await cancelWeeklySummaryNotification();
    }
  };

  const handleHabitTimeConfirm = async (time: string) => {
    setShowHabitTimePicker(false);
    const updated = { ...notifPrefs, habitTime: time };
    setNotifPrefs(updated);
    await saveNotificationPrefs({ habitTime: time });

    if (notifPrefs.enabled && notifPrefs.habitEnabled) {
      await scheduleHabitRemindersForHabits(habitTargets, time, habitNotificationMap);
    }
  };

  // ─── Cooking handlers ──────────────────────────────────────────────────────

  const handleToggleCookingReminder = async (value: boolean) => {
    const updated = { ...notifPrefs, cookingEnabled: value };
    setNotifPrefs(updated);
    await saveNotificationPrefs({ cookingEnabled: value });

    if (!notifPrefs.enabled) return;
    if (value) {
      await scheduleCookingReminder(notifPrefs.cookingTime);
    } else {
      await cancelCookingReminder();
    }
  };

  const handleCookingTimeConfirm = async (time: string) => {
    setShowCookingTimePicker(false);
    const updated = { ...notifPrefs, cookingTime: time };
    setNotifPrefs(updated);
    await saveNotificationPrefs({ cookingTime: time });

    if (notifPrefs.enabled && notifPrefs.cookingEnabled) {
      await scheduleCookingReminder(time);
    }
  };

  return {
    notifPrefs,
    setNotifPrefs,
    permissionStatus,
    setPermissionStatus,
    savingNotif,
    showHabitTimePicker,
    setShowHabitTimePicker,
    showCookingTimePicker,
    setShowCookingTimePicker,
    habitNotificationMap,
    setHabitNotificationMap,
    handleToggleNotifications,
    handleToggleMorning,
    handleToggleStudyReminders,
    handleToggleHabitReminder,
    handleToggleWeeklySummary,
    handleHabitTimeConfirm,
    handleToggleCookingReminder,
    handleCookingTimeConfirm,
  };
}
