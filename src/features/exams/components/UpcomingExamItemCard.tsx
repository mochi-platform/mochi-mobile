import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Text, View } from "react-native";
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
import { COLORS } from "@/src/shared/theme/tokens";
import { Button, Caption, Eyebrow, PressableScale, Strong, Surface, Title } from "@/src/shared/ui";

type UpcomingExamItemCardProps = {
  exam: UpcomingExamItem;
  todayISO: string;
  preparation: ExamPreparationState;
  reminderDays: number[] | undefined;
  onToggleCalmStep: (step: keyof CalmChecklistState) => void;
  onToggleMissionStep: (step: MissionStepKey) => void;
  onRegisterResult: () => void;
};

function CheckRow({
  label,
  checked,
  onPress,
}: {
  label: string;
  checked: boolean;
  onPress: () => void;
}) {
  return (
    <PressableScale
      haptics="selection"
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      className="min-h-[40px] flex-row items-center gap-3"
    >
      <Ionicons
        name={checked ? "checkmark-circle" : "ellipse-outline"}
        size={22}
        color={checked ? COLORS.positive : COLORS.inkFaint}
      />
      <Text
        className={`flex-1 font-body text-[14.5px] ${checked ? "text-ink-muted line-through" : "text-ink"}`}
      >
        {label}
      </Text>
    </PressableScale>
  );
}

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
    <Surface className="p-4">
      <View className="flex-row items-start gap-3">
        <View className="min-w-0 flex-1">
          <Title numberOfLines={2}>{exam.subject}</Title>
          <Caption className="mt-0.5">
            {formatExamDate(exam.exam_date)} · Aviso {formatReminderDays(reminderDays ?? [1])}
          </Caption>
        </View>
        <View className="rounded-full bg-tint-me px-3 py-1">
          <Text className="font-body-extrabold text-xs text-tint-me-ink">
            {getUpcomingLabel(exam.exam_date, todayISO)}
          </Text>
        </View>
      </View>
      {exam.preparation_notes ? <Caption className="mt-2">{exam.preparation_notes}</Caption> : null}

      {calmActive ? (
        <View className="mt-4 rounded-[18px] bg-tint-ok p-3.5">
          <Eyebrow className="text-tint-ok-ink">Calma para mañana</Eyebrow>
          <View className="mt-1">
            {CALM_ORDER.map((item) => (
              <CheckRow
                key={item.key}
                label={item.label}
                checked={preparation.calm[item.key]}
                onPress={() => onToggleCalmStep(item.key)}
              />
            ))}
          </View>
        </View>
      ) : null}

      <View className="mt-4">
        <View className="flex-row items-center justify-between">
          <Strong>Plan de repaso</Strong>
          <Caption>{missionProgress}%</Caption>
        </View>
        <View className="mt-2 h-2 overflow-hidden rounded-full bg-surface-muted">
          <View
            className="h-full rounded-full bg-accent"
            style={{ width: `${missionProgress}%` }}
          />
        </View>
        <Caption className="mt-2">Siguiente: {nextMissionStep}</Caption>
        <View className="mt-1">
          {MISSION_ORDER.map((step) => (
            <CheckRow
              key={step.key}
              label={step.label}
              checked={preparation.mission[step.key]}
              onPress={() => onToggleMissionStep(step.key)}
            />
          ))}
        </View>
      </View>

      <View className="mt-3 flex-row gap-2">
        <View className="flex-1">
          <Button
            title="Crear sprint"
            variant="soft"
            onPress={() =>
              router.push({
                pathname: "/exam-sprint-progress",
                params: { examId: exam.id, subject: exam.subject },
              })
            }
          />
        </View>
        <View className="flex-1">
          <Button title="Ya lo di" variant="soft" onPress={onRegisterResult} />
        </View>
      </View>
    </Surface>
  );
}
