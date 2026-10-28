import type { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";
import { Caption, Display } from "@/src/shared/ui/Typography";

type TabHeaderProps = {
  /** Se conservan por compatibilidad; el encabezado del Remaster es solo tipográfico. */
  iconName?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  title: string;
  subtitle: string;
};

/** Encabezado de pantalla: título grande y una línea de contexto, igual que `Screen`. */
export function TabHeader({ title, subtitle }: TabHeaderProps) {
  return (
    <View className="mb-5 mt-1">
      <Display>{title}</Display>
      <Caption className="mt-1">{subtitle}</Caption>
    </View>
  );
}
