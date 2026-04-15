import { Modal, View, Text, Pressable, ScrollView } from "react-native";
import type { StreakRecoveryPlan } from "@mochi/supabase/types";

interface RecoveryPlanModalProps {
  visible: boolean;
  plan: StreakRecoveryPlan | null;
  onStart: () => void;
  onDismiss: () => void;
}

export function RecoveryPlanModal({
  visible,
  plan,
  onStart,
  onDismiss,
}: RecoveryPlanModalProps) {
  if (!plan) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 bg-black/50 items-center justify-center p-4">
        <View className="bg-white rounded-3xl p-6 w-full max-w-sm">
          {/* Header */}
          <View className="mb-4">
            <Text className="text-2xl font-bold text-gray-800 mb-1">
              ¡Tu racha se rompió!
            </Text>
            <Text className="text-sm text-gray-600">
              Pero no te preocupes, aquí está tu plan para recuperarte
            </Text>
          </View>

          {/* Recovery Tasks */}
          <ScrollView className="mb-4 max-h-64">
            {plan.recovery_tasks.map((task, index) => (
              <View
                key={index}
                className="mb-3 p-3 bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl border border-pink-200"
              >
                <View className="flex-row items-start gap-2">
                  <View className="bg-purple-500 rounded-full w-8 h-8 items-center justify-center mt-0.5">
                    <Text className="text-white font-bold text-sm">
                      {task.day}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-gray-800 mb-1">
                      {task.description}
                    </Text>
                    <View className="bg-white rounded-full px-2 py-1 self-start">
                      <Text className="text-xs font-medium text-gray-700">
                        {getDifficultyLabel(task.difficulty)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Info */}
          <View className="bg-yellow-50 rounded-xl p-3 mb-4 border border-yellow-200">
            <Text className="text-xs text-yellow-800">
              <Text className="font-semibold">Pista:</Text> Completa estos 3
              días y tu racha estará de vuelta. Tú puedes, amiga 💪
            </Text>
          </View>

          {/* Actions */}
          <View className="flex-row gap-2">
            <Pressable
              onPress={onDismiss}
              className="flex-1 border-2 border-gray-300 rounded-lg py-3 active:opacity-70"
            >
              <Text className="text-center font-semibold text-gray-800">
                Ahora no
              </Text>
            </Pressable>

            <Pressable
              onPress={onStart}
              className="flex-1 bg-green-500 rounded-lg py-3 active:opacity-70"
            >
              <Text className="text-center font-semibold text-white">
                Empezar
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function getDifficultyLabel(difficulty: string): string {
  const labels: Record<string, string> = {
    easy: "Fácil",
    medium: "Media",
    hard: "Difícil",
  };
  return labels[difficulty] || difficulty;
}
