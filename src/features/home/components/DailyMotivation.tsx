import { reportError } from "@/src/shared/lib/observability/reportError";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { getDailyMotivation } from "@/src/shared/lib/ai";
import { MochiCharacter } from "@/src/shared/components/MochiCharacter";
import { getCyclePersonality } from "@/src/shared/lib/cyclePersonality";
import type { CyclePhase } from "@/src/shared/lib/healthConnect";

type DailyMotivationProps = {
  studyBlockCount: number;
  hasRoutine: boolean;
  timeOfDay: string;
  cyclePhase?: CyclePhase;
};

export function DailyMotivation({
  studyBlockCount,
  hasRoutine,
  timeOfDay,
  cyclePhase,
}: DailyMotivationProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const shimmerOpacity = useSharedValue(1);
  const personality = cyclePhase ? getCyclePersonality(cyclePhase) : null;

  useEffect(() => {
    shimmerOpacity.value = withRepeat(
      withSequence(
        withTiming(0.4, { duration: 700, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, [shimmerOpacity]);

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: shimmerOpacity.value,
  }));

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const msg = await getDailyMotivation(
          studyBlockCount,
          hasRoutine,
          timeOfDay,
          personality?.phaseLabel,
        );

        if (mounted) {
          setMessage(msg);
        }
      } catch (error) {
        reportError(error, { scope: "DailyMotivation" });

        if (mounted) {
          setMessage("Hoy es un buen dia para avanzar un paso mas.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
          shimmerOpacity.value = withTiming(1, { duration: 200 });
        }
      }
    }
    void load();
    return () => {
      mounted = false;
    };
  }, [studyBlockCount, hasRoutine, timeOfDay, shimmerOpacity, personality?.phaseLabel]);

  return (
    <View className="flex-row items-center rounded-3xl border-2 border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-950">
      <MochiCharacter mood={personality?.mochiMood ?? "happy"} size={56} />
      <View className="ml-3 flex-1">
        {loading ? (
          <Animated.View style={shimmerStyle}>
            <View className="mb-2 h-3 w-full rounded-full bg-yellow-200 dark:bg-yellow-800" />
            <View className="h-3 w-3/4 rounded-full bg-yellow-200 dark:bg-yellow-800" />
          </Animated.View>
        ) : (
          <Text className="text-sm font-semibold leading-5 text-yellow-900 dark:text-yellow-100">
            {message}
          </Text>
        )}
      </View>
    </View>
  );
}

export default DailyMotivation;
