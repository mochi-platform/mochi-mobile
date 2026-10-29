import { COLORS } from "@/src/shared/theme/tokens";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { View } from "react-native";
import { useCycle } from "@/src/core/providers/CycleContext";
import { energyTip, suggestForToday, type ExerciseItem } from "@/src/features/exercise/suggestions";
import { energyProfileFromPhase } from "@/src/shared/lib/ai";
import { reportError } from "@/src/shared/lib/observability/reportError";
import { supabase } from "@/src/shared/lib/supabase";
import {
  ACCENT_GLOW,
  Caption,
  EmptyState,
  ErrorState,
  IconTile,
  ListGroup,
  ListRow,
  MochiBubble,
  PressableScale,
  Screen,
  SectionHeader,
  Skeleton,
} from "@/src/shared/ui";

/** Lista real de ejercicios, con sugerencias según tu energía de hoy. */
export function ExerciseListScreen() {
  const { cycleData } = useCycle();
  const [items, setItems] = useState<ExerciseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const { data, error } = await supabase
        .from("exercises")
        .select("id, name, sets, reps, duration_seconds, notes")
        .order("created_at", { ascending: false })
        .returns<ExerciseItem[]>();
      if (error) throw error;
      setItems(data ?? []);
    } catch (error) {
      reportError(error, { scope: "exercise-list/load" });
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

  const energy = energyProfileFromPhase(cycleData?.phase);
  const suggested = useMemo(() => suggestForToday(items, energy), [items, energy]);

  const remove = async (id: string) => {
    const { error } = await supabase.from("exercises").delete().eq("id", id);
    if (error) {
      reportError(error, { scope: "exercise-list/delete" });
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  return (
    <Screen
      title="Mis ejercicios"
      withTabBar={false}
      closable
      headerRight={
        <PressableScale
          onPress={() => router.push("/exercise-create")}
          accessibilityLabel="Crear ejercicio"
          className="h-10 w-10 items-center justify-center rounded-full bg-accent"
          style={ACCENT_GLOW}
        >
          <Ionicons name="add" size={24} color={COLORS.accentInk} />
        </PressableScale>
      }
    >
      {loading ? (
        <View className="mt-4 gap-3">
          <Skeleton height={72} className="rounded-card" />
          <Skeleton height={140} className="rounded-card" />
        </View>
      ) : failed ? (
        <ErrorState onRetry={() => void load()} />
      ) : items.length === 0 ? (
        <EmptyState
          title="Aún no tienes ejercicios"
          message="Crea tu primer ejercicio y úsalo en tus rutinas."
          actionLabel="Crear ejercicio"
          onAction={() => router.push("/exercise-create")}
        />
      ) : (
        <>
          <MochiBubble className="mt-4" text={energyTip(energy)}>
            {suggested.length > 0 ? (
              <Caption className="mt-2">
                Para hoy: {suggested.map((s) => s.name).join(", ")}
              </Caption>
            ) : null}
          </MochiBubble>

          <SectionHeader title="Tus ejercicios" />
          <ListGroup>
            {items.map((item) => (
              <ListRow
                key={item.id}
                title={item.name}
                subtitle={
                  [
                    item.sets ? `${item.sets} series` : null,
                    item.reps ? `${item.reps} repeticiones` : null,
                    item.duration_seconds ? `${item.duration_seconds} s` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || undefined
                }
                leading={<IconTile icon="barbell" tint="study" />}
                trailing={
                  <PressableScale
                    haptics="warning"
                    accessibilityLabel={`Borrar ${item.name}`}
                    onPress={() => void remove(item.id)}
                    className="h-10 w-10 items-center justify-center rounded-full bg-surface-muted"
                  >
                    <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                  </PressableScale>
                }
              />
            ))}
          </ListGroup>
        </>
      )}
    </Screen>
  );
}

export default ExerciseListScreen;
