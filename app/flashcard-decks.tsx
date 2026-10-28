import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Deck } from "@/src/features/flashcards/types";
import { reportError } from "@/src/shared/lib/observability/reportError";
import { supabase } from "@/src/shared/lib/supabase";
import { Button, Card, EmptyState, ErrorState, Skeleton } from "@/src/shared/ui";

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
    <SafeAreaView className="flex-1 bg-canvas">
      <View className="flex-row items-center px-4 pb-2 pt-2">
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Volver"
          className="h-11 w-11 items-center justify-center"
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={24} color="#8b6fd6" />
        </TouchableOpacity>
        <Text className="ml-1 text-xl font-extrabold text-ink">Mis mazos</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {loading ? (
          <View className="gap-3">
            <Skeleton height={88} />
            <Skeleton height={88} />
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
              <Card className="mb-4 bg-accent-soft">
                <Text className="text-base font-extrabold text-ink">
                  {totalDue} {totalDue === 1 ? "tarjeta toca" : "tarjetas tocan"} repasarse hoy
                </Text>
                <View className="mt-3">
                  <Button title="Repasar todo" onPress={() => router.push("/flashcards")} />
                </View>
              </Card>
            ) : null}

            {decks.map((deck) => (
              <TouchableOpacity
                key={deck.id}
                accessibilityRole="button"
                accessibilityLabel={`${deck.subject}, ${deck.topic}. ${deck.due} por repasar de ${deck.total}`}
                className="mb-3"
                onPress={() => router.push(`/flashcards?deckId=${deck.id}`)}
              >
                <Card>
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1 pr-3">
                      <Text className="text-base font-extrabold text-ink">{deck.subject}</Text>
                      <Text className="text-xs font-semibold text-ink-muted">{deck.topic}</Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-sm font-extrabold text-accent">
                        {deck.due} por repasar
                      </Text>
                      <Text className="text-xs font-semibold text-ink-muted">
                        {deck.total} tarjetas
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    accessibilityRole="button"
                    className="mt-2 min-h-[44px] justify-center"
                    onPress={() => router.push(`/flashcard-deck-edit?deckId=${deck.id}`)}
                  >
                    <Text className="text-xs font-extrabold text-ink-muted">Editar tarjetas</Text>
                  </TouchableOpacity>
                </Card>
              </TouchableOpacity>
            ))}

            <View className="mt-2">
              <Button
                title="Nuevo mazo"
                variant="soft"
                onPress={() => router.push("/flashcard-deck-edit")}
              />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

export default FlashcardDecksScreen;
