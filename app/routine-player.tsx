import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  Animated as RNAnimated,
  ImageBackground,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { supabase } from "@/src/shared/lib/supabase";
import { useSession } from "@/src/core/providers/SessionContext";
import { useAchievement } from "@/src/core/providers/AchievementContext";
import { MochiCharacter } from "@/src/shared/components/MochiCharacter";
import {
  addPoints,
  checkExerciseAchievements,
  updateStreak,
  checkStreakAchievements,
} from "@/src/shared/lib/gamification";
import { searchUnsplashImage } from "@/src/shared/lib/unsplash";
import type { RoutineWithExercises } from "@/src/shared/types/database";

type Phase = "exercise" | "rest" | "complete";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function StarIcon({ delay }: { delay: number }) {
  const scale = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withSpring(1, { damping: 6, stiffness: 150 }),
    );
  }, [scale, delay]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animStyle} className="mx-2">
      <Ionicons name="star" size={36} color="#f59e0b" />
    </Animated.View>
  );
}

export function RoutinePlayerScreen() {
  const { routineId } = useLocalSearchParams<{ routineId: string }>();
  const { session } = useSession();
  const { showAchievement } = useAchievement();
  const [routine, setRoutine] = useState<RoutineWithExercises | null>(null);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("exercise");
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const imageOpacity = useRef(new RNAnimated.Value(0)).current;
  const progress = useSharedValue(0);
  const [exerciseImageUrl, setExerciseImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);

  useEffect(() => {
    async function loadRoutine() {
      if (!routineId) {
        setError("No se encontró la rutina");
        setLoading(false);
        return;
      }
      try {
        const { data, error: sbError } = await supabase
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
          .eq("id", routineId)
          .single();
        if (sbError) throw sbError;
        const sorted = {
          ...data,
          routine_exercises: [...data.routine_exercises].sort(
            (a, b) => a.order_index - b.order_index,
          ),
        };
        setRoutine(sorted);
        if (sorted.routine_exercises.length > 0) {
          const first = sorted.routine_exercises[0];
          const dur =
            first.exercise?.duration_seconds > 0
              ? first.exercise.duration_seconds
              : 60;
          setTimeLeft(dur);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error cargando rutina");
      } finally {
        setLoading(false);
      }
    }
    void loadRoutine();
  }, [routineId]);

  // Update progress bar when exercise changes
  useEffect(() => {
    if (!routine) return;
    const total = routine.routine_exercises.length;
    if (total === 0) return;
    progress.value = withTiming((currentExerciseIndex + 1) / total, {
      duration: 400,
      easing: Easing.out(Easing.cubic),
    });
  }, [currentExerciseIndex, routine, progress]);

  // Timer countdown
  useEffect(() => {
    if (phase === "complete" || !routine) return;
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [phase, currentExerciseIndex, routine]);

  // Trigger phase transition when timer hits 0
  useEffect(() => {
    if (timeLeft === 0 && !loading && routine && phase !== "complete") {
      handlePhaseEnd();
    }
  }, [timeLeft]);

  function handlePhaseEnd() {
    if (!routine) return;
    const total = routine.routine_exercises.length;

    if (phase === "exercise") {
      if (currentExerciseIndex + 1 >= total) {
        void handleComplete();
      } else {
        setPhase("rest");
        setTimeLeft(30);
      }
    } else if (phase === "rest") {
      const nextIndex = currentExerciseIndex + 1;
      if (nextIndex >= total) {
        void handleComplete();
      } else {
        setCurrentExerciseIndex(nextIndex);
        const nextExercise = routine.routine_exercises[nextIndex];
        const dur =
          nextExercise.exercise?.duration_seconds > 0
            ? nextExercise.exercise.duration_seconds
            : 60;
        setTimeLeft(dur);
        setPhase("exercise");
      }
    }
  }

  function handleSkip() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    handlePhaseEnd();
  }

  async function handleComplete() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setPhase("complete");
    if (!session?.user.id || !routine) return;
    try {
      await supabase.from("routine_logs").insert({
        user_id: session.user.id,
        routine_id: routine.id,
        completed_at: new Date().toISOString(),
      });
      await addPoints(session.user.id, 10, showAchievement);
      await updateStreak(session.user.id);
      await checkExerciseAchievements(session.user.id, showAchievement);
      await checkStreakAchievements(session.user.id, showAchievement);
    } catch (err) {
      console.error("Error completing routine:", err);
    }
  }

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%` as `${number}%`,
  }));

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-teal-50">
        <MochiCharacter mood="thinking" size={96} />
        <Text className="mt-4 text-sm font-semibold text-teal-700">
          Preparando tu rutina...
        </Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-teal-50 px-6">
        <MochiCharacter mood="sleepy" size={80} />
        <Text className="mt-4 text-center text-sm font-semibold text-red-600">
          {error}
        </Text>
        <TouchableOpacity
          className="mt-6 rounded-2xl bg-teal-500 px-6 py-3"
          onPress={() => router.back()}
        >
          <Text className="font-bold text-white">Volver</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (phase === "complete") {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-teal-50 px-6">
        <MochiCharacter mood="excited" size={120} />
        <Text className="mt-6 text-2xl font-extrabold text-teal-900">
          ¡Rutina completada!
        </Text>
        <Text className="mt-2 text-sm font-semibold text-teal-600">
          Terminaste {routine?.routine_exercises.length} ejercicios
        </Text>
        <View className="mt-4 rounded-full bg-yellow-200 px-5 py-2">
          <Text className="font-extrabold text-yellow-900">+10 puntos</Text>
        </View>
        <View className="mt-6 flex-row items-center justify-center">
          <StarIcon delay={0} />
          <StarIcon delay={150} />
          <StarIcon delay={300} />
        </View>
        <TouchableOpacity
          className="mt-8 rounded-2xl bg-teal-500 px-8 py-4"
          onPress={() => router.back()}
        >
          <Text className="font-extrabold text-white">Volver al inicio</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const currentRoutineExercise =
    routine?.routine_exercises[currentExerciseIndex];
  const currentExercise = currentRoutineExercise?.exercise;
  const totalExercises = routine?.routine_exercises.length ?? 0;

  useEffect(() => {
    async function loadExerciseImage() {
      if (!currentExercise?.name || phase !== "exercise") return;

      setImageLoading(true);
      const imageUrl = await searchUnsplashImage(
        `${currentExercise.name} fitness exercise`,
        "portrait",
      );
      setExerciseImageUrl(imageUrl);
      setImageLoading(false);

      if (imageUrl) {
        imageOpacity.setValue(0);
        RNAnimated.timing(imageOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }).start();
      }
    }

    void loadExerciseImage();
  }, [currentExercise?.name, currentExerciseIndex, imageOpacity, phase]);

  return (
    <View className="flex-1 bg-teal-50">
      {phase === "exercise" && exerciseImageUrl ? (
        <RNAnimated.View
          style={{ opacity: imageOpacity }}
          className="absolute inset-0"
        >
          <ImageBackground
            source={{ uri: exerciseImageUrl }}
            className="h-full w-full"
            resizeMode="cover"
          >
            <LinearGradient
              colors={["rgba(0,0,0,0.05)", "rgba(0,0,0,0.7)"]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              className="h-full w-full"
            />
          </ImageBackground>
        </RNAnimated.View>
      ) : null}

      <SafeAreaView className="flex-1 px-6">
        <TouchableOpacity
          className="mt-2 flex-row items-center"
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={22} color="#0d9488" />
          <Text className="ml-1 font-bold text-teal-700">Volver</Text>
        </TouchableOpacity>

        <View className="mt-4">
          <Text className="text-xl font-extrabold text-teal-900">
            {routine?.name}
          </Text>
          <Text className="mt-1 text-sm font-semibold text-teal-500">
            Ejercicio {currentExerciseIndex + 1} de {totalExercises}
          </Text>
        </View>

        <View className="mt-4">
          <View className="h-3 w-full overflow-hidden rounded-full bg-teal-100">
            <Animated.View
              style={progressStyle}
              className="h-3 rounded-full bg-teal-500"
            />
          </View>
        </View>

        {phase === "exercise" ? (
          <View className="mt-8 flex-1 items-center">
            <View className="h-52 w-52 items-center justify-center rounded-full border-8 border-teal-200 bg-teal-100">
              <Text className="text-5xl font-extrabold text-teal-900">
                {formatTime(timeLeft)}
              </Text>
              <Text className="mt-1 text-sm font-semibold text-teal-500">
                restante
              </Text>
            </View>
            <Text className="mt-6 text-xl font-extrabold text-teal-900">
              {currentExercise?.name}
            </Text>
            {currentExercise &&
              (currentExercise.sets > 0 || currentExercise.reps > 0) && (
                <Text className="mt-2 text-sm font-semibold text-teal-600">
                  {currentExercise.sets > 0
                    ? `${currentExercise.sets} series`
                    : ""}
                  {currentExercise.sets > 0 && currentExercise.reps > 0
                    ? " × "
                    : ""}
                  {currentExercise.reps > 0
                    ? `${currentExercise.reps} reps`
                    : ""}
                </Text>
              )}
            {currentExercise?.notes ? (
              <Text className="mt-2 px-4 text-center text-xs font-semibold text-teal-100">
                {currentExercise.notes}
              </Text>
            ) : null}
            {imageLoading ? (
              <Text className="mt-2 text-xs font-semibold text-teal-100">
                Cargando imagen del ejercicio...
              </Text>
            ) : null}
            <TouchableOpacity
              className="mt-8 rounded-2xl bg-teal-500 px-8 py-4"
              onPress={handleSkip}
            >
              <Text className="font-extrabold text-white">Siguiente</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="mt-8 flex-1 items-center">
            <MochiCharacter mood="happy" size={80} />
            <Text className="mt-4 text-xl font-extrabold text-teal-900">
              Descansa
            </Text>
            <Text className="mt-2 text-4xl font-extrabold text-teal-700">
              {timeLeft}s
            </Text>
            <Text className="mt-2 text-sm font-semibold text-teal-500">
              Siguiente:{" "}
              {routine?.routine_exercises[currentExerciseIndex + 1]?.exercise
                ?.name ?? "Último ejercicio"}
            </Text>
            <TouchableOpacity
              className="mt-8 rounded-2xl border-2 border-teal-300 bg-white px-8 py-4"
              onPress={handleSkip}
            >
              <Text className="font-bold text-teal-700">Saltar descanso</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

export default RoutinePlayerScreen;
