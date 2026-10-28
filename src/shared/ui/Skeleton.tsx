import { useEffect } from "react";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

type SkeletonProps = { height?: number; className?: string };

export function Skeleton({ height = 16, className = "" }: SkeletonProps) {
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) return;
    opacity.value = withRepeat(withTiming(0.45, { duration: 800 }), -1, true);
  }, [opacity, reduceMotion]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value, height }));

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className={`rounded-control bg-surface-muted ${className}`}
      style={style}
    />
  );
}
