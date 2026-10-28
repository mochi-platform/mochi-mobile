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

function MochiSummaryWidgetView(props: MochiSummaryWidgetProps) {
  "widget";

  return (
    <Column modifiers={[fillMaxWidth(), paddingAll(14), background("#f5ecff"), cornerRadius(18)]}>
      <Text color="#5b21b6" style={{ fontWeight: "bold", fontSize: 14 }}>
        Resumen Mochi
      </Text>

      <Row modifiers={[fillMaxWidth(), paddingAll(4)]}>
        <Column modifiers={[weight(1), paddingAll(8), background("#ffffff"), cornerRadius(12)]}>
          <Text color="#7c3aed" style={{ fontSize: 11 }}>
            Puntos
          </Text>
          <Text
            color="#312e81"
            style={{ fontWeight: "bold", fontSize: 16 }}
          >{`${Math.max(0, props.points)}`}</Text>
        </Column>
        <Column modifiers={[weight(1), paddingAll(8), background("#ffffff"), cornerRadius(12)]}>
          <Text color="#7c3aed" style={{ fontSize: 11 }}>
            Racha
          </Text>
          <Text
            color="#312e81"
            style={{ fontWeight: "bold", fontSize: 16 }}
          >{`${Math.max(0, props.streak)} días`}</Text>
        </Column>
      </Row>

      <Column modifiers={[fillMaxWidth(), paddingAll(10), background("#ffffff"), cornerRadius(12)]}>
        <Text color="#7c3aed" style={{ fontSize: 11 }}>
          Bloque del día
        </Text>
        <Text color="#312e81" style={{ fontSize: 13 }}>
          {props.nextBlock || "Sin bloque programado"}
        </Text>
      </Column>

      {/* El `target` lo recibe addUserInteractionListener en la app (ver widgetActions). */}
      <Button {...({ target: "period_today" } as object)}>Me llegó hoy</Button>

      <Text color="#6d28d9" style={{ fontSize: 10 }}>{`Actualizado ${props.updatedAtLabel}`}</Text>
    </Column>
  );
}

export const mochiSummaryWidget = createWidget<MochiSummaryWidgetProps>(
  "MochiResumenWidget",
  MochiSummaryWidgetView,
);
