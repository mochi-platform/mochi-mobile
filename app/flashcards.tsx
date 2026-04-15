import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { supabase } from "@/src/shared/lib/supabase";
import type { Flashcard } from "@/src/shared/types/database";

type Difficulty = 1 | 2 | 3;

export function FlashcardsScreen() {
  const params = useLocalSearchParams<{ deckId?: string }>();
  const deckId = typeof params.deckId === "string" ? params.deckId : "";

  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [flipped, setFlipped] = useState(false);

  const flipValue = useSharedValue(0);

  useEffect(() => {
    if (!deckId) {
      setLoading(false);
      return;
    }

    async function loadCards() {
      setLoading(true);
      const { data } = await supabase
        .from("flashcards")
        .select("*")
        .eq("deck_id", deckId)
        .order("id", { ascending: true })
        .returns<Flashcard[]>();

      setCards(data ?? []);
      setLoading(false);
    }

    void loadCards();
  }, [deckId]);

  const currentCard = cards[index] ?? null;
  const reviewedCount = Math.min(index + 1, cards.length);
  const progress =
    cards.length > 0 ? Math.round((reviewedCount / cards.length) * 100) : 0;

  const frontStyle = useAnimatedStyle(() => ({
    transform: [
      { rotateY: `${interpolate(flipValue.value, [0, 1], [0, 180])}deg` },
    ],
    opacity: interpolate(flipValue.value, [0, 0.5, 1], [1, 0, 0]),
  }));

  const backStyle = useAnimatedStyle(() => ({
    transform: [
      { rotateY: `${interpolate(flipValue.value, [0, 1], [-180, 0])}deg` },
    ],
    opacity: interpolate(flipValue.value, [0, 0.5, 1], [0, 0, 1]),
  }));

  const flipCard = () => {
    const next = !flipped;
    setFlipped(next);
    flipValue.value = withTiming(next ? 1 : 0, { duration: 300 });
  };

  const rateCard = async (difficulty: Difficulty) => {
    if (!currentCard) return;

    await supabase
      .from("flashcards")
      .update({
        difficulty_rating: difficulty,
        review_count: (currentCard.review_count ?? 0) + 1,
        last_reviewed_at: new Date().toISOString(),
      })
      .eq("id", currentCard.id);

    if (index >= cards.length - 1) {
      setCompleted(true);
      return;
    }

    setIndex((prev) => prev + 1);
    setFlipped(false);
    flipValue.value = withTiming(0, { duration: 200 });
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-violet-50">
        <ActivityIndicator size="large" color="#7c3aed" />
      </SafeAreaView>
    );
  }

  if (!currentCard && !completed) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-violet-50 px-6">
        <Text className="text-center text-sm font-semibold text-violet-700">
          No hay tarjetas en este mazo.
        </Text>
      </SafeAreaView>
    );
  }

  if (completed) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-violet-50 px-6">
        <Text className="text-2xl font-extrabold text-violet-900">
          ¡Repaso completo!
        </Text>
        <Text className="mt-2 text-center text-sm font-semibold text-violet-700">
          Revisaste {cards.length} tarjetas. Excelente constancia.
        </Text>
        <TouchableOpacity
          className="mt-6 rounded-2xl bg-violet-500 px-6 py-3"
          onPress={() => router.back()}
        >
          <Text className="font-bold text-white">Volver</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-violet-50 px-5">
      <View className="mt-4 flex-row items-center justify-between">
        <TouchableOpacity
          onPress={() => router.back()}
          className="flex-row items-center"
        >
          <Ionicons name="chevron-back" size={22} color="#6d28d9" />
          <Text className="text-sm font-bold text-violet-700">Volver</Text>
        </TouchableOpacity>
        <Text className="text-xs font-bold text-violet-700">
          {reviewedCount}/{cards.length}
        </Text>
      </View>

      <View className="mt-4 h-2 w-full rounded-full bg-violet-100">
        <View
          className="h-2 rounded-full bg-violet-500"
          style={{ width: `${progress}%` }}
        />
      </View>

      <TouchableOpacity
        className="mt-8 h-80"
        activeOpacity={0.95}
        onPress={flipCard}
      >
        <Animated.View
          style={frontStyle}
          className="absolute h-full w-full rounded-3xl border-2 border-violet-200 bg-white p-6"
        >
          <Text className="text-xs font-bold uppercase text-violet-600">
            Frente
          </Text>
          <Text className="mt-4 text-lg font-extrabold text-violet-900">
            {currentCard.front}
          </Text>
        </Animated.View>
        <Animated.View
          style={backStyle}
          className="absolute h-full w-full rounded-3xl border-2 border-violet-300 bg-violet-100 p-6"
        >
          <Text className="text-xs font-bold uppercase text-violet-700">
            Respuesta
          </Text>
          <Text className="mt-4 text-lg font-extrabold text-violet-900">
            {currentCard.back}
          </Text>
        </Animated.View>
      </TouchableOpacity>

      {flipped ? (
        <View className="mt-6 flex-row justify-between">
          <TouchableOpacity
            className="rounded-2xl bg-red-500 px-4 py-3"
            onPress={() => {
              void rateCard(1);
            }}
          >
            <Text className="font-bold text-white">Difícil</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="rounded-2xl bg-yellow-500 px-4 py-3"
            onPress={() => {
              void rateCard(2);
            }}
          >
            <Text className="font-bold text-white">Bien</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="rounded-2xl bg-green-500 px-4 py-3"
            onPress={() => {
              void rateCard(3);
            }}
          >
            <Text className="font-bold text-white">Fácil</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Text className="mt-6 text-center text-sm font-semibold text-violet-600">
          Toca la tarjeta para voltearla
        </Text>
      )}
    </SafeAreaView>
  );
}

export default FlashcardsScreen;
