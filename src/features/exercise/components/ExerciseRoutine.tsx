import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { supabase } from "@/src/shared/lib/supabase";
import { useSession } from "@/src/core/providers/SessionContext";
import type { RoutineWithExercises } from "@/src/shared/types/database";
import { MochiCharacter } from "@/src/shared/components/MochiCharacter";
import { useCycleRecommendation } from "@/src/shared/hooks/useCycleRecommendation";

const colorMap: Record<string, string> = {
  teal: "bg-teal-200",
  pink: "bg-pink-200",
  purple: "bg-purple-200",
  blue: "bg-blue-200",
  yellow: "bg-yellow-200",
  green: "bg-green-200",
};

const dayMap = ["D", "L", "M", "X", "J", "V", "S"];

type AnimatedRoutineCardProps = {
  routine: RoutineWithExercises;
  index: number;
  animationSeed: number;
  totalTime: string;
};

function AnimatedRoutineCard({
  routine,
  index,
  animationSeed,
  totalTime,
}: AnimatedRoutineCardProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(16);

  useEffect(() => {
    opacity.value = 0;
    translateY.value = 16;

    opacity.value = withDelay(
      index * 100,
      withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) }),
    );
    translateY.value = withDelay(
      index * 100,
      withTiming(0, { duration: 360, easing: Easing.out(Easing.cubic) }),
    );
  }, [animationSeed, index, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ translateY: translateY.value }],
    };
  });

  return (
    <Animated.View
      style={animatedStyle}
      className="mb-4 rounded-3xl border-2 border-teal-200 bg-white p-5"
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-xl font-extrabold text-slate-800">
            {routine.name}
          </Text>
          <View className="mt-2 flex-row">
            {routine.days.map((dayNum) => (
              <View
                key={`${routine.id}-${dayNum}`}
                className="mr-2 rounded-full bg-teal-200 px-2 py-1"
              >
                <Text className="text-xs font-bold text-slate-700">
                  {dayMap[dayNum] ?? "?"}
                </Text>
              </View>
            ))}
          </View>
          <Text className="mt-2 text-sm font-semibold text-slate-600">
            {routine.routine_exercises.length} ejercicios • {totalTime}
          </Text>
        </View>

        <TouchableOpacity
          className="h-11 w-11 items-center justify-center rounded-2xl bg-teal-200"
          onPress={() => router.push(`/routine-player?routineId=${routine.id}`)}
        >
          <Ionicons name="play" size={18} color="#0d9488" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

export function ExerciseRoutine() {
  const { session } = useSession();
  const { tip, personality, phase } = useCycleRecommendation("exercise");
  const [routines, setRoutines] = useState<RoutineWithExercises[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [animationSeed, setAnimationSeed] = useState(0);

  const loadingScale = useSharedValue(1);
  const createButtonScale = useSharedValue(1);

  const loadingAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: loadingScale.value }],
    };
  });

  const createButtonAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: createButtonScale.value }],
    };
  });

  useEffect(() => {
    if (loading) {
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
    } else {
      loadingScale.value = withTiming(1, { duration: 180 });
    }
  }, [loading, loadingScale]);

  const loadRoutines = useCallback(async () => {
    const userId = session?.user.id;
    if (!userId) {
      setRoutines([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: supabaseError } = await supabase
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
        .order("created_at", { ascending: false });

      if (supabaseError) throw supabaseError;
      setRoutines(data ?? []);
      setAnimationSeed((prev) => prev + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error cargando rutinas");
      setRoutines([]);
    } finally {
      setLoading(false);
    }
  }, [session?.user.id]);

  useFocusEffect(
    useCallback(() => {
      void loadRoutines();
    }, [loadRoutines]),
  );

  const handleTotalTime = (routine: RoutineWithExercises): string => {
    const totalSeconds = routine.routine_exercises.reduce((sum, re) => {
      return sum + (re.exercise?.duration_seconds ?? 0);
    }, 0);
    const minutes = Math.ceil(totalSeconds / 60);
    return `${minutes} min`;
  };

  return (
    <View className="flex-1 bg-teal-100 px-5 pt-12">
      <View className="mb-6 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <View className="h-11 w-11 items-center justify-center rounded-2xl border-2 border-teal-200 bg-white">
            <Ionicons
              name={personality?.phaseIconName ?? "barbell"}
              size={20}
              color={personality ? personality.phaseColor : "#0d9488"}
            />
          </View>
          <Text className="ml-3 text-2xl font-extrabold text-teal-900">
            Mis rutinas
          </Text>
        </View>
        <MochiCharacter mood={personality?.mochiMood ?? "happy"} size={46} />
      </View>

      {tip && personality && (
        <View
          className={`mb-4 rounded-2xl border p-3 ${personality.phaseBadgeClass}`}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-2">
              <Text className="text-xs font-extrabold text-slate-800">
                Consejo para hoy
              </Text>
              <Text className="mt-1 text-xs font-semibold text-slate-700">
                {tip}
              </Text>
              {phase === "menstrual" && (
                <View className="mt-2 self-start rounded-full bg-white/80 px-2.5 py-1">
                  <Text className="text-[11px] font-extrabold text-slate-700">
                    Escúchate hoy
                  </Text>
                </View>
              )}
              {phase === "ovulatoria" && (
                <View className="mt-2 self-start rounded-full bg-white/80 px-2.5 py-1">
                  <Text className="text-[11px] font-extrabold text-slate-700">
                    Tu mejor momento para entrenar
                  </Text>
                </View>
              )}
            </View>
            <MochiCharacter mood={personality.mochiMood} size={54} />
          </View>
        </View>
      )}

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {loading ? (
          <View className="flex-1 items-center justify-center py-8">
            <Animated.View style={loadingAnimatedStyle}>
              <MochiCharacter mood="thinking" size={92} />
            </Animated.View>
            <Text className="mt-4 text-sm font-semibold text-teal-700">
              Cargando rutinas...
            </Text>
          </View>
        ) : error ? (
          <View className="rounded-3xl border-2 border-red-200 bg-red-50 p-4">
            <Text className="text-sm font-semibold text-red-700">{error}</Text>
          </View>
        ) : routines.length === 0 ? (
          <View className="rounded-3xl border-2 border-teal-200 bg-white p-6">
            <View className="items-center">
              <MochiCharacter
                mood={personality?.mochiMood ?? "happy"}
                size={88}
              />
              <Text className="mt-3 text-center text-sm font-semibold text-teal-600">
                Crea tu primera rutina
              </Text>
            </View>
          </View>
        ) : (
          routines.map((routine, index) => (
            <AnimatedRoutineCard
              key={routine.id}
              routine={routine}
              index={index}
              animationSeed={animationSeed}
              totalTime={handleTotalTime(routine)}
            />
          ))
        )}
      </ScrollView>

      <Animated.View style={createButtonAnimatedStyle}>
        <TouchableOpacity
          className="mb-6 mt-4 flex-row items-center justify-center rounded-2xl bg-teal-500 py-4"
          onPressIn={() => {
            createButtonScale.value = withSequence(
              withSpring(1.08, { damping: 8, stiffness: 180 }),
              withSpring(1, { damping: 10, stiffness: 180 }),
            );
          }}
          onPress={() => router.push("/routine-create")}
        >
          <Ionicons name="add" size={20} color="white" />
          <Text className="ml-2 text-base font-extrabold text-white">
            Nueva rutina
          </Text>
        </TouchableOpacity>
      </Animated.View>

      <TouchableOpacity
        className="mb-8 items-center"
        onPress={() => router.push("/exercise-list")}
      >
        <Text className="text-sm font-bold text-teal-700">
          Gestionar ejercicios
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default ExerciseRoutine;
