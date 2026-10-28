import { Ionicons } from "@expo/vector-icons";
import { Children, Fragment, isValidElement, type ReactNode } from "react";
import { View } from "react-native";
import { COLORS } from "@/src/shared/theme/tokens";
import { PressableScale } from "./PressableScale";
import { Surface } from "./Surface";
import { Caption, Strong } from "./Typography";

type ListGroupProps = { children: ReactNode; className?: string };

/** Grupo de filas en una sola tarjeta, con separadores finos alineados al texto (no al icono). */
export function ListGroup({ children, className = "" }: ListGroupProps) {
  const rows = Children.toArray(children).filter(isValidElement);
  return (
    <Surface className={`py-1 ${className}`}>
      {rows.map((row, index) => (
        <Fragment key={row.key ?? index}>
          {index > 0 ? <View className="ml-[70px] mr-4 h-px bg-line" /> : null}
          {row}
        </Fragment>
      ))}
    </Surface>
  );
}

type ListRowProps = {
  title: string;
  subtitle?: string;
  /** Elemento a la izquierda: normalmente un IconTile, una carita o un check. */
  leading?: ReactNode;
  /** Elemento a la derecha: valor, botón, anillo. Si hay onPress y no hay trailing, va un chevron. */
  trailing?: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  /** Permite que el título ocupe varias líneas (diario, notas). */
  multiline?: boolean;
};

export function ListRow({
  title,
  subtitle,
  leading,
  trailing,
  onPress,
  accessibilityLabel,
  multiline = false,
}: ListRowProps) {
  const content = (
    <View className="min-h-[60px] flex-row items-center gap-3.5 px-4 py-3">
      {leading}
      <View className="min-w-0 flex-1">
        <Strong numberOfLines={multiline ? undefined : 1}>{title}</Strong>
        {subtitle ? (
          <Caption className="mt-0.5" numberOfLines={multiline ? undefined : 2}>
            {subtitle}
          </Caption>
        ) : null}
      </View>
      {trailing ??
        (onPress ? <Ionicons name="chevron-forward" size={18} color={COLORS.inkFaint} /> : null)}
    </View>
  );
  if (!onPress) return content;
  return (
    <PressableScale
      scaleTo={0.98}
      haptics="selection"
      onPress={onPress}
      accessibilityLabel={accessibilityLabel ?? (subtitle ? `${title}. ${subtitle}` : title)}
    >
      {content}
    </PressableScale>
  );
}
