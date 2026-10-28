import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  FlatList,
  Modal,
  Pressable,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Button } from "@/src/shared/ui";
import {
  buildRange,
  formatTime,
  indexFromOffset,
  minuteOptions,
  pad2,
  parseTime,
  periodOfDay,
} from "./timePicker/utils";

type TimePickerModalProps = {
  visible: boolean;
  /** "HH:MM" */
  time: string;
  onConfirm: (time: string) => void;
  onCancel: () => void;
  label: string;
  /** Paso de los minutos. 5 por defecto; con `hoursOnly` los minutos quedan en 00. */
  minuteStep?: number;
  hoursOnly?: boolean;
};

const ITEM_HEIGHT = 52;
const VISIBLE_ITEMS = 5; // la fila central es la seleccionada
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;
const SIDE_PADDING = ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2);

function tick() {
  void Haptics.selectionAsync().catch(() => {});
}

type WheelProps = {
  data: number[];
  value: number;
  onChange: (value: number) => void;
  label: string;
};

/** Rueda con ajuste a la fila central. Más cerca del centro = más grande y más opaca. */
function Wheel({ data, value, onChange, label }: WheelProps) {
  const ref = useRef<FlatList<number>>(null);
  const [live, setLive] = useState(() => Math.max(0, data.indexOf(value)));
  const liveRef = useRef(live);

  const goTo = useCallback((index: number, animated: boolean) => {
    ref.current?.scrollToOffset({ offset: index * ITEM_HEIGHT, animated });
  }, []);

  const settle = (offsetY: number) => {
    const index = indexFromOffset(offsetY, ITEM_HEIGHT, data.length);
    if (index !== liveRef.current) {
      liveRef.current = index;
      setLive(index);
    }
    onChange(data[index]);
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = indexFromOffset(e.nativeEvent.contentOffset.y, ITEM_HEIGHT, data.length);
    if (index !== liveRef.current) {
      liveRef.current = index;
      setLive(index);
      tick();
      onChange(data[index]); // la lectura grande sigue a la rueda mientras gira
    }
  };

  const step = (delta: number) => {
    const next = Math.min(data.length - 1, Math.max(0, liveRef.current + delta));
    goTo(next, true);
  };

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: pad2(data[live] ?? 0) }}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={(e) => step(e.nativeEvent.actionName === "increment" ? 1 : -1)}
      style={{ height: WHEEL_HEIGHT }}
      className="flex-1"
    >
      <FlatList
        ref={ref}
        data={data}
        keyExtractor={(item) => String(item)}
        showsVerticalScrollIndicator={false}
        initialScrollIndex={Math.max(0, data.indexOf(value))}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScroll={onScroll}
        onMomentumScrollEnd={(e) => settle(e.nativeEvent.contentOffset.y)}
        onScrollEndDrag={(e) => {
          // Si no hay inercia, ajusta en el acto.
          const v = e.nativeEvent.velocity?.y ?? 0;
          if (Math.abs(v) < 0.05) settle(e.nativeEvent.contentOffset.y);
        }}
        getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
        contentContainerStyle={{ paddingVertical: SIDE_PADDING }}
        extraData={live}
        initialNumToRender={VISIBLE_ITEMS + 4}
        renderItem={({ item, index }) => {
          const distance = Math.abs(index - live);
          return (
            <Pressable
              accessible={false}
              onPress={() => goTo(index, true)}
              style={{ height: ITEM_HEIGHT, justifyContent: "center", alignItems: "center" }}
            >
              <Text
                allowFontScaling={false}
                className={distance === 0 ? "text-ink" : "text-ink-muted"}
                style={{
                  fontSize: distance === 0 ? 30 : distance === 1 ? 24 : 19,
                  fontWeight: distance === 0 ? "800" : "600",
                  opacity: distance === 0 ? 1 : distance === 1 ? 0.55 : 0.25,
                  fontVariant: ["tabular-nums"],
                }}
              >
                {pad2(item)}
              </Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

export function TimePickerModal({
  visible,
  time,
  onConfirm,
  onCancel,
  label,
  minuteStep = 5,
  hoursOnly = false,
}: TimePickerModalProps) {
  const step = hoursOnly ? 60 : minuteStep;
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [openMinutes, setOpenMinutes] = useState(0);
  // 0 = cerrado; cada apertura usa una clave nueva para montar las ruedas ya en su valor.
  const [resetKey, setResetKey] = useState(0);
  const reduceMotion = useReducedMotion();

  const hoursData = useMemo(() => buildRange(24), []);
  const minutesData = useMemo(() => minuteOptions(step, openMinutes), [step, openMinutes]);

  const scale = useSharedValue(0.94);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (!visible) {
      setResetKey(0);
      return;
    }
    const parsed = parseTime(time);
    setHours(parsed.hours);
    setMinutes(hoursOnly ? 0 : parsed.minutes);
    setOpenMinutes(hoursOnly ? 0 : parsed.minutes);
    setResetKey((k) => k + 1);
    void AccessibilityInfo.announceForAccessibility?.(label);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `label` solo se anuncia al abrir
  }, [visible, time, step, hoursOnly]);

  useEffect(() => {
    if (!visible) {
      opacity.value = 0;
      return;
    }
    if (reduceMotion) {
      scale.value = 1;
      opacity.value = 1;
      return;
    }
    scale.value = 0.94;
    opacity.value = 0;
    scale.value = withSpring(1, { damping: 16, stiffness: 220 });
    opacity.value = withTiming(1, { duration: 160 });
  }, [visible, reduceMotion, opacity, scale]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <Pressable
        accessible={false}
        onPress={onCancel}
        className="flex-1 items-center justify-center bg-black/50 px-6"
      >
        {/* Pressable interior: tocar la tarjeta no cierra el modal. */}
        <Pressable accessible={false} className="w-full max-w-sm">
          <Animated.View
            style={cardStyle}
            className="rounded-card border border-line bg-surface p-5"
          >
            <Text className="text-center text-sm font-bold text-ink-muted">{label}</Text>

            <View className="mt-1 items-center">
              <Text
                accessibilityLiveRegion="polite"
                allowFontScaling={false}
                className="text-ink"
                style={{ fontSize: 44, fontWeight: "800", fontVariant: ["tabular-nums"] }}
              >
                {formatTime(hours, minutes)}
              </Text>
              <Text className="text-xs font-bold uppercase tracking-wide text-accent">
                {periodOfDay(hours)}
              </Text>
            </View>

            <View className="mt-4" style={{ height: WHEEL_HEIGHT }}>
              {/* Banda de la fila seleccionada, detrás de las ruedas. */}
              <View
                pointerEvents="none"
                className="absolute left-0 right-0 rounded-control bg-accent-soft"
                style={{ top: SIDE_PADDING, height: ITEM_HEIGHT }}
              />
              {resetKey > 0 ? (
                <View className="flex-row items-center">
                  <Wheel
                    key={`h-${resetKey}`}
                    data={hoursData}
                    value={hours}
                    onChange={setHours}
                    label="Hora"
                  />
                  <Text
                    allowFontScaling={false}
                    className="text-ink"
                    style={{ fontSize: 30, fontWeight: "800", marginHorizontal: 2 }}
                  >
                    :
                  </Text>
                  {hoursOnly ? (
                    <View className="flex-1 items-center" style={{ height: WHEEL_HEIGHT }}>
                      <View style={{ height: SIDE_PADDING }} />
                      <View style={{ height: ITEM_HEIGHT, justifyContent: "center" }}>
                        <Text
                          allowFontScaling={false}
                          className="text-ink"
                          style={{ fontSize: 30, fontWeight: "800" }}
                        >
                          00
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <Wheel
                      key={`m-${resetKey}`}
                      data={minutesData}
                      value={minutes}
                      onChange={setMinutes}
                      label="Minutos"
                    />
                  )}
                </View>
              ) : null}
            </View>

            <View className="mt-5 flex-row gap-3">
              <View className="flex-1">
                <Button title="Cancelar" variant="outline" onPress={onCancel} />
              </View>
              <View className="flex-1">
                <Button
                  title="Confirmar"
                  onPress={() => onConfirm(formatTime(hours, hoursOnly ? 0 : minutes))}
                />
              </View>
            </View>
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default TimePickerModal;
