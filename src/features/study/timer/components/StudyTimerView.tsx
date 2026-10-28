import { Ionicons } from "@expo/vector-icons";
import type { AnimatedStyle } from "react-native-reanimated";
import { Text, View, type ViewStyle } from "react-native";
import { formatTime } from "@/src/features/study/timer/helpers";
import type { PomodoroPhase, TimerMode } from "@/src/features/study/timer/types";
import { MochiCharacter } from "@/src/shared/components/MochiCharacter";
import { COLORS } from "@/src/shared/theme/tokens";
import {
  ACCENT_GLOW,
  Button,
  Caption,
  Eyebrow,
  PressableScale,
  ProgressRing,
  Title,
} from "@/src/shared/ui";

type StudyTimerViewProps = {
  specificTopic: string;
  timerMode: TimerMode;
  pomodoroCycle: number;
  pomodoroPhase: PomodoroPhase;
  /** Se conserva por compatibilidad; el color ya no cambia por bloque (un solo acento). */
  blockColor?: string;
  timeLeft: number;
  activeTimerDuration: number;
  /** Se conserva por compatibilidad: el anillo calcula el avance a partir del tiempo. */
  progressStyle?: AnimatedStyle<ViewStyle>;
  isRunning: boolean;
  isCompleting: boolean;
  onToggleRunning: () => void;
  onComplete: () => void;
};

/** Sesión en curso: Mochi acompaña, el anillo se llena y un solo botón grande pausa o sigue. */
export function StudyTimerView({
  specificTopic,
  timerMode,
  pomodoroCycle,
  pomodoroPhase,
  timeLeft,
  activeTimerDuration,
  isRunning,
  isCompleting,
  onToggleRunning,
  onComplete,
}: StudyTimerViewProps) {
  const onBreak = timerMode === "pomodoro" && pomodoroPhase !== "focus";
  const progress = activeTimerDuration > 0 ? 1 - timeLeft / activeTimerDuration : 0;

  return (
    <View className="items-center">
      <Eyebrow className="mt-4">{onBreak ? "Descanso" : "Estudiando"}</Eyebrow>
      <Title className="mt-1 text-center text-[22px] leading-[27px]" numberOfLines={2}>
        {specificTopic}
      </Title>
      {timerMode === "pomodoro" ? (
        <View className="mt-2 rounded-full bg-accent-soft px-3.5 py-1">
          <Text className="font-body-extrabold text-xs text-accent-strong">
            Pomodoro · ciclo {pomodoroCycle} · {onBreak ? "descanso" : "foco"}
          </Text>
        </View>
      ) : null}

      <View className="mt-6 items-center justify-center">
        <ProgressRing
          progress={progress}
          size={248}
          stroke={14}
          color={onBreak ? COLORS.positive : COLORS.accent}
          accessibilityLabel={`Quedan ${formatTime(timeLeft)}`}
        >
          <MochiCharacter
            expression={onBreak ? "sleepy" : isRunning ? "focused" : "happy"}
            size={92}
            shadow={false}
          />
          <Text className="font-display text-[44px] leading-[48px] text-ink">
            {formatTime(timeLeft)}
          </Text>
          <Caption>de {formatTime(activeTimerDuration)}</Caption>
        </ProgressRing>
      </View>

      <PressableScale
        onPress={onToggleRunning}
        accessibilityLabel={isRunning ? "Pausar" : "Seguir"}
        className="mt-8 h-[72px] w-[72px] items-center justify-center rounded-full bg-accent"
        style={ACCENT_GLOW}
      >
        <Ionicons name={isRunning ? "pause" : "play"} size={32} color={COLORS.accentInk} />
      </PressableScale>
      <Caption className="mt-2">{isRunning ? "Pausar" : "Seguir"}</Caption>

      <View className="mb-10 mt-8 self-stretch">
        <Button
          title={isCompleting ? "Guardando…" : "Terminé la sesión"}
          variant="outline"
          loading={isCompleting}
          onPress={onComplete}
        />
      </View>
    </View>
  );
}
