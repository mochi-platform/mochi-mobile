import { Text, View, TouchableOpacity, ScrollView, Modal } from "react-native";
import { useEffect, useMemo, useState } from "react";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

type TimePickerModalProps = {
  visible: boolean;
  time: string; // HH:MM format
  onConfirm: (time: string) => void;
  onCancel: () => void;
  label: string;
};

export function TimePickerModal({
  visible,
  time,
  onConfirm,
  onCancel,
  label,
}: TimePickerModalProps) {
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const modalScale = useSharedValue(0.8);
  const modalOpacity = useSharedValue(0);

  useEffect(() => {
    if (!visible) return;

    const [hoursRaw = "0", minutesRaw = "0"] = time.split(":");
    const nextHours = Number.parseInt(hoursRaw, 10);
    const nextMinutes = Number.parseInt(minutesRaw, 10);

    setHours(Number.isFinite(nextHours) ? Math.max(0, Math.min(23, nextHours)) : 0);
    setMinutes(
      Number.isFinite(nextMinutes) ? Math.max(0, Math.min(59, nextMinutes)) : 0,
    );
  }, [time, visible]);

  useEffect(() => {
    if (visible) {
      modalScale.value = 0.8;
      modalOpacity.value = 0;
      modalScale.value = withSpring(1, { damping: 14, stiffness: 180 });
      modalOpacity.value = withTiming(1, { duration: 220 });
      return;
    }

    modalOpacity.value = withTiming(0, { duration: 120 });
  }, [visible, modalOpacity, modalScale]);

  const modalAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: modalOpacity.value,
      transform: [{ scale: modalScale.value }],
    };
  });

  const hoursArray = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);
  const minutesArray = useMemo(
    () => Array.from({ length: 60 }, (_, i) => i),
    [],
  );

  const selectedTime = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;

  const handleConfirm = () => {
    onConfirm(selectedTime);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View className="flex-1 items-center justify-center bg-black/45 px-4 py-8">
        <Animated.View
          style={modalAnimatedStyle}
          className="w-full max-w-md rounded-[28px] bg-white px-5 py-5"
        >
          <View className="mb-4">
            <Text className="text-lg font-extrabold text-purple-900">
              {label}
            </Text>
            <Text className="mt-1 text-sm font-medium text-slate-500">
              Selecciona una hora concreta sin pelearte con el espacio.
            </Text>
          </View>

          <View className="mb-4 rounded-2xl bg-purple-50 px-4 py-3">
            <Text className="text-xs font-bold uppercase tracking-[0.2em] text-purple-500">
              Hora seleccionada
            </Text>
            <Text className="mt-1 text-3xl font-extrabold text-purple-900">
              {selectedTime}
            </Text>
          </View>

          <View className="gap-4">
            <View>
              <Text className="mb-2 text-sm font-bold text-purple-800">
                Hora
              </Text>
              <ScrollView
                className="max-h-52 rounded-2xl border border-purple-200 bg-purple-50"
                showsVerticalScrollIndicator={false}
              >
                <View className="flex-row flex-wrap gap-2 p-3">
                  {hoursArray.map((h) => {
                    const isSelected = hours === h;

                    return (
                      <TouchableOpacity
                        key={h}
                        className={`h-11 w-[22%] items-center justify-center rounded-2xl border ${isSelected ? "border-purple-600 bg-purple-600" : "border-transparent bg-white"}`}
                        onPress={() => setHours(h)}
                        accessibilityRole="button"
                        accessibilityLabel={`Seleccionar hora ${String(h).padStart(2, "0")}`}
                      >
                        <Text
                          className={`text-base font-extrabold ${isSelected ? "text-white" : "text-purple-700"}`}
                        >
                          {String(h).padStart(2, "0")}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </View>

            <View>
              <Text className="mb-2 text-sm font-bold text-purple-800">
                Minuto
              </Text>
              <ScrollView
                className="max-h-64 rounded-2xl border border-purple-200 bg-purple-50"
                showsVerticalScrollIndicator={false}
              >
                <View className="flex-row flex-wrap gap-2 p-3">
                  {minutesArray.map((m) => {
                    const isSelected = minutes === m;

                    return (
                      <TouchableOpacity
                        key={m}
                        className={`h-10 w-[15%] items-center justify-center rounded-2xl border ${isSelected ? "border-purple-600 bg-purple-600" : "border-transparent bg-white"}`}
                        onPress={() => setMinutes(m)}
                        accessibilityRole="button"
                        accessibilityLabel={`Seleccionar minuto ${String(m).padStart(2, "0")}`}
                      >
                        <Text
                          className={`text-xs font-extrabold ${isSelected ? "text-white" : "text-purple-700"}`}
                        >
                          {String(m).padStart(2, "0")}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          </View>

          <View className="mt-5 flex-row gap-3">
            <TouchableOpacity
              className="flex-1 items-center rounded-2xl border border-purple-200 bg-white py-3"
              onPress={onCancel}
            >
              <Text className="font-bold text-purple-700">Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-1 items-center rounded-2xl bg-purple-600 py-3"
              onPress={handleConfirm}
            >
              <Text className="font-bold text-white">Confirmar</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

export default TimePickerModal;
