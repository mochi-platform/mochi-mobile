import { useEffect } from "react";
import { Image } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
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

  useEffect(() => {
    floatY.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 1000, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 1000, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, [floatY]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: floatY.value }],
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
