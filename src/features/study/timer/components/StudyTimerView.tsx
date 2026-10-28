import { Ionicons } from "@expo/vector-icons";
import Animated, { type AnimatedStyle } from "react-native-reanimated";
import { Text, TouchableOpacity, View } from "react-native";
import type { ViewStyle } from "react-native";
import { colorBorderMap, colorMap, formatTime } from "@/src/features/study/timer/helpers";
import type { PomodoroPhase, TimerMode } from "@/src/features/study/timer/types";

type StudyTimerViewProps = {
  specificTopic: string;
  timerMode: TimerMode;
  pomodoroCycle: number;
  pomodoroPhase: PomodoroPhase;
  blockColor: string;
  timeLeft: number;
  activeTimerDuration: number;
  progressStyle: AnimatedStyle<ViewStyle>;
  isRunning: boolean;
  isCompleting: boolean;
  onToggleRunning: () => void;
  onComplete: () => void;
};

export function StudyTimerView({
  specificTopic,
  timerMode,
  pomodoroCycle,
  pomodoroPhase,
  blockColor,
  timeLeft,
  activeTimerDuration,
  progressStyle,
  isRunning,
  isCompleting,
  onToggleRunning,
  onComplete,
}: StudyTimerViewProps) {
  return (
    <>
      <View className="mt-4 rounded-3xl border-2 border-purple-200 bg-white p-4 dark:border-purple-800 dark:bg-surface">
        <Text className="text-xs font-bold uppercase text-purple-700 dark:text-purple-300">
          Tema actual
        </Text>
        <Text className="mt-1 text-base font-extrabold text-purple-900 dark:text-purple-100">
          {specificTopic}
        </Text>
      </View>

      <View className="mt-5 items-center">
        {timerMode === "pomodoro" ? (
          <View className="mb-3 rounded-full bg-emerald-100 px-4 py-1.5 dark:bg-emerald-900">
            <Text className="text-xs font-extrabold text-emerald-700 dark:text-emerald-300">
              Pomodoro · Ciclo {pomodoroCycle} · {pomodoroPhase === "focus" ? "Foco" : "Descanso"}
            </Text>
          </View>
        ) : null}
        <View
          className={`h-52 w-52 items-center justify-center rounded-full border-8 ${colorBorderMap[blockColor] ?? "border-purple-300 dark:border-purple-700"} ${colorMap[blockColor] ?? "bg-purple-100 dark:bg-purple-900"}`}
        >
          <Text className="text-5xl font-extrabold text-purple-900 dark:text-purple-100">
            {formatTime(timeLeft)}
          </Text>
          <Text className="mt-1 text-sm font-semibold text-purple-500">restante</Text>
        </View>
      </View>

      <View className="mt-6">
        <View className="h-3 w-full overflow-hidden rounded-full bg-purple-100 dark:bg-purple-900">
          <Animated.View style={progressStyle} className="h-3 rounded-full bg-purple-500" />
        </View>
        <View className="mt-2 flex-row justify-between">
          <Text className="text-xs font-semibold text-purple-400">0:00</Text>
          <Text className="text-xs font-semibold text-purple-400">
            {formatTime(activeTimerDuration)}
          </Text>
        </View>
      </View>

      <View className="mt-8 items-center">
        <TouchableOpacity
          className="h-16 w-16 items-center justify-center rounded-full bg-purple-500"
          onPress={() => onToggleRunning()}
        >
          <Ionicons name={isRunning ? "pause" : "play"} size={28} color="white" />
        </TouchableOpacity>
        <Text className="mt-3 text-sm font-semibold text-purple-500">
          {isRunning ? "Pausar" : "Iniciar"}
        </Text>
      </View>

      <TouchableOpacity
        className={`mb-24 mt-8 items-center rounded-2xl border-2 border-purple-200 py-3 dark:border-purple-800 ${isCompleting ? "bg-purple-100 dark:bg-purple-900" : "bg-white dark:bg-surface"}`}
        onPress={() => onComplete()}
        disabled={isCompleting}
      >
        <Text className="font-bold text-purple-700 dark:text-purple-300">
          {isCompleting ? "Guardando..." : "Marcar como completado"}
        </Text>
      </TouchableOpacity>
    </>
  );
}
