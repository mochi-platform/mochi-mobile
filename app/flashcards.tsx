import { MochiCharacter } from "@/src/shared/components/MochiCharacter";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
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
import {
  Button,
  Caption,
  Display,
  ELEVATION,
  EmptyState,
  ErrorState,
  Eyebrow,
  MochiQuote,
  PressableScale,
  Screen,
  Skeleton,
} from "@/src/shared/ui";

const RATINGS: { rating: Rating; label: string; className: string }[] = [
  { rating: "again", label: "Otra vez", className: "bg-tint-me" },
  { rating: "hard", label: "Difícil", className: "bg-tint-kitchen" },
  { rating: "good", label: "Bien", className: "bg-accent-soft" },
  { rating: "easy", label: "Fácil", className: "bg-tint-ok" },
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
      <Screen title="Repaso" withTabBar={false} closable>
        <Skeleton height={320} className="mt-6 rounded-card" />
      </Screen>
    );
  }
  if (failed) {
    return (
      <Screen title="Repaso" withTabBar={false} closable>
        <ErrorState
          onRetry={() => router.replace(deckId ? `/flashcards?deckId=${deckId}` : "/flashcards")}
        />
      </Screen>
    );
  }
  if (!card && !completed) {
    return (
      <Screen title="Repaso" withTabBar={false} closable>
        <EmptyState
          title="Nada que repasar por hoy"
          message="Cuando una tarjeta toque verse de nuevo, aparecerá aquí."
          actionLabel="Volver a mis mazos"
          onAction={() => router.back()}
        />
      </Screen>
    );
  }
  if (completed) {
    return (
      <Screen withTabBar={false} scroll={false}>
        <View className="flex-1 items-center justify-center">
          <MochiCharacter expression="celebrating" size={170} />
          <Display className="mt-2 text-center">¡Repaso completo!</Display>
          <MochiQuote className="mt-2 text-center text-[17px] leading-[23px]">
            Repasaste {reviewed} {reviewed === 1 ? "tarjeta" : "tarjetas"}. Te las muestro de nuevo
            cuando toque.
          </MochiQuote>
          <View className="mt-6 self-stretch">
            <Button title="Listo" onPress={() => router.back()} />
          </View>
        </View>
      </Screen>
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
    <Screen
      title="Repaso"
      withTabBar={false}
      scroll={false}
      closable
      headerRight={
        <Caption className="mt-3">
          {index + 1} de {cards.length}
        </Caption>
      }
    >
      <View className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-muted">
        <View className="h-full rounded-full bg-accent" style={{ width: `${progress}%` }} />
      </View>

      <PressableScale
        haptics="selection"
        scaleTo={0.98}
        accessibilityLabel={
          flipped
            ? `Respuesta: ${current.back}`
            : `Pregunta: ${current.front}. Toca para ver la respuesta`
        }
        className="mt-6 h-80"
        onPress={toggle}
      >
        <Animated.View
          style={[frontStyle, ELEVATION[2]]}
          className="absolute h-full w-full justify-center rounded-card bg-surface p-6"
        >
          <Eyebrow>Pregunta</Eyebrow>
          <Text className="mt-3 font-display text-[24px] leading-[30px] text-ink">
            {current.front}
          </Text>
        </Animated.View>
        <Animated.View
          style={[backStyle, ELEVATION[2]]}
          className="absolute h-full w-full justify-center rounded-card bg-accent-soft p-6"
        >
          <Eyebrow>Respuesta</Eyebrow>
          <Text className="mt-3 font-body-bold text-[19px] leading-[26px] text-ink">
            {current.back}
          </Text>
        </Animated.View>
      </PressableScale>

      {flipped ? (
        <>
          <Caption className="mt-6 text-center">¿Qué tan bien la recordaste?</Caption>
          <View className="mt-2 flex-row gap-2">
            {RATINGS.map(({ rating, label, className }) => (
              <PressableScale
                key={rating}
                accessibilityLabel={label}
                className={`min-h-[60px] flex-1 items-center justify-center rounded-control px-1 ${className}`}
                onPress={() => void rate(rating)}
              >
                <Text className="font-body-extrabold text-sm text-ink">{label}</Text>
                <Text className="font-body text-[11px] text-ink-muted">
                  {intervalLabel(nextSchedule(schedule, QUALITY[rating]).intervalDays)}
                </Text>
              </PressableScale>
            ))}
          </View>
        </>
      ) : (
        <Caption className="mt-6 text-center">Toca la tarjeta para ver la respuesta.</Caption>
      )}
    </Screen>
  );
}

export default FlashcardsScreen;
