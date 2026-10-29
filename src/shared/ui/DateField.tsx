import { Ionicons } from "@expo/vector-icons";
import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { Text, View } from "react-native";
import { toLocalISODate } from "@/src/shared/lib/dates";
import { COLORS } from "@/src/shared/theme/tokens";
import { PressableScale } from "./PressableScale";

type DateFieldProps = {
  label: string;
  /** Fecha en formato AAAA-MM-DD, o "" si aún no hay. */
  value: string;
  onChange: (iso: string) => void;
  /** Fecha mínima en AAAA-MM-DD. */
  minimum?: string;
  placeholder?: string;
};

function parseISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Campo que abre el calendario del sistema; nada de escribir fechas a mano. */
export function DateField({
  label,
  value,
  onChange,
  minimum,
  placeholder = "Elegir fecha",
}: DateFieldProps) {
  const shown = value
    ? new Intl.DateTimeFormat("es-EC", { weekday: "long", day: "numeric", month: "long" }).format(
        parseISO(value),
      )
    : placeholder;
  return (
    <View className="mb-3">
      <Text className="mb-1.5 ml-1 font-body-bold text-sm text-ink">{label}</Text>
      <PressableScale
        haptics="selection"
        accessibilityLabel={`${label}: ${shown}`}
        onPress={() =>
          DateTimePickerAndroid.open({
            value: value ? parseISO(value) : minimum ? parseISO(minimum) : new Date(),
            mode: "date",
            minimumDate: minimum ? parseISO(minimum) : undefined,
            onChange: (event, date) => {
              if (event.type === "set" && date) onChange(toLocalISODate(date));
            },
          })
        }
        className="min-h-[52px] flex-row items-center gap-3 rounded-control bg-surface-muted px-4"
      >
        <Ionicons name="calendar-outline" size={19} color={COLORS.accentStrong} />
        <Text
          className={`flex-1 font-body-bold text-base ${value ? "text-ink" : "text-ink-faint"}`}
        >
          {shown.charAt(0).toUpperCase() + shown.slice(1)}
        </Text>
      </PressableScale>
    </View>
  );
}
