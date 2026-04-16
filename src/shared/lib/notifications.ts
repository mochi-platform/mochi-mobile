import AsyncStorage from "@react-native-async-storage/async-storage";
import { isExpoGo } from "@/lib/env";
import type { StudyBlock } from "@/src/shared/types/database";

type PermissionStatus = import("expo-notifications").PermissionStatus;
type ExpoNotificationsModule = typeof import("expo-notifications");

let notificationsModulePromise: Promise<ExpoNotificationsModule> | null = null;

async function getNotificationsModule(): Promise<ExpoNotificationsModule | null> {
  if (isExpoGo) return null;
  notificationsModulePromise ??= import("expo-notifications");
  return notificationsModulePromise;
}

type HabitReminderTarget = {
  id: string;
  name: string;
};

// ─── AsyncStorage keys ───────────────────────────────────────────────────────

const STORAGE_KEY = {
  ENABLED: "notifications:enabled",
  MORNING_ENABLED: "notifications:morning_enabled",
  STUDY_ENABLED: "notifications:study_enabled",
  HABIT_ENABLED: "notifications:habit_enabled",
  WEEKLY_ENABLED: "notifications:weekly_enabled",
  HABIT_TIME: "notifications:habit_time",
  HABIT_ITEM_PREFIX: "notifications:habit_item:",
  COOKING_ENABLED: "notifications:cooking_enabled",
  COOKING_TIME: "notifications:cooking_time",
} as const;

// ─── Notification identifiers ────────────────────────────────────────────────

const NOTIFICATION_ID = {
  MORNING: "morning-reminder",
  HABIT_LEGACY: "habit-reminder",
  habit: (habitId: string) => `habit-reminder-${habitId}`,
  COOKING: "cooking-reminder",
  studyBlock: (blockId: string) => `study-block-${blockId}`,
} as const;

// ─── Types ───────────────────────────────────────────────────────────────────

export type NotificationPrefs = {
  enabled: boolean;
  morningEnabled: boolean;
  studyEnabled: boolean;
  habitEnabled: boolean;
  weeklyEnabled: boolean;
  habitTime: string;
  cookingEnabled: boolean;
  cookingTime: string;
};

// ─── Permissions ─────────────────────────────────────────────────────────────

export async function requestNotificationPermissions(): Promise<PermissionStatus> {
  const Notifications = await getNotificationsModule();
  if (!Notifications) return "undetermined";

  const { status } = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  });
  return status;
}

