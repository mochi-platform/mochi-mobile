import { Text, View } from "react-native";
import { MochiCharacter } from "@/src/shared/components/MochiCharacter";
import { Button } from "@/src/shared/ui/Button";

type EmptyStateProps = {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ title, message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View className="items-center px-6 py-8">
      <MochiCharacter expression="sleepy" size={96} />
      <Text className="mt-4 text-center text-lg font-extrabold text-ink">{title}</Text>
      <Text className="mt-1 text-center text-sm font-semibold text-ink-muted">{message}</Text>
      {actionLabel && onAction ? (
        <View className="mt-4 self-stretch">
          <Button title={actionLabel} onPress={onAction} />
        </View>
      ) : null}
    </View>
  );
}
