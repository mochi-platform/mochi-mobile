import { Text, View } from "react-native";
import { PressableScale } from "./PressableScale";
import { Title } from "./Typography";

type SectionHeaderProps = {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
};

/** Título de sección con acción opcional a la derecha ("Ver todo", "Editar"). */
export function SectionHeader({
  title,
  actionLabel,
  onAction,
  className = "",
}: SectionHeaderProps) {
  return (
    <View className={`mb-2.5 mt-6 flex-row items-baseline justify-between px-1 ${className}`}>
      <Title>{title}</Title>
      {actionLabel && onAction ? (
        <PressableScale
          haptics="selection"
          onPress={onAction}
          hitSlop={10}
          accessibilityLabel={actionLabel}
        >
          <Text className="font-body-extrabold text-sm text-accent-strong">{actionLabel}</Text>
        </PressableScale>
      ) : null}
    </View>
  );
}
