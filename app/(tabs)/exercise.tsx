import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { supabase } from "@/src/shared/lib/supabase";
import { useSession } from "@/src/core/providers/SessionContext";
import { useCustomAlert } from "@/src/shared/components/CustomAlert";
import { FloatingActionButton } from "@/src/shared/components/FloatingActionButton";
import { MochiCharacter } from "@/src/shared/components/MochiCharacter";
import { useCycleRecommendation } from "@/src/shared/hooks/useCycleRecommendation";
import { TabHeader } from "@/src/shared/components/TabHeader";
import type {
  Exercise,
  RoutineWithExercises,
} from "@/src/shared/types/database";

type ExerciseCardProps = {
  exercise: Exercise;
  onDelete: (exerciseId: string) => void;
};

type RoutineCardProps = {
  routine: RoutineWithExercises;
  index: number;
  animationSeed: number;
};

const dayMap = ["D", "L", "M", "X", "J", "V", "S"];

const exerciseAccentMap: Record<string, string> = {
  pink: "bg-pink-100",
  blue: "bg-blue-100",
  yellow: "bg-yellow-100",
  teal: "bg-teal-100",
  purple: "bg-purple-100",
  green: "bg-green-100",
};

function formatRoutineTime(routine: RoutineWithExercises): string {
  const totalSeconds = routine.routine_exercises.reduce((sum, item) => {
    return sum + (item.exercise?.duration_seconds ?? 0);
  }, 0);
  const minutes = Math.max(1, Math.ceil(totalSeconds / 60));
  return `${minutes} min`;
}

