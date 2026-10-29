import { Ionicons } from "@expo/vector-icons";
import { ScrollView, Text, View } from "react-native";
import { COLORS } from "@/src/shared/theme/tokens";
import { Caption, Chip, PressableScale } from "@/src/shared/ui";

export const DAYS_OF_WEEK = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
] as const;

/** Colores guardados en study_blocks.color (el valor no cambia; solo cómo se ve). */
export const BLOCK_COLORS = [
  { value: "pink", label: "Rosa", hex: "#fce7f3" },
  { value: "blue", label: "Azul", hex: "#dbeafe" },
  { value: "yellow", label: "Amarillo", hex: "#fef3c7" },
  { value: "teal", label: "Turquesa", hex: "#ccfbf1" },
  { value: "purple", label: "Púrpura", hex: "#e9d5ff" },
  { value: "green", label: "Verde", hex: "#dcfce7" },
] as const;

/** Fila de días desplazable que llega al borde de la pantalla. */
export function DayChips({ value, onChange }: { value: number; onChange: (day: number) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-5">
      <View className="flex-row gap-2 px-5 pb-1">
        {DAYS_OF_WEEK.map((day) => (
          <Chip
            key={day.value}
            label={day.label}
            selected={value === day.value}
            onPress={() => onChange(day.value)}
          />
        ))}
      </View>
    </ScrollView>
  );
}

function TimeBox({
  label,
  time,
  onPress,
  disabled,
}: {
  label: string;
  time: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <View className="flex-1">
      <Caption className="mb-1.5 ml-1">{label}</Caption>
      <PressableScale
        haptics="selection"
        onPress={onPress}
        disabled={disabled}
        accessibilityLabel={`${label}: ${time}`}
        className="min-h-[52px] items-center justify-center rounded-control bg-surface-muted"
      >
        <Text className="font-display text-xl text-ink">{time}</Text>
      </PressableScale>
    </View>
  );
}

/** Inicio → fin, cada uno abre el selector de hora. */
export function TimeRange({
  start,
  end,
  onPressStart,
  onPressEnd,
  disabled,
}: {
  start: string;
  end: string;
  onPressStart: () => void;
  onPressEnd: () => void;
  disabled?: boolean;
}) {
  return (
    <View className="flex-row items-end gap-3">
      <TimeBox label="Inicio" time={start} onPress={onPressStart} disabled={disabled} />
      <View className="h-[52px] justify-center">
        <Ionicons name="arrow-forward" size={20} color={COLORS.inkFaint} />
      </View>
      <TimeBox label="Fin" time={end} onPress={onPressEnd} disabled={disabled} />
    </View>
  );
}

/** Círculos de color; el elegido lleva anillo y check. */
export function ColorSwatches({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (color: string) => void;
  disabled?: boolean;
}) {
  return (
    <View className="flex-row flex-wrap gap-3">
      {BLOCK_COLORS.map((col) => {
        const on = value === col.value;
        return (
          <PressableScale
            key={col.value}
            haptics="selection"
            disabled={disabled}
            onPress={() => onChange(col.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={col.label}
            className="h-12 w-12 items-center justify-center rounded-full"
            style={{
              backgroundColor: col.hex,
              borderWidth: 3,
              borderColor: on ? COLORS.accent : col.hex,
            }}
          >
            {on ? <Ionicons name="checkmark" size={20} color={COLORS.accentStrong} /> : null}
          </PressableScale>
        );
      })}
    </View>
  );
}
