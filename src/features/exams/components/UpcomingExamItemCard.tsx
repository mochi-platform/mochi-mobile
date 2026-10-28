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
    <View className="mb-3 rounded-2xl border border-pink-200 bg-pink-50 p-3 dark:border-pink-800 dark:bg-pink-950">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-extrabold text-pink-900 dark:text-pink-100">
          {exam.subject}
        </Text>
        <View className="rounded-full bg-amber-100 px-2 py-1 dark:bg-amber-900">
          <Text className="text-xs font-bold text-amber-700 dark:text-amber-300">
            {getUpcomingLabel(exam.exam_date, todayISO)}
          </Text>
        </View>
      </View>
      <Text className="mt-1 text-xs font-semibold uppercase text-pink-500">
        {formatExamDate(exam.exam_date)}
      </Text>
      <Text className="mt-1 text-[11px] font-bold text-indigo-700 dark:text-indigo-300">
        Recordatorios: {formatReminderDays(reminderDays ?? [1])}
      </Text>
      {exam.preparation_notes ? (
        <Text className="mt-1 text-xs font-semibold text-pink-700 dark:text-pink-300">
          {exam.preparation_notes}
        </Text>
      ) : null}

      {calmActive ? (
        <View className="mt-3 rounded-2xl border border-teal-200 bg-teal-50 p-3 dark:border-teal-800 dark:bg-teal-950">
          <Text className="text-xs font-bold text-teal-700 dark:text-teal-300">
            Cofre de Calma activo
          </Text>
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
                <Text className="ml-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}

      <View className="mt-3 rounded-2xl border border-indigo-200 bg-indigo-50 p-3 dark:border-indigo-800 dark:bg-indigo-950">
        <Text className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
          Misión Parcial Perfecto
        </Text>
        <Text className="mt-1 text-xs font-semibold text-indigo-800 dark:text-indigo-200">
          Progreso: {missionProgress}%
        </Text>
        <View className="mt-2 h-2 w-full overflow-hidden rounded-full bg-indigo-100 dark:bg-indigo-900">
          <View
            className="h-2 rounded-full bg-indigo-500"
            style={{ width: `${missionProgress}%` }}
          />
        </View>
        <Text className="mt-2 text-xs font-semibold text-indigo-800 dark:text-indigo-200">
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
              <Text className="ml-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                {step.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity
        className="mt-2 self-start rounded-xl bg-white px-3 py-1 dark:bg-surface"
        onPress={() => {
          onRegisterResult();
        }}
      >
        <Text className="text-xs font-bold text-pink-700 dark:text-pink-300">
          Registrar resultado
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        className="mt-2 self-start rounded-xl bg-green-100 px-3 py-1 dark:bg-green-900"
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
        <Text className="text-xs font-bold text-green-700 dark:text-green-300">Crear Sprint</Text>
      </TouchableOpacity>
    </View>
  );
}
