import { Modal, View, Text, ScrollView, TouchableOpacity } from "react-native";
import type { StreakRecoveryPlan } from "@mochi/supabase/types";

interface RecoveryPlanModalProps {
  visible: boolean;
  plan: StreakRecoveryPlan | null;
  onStart: () => void;
  onDismiss: () => void;
}

export function RecoveryPlanModal({ visible, plan, onStart, onDismiss }: RecoveryPlanModalProps) {
  if (!plan) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 items-center justify-center bg-black/50 p-4">
        <View className="w-full max-w-sm rounded-3xl bg-white p-6 dark:bg-surface">
          {/* Header */}
          <View className="mb-4">
            <Text className="mb-1 text-2xl font-bold text-slate-800 dark:text-slate-200">
              ¡Tu racha se rompió!
            </Text>
            <Text className="text-sm text-slate-600 dark:text-slate-400">
              Pero no te preocupes, aquí está tu plan para recuperarte
            </Text>
          </View>

          {/* Recovery Tasks */}
          <ScrollView className="mb-4 max-h-64">
            {plan.recovery_tasks.map((task, index) => (
              <View
                key={index}
                className="mb-3 rounded-xl border border-pink-200 bg-pink-50 p-3 dark:border-pink-800 dark:bg-pink-950"
              >
                <View className="flex-row items-start gap-2">
                  <View className="mt-0.5 h-8 w-8 items-center justify-center rounded-full bg-purple-500">
                    <Text className="text-sm font-bold text-white">{task.day}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="mb-1 text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {task.description}
                    </Text>
                    <View className="self-start rounded-full bg-white px-2 py-1 dark:bg-surface">
                      <Text className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        {getDifficultyLabel(task.difficulty)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Info */}
          <View className="mb-4 rounded-xl border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-950">
            <Text className="text-xs text-yellow-800 dark:text-yellow-200">
              <Text className="font-semibold">Pista:</Text> Completa estos 3 días y tu racha estará
              de vuelta. ¡Tú puedes, amiga!
            </Text>
          </View>

          {/* Actions */}
          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={onDismiss}
              activeOpacity={0.85}
              className="flex-1 rounded-lg border-2 border-slate-300 py-3 dark:border-slate-700"
            >
              <Text className="text-center font-semibold text-slate-800 dark:text-slate-200">
                Ahora no
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onStart}
              activeOpacity={0.85}
              className="flex-1 rounded-lg bg-green-500 py-3"
            >
              <Text className="text-center font-semibold text-white">Empezar</Text>
            </TouchableOpacity>
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
