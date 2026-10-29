import { reportError } from "@/src/shared/lib/observability/reportError";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { Animated as RNAnimated, ImageBackground, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
import { useAccent } from "@/src/core/providers/ThemeContext";
import { COLORS } from "@/src/shared/theme/tokens";
import {
  Button,
  Caption,
  Display,
  ErrorState,
  Eyebrow,
  PressableScale,
  ProgressRing,
  Title,
} from "@/src/shared/ui";
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
    scale.value = withDelay(delay, withSpring(1, { damping: 6, stiffness: 150 }));
  }, [scale, delay]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animStyle} className="mx-2">
      <Ionicons name="star" size={36} color={COLORS.warning} />
    </Animated.View>
  );
}

export function RoutinePlayerScreen() {
  const { routineId } = useLocalSearchParams<{ routineId: string }>();
  const { session } = useSession();
  const { showAchievement } = useAchievement();
  const insets = useSafeAreaInsets();
  const accent = useAccent();
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
          const dur = first.exercise?.duration_seconds > 0 ? first.exercise.duration_seconds : 60;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- las dependencias omitidas son estables o se excluyen a propósito para no reiniciar el efecto
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
          nextExercise.exercise?.duration_seconds > 0 ? nextExercise.exercise.duration_seconds : 60;
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
      await addPoints(session.user.id, "routine_completed", showAchievement);
      await updateStreak(session.user.id);
      await checkExerciseAchievements(session.user.id, showAchievement);
      await checkStreakAchievements(session.user.id, showAchievement);
    } catch (err) {
      reportError(err, { scope: "RoutinePlayer" });
    }
  }

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%` as `${number}%`,
  }));

  const currentRoutineExercise = routine?.routine_exercises[currentExerciseIndex];
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

  const phaseTotal =
    phase === "rest"
      ? 30
      : currentExercise && currentExercise.duration_seconds > 0
        ? currentExercise.duration_seconds
        : 60;
  const ringProgress = phaseTotal > 0 ? 1 - timeLeft / phaseTotal : 0;

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas">
        <MochiCharacter expression="excited" size={120} />
        <Caption className="mt-3">Preparando tu rutina…</Caption>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 justify-center bg-canvas px-6">
        <ErrorState message={error} />
        <Button title="Volver" variant="soft" onPress={() => router.back()} />
      </View>
    );
  }

  if (phase === "complete") {
    return (
      <View
        className="flex-1 justify-center bg-canvas px-6"
        style={{ paddingTop: insets.top, paddingBottom: insets.bottom + 16 }}
      >
        <View className="items-center">
          <MochiCharacter expression="celebrating" size={180} interactive />
          <Display className="mt-2 text-center">¡Rutina completada!</Display>
          <Caption className="mt-1">
            Terminaste {routine?.routine_exercises.length} ejercicios
          </Caption>
          <View className="mt-3 rounded-full bg-tint-kitchen px-4 py-1.5">
            <Text className="font-body-extrabold text-sm text-tint-kitchen-ink">+10 puntos</Text>
          </View>
          <View className="mt-5 flex-row items-center justify-center">
            <StarIcon delay={0} />
            <StarIcon delay={150} />
            <StarIcon delay={300} />
          </View>
        </View>
        <View className="mt-8">
          <Button title="Listo" onPress={() => router.back()} />
        </View>
      </View>
    );
  }

  const nextName =
    routine?.routine_exercises[currentExerciseIndex + 1]?.exercise?.name ?? "Último ejercicio";

  return (
    <View className="flex-1 bg-canvas">
      {phase === "exercise" && exerciseImageUrl ? (
        <RNAnimated.View style={{ opacity: imageOpacity }} className="absolute inset-0">
          <ImageBackground
            source={{ uri: exerciseImageUrl }}
            className="h-full w-full"
            resizeMode="cover"
            blurRadius={2}
          >
            <LinearGradient
              colors={["rgba(251,246,239,0.7)", "rgba(251,246,239,0.86)", "rgba(251,246,239,0.95)"]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={{ width: "100%", height: "100%" }}
            />
          </ImageBackground>
        </RNAnimated.View>
      ) : null}

      <View
        className="flex-1 px-6"
        style={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }}
      >
        <View className="flex-row items-center justify-between">
          <View className="min-w-0 flex-1 pr-3">
            <Eyebrow>
              Ejercicio {currentExerciseIndex + 1} de {totalExercises}
            </Eyebrow>
            <Title className="mt-1" numberOfLines={1}>
              {routine?.name}
            </Title>
          </View>
          <PressableScale
            onPress={() => router.back()}
            accessibilityLabel="Salir de la rutina"
            className="h-10 w-10 items-center justify-center rounded-full bg-surface-muted"
          >
            <Ionicons name="close" size={20} color={COLORS.inkMuted} />
          </PressableScale>
        </View>
        <View className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-muted">
          <Animated.View style={progressStyle} className="h-2 rounded-full bg-accent" />
        </View>

        <View className="flex-1 items-center justify-center">
          <Eyebrow>{phase === "rest" ? "Descanso" : "Ahora"}</Eyebrow>
          <Title className="mt-1 text-center text-[24px] leading-[29px]" numberOfLines={2}>
            {phase === "rest" ? "Respira un momento" : currentExercise?.name}
          </Title>
          {phase === "exercise" &&
          currentExercise &&
          (currentExercise.sets > 0 || currentExercise.reps > 0) ? (
            <Caption className="mt-1">
              {currentExercise.sets > 0 ? `${currentExercise.sets} series` : ""}
              {currentExercise.sets > 0 && currentExercise.reps > 0 ? " × " : ""}
              {currentExercise.reps > 0 ? `${currentExercise.reps} repeticiones` : ""}
            </Caption>
          ) : null}

          <View className="mt-6">
            <ProgressRing
              progress={ringProgress}
              size={236}
              stroke={14}
              color={phase === "rest" ? COLORS.positive : accent.accent}
              accessibilityLabel={`Quedan ${formatTime(timeLeft)}`}
            >
              <MochiCharacter
                expression={phase === "rest" ? "sleepy" : "excited"}
                size={88}
                shadow={false}
              />
              <Text className="font-display text-[42px] leading-[46px] text-ink">
                {formatTime(timeLeft)}
              </Text>
            </ProgressRing>
          </View>

          {phase === "exercise" && currentExercise?.notes ? (
            <Caption className="mt-4 px-4 text-center">{currentExercise.notes}</Caption>
          ) : null}
          {phase === "rest" ? <Caption className="mt-4">Siguiente: {nextName}</Caption> : null}
          {phase === "exercise" && imageLoading ? (
            <Caption className="mt-2">Buscando una imagen…</Caption>
          ) : null}
        </View>

        <Button
          title={phase === "rest" ? "Saltar descanso" : "Siguiente"}
          variant={phase === "rest" ? "outline" : "primary"}
          onPress={handleSkip}
        />
      </View>
    </View>
  );
}

export default RoutinePlayerScreen;
