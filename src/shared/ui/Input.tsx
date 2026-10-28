import { Text, TextInput, View, type TextInputProps } from "react-native";
import { COLORS } from "@/src/shared/theme/tokens";

type InputProps = TextInputProps & { label: string; error?: string | null };

export function Input({ label, error, ...rest }: InputProps) {
  return (
    <View className="mb-3">
      <Text className="mb-1.5 ml-1 font-body-bold text-sm text-ink">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={COLORS.inkFaint}
        className={`min-h-[52px] rounded-control border-2 bg-surface-muted px-4 font-body text-base text-ink ${error ? "border-danger" : "border-transparent"}`}
        {...rest}
      />
      {error ? <Text className="ml-1 mt-1 font-body-bold text-xs text-danger">{error}</Text> : null}
    </View>
  );
}
