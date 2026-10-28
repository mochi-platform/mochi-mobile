import { tc } from "@/src/shared/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";
import {
  CALM_ORDER,
  MISSION_ORDER,
  formatExamDate,
  formatReminderDays,
  getDaysUntil,
  getMissionProgress,
  getNextMissionStep,
  getUpcomingLabel,
} from "@/src/features/exams/helpers";
import type {
  CalmChecklistState,
  ExamPreparationState,
  MissionStepKey,
  UpcomingExamItem,
} from "@/src/features/exams/types";

type UpcomingExamItemCardProps = {
  exam: UpcomingExamItem;
  todayISO: string;
  preparation: ExamPreparationState;
  reminderDays: number[] | undefined;
  onToggleCalmStep: (step: keyof CalmChecklistState) => void;
  onToggleMissionStep: (step: MissionStepKey) => void;
  onRegisterResult: () => void;
};

export function UpcomingExamItemCard({
  exam,
  todayISO,
  preparation,
  reminderDays,
  onToggleCalmStep,
  onToggleMissionStep,
  onRegisterResult,
}: UpcomingExamItemCardProps) {
  const missionProgress = getMissionProgress(preparation.mission);
  const nextMissionStep = getNextMissionStep(preparation.mission);
  const calmActive = getDaysUntil(exam.exam_date, todayISO) <= 1;

  return (
    <View className="mb-3 rounded-2xl bg-surface-muted p-3">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-extrabold text-ink">{exam.subject}</Text>
        <View className="rounded-full bg-tint-kitchen px-2 py-1">
          <Text className="text-xs font-bold text-ink">
            {getUpcomingLabel(exam.exam_date, todayISO)}
          </Text>
        </View>
      </View>
      <Text className="mt-1 text-xs font-semibold uppercase text-ink-muted">
        {formatExamDate(exam.exam_date)}
      </Text>
      <Text className="mt-1 text-[11px] font-bold text-ink">
        Recordatorios: {formatReminderDays(reminderDays ?? [1])}
      </Text>
      {exam.preparation_notes ? (
        <Text className="mt-1 text-xs font-semibold text-ink">{exam.preparation_notes}</Text>
      ) : null}

      {calmActive ? (
        <View className="mt-3 rounded-2xl bg-surface-muted p-3">
          <Text className="text-xs font-bold text-positive">Cofre de Calma activo</Text>
          {CALM_ORDER.map((item) => {
            const checked = preparation.calm[item.key];

            return (
              <TouchableOpacity
                key={`${exam.id}-${item.key}`}
                className="mt-2 flex-row items-center"
                onPress={() => {
                  onToggleCalmStep(item.key);
                }}
              >
                <Ionicons
                  name={checked ? "checkmark-circle" : "ellipse"}
                  size={18}
                  color={checked ? tc("#0f766e") : tc("#475569")}
                />
                <Text className="ml-2 text-xs font-semibold text-ink">{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}

      <View className="mt-3 rounded-2xl bg-surface-muted p-3">
        <Text className="text-xs font-bold text-ink">Misión Parcial Perfecto</Text>
        <Text className="mt-1 text-xs font-semibold text-ink">Progreso: {missionProgress}%</Text>
        <View className="mt-2 h-2 w-full overflow-hidden rounded-full bg-tint-study">
          <View className="h-2 rounded-full bg-accent" style={{ width: `${missionProgress}%` }} />
        </View>
        <Text className="mt-2 text-xs font-semibold text-ink">
          Siguiente paso recomendado: {nextMissionStep}
        </Text>

        {MISSION_ORDER.map((step) => {
          const completed = preparation.mission[step.key];

          return (
            <TouchableOpacity
              key={`${exam.id}-${step.key}`}
              className="mt-2 flex-row items-center"
              onPress={() => {
                onToggleMissionStep(step.key);
              }}
            >
              <Ionicons
                name={completed ? "checkmark-circle" : "ellipse"}
                size={18}
                color={completed ? tc("#4338ca") : tc("#475569")}
              />
              <Text className="ml-2 text-xs font-semibold text-ink">{step.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity
        className="mt-2 self-start rounded-xl bg-surface px-3 py-1"
        onPress={() => {
          onRegisterResult();
        }}
      >
        <Text className="text-xs font-bold text-ink">Registrar resultado</Text>
      </TouchableOpacity>

      <TouchableOpacity
        className="mt-2 self-start rounded-xl bg-tint-ok px-3 py-1"
        onPress={() => {
          router.push({
            pathname: "/exam-sprint-progress",
            params: {
              examId: exam.id,
              subject: exam.subject,
            },
          });
        }}
      >
        <Text className="text-xs font-bold text-positive">Crear Sprint</Text>
      </TouchableOpacity>
    </View>
  );
}
