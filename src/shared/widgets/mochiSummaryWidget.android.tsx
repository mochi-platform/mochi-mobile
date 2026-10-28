import { createWidget } from "expo-widgets";
import { Button, Column, Row, Text } from "@expo/ui/jetpack-compose";
import {
  background,
  cornerRadius,
  fillMaxWidth,
  paddingAll,
  weight,
} from "@expo/ui/jetpack-compose/modifiers";
import type { MochiSummaryWidgetProps } from "./widgetProps";

// Colores del Remaster en hex (src/shared/theme/tokens.ts): el widget no lee el tema de la app.
const CANVAS = "#FBF6EF";
const INK = "#3A2A2E";
const MUTED = "#7A6469";
const ACCENT = "#A35C8A";
const ACCENT_SOFT = "#F5E6EF";
const KITCHEN = "#B0602A";

function MochiSummaryWidgetView(props: MochiSummaryWidgetProps) {
  "widget";

  const streak = Math.max(0, props.streak);
  return (
    <Column modifiers={[fillMaxWidth(), paddingAll(16), background(CANVAS), cornerRadius(26)]}>
      <Row modifiers={[fillMaxWidth()]}>
        <Text color={ACCENT} modifiers={[weight(1)]} style={{ fontWeight: "800", fontSize: 12 }}>
          MOCHI
        </Text>
        <Text color={KITCHEN} style={{ fontWeight: "800", fontSize: 12 }}>
          {streak > 0 ? `Racha de ${streak}` : `${Math.max(0, props.points)} puntos`}
        </Text>
      </Row>

      <Text color={INK} modifiers={[paddingAll(2)]} style={{ fontSize: 16, fontStyle: "italic", lineHeight: 21 }}>
        {props.line || "Aquí estoy. Vamos a tu ritmo."}
      </Text>

      <Column modifiers={[fillMaxWidth(), paddingAll(10), background(ACCENT_SOFT), cornerRadius(16)]}>
        <Text color={MUTED} style={{ fontWeight: "700", fontSize: 11 }}>
          Hoy
        </Text>
        <Text color={INK} style={{ fontWeight: "700", fontSize: 14 }}>
          {props.nextBlock || "Nada agendado. Día libre."}
        </Text>
      </Column>

      {/* El `target` lo recibe addUserInteractionListener en la app (ver widgetActions). */}
      <Button
        {...({ target: "period_today" } as object)}
        colors={{ containerColor: ACCENT, contentColor: "#FFFFFF" }}
      >
        Me llegó hoy
      </Button>

      <Text color={MUTED} style={{ fontSize: 10 }}>{`Actualizado ${props.updatedAtLabel}`}</Text>
    </Column>
  );
}

export const mochiSummaryWidget = createWidget<MochiSummaryWidgetProps>(
  "MochiResumenWidget",
  MochiSummaryWidgetView,
);
