import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import TimePickerModal from "@/src/shared/components/TimePickerModal";
import { useCustomAlert } from "@/src/shared/components/CustomAlert";
import { useSession } from "@/src/core/providers/SessionContext";
import { supabase } from "@/src/shared/lib/supabase";

const daysOfWeek = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
];

const colors = [
  { value: "pink", label: "Rosa", hex: "#fce7f3" },
  { value: "blue", label: "Azul", hex: "#dbeafe" },
  { value: "yellow", label: "Amarillo", hex: "#fef3c7" },
  { value: "teal", label: "Teal", hex: "#ccfbf1" },
  { value: "purple", label: "Púrpura", hex: "#e9d5ff" },
  { value: "green", label: "Verde", hex: "#dcfce7" },
];

export function EditStudyBlockScreen() {
  const insets = useSafeAreaInsets();
  const { blockId } = useLocalSearchParams<{ blockId?: string | string[] }>();
  const { session } = useSession();
  const { showAlert, AlertComponent } = useCustomAlert();

  const [subject, setSubject] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:30");
  const [color, setColor] = useState("pink");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const resolvedBlockId = Array.isArray(blockId) ? blockId[0] : blockId;

  const loadBlock = useCallback(async () => {
    const userId = session?.user.id;

    if (!userId || !resolvedBlockId) {
      setError("No se encontró el bloque para editar");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("study_blocks")
        .select("subject, day_of_week, start_time, end_time, color")
        .eq("id", resolvedBlockId)
        .eq("user_id", userId)
        .single();

      if (fetchError) throw fetchError;

      setSubject(data.subject);
      setDayOfWeek(data.day_of_week);
      setStartTime(data.start_time);
      setEndTime(data.end_time);
      setColor(data.color);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo cargar el bloque",
      );
    } finally {
      setLoading(false);
    }
  }, [resolvedBlockId, session?.user.id]);

  useFocusEffect(
    useCallback(() => {
      void loadBlock();
    }, [loadBlock]),
  );

  const handleSave = async () => {
    const userId = session?.user.id;

    if (!userId || !resolvedBlockId) {
      showAlert({
        title: "Error",
        message: "No se encontró el bloque para actualizar",
        buttons: [{ text: "Aceptar", style: "cancel" }],
      });
      return;
    }

    if (!subject.trim()) {
      showAlert({
        title: "Error",
        message: "Por favor ingresa la materia",
        buttons: [{ text: "Aceptar", style: "cancel" }],
      });
      return;
    }

    try {
      setSaving(true);

      const { error: updateError } = await supabase
        .from("study_blocks")
        .update({
          subject: subject.trim(),
          day_of_week: dayOfWeek,
          start_time: startTime,
          end_time: endTime,
          color,
        })
        .eq("id", resolvedBlockId)
        .eq("user_id", userId);

      if (updateError) throw updateError;

      showAlert({
        title: "Bloque actualizado",
        message: "Tus cambios se guardaron correctamente.",
        buttons: [
          {
            text: "Aceptar",
            onPress: () => router.back(),
          },
        ],
      });
    } catch (err) {
      showAlert({
        title: "Error",
        message:
          err instanceof Error
            ? err.message
            : "No se pudo actualizar el bloque",
        buttons: [{ text: "Entendido", style: "destructive" }],
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <SafeAreaView className="flex-1 bg-purple-100">
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            className="flex-1 bg-purple-100"
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          >
            <View className="px-5 py-6">
              <TouchableOpacity
                onPress={() => router.back()}
                className="mb-4 flex-row items-center"
              >
                <Ionicons name="chevron-back" size={24} color="#7c3aed" />
                <Text className="ml-2 text-lg font-bold text-purple-700">
                  Volver
                </Text>
              </TouchableOpacity>

              <Text className="text-3xl font-extrabold text-purple-900">
                Editar bloque de estudio
              </Text>
              <Text className="mt-1 text-sm font-semibold text-purple-600">
                Ajusta materia, horario y color para tu semana
              </Text>

              {loading ? (
                <View className="mt-10 items-center">
                  <ActivityIndicator size="small" color="#7c3aed" />
                  <Text className="mt-3 text-sm font-semibold text-purple-700">
                    Cargando bloque...
                  </Text>
                </View>
              ) : error ? (
                <View className="mt-6 rounded-3xl border-2 border-red-200 bg-red-50 p-4">
                  <Text className="text-sm font-semibold text-red-700">
                    {error}
                  </Text>
                  <TouchableOpacity
                    className="mt-4 rounded-2xl bg-purple-600 py-3"
                    onPress={() => void loadBlock()}
                  >
                    <Text className="text-center font-bold text-white">
                      Reintentar
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <View className="mt-6 rounded-3xl border-2 border-purple-200 bg-white p-4">
                    <Text className="text-sm font-bold text-purple-900">
                      Materia
                    </Text>
                    <TextInput
                      className="mt-2 rounded-2xl border border-purple-200 bg-purple-50 px-4 py-3 text-base text-purple-900"
                      placeholder="Ejemplo: Matemáticas"
                      placeholderTextColor="#c4b5fd"
                      value={subject}
                      onChangeText={setSubject}
                      editable={!saving}
                    />
                  </View>

                  <View className="mt-4 rounded-3xl border-2 border-purple-200 bg-white p-4">
                    <Text className="text-sm font-bold text-purple-900">
                      Día de la semana
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      className="mt-3 -mx-2"
                    >
                      {daysOfWeek.map((day) => (
                        <TouchableOpacity
                          key={day.value}
                          className={`mx-2 rounded-2xl px-4 py-2 ${dayOfWeek === day.value ? "bg-purple-600" : "bg-purple-100"}`}
                          onPress={() => setDayOfWeek(day.value)}
                        >
                          <Text
                            className={`font-bold ${dayOfWeek === day.value ? "text-white" : "text-purple-700"}`}
                          >
                            {day.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  <View className="mt-4 rounded-3xl border-2 border-purple-200 bg-white p-4">
                    <Text className="text-sm font-bold text-purple-900">
                      Horario
                    </Text>

                    <View className="mt-3 flex-row gap-3">
                      <View className="flex-1">
                        <Text className="text-xs font-semibold text-purple-600">
                          Inicio
                        </Text>
                        <TouchableOpacity
                          className="mt-2 rounded-2xl border-2 border-purple-200 bg-purple-50 px-4 py-3"
                          onPress={() => setShowStartPicker(true)}
                          disabled={saving}
                        >
                          <Text className="text-center text-lg font-extrabold text-purple-900">
                            {startTime}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      <View className="items-center justify-center">
                        <Ionicons
                          name="arrow-forward"
                          size={20}
                          color="#a855f7"
                        />
                      </View>

                      <View className="flex-1">
                        <Text className="text-xs font-semibold text-purple-600">
                          Fin
                        </Text>
                        <TouchableOpacity
                          className="mt-2 rounded-2xl border-2 border-purple-200 bg-purple-50 px-4 py-3"
                          onPress={() => setShowEndPicker(true)}
                          disabled={saving}
                        >
                          <Text className="text-center text-lg font-extrabold text-purple-900">
                            {endTime}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  <View className="mt-4 rounded-3xl border-2 border-purple-200 bg-white p-4">
                    <Text className="text-sm font-bold text-purple-900">
                      Color
                    </Text>
                    <View className="mt-3 flex-row flex-wrap gap-2">
                      {colors.map((col) => (
                        <TouchableOpacity
                          key={col.value}
                          className={`flex-1 min-w-[28%] rounded-2xl border-4 py-3 ${color === col.value ? "border-purple-700" : "border-transparent"}`}
                          style={{ backgroundColor: col.hex }}
                          onPress={() => setColor(col.value)}
                          disabled={saving}
                        >
                          <Text className="text-center text-xs font-bold text-purple-900">
                            {col.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <TouchableOpacity
                    className="mt-8 rounded-2xl bg-purple-600 py-4 disabled:opacity-60"
                    onPress={() => void handleSave()}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Text className="text-center text-lg font-extrabold text-white">
                        Guardar cambios
                      </Text>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>

            <TimePickerModal
              visible={showStartPicker}
              time={startTime}
              label="Hora de inicio"
              onConfirm={(time) => {
                setStartTime(time);
                setShowStartPicker(false);
              }}
              onCancel={() => setShowStartPicker(false)}
            />

            <TimePickerModal
              visible={showEndPicker}
              time={endTime}
              label="Hora de fin"
              onConfirm={(time) => {
                setEndTime(time);
                setShowEndPicker(false);
              }}
              onCancel={() => setShowEndPicker(false)}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
      {AlertComponent}
    </>
  );
}

export default EditStudyBlockScreen;
