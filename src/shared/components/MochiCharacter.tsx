import { useEffect } from "react";
import { Image } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
} from "react-native-reanimated";

type MochiMood = "happy" | "thinking" | "sleepy" | "excited";

type MochiCharacterProps = {
  mood: MochiMood;
  size?: number;
};

const moodScale: Record<MochiMood, number> = {
  happy: 1,
  thinking: 0.92,
  sleepy: 0.88,
  excited: 1.12,
};

const AnimatedImage = Animated.createAnimatedComponent(Image);

export function MochiCharacter({ mood, size = 80 }: MochiCharacterProps) {
  const floatY = useSharedValue(0);
  const scale = useSharedValue(1);
  const rotate = useSharedValue(0);

  // 🌊 FLOAT BASE (la tuya, pero un poco más orgánica)
  useEffect(() => {
    floatY.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 900, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, []);

  // 🎭 ANIMACIONES POR MOOD
  useEffect(() => {
    switch (mood) {
      case "happy":
        scale.value = withRepeat(
          withSequence(
            withTiming(1.05, { duration: 300 }),
            withTiming(1, { duration: 300 }),
          ),
          -1,
          true,
        );
        break;

      case "thinking":
        rotate.value = withRepeat(
          withSequence(
            withTiming(-5, { duration: 800 }),
            withTiming(5, { duration: 800 }),
            withTiming(0, { duration: 600 }),
          ),
          -1,
          true,
        );
        break;

      case "sleepy":
        scale.value = withRepeat(
          withSequence(
            withTiming(0.95, { duration: 1200 }),
            withTiming(1, { duration: 1200 }),
          ),
          -1,
          true,
        );

        floatY.value = withRepeat(
          withSequence(
            withTiming(-4, { duration: 1500 }),
            withTiming(0, { duration: 1500 }),
          ),
          -1,
          false,
        );
        break;

      case "excited":
        scale.value = withRepeat(
          withSequence(
            withTiming(1.15, { duration: 200 }),
            withTiming(1, { duration: 200 }),
          ),
          -1,
          false,
        );

        floatY.value = withRepeat(
          withSequence(
            withTiming(-12, { duration: 300 }),
            withTiming(0, { duration: 300 }),
          ),
          -1,
          false,
        );
        break;
    }
  }, [mood]);

  // 🎨 ESTILO ANIMADO
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: floatY.value },
        { scale: scale.value },
        { rotate: `${rotate.value}deg` },
      ],
    };
  });

  const resolvedSize = Math.round(size * moodScale[mood]);

  return (
    <AnimatedImage
      source={require("../../../assets/icon.png")}
      style={[{ width: resolvedSize, height: resolvedSize }, animatedStyle]}
      resizeMode="contain"
    />
  );
}

export default MochiCharacter;