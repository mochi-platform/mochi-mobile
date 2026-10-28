import { COLORS } from "@/src/shared/theme/tokens";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { CARD_COLUMNS, type Card } from "@/src/features/flashcards/types";
import { QUALITY, intervalLabel, nextSchedule, type Rating } from "@/src/features/flashcards/sm2";
import { addPoints } from "@/src/shared/lib/gamification";
import { reportError } from "@/src/shared/lib/observability/reportError";
import { supabase } from "@/src/shared/lib/supabase";
import { Button, EmptyState, ErrorState } from "@/src/shared/ui";

const RATINGS: { rating: Rating; label: string; className: string }[] = [
  { rating: "again", label: "Otra vez", className: "bg-danger" },
  { rating: "hard", label: "Difícil", className: "bg-warning" },
  { rating: "good", label: "Bien", className: "bg-accent" },
  { rating: "easy", label: "Fácil", className: "bg-positive" },
];

/** Repaso espaciado (SM-2): solo aparecen las tarjetas que ya toca ver. */
export function FlashcardsScreen() {
  const params = useLocalSearchParams<{ deckId?: string }>();
  const deckId = typeof params.deckId === "string" ? params.deckId : "";
  const reduceMotion = useReducedMotion();

  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [index, setIndex] = useState(0);
  const [reviewed, setReviewed] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const flip = useSharedValue(0);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        let query = supabase
          .from("flashcards")
          .select(CARD_COLUMNS)
          .lte("due_at", new Date().toISOString())
          .order("due_at", { ascending: true })
          .limit(50);
        if (deckId) query = query.eq("deck_id", deckId);
        const { data, error } = await query.returns<Card[]>();
        if (error) throw error;
        setCards(data ?? []);
      } catch (error) {
        reportError(error, { scope: "flashcards/load" });
        setFailed(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [deckId]);

  const card = cards[index] ?? null;

  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ rotateY: `${interpolate(flip.value, [0, 1], [0, 180])}deg` }],
    opacity: interpolate(flip.value, [0, 0.5, 1], [1, 0, 0]),
  }));
  const backStyle = useAnimatedStyle(() => ({
    transform: [{ rotateY: `${interpolate(flip.value, [0, 1], [-180, 0])}deg` }],
    opacity: interpolate(flip.value, [0, 0.5, 1], [0, 0, 1]),
  }));

  const toggle = () => {
    const next = !flipped;
    setFlipped(next);
    flip.value = reduceMotion ? (next ? 1 : 0) : withTiming(next ? 1 : 0, { duration: 300 });
  };

  const rate = async (rating: Rating) => {
    if (!card) return;
    const { error } = await supabase.rpc("review_flashcard", {
      p_card_id: card.id,
      p_quality: QUALITY[rating],
    });
    if (error) {
      reportError(error, { scope: "flashcards/review" });
      return;
    }
    setReviewed((n) => n + 1);
    if (index >= cards.length - 1) {
      setCompleted(true);
      const { data } = await supabase.auth.getUser();
      if (data.user)
        void addPoints(data.user.id, "study_session", undefined, `flashcards-${Date.now()}`);
      return;
    }
    setIndex((i) => i + 1);
    setFlipped(false);
    flip.value = 0;
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-canvas">
        <ActivityIndicator size="large" color={COLORS.accent} />
      </SafeAreaView>
    );
  }
  if (failed) {
    return (
      <SafeAreaView className="flex-1 justify-center bg-canvas">
        <ErrorState
          onRetry={() => router.replace(deckId ? `/flashcards?deckId=${deckId}` : "/flashcards")}
        />
      </SafeAreaView>
    );
  }
  if (!card && !completed) {
    return (
      <SafeAreaView className="flex-1 justify-center bg-canvas px-4">
        <EmptyState
          title="Nada que repasar por hoy"
          message="Cuando una tarjeta toque verse de nuevo, aparecerá aquí."
          actionLabel="Volver a mis mazos"
          onAction={() => router.back()}
        />
      </SafeAreaView>
    );
  }
  if (completed) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-canvas px-6">
        <Text className="text-2xl font-extrabold text-ink">¡Repaso completo!</Text>
        <Text className="mb-6 mt-2 text-center text-sm font-semibold text-ink-muted">
          Repasaste {reviewed} tarjetas. Mochi te las mostrará de nuevo cuando toque.
        </Text>
        <View className="self-stretch">
          <Button title="Volver" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  const current = card as Card;
  const schedule = {
    easeFactor: Number(current.ease_factor),
    intervalDays: current.interval_days,
    repetitions: current.repetitions,
  };
  const progress = Math.round(((index + 1) / cards.length) * 100);

  return (
    <SafeAreaView className="flex-1 bg-canvas px-5">
      <View className="mt-4 flex-row items-center justify-between">
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Volver"
          onPress={() => router.back()}
          className="min-h-[44px] flex-row items-center"
        >
          <Ionicons name="chevron-back" size={22} color={COLORS.accent} />
          <Text className="text-sm font-bold text-ink-muted">Volver</Text>
        </TouchableOpacity>
        <Text className="text-xs font-bold text-ink-muted">
          {index + 1}/{cards.length}
        </Text>
      </View>

      <View className="mt-4 h-2 w-full rounded-full bg-accent-soft">
        <View className="h-2 rounded-full bg-accent" style={{ width: `${progress}%` }} />
      </View>

      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={
          flipped
            ? `Respuesta: ${current.back}`
            : `Pregunta: ${current.front}. Toca para ver la respuesta`
        }
        className="mt-8 h-80"
        activeOpacity={0.95}
        onPress={toggle}
      >
        <Animated.View
          style={frontStyle}
          className="absolute h-full w-full rounded-card border-2 border-line bg-surface p-6"
        >
          <Text className="text-xs font-bold uppercase text-ink-muted">Frente</Text>
          <Text className="mt-4 text-lg font-extrabold text-ink">{current.front}</Text>
        </Animated.View>
        <Animated.View
          style={backStyle}
          className="absolute h-full w-full rounded-card border-2 border-accent bg-accent-soft p-6"
        >
          <Text className="text-xs font-bold uppercase text-ink-muted">Respuesta</Text>
          <Text className="mt-4 text-lg font-extrabold text-ink">{current.back}</Text>
        </Animated.View>
      </TouchableOpacity>

      {flipped ? (
        <View className="mt-6 flex-row gap-2">
          {RATINGS.map(({ rating, label, className }) => (
            <TouchableOpacity
              key={rating}
              accessibilityRole="button"
              className={`min-h-[56px] flex-1 items-center justify-center rounded-control px-1 ${className}`}
              onPress={() => void rate(rating)}
            >
              <Text className="text-sm font-extrabold text-white">{label}</Text>
              <Text className="text-[10px] font-semibold text-white">
                {intervalLabel(nextSchedule(schedule, QUALITY[rating]).intervalDays)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <Text className="mt-6 text-center text-sm font-semibold text-ink-muted">
          Toca la tarjeta para voltearla
        </Text>
      )}
    </SafeAreaView>
  );
}

export default FlashcardsScreen;
