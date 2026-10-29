import { Linking, View } from "react-native";
import type { NotificationPrefs } from "@/src/shared/lib/notifications";
import { Button, Caption, PressableScale, Surface, Title, Toggle } from "@/src/shared/ui";
import { DuoQuietHoursSection } from "./DuoQuietHoursSection";

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
    <Surface className="mt-6 p-4">
      <Title>Recordatorios</Title>
      <Toggle
        label="Notificaciones"
        description="Avisos suaves de Mochi, nunca insistentes."
        value={notifPrefs.enabled}
        onValueChange={(v) => {
          if (!savingNotif) void onToggleNotifications(v);
        }}
      />

      {permissionStatus === "denied" ? (
        <PressableScale
          onPress={() => void Linking.openSettings()}
          accessibilityLabel="Activar permiso de notificaciones en ajustes del sistema"
          className="mt-2 rounded-control bg-surface-muted p-3"
        >
          <Caption className="text-ink">
            El permiso está denegado. Toca aquí para activarlo en los ajustes del teléfono.
          </Caption>
        </PressableScale>
      ) : null}

      {notifPrefs.enabled ? (
        <View className="mt-1">
          <Toggle
            label="Buenos días"
            description={`A las ${(wakeUpTime || "06:00").slice(0, 5)}, tu hora de despertar`}
            value={notifPrefs.morningEnabled}
            onValueChange={(v) => void onToggleMorning(v)}
          />
          <Toggle
            label="Bloques de estudio"
            description={`10 min antes de cada bloque (${studyBlockCount} ${studyBlockCount === 1 ? "bloque" : "bloques"})`}
            value={notifPrefs.studyEnabled}
            onValueChange={(v) => void onToggleStudyReminders(v)}
          />
          <Toggle
            label="Hábitos"
            description={`Todos los días a las ${notifPrefs.habitTime}`}
            value={notifPrefs.habitEnabled}
            onValueChange={(v) => void onToggleHabitReminder(v)}
          />
          {notifPrefs.habitEnabled ? (
            <View className="mb-2">
              <Button
                title={`Cambiar hora: ${notifPrefs.habitTime}`}
                variant="outline"
                onPress={onOpenHabitTimePicker}
              />
            </View>
          ) : null}
          <Toggle
            label="Cocina"
            description={`Todos los días a las ${notifPrefs.cookingTime}`}
            value={notifPrefs.cookingEnabled}
            onValueChange={(v) => void onToggleCookingReminder(v)}
          />
          {notifPrefs.cookingEnabled ? (
            <View className="mb-2">
              <Button
                title={`Cambiar hora: ${notifPrefs.cookingTime}`}
                variant="outline"
                onPress={onOpenCookingTimePicker}
              />
            </View>
          ) : null}
          <DuoQuietHoursSection />
          <Toggle
            label="Resumen semanal"
            description="Domingo a las 10:00"
            value={notifPrefs.weeklyEnabled}
            onValueChange={(v) => void onToggleWeeklySummary(v)}
          />
        </View>
      ) : null}
    </Surface>
  );
}
