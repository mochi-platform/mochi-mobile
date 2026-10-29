import { createWidget } from "expo-widgets";
import type {
  MochiDuoWidgetProps,
  MochiStreakWidgetProps,
  MochiSummaryWidgetProps,
} from "./widgetProps";
import { HStack, Text, VStack } from "@expo/ui/swift-ui";
import {
  background,
  cornerRadius,
  foregroundStyle,
  frame,
  padding,
} from "@expo/ui/swift-ui/modifiers";

function MochiSummaryWidgetView(props: MochiSummaryWidgetProps) {
  "widget";

  return (
    <VStack
      spacing={10}
      modifiers={[
        padding({ all: 14 }),
        background("#f5ecff"),
        cornerRadius(18),
        frame({ maxWidth: 400, maxHeight: 400 }),
      ]}
    >
      <Text modifiers={[foregroundStyle("#5b21b6")]}>Resumen Mochi</Text>

      <HStack spacing={10}>
        <VStack
          spacing={4}
          modifiers={[
            padding({ all: 8 }),
            background("#ffffff"),
            cornerRadius(12),
            frame({ maxWidth: 160 }),
          ]}
        >
          <Text modifiers={[foregroundStyle("#7c3aed")]}>Puntos</Text>
          <Text modifiers={[foregroundStyle("#312e81")]}>{`${Math.max(0, props.points)}`}</Text>
        </VStack>

        <VStack
          spacing={4}
          modifiers={[
            padding({ all: 8 }),
            background("#ffffff"),
            cornerRadius(12),
            frame({ maxWidth: 160 }),
          ]}
        >
          <Text modifiers={[foregroundStyle("#7c3aed")]}>Racha</Text>
          <Text
            modifiers={[foregroundStyle("#312e81")]}
          >{`${Math.max(0, props.streak)} días`}</Text>
        </VStack>
      </HStack>

      <VStack
        spacing={4}
        modifiers={[padding({ all: 10 }), background("#ffffff"), cornerRadius(12)]}
      >
        <Text modifiers={[foregroundStyle("#7c3aed")]}>Bloque del día</Text>
        <Text modifiers={[foregroundStyle("#312e81")]}>
          {props.nextBlock || "Sin bloque programado"}
        </Text>
      </VStack>

      <Text modifiers={[foregroundStyle("#6d28d9")]}>{`Actualizado ${props.updatedAtLabel}`}</Text>
    </VStack>
  );
}

export const mochiSummaryWidget = createWidget<MochiSummaryWidgetProps>(
  "MochiResumenWidget",
  MochiSummaryWidgetView,
);

// iOS no se compila hoy; versiones mínimas para que los tres widgets existan en ambas plataformas.
function MochiStreakWidgetView(props: MochiStreakWidgetProps) {
  "widget";
  return (
    <VStack spacing={4} modifiers={[padding({ all: 14 }), background("#FBF6EF"), cornerRadius(18)]}>
      <Text modifiers={[foregroundStyle("#3A2A2E")]}>
        {props.streak > 0 ? `Racha de ${props.streak}` : "¡Empieza hoy!"}
      </Text>
      <Text modifiers={[foregroundStyle("#7A6469")]}>
        {`${props.habitsDone} de ${props.habitsTotal} hábitos`}
      </Text>
    </VStack>
  );
}

function MochiDuoWidgetView(props: MochiDuoWidgetProps) {
  "widget";
  return (
    <VStack spacing={6} modifiers={[padding({ all: 14 }), background("#F7E5EF"), cornerRadius(18)]}>
      <Text modifiers={[foregroundStyle("#9C5A85")]}>DUO</Text>
      <Text modifiers={[foregroundStyle("#3A2A2E")]}>
        {props.hasPartner
          ? props.note || `Aún no hay notas de ${props.partnerName}.`
          : "Invita a tu pareja desde Duo."}
      </Text>
    </VStack>
  );
}

export const mochiStreakWidget = createWidget<MochiStreakWidgetProps>(
  "MochiRachaWidget",
  MochiStreakWidgetView,
);
export const mochiDuoWidget = createWidget<MochiDuoWidgetProps>(
  "MochiDuoWidget",
  MochiDuoWidgetView,
);
