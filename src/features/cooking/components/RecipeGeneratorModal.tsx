import { Ionicons } from "@expo/vector-icons";
import type { Dispatch, SetStateAction } from "react";
import { Text, View } from "react-native";
import { MochiCharacter } from "@/src/shared/components/MochiCharacter";
import type { RecipeGenerationType } from "@/src/shared/lib/ai";
import type { MochiCyclePersonality } from "@/src/shared/lib/cyclePersonality";
import { COLORS } from "@/src/shared/theme/tokens";
import type { RecipeDifficulty } from "@/src/shared/types/database";
import {
  Button,
  Caption,
  Chip,
  Input,
  MochiBubble,
  MochiQuote,
  PressableScale,
  Sheet,
  Surface,
} from "@/src/shared/ui";
import { complexityOptions, recipeTypeOptions } from "@/src/features/cooking/helpers";

type RecipeGeneratorModalProps = {
  visible: boolean;
  generating: boolean;
  generatingStep: string;
  /** Se conserva por compatibilidad: la hoja ya maneja el teclado. */
  keyboardInset?: number;
  personality: MochiCyclePersonality | null;
  prompt: string;
  onPromptChange: (value: string) => void;
  recipeType: RecipeGenerationType;
  onRecipeTypeChange: (value: RecipeGenerationType) => void;
  servings: number;
  onServingsChange: Dispatch<SetStateAction<number>>;
  complexity: RecipeDifficulty;
  onComplexityChange: (value: RecipeDifficulty) => void;
  onRequestClose: () => void;
  onCancel: () => void;
  onGenerate: () => void;
};

/** Crear una receta con Mochi: mismas opciones de siempre (tipo, personas, complejidad). */
export function RecipeGeneratorModal({
  visible,
  generating,
  generatingStep,
  personality,
  prompt,
  onPromptChange,
  recipeType,
  onRecipeTypeChange,
  servings,
  onServingsChange,
  complexity,
  onComplexityChange,
  onRequestClose,
  onCancel,
  onGenerate,
}: RecipeGeneratorModalProps) {
  return (
    <Sheet visible={visible} onClose={generating ? () => undefined : onRequestClose}>
      {generating ? (
        <View className="items-center py-6">
          <MochiCharacter expression="thinking" size={130} />
          <MochiQuote className="mt-3 text-center">{generatingStep}</MochiQuote>
        </View>
      ) : (
        <>
          <MochiBubble
            tail="none"
            text="¿Qué quieres cocinar? Dímelo con tus palabras y yo me encargo del resto."
          />
          {personality ? (
            <View className="mt-3 flex-row items-center gap-1.5 self-start rounded-full bg-tint-me px-3 py-1">
              <Ionicons name={personality.phaseIconName} size={13} color={COLORS.ink} />
              <Text className="font-body-bold text-xs text-ink">{personality.phaseLabel}</Text>
            </View>
          ) : null}

          <View className="mt-4">
            <Input
              label="Tu idea"
              placeholder="Pollo al horno fácil para 4, menos de 40 minutos"
              value={prompt}
              onChangeText={onPromptChange}
              multiline
              textAlignVertical="top"
            />
          </View>
          <Surface tone="sunken" className="mb-4 p-3">
            <Caption>
              Ejemplos: «pasta con atún rápida para 1 persona», «algo dulce con plátano, huevo y
              avena».
            </Caption>
          </Surface>

          <Text className="mb-2 ml-1 font-body-bold text-sm text-ink">Tipo de receta</Text>
          <View className="mb-4 flex-row flex-wrap gap-2">
            {recipeTypeOptions.map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                selected={recipeType === option.value}
                onPress={() => onRecipeTypeChange(option.value)}
              />
            ))}
          </View>

          <Text className="mb-2 ml-1 font-body-bold text-sm text-ink">¿Para cuántas personas?</Text>
          <View className="mb-4 flex-row items-center justify-between rounded-control bg-surface-muted px-2 py-1.5">
            <PressableScale
              haptics="selection"
              onPress={() => onServingsChange((prev) => Math.max(1, prev - 1))}
              accessibilityLabel="Menos personas"
              className="h-10 w-10 items-center justify-center rounded-full bg-surface"
            >
              <Ionicons name="remove" size={20} color={COLORS.ink} />
            </PressableScale>
            <Text className="font-display text-lg text-ink">
              {servings} {servings === 1 ? "persona" : "personas"}
            </Text>
            <PressableScale
              haptics="selection"
              onPress={() => onServingsChange((prev) => Math.min(12, prev + 1))}
              accessibilityLabel="Más personas"
              className="h-10 w-10 items-center justify-center rounded-full bg-surface"
            >
              <Ionicons name="add" size={20} color={COLORS.ink} />
            </PressableScale>
          </View>

          <Text className="mb-2 ml-1 font-body-bold text-sm text-ink">Nivel de complejidad</Text>
          <View className="mb-5 flex-row flex-wrap gap-2">
            {complexityOptions.map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                selected={complexity === option.value}
                onPress={() => onComplexityChange(option.value)}
              />
            ))}
          </View>

          <View className="flex-row gap-2">
            <View className="flex-1">
              <Button title="Cancelar" variant="outline" onPress={onCancel} />
            </View>
            <View className="flex-1">
              <Button title="Crear receta" disabled={!prompt.trim()} onPress={onGenerate} />
            </View>
          </View>
        </>
      )}
    </Sheet>
  );
}
