import { Ionicons } from "@expo/vector-icons";
import { Linking, Switch, Text, TouchableOpacity, View } from "react-native";
import { IconCtaButton } from "@/src/shared/components/IconCtaButton";
import { tc } from "@/src/shared/theme/colors";
import { DuoQuietHoursSection } from "./DuoQuietHoursSection";
import type { NotificationPrefs } from "@/src/shared/lib/notifications";

type NotificationsSectionProps = {
  notifPrefs: NotificationPrefs;
  permissionStatus: string;
  savingNotif: boolean;
  wakeUpTime: string | null;
  studyBlockCount: number;
  onToggleNotifications: (value: boolean) => Promise<void>;
  onToggleMorning: (value: boolean) => Promise<void>;
  onToggleStudyReminders: (value: boolean) => Promise<void>;
  onToggleHabitReminder: (value: boolean) => Promise<void>;
  onOpenHabitTimePicker: () => void;
  onToggleCookingReminder: (value: boolean) => Promise<void>;
  onOpenCookingTimePicker: () => void;
  onToggleWeeklySummary: (value: boolean) => Promise<void>;
};

export function NotificationsSection({
  notifPrefs,
  permissionStatus,
  savingNotif,
  wakeUpTime,
  studyBlockCount,
  onToggleNotifications,
  onToggleMorning,
  onToggleStudyReminders,
  onToggleHabitReminder,
  onOpenHabitTimePicker,
  onToggleCookingReminder,
  onOpenCookingTimePicker,
  onToggleWeeklySummary,
}: NotificationsSectionProps) {
  return (
    <View className="mt-6 rounded-3xl border-2 border-violet-200 bg-white p-4 dark:border-violet-800 dark:bg-surface">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <View className="h-9 w-9 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900">
            <Ionicons name="notifications" size={18} color={tc("#7c3aed")} />
          </View>
          <Text className="text-lg font-extrabold text-violet-900 dark:text-violet-100">
            Notificaciones
          </Text>
        </View>
        <Switch
          value={notifPrefs.enabled}
          onValueChange={(v) => {
            void onToggleNotifications(v);
          }}
          disabled={savingNotif}
          thumbColor={notifPrefs.enabled ? tc("#7c3aed") : tc("#94a3b8")}
          trackColor={{ false: tc("#cbd5e1"), true: tc("#ddd6fe") }}
        />
      </View>

      {permissionStatus === "denied" && (
        <IconCtaButton
          label="Permiso denegado. Toca aquí para activar en ajustes del sistema."
          onPress={() => {
            void Linking.openSettings();
          }}
          iconName="warning"
          iconColor={tc("#d97706")}
          iconSize={14}
          containerClassName="mt-3 w-full rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 px-3 py-2"
          contentClassName="justify-start"
          textClassName="flex-1 text-left text-xs text-amber-800 dark:text-amber-200"
        />
      )}

      {notifPrefs.enabled && (
        <View className="mt-4 gap-3">
          {/* Morning reminder */}
          <View className="flex-row items-center justify-between rounded-2xl border border-violet-100 bg-violet-50 px-3 py-3 dark:border-violet-900 dark:bg-violet-950">
            <View className="flex-1">
              <View className="flex-row items-center gap-1.5">
                <Ionicons name="sunny" size={15} color={tc("#7c3aed")} />
                <Text className="text-sm font-bold text-violet-900 dark:text-violet-100">
                  Recordatorio matutino
                </Text>
              </View>
              <Text className="mt-0.5 text-xs font-semibold text-violet-500">
                A las {wakeUpTime || "06:00"} (hora de despertar)
              </Text>
            </View>
            <Switch
              value={notifPrefs.morningEnabled}
              onValueChange={(v) => {
                void onToggleMorning(v);
              }}
              thumbColor={notifPrefs.morningEnabled ? tc("#7c3aed") : tc("#94a3b8")}
              trackColor={{ false: tc("#cbd5e1"), true: tc("#ddd6fe") }}
            />
          </View>

          {/* Study reminders */}
          <View className="flex-row items-center justify-between rounded-2xl border border-violet-100 bg-violet-50 px-3 py-3 dark:border-violet-900 dark:bg-violet-950">
            <View className="flex-1">
              <View className="flex-row items-center gap-1.5">
                <Ionicons name="book" size={15} color={tc("#7c3aed")} />
                <Text className="text-sm font-bold text-violet-900 dark:text-violet-100">
                  Bloques de estudio
                </Text>
              </View>
              <Text className="mt-0.5 text-xs font-semibold text-violet-500">
                10 min antes de cada bloque ({studyBlockCount} bloques)
              </Text>
            </View>
            <Switch
              value={notifPrefs.studyEnabled}
              onValueChange={(v) => {
                void onToggleStudyReminders(v);
              }}
              disabled={savingNotif}
              thumbColor={notifPrefs.studyEnabled ? tc("#7c3aed") : tc("#94a3b8")}
              trackColor={{ false: tc("#cbd5e1"), true: tc("#ddd6fe") }}
            />
          </View>

          {/* Habit reminder */}
          <View className="rounded-2xl border border-violet-100 bg-violet-50 px-3 py-3 dark:border-violet-900 dark:bg-violet-950">
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <View className="flex-row items-center gap-1.5">
                  <Ionicons name="leaf" size={15} color={tc("#7c3aed")} />
                  <Text className="text-sm font-bold text-violet-900 dark:text-violet-100">
                    Recordatorio de hábitos
                  </Text>
                </View>
                <Text className="mt-0.5 text-xs font-semibold text-violet-500">
                  Diario a las {notifPrefs.habitTime}
                </Text>
              </View>
              <Switch
                value={notifPrefs.habitEnabled}
                onValueChange={(v) => {
                  void onToggleHabitReminder(v);
                }}
                thumbColor={notifPrefs.habitEnabled ? tc("#7c3aed") : tc("#94a3b8")}
                trackColor={{ false: tc("#cbd5e1"), true: tc("#ddd6fe") }}
              />
            </View>
            {notifPrefs.habitEnabled && (
              <TouchableOpacity
                className="mt-2 items-center rounded-xl border border-violet-200 bg-white py-2 dark:border-violet-800 dark:bg-surface"
                onPress={onOpenHabitTimePicker}
              >
                <Text className="text-sm font-extrabold text-violet-700 dark:text-violet-300">
                  Cambiar hora: {notifPrefs.habitTime}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Cooking reminder */}
          <View className="rounded-2xl border border-orange-100 bg-orange-50 px-3 py-3 dark:border-orange-900 dark:bg-orange-950">
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <View className="flex-row items-center gap-1.5">
                  <Ionicons name="restaurant" size={15} color={tc("#c2410c")} />
                  <Text className="text-sm font-bold text-orange-900 dark:text-orange-100">
                    Recordatorio de cocina
                  </Text>
                </View>
                <Text className="mt-0.5 text-xs font-semibold text-orange-500">
                  Diario a las {notifPrefs.cookingTime}
                </Text>
              </View>
              <Switch
                value={notifPrefs.cookingEnabled}
                onValueChange={(v) => {
                  void onToggleCookingReminder(v);
                }}
                thumbColor={notifPrefs.cookingEnabled ? tc("#c2410c") : tc("#94a3b8")}
                trackColor={{ false: tc("#cbd5e1"), true: tc("#fed7aa") }}
              />
            </View>
            {notifPrefs.cookingEnabled && (
              <TouchableOpacity
                className="mt-2 items-center rounded-xl border border-orange-200 bg-white py-2 dark:border-orange-800 dark:bg-surface"
                onPress={onOpenCookingTimePicker}
              >
                <Text className="text-sm font-extrabold text-orange-700 dark:text-orange-300">
                  Cambiar hora: {notifPrefs.cookingTime}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <DuoQuietHoursSection />

          {/* Weekly summary reminder */}
          <View className="flex-row items-center justify-between rounded-2xl border border-indigo-100 bg-indigo-50 px-3 py-3 dark:border-indigo-900 dark:bg-indigo-950">
            <View className="flex-1 pr-2">
              <View className="flex-row items-center gap-1.5">
                <Ionicons name="calendar" size={15} color={tc("#4338ca")} />
                <Text className="text-sm font-bold text-indigo-900 dark:text-indigo-100">
                  Resumen semanal
                </Text>
              </View>
              <Text className="mt-0.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                Domingo a las 10:00
              </Text>
            </View>
            <Switch
              value={notifPrefs.weeklyEnabled}
              onValueChange={(v) => {
                void onToggleWeeklySummary(v);
              }}
              thumbColor={notifPrefs.weeklyEnabled ? tc("#4338ca") : tc("#94a3b8")}
              trackColor={{ false: tc("#cbd5e1"), true: tc("#c7d2fe") }}
            />
          </View>
        </View>
      )}
    </View>
  );
}
