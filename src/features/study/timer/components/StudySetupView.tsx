import { tc } from "@/src/shared/theme/colors";
import { ActivityIndicator, Image, Text, TextInput, TouchableOpacity, View } from "react-native";
import { getAttachmentLabel } from "@/src/features/study/timer/helpers";
import type { StudyAttachment, TimerMode } from "@/src/features/study/timer/types";

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
  return (
    <View className="mt-4 rounded-3xl border-2 border-purple-200 bg-white p-4 dark:border-purple-800 dark:bg-surface">
      <Text className="text-xs font-bold uppercase text-purple-700 dark:text-purple-300">
        Modo de sesion
      </Text>
      <View className="mt-2 flex-row gap-2">
        <TouchableOpacity
          className={`flex-1 rounded-xl border px-3 py-2 ${
            timerMode === "regular"
              ? "border-purple-500 bg-purple-500"
              : "border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950"
          }`}
          onPress={() => onTimerModeChange("regular")}
        >
          <Text
            className={`text-center text-xs font-bold ${
              timerMode === "regular" ? "text-white" : "text-purple-700 dark:text-purple-300"
            }`}
          >
            Regular
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className={`flex-1 rounded-xl border px-3 py-2 ${
            timerMode === "pomodoro"
              ? "border-emerald-500 bg-emerald-500"
              : "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950"
          }`}
          onPress={() => onTimerModeChange("pomodoro")}
        >
          <Text
            className={`text-center text-xs font-bold ${
              timerMode === "pomodoro" ? "text-white" : "text-emerald-700 dark:text-emerald-300"
            }`}
          >
            Pomodoro 25/5
          </Text>
        </TouchableOpacity>
      </View>
      {timerMode === "pomodoro" ? (
        <Text className="mt-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
          Alterna foco y descanso con aviso automatico en cada cambio de fase.
        </Text>
      ) : null}

      <Text className="mt-4 text-sm font-bold text-purple-800 dark:text-purple-200">
        ¿Qué vas a estudiar específicamente hoy?
      </Text>
      <TextInput
        className="mt-2 rounded-2xl border-2 border-purple-200 bg-purple-50 px-4 py-3 text-sm font-semibold text-slate-800 dark:border-purple-800 dark:bg-purple-950 dark:text-slate-200"
        placeholder="Ej: Integrales por sustitución y ejercicios tipo examen"
        placeholderTextColor={tc("#a78bfa")}
        value={specificTopic}
        onChangeText={onSpecificTopicChange}
        multiline
      />

      <Text className="mt-4 text-xs font-bold uppercase text-purple-700 dark:text-purple-300">
        Adjunto opcional
      </Text>
      <View className="mt-2 flex-row flex-wrap gap-2">
        <TouchableOpacity
          className="rounded-xl bg-purple-100 px-3 py-2 dark:bg-purple-900"
          onPress={() => onPickCamera()}
        >
          <Text className="text-xs font-bold text-purple-800 dark:text-purple-200">Cámara</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="rounded-xl bg-purple-100 px-3 py-2 dark:bg-purple-900"
          onPress={() => onPickGallery()}
        >
          <Text className="text-xs font-bold text-purple-800 dark:text-purple-200">Galería</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="rounded-xl bg-purple-100 px-3 py-2 dark:bg-purple-900"
          onPress={() => onPickDocument()}
        >
          <Text className="text-xs font-bold text-purple-800 dark:text-purple-200">Archivo</Text>
        </TouchableOpacity>
        {setupAttachment ? (
          <TouchableOpacity
            className="rounded-xl bg-red-100 px-3 py-2 dark:bg-red-900"
            onPress={() => onRemoveAttachment()}
          >
            <Text className="text-xs font-bold text-red-700 dark:text-red-300">Quitar</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {setupAttachment ? (
        <View className="mt-3 rounded-2xl border border-purple-200 bg-purple-50 p-3 dark:border-purple-800 dark:bg-purple-950">
          {setupAttachment.previewUri ? (
            <Image
              source={{ uri: setupAttachment.previewUri }}
              className="h-24 w-full rounded-xl"
              resizeMode="cover"
            />
          ) : (
            <View className="h-16 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-900">
              <Text className="text-xs font-bold text-purple-700 dark:text-purple-300">
                {getAttachmentLabel(setupAttachment.mimeType)}
              </Text>
            </View>
          )}
          <Text
            className="mt-2 text-xs font-semibold text-purple-700 dark:text-purple-300"
            numberOfLines={1}
          >
            {setupAttachment.name}
          </Text>
        </View>
      ) : null}

      <TouchableOpacity
        className={`mt-4 items-center rounded-2xl py-3 ${planning ? "bg-purple-200 dark:bg-purple-800" : "bg-purple-500"}`}
        onPress={() => onGeneratePlan()}
        disabled={planning || !specificTopic.trim()}
      >
        {planning ? (
          <View className="flex-row items-center">
            <ActivityIndicator color="white" />
            <Text className="ml-2 font-bold text-white">Creando plan...</Text>
          </View>
        ) : (
          <Text className="font-bold text-white">Pedir plan a Mochi</Text>
        )}
      </TouchableOpacity>

      {planError ? (
        <Text className="mt-2 text-xs font-semibold text-red-600 dark:text-red-400">
          {planError}
        </Text>
      ) : null}

      {studyPlan ? (
        <View className="mt-4 rounded-2xl border border-purple-200 bg-purple-50 p-3 dark:border-purple-800 dark:bg-purple-950">
          <Text className="text-sm font-semibold leading-5 text-purple-900 dark:text-purple-100">
            {studyPlan}
          </Text>
        </View>
      ) : null}

      <TouchableOpacity
        className={`mt-4 items-center rounded-2xl py-3 ${specificTopic.trim() ? "bg-emerald-500" : "bg-emerald-200 dark:bg-emerald-800"}`}
        disabled={!specificTopic.trim()}
        onPress={() => onStartSession()}
      >
        <Text className="font-bold text-white">Empezar sesión</Text>
      </TouchableOpacity>
    </View>
  );
}
