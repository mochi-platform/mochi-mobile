import { COLORS } from "@/src/shared/theme/tokens";
import { ActivityIndicator, Text, View } from "react-native";
import { MochiCharacter } from "@/src/shared/components/MochiCharacter";
import type {
  CalmChecklistState,
  ExamPreparationState,
  MissionStepKey,
  UpcomingExamItem,
} from "@/src/features/exams/types";
import { UpcomingExamItemCard } from "@/src/features/exams/components/UpcomingExamItemCard";

type UpcomingExamsListProps = {
  loading: boolean;
  todayISO: string;
  upcomingExams: UpcomingExamItem[];
  upcomingReminderMap: Record<string, number[]>;
  prepLoading: boolean;
  getPrepState: (examId: string) => ExamPreparationState;
  onToggleCalmStep: (examId: string, step: keyof CalmChecklistState) => void;
  onToggleMissionStep: (examId: string, step: MissionStepKey) => void;
  onRegisterResult: (exam: UpcomingExamItem) => void;
};

export function UpcomingExamsList({
  loading,
  todayISO,
  upcomingExams,
  upcomingReminderMap,
  prepLoading,
  getPrepState,
  onToggleCalmStep,
  onToggleMissionStep,
  onRegisterResult,
}: UpcomingExamsListProps) {
  return (
    <View className="mt-6 rounded-3xl bg-surface p-4">
      <Text className="text-lg font-extrabold text-ink">Próximos exámenes</Text>

      {loading ? (
        <View className="items-center py-6">
          <ActivityIndicator size="small" color={COLORS.accent} />
        </View>
      ) : upcomingExams.length === 0 ? (
        <View className="items-center py-6">
          <MochiCharacter mood="thinking" size={70} />
          <Text className="mt-3 text-sm font-semibold text-ink">
            No hay exámenes próximos registrados
          </Text>
        </View>
      ) : (
        <View className="mt-4">
          {prepLoading ? (
            <View className="items-center py-4">
              <ActivityIndicator size="small" color={COLORS.accent} />
              <Text className="mt-2 text-xs font-semibold text-ink">
                Cargando progreso de misión...
              </Text>
            </View>
          ) : null}

          {upcomingExams.map((exam) => (
            <UpcomingExamItemCard
              key={exam.id}
              exam={exam}
              todayISO={todayISO}
              preparation={getPrepState(exam.id)}
              reminderDays={upcomingReminderMap[exam.id]}
              onToggleCalmStep={(step) => {
                onToggleCalmStep(exam.id, step);
              }}
              onToggleMissionStep={(step) => {
                onToggleMissionStep(exam.id, step);
              }}
              onRegisterResult={() => {
                onRegisterResult(exam);
              }}
            />
          ))}
        </View>
      )}
    </View>
  );
}
