import { MochiCharacter } from "@/src/shared/components/MochiCharacter";
import { COLORS } from "@/src/shared/theme/tokens";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Text, View } from "react-native";
import type { Deck } from "@/src/features/flashcards/types";
import { reportError } from "@/src/shared/lib/observability/reportError";
import { supabase } from "@/src/shared/lib/supabase";
import {
  ACCENT_GLOW,
  Button,
  Caption,
  EmptyState,
  ErrorState,
  IconTile,
  PressableScale,
  Screen,
  SectionHeader,
  Skeleton,
  Strong,
  Surface,
  Title,
} from "@/src/shared/ui";

type DeckRow = Deck & { total: number; due: number };

export function FlashcardDecksScreen() {
  const [decks, setDecks] = useState<DeckRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const { data: deckData, error } = await supabase
        .from("flashcard_decks")
        .select("id, subject, topic, created_at")
        .order("created_at", { ascending: false })
        .returns<Deck[]>();
      if (error) throw error;

      const { data: cards, error: cardsError } = await supabase
        .from("flashcards")
        .select("deck_id, due_at")
        .returns<{ deck_id: string; due_at: string }[]>();
      if (cardsError) throw cardsError;

      const now = Date.now();
      setDecks(
        (deckData ?? []).map((deck) => {
          const own = (cards ?? []).filter((c) => c.deck_id === deck.id);
          return {
            ...deck,
            total: own.length,
            due: own.filter((c) => new Date(c.due_at).getTime() <= now).length,
          };
        }),
      );
    } catch (error) {
      reportError(error, { scope: "flashcard-decks/load" });
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const totalDue = decks.reduce((sum, deck) => sum + deck.due, 0);

  return (
    <Screen
      title="Mis mazos"
      withTabBar={false}
      closable
      headerRight={
        <PressableScale
          onPress={() => router.push("/flashcard-deck-edit")}
          accessibilityLabel="Nuevo mazo"
          className="h-10 w-10 items-center justify-center rounded-full bg-accent"
          style={ACCENT_GLOW}
        >
          <Ionicons name="add" size={24} color={COLORS.accentInk} />
        </PressableScale>
      }
    >
      {loading ? (
        <View className="mt-4 gap-3">
          <Skeleton height={96} className="rounded-card" />
          <Skeleton height={96} className="rounded-card" />
        </View>
      ) : failed ? (
        <ErrorState onRetry={() => void load()} />
      ) : decks.length === 0 ? (
        <EmptyState
          title="Todavía no tienes mazos"
          message="Crea uno a mano o deja que Mochi genere tarjetas desde un tema."
          actionLabel="Crear mi primer mazo"
          onAction={() => router.push("/flashcard-deck-edit")}
        />
      ) : (
        <>
          {totalDue > 0 ? (
            <Surface elevation={2} className="mt-4 flex-row items-center gap-3 p-4">
              <MochiCharacter expression="focused" size={72} animated={false} shadow={false} />
              <View className="min-w-0 flex-1">
                <Title>
                  {totalDue} {totalDue === 1 ? "tarjeta toca hoy" : "tarjetas tocan hoy"}
                </Title>
                <View className="mt-2.5 self-start">
                  <Button title="Repasar todo" onPress={() => router.push("/flashcards")} />
                </View>
              </View>
            </Surface>
          ) : null}

          <SectionHeader title="Tus mazos" />
          <View className="gap-3">
            {decks.map((deck) => (
              <Surface key={deck.id} className="p-4">
                <View className="flex-row items-center gap-3">
                  <IconTile icon="layers" tint="me" />
                  <View className="min-w-0 flex-1">
                    <Strong numberOfLines={1}>{deck.subject}</Strong>
                    <Caption numberOfLines={1}>{deck.topic}</Caption>
                  </View>
                  <View className="items-end">
                    <Text className="font-display text-xl text-accent-strong">{deck.due}</Text>
                    <Caption className="text-[11px]">de {deck.total}</Caption>
                  </View>
                </View>
                <View className="mt-3 flex-row gap-2">
                  <View className="flex-1">
                    <Button
                      title="Repasar"
                      variant="soft"
                      onPress={() => router.push(`/flashcards?deckId=${deck.id}`)}
                    />
                  </View>
                  <View className="flex-1">
                    <Button
                      title="Editar"
                      variant="outline"
                      onPress={() => router.push(`/flashcard-deck-edit?deckId=${deck.id}`)}
                    />
                  </View>
                </View>
              </Surface>
            ))}
          </View>
        </>
      )}
    </Screen>
  );
}

export default FlashcardDecksScreen;