export async function getNotificationPermissionStatus(): Promise<PermissionStatus> {
  const Notifications = await getNotificationsModule();
  if (!Notifications) return "undetermined";

  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

// ─── Preferences (AsyncStorage) ──────────────────────────────────────────────

export async function loadNotificationPrefs(): Promise<NotificationPrefs> {
  const [
    enabled,
    morningEnabled,
    studyEnabled,
    habitEnabled,
    weeklyEnabled,
    habitTime,
    cookingEnabled,
    cookingTime,
  ] = await Promise.all([
    AsyncStorage.getItem(STORAGE_KEY.ENABLED),
    AsyncStorage.getItem(STORAGE_KEY.MORNING_ENABLED),
    AsyncStorage.getItem(STORAGE_KEY.STUDY_ENABLED),
    AsyncStorage.getItem(STORAGE_KEY.HABIT_ENABLED),
    AsyncStorage.getItem(STORAGE_KEY.WEEKLY_ENABLED),
    AsyncStorage.getItem(STORAGE_KEY.HABIT_TIME),
    AsyncStorage.getItem(STORAGE_KEY.COOKING_ENABLED),
    AsyncStorage.getItem(STORAGE_KEY.COOKING_TIME),
  ]);
  return {
    enabled: enabled === "true",
    morningEnabled: morningEnabled !== "false",
    studyEnabled: studyEnabled !== "false",
    habitEnabled: habitEnabled !== "false",
    weeklyEnabled: weeklyEnabled === "true",
    habitTime: habitTime ?? "21:00",
    // cooking off by default — la usuaria lo activa explícitamente
    cookingEnabled: cookingEnabled === "true",
    cookingTime: cookingTime ?? "19:00",
  };
}

export async function saveNotificationPrefs(
  prefs: Partial<NotificationPrefs>,
): Promise<void> {
  const entries: [string, string][] = [];

  if (prefs.enabled !== undefined)
    entries.push([STORAGE_KEY.ENABLED, prefs.enabled ? "true" : "false"]);
  if (prefs.morningEnabled !== undefined)
    entries.push([
      STORAGE_KEY.MORNING_ENABLED,
      prefs.morningEnabled ? "true" : "false",
    ]);
  if (prefs.studyEnabled !== undefined)
    entries.push([
      STORAGE_KEY.STUDY_ENABLED,
      prefs.studyEnabled ? "true" : "false",
    ]);
  if (prefs.habitEnabled !== undefined)
    entries.push([
      STORAGE_KEY.HABIT_ENABLED,
      prefs.habitEnabled ? "true" : "false",
    ]);
  if (prefs.weeklyEnabled !== undefined)
    entries.push([
      STORAGE_KEY.WEEKLY_ENABLED,
      prefs.weeklyEnabled ? "true" : "false",
    ]);
  if (prefs.habitTime !== undefined)
    entries.push([STORAGE_KEY.HABIT_TIME, prefs.habitTime]);
  if (prefs.cookingEnabled !== undefined)
    entries.push([
      STORAGE_KEY.COOKING_ENABLED,
      prefs.cookingEnabled ? "true" : "false",
    ]);
  if (prefs.cookingTime !== undefined)
    entries.push([STORAGE_KEY.COOKING_TIME, prefs.cookingTime]);

  await AsyncStorage.multiSet(entries);
}

function habitNotificationStorageKey(habitId: string): string {
  return `${STORAGE_KEY.HABIT_ITEM_PREFIX}${habitId}`;
}

export async function loadHabitNotificationMap(): Promise<
  Record<string, boolean>
> {
  const allKeys = await AsyncStorage.getAllKeys();
  const reminderKeys = allKeys.filter((key) =>
    key.startsWith(STORAGE_KEY.HABIT_ITEM_PREFIX),
  );

  if (reminderKeys.length === 0) {
    return {};
  }

  const entries = await AsyncStorage.multiGet(reminderKeys);
  return entries.reduce<Record<string, boolean>>((acc, [key, value]) => {
    const habitId = key.replace(STORAGE_KEY.HABIT_ITEM_PREFIX, "");
    if (habitId) {
      acc[habitId] = value !== "false";
    }
    return acc;
  }, {});
}

export async function saveHabitNotificationEnabled(
  habitId: string,
  enabled: boolean,
): Promise<void> {
  await AsyncStorage.setItem(
    habitNotificationStorageKey(habitId),
    enabled ? "true" : "false",
  );
}

export async function removeHabitNotificationPreference(
  habitId: string,
): Promise<void> {
  await AsyncStorage.removeItem(habitNotificationStorageKey(habitId));
}

// ─── Parse helpers ───────────────────────────────────────────────────────────

function parseTime(hhmm: string): { hour: number; minute: number } {
  const [hourStr, minuteStr] = hhmm.split(":");
  return {
    hour: parseInt(hourStr ?? "0", 10),
    minute: parseInt(minuteStr ?? "0", 10),
  };
}

function toExpoWeekday(appDayOfWeek: number): number {
  return appDayOfWeek + 1;
}

function subtractMinutes(
  hhmm: string,
  mins: number,
): { hour: number; minute: number } {
  const { hour, minute } = parseTime(hhmm);
  const totalMinutes = hour * 60 + minute - mins;
  if (totalMinutes < 0) {
    const wrapped = ((totalMinutes % 1440) + 1440) % 1440;
    return { hour: Math.floor(wrapped / 60), minute: wrapped % 60 };
  }
  return { hour: Math.floor(totalMinutes / 60), minute: totalMinutes % 60 };
}

// ─── Morning reminder ────────────────────────────────────────────────────────

export async function scheduleMorningReminder(
  wakeUpTime: string,
): Promise<void> {
  const Notifications = await getNotificationsModule();
  if (!Notifications) return;

  await cancelMorningReminder();
  const { hour, minute } = parseTime(wakeUpTime);

  await Notifications.scheduleNotificationAsync({
    identifier: NOTIFICATION_ID.MORNING,
    content: {
      title: "¡Buenos días!",
      body: "Hoy es un gran día para estudiar y crecer. Tú puedes.",
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

export async function cancelMorningReminder(): Promise<void> {
  const Notifications = await getNotificationsModule();
  if (!Notifications) return;

  await Notifications.cancelScheduledNotificationAsync(
    NOTIFICATION_ID.MORNING,
  ).catch((error) =>
    console.error(
      "[Notifications] error cancelando recordatorio de mañana:",
      error instanceof Error ? error.message : String(error),
    ),
  );
}

// ─── Study block reminders ───────────────────────────────────────────────────

export async function scheduleStudyBlockReminders(
  blocks: StudyBlock[],
): Promise<void> {
  const Notifications = await getNotificationsModule();
  if (!Notifications) return;

  await cancelAllStudyBlockReminders();

  for (const block of blocks) {
    const { hour, minute } = subtractMinutes(block.start_time, 10);

    await Notifications.scheduleNotificationAsync({
      identifier: NOTIFICATION_ID.studyBlock(block.id),
      content: {
        title: "Bloque de estudio próximo",
        body: `Tu sesión de ${block.subject} empieza en 10 minutos`,
        sound: true,
        data: { screen: "study" },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: toExpoWeekday(block.day_of_week),
        hour,
        minute,
      },
    });
  }
}

export async function cancelAllStudyBlockReminders(): Promise<void> {
  const Notifications = await getNotificationsModule();
  if (!Notifications) return;

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const studyIds = scheduled
    .map((n) => n.identifier)
    .filter((id) => id.startsWith("study-block-"));
  await Promise.all(
    studyIds.map((id) =>
      Notifications.cancelScheduledNotificationAsync(id).catch((error) =>
        console.error(
          "[Notifications] error cancelando recordatorio de bloque:",
          error instanceof Error ? error.message : String(error),
        ),
      ),
    ),
  );
}

export async function scheduleWeeklySummaryNotification(
  dayOfWeek: number = 0,
  hour: number = 10,
): Promise<void> {
  const Notifications = await getNotificationsModule();
  if (!Notifications) return;

  await Notifications.cancelScheduledNotificationAsync("weekly-summary").catch(
    (error) =>
      console.error(
        "[Notifications] error cancelando resumen semanal previo:",
        error instanceof Error ? error.message : String(error),
      ),
  );

  await Notifications.scheduleNotificationAsync({
    identifier: "weekly-summary",
    content: {
      title: "¿Cómo fue tu semana?",
      body: "Revisa tu resumen semanal en Mochi",
      sound: true,
      data: { screen: "weekly-summary" },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: dayOfWeek + 1,
      hour,
      minute: 0,
    },
  });
}

export async function cancelWeeklySummaryNotification(): Promise<void> {
  const Notifications = await getNotificationsModule();
  if (!Notifications) return;

  await Notifications.cancelScheduledNotificationAsync("weekly-summary").catch(
    (error) =>
      console.error(
        "[Notifications] error cancelando resumen semanal:",
        error instanceof Error ? error.message : String(error),
      ),
  );
}

export async function scheduleExamReminder(
  examId: string,
  subject: string,
  examDate: string,
): Promise<void> {
  const Notifications = await getNotificationsModule();
  if (!Notifications) return;

  const identifier = `exam-${examId}`;
  await Notifications.cancelScheduledNotificationAsync(identifier).catch(
    (error) =>
      console.error(
        "[Notifications] error cancelando recordatorio de examen previo:",
        error instanceof Error ? error.message : String(error),
      ),
  );

  const exam = new Date(`${examDate}T20:00:00`);
  exam.setDate(exam.getDate() - 1);
  if (Number.isNaN(exam.getTime()) || exam.getTime() <= Date.now()) {
    return;
  }

  await Notifications.scheduleNotificationAsync({
    identifier,
    content: {
      title: `Examen de ${subject} mañana`,
      body: "Prepara tu repaso final para llegar con confianza.",
      sound: true,
      data: { screen: "exam-log", examId },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: exam,
    },
  });
}

export async function cancelExamReminder(examId: string): Promise<void> {
  const Notifications = await getNotificationsModule();
  if (!Notifications) return;

  await Notifications.cancelScheduledNotificationAsync(`exam-${examId}`).catch(
    (error) =>
      console.error(
        "[Notifications] error cancelando recordatorio de examen:",
        error instanceof Error ? error.message : String(error),
      ),
  );
}

// ─── Habit reminder ──────────────────────────────────────────────────────────

export async function scheduleHabitReminder(time: string): Promise<void> {
  const Notifications = await getNotificationsModule();
  if (!Notifications) return;

  await cancelHabitReminder();
  const { hour, minute } = parseTime(time);

  await Notifications.scheduleNotificationAsync({
    identifier: NOTIFICATION_ID.HABIT_LEGACY,
    content: {
      title: "¿Ya completaste tus hábitos?",
      body: "No olvides registrar tus hábitos de hoy",
      sound: true,
      data: { screen: "habits" },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

export async function scheduleHabitReminderForHabit(
  habit: HabitReminderTarget,
  time: string,
): Promise<void> {
  const Notifications = await getNotificationsModule();
  if (!Notifications) return;

  await cancelHabitReminder(habit.id);
  const { hour, minute } = parseTime(time);

  await Notifications.scheduleNotificationAsync({
    identifier: NOTIFICATION_ID.habit(habit.id),
    content: {
      title: "Hábito pendiente",
      body: `No olvides completar: ${habit.name}`,
      sound: true,
      data: { screen: "habits", habitId: habit.id },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

export async function scheduleHabitRemindersForHabits(
  habits: HabitReminderTarget[],
  time: string,
  enabledByHabit: Record<string, boolean> = {},
): Promise<void> {
  const Notifications = await getNotificationsModule();
  if (!Notifications) return;

  await cancelHabitReminder();
  const { hour, minute } = parseTime(time);

  for (const habit of habits) {
    if (enabledByHabit[habit.id] === false) {
      continue;
    }

    await Notifications.scheduleNotificationAsync({
      identifier: NOTIFICATION_ID.habit(habit.id),
      content: {
        title: "Hábito pendiente",
        body: `No olvides completar: ${habit.name}`,
        sound: true,
        data: { screen: "habits", habitId: habit.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
  }
}

export async function cancelHabitReminder(habitId?: string): Promise<void> {
  const Notifications = await getNotificationsModule();
  if (!Notifications) return;

  if (habitId) {
    await Notifications.cancelScheduledNotificationAsync(
      NOTIFICATION_ID.habit(habitId),
    ).catch((error) =>
      console.error(
        "[Notifications] error cancelando recordatorio de hábito:",
        error instanceof Error ? error.message : String(error),
      ),
    );
    return;
  }

  await Notifications.cancelScheduledNotificationAsync(
    NOTIFICATION_ID.HABIT_LEGACY,
  ).catch((error) =>
    console.error(
      "[Notifications] error cancelando recordatorio de hábitos legacy:",
      error instanceof Error ? error.message : String(error),
    ),
  );

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const habitIds = scheduled
    .map((notification) => notification.identifier)
    .filter((id) => id.startsWith("habit-reminder-"));

  await Promise.all(
    habitIds.map((id) =>
      Notifications.cancelScheduledNotificationAsync(id).catch((error) =>
        console.error(
          "[Notifications] error cancelando recordatorio de hábito por id:",
          error instanceof Error ? error.message : String(error),
        ),
      ),
    ),
  );
}

// ─── Cooking reminder ─────────────────────────────────────────────────────────

/**
 * Recordatorio diario para inspirar a la usuaria a cocinar.
 * Por defecto a las 19:00 — justo antes de preparar la cena.
 */
export async function scheduleCookingReminder(time: string): Promise<void> {
  const Notifications = await getNotificationsModule();
  if (!Notifications) return;

  await cancelCookingReminder();
  const { hour, minute } = parseTime(time);

  await Notifications.scheduleNotificationAsync({
    identifier: NOTIFICATION_ID.COOKING,
    content: {
      title: "¿Qué vas a cocinar hoy? 🍳",
      body: "Mochi tiene ideas deliciosas esperándote",
      sound: true,
      data: { screen: "cooking" },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

export async function cancelCookingReminder(): Promise<void> {
  const Notifications = await getNotificationsModule();
  if (!Notifications) return;

  await Notifications.cancelScheduledNotificationAsync(
    NOTIFICATION_ID.COOKING,
  ).catch((error) =>
    console.error(
      "[Notifications] error cancelando recordatorio de cocina:",
      error instanceof Error ? error.message : String(error),
    ),
  );
}

// ─── Master cancel ───────────────────────────────────────────────────────────

export async function cancelAllNotifications(): Promise<void> {
  const Notifications = await getNotificationsModule();
  if (!Notifications) return;

  await Notifications.cancelAllScheduledNotificationsAsync();
}

// ─── Full sync ───────────────────────────────────────────────────────────────

export async function syncNotifications(
  prefs: NotificationPrefs,
  wakeUpTime: string,
  studyBlocks: StudyBlock[],
): Promise<void> {
  if (!prefs.enabled) {
    await cancelAllNotifications();
    return;
  }

  if (prefs.morningEnabled) {
    await scheduleMorningReminder(wakeUpTime);
  } else {
    await cancelMorningReminder();
  }

  if (prefs.studyEnabled) {
    await scheduleStudyBlockReminders(studyBlocks);
  } else {
    await cancelAllStudyBlockReminders();
  }

  if (prefs.habitEnabled) {
    await scheduleHabitReminder(prefs.habitTime);
  } else {
    await cancelHabitReminder();
  }

  if (prefs.weeklyEnabled) {
    await scheduleWeeklySummaryNotification();
  } else {
    await cancelWeeklySummaryNotification();
  }

  if (prefs.cookingEnabled) {
    await scheduleCookingReminder(prefs.cookingTime);
  } else {
    await cancelCookingReminder();
  }
}
