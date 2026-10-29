import { COLORS } from "@/src/shared/theme/tokens";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useSession } from "@/src/core/providers/SessionContext";
import { useExamSprints } from "@/src/shared/hooks/useExamSprints";
import { SprintTracker } from "@/src/shared/components/SprintTracker";
import { MochiCharacter } from "@/src/shared/components/MochiCharacter";

export function ExamSprintProgressScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useSession();
  const params = useLocalSearchParams<{ examId?: string; subject?: string }>();

  const examId = params.examId ?? "";
  const subject = params.subject ?? "Examen";

  const { sprints, createSprint, isLoading: sprintsLoading } = useExamSprints(session?.user.id);
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
  const pastSprints = sprints.filter((s) => s.exam_id === examId && s.id !== activeSprint?.id);

  const handleCreateSprint = async () => {
    if (!startDate || !endDate || !dailyHours) {
      setError("Completa todos los campos para continuar");
      return;
    }

    if (new Date(startDate) >= new Date(endDate)) {
      setError("La fecha de inicio debe ser antes de la fecha de fin");
      return;
    }

    try {
      setCreating(true);
      setError(null);

      const targetGradeNum = targetGrade ? parseFloat(targetGrade) : null;

      await createSprint(examId, startDate, endDate, parseFloat(dailyHours), targetGradeNum);

      setStartDate("");
      setEndDate("");
      setDailyHours("2");
      setTargetGrade("");
      setShowCreateModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el sprint");
    } finally {
      setCreating(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={["left", "right", "bottom"]}>
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
            <TouchableOpacity
              onPress={() => router.back()}
              activeOpacity={0.85}
              className="mb-4 flex-row items-center gap-1"
            >
              <Ionicons name="chevron-back" size={18} color={COLORS.positive} />
              <Text className="text-base font-semibold text-positive">Volver</Text>
            </TouchableOpacity>

            <View>
              <Text className="mb-1 text-3xl font-bold text-positive">{subject}</Text>
              <Text className="text-sm text-positive">Centro de preparación</Text>
            </View>
          </View>

          {/* Active Sprint or Empty State */}
          {sprintsLoading ? (
            <View className="items-center py-12">
              <ActivityIndicator size="large" color={COLORS.positive} />
              <Text className="mt-4 font-semibold text-ink">Cargando sprints...</Text>
            </View>
          ) : activeSprint ? (
            <>
              <Text className="mb-3 text-lg font-bold text-positive">Sprint activo</Text>
              <SprintTracker sprint={activeSprint} />

              <View className="mt-6 rounded-xl bg-surface-muted p-4">
                <Text className="text-sm text-ink">
                  <Text className="font-bold">Consejo:</Text> La constancia diaria es tu mejor
                  herramienta. ¡Adelante!
                </Text>
              </View>
            </>
          ) : (
            <View className="items-center py-12">
              <MochiCharacter mood="happy" size={100} />
              <Text className="mt-6 text-center text-lg font-bold text-positive">
                Sin sprint activo
              </Text>
              <Text className="mt-2 text-center text-sm text-positive">
                Crea un plan de estudio estructurado para este examen
              </Text>

              <TouchableOpacity
                onPress={() => setShowCreateModal(true)}
                activeOpacity={0.85}
                className="mt-8 rounded-xl bg-positive px-6 py-3"
              >
                <Text className="text-center font-bold text-white">Crear sprint</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Past Sprints */}
          {pastSprints.length > 0 && (
            <>
              <Text className="mb-3 mt-8 text-lg font-bold text-positive">Sprints anteriores</Text>
              {pastSprints.map((sprint) => (
                <View key={sprint.id} className="mb-3 rounded-lg bg-surface p-3">
                  <Text className="font-semibold text-ink">
                    {new Date(sprint.start_date).toLocaleDateString("es-MX")} al{" "}
                    {new Date(sprint.end_date).toLocaleDateString("es-MX")}
                  </Text>
                  <Text className="mt-1 text-xs text-ink">
                    {sprint.daily_target_hours}h diarias
                  </Text>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Create Sprint Modal */}
      <Modal statusBarTranslucent visible={showCreateModal} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/40">
          <View className="max-h-96 rounded-t-3xl bg-surface p-4">
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-lg font-bold text-ink">Crear sprint</Text>
              <TouchableOpacity
                onPress={() => setShowCreateModal(false)}
                activeOpacity={0.85}
                className="rounded-full p-2"
              >
                <Ionicons name="close" size={24} color={COLORS.inkMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {error && (
                <View className="mb-4 rounded-lg bg-tint-me p-3">
                  <Text className="text-sm text-danger">{error}</Text>
                </View>
              )}

              <View className="mb-4">
                <Text className="mb-2 text-sm font-semibold text-ink">
                  Fecha de inicio (AAAA-MM-DD)
                </Text>
                <TextInput
                  placeholder="AAAA-MM-DD"
                  value={startDate}
                  onChangeText={setStartDate}
                  className="rounded-lg p-3 text-ink"
                  placeholderTextColor="#999"
                />
              </View>

              <View className="mb-4">
                <Text className="mb-2 text-sm font-semibold text-ink">
                  Fecha de fin (AAAA-MM-DD)
                </Text>
                <TextInput
                  placeholder="AAAA-MM-DD"
                  value={endDate}
                  onChangeText={setEndDate}
                  className="rounded-lg p-3 text-ink"
                  placeholderTextColor="#999"
                />
              </View>

              <View className="mb-4">
                <Text className="mb-2 text-sm font-semibold text-ink">
                  Horas de estudio por día
                </Text>
                <TextInput
                  placeholder="2"
                  value={dailyHours}
                  onChangeText={setDailyHours}
                  keyboardType="decimal-pad"
                  className="rounded-lg p-3 text-ink"
                  placeholderTextColor="#999"
                />
              </View>

              <View className="mb-6">
                <Text className="mb-2 text-sm font-semibold text-ink">
                  Meta de calificación (opcional)
                </Text>
                <TextInput
                  placeholder="9.0"
                  value={targetGrade}
                  onChangeText={setTargetGrade}
                  keyboardType="decimal-pad"
                  className="rounded-lg p-3 text-ink"
                  placeholderTextColor="#999"
                />
              </View>

              <TouchableOpacity
                onPress={() => {
                  void (async () => {
                    await handleCreateSprint();
                  })();
                }}
                disabled={creating}
                activeOpacity={0.85}
                className={`rounded-lg py-3 ${creating ? "bg-tint-ok" : "bg-positive"}`}
              >
                {creating ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text className="text-center font-bold text-white">Crear sprint</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowCreateModal(false)}
                activeOpacity={0.85}
                className="mt-2 rounded-lg bg-surface-muted py-3"
              >
                <Text className="text-center font-semibold text-ink">Cancelar</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

export default ExamSprintProgressScreen;
