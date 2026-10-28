import { router } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MochiCharacter } from "@/src/shared/components/MochiCharacter";

type StudyCompleteViewProps = {
  summaryText: string;
  gamificationWarning: string | null;
  didAwardGamification: boolean;
  generatingFlashcards: boolean;
  onGenerateFlashcards: () => void;
};

export function StudyCompleteView({
  summaryText,
  gamificationWarning,
  didAwardGamification,
  generatingFlashcards,
  onGenerateFlashcards,
}: StudyCompleteViewProps) {
  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-purple-50 px-6 dark:bg-purple-950">
      <MochiCharacter mood="excited" size={120} />
      <Text className="mt-6 text-2xl font-extrabold text-purple-900 dark:text-purple-100">
        ¡Bloque completado!
      </Text>
      <Text className="mt-2 text-center text-sm font-semibold text-purple-600 dark:text-purple-400">
        {summaryText}
      </Text>
      {gamificationWarning ? (
        <View className="mt-4 w-full rounded-2xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950">
          <Text className="text-center text-sm font-semibold text-amber-700 dark:text-amber-300">
            {gamificationWarning}
          </Text>
        </View>
      ) : null}
      {didAwardGamification ? (
        <View className="mt-4 rounded-full bg-yellow-200 px-5 py-2 dark:bg-yellow-800">
          <Text className="font-extrabold text-yellow-900 dark:text-yellow-100">+5 puntos</Text>
        </View>
      ) : null}
      <TouchableOpacity
        className={`mt-4 rounded-2xl px-6 py-3 ${generatingFlashcards ? "bg-indigo-300 dark:bg-indigo-700" : "bg-indigo-500"}`}
        onPress={() => onGenerateFlashcards()}
        disabled={generatingFlashcards}
      >
        <Text className="font-extrabold text-white">
          {generatingFlashcards ? "Generando..." : "Generar flashcards del tema"}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        className="mt-8 rounded-2xl bg-purple-500 px-8 py-4"
        onPress={() => router.back()}
      >
        <Text className="font-extrabold text-white">Volver al inicio</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
