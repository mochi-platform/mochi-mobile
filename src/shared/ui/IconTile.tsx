import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";
import { TINTS, type Tint } from "@/src/shared/theme/tokens";

type IconTileProps = {
  icon: keyof typeof Ionicons.glyphMap;
  tint: Tint;
  size?: number;
};

/** Cuadro redondeado con el icono de un módulo: el único lugar donde va el color del módulo. */
export function IconTile({ icon, tint, size = 40 }: IconTileProps) {
  const { bgClass, ink } = TINTS[tint];
  return (
    <View
      className={`items-center justify-center rounded-tile ${bgClass}`}
      style={{ width: size, height: size }}
    >
      <Ionicons name={icon} size={Math.round(size / 2)} color={ink} />
    </View>
  );
}
