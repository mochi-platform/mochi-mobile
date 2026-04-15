import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { supabase } from "@/src/shared/lib/supabase";
import { useSession } from "@/src/core/providers/SessionContext";
import { useCustomAlert } from "@/src/shared/components/CustomAlert";
import type { Exercise } from "@/src/shared/types/database";

export function ExerciseListScreen() {
  const { session } = useSession();
  const { showAlert, AlertComponent } = useCustomAlert();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadExercises = useCallback(async () => {
    if (!session?.user.id) {
      setExercises([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: supabaseError } = await supabase
        .from("exercises")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (supabaseError) throw supabaseError;

      setExercises(data ?? []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudieron cargar los ejercicios",
      );
      setExercises([]);
    } finally {
      setLoading(false);
    }
  }, [session?.user.id]);

  useFocusEffect(
    useCallback(() => {
      void loadExercises();
    }, [loadExercises]),
  );

  async function handleDeleteExercise(exerciseId: string) {
    const userId = session?.user.id;
    if (!userId) return;

    try {
      const { error: deleteError } = await supabase
        .from("exercises")
        .delete()
        .eq("id", exerciseId)
        .eq("user_id", userId);

      if (deleteError) throw deleteError;
      await loadExercises();
    } catch (err) {
      console.error(
        "[ExerciseList] error eliminando ejercicio:",
        err instanceof Error ? err.message : String(err),
      );
      setError(
        err instanceof Error ? err.message : "No se pudo eliminar el ejercicio",
      );
    }
  }

  return (
    <>
      <ScrollView className="flex-1 bg-teal-100">
        <View className="px-5 py-6">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-3xl font-extrabold text-teal-900">
                Mis ejercicios
              </Text>
              <Text className="mt-1 text-sm font-semibold text-teal-600">
                Gestiona tu banco personal de ejercicios
              </Text>
            </View>

            <TouchableOpacity
              className="rounded-2xl bg-teal-500 px-4 py-3"
              onPress={() =>
                router.push("/exercise-create?returnTo=/exercise-list")
              }
            >
              <Text className="text-sm font-bold text-white">Nuevo</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View className="items-center py-12">
              <ActivityIndicator size="large" color="#14b8a6" />
              <Text className="mt-3 text-sm font-semibold text-teal-700">
                Cargando ejercicios...
              </Text>
            </View>
          ) : error ? (
            <View className="mt-6 rounded-3xl border border-red-200 bg-red-50 p-4">
              <Text className="text-sm font-semibold text-red-700">
                {error}
              </Text>
            </View>
          ) : exercises.length === 0 ? (
            <View className="mt-6 rounded-3xl border-2 border-teal-200 bg-white p-5">
              <View className="items-center">
                <Ionicons name="barbell" size={40} color="#5eead4" />
                <Text className="mt-3 text-center text-sm font-semibold text-teal-700">
                  Aún no tienes ejercicios. Crea uno para empezar tu rutina.
                </Text>
              </View>
              <TouchableOpacity
                className="mt-4 rounded-2xl bg-teal-500 py-3"
                onPress={() =>
                  router.push("/exercise-create?returnTo=/exercise-list")
                }
              >
                <Text className="text-center text-sm font-bold text-white">
                  Crear ejercicio
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="mt-6">
              {exercises.map((exercise) => (
                <TouchableOpacity
                  key={exercise.id}
                  activeOpacity={0.9}
                  onLongPress={() => {
                    showAlert({
                      title: "Eliminar ejercicio",
                      message:
                        "¿Quieres eliminar este ejercicio? Se eliminará de todas las rutinas que lo usen.",
                      buttons: [
                        { text: "Cancelar", style: "cancel" },
                        {
                          text: "Eliminar",
                          style: "destructive",
                          onPress: () => {
                            void handleDeleteExercise(exercise.id);
                          },
                        },
                      ],
                    });
                  }}
                >
                  <View className="mb-3 rounded-3xl border border-teal-200 bg-white p-4">
                    <Text className="text-base font-extrabold text-slate-800">
                      {exercise.name}
                    </Text>
                    <Text className="mt-1 text-xs font-semibold text-slate-600">
                      {exercise.sets} series • {exercise.reps} repeticiones •{" "}
                      {Math.ceil(exercise.duration_seconds / 60)} min
                    </Text>
                    {exercise.notes ? (
                      <Text className="mt-2 text-xs font-semibold text-teal-700">
                        {exercise.notes}
                      </Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
      {AlertComponent}
    </>
  );
}

export default ExerciseListScreen;
