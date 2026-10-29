import { View } from "react-native";
import { EXAM_REMINDER_OPTIONS } from "@/src/features/exams/helpers";
import { toLocalISODate } from "@/src/shared/lib/dates";
import { Button, Chip, DateField, Input, SectionHeader, Surface, Toggle } from "@/src/shared/ui";

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
      <SectionHeader title="Agregar un examen" />
      <Input
        label="Materia"
        placeholder="Ej. Biología"
        value={subject}
        onChangeText={onSubjectChange}
      />
      <DateField label="Fecha" value={date} onChange={onDateChange} minimum={toLocalISODate()} />
      <Input
        label="Qué repasar (opcional)"
        placeholder="Temas, fórmulas, prioridades…"
        value={notes}
        onChangeText={onNotesChange}
        multiline
        style={{ textAlignVertical: "top", minHeight: 88, paddingTop: 14 }}
      />

      <SectionHeader title="Avisarme antes" />
      <View className="flex-row flex-wrap gap-2">
        {EXAM_REMINDER_OPTIONS.map((day) => (
          <Chip
            key={day}
            label={`${day} ${day === 1 ? "día" : "días"}`}
            selected={selectedReminderDays.includes(day)}
            onPress={() => onToggleReminderDay(day)}
          />
        ))}
      </View>
      <Surface className="mt-3 px-4 py-2">
        <Toggle
          label="Agregar a mi calendario"
          value={addToCalendar}
          onValueChange={onToggleCalendar}
        />
      </Surface>

      <View className="mt-6">
        <Button title="Guardar examen" loading={saving} onPress={onSave} />
      </View>
    </>
  );
}
