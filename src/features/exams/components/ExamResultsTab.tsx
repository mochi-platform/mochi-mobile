import { COLORS } from "@/src/shared/theme/tokens";
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from "react-native";
import { MochiCharacter } from "@/src/shared/components/MochiCharacter";
import { formatExamDate, getResultBadge } from "@/src/features/exams/helpers";
import type { ExamResultItem } from "@/src/features/exams/types";

type ExamResultsTabProps = {
  loading: boolean;
  examHistory: ExamResultItem[];
  selectedUpcomingId: string | null;
  subject: string;
  onSubjectChange: (value: string) => void;
  grade: string;
  onGradeChange: (value: string) => void;
  notes: string;
  onNotesChange: (value: string) => void;
  saving: boolean;
  onSave: () => void;
};

export function ExamResultsTab({
  loading,
  examHistory,
  selectedUpcomingId,
  subject,
  onSubjectChange,
  grade,
  onGradeChange,
  notes,
  onNotesChange,
  saving,
  onSave,
}: ExamResultsTabProps) {
  return (
    <>
      {selectedUpcomingId ? (
        <View className="mt-4 rounded-2xl bg-surface-muted p-3">
          <Text className="text-xs font-bold text-ink">Resultado de examen próximo</Text>
          <Text className="mt-1 text-sm font-semibold text-ink">
            Completa la nota para cerrar este examen pendiente.
          </Text>
        </View>
      ) : null}

      <View className="mt-6 rounded-3xl bg-surface p-4">
        <Text className="text-lg font-extrabold text-ink">Historial de resultados</Text>

        {loading ? (
          <View className="items-center py-6">
            <ActivityIndicator size="small" color={COLORS.accent} />
            <Text className="mt-3 text-sm font-semibold text-ink">Cargando historial...</Text>
          </View>
        ) : examHistory.length === 0 ? (
          <View className="items-center py-6">
            <MochiCharacter mood="happy" size={70} />
            <Text className="mt-3 text-sm font-semibold text-ink">
              Aún no tienes resultados registrados
            </Text>
          </View>
        ) : (
          <View className="mt-4">
            {examHistory.map((exam) => {
              const gradeValue = exam.grade ?? 0;
              const maxValue = exam.max_grade ?? 10;
              const badge = getResultBadge(gradeValue, maxValue);

              return (
                <View key={exam.id} className="mb-3 rounded-2xl bg-surface-muted p-3">
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1 pr-3">
                      <Text className="text-base font-extrabold text-ink">{exam.subject}</Text>
                      <Text className="mt-1 text-sm font-semibold text-ink">
                        {gradeValue}/{maxValue}
                      </Text>
                      <Text className="mt-1 text-xs font-semibold uppercase text-ink-muted">
                        {formatExamDate(exam.exam_date)}
                      </Text>
                    </View>
                    <View className={`rounded-full px-3 py-1 ${badge.className}`}>
                      <Text className="text-xs font-bold">{badge.label}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>

      <View className="mt-6">
        <Text className="mb-2 text-sm font-bold text-ink">Materia</Text>
        <TextInput
          className="rounded-2xl bg-surface px-4 py-3 text-sm font-semibold text-ink"
          placeholder="Ej. Cálculo, Historia, Inglés..."
          placeholderTextColor={COLORS.inkFaint}
          value={subject}
          onChangeText={onSubjectChange}
        />
      </View>

      <View className="mt-4">
        <Text className="mb-2 text-sm font-bold text-ink">Nota obtenida</Text>
        <View className="flex-row items-center">
          <TextInput
            className="flex-1 rounded-2xl bg-surface px-4 py-3 text-sm font-semibold text-ink"
            placeholder="0 - 10"
            placeholderTextColor={COLORS.inkFaint}
            value={grade}
            onChangeText={onGradeChange}
            keyboardType="decimal-pad"
          />
          <View className="ml-3 items-center justify-center rounded-2xl bg-tint-me px-4 py-3">
            <Text className="font-bold text-ink">/ 10</Text>
          </View>
        </View>
      </View>

      <View className="mt-4">
        <Text className="mb-2 text-sm font-bold text-ink">Notas (opcional)</Text>
        <TextInput
          className="rounded-2xl bg-surface px-4 py-3 text-sm font-semibold text-ink"
          placeholder="¿Qué temas entraron? ¿Cómo te fue?"
          placeholderTextColor={COLORS.inkFaint}
          value={notes}
          onChangeText={onNotesChange}
          multiline
          numberOfLines={3}
          style={{ textAlignVertical: "top", minHeight: 80 }}
        />
      </View>

      <TouchableOpacity
        className={`mt-6 items-center rounded-2xl py-4 ${saving ? "bg-tint-me" : "bg-accent"}`}
        onPress={() => {
          onSave();
        }}
        disabled={saving}
      >
        <Text className="font-extrabold text-white">
          {saving ? "Guardando..." : "Guardar resultado"}
        </Text>
      </TouchableOpacity>
    </>
  );
}
