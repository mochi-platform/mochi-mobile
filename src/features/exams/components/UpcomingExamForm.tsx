import { COLORS } from "@/src/shared/theme/tokens";
import { Ionicons } from "@expo/vector-icons";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { EXAM_REMINDER_OPTIONS } from "@/src/features/exams/helpers";

type UpcomingExamFormProps = {
  subject: string;
  onSubjectChange: (value: string) => void;
  date: string;
  onDateChange: (value: string) => void;
  notes: string;
  onNotesChange: (value: string) => void;
  selectedReminderDays: number[];
  onToggleReminderDay: (day: number) => void;
  addToCalendar: boolean;
  onToggleCalendar: () => void;
  saving: boolean;
  onSave: () => void;
};

export function UpcomingExamForm({
  subject,
  onSubjectChange,
  date,
  onDateChange,
  notes,
  onNotesChange,
  selectedReminderDays,
  onToggleReminderDay,
  addToCalendar,
  onToggleCalendar,
  saving,
  onSave,
}: UpcomingExamFormProps) {
  return (
    <>
      <View className="mt-6">
        <Text className="mb-2 text-sm font-bold text-ink">Materia</Text>
        <TextInput
          className="rounded-2xl bg-surface px-4 py-3 text-sm font-semibold text-ink"
          placeholder="Ej. Biología"
          placeholderTextColor={COLORS.inkFaint}
          value={subject}
          onChangeText={onSubjectChange}
        />
      </View>

      <View className="mt-4">
        <Text className="mb-2 text-sm font-bold text-ink">Fecha futura (AAAA-MM-DD)</Text>
        <TextInput
          className="rounded-2xl bg-surface px-4 py-3 text-sm font-semibold text-ink"
          placeholder="2026-04-10"
          placeholderTextColor={COLORS.inkFaint}
          value={date}
          onChangeText={onDateChange}
        />
      </View>

      <View className="mt-4">
        <Text className="mb-2 text-sm font-bold text-ink">Notas de preparación</Text>
        <TextInput
          className="rounded-2xl bg-surface px-4 py-3 text-sm font-semibold text-ink"
          placeholder="Temas a repasar, fórmulas, prioridades..."
          placeholderTextColor={COLORS.inkFaint}
          value={notes}
          onChangeText={onNotesChange}
          multiline
          numberOfLines={3}
          style={{ textAlignVertical: "top", minHeight: 80 }}
        />
      </View>

      <View className="mt-4 rounded-2xl bg-surface p-3">
        <Text className="text-xs font-bold uppercase tracking-wide text-ink">
          Recordatorios personalizados
        </Text>
        <Text className="mt-1 text-xs font-semibold text-ink">
          Elige cuándo quieres recibir aviso antes del examen.
        </Text>

        <View className="mt-3 flex-row gap-2">
          {EXAM_REMINDER_OPTIONS.map((day) => {
            const active = selectedReminderDays.includes(day);

            return (
              <TouchableOpacity
                key={day}
                className={`rounded-full border px-3 py-1.5 ${
                  active ? "bg-accent" : "bg-surface-muted"
                }`}
                onPress={() => {
                  onToggleReminderDay(day);
                }}
              >
                <Text className={`text-xs font-bold ${active ? "text-white" : "text-ink"}`}>
                  {day} días
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          className="mt-3 flex-row items-center justify-between rounded-xl bg-surface-muted px-3 py-2"
          onPress={onToggleCalendar}
        >
          <Text className="text-xs font-bold text-ink">Agregar también al calendario</Text>
          <Ionicons
            name={addToCalendar ? "checkmark-circle" : "ellipse-outline"}
            size={18}
            color={addToCalendar ? COLORS.accent : COLORS.inkMuted}
          />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        className={`mt-6 items-center rounded-2xl py-4 ${saving ? "bg-tint-me" : "bg-accent"}`}
        onPress={() => {
          onSave();
        }}
        disabled={saving}
      >
        <Text className="font-extrabold text-white">
          {saving ? "Guardando..." : "Guardar examen próximo"}
        </Text>
      </TouchableOpacity>
    </>
  );
}
