import { useEffect } from "react";
import { Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

type AchievementToastProps = {
  title: string;
  description: string;
  points: number;
  icon?: string;
  onHide: () => void;
};

const SLIDE_IN_MS = 380;
const VISIBLE_MS = 2800;
const SLIDE_OUT_MS = 320;

export function AchievementToast({
  title,
  description,
  points,
  icon,
  onHide,
}: AchievementToastProps) {
  const translateY = useSharedValue(-120);
  const opacity = useSharedValue(0);

  useEffect(() => {
    // Entra
    translateY.value = withTiming(-120, { duration: 0 });
    opacity.value = withTiming(0, { duration: 0 });

    translateY.value = withSequence(
      withTiming(0, {
        duration: SLIDE_IN_MS,
        easing: Easing.out(Easing.cubic),
      }),
      withDelay(
        VISIBLE_MS,
        withTiming(-120, {
          duration: SLIDE_OUT_MS,
          easing: Easing.in(Easing.cubic),
        }),
      ),
    );
    opacity.value = withSequence(
      withTiming(1, { duration: SLIDE_IN_MS }),
      withDelay(VISIBLE_MS, withTiming(0, { duration: SLIDE_OUT_MS })),
    );

    const timer = setTimeout(
      () => {
        onHide();
      },
      SLIDE_IN_MS + VISIBLE_MS + SLIDE_OUT_MS,
    );

    return () => clearTimeout(timer);
  }, [title]); // re-anima si cambia el logro

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const resolvedIcon = (icon ?? "trophy") as keyof typeof Ionicons.glyphMap;

  return (
    <Animated.View
      style={[
        animatedStyle,
        { position: "absolute", top: 56, left: 16, right: 16, zIndex: 999 },
      ]}
    >
      <View className="flex-row items-center rounded-2xl border-2 border-yellow-300 bg-yellow-50 px-4 py-3 shadow-md">
        {/* Icono del logro */}
        <View className="mr-3 h-11 w-11 items-center justify-center rounded-xl bg-yellow-200">
          <Ionicons name={resolvedIcon} size={22} color="#92400e" />
        </View>

        {/* Texto */}
        <View className="flex-1">
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="sparkles" size={12} color="#d97706" />
            <Text className="text-xs font-extrabold uppercase tracking-wide text-yellow-700">
              Logro desbloqueado
            </Text>
          </View>
          <Text
            className="mt-0.5 text-sm font-extrabold text-yellow-950"
            numberOfLines={1}
          >
            {title}
          </Text>
          <Text
            className="text-xs font-semibold text-yellow-700"
            numberOfLines={1}
          >
            {description}
          </Text>
        </View>

        {/* Puntos */}
        <View className="ml-3 rounded-full bg-yellow-300 px-2.5 py-1">
          <Text className="text-xs font-extrabold text-yellow-900">
            +{points}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

export default AchievementToast;
