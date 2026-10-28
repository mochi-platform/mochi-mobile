import { useEffect } from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MochiCharacter } from "@/src/shared/components/MochiCharacter";
import { Caption, ELEVATION, Eyebrow, Strong } from "@/src/shared/ui";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";

type AchievementToastProps = {
  title: string;
  description: string;
  points: number;
  /** Se conserva por compatibilidad: ahora el aviso muestra a Mochi en lugar de un ícono. */
  icon?: string;
  onHide: () => void;
};

const SLIDE_IN_MS = 380;
const VISIBLE_MS = 2800;
const SLIDE_OUT_MS = 320;

export function AchievementToast({ title, description, points, onHide }: AchievementToastProps) {
  const insets = useSafeAreaInsets();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- las dependencias omitidas son estables o se excluyen a propósito para no reiniciar el efecto
  }, [title]); // re-anima si cambia el logro

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const isReward = points > 0;

  return (
    <Animated.View
      style={[
        animatedStyle,
        { position: "absolute", top: insets.top + 8, left: 16, right: 16, zIndex: 999 },
      ]}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
    >
      <View
        className="flex-row items-center gap-3 rounded-[22px] bg-canvas px-3.5 py-3"
        style={ELEVATION[3]}
      >
        <MochiCharacter
          expression={isReward ? "celebrating" : "happy"}
          size={56}
          animated={false}
          shadow={false}
        />
        <View className="min-w-0 flex-1">
          <Eyebrow className="text-accent-strong">
            {isReward ? "Logro desbloqueado" : "Listo"}
          </Eyebrow>
          <Strong numberOfLines={1}>{title}</Strong>
          {description ? <Caption numberOfLines={1}>{description}</Caption> : null}
        </View>
        {isReward ? (
          <View className="rounded-full bg-tint-kitchen px-2.5 py-1">
            <Text className="font-body-extrabold text-xs text-tint-kitchen-ink">+{points}</Text>
          </View>
        ) : null}
      </View>
    </Animated.View>
  );
}

export default AchievementToast;
