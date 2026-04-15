import { Text, View, TouchableOpacity, ScrollView, Modal } from "react-native";
import { useEffect, useState } from "react";
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
  const [hours, setHours] = useState(parseInt(time.split(":")[0]));
  const [minutes, setMinutes] = useState(parseInt(time.split(":")[1]));
  const modalScale = useSharedValue(0.8);
  const modalOpacity = useSharedValue(0);

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

  const hoursArray = Array.from({ length: 24 }, (_, i) => i);
  const minutesArray = Array.from({ length: 60 }, (_, i) => i);

  const handleConfirm = () => {
    const timeString = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
    onConfirm(timeString);
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 items-center justify-center bg-black/40">
        <Animated.View
          style={modalAnimatedStyle}
          className="w-80 rounded-3xl bg-white p-6"
        >
          <Text className="text-lg font-extrabold text-purple-900">
            {label}
          </Text>

          <View className="mt-6 flex-row justify-center gap-4">
            {/* Horas */}
            <View className="flex-1">
              <Text className="mb-2 text-xs font-bold text-purple-700">
                Hora
              </Text>
              <ScrollView
                className="h-32 rounded-2xl border-2 border-purple-200 bg-purple-50"
                scrollIndicatorInsets={{ right: 1 }}
              >
                {hoursArray.map((h) => (
                  <TouchableOpacity
                    key={h}
                    className={`items-center py-3 ${hours === h ? "bg-purple-200" : ""}`}
                    onPress={() => setHours(h)}
                  >
                    <Text
                      className={`text-lg font-bold ${hours === h ? "text-purple-900" : "text-purple-500"}`}
                    >
                      {String(h).padStart(2, "0")}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View className="items-center justify-center">
              <Text className="text-2xl font-bold text-purple-700">:</Text>
            </View>

            {/* Minutos */}
            <View className="flex-1">
              <Text className="mb-2 text-xs font-bold text-purple-700">
                Minuto
              </Text>
              <ScrollView
                className="h-32 rounded-2xl border-2 border-purple-200 bg-purple-50"
                scrollIndicatorInsets={{ right: 1 }}
              >
                {minutesArray.map((m) => (
                  <TouchableOpacity
                    key={m}
                    className={`items-center py-3 ${minutes === m ? "bg-purple-200" : ""}`}
                    onPress={() => setMinutes(m)}
                  >
                    <Text
                      className={`text-lg font-bold ${minutes === m ? "text-purple-900" : "text-purple-500"}`}
                    >
                      {String(m).padStart(2, "0")}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          {/* Buttons */}
          <View className="mt-6 flex-row gap-3">
            <TouchableOpacity
              className="flex-1 items-center rounded-2xl border-2 border-purple-200 bg-white py-3"
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
