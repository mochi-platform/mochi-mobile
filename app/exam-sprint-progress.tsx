import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useSession } from "@/src/core/providers/SessionContext";
import { useExamSprints } from "@/src/shared/hooks/useExamSprints";
import { useExamSprintProgress } from "@/src/shared/hooks/useExamSprintProgress";
import { SprintTracker } from "@/src/shared/components/SprintTracker";
import { MochiCharacter } from "@/src/shared/components/MochiCharacter";

export function ExamSprintProgressScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useSession();
  const params = useLocalSearchParams<{ examId?: string; subject?: string }>();

  const examId = params.examId ?? "";
  const subject = params.subject ?? "Examen";

  const {
    sprints,
    createSprint,
    isLoading: sprintsLoading,
  } = useExamSprints(session?.user.id);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form state
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dailyHours, setDailyHours] = useState("2");
  const [targetGrade, setTargetGrade] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get active sprint for this exam
  const activeSprint = sprints.find(
    (s) =>
      s.exam_id === examId &&
      new Date(s.start_date) <= new Date() &&
      new Date(s.end_date) >= new Date(),
  );

  const handleCreateSprint = async () => {
    if (!startDate || !endDate || !dailyHours) {
      setError("Por favor completa todos los campos");
      return;
    }

    if (new Date(startDate) >= new Date(endDate)) {
      setError("La fecha de inicio debe ser anterior a la de fin");
      return;
    }

    try {
      setCreating(true);
      setError(null);

      const targetGradeNum = targetGrade ? parseFloat(targetGrade) : null;

      await createSprint(
        examId,
        startDate,
        endDate,
        parseFloat(dailyHours),
        targetGradeNum,
      );

      setStartDate("");
      setEndDate("");
      setDailyHours("2");
      setTargetGrade("");
      setShowCreateModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear sprint");
    } finally {
      setCreating(false);
    }
  };

  return (
    <SafeAreaView
      className="flex-1 bg-green-50"
      edges={["left", "right", "bottom"]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          className="flex-1 px-4"
          contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View className="mb-6 mt-4">
            <Pressable
              onPress={() => router.back()}
              className="mb-4 active:opacity-70"
            >
              <Text className="text-base font-semibold text-green-700">
                ← Volver
              </Text>
            </Pressable>

            <View>
              <Text className="text-3xl font-bold text-green-900 mb-1">
                {subject}
              </Text>
              <Text className="text-sm text-green-600">
                Centro de preparación con sprints
              </Text>
            </View>
          </View>

          {/* Active Sprint or Empty State */}
          {sprintsLoading ? (
            <View className="items-center py-12">
              <ActivityIndicator size="large" color="#059669" />
              <Text className="mt-4 text-gray-600 font-semibold">
                Cargando sprints...
              </Text>
            </View>
          ) : activeSprint ? (
            <>
              <Text className="mb-3 text-lg font-bold text-green-900">
                Tu Sprint Actual
              </Text>
              <SprintTracker sprint={activeSprint} />

              <View className="mt-6 bg-blue-50 rounded-xl p-4 border border-blue-200">
                <Text className="text-sm text-blue-900">
                  <Text className="font-bold">Consejo:</Text> Mantén
                  consistencia diaria para una preparación efectiva. ¡Tú puedes!
                </Text>
              </View>
            </>
          ) : (
            <View className="items-center py-12">
              <MochiCharacter mood="happy" size={100} />
              <Text className="mt-6 text-center text-lg font-bold text-green-900">
                No hay sprint activo
              </Text>
              <Text className="mt-2 text-center text-sm text-green-600">
                Crea un plan de estudio estructurado para este examen
              </Text>

              <Pressable
                onPress={() => setShowCreateModal(true)}
                className="mt-8 bg-green-500 rounded-xl px-6 py-3 active:opacity-70"
              >
                <Text className="font-bold text-white text-center">
                  Crear Sprint
                </Text>
              </Pressable>
            </View>
          )}

          {/* Past Sprints */}
          {sprints.length > 1 && (
            <>
              <Text className="mt-8 mb-3 text-lg font-bold text-green-900">
                Sprints Anteriores
              </Text>
              {sprints
                .filter((s) => s.exam_id === examId && s !== activeSprint)
                .map((sprint) => (
                  <View
                    key={sprint.id}
                    className="mb-3 p-3 rounded-lg bg-white border border-green-100"
                  >
                    <Text className="font-semibold text-gray-800">
                      {new Date(sprint.start_date).toLocaleDateString("es-MX")}{" "}
                      al {new Date(sprint.end_date).toLocaleDateString("es-MX")}
                    </Text>
                    <Text className="text-xs text-gray-600 mt-1">
                      {sprint.daily_target_hours}h diarias
                    </Text>
                  </View>
                ))}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Create Sprint Modal */}
      <Modal visible={showCreateModal} transparent animationType="slide">
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-white rounded-t-3xl p-4 max-h-96">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="font-bold text-lg text-gray-800">
                Crear Sprint
              </Text>
              <Pressable
                onPress={() => setShowCreateModal(false)}
                className="rounded-full p-2 active:bg-gray-100"
              >
                <Text className="text-2xl text-gray-600">✕</Text>
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {error && (
                <View className="mb-4 p-3 bg-red-100 rounded-lg border border-red-300">
                  <Text className="text-sm text-red-800">{error}</Text>
                </View>
              )}

              <View className="mb-4">
                <Text className="mb-2 text-sm font-semibold text-gray-800">
                  Fecha de inicio (AAAA-MM-DD)
                </Text>
                <TextInput
                  placeholder="2026-03-29"
                  value={startDate}
                  onChangeText={setStartDate}
                  className="border border-green-300 rounded-lg p-3 text-gray-800"
                  placeholderTextColor="#999"
                />
              </View>

              <View className="mb-4">
                <Text className="mb-2 text-sm font-semibold text-gray-800">
                  Fecha de fin (AAAA-MM-DD)
                </Text>
                <TextInput
                  placeholder="2026-04-10"
                  value={endDate}
                  onChangeText={setEndDate}
                  className="border border-green-300 rounded-lg p-3 text-gray-800"
                  placeholderTextColor="#999"
                />
              </View>

              <View className="mb-4">
                <Text className="mb-2 text-sm font-semibold text-gray-800">
                  Horas de estudio por día
                </Text>
                <TextInput
                  placeholder="2"
                  value={dailyHours}
                  onChangeText={setDailyHours}
                  keyboardType="decimal-pad"
                  className="border border-green-300 rounded-lg p-3 text-gray-800"
                  placeholderTextColor="#999"
                />
              </View>

              <View className="mb-6">
                <Text className="mb-2 text-sm font-semibold text-gray-800">
                  Meta de calificación (opcional)
                </Text>
                <TextInput
                  placeholder="9.0"
                  value={targetGrade}
                  onChangeText={setTargetGrade}
                  keyboardType="decimal-pad"
                  className="border border-green-300 rounded-lg p-3 text-gray-800"
                  placeholderTextColor="#999"
                />
              </View>

              <Pressable
                onPress={handleCreateSprint}
                disabled={creating}
                className={`rounded-lg py-3 ${
                  creating ? "bg-green-300" : "bg-green-500"
                }`}
              >
                {creating ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text className="text-center font-bold text-white">
                    Crear Sprint
                  </Text>
                )}
              </Pressable>

              <Pressable
                onPress={() => setShowCreateModal(false)}
                className="mt-2 rounded-lg py-3 bg-gray-200"
              >
                <Text className="text-center font-semibold text-gray-800">
                  Cancelar
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

export default ExamSprintProgressScreen;
