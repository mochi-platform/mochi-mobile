import { Text, View, TouchableOpacity, Modal, FlatList } from "react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

type TimePickerModalProps = {
  visible: boolean;
  time: string;
  onConfirm: (time: string) => void;
  onCancel: () => void;
  label: string;
};

const ITEM_HEIGHT = 36;
const VISIBLE_ITEMS = 3;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

function ColumnPicker({
  data,
  value,
  onChange,
}: {
  data: number[];
  value: number;
  onChange: (v: number) => void;
}) {
  const ref = useRef<FlatList>(null);

  useEffect(() => {
    const index = data.indexOf(value);
    if (index >= 0) {
      setTimeout(() => {
        ref.current?.scrollToOffset({
          offset: index * ITEM_HEIGHT,
          animated: true,
        });
      }, 80);
    }
  }, [value]);

  return (
    <View
      style={{
        height: PICKER_HEIGHT,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: "#e5d4ff",
        backgroundColor: "#faf5ff",
        overflow: "hidden",
      }}
    >
      <FlatList
        ref={ref}
        data={data}
        keyExtractor={(i) => i.toString()}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        getItemLayout={(_, index) => ({
          length: ITEM_HEIGHT,
          offset: ITEM_HEIGHT * index,
          index,
        })}
        contentContainerStyle={{
          paddingVertical: ITEM_HEIGHT,
        }}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(
            e.nativeEvent.contentOffset.y / ITEM_HEIGHT,
          );
          const clamped = Math.max(0, Math.min(data.length - 1, index));
          onChange(data[clamped]);
        }}
        renderItem={({ item }) => {
          const selected = item === value;

          return (
            <View
              style={{
                height: ITEM_HEIGHT,
                justifyContent: "center",
                alignItems: "center",
                paddingHorizontal: 8,
              }}
            >
              <Text
                style={{
                  fontSize: selected ? 17 : 15,
                  fontWeight: "700",
                  color: selected ? "#6d28d9" : "#a78bfa",
                }}
                numberOfLines={1}
              >
                {String(item).padStart(2, "0")}
              </Text>
            </View>
          );
        }}
      />

      {/* highlight center */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: ITEM_HEIGHT,
          left: 0,
          right: 0,
          height: ITEM_HEIGHT,
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: "#a855f7",
          opacity: 0.25,
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
}: TimePickerModalProps) {
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);

  const scale = useSharedValue(0.9);
  const opacity = useSharedValue(0);

  const hoursArray = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);
  const minutesArray = useMemo(() => Array.from({ length: 60 }, (_, i) => i), []);

  useEffect(() => {
    if (!visible) return;

    const [h, m] = time.split(":");
    setHours(Number(h) || 0);
    setMinutes(Number(m) || 0);
  }, [time, visible]);

  useEffect(() => {
    if (visible) {
      scale.value = 0.92;
      opacity.value = 0;

      scale.value = withSpring(1, { damping: 14 });
      opacity.value = withTiming(1, { duration: 160 });
    } else {
      opacity.value = withTiming(0, { duration: 120 });
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const selectedTime = `${String(hours).padStart(2, "0")}:${String(
    minutes,
  ).padStart(2, "0")}`;

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View className="flex-1 items-center justify-center bg-black/40 px-6">
        <Animated.View
          style={animatedStyle}
          className="w-full max-w-xs rounded-2xl bg-white p-4"
        >
          {/* header */}
          <Text className="text-base font-bold text-purple-900">
            {label}
          </Text>

          <Text className="mb-3 text-sm text-slate-400">
            {selectedTime}
          </Text>

          {/* pickers */}
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Text className="mb-1.5 text-center text-xs font-bold text-purple-600">
                Hora
              </Text>

              <ColumnPicker
                data={hoursArray}
                value={hours}
                onChange={setHours}
              />
            </View>

            <View className="flex-1">
              <Text className="mb-1.5 text-center text-xs font-bold text-purple-600">
                Min
              </Text>

              <ColumnPicker
                data={minutesArray.filter((m) => m % 5 === 0)}
                value={minutes}
                onChange={setMinutes}
              />
            </View>
          </View>

          {/* actions */}
          <View className="mt-4 flex-row gap-2">
            <TouchableOpacity
              onPress={onCancel}
              className="flex-1 rounded-xl border border-purple-200 py-2.5"
            >
              <Text className="text-center text-sm font-bold text-purple-700">
                Cancelar
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => onConfirm(selectedTime)}
              className="flex-1 rounded-xl bg-purple-600 py-2.5"
            >
              <Text className="text-center text-sm font-bold text-white">
                Confirmar
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

export default TimePickerModal;