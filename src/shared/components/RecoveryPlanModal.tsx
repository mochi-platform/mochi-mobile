import { Modal, ScrollView, Text, View } from "react-native";
import type { StreakRecoveryPlan } from "@mochi/supabase/types";
import { MochiCharacter } from "@/src/shared/components/MochiCharacter";
import { Button, Caption, ELEVATION, MochiQuote, Strong, Title } from "@/src/shared/ui";

interface RecoveryPlanModalProps {
  visible: boolean;
  plan: StreakRecoveryPlan | null;
  onStart: () => void;
  onDismiss: () => void;
}

const DIFFICULTY: Record<string, string> = { easy: "Fácil", medium: "Media", hard: "Difícil" };

/** Cuando la racha se pausa: Mochi propone 3 días suaves para retomarla, sin culpa. */
export function RecoveryPlanModal({ visible, plan, onStart, onDismiss }: RecoveryPlanModalProps) {
  if (!plan) return null;

  return (
    <Modal statusBarTranslucent visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View className="flex-1 items-center justify-center bg-ink/30 px-6">
        <View
          accessibilityViewIsModal
          className="w-full max-w-sm rounded-[28px] bg-canvas p-6"
          style={ELEVATION[3]}
        >
          <View className="items-center">
            <MochiCharacter expression="soft_sad" size={96} animated={false} />
            <Title className="mt-1 text-center">Tu racha se pausó</Title>
            <MochiQuote className="mt-1 text-center text-[16px] leading-[21px] text-ink-muted">
              Pasa. Te armé tres días suaves para retomarla juntas.
            </MochiQuote>
          </View>

          <ScrollView className="my-4 max-h-64">
            <View className="gap-2">
              {plan.recovery_tasks.map((task, index) => (
                <View
                  key={index}
                  className="flex-row items-start gap-3 rounded-[18px] bg-surface p-3"
                  style={ELEVATION[1]}
                >
                  <View className="h-8 w-8 items-center justify-center rounded-full bg-accent">
                    <Text className="font-display text-sm text-accent-ink">{task.day}</Text>
                  </View>
                  <View className="flex-1">
                    <Strong>{task.description}</Strong>
                    <Caption>{DIFFICULTY[task.difficulty] ?? task.difficulty}</Caption>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>

          <View className="flex-row gap-2">
            <View className="flex-1">
              <Button title="Ahora no" variant="outline" onPress={onDismiss} />
            </View>
            <View className="flex-1">
              <Button title="Empezar" onPress={onStart} />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
