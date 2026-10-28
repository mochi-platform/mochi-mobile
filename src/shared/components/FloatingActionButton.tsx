import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TAB_BAR_HEIGHT, TAB_BAR_MARGIN_BOTTOM } from "@/src/shared/lib/layout";
import { COLORS } from "@/src/shared/theme/tokens";
import { ACCENT_GLOW } from "@/src/shared/ui/elevation";
import { PressableScale } from "@/src/shared/ui/PressableScale";

type FloatingActionButtonProps = {
  onPress: () => void;
  /** Ya no cambia el color (un solo acento en toda la app); se conserva por compatibilidad. */
  containerClassName?: string;
  borderClassName?: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  showSparkles?: boolean;
  accessibilityLabel: string;
  /** Desplazamiento extra hacia arriba (para apilar dos botones). */
  bottomOffset?: number;
};

/** Botón flotante con el acento, siempre por encima de la barra inferior flotante. */
export function FloatingActionButton({
  onPress,
  iconName = "add",
  showSparkles = false,
  accessibilityLabel,
  bottomOffset = 0,
}: FloatingActionButtonProps) {
  const insets = useSafeAreaInsets();
  return (
    <PressableScale
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      className="absolute right-5 z-20 h-14 w-14 items-center justify-center rounded-[20px] bg-accent"
      style={[ACCENT_GLOW, { bottom: insets.bottom + TAB_BAR_MARGIN_BOTTOM + TAB_BAR_HEIGHT + 14 + bottomOffset }]}
    >
      <Ionicons name={showSparkles ? "sparkles" : iconName} size={showSparkles ? 22 : 26} color={COLORS.accentInk} />
    </PressableScale>
  );
}
