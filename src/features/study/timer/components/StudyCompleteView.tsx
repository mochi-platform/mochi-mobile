import { router } from "expo-router";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MochiCharacter } from "@/src/shared/components/MochiCharacter";
import { Button, Caption, Display, MochiBubble, Surface } from "@/src/shared/ui";

type StudyCompleteViewProps = {
  summaryText: string;
  gamificationWarning: string | null;
  didAwardGamification: boolean;
  generatingFlashcards: boolean;
  onGenerateFlashcards: () => void;
};

/** Fin de la sesión: Mochi celebra, se muestran los puntos y se ofrece repasar con tarjetas. */
export function StudyCompleteView({
  summaryText,
  gamificationWarning,
  didAwardGamification,
  generatingFlashcards,
  onGenerateFlashcards,
}: StudyCompleteViewProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      className="flex-1 justify-center bg-canvas px-6"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom + 16 }}
    >
      <View className="items-center">
        <MochiCharacter expression="celebrating" size={180} interactive />
        <Display className="mt-2 text-center">¡Sesión terminada!</Display>
        {didAwardGamification ? (
          <View className="mt-3 rounded-full bg-tint-kitchen px-4 py-1.5">
            <Text className="font-body-extrabold text-sm text-tint-kitchen-ink">+5 puntos</Text>
          </View>
        ) : null}
      </View>
      <MochiBubble className="mt-5" tail="none" text={summaryText} />
      {gamificationWarning ? (
        <Surface tone="sunken" className="mt-3 p-3">
          <Caption className="text-center">{gamificationWarning}</Caption>
        </Surface>
      ) : null}
      <View className="mt-6 gap-2">
        <Button
          title={generatingFlashcards ? "Creando tarjetas…" : "Crear tarjetas de este tema"}
          variant="soft"
          loading={generatingFlashcards}
          onPress={onGenerateFlashcards}
        />
        <Button title="Listo" onPress={() => router.back()} />
      </View>
    </View>
  );
}
