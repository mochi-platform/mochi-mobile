import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCycle } from "@/src/core/providers/CycleContext";
import { energyTip, suggestForToday, type ExerciseItem } from "@/src/features/exercise/suggestions";
import { energyProfileFromPhase } from "@/src/shared/lib/ai";
import { reportError } from "@/src/shared/lib/observability/reportError";
import { supabase } from "@/src/shared/lib/supabase";
import { Button, Card, EmptyState, ErrorState, Skeleton } from "@/src/shared/ui";

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
        <Text className="ml-1 text-xl font-extrabold text-ink">Mis ejercicios</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {loading ? (
          <View className="gap-3">
            <Skeleton height={72} />
            <Skeleton height={72} />
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
            <Card className="mb-4 bg-accent-soft">
              <Text className="text-sm font-extrabold text-ink">Para hoy</Text>
              <Text className="mb-2 mt-1 text-xs font-semibold text-ink-muted">
                {energyTip(energy)}
              </Text>
              {suggested.map((s) => (
                <Text key={s.id} className="text-sm font-bold text-ink">
                  • {s.name}
                </Text>
              ))}
            </Card>

            {items.map((item) => (
              <Card key={item.id} className="mb-3 flex-row items-center">
                <View className="flex-1 pr-2">
                  <Text className="text-base font-extrabold text-ink">{item.name}</Text>
                  <Text className="text-xs font-semibold text-ink-muted">
                    {[
                      item.sets ? `${item.sets} series` : null,
                      item.reps ? `${item.reps} repeticiones` : null,
                      item.duration_seconds ? `${item.duration_seconds} s` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </Text>
                </View>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={`Borrar ${item.name}`}
                  className="h-11 w-11 items-center justify-center"
                  onPress={() => void remove(item.id)}
                >
                  <Ionicons name="trash-outline" size={20} color="#dc4660" />
                </TouchableOpacity>
              </Card>
            ))}

            <View className="mt-2">
              <Button
                title="Crear ejercicio"
                variant="soft"
                onPress={() => router.push("/exercise-create")}
              />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

export default ExerciseListScreen;
