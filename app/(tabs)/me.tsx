import { router } from "expo-router";
import { View } from "react-native";
import { useModuleVisibility } from "@/src/core/providers/ModuleVisibilityContext";
import { MochiCharacter } from "@/src/shared/components/MochiCharacter";
import { IconTile, ListGroup, ListRow, MochiBubble, Screen, SectionHeader } from "@/src/shared/ui";

/**
 * Yo: cuerpo, ánimo y hábitos en un solo lugar (reemplaza a Bienestar).
 * Versión puente del Remaster: en la Fase 5 suma la tarjeta del ciclo y el diario unificado.
 */
export default function MeScreen() {
  const { moduleVisibility: m } = useModuleVisibility();
  const go = (route: string) => () => router.push(route as never);

  return (
    <Screen title="Yo">
      <View className="mt-2 flex-row items-end gap-2.5">
        <MochiCharacter expression="love" size={96} animated={false} />
        <MochiBubble className="flex-1" tail="left" text="Aquí cuidamos de ti, a tu ritmo." />
      </View>

      {m.mood_enabled || m.gratitude_enabled ? (
        <>
          <SectionHeader title="Diario" />
          <ListGroup>
            {m.mood_enabled ? (
              <ListRow
                title="Cómo me siento"
                subtitle="Tu ánimo de hoy y de la semana"
                leading={<IconTile icon="happy" tint="me" />}
                onPress={go("/(tabs)/mood")}
              />
            ) : null}
            {m.gratitude_enabled ? (
              <ListRow
                title="Gratitud"
                subtitle="Lo bonito de cada día"
                leading={<IconTile icon="flower" tint="duo" />}
                onPress={go("/(tabs)/gratitude")}
              />
            ) : null}
          </ListGroup>
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
