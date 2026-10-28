import { tc } from "@/src/shared/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import Animated from "react-native-reanimated";
import { Text, TouchableOpacity, View } from "react-native";
import type { RoutineWithExercises } from "@/src/shared/types/database";
import { MochiCharacter } from "@/src/shared/components/MochiCharacter";
import { AnimatedDashboardCard } from "@/src/features/home/dashboard/AnimatedDashboardCard";
import type { LoadingPulseStyle } from "@/src/features/home/dashboard/useLoadingPulse";
import { getRoutineTotalTime } from "@/src/features/home/dashboard/helpers";

type RoutinesCardProps = {
  animationSeed: number;
  loading: boolean;
  loadingStyle: LoadingPulseStyle;
  todayRoutines: RoutineWithExercises[];
  routineError: string | null;
  onNavigateToExercise: () => void;
};

export function RoutinesCard({
  animationSeed,
  loading,
  loadingStyle,
  todayRoutines,
  routineError,
  onNavigateToExercise,
}: RoutinesCardProps) {
  return (
    <AnimatedDashboardCard
      delay={100}
      animationSeed={animationSeed}
      className="mt-4 rounded-3xl border-2 border-teal-200 bg-white p-5 dark:border-teal-800 dark:bg-surface"
    >
      <View className="mb-2 flex-row items-center">
        <Ionicons name="barbell" size={18} color={tc("#0d9488")} />
        <Text className="ml-2 text-base font-bold text-teal-900 dark:text-teal-100">
          Rutinas de hoy
        </Text>
      </View>
      {loading ? (
        <View className="items-center py-6">
          <Animated.View style={loadingStyle}>
            <MochiCharacter mood="thinking" size={82} />
          </Animated.View>
          <Text className="mt-3 text-sm font-semibold text-teal-700 dark:text-teal-300">
            Preparando tus rutinas...
          </Text>
        </View>
      ) : todayRoutines.length > 0 ? (
        todayRoutines.map((routine) => (
          <TouchableOpacity
            key={routine.id}
            className="mb-3 rounded-2xl border border-teal-200 bg-teal-50 p-3 dark:border-teal-800 dark:bg-teal-950"
            onPress={onNavigateToExercise}
          >
            <Text className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {routine.name}
            </Text>
            <Text className="mt-1 text-xs font-semibold text-teal-700 dark:text-teal-300">
              {routine.routine_exercises.length} ejercicios • {getRoutineTotalTime(routine)}
            </Text>
            <View className="mt-2 self-start rounded-xl border border-teal-200 bg-white px-3 py-1 dark:border-teal-800 dark:bg-surface">
              <Text className="text-xs font-bold text-teal-800 dark:text-teal-200">
                Iniciar rutina
              </Text>
            </View>
          </TouchableOpacity>
        ))
      ) : routineError ? (
        <Text className="text-xs font-semibold text-red-500">{routineError}</Text>
      ) : (
        <TouchableOpacity
          className="items-center py-2"
          onPress={onNavigateToExercise}
          activeOpacity={0.8}
        >
          <MochiCharacter mood="happy" size={78} />
          <Text className="mt-3 text-sm font-semibold text-slate-500">Crea tu primera rutina</Text>
        </TouchableOpacity>
      )}
    </AnimatedDashboardCard>
  );
}
