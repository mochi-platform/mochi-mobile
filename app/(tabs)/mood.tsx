import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { Alert, Text, View } from "react-native";
import { useSession } from "@/src/core/providers/SessionContext";
import { CHECKIN_REPLY, pickLine, type Mood } from "@/src/features/companion/lines";
import { diaryDateLabel } from "@/src/features/me/diary";
import { fetchMood, saveMood, type MoodData } from "@/src/features/mood/api";
import { MoodFace } from "@/src/features/today/MoodFace";
import { currentWeek } from "@/src/features/study/api";
import { MochiCharacter } from "@/src/shared/components/MochiCharacter";
import { reportError } from "@/src/shared/lib/observability/reportError";
import type { MochiHandle } from "@/src/shared/mochi/MochiCanvas";
import {
  Button,
  Caption,
  ELEVATION,
  Input,
  ListGroup,
  ListRow,
  MochiBubble,
  PressableScale,
  Screen,
  SectionHeader,
  Surface,
  haptic,
} from "@/src/shared/ui";

const MOODS: Mood[] = [1, 2, 3, 4, 5];
const MOOD_LABEL: Record<Mood, string> = {
  1: "Muy mal",
  2: "Mal",
  3: "Normal",
  4: "Bien",
  5: "Muy bien",
};
const ENERGY = [
  { value: 1, label: "Baja" },
  { value: 3, label: "Media" },
  { value: 5, label: "Alta" },
] as const;

export function MoodScreen() {
  const { session } = useSession();
  const userId = session?.user.id;
  const [data, setData] = useState<MoodData | null>(null);
  const [mood, setMood] = useState<Mood | null>(null);
  const [energy, setEnergy] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const mochi = useRef<MochiHandle>(null);
  const week = useMemo(() => currentWeek(), []);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      const next = await fetchMood(userId);
      setData(next);
      setMood((next.today?.mood as Mood | undefined) ?? null);
      setNote(next.today?.note ?? "");
      setEnergy(next.energy);
    } catch (e) {
      reportError(e, { scope: "mood/load" });
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const save = async () => {
    if (!userId || !mood) return;
    setSaving(true);
    try {
      await saveMood(userId, mood, note, energy);
      haptic("success");
      mochi.current?.react(mood >= 4 ? "celebrate" : "nod");
      await load();
    } catch (e) {
      reportError(e, { scope: "mood/save" });
      Alert.alert("No se pudo guardar", "Intenta de nuevo en un momento.");
    } finally {
      setSaving(false);
    }
  };

  const byDate = new Map((data?.recent ?? []).map((e) => [e.date, e.mood as Mood]));
  const line = mood
    ? pickLine(CHECKIN_REPLY[mood], `${week.find((d) => d.isToday)?.iso}-${mood}`)
    : "¿Cómo te sientes hoy? Lo que sea que sientas, está bien.";

  return (
    <Screen title="Mi ánimo" withTabBar>
      <View className="mt-2 flex-row items-end gap-2.5">
        <MochiCharacter
          ref={mochi}
          expression={mood ? (mood <= 2 ? "soft_sad" : mood === 3 ? "happy" : "proud") : "thinking"}
          size={96}
          interactive
        />
        <MochiBubble className="flex-1" tail="left" text={line} />
      </View>

      <Surface elevation={2} className="mt-5 p-4">
        <View className="flex-row justify-between" accessibilityRole="radiogroup">
          {MOODS.map((value) => {
            const on = mood === value;
            return (
              <PressableScale
                key={value}
                haptics="selection"
                onPress={() => setMood(value)}
                accessibilityRole="radio"
                accessibilityLabel={MOOD_LABEL[value]}
                accessibilityState={{ selected: on }}
                className={`h-[54px] w-[54px] items-center justify-center rounded-[18px] ${on ? "bg-accent" : "bg-surface-muted"}`}
              >
                <MoodFace mood={value} size={34} />
              </PressableScale>
            );
          })}
        </View>
        <Text className="mb-2 ml-1 mt-4 font-body-bold text-sm text-ink">Tu energía</Text>
        <View className="mb-4 flex-row gap-2" accessibilityRole="radiogroup">
          {ENERGY.map((e) => {
            const on = energy === e.value;
            return (
              <PressableScale
                key={e.value}
                haptics="selection"
                onPress={() => setEnergy(on ? null : e.value)}
                accessibilityRole="radio"
                accessibilityLabel={`Energía ${e.label.toLowerCase()}`}
                accessibilityState={{ selected: on }}
                className={`h-11 flex-1 items-center justify-center rounded-control ${on ? "bg-accent" : "bg-surface-muted"}`}
              >
                <Text
                  className={`font-body-extrabold text-sm ${on ? "text-accent-ink" : "text-ink"}`}
                >
                  {e.label}
                </Text>
              </PressableScale>
            );
          })}
        </View>
        <Input
          label="¿Quieres contar algo? (opcional)"
          value={note}
          onChangeText={setNote}
          placeholder="Hoy me sentí…"
          multiline
          maxLength={280}
        />
        <Button
          title={data?.today ? "Actualizar" : "Guardar"}
          loading={saving}
          disabled={!mood}
          onPress={() => void save()}
        />
      </Surface>

      <SectionHeader title="Esta semana" />
      <View
        className="flex-row justify-between rounded-card bg-surface px-3 py-3.5"
        style={ELEVATION[1]}
      >
        {week.map((d) => {
          const value = byDate.get(d.iso);
          return (
            <View
              key={d.iso}
              className="items-center gap-1.5"
              accessibilityLabel={`${d.letter}: ${value ? MOOD_LABEL[value] : "sin registro"}`}
            >
              <Text
                className={`font-body-extrabold text-[11px] ${d.isToday ? "text-accent-strong" : "text-ink-muted"}`}
              >
                {d.letter}
              </Text>
              {value ? (
                <MoodFace mood={value} size={30} />
              ) : (
                <View className="h-[30px] w-[30px] rounded-full bg-surface-muted" />
              )}
            </View>
          );
        })}
      </View>

      {data && data.recent.some((e) => e.note) ? (
        <>
          <SectionHeader title="Lo que contaste" />
          <ListGroup>
            {data.recent
              .filter((e) => e.note)
              .slice(0, 5)
              .map((e) => (
                <ListRow
                  key={e.date}
                  multiline
                  title={e.note as string}
                  subtitle={diaryDateLabel(e.date)}
                  leading={<MoodFace mood={e.mood as Mood} size={40} />}
                />
              ))}
          </ListGroup>
        </>
      ) : (
        <Caption className="ml-1 mt-3">Tus notas aparecerán aquí y en el diario de Yo.</Caption>
      )}
    </Screen>
  );
}

export default MoodScreen;
