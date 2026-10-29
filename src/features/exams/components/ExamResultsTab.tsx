import { Text, View } from "react-native";
import { MochiCharacter } from "@/src/shared/components/MochiCharacter";
import { formatExamDate, getResultBadge } from "@/src/features/exams/helpers";
import type { ExamResultItem } from "@/src/features/exams/types";
import {
  Button,
  Caption,
  Input,
  ListGroup,
  ListRow,
  SectionHeader,
  Skeleton,
  Surface,
} from "@/src/shared/ui";

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
      <SectionHeader title="Nuevo resultado" />
      {selectedUpcomingId ? (
        <Surface tone="sunken" className="mb-3 p-3.5">
          <Caption>Completa la nota para cerrar este examen pendiente.</Caption>
        </Surface>
      ) : null}
      <Input
        label="Materia"
        placeholder="Ej. Cálculo, Historia, Inglés…"
        value={subject}
        onChangeText={onSubjectChange}
      />
      <Input
        label="Nota obtenida (sobre 10)"
        placeholder="0 – 10"
        value={grade}
        onChangeText={onGradeChange}
        keyboardType="decimal-pad"
      />
      <Input
        label="Notas (opcional)"
        placeholder="¿Qué temas entraron? ¿Cómo te fue?"
        value={notes}
        onChangeText={onNotesChange}
        multiline
        style={{ textAlignVertical: "top", minHeight: 88, paddingTop: 14 }}
      />
      <View className="mt-2">
        <Button title="Guardar resultado" loading={saving} onPress={onSave} />
      </View>

      <SectionHeader title="Historial" />
      {loading ? (
        <Skeleton height={140} className="rounded-card" />
      ) : examHistory.length === 0 ? (
        <Surface tone="sunken" className="flex-row items-center gap-3 p-4">
          <MochiCharacter expression="happy" size={64} animated={false} shadow={false} />
          <Caption className="flex-1">
            Aún no registras resultados. Cuando lo hagas, aparecerán aquí.
          </Caption>
        </Surface>
      ) : (
        <ListGroup>
          {examHistory.map((exam) => {
            const gradeValue = exam.grade ?? 0;
            const maxValue = exam.max_grade ?? 10;
            const badge = getResultBadge(gradeValue, maxValue);
            return (
              <ListRow
                key={exam.id}
                title={exam.subject}
                subtitle={formatExamDate(exam.exam_date)}
                leading={
                  <View className="h-10 w-10 items-center justify-center rounded-[14px] bg-surface-muted">
                    <Text className="font-display text-base text-ink">{gradeValue}</Text>
                  </View>
                }
                trailing={
                  <View className={`rounded-full px-3 py-1 ${badge.className}`}>
                    <Text className="font-body-extrabold text-xs">{badge.label}</Text>
                  </View>
                }
              />
            );
          })}
        </ListGroup>
      )}
    </>
  );
}
