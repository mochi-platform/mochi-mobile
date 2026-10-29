import { createWidget } from "expo-widgets";
import { Button, Column, Image, Row, Spacer, Text } from "@expo/ui/jetpack-compose";
import {
  background,
  cornerRadius,
  fillMaxSize,
  fillMaxWidth,
  height,
  padding,
  paddingAll,
  size,
  width,
} from "@expo/ui/jetpack-compose/modifiers";
import type {
  MochiDuoWidgetProps,
  MochiStreakWidgetProps,
  MochiSummaryWidgetProps,
} from "./widgetProps";

// Cada vista se serializa y corre aislada: los colores y textos van DENTRO de la función
// (una constante de módulo da «Property 'X' doesn't exist» en el teléfono).
// Las imágenes son drawables copiados por plugins/with-mochi-widget-assets.js.

function MochiSummaryWidgetView(props: MochiSummaryWidgetProps) {
  "widget";
  const canvas = "#FBF6EF";
  const ink = "#3A2A2E";
  const accentStrong = "#8E4E78";
  const accentSoft = "#F5E6EF";
  const kitchen = "#B0602A";
  const streak = Math.max(0, props.streak);
  return (
    <Row
      verticalAlignment="center"
      modifiers={[fillMaxSize(), background(canvas), cornerRadius(28), padding(14, 12, 16, 12)]}
    >
      <Image source={{ uri: "mochi_widget_happy" }} modifiers={[size(88, 81)]} />
      <Spacer modifiers={[width(12)]} />
      <Column modifiers={[fillMaxWidth()]}>
        <Text color={ink} maxLines={3} style={{ fontSize: 16, fontStyle: "italic" }}>
          {props.line || "Aquí estoy. Vamos a tu ritmo."}
        </Text>
        <Spacer modifiers={[height(8)]} />
        <Row verticalAlignment="center">
          <Text
            color={accentStrong}
            maxLines={1}
            modifiers={[background(accentSoft), cornerRadius(14), padding(10, 5, 10, 5)]}
            style={{ fontSize: 12.5, fontWeight: "800" }}
          >
            {props.nextBlock || "Día libre"}
          </Text>
          <Spacer modifiers={[width(10)]} />
          {streak > 0 ? (
            <Text color={kitchen} style={{ fontSize: 13, fontWeight: "800" }}>
              {`Racha ${streak}`}
            </Text>
          ) : null}
        </Row>
        {props.showPeriod ? (
          <Button
            {...({ target: "period_today" } as object)}
            colors={{ containerColor: accentSoft, contentColor: accentStrong }}
          >
            Me llegó hoy
          </Button>
        ) : null}
      </Column>
    </Row>
  );
}

function MochiStreakWidgetView(props: MochiStreakWidgetProps) {
  "widget";
  const canvas = "#FBF6EF";
  const ink = "#3A2A2E";
  const muted = "#7A6469";
  const streak = Math.max(0, props.streak);
  return (
    <Column
      horizontalAlignment="center"
      verticalAlignment="center"
      modifiers={[fillMaxSize(), background(canvas), cornerRadius(28), paddingAll(12)]}
    >
      <Image source={{ uri: "mochi_widget_proud" }} modifiers={[size(78, 72)]} />
      <Spacer modifiers={[height(4)]} />
      <Text color={ink} style={{ fontSize: 17, fontWeight: "700" }}>
        {streak > 0 ? `Racha de ${streak}` : "¡Empieza hoy!"}
      </Text>
      <Text color={muted} style={{ fontSize: 12, fontWeight: "800" }}>
        {props.habitsTotal > 0
          ? `${props.habitsDone} de ${props.habitsTotal} hábitos`
          : "Un paso a la vez"}
      </Text>
    </Column>
  );
}

function MochiDuoWidgetView(props: MochiDuoWidgetProps) {
  "widget";
  const blush = "#F7E5EF";
  const ink = "#3A2A2E";
  const plum = "#9C5A85";
  const faces = ["", "mood_face_1", "mood_face_2", "mood_face_3", "mood_face_4", "mood_face_5"];
  const face = props.mood >= 1 && props.mood <= 5 ? faces[props.mood] : "";
  return (
    <Column modifiers={[fillMaxSize(), background(blush), cornerRadius(28), paddingAll(14)]}>
      <Text color={plum} style={{ fontSize: 12, fontWeight: "800" }}>
        DUO
      </Text>
      <Spacer modifiers={[height(6)]} />
      <Text color={ink} maxLines={4} style={{ fontSize: 15, fontStyle: "italic" }}>
        {props.hasPartner
          ? props.note
            ? `“${props.note}”`
            : `Aún no hay notas de ${props.partnerName}.`
          : "Invita a tu pareja desde Duo."}
      </Text>
      <Spacer modifiers={[height(8)]} />
      {props.hasPartner ? (
        <Row verticalAlignment="center">
          {face ? <Image source={{ uri: face }} modifiers={[size(22, 22)]} /> : null}
          {face ? <Spacer modifiers={[width(6)]} /> : null}
          <Text color={ink} maxLines={1} style={{ fontSize: 12.5, fontWeight: "800" }}>
            {props.partnerName}
          </Text>
        </Row>
      ) : null}
    </Column>
  );
}

export const mochiSummaryWidget = createWidget<MochiSummaryWidgetProps>(
  "MochiResumenWidget",
  MochiSummaryWidgetView,
);
export const mochiStreakWidget = createWidget<MochiStreakWidgetProps>(
  "MochiRachaWidget",
  MochiStreakWidgetView,
);
export const mochiDuoWidget = createWidget<MochiDuoWidgetProps>(
  "MochiDuoWidget",
  MochiDuoWidgetView,
);
