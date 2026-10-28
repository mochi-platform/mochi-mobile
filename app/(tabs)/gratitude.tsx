import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Alert, View } from "react-native";
import { useSession } from "@/src/core/providers/SessionContext";
import { diaryDateLabel } from "@/src/features/me/diary";
import { fetchGratitude, saveGratitude, type GratitudeEntry } from "@/src/features/gratitude/api";
import { MochiCharacter } from "@/src/shared/components/MochiCharacter";
import { addPoints } from "@/src/shared/lib/gamification";
import { reportError } from "@/src/shared/lib/observability/reportError";
import type { MochiHandle } from "@/src/shared/mochi/MochiCanvas";
import {
  Button,
  Caption,
  IconTile,
  Input,
  ListGroup,
  ListRow,
  MochiBubble,
  Screen,
  SectionHeader,
  Surface,
  haptic,
} from "@/src/shared/ui";

const PROMPTS = ["Algo que te hizo sonreír", "Alguien que te ayudó", "Algo pequeño que disfrutaste"];

export function GratitudeScreen() {
  const { session } = useSession();
  const userId = session?.user.id;
  const [today, setToday] = useState<GratitudeEntry | null>(null);
  const [history, setHistory] = useState<GratitudeEntry[]>([]);
  const [items, setItems] = useState(["", "", ""]);
  const [saving, setSaving] = useState(false);
  const mochi = useRef<MochiHandle>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await fetchGratitude(userId);
      setToday(data.today);
      setHistory(data.history);
      setItems([0, 1, 2].map((i) => data.today?.items[i] ?? ""));
    } catch (e) {
      reportError(e, { scope: "gratitude/load" });
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const save = async () => {
    if (!userId || !items[0].trim()) return;
    setSaving(true);
    try {
      const first = !today;
      await saveGratitude(userId, items);
      if (first) await addPoints(userId, "gratitude_entry");
      haptic("success");
      mochi.current?.react("celebrate");
      await load();
    } catch (e) {
      reportError(e, { scope: "gratitude/save" });
      Alert.alert("No se pudo guardar", "Intenta de nuevo en un momento.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen title="Gratitud">
      <View className="mt-2 flex-row items-end gap-2.5">
        <MochiCharacter ref={mochi} expression={today ? "love" : "happy"} size={96} interactive />
        <MochiBubble
          className="flex-1"
          tail="left"
          text={today ? "Gracias por compartirlo conmigo. Lo guardé en tu diario." : "¿Qué fue lo bonito de hoy? Basta con una cosa."}
        />
      </View>

      <Surface elevation={2} className="mt-5 p-4">
        {PROMPTS.map((prompt, index) => (
          <Input
            key={prompt}
            label={index === 0 ? prompt : `${prompt} (opcional)`}
            value={items[index]}
            onChangeText={(text) => setItems((prev) => prev.map((v, i) => (i === index ? text : v)))}
            placeholder="Escribe una línea…"
            maxLength={200}
          />
        ))}
        <Button
          title={today ? "Actualizar" : "Guardar"}
          loading={saving}
          disabled={!items[0].trim()}
          onPress={() => void save()}
        />
        {!today ? <Caption className="mt-2 text-center">Sumas 3 puntos con tu primer registro del día.</Caption> : null}
      </Surface>

      {history.length > 0 ? (
        <>
          <SectionHeader title="Días anteriores" />
          <ListGroup>
            {history.slice(0, 6).map((entry) => (
              <ListRow
                key={entry.date}
                multiline
                title={entry.items.join(" · ")}
                subtitle={diaryDateLabel(entry.date)}
                leading={<IconTile icon="flower" tint="duo" />}
              />
            ))}
          </ListGroup>
        </>
      ) : null}
    </Screen>
  );
}

export default GratitudeScreen;
