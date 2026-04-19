import { createWidget } from "expo-widgets";
import { HStack, Text, VStack } from "@expo/ui/swift-ui";
import {
  background,
  cornerRadius,
  foregroundStyle,
  frame,
  padding,
} from "@expo/ui/swift-ui/modifiers";

export type MochiSummaryWidgetProps = {
  points: number;
  streak: number;
  nextBlock: string;
  updatedAtLabel: string;
};

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
          <Text modifiers={[foregroundStyle("#312e81")]}>{`${Math.max(0, props.streak)} días`}</Text>
        </VStack>
      </HStack>

      <VStack
        spacing={4}
        modifiers={[padding({ all: 10 }), background("#ffffff"), cornerRadius(12)]}
      >
        <Text modifiers={[foregroundStyle("#7c3aed")]}>Bloque del día</Text>
        <Text modifiers={[foregroundStyle("#312e81")]}>{props.nextBlock || "Sin bloque programado"}</Text>
      </VStack>

      <Text modifiers={[foregroundStyle("#6d28d9")]}>{`Actualizado ${props.updatedAtLabel}`}</Text>
    </VStack>
  );
}

export const mochiSummaryWidget = createWidget<MochiSummaryWidgetProps>(
  "MochiResumenWidget",
  MochiSummaryWidgetView,
);
