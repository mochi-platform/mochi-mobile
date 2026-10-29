import { Text, View } from "react-native";
import { MochiCharacter } from "@/src/shared/components/MochiCharacter";
import { Button } from "@/src/shared/ui/Button";

type ErrorStateProps = { message?: string; onRetry?: () => void };

export function ErrorState({
  message = "Algo salió mal. Intenta de nuevo.",
  onRetry,
}: ErrorStateProps) {
  return (
    <View accessibilityRole="alert" className="items-center px-6 py-8">
      <MochiCharacter expression="worried" size={96} />
      <Text className="mt-4 text-center font-quote text-[17px] leading-[23px] text-ink-muted">
        {message}
      </Text>
      {onRetry ? (
        <View className="mt-4 self-stretch">
          <Button title="Reintentar" variant="soft" onPress={onRetry} />
        </View>
      ) : null}
    </View>
  );
}
