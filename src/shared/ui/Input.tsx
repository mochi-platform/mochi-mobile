import { Text, TextInput, View, type TextInputProps } from "react-native";

type InputProps = TextInputProps & { label: string; error?: string | null };

export function Input({ label, error, ...rest }: InputProps) {
  return (
    <View className="mb-3">
      <Text className="mb-1 text-sm font-bold text-ink">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#9a8bb8"
        className={`min-h-[48px] rounded-control border-2 bg-surface px-4 text-base text-ink ${error ? "border-danger" : "border-line"}`}
        {...rest}
      />
      {error ? <Text className="mt-1 text-xs font-semibold text-danger">{error}</Text> : null}
    </View>
  );
}