function RoutineCard({ routine, index, animationSeed }: RoutineCardProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(16);

  useEffect(() => {
    opacity.value = 0;
    translateY.value = 16;

    opacity.value = withRepeat(
      withSequence(
        withTiming(1, {
          duration: 320,
          easing: Easing.out(Easing.cubic),
        }),
        withTiming(1, { duration: 0 }),
      ),
      1,
      false,
    );
    translateY.value = withTiming(0, {
      duration: 360,
      easing: Easing.out(Easing.cubic),
    });
  }, [animationSeed, index, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={animatedStyle}
      className="mb-3 rounded-3xl border-2 border-teal-200 bg-white p-4"
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-lg font-extrabold text-slate-800">
            {routine.name}
          </Text>
          <View className="mt-2 flex-row flex-wrap gap-2">
            {routine.days.map((dayNum) => (
              <View
                key={`${routine.id}-${dayNum}`}
                className="rounded-full bg-teal-100 px-2.5 py-1"
              >
                <Text className="text-xs font-bold text-teal-800">
                  {dayMap[dayNum] ?? "?"}
                </Text>
              </View>
            ))}
          </View>
          <Text className="mt-2 text-sm font-semibold text-slate-600">
            {routine.routine_exercises.length} ejercicios • {formatRoutineTime(routine)}
          </Text>
        </View>

        <TouchableOpacity
          className="h-11 w-11 items-center justify-center rounded-2xl bg-teal-200"
          onPress={() => router.push(`/routine-player?routineId=${routine.id}`)}
          accessibilityRole="button"
          accessibilityLabel={`Iniciar rutina ${routine.name}`}
        >
          <Ionicons name="play" size={18} color="#0d9488" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

function ExerciseCard({ exercise, onDelete }: ExerciseCardProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onLongPress={() => onDelete(exercise.id)}
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
  );
}

export function ExerciseScreen() {
  const { session } = useSession();
  const { tip, personality } = useCycleRecommendation("exercise");
  const { showAlert, AlertComponent } = useCustomAlert();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [routines, setRoutines] = useState<RoutineWithExercises[]>([]);
  const [loading, setLoading] = useState(true);
  const [exerciseError, setExerciseError] = useState<string | null>(null);
  const [routineError, setRoutineError] = useState<string | null>(null);
  const [animationSeed, setAnimationSeed] = useState(0);

  const loadingScale = useSharedValue(1);

  const loadingAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: loadingScale.value }],
  }));

  const loadData = useCallback(async () => {
    const userId = session?.user.id;
    if (!userId) {
      setExercises([]);
      setRoutines([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setExerciseError(null);
      setRoutineError(null);

      loadingScale.value = withRepeat(
        withSequence(
          withTiming(1.06, {
            duration: 650,
            easing: Easing.inOut(Easing.quad),
          }),
          withTiming(1, { duration: 650, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      );

      const [exercisesRes, routinesRes] = await Promise.all([
        supabase
          .from("exercises")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
        supabase
          .from("routines")
          .select(
            `*,
           routine_exercises (
             id,
             routine_id,
             exercise_id,
             order_index,
             exercise:exercises (id, name, sets, reps, duration_seconds, notes)
           )`,
          )
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
      ]);

      if (exercisesRes.error) {
        setExerciseError(
          exercisesRes.error.message ?? "No se pudieron cargar los ejercicios",
        );
        setExercises([]);
      } else {
        setExercises((exercisesRes.data ?? []) as Exercise[]);
      }

      if (routinesRes.error) {
        setRoutineError(
          routinesRes.error.message ?? "No se pudieron cargar las rutinas",
        );
        setRoutines([]);
      } else {
        setRoutines((routinesRes.data ?? []) as RoutineWithExercises[]);
      }

      setAnimationSeed((prev) => prev + 1);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudo cargar el módulo";
      setExerciseError((prev) => prev ?? message);
      setRoutineError((prev) => prev ?? message);
    } finally {
      loadingScale.value = withTiming(1, { duration: 180 });
      setLoading(false);
    }
  }, [loadingScale, session?.user.id]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  const totalExercises = exercises.length;
  const totalRoutines = routines.length;
  const totalRoutineExercises = routines.reduce(
    (sum, routine) => sum + routine.routine_exercises.length,
    0,
  );
  const hasContent = totalExercises > 0 || totalRoutines > 0;

  const handleDeleteExercise = async (exerciseId: string) => {
    const userId = session?.user.id;
    if (!userId) return;

    try {
      const { error: deleteError } = await supabase
        .from("exercises")
        .delete()
        .eq("id", exerciseId)
        .eq("user_id", userId);

      if (deleteError) throw deleteError;
      await loadData();
    } catch (err) {
      console.error(
        "[ExerciseList] error eliminando ejercicio:",
        err instanceof Error ? err.message : String(err),
      );
      setExerciseError(
        err instanceof Error ? err.message : "No se pudo eliminar el ejercicio",
      );
    }
  };

  const handleCreateExercise = () => {
    router.push("/exercise-create?returnTo=/exercise-list");
  };

  return (
    <>
      <View className="flex-1 bg-teal-50">
        <ScrollView
          className="flex-1 px-5 pt-12"
          showsVerticalScrollIndicator={false}
        >
          <View className="mb-5 flex-row items-center">
            <Ionicons name="barbell" size={20} color="#0f766e" />
            <View className="ml-2 flex-1">
              <Text className="text-2xl font-extrabold text-teal-900">
                Ejercicio
              </Text>
              <Text className="text-sm font-semibold text-teal-600">
                Ejercicios guardados y rutinas listas para iniciar
              </Text>
            </View>
          </View>

          {tip && (
            <View
              className={`mb-4 rounded-2xl border p-3 ${personality?.phaseBadgeClass ?? "border-teal-200 bg-white"}`}
            >
              <Text className="text-xs font-extrabold text-slate-800">
                Consejo para hoy
              </Text>
              <Text className="mt-1 text-xs font-semibold text-slate-700">
                {tip}
              </Text>
            </View>
          )}

          {!loading && hasContent && (
            <View className="mb-4 flex-row gap-3">
              <View className="flex-1 rounded-2xl border border-teal-200 bg-white p-4">
                <Text className="text-3xl font-extrabold text-teal-900">
                  {totalExercises}
                </Text>
                <Text className="mt-1 text-xs font-bold text-teal-600">
                  {totalExercises === 1 ? "ejercicio" : "ejercicios"}
                </Text>
              </View>
              <View className="flex-1 rounded-2xl border border-violet-200 bg-violet-50 p-4">
                <Text className="text-3xl font-extrabold text-violet-900">
                  {totalRoutines}
                </Text>
                <Text className="mt-1 text-xs font-bold text-violet-600">
                  {totalRoutines === 1 ? "rutina" : "rutinas"}
                </Text>
              </View>
              <View className="flex-1 rounded-2xl border border-rose-200 bg-rose-50 p-4">
                <Text className="text-3xl font-extrabold text-rose-900">
                  {totalRoutineExercises}
                </Text>
                <Text className="mt-1 text-xs font-bold text-rose-600">
                  ejercicios en rutinas
                </Text>
              </View>
            </View>
          )}

          <View className="mb-5 rounded-3xl border-2 border-teal-200 bg-white p-4">
            <View className="mb-3 flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Ionicons name="repeat-outline" size={18} color="#0f766e" />
                <Text className="ml-2 text-base font-extrabold text-teal-900">
                  Rutinas
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => router.push("/routine-create")}
                className="rounded-full bg-teal-50 px-3 py-2"
              >
                <Text className="text-xs font-extrabold text-teal-700">
                  Nueva rutina
                </Text>
              </TouchableOpacity>
            </View>

            {routineError ? (
              <View className="rounded-2xl border border-red-200 bg-red-50 p-3">
                <Text className="text-sm font-semibold text-red-700">
                  {routineError}
                </Text>
              </View>
            ) : routines.length === 0 ? (
              <View className="rounded-2xl border border-teal-100 bg-teal-50 p-4">
                <Text className="text-sm font-semibold text-teal-700">
                  Aún no tienes rutinas. Crea una usando tus ejercicios
                  guardados.
                </Text>
              </View>
            ) : (
              routines.map((routine, index) => (
                <RoutineCard
                  key={routine.id}
                  routine={routine}
                  index={index}
                  animationSeed={animationSeed}
                />
              ))
            )}
          </View>

          <View className="mb-5 rounded-3xl border-2 border-teal-200 bg-white p-4">
            <View className="mb-3 flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Ionicons name="barbell-outline" size={18} color="#0f766e" />
                <Text className="ml-2 text-base font-extrabold text-teal-900">
                  Ejercicios
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleCreateExercise}
                className="rounded-full bg-teal-50 px-3 py-2"
              >
                <Text className="text-xs font-extrabold text-teal-700">
                  Nuevo ejercicio
                </Text>
              </TouchableOpacity>
            </View>

            {exerciseError ? (
              <View className="rounded-2xl border border-red-200 bg-red-50 p-3">
                <Text className="text-sm font-semibold text-red-700">
                  {exerciseError}
                </Text>
              </View>
            ) : exercises.length === 0 ? (
              <View className="rounded-2xl border border-teal-100 bg-teal-50 p-4">
                <Text className="text-sm font-semibold text-teal-700">
                  Aún no tienes ejercicios. Crea uno para usarlo en tus rutinas.
                </Text>
              </View>
            ) : (
              <View>
                {exercises.map((exercise) => (
                  <ExerciseCard
                    key={exercise.id}
                    exercise={exercise}
                    onDelete={(exerciseId) => {
                      showAlert({
                        title: "Eliminar ejercicio",
                        message:
                          "¿Quieres eliminar este ejercicio? Se quitará de todas las rutinas que lo usen.",
                        buttons: [
                          { text: "Cancelar", style: "cancel" },
                          {
                            text: "Eliminar",
                            style: "destructive",
                            onPress: () => {
                              void handleDeleteExercise(exerciseId);
                            },
                          },
                        ],
                      });
                    }}
                  />
                ))}
              </View>
            )}
          </View>

          <View className="h-20" />
        </ScrollView>
        {loading && (
          <View className="absolute inset-x-0 top-0 h-full items-center justify-center bg-teal-50/30">
            <Animated.View style={loadingAnimatedStyle}>
              <MochiCharacter mood="thinking" size={90} />
            </Animated.View>
            <Text className="mt-4 text-sm font-semibold text-teal-700">
              Cargando ejercicios y rutinas...
            </Text>
          </View>
        )}
      </View>
      <FloatingActionButton
        onPress={() => router.push("/routine-create")}
        containerClassName="bg-violet-500"
        borderClassName="border-purple-300"
        iconName="repeat-outline"
        accessibilityLabel="Crear rutina"
        bottomOffset={72}
      />
      <FloatingActionButton
        onPress={handleCreateExercise}
        containerClassName="bg-teal-500"
        borderClassName="border-teal-300"
        iconName="barbell-outline"
        accessibilityLabel="Crear ejercicio"
      />
      {AlertComponent}
    </>
  );
}

export default ExerciseScreen;
