import { Image, Text, View } from "react-native";
import { getAttachmentLabel } from "@/src/features/study/timer/helpers";
import type { StudyAttachment, TimerMode } from "@/src/features/study/timer/types";
import {
  Button,
  Caption,
  Chip,
  ELEVATION,
  Input,
  MochiBubble,
  PressableScale,
  Surface,
} from "@/src/shared/ui";

type StudySetupViewProps = {
  timerMode: TimerMode;
  onTimerModeChange: (mode: TimerMode) => void;
  specificTopic: string;
  onSpecificTopicChange: (value: string) => void;
  setupAttachment: StudyAttachment | null;
  onPickCamera: () => void;
  onPickGallery: () => void;
  onPickDocument: () => void;
  onRemoveAttachment: () => void;
  planning: boolean;
  planError: string | null;
  studyPlan: string;
  onGeneratePlan: () => void;
  onStartSession: () => void;
};

/** Antes de empezar: modo, tema, adjunto opcional y un plan de Mochi si se pide. */
export function StudySetupView({
  timerMode,
  onTimerModeChange,
  specificTopic,
  onSpecificTopicChange,
  setupAttachment,
  onPickCamera,
  onPickGallery,
  onPickDocument,
  onRemoveAttachment,
  planning,
  planError,
  studyPlan,
  onGeneratePlan,
  onStartSession,
}: StudySetupViewProps) {
  const ready = Boolean(specificTopic.trim());
  return (
    <View className="mt-4">
      <View className="flex-row rounded-control bg-surface-muted p-1" accessibilityRole="tablist">
        {(
          [
            { value: "regular", label: "Regular" },
            { value: "pomodoro", label: "Pomodoro 25/5" },
          ] as const
        ).map((m) => {
          const on = timerMode === m.value;
          return (
            <PressableScale
              key={m.value}
              haptics="selection"
              onPress={() => onTimerModeChange(m.value)}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              className={`flex-1 items-center rounded-[14px] py-2.5 ${on ? "bg-surface" : "bg-surface-muted"}`}
              style={on ? ELEVATION[1] : undefined}
            >
              <Text className={`font-body-extrabold text-sm ${on ? "text-ink" : "text-ink-muted"}`}>
                {m.label}
              </Text>
            </PressableScale>
          );
        })}
      </View>
      {timerMode === "pomodoro" ? (
        <Caption className="ml-1 mt-2">
          Alterna 25 minutos de foco y 5 de descanso, con aviso en cada cambio.
        </Caption>
      ) : null}

      <View className="mt-5">
        <Input
          label="¿Qué vas a estudiar hoy?"
          placeholder="Integrales por sustitución y ejercicios tipo examen"
          value={specificTopic}
          onChangeText={onSpecificTopicChange}
          multiline
        />
      </View>

      <Text className="mb-2 ml-1 font-body-bold text-sm text-ink">Adjunto (opcional)</Text>
      <View className="flex-row flex-wrap gap-2">
        <Chip icon="camera" label="Cámara" onPress={onPickCamera} />
        <Chip icon="images" label="Galería" onPress={onPickGallery} />
        <Chip icon="document" label="Archivo" onPress={onPickDocument} />
        {setupAttachment ? <Chip icon="close" label="Quitar" onPress={onRemoveAttachment} /> : null}
      </View>
      {setupAttachment ? (
        <Surface className="mt-3 p-3">
          {setupAttachment.previewUri ? (
            <Image
              source={{ uri: setupAttachment.previewUri }}
              className="h-28 w-full rounded-[14px]"
              resizeMode="cover"
            />
          ) : (
            <View className="h-16 items-center justify-center rounded-[14px] bg-surface-muted">
              <Text className="font-body-bold text-xs text-ink-muted">
                {getAttachmentLabel(setupAttachment.mimeType)}
              </Text>
            </View>
          )}
          <Caption className="mt-2" numberOfLines={1}>
            {setupAttachment.name}
          </Caption>
        </Surface>
      ) : null}

      <View className="mt-5">
        <Button
          title={planning ? "Mochi está armando tu plan…" : "Pedir plan a Mochi"}
          variant="soft"
          loading={planning}
          disabled={!ready}
          onPress={onGeneratePlan}
        />
      </View>
      {planError ? (
        <Text className="ml-1 mt-2 font-body-bold text-xs text-danger">{planError}</Text>
      ) : null}
      {studyPlan ? <MochiBubble className="mt-4" tail="none" text={studyPlan} /> : null}

      <View className="mt-4">
        <Button title="Empezar sesión" disabled={!ready} onPress={onStartSession} />
      </View>
    </View>
  );
}
