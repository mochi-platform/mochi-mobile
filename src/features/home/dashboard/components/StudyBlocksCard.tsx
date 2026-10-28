import { tc } from "@/src/shared/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import Animated from "react-native-reanimated";
import { Text, TouchableOpacity, View } from "react-native";
import type { StudyBlock } from "@/src/shared/types/database";
import { MochiCharacter } from "@/src/shared/components/MochiCharacter";
import { AnimatedDashboardCard } from "@/src/features/home/dashboard/AnimatedDashboardCard";
import type { LoadingPulseStyle } from "@/src/features/home/dashboard/useLoadingPulse";
import {
  colorMap,
  formatTimeHHMM,
  getBlockDurationLabel,
} from "@/src/features/home/dashboard/helpers";

type StudyBlocksCardProps = {
  animationSeed: number;
  loading: boolean;
  loadingStyle: LoadingPulseStyle;
  studyError: string | null;
  todayBlocks: StudyBlock[];
  onNavigateToStudy: () => void;
};

export function StudyBlocksCard({
  animationSeed,
  loading,
  loadingStyle,
  studyError,
  todayBlocks,
  onNavigateToStudy,
}: StudyBlocksCardProps) {
  return (
    <AnimatedDashboardCard
      delay={0}
      animationSeed={animationSeed}
      className="mt-4 rounded-3xl border-2 border-pink-200 bg-white p-5 dark:border-pink-800 dark:bg-surface"
    >
      <View className="mb-3 flex-row items-center">
        <Ionicons name="book" size={18} color={tc("#be185d")} />
        <Text className="ml-2 text-base font-bold text-pink-900 dark:text-pink-100">
          Bloques de estudio
        </Text>
      </View>

      {loading ? (
        <View className="items-center py-6">
          <Animated.View style={loadingStyle}>
            <MochiCharacter mood="thinking" size={82} />
          </Animated.View>
          <Text className="mt-3 text-sm font-semibold text-pink-700 dark:text-pink-300">
            Cargando tu agenda...
          </Text>
        </View>
      ) : studyError ? (
        <Text className="text-sm font-semibold text-red-600 dark:text-red-400">{studyError}</Text>
      ) : todayBlocks.length === 0 ? (
        <TouchableOpacity
          className="items-center py-2"
          onPress={onNavigateToStudy}
          activeOpacity={0.8}
        >
          <MochiCharacter mood="sleepy" size={78} />
          <Text className="mt-3 text-sm font-semibold text-slate-500">
            No hay bloques para este día
          </Text>
        </TouchableOpacity>
      ) : (
        todayBlocks.map((block) => (
          <TouchableOpacity
            key={block.id}
            className="mb-3 flex-row items-center justify-between rounded-2xl border border-pink-200 bg-pink-50 p-3 dark:border-pink-800 dark:bg-pink-950"
            style={{ borderColor: tc("#fbcfe8") }}
            onPress={onNavigateToStudy}
          >
            <View className="flex-row items-center">
              <View
                className={`mr-3 h-10 w-10 items-center justify-center rounded-xl ${colorMap[block.color] ?? "bg-purple-200 dark:bg-purple-800"}`}
              >
                <Text className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
                  {block.subject[0]}
                </Text>
              </View>
              <View>
                <Text className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {block.subject}
                </Text>
                <Text className="text-xs font-semibold text-slate-500">
                  {formatTimeHHMM(block.start_time)} - {formatTimeHHMM(block.end_time)}
                </Text>
              </View>
            </View>
            <View className="rounded-full bg-white px-3 py-1 dark:bg-surface">
              <Text className="text-xs font-bold text-slate-600 dark:text-slate-400">
                {getBlockDurationLabel(block.start_time, block.end_time)}
              </Text>
            </View>
          </TouchableOpacity>
        ))
      )}
    </AnimatedDashboardCard>
  );
}
