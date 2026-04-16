import { useEffect } from "react";
import { Image } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

type MochiMood = "happy" | "thinking" | "sleepy" | "excited";

type MochiCharacterProps = {
  mood: MochiMood;
  size?: number;
};

const moodScale: Record<MochiMood, number> = {
  happy: 1,
  thinking: 0.97,
  sleepy: 0.95,
  excited: 1.05,
};

const AnimatedImage = Animated.createAnimatedComponent(Image);

export function MochiCharacter({ mood, size = 80 }: MochiCharacterProps) {
  const floatY = useSharedValue(0);
  const floatX = useSharedValue(0);
  const scale = useSharedValue(1);
  const rotate = useSharedValue(0);

  const animateOscillation = (
    value: { value: number },
    center: number,
    amplitude: number,
    duration: number,
  ) => {
    value.value = center - amplitude;
    value.value = withRepeat(
      withTiming(center + amplitude, {
        duration,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true,
    );
  };

  // Una sola capa de animacion por mood para evitar que se pisen entre si.
  useEffect(() => {
    cancelAnimation(floatY);
    cancelAnimation(floatX);
    cancelAnimation(scale);
    cancelAnimation(rotate);

    switch (mood) {
      case "happy":
        animateOscillation(floatY, -1.5, 1.7, 2100);
        animateOscillation(floatX, 0.2, 1.2, 2800);
        animateOscillation(scale, 1.01, 0.012, 1400);
        animateOscillation(rotate, 0, 0.8, 2400);
        break;

      case "thinking":
        animateOscillation(floatY, -0.7, 1.1, 2600);
        animateOscillation(floatX, 0, 1.5, 2500);
        animateOscillation(scale, 1, 0.008, 2200);
        animateOscillation(rotate, 0, 1.5, 2200);
        break;

      case "sleepy":
        animateOscillation(floatY, -0.3, 0.8, 3200);
        animateOscillation(floatX, 0, 0.55, 3500);
        animateOscillation(scale, 0.995, 0.007, 2800);
        animateOscillation(rotate, 0, 0.55, 3000);
        break;

      case "excited":
        animateOscillation(floatY, -1.8, 2, 1050);
        animateOscillation(floatX, 0, 1.3, 1200);
        animateOscillation(scale, 1.02, 0.018, 900);
        animateOscillation(rotate, 0, 1.4, 1000);
        break;
    }
  }, [mood]);

  // Estilo animado
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: floatX.value },
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