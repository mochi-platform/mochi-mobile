import * as Haptics from "expo-haptics";
import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { ELEVATION } from "./elevation";
import { EASE_OUT, REDUCE } from "./motion";
import { usePressScale } from "./usePressScale";

type ToggleProps = {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  description?: string;
};

const TRACK_W = 52;
const TRACK_H = 32;
const THUMB = 26;
const PAD = 3;
const TRAVEL = TRACK_W - THUMB - PAD * 2;

/** Interruptor propio con los colores del tema (no el Switch del sistema). */
export function Toggle({ label, value, onValueChange, description }: ToggleProps) {
  const progress = useSharedValue(value ? 1 : 0);
  const press = usePressScale(0.98);

  useEffect(() => {
    progress.set(
      withTiming(value ? 1 : 0, { duration: 180, easing: EASE_OUT, reduceMotion: REDUCE }),
    );
  }, [value, progress]);

  const onStyle = useAnimatedStyle(() => ({ opacity: progress.get() }));
  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.get() * TRAVEL }],
  }));

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={description}
      accessibilityState={{ checked: value }}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      onPress={() => {
        void Haptics.selectionAsync().catch(() => {});
        onValueChange(!value);
      }}
    >
      <Animated.View
        style={press.style}
        className="min-h-[48px] flex-row items-center justify-between py-1"
      >
        <View className="flex-1 pr-3">
          <Text className="font-body-extrabold text-[15px] text-ink">{label}</Text>
          {description ? (
            <Text className="mt-0.5 font-body text-[13px] leading-[18px] text-ink-muted">
              {description}
            </Text>
          ) : null}
        </View>
        <View
          className="justify-center overflow-hidden rounded-full bg-ink-faint/50"
          style={{ width: TRACK_W, height: TRACK_H }}
        >
          {/* Capa "encendido" que se funde sobre la pista apagada: sin leer colores en el worklet. */}
          <Animated.View
            pointerEvents="none"
            className="absolute inset-0 bg-accent"
            style={onStyle}
          />
          <Animated.View
            className="rounded-full bg-white"
            style={[{ width: THUMB, height: THUMB, marginLeft: PAD }, ELEVATION[1], thumbStyle]}
          />
        </View>
      </Animated.View>
    </Pressable>
  );
}
