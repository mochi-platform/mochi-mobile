import { Text, View } from "react-native";
import { COLORS } from "@/src/shared/theme/tokens";
import { ELEVATION } from "./elevation";
import { PressableScale } from "./PressableScale";

type SegmentedProps<T extends string> = {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
};

/** Selector de dos o tres opciones: la elegida es una píldora blanca sobre el carril. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className = "",
}: SegmentedProps<T>) {
  return (
    <View
      className={`flex-row rounded-control bg-surface-muted p-1 ${className}`}
      accessibilityRole="tablist"
    >
      {options.map((option) => {
        const on = option.value === value;
        return (
          <PressableScale
            key={option.value}
            haptics="selection"
            onPress={() => onChange(option.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            className="flex-1 items-center justify-center rounded-[14px] py-2.5"
            // Fondo siempre opaco: en Android una vista que empieza transparente pierde el radio.
            style={[
              on ? ELEVATION[1] : null,
              { backgroundColor: on ? COLORS.surface : COLORS.surfaceMuted },
            ]}
          >
            <Text
              className="text-center font-body-extrabold text-sm"
              style={{ color: on ? COLORS.ink : COLORS.inkMuted }}
            >
              {option.label}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}
