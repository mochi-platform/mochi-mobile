import { useEffect, type ReactNode } from "react";
import { View } from "react-native";
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { COLORS } from "@/src/shared/theme/tokens";
import { DURATION, EASE_OUT, REDUCE } from "./motion";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type ProgressRingProps = {
  /** De 0 a 1. */
  progress: number;
  size?: number;
  stroke?: number;
  color?: string;
  trackColor?: string;
  /** Contenido centrado (cifra, icono). */
  children?: ReactNode;
  accessibilityLabel?: string;
};

/** Anillo de progreso que se llena con una animación corta al cambiar el valor. */
export function ProgressRing({
  progress,
  size = 36,
  stroke = 4.5,
  color = COLORS.positive,
  trackColor = COLORS.track,
  children,
  accessibilityLabel,
}: ProgressRingProps) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(Math.max(progress, 0), 1);
  const value = useSharedValue(0);

  useEffect(() => {
    value.set(withTiming(clamped, { duration: DURATION.slow, easing: EASE_OUT, reduceMotion: REDUCE }));
  }, [clamped, value]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - value.get()),
    // Con extremo redondeado, un arco de largo 0 se vería como un punto.
    strokeOpacity: value.get() < 0.005 ? 0 : 1,
  }));

  return (
    <View
      accessible={Boolean(accessibilityLabel)}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={{ width: size, height: size }}
      className="items-center justify-center"
    >
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={trackColor} strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children}
    </View>
  );
}
