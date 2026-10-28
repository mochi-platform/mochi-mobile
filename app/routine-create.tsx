import { COLORS } from "@/src/shared/theme/tokens";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "@/src/shared/lib/supabase";
import { useSession } from "@/src/core/providers/SessionContext";
import type { Exercise } from "@/src/shared/types/database";
import { useCustomAlert } from "@/src/shared/components/CustomAlert";

const days = [
  { id: 1, short: "L", label: "Lunes" },
  { id: 2, short: "M", label: "Martes" },
  { id: 3, short: "X", label: "Miércoles" },
  { id: 4, short: "J", label: "Jueves" },
  { id: 5, short: "V", label: "Viernes" },
  { id: 6, short: "S", label: "Sábado" },
  { id: 0, short: "D", label: "Domingo" },
];

export function RoutineCreateScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useSession();
  const { showAlert, AlertComponent } = useCustomAlert();
  const [routineName, setRoutineName] = useState("");
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<string[]>([]);
  const [loadingExercises, setLoadingExercises] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadExercises = useCallback(async () => {
    if (!session?.user.id) {
      setExercises([]);
      setLoadingExercises(false);
      return;
    }

    try {
      setLoadingExercises(true);
      setError(null);

      const { data, error: supabaseError } = await supabase
        .from("exercises")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (supabaseError) throw supabaseError;

      setExercises(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar los ejercicios");
      setExercises([]);
    } finally {
      setLoadingExercises(false);
    }
  }, [session?.user.id]);

  useFocusEffect(
    useCallback(() => {
      void loadExercises();
    }, [loadExercises]),
  );

  const toggleDay = (dayId: number) => {
    setSelectedDays((prev) =>
      prev.includes(dayId) ? prev.filter((current) => current !== dayId) : [...prev, dayId],
    );
  };

  const toggleExercise = (exerciseId: string) => {
    setSelectedExerciseIds((prev) =>
      prev.includes(exerciseId)
        ? prev.filter((currentId) => currentId !== exerciseId)
        : [...prev, exerciseId],
    );
  };

  const handleCreateRoutine = async () => {
    if (!session?.user.id) {
      showAlert({
        title: "Error",
        message: "Sesión no encontrada",
        buttons: [{ text: "Aceptar", style: "cancel" }],
      });
      return;
    }

    if (!routineName.trim()) {
      showAlert({
        title: "Falta información",
        message: "Escribe un nombre para la rutina",
        buttons: [{ text: "Entendido", style: "cancel" }],
      });
      return;
    }

    if (selectedDays.length === 0) {
      showAlert({
        title: "Falta información",
        message: "Selecciona al menos un día",
        buttons: [{ text: "Entendido", style: "cancel" }],
      });
      return;
    }

    if (selectedExerciseIds.length === 0) {
      showAlert({
        title: "Falta información",
        message: "Selecciona al menos un ejercicio",
        buttons: [{ text: "Entendido", style: "cancel" }],
      });
      return;
    }

    try {
      setSaving(true);

      const orderedDays = [...selectedDays].sort((a, b) => a - b);

      const { data: routineData, error: routineError } = await supabase
        .from("routines")
        .insert({
          user_id: session.user.id,
          name: routineName.trim(),
          days: orderedDays,
        })
        .select("id")
        .single();

      if (routineError) throw routineError;

      const routineExercisesPayload = selectedExerciseIds.map((exerciseId, index) => ({
        routine_id: routineData.id,
        exercise_id: exerciseId,
        order_index: index,
      }));

      const { error: routineExercisesError } = await supabase
        .from("routine_exercises")
        .insert(routineExercisesPayload);

      if (routineExercisesError) throw routineExercisesError;

      showAlert({
        title: "Rutina creada",
        message: "Tu rutina se guardó correctamente",
        buttons: [
          {
            text: "Continuar",
            onPress: () => router.back(),
          },
        ],
      });
    } catch (err) {
      showAlert({
        title: "Error",
        message: err instanceof Error ? err.message : "No se pudo crear la rutina",
        buttons: [{ text: "Entendido", style: "destructive" }],
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-tint-ok">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          className="flex-1 bg-tint-ok"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        >
          <View className="px-5 py-6">
            <TouchableOpacity onPress={() => router.back()} className="mb-4 flex-row items-center">
              <Ionicons name="chevron-back" size={24} color={COLORS.positive} />
              <Text className="ml-2 text-lg font-bold text-positive">Volver</Text>
            </TouchableOpacity>

            <Text className="text-3xl font-extrabold text-positive">Nueva rutina</Text>
            <Text className="mt-1 text-sm font-semibold text-positive">
              Crea una rutina con tus ejercicios guardados
            </Text>

            <View className="mt-6 rounded-3xl bg-surface p-4">
              <Text className="text-sm font-bold text-positive">Nombre de la rutina</Text>
              <TextInput
                className="mt-2 rounded-2xl bg-surface-muted px-4 py-3 text-base text-positive"
                placeholder="Ejemplo: Fuerza de tren inferior"
                value={routineName}
                onChangeText={setRoutineName}
                editable={!saving}
              />
            </View>

            <View className="mt-4 rounded-3xl bg-surface p-4">
              <Text className="text-sm font-bold text-positive">Días de entrenamiento</Text>
              <View className="mt-3 flex-row flex-wrap">
                {days.map((day) => {
                  const active = selectedDays.includes(day.id);

                  return (
                    <TouchableOpacity
                      key={day.id}
                      className={`mb-2 mr-2 rounded-2xl border px-4 py-3 ${active ? "bg-positive" : "bg-surface-muted"}`}
                      onPress={() => toggleDay(day.id)}
                      disabled={saving}
                    >
                      <Text
                        className={`text-sm font-extrabold ${active ? "text-white" : "text-positive"}`}
                      >
                        {day.short}
                      </Text>
                      <Text
                        className={`text-xs font-semibold ${active ? "text-accent-ink" : "text-positive"}`}
                      >
                        {day.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View className="mt-4 rounded-3xl bg-surface p-4">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-bold text-positive">Ejercicios para la rutina</Text>
                <TouchableOpacity
                  className="rounded-xl bg-surface-muted px-3 py-2"
                  onPress={() => router.push("/exercise-create?returnTo=/routine-create")}
                  disabled={saving}
                >
                  <Text className="text-xs font-bold text-positive">Añadir ejercicio nuevo</Text>
                </TouchableOpacity>
              </View>

              {loadingExercises ? (
                <View className="items-center py-8">
                  <ActivityIndicator size="small" color={COLORS.positive} />
                  <Text className="mt-3 text-sm font-semibold text-positive">
                    Cargando ejercicios...
                  </Text>
                </View>
              ) : error ? (
                <View className="mt-4 rounded-2xl bg-surface-muted p-3">
                  <Text className="text-sm font-semibold text-danger">{error}</Text>
                </View>
              ) : exercises.length === 0 ? (
                <View className="mt-4 rounded-2xl bg-surface-muted p-4">
                  <Text className="text-sm font-semibold text-positive">
                    Aún no tienes ejercicios guardados. Crea el primero para armar tu rutina.
                  </Text>
                </View>
              ) : (
                <View className="mt-4">
                  {exercises.map((exercise) => {
                    const isSelected = selectedExerciseIds.includes(exercise.id);

                    return (
                      <TouchableOpacity
                        key={exercise.id}
                        className="mb-3 flex-row items-center rounded-2xl bg-surface-muted p-3"
                        onPress={() => toggleExercise(exercise.id)}
                        disabled={saving}
                      >
                        <Ionicons
                          name={isSelected ? "checkbox" : "square"}
                          size={22}
                          color={isSelected ? COLORS.positive : COLORS.inkMuted}
                        />
                        <View className="ml-3 flex-1">
                          <Text className="text-sm font-bold text-ink">{exercise.name}</Text>
                          <Text className="text-xs font-semibold text-ink">
                            {exercise.sets} series • {exercise.reps} repeticiones •{" "}
                            {Math.ceil(exercise.duration_seconds / 60)} min
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>

            <TouchableOpacity
              className="mb-10 mt-8 rounded-2xl bg-positive py-4 disabled:opacity-60"
              onPress={handleCreateRoutine}
              disabled={saving || loadingExercises}
            >
              {saving ? (
                <ActivityIndicator size="large" color="white" />
              ) : (
                <Text className="text-center text-lg font-extrabold text-white">
                  Guardar rutina
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      {AlertComponent}
    </SafeAreaView>
  );
}

export default RoutineCreateScreen;
