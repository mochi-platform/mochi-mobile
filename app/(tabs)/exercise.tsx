import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, View } from "react-native";
import { useSession } from "@/src/core/providers/SessionContext";
import {
  deleteExercise,
  fetchExercise,
  type ExerciseItem,
  type RoutineItem,
} from "@/src/features/exercise/api";
import { MochiCharacter } from "@/src/shared/components/MochiCharacter";
import { useCycleRecommendation } from "@/src/shared/hooks/useCycleRecommendation";
import { reportError } from "@/src/shared/lib/observability/reportError";
import { COLORS } from "@/src/shared/theme/tokens";
import {
  ACCENT_GLOW,
  Button,
  Caption,
  ELEVATION,
  ErrorState,
  Eyebrow,
  IconTile,
  ListGroup,
  ListRow,
  MochiBubble,
  PressableScale,
  Screen,
  SectionHeader,
  Sheet,
  Title,
  haptic,
} from "@/src/shared/ui";

const DAY = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

function daysLabel(days: number[]): string {
  if (days.length === 7) return "Todos los días";
  if (days.length === 0) return "Sin días fijos";
  return [...days]
    .sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7))
    .map((d) => DAY[d])
    .join(" · ");
}

export function ExerciseScreen() {
  const { session } = useSession();
  const userId = session?.user.id;
  const { tip } = useCycleRecommendation("exercise");
  const [data, setData] = useState<{ routines: RoutineItem[]; exercises: ExerciseItem[] } | null>(
    null,
  );
  const [error, setError] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      setData(await fetchExercise(userId));
      setError(false);
    } catch (e) {
      reportError(e, { scope: "exercise/load" });
      setError(true);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const today = new Date().getDay();
  const todayRoutine = data?.routines.find((r) => r.days.includes(today)) ?? null;
  const others = data?.routines.filter((r) => r.id !== todayRoutine?.id) ?? [];

  const askDelete = (exercise: ExerciseItem) => {
    haptic("warning");
    Alert.alert("Eliminar ejercicio", `¿Eliminar «${exercise.name}»?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: () => {
          if (!userId) return;
          void deleteExercise(userId, exercise.id)
            .then(load)
            .catch((e) => reportError(e, { scope: "exercise/delete" }));
        },
      },
    ]);
  };

  return (
    <Screen
      title="Moverme"
      headerRight={
        <PressableScale
          onPress={() => setAddOpen(true)}
          accessibilityLabel="Agregar"
          className="h-11 w-11 items-center justify-center rounded-2xl bg-accent"
          style={ACCENT_GLOW}
        >
          <Ionicons name="add" size={26} color={COLORS.accentInk} />
        </PressableScale>
      }
    >
      {error && !data ? (
        <ErrorState message="No pudimos cargar tus rutinas." onRetry={() => void load()} />
      ) : null}

      {todayRoutine ? (
        <View className="mt-4 rounded-[28px] bg-surface p-5" style={ELEVATION[2]}>
          <View className="flex-row items-center gap-3">
            <View className="min-w-0 flex-1">
              <Eyebrow>Rutina de hoy</Eyebrow>
              <Title className="mt-1.5 text-[25px] leading-[29px]">{todayRoutine.name}</Title>
              <Caption className="mt-1">
                {todayRoutine.exerciseCount} ejercicios · {todayRoutine.minutes} min
              </Caption>
            </View>
            <MochiCharacter expression="excited" size={88} animated={false} shadow={false} />
          </View>
          <View className="mt-4 self-start">
            <Button
              title="Empezar"
              onPress={() => router.push(`/routine-player?routineId=${todayRoutine.id}`)}
            />
          </View>
        </View>
      ) : data ? (
        <View className="mt-2 flex-row items-end gap-2.5">
          <MochiCharacter expression="happy" size={96} interactive />
          <MochiBubble
            className="flex-1"
            tail="left"
            text={
              tip ??
              (data.routines.length > 0
                ? "Hoy no te toca rutina. Una caminata corta también suma."
                : "Arma una rutina corta y te acompaño a hacerla.")
            }
          />
        </View>
      ) : null}

      {others.length > 0 ? (
        <>
          <SectionHeader title={todayRoutine ? "Otras rutinas" : "Tus rutinas"} />
          <ListGroup>
            {others.map((r) => (
              <ListRow
                key={r.id}
                title={r.name}
                subtitle={`${daysLabel(r.days)} · ${r.minutes} min`}
                leading={<IconTile icon="barbell" tint="study" />}
                trailing={<Ionicons name="play-circle" size={28} color={COLORS.accent} />}
                onPress={() => router.push(`/routine-player?routineId=${r.id}`)}
                accessibilityLabel={`Empezar ${r.name}`}
              />
            ))}
          </ListGroup>
        </>
      ) : null}

      {data && data.exercises.length > 0 ? (
        <>
          <SectionHeader title="Ejercicios" />
          <ListGroup>
            {data.exercises.map((e) => (
              <PressableScale
                key={e.id}
                haptics={false}
                onLongPress={() => askDelete(e)}
                accessibilityLabel={`${e.name}. Mantén presionado para eliminar`}
              >
                <ListRow
                  title={e.name}
                  subtitle={`${e.sets} series · ${e.reps} repeticiones · ${e.minutes} min`}
                  leading={<IconTile icon="fitness" tint="ok" />}
                />
              </PressableScale>
            ))}
          </ListGroup>
          <Caption className="ml-1 mt-3">Mantén presionado un ejercicio para eliminarlo.</Caption>
        </>
      ) : null}

      {data && data.routines.length === 0 && data.exercises.length === 0 ? (
        <View className="mt-5">
          <Button title="Crear mi primera rutina" onPress={() => router.push("/routine-create")} />
        </View>
      ) : null}

      <Sheet visible={addOpen} onClose={() => setAddOpen(false)} title="¿Qué quieres agregar?">
        <ListGroup>
          <ListRow
            title="Rutina"
            subtitle="Varios ejercicios para ciertos días"
            leading={<IconTile icon="list" tint="study" />}
            onPress={() => {
              setAddOpen(false);
              router.push("/routine-create");
            }}
          />
          <ListRow
            title="Ejercicio"
            subtitle="Uno suelto, con series y repeticiones"
            leading={<IconTile icon="fitness" tint="ok" />}
            onPress={() => {
              setAddOpen(false);
              router.push("/exercise-create?returnTo=/exercise-list");
            }}
          />
        </ListGroup>
      </Sheet>
    </Screen>
  );
}

export default ExerciseScreen;
