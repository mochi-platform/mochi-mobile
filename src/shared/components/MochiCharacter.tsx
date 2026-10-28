import { useEffect } from "react";
import { Image, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { VECTOR_MOCHI_ENABLED } from "@/src/shared/config/flags";
import { MochiCanvas, type MochiHandle } from "@/src/shared/mochi/MochiCanvas";
import type { Ref } from "react";
import {
  EXPRESSION_BASE_MOOD,
  resolveMochiSource,
  type MochiBaseMood as MochiMood,
  type MochiExpression,
  type MochiOutfit,
} from "@/src/shared/mochi/manifest";

type MochiCharacterProps = {
  /** Forma antigua (4 estados). Se mantiene por compatibilidad. */
  mood?: MochiMood;
  expression?: MochiExpression;
  outfit?: MochiOutfit;
  size?: number;
  /** Solo Mochi vectorial: respira y parpadea (por defecto, a partir de 100 pt). */
  animated?: boolean;
  /** Solo Mochi vectorial: reacciona al toque. */
  onPress?: () => void;
  interactive?: boolean;
  shadow?: boolean;
  ref?: Ref<MochiHandle>;
};

/** El PNG trae aire alrededor; la versión vectorial ocupa el 80 % de la caja para verse igual de grande. */
const VECTOR_FILL = 0.8;

export function MochiCharacter(props: MochiCharacterProps) {
  if (!VECTOR_MOCHI_ENABLED) return <MochiPng {...props} />;
  const {
    mood: legacyMood,
    expression = legacyMood ?? "happy",
    size = 80,
    animated = size >= 100,
    onPress,
    interactive,
    shadow,
    ref,
  } = props;
  return (
    <View style={{ width: size, height: size }} className="items-center justify-center">
      <MochiCanvas
        expression={expression}
        size={Math.round(size * VECTOR_FILL)}
        animated={animated}
        onPress={onPress}
        interactive={interactive}
        shadow={shadow}
        ref={ref}
      />
    </View>
  );
}

const moodScale: Record<MochiMood, number> = {
  happy: 1,
  thinking: 0.97,
  sleepy: 0.95,
  excited: 1.05,
};

const AnimatedImage = Animated.createAnimatedComponent(Image);

/** Versión PNG (respaldo con EXPO_PUBLIC_VECTOR_MOCHI=false). */
function MochiPng({
  mood: legacyMood,
  expression = legacyMood ?? "happy",
  outfit = "none",
  size = 80,
}: MochiCharacterProps) {
  const mood: MochiMood = EXPRESSION_BASE_MOOD[expression];
  const floatY = useSharedValue(0);
  const floatX = useSharedValue(0);
  const scale = useSharedValue(1);
  const squashX = useSharedValue(1);
  const squashY = useSharedValue(1);
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
    cancelAnimation(squashX);
    cancelAnimation(squashY);
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
        animateOscillation(squashX, 1.01, 0.012, 2400);
        animateOscillation(squashY, 0.99, 0.01, 2400);
        animateOscillation(rotate, 0, 1.5, 2200);
        break;

      case "sleepy":
        animateOscillation(floatY, -0.3, 0.8, 3200);
        animateOscillation(floatX, 0, 0.55, 3500);
        animateOscillation(scale, 0.995, 0.007, 2800);
        animateOscillation(squashX, 1.03, 0.02, 3000);
        animateOscillation(squashY, 0.95, 0.014, 3000);
        animateOscillation(rotate, 0, 0.55, 3000);
        break;

      case "excited":
        animateOscillation(floatY, -1.8, 2, 1050);
        animateOscillation(floatX, 0, 1.3, 1200);
        animateOscillation(scale, 1.02, 0.018, 900);
        animateOscillation(squashX, 0.98, 0.014, 980);
        animateOscillation(squashY, 1.03, 0.02, 980);
        animateOscillation(rotate, 0, 1.4, 1000);
        break;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- las dependencias omitidas son estables o se excluyen a propósito para no reiniciar el efecto
  }, [mood]);

  // Estilo animado
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: floatX.value },
        { translateY: floatY.value },
        { scale: scale.value },
        { scaleX: squashX.value },
        { scaleY: squashY.value },
        { rotate: `${rotate.value}deg` },
      ],
    };
  });

  const resolvedSize = Math.round(size * moodScale[mood]);

  return (
    <AnimatedImage
      source={resolveMochiSource(expression, outfit)}
      style={[{ width: resolvedSize, height: resolvedSize }, animatedStyle]}
      resizeMode="contain"
    />
  );
}

export default MochiCharacter;
