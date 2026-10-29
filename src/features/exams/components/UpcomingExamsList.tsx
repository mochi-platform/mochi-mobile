import { View } from "react-native";
import { MochiCharacter } from "@/src/shared/components/MochiCharacter";
import type {
  CalmChecklistState,
  ExamPreparationState,
  MissionStepKey,
  UpcomingExamItem,
} from "@/src/features/exams/types";
import { UpcomingExamItemCard } from "@/src/features/exams/components/UpcomingExamItemCard";
import { Caption, SectionHeader, Skeleton, Surface } from "@/src/shared/ui";

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
    <>
      <SectionHeader title="Próximos" />
      {loading ? (
        <Skeleton height={160} className="rounded-card" />
      ) : upcomingExams.length === 0 ? (
        <Surface tone="sunken" className="flex-row items-center gap-3 p-4">
          <MochiCharacter expression="thinking" size={64} animated={false} shadow={false} />
          <Caption className="flex-1">
            No tienes exámenes próximos. Agrega uno abajo y te ayudo a prepararte.
          </Caption>
        </Surface>
      ) : (
        <View className="gap-3">
          {prepLoading ? <Caption className="ml-1">Cargando tu progreso…</Caption> : null}
          {upcomingExams.map((exam) => (
            <UpcomingExamItemCard
              key={exam.id}
              exam={exam}
              todayISO={todayISO}
              preparation={getPrepState(exam.id)}
              reminderDays={upcomingReminderMap[exam.id]}
              onToggleCalmStep={(step) => onToggleCalmStep(exam.id, step)}
              onToggleMissionStep={(step) => onToggleMissionStep(exam.id, step)}
              onRegisterResult={() => onRegisterResult(exam)}
            />
          ))}
        </View>
      )}
    </>
  );
}
