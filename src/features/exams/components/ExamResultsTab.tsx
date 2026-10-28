import { tc } from "@/src/shared/theme/colors";
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
        <View className="mt-4 rounded-2xl border border-indigo-200 bg-indigo-50 p-3 dark:border-indigo-800 dark:bg-indigo-950">
          <Text className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
            Resultado de examen próximo
          </Text>
          <Text className="mt-1 text-sm font-semibold text-indigo-900 dark:text-indigo-100">
            Completa la nota para cerrar este examen pendiente.
          </Text>
        </View>
      ) : null}

      <View className="mt-6 rounded-3xl border-2 border-pink-200 bg-white p-4 dark:border-pink-800 dark:bg-surface">
        <Text className="text-lg font-extrabold text-pink-900 dark:text-pink-100">
          Historial de resultados
        </Text>

        {loading ? (
          <View className="items-center py-6">
            <ActivityIndicator size="small" color={tc("#ec4899")} />
            <Text className="mt-3 text-sm font-semibold text-pink-700 dark:text-pink-300">
              Cargando historial...
            </Text>
          </View>
        ) : examHistory.length === 0 ? (
          <View className="items-center py-6">
            <MochiCharacter mood="happy" size={70} />
            <Text className="mt-3 text-sm font-semibold text-pink-700 dark:text-pink-300">
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
                <View
                  key={exam.id}
                  className="mb-3 rounded-2xl border border-pink-200 bg-pink-50 p-3 dark:border-pink-800 dark:bg-pink-950"
                >
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1 pr-3">
                      <Text className="text-base font-extrabold text-pink-900 dark:text-pink-100">
                        {exam.subject}
                      </Text>
                      <Text className="mt-1 text-sm font-semibold text-pink-700 dark:text-pink-300">
                        {gradeValue}/{maxValue}
                      </Text>
                      <Text className="mt-1 text-xs font-semibold uppercase text-pink-500">
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
        <Text className="mb-2 text-sm font-bold text-pink-800 dark:text-pink-200">Materia</Text>
        <TextInput
          className="rounded-2xl border-2 border-pink-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 dark:border-pink-800 dark:bg-surface dark:text-slate-200"
          placeholder="Ej. Cálculo, Historia, Inglés..."
          placeholderTextColor={tc("#f9a8d4")}
          value={subject}
          onChangeText={onSubjectChange}
        />
      </View>

      <View className="mt-4">
        <Text className="mb-2 text-sm font-bold text-pink-800 dark:text-pink-200">
          Nota obtenida
        </Text>
        <View className="flex-row items-center">
          <TextInput
            className="flex-1 rounded-2xl border-2 border-pink-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 dark:border-pink-800 dark:bg-surface dark:text-slate-200"
            placeholder="0 - 10"
            placeholderTextColor={tc("#f9a8d4")}
            value={grade}
            onChangeText={onGradeChange}
            keyboardType="decimal-pad"
          />
          <View className="ml-3 items-center justify-center rounded-2xl bg-pink-100 px-4 py-3 dark:bg-pink-900">
            <Text className="font-bold text-pink-700 dark:text-pink-300">/ 10</Text>
          </View>
        </View>
      </View>

      <View className="mt-4">
        <Text className="mb-2 text-sm font-bold text-pink-800 dark:text-pink-200">
          Notas (opcional)
        </Text>
        <TextInput
          className="rounded-2xl border-2 border-pink-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 dark:border-pink-800 dark:bg-surface dark:text-slate-200"
          placeholder="¿Qué temas entraron? ¿Cómo te fue?"
          placeholderTextColor={tc("#f9a8d4")}
          value={notes}
          onChangeText={onNotesChange}
          multiline
          numberOfLines={3}
          style={{ textAlignVertical: "top", minHeight: 80 }}
        />
      </View>

      <TouchableOpacity
        className={`mt-6 items-center rounded-2xl py-4 ${saving ? "bg-pink-300 dark:bg-pink-700" : "bg-pink-500"}`}
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
