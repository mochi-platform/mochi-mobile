import { tc } from "@/src/shared/theme/colors";
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
        <Text className="mb-2 text-sm font-bold text-pink-800 dark:text-pink-200">Materia</Text>
        <TextInput
          className="rounded-2xl border-2 border-pink-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 dark:border-pink-800 dark:bg-surface dark:text-slate-200"
          placeholder="Ej. Biología"
          placeholderTextColor={tc("#f9a8d4")}
          value={subject}
          onChangeText={onSubjectChange}
        />
      </View>

      <View className="mt-4">
        <Text className="mb-2 text-sm font-bold text-pink-800 dark:text-pink-200">
          Fecha futura (AAAA-MM-DD)
        </Text>
        <TextInput
          className="rounded-2xl border-2 border-pink-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 dark:border-pink-800 dark:bg-surface dark:text-slate-200"
          placeholder="2026-04-10"
          placeholderTextColor={tc("#f9a8d4")}
          value={date}
          onChangeText={onDateChange}
        />
      </View>

      <View className="mt-4">
        <Text className="mb-2 text-sm font-bold text-pink-800 dark:text-pink-200">
          Notas de preparación
        </Text>
        <TextInput
          className="rounded-2xl border-2 border-pink-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 dark:border-pink-800 dark:bg-surface dark:text-slate-200"
          placeholder="Temas a repasar, fórmulas, prioridades..."
          placeholderTextColor={tc("#f9a8d4")}
          value={notes}
          onChangeText={onNotesChange}
          multiline
          numberOfLines={3}
          style={{ textAlignVertical: "top", minHeight: 80 }}
        />
      </View>

      <View className="mt-4 rounded-2xl border border-pink-200 bg-white p-3 dark:border-pink-800 dark:bg-surface">
        <Text className="text-xs font-bold uppercase tracking-wide text-pink-700 dark:text-pink-300">
          Recordatorios personalizados
        </Text>
        <Text className="mt-1 text-xs font-semibold text-pink-600 dark:text-pink-400">
          Elige cuándo quieres recibir aviso antes del examen.
        </Text>

        <View className="mt-3 flex-row gap-2">
          {EXAM_REMINDER_OPTIONS.map((day) => {
            const active = selectedReminderDays.includes(day);

            return (
              <TouchableOpacity
                key={day}
                className={`rounded-full border px-3 py-1.5 ${
                  active
                    ? "border-pink-500 bg-pink-500"
                    : "border-pink-200 bg-pink-50 dark:border-pink-800 dark:bg-pink-950"
                }`}
                onPress={() => {
                  onToggleReminderDay(day);
                }}
              >
                <Text
                  className={`text-xs font-bold ${
                    active ? "text-white" : "text-pink-700 dark:text-pink-300"
                  }`}
                >
                  {day} días
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          className="mt-3 flex-row items-center justify-between rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 dark:border-indigo-800 dark:bg-indigo-950"
          onPress={onToggleCalendar}
        >
          <Text className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
            Agregar también al calendario
          </Text>
          <Ionicons
            name={addToCalendar ? "checkmark-circle" : "ellipse-outline"}
            size={18}
            color={addToCalendar ? tc("#4f46e5") : tc("#94a3b8")}
          />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        className={`mt-6 items-center rounded-2xl py-4 ${saving ? "bg-pink-300 dark:bg-pink-700" : "bg-pink-500"}`}
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
