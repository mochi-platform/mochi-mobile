import { COLORS } from "@/src/shared/theme/tokens";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { AIError, generateFlashcardsFromImage } from "@/src/shared/lib/ai";
import { reportError } from "@/src/shared/lib/observability/reportError";
import { supabase } from "@/src/shared/lib/supabase";
import {
  Button,
  Caption,
  Input,
  ListGroup,
  ListRow,
  PressableScale,
  Screen,
  SectionHeader,
  Surface,
} from "@/src/shared/ui";

type Draft = { front: string; back: string };
type ExistingCard = { id: string; front: string; back: string };

/** Crea un mazo a mano, agrega tarjetas, o las genera desde una foto de apuntes (Premium). */
export function FlashcardDeckEditScreen() {
  const params = useLocalSearchParams<{ deckId?: string }>();
  const deckId = typeof params.deckId === "string" ? params.deckId : "";

  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [existing, setExisting] = useState<ExistingCard[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([{ front: "", back: "" }]);
  const [busy, setBusy] = useState<"save" | "photo" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!deckId) return;
    void (async () => {
      const { data: deck } = await supabase
        .from("flashcard_decks")
        .select("subject, topic")
        .eq("id", deckId)
        .maybeSingle<{ subject: string; topic: string }>();
      if (deck) {
        setSubject(deck.subject);
        setTopic(deck.topic);
      }
      const { data: cards } = await supabase
        .from("flashcards")
        .select("id, front, back")
        .eq("deck_id", deckId)
        .returns<ExistingCard[]>();
      setExisting(cards ?? []);
    })();
  }, [deckId]);

  const updateDraft = (i: number, patch: Partial<Draft>) =>
    setDrafts((prev) => prev.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));

  const importFromPhoto = async () => {
    setError(null);
    if (subject.trim().length === 0) {
      setError("Escribe primero la materia del mazo.");
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      base64: true,
      quality: 0.5,
    });
    if (picked.canceled || !picked.assets[0]?.base64) return;

    setBusy("photo");
    try {
      const asset = picked.assets[0];
      const cards = await generateFlashcardsFromImage({
        subject: subject.trim(),
        topic: topic.trim() || undefined,
        imageBase64: asset.base64 as string,
        mimeType: asset.mimeType ?? "image/jpeg",
      });
      setDrafts((prev) => [...prev.filter((d) => d.front || d.back), ...cards]);
    } catch (err) {
      if (err instanceof AIError && err.status === 403) {
        setError("Importar desde una foto es parte de Premium.");
        router.push("/premium");
      } else if (err instanceof AIError && err.code === "RATE_LIMIT") {
        setError("No tienes créditos de IA disponibles ahora.");
      } else {
        reportError(err, { scope: "flashcards/import-photo" });
        setError(
          "No se pudieron generar tarjetas desde la foto. Intenta con una imagen más clara.",
        );
      }
    } finally {
      setBusy(null);
    }
  };

  const save = async () => {
    setError(null);
    const valid = drafts.filter((d) => d.front.trim() && d.back.trim());
    if (subject.trim().length === 0) {
      setError("Escribe la materia del mazo.");
      return;
    }
    if (!deckId && valid.length === 0) {
      setError("Agrega al menos una tarjeta con pregunta y respuesta.");
      return;
    }

    setBusy("save");
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Sin sesión");

      let targetDeck = deckId;
      if (!targetDeck) {
        const { data, error: deckError } = await supabase
          .from("flashcard_decks")
          .insert({
            user_id: userData.user.id,
            subject: subject.trim(),
            topic: topic.trim() || subject.trim(),
          })
          .select("id")
          .single<{ id: string }>();
        if (deckError) throw deckError;
        targetDeck = data.id;
      }
      if (valid.length > 0) {
        const { error: cardsError } = await supabase
          .from("flashcards")
          .insert(
            valid.map((d) => ({ deck_id: targetDeck, front: d.front.trim(), back: d.back.trim() })),
          );
        if (cardsError) throw cardsError;
      }
      router.back();
    } catch (err) {
      reportError(err, { scope: "flashcards/save-deck" });
      setError("No se pudo guardar el mazo. Intenta de nuevo.");
    } finally {
      setBusy(null);
    }
  };

  const removeExisting = async (id: string) => {
    const { error: deleteError } = await supabase.from("flashcards").delete().eq("id", id);
    if (!deleteError) setExisting((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <Screen title={deckId ? "Editar mazo" : "Nuevo mazo"} withTabBar={false} closable keyboard>
      <Input label="Materia" value={subject} onChangeText={setSubject} editable={!deckId} />
      <Input label="Tema (opcional)" value={topic} onChangeText={setTopic} editable={!deckId} />

      {existing.length > 0 ? (
        <>
          <SectionHeader title={`Tarjetas del mazo (${existing.length})`} />
          <ListGroup>
            {existing.map((c) => (
              <ListRow
                key={c.id}
                title={c.front}
                subtitle={c.back}
                multiline
                trailing={
                  <PressableScale
                    haptics="warning"
                    accessibilityLabel="Borrar tarjeta"
                    onPress={() => void removeExisting(c.id)}
                    className="h-10 w-10 items-center justify-center rounded-full bg-surface-muted"
                  >
                    <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                  </PressableScale>
                }
              />
            ))}
          </ListGroup>
        </>
      ) : null}

      <SectionHeader title="Tarjetas nuevas" />
      <View className="gap-3">
        {drafts.map((draft, i) => (
          <Surface key={i} className="p-4 pb-2">
            <Input
              label={`Pregunta ${i + 1}`}
              value={draft.front}
              onChangeText={(v) => updateDraft(i, { front: v })}
              multiline
            />
            <Input
              label="Respuesta"
              value={draft.back}
              onChangeText={(v) => updateDraft(i, { back: v })}
              multiline
            />
            {drafts.length > 1 ? (
              <View className="mb-2">
                <Button
                  title="Quitar"
                  variant="ghost"
                  onPress={() => setDrafts((prev) => prev.filter((_, idx) => idx !== i))}
                />
              </View>
            ) : null}
          </Surface>
        ))}
      </View>

      <View className="mt-3 gap-2">
        <Button
          title="Agregar otra tarjeta"
          variant="soft"
          icon="add"
          onPress={() => setDrafts((prev) => [...prev, { front: "", back: "" }])}
        />
        <Button
          title="Crear desde una foto (Premium)"
          variant="outline"
          icon="camera-outline"
          loading={busy === "photo"}
          onPress={() => void importFromPhoto()}
        />
      </View>

      {error ? <Caption className="ml-1 mt-3 text-danger">{error}</Caption> : null}

      <View className="mt-5">
        <Button title="Guardar" loading={busy === "save"} onPress={() => void save()} />
      </View>
    </Screen>
  );
}

export default FlashcardDeckEditScreen;
