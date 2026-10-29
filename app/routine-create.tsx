import { COLORS } from "@/src/shared/theme/tokens";
import { useCallback, useState } from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { supabase } from "@/src/shared/lib/supabase";
import { useSession } from "@/src/core/providers/SessionContext";
import type { Exercise } from "@/src/shared/types/database";
import { useCustomAlert } from "@/src/shared/components/CustomAlert";
import {
  Button,
  Caption,
  Chip,
  Input,
  ListGroup,
  ListRow,
  Screen,
  SectionHeader,
  Skeleton,
  Surface,
} from "@/src/shared/ui";

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
    <>
      <Screen
        title="Nueva rutina"
        subtitle="Arma una rutina con tus ejercicios guardados."
        withTabBar={false}
        closable
        keyboard
      >
        <Input
          label="Nombre"
          placeholder="Ejemplo: Fuerza de tren inferior"
          value={routineName}
          onChangeText={setRoutineName}
          editable={!saving}
        />

        <SectionHeader title="Días" />
        <View className="flex-row flex-wrap gap-2">
          {days.map((day) => (
            <Chip
              key={day.id}
              label={day.label}
              selected={selectedDays.includes(day.id)}
              onPress={saving ? undefined : () => toggleDay(day.id)}
            />
          ))}
        </View>

        <SectionHeader
          title="Ejercicios"
          actionLabel="Crear nuevo"
          onAction={
            saving ? undefined : () => router.push("/exercise-create?returnTo=/routine-create")
          }
        />
        {loadingExercises ? (
          <Skeleton height={140} className="rounded-card" />
        ) : error ? (
          <Surface tone="sunken" className="p-4">
            <Caption className="text-danger">{error}</Caption>
          </Surface>
        ) : exercises.length === 0 ? (
          <Surface tone="sunken" className="p-4">
            <Caption>
              Aún no tienes ejercicios guardados. Crea el primero para armar tu rutina.
            </Caption>
          </Surface>
        ) : (
          <ListGroup>
            {exercises.map((exercise) => {
              const isSelected = selectedExerciseIds.includes(exercise.id);
              return (
                <ListRow
                  key={exercise.id}
                  title={exercise.name}
                  subtitle={`${exercise.sets} series · ${exercise.reps} repeticiones · ${Math.ceil(exercise.duration_seconds / 60)} min`}
                  leading={
                    <Ionicons
                      name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                      size={26}
                      color={isSelected ? COLORS.accent : COLORS.inkFaint}
                    />
                  }
                  trailing={<View />}
                  onPress={saving ? undefined : () => toggleExercise(exercise.id)}
                />
              );
            })}
          </ListGroup>
        )}

        <View className="mt-8">
          <Button
            title="Guardar rutina"
            loading={saving}
            disabled={loadingExercises}
            onPress={() => void handleCreateRoutine()}
          />
        </View>
      </Screen>
      {AlertComponent}
    </>
  );
}

export default RoutineCreateScreen;
