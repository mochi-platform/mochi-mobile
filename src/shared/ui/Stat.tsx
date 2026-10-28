import { Text, View } from "react-native";
import { Caption } from "./Typography";

type StatProps = { value: string; label: string; className?: string };

/** Cifra grande con su etiqueta ("6 · días de racha"). */
export function Stat({ value, label, className = "" }: StatProps) {
  return (
    <View className={className} accessible accessibilityLabel={`${value} ${label}`}>
      <Text className="font-display text-[26px] leading-[30px] text-ink">{value}</Text>
      <Caption>{label}</Caption>
    </View>
  );
}
