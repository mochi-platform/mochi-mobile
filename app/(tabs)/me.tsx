import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { useModuleVisibility } from "@/src/core/providers/ModuleVisibilityContext";
import { useSession } from "@/src/core/providers/SessionContext";
import { diaryDateLabel, fetchDiary, type DiaryDay } from "@/src/features/me/diary";
import { CycleCard } from "@/src/features/today/CycleCard";
import { MoodFace } from "@/src/features/today/MoodFace";
import type { Mood } from "@/src/features/companion/lines";
import { reportError } from "@/src/shared/lib/observability/reportError";
import {
  Caption,
  IconTile,
  ListGroup,
  ListRow,
  PressableScale,
  Screen,
  SectionHeader,
  Surface,
} from "@/src/shared/ui";

/** Yo: el ciclo, el diario (ánimo + gratitud) y las rutinas, en un solo lugar. */
export default function MeScreen() {
  const { session } = useSession();
  const userId = session?.user.id;
  const { moduleVisibility: m } = useModuleVisibility();
  const [diary, setDiary] = useState<DiaryDay[] | null>(null);
  const go = (route: string) => () => router.push(route as never);
  const showDiary = m.mood_enabled || m.gratitude_enabled;

  useFocusEffect(
    useCallback(() => {
      if (!userId || !showDiary) return;
      let alive = true;
      fetchDiary(userId)
        .then((days) => {
          if (alive) setDiary(days);
        })
        .catch((error) => reportError(error, { scope: "me/diary" }));
      return () => {
        alive = false;
      };
    }, [userId, showDiary]),
  );

  const name = session?.user.user_metadata?.full_name as string | undefined;
  return (
    <Screen
      title="Yo"
      headerRight={
        <PressableScale
          onPress={go("/profile")}
          accessibilityLabel="Perfil y logros"
          className="h-10 w-10 items-center justify-center rounded-full bg-tint-me"
        >
          <Text className="font-display text-base text-tint-me-ink">
            {(name?.trim().charAt(0) || "Y").toUpperCase()}
          </Text>
        </PressableScale>
      }
    >
      <CycleCard />

      {showDiary ? (
        <>
          <SectionHeader
            title="Diario"
            actionLabel="Escribir"
            onAction={go(m.gratitude_enabled ? "/(tabs)/gratitude" : "/(tabs)/mood")}
          />
          {diary && diary.length > 0 ? (
            <ListGroup>
              {diary.slice(0, 5).map((day) => (
                <ListRow
                  key={day.date}
                  multiline
                  title={day.text ?? "Solo registraste cómo te sentías."}
                  subtitle={diaryDateLabel(day.date)}
                  leading={
                    day.mood ? (
                      <MoodFace mood={day.mood as Mood} size={40} />
                    ) : (
                      <IconTile icon="flower" tint="duo" />
                    )
                  }
                />
              ))}
            </ListGroup>
          ) : (
            <Surface tone="sunken" className="p-4">
              <Caption>
                Aquí se juntan cómo te sentiste y lo bonito de cada día. Empieza con el check-in de
                Hoy.
              </Caption>
            </Surface>
          )}
          <View className="mt-3 flex-row gap-3">
            {m.mood_enabled ? (
              <Surface
                onPress={go("/(tabs)/mood")}
                accessibilityLabel="Mi ánimo"
                className="flex-1 flex-row items-center gap-3 p-3.5"
              >
                <IconTile icon="happy" tint="me" size={36} />
                <Text className="font-body-extrabold text-[15px] text-ink">Mi ánimo</Text>
              </Surface>
            ) : null}
            {m.gratitude_enabled ? (
              <Surface
                onPress={go("/(tabs)/gratitude")}
                accessibilityLabel="Gratitud"
                className="flex-1 flex-row items-center gap-3 p-3.5"
              >
                <IconTile icon="flower" tint="duo" size={36} />
                <Text className="font-body-extrabold text-[15px] text-ink">Gratitud</Text>
              </Surface>
            ) : null}
          </View>
        </>
      ) : null}

      {m.habits_enabled || m.exercise_enabled || m.goals_enabled ? (
        <>
          <SectionHeader title="Rutinas" />
          <ListGroup>
            {m.habits_enabled ? (
              <ListRow
                title="Hábitos"
                subtitle="Rachas y seguimiento diario"
                leading={<IconTile icon="leaf" tint="ok" />}
                onPress={go("/(tabs)/habits")}
              />
            ) : null}
            {m.exercise_enabled ? (
              <ListRow
                title="Moverme"
                subtitle="Rutinas y entrenos"
                leading={<IconTile icon="barbell" tint="study" />}
                onPress={go("/(tabs)/exercise")}
              />
            ) : null}
            {m.goals_enabled ? (
              <ListRow
                title="Metas"
                subtitle="Lo que quieres lograr"
                leading={<IconTile icon="flag" tint="kitchen" />}
                onPress={go("/(tabs)/goals")}
              />
            ) : null}
          </ListGroup>
        </>
      ) : null}

      <SectionHeader title="Mi cuenta" />
      <ListGroup>
        <ListRow
          title="Perfil y logros"
          leading={<IconTile icon="person" tint="me" />}
          onPress={go("/profile")}
        />
        <ListRow
          title="Ajustes"
          subtitle="Módulos, recordatorios y privacidad"
          leading={<IconTile icon="settings" tint="study" />}
          onPress={go("/settings")}
        />
      </ListGroup>
    </Screen>
  );
}
