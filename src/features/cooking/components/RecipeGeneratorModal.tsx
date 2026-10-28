import { tc } from "@/src/shared/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import type { Dispatch, SetStateAction } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { MochiCharacter } from "@/src/shared/components/MochiCharacter";
import type { RecipeGenerationType } from "@/src/shared/lib/ai";
import type { MochiCyclePersonality } from "@/src/shared/lib/cyclePersonality";
import type { RecipeDifficulty } from "@/src/shared/types/database";
import { complexityOptions, recipeTypeOptions } from "@/src/features/cooking/helpers";

type RecipeGeneratorModalProps = {
  visible: boolean;
  generating: boolean;
  generatingStep: string;
  keyboardInset: number;
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

export function RecipeGeneratorModal({
  visible,
  generating,
  generatingStep,
  keyboardInset,
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
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onRequestClose}>
      <TouchableWithoutFeedback onPress={onRequestClose}>
        <View className="flex-1 justify-end bg-black/40" style={{ paddingBottom: keyboardInset }}>
          <TouchableWithoutFeedback onPress={() => undefined}>
            <View className="max-h-[90%] rounded-t-3xl bg-white px-5 pb-10 pt-5 dark:bg-surface">
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View className="mb-4 h-1.5 w-16 self-center rounded-full bg-slate-200 dark:bg-slate-800" />

                {generating ? (
                  <View className="items-center py-8">
                    <MochiCharacter mood="thinking" size={90} />
                    <Text className="mt-4 text-center text-base font-extrabold text-orange-900 dark:text-orange-100">
                      {generatingStep}
                    </Text>
                    <ActivityIndicator className="mt-4" size="large" color={tc("#f97316")} />
                  </View>
                ) : (
                  <>
                    <Text className="text-xl font-extrabold text-orange-900 dark:text-orange-100">
                      ¿Qué quieres cocinar?
                    </Text>
                    <Text className="mt-1 text-sm font-semibold text-orange-600 dark:text-orange-400">
                      Descríbelo con tus palabras, yo me encargo del resto
                    </Text>
                    {personality && (
                      <View
                        className={`mt-3 self-start rounded-full border px-3 py-1 ${personality.phaseBadgeClass}`}
                      >
                        <View className="flex-row items-center">
                          <Ionicons
                            name={personality.phaseIconName}
                            size={12}
                            color={tc("#334155")}
                          />
                          <Text className="ml-1 text-xs font-extrabold text-slate-700 dark:text-slate-300">
                            {personality.phaseLabel}
                          </Text>
                        </View>
                      </View>
                    )}
                    <View className="mt-4 rounded-2xl border-2 border-orange-200 bg-orange-50 px-4 py-3 dark:border-orange-800 dark:bg-orange-950">
                      <Text className="mb-1 text-xs font-bold text-orange-700 dark:text-orange-300">
                        Ejemplos:
                      </Text>
                      <Text className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                        • "pasta con atún rápida para 1 persona"{"\n"}• "algo dulce con plátano,
                        huevo y avena"{"\n"}• "pollo al horno fácil para 4, menos de 40 minutos"
                      </Text>
                    </View>
                    <View className="mt-4 rounded-2xl border-2 border-orange-200 bg-orange-50 px-4 py-3 dark:border-orange-800 dark:bg-orange-950">
                      <Text className="text-xs font-bold text-orange-700 dark:text-orange-300">
                        Tipo de receta
                      </Text>
                      <View className="mt-2 flex-row flex-wrap gap-2">
                        {recipeTypeOptions.map((option) => {
                          const selected = recipeType === option.value;
                          return (
                            <TouchableOpacity
                              key={option.value}
                              className={`rounded-full border px-3 py-1 ${selected ? "border-orange-500 bg-orange-500" : "border-orange-200 bg-white dark:border-orange-800 dark:bg-surface"}`}
                              onPress={() => onRecipeTypeChange(option.value)}
                            >
                              <Text
                                className={`text-xs font-bold ${selected ? "text-white" : "text-orange-700 dark:text-orange-300"}`}
                              >
                                {option.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      <Text className="mt-4 text-xs font-bold text-orange-700 dark:text-orange-300">
                        Cantidad de personas
                      </Text>
                      <View className="mt-2 flex-row items-center justify-between rounded-2xl border border-orange-200 bg-white px-3 py-2 dark:border-orange-800 dark:bg-surface">
                        <TouchableOpacity
                          className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 dark:border-orange-800 dark:bg-orange-950"
                          onPress={() => onServingsChange((prev) => Math.max(1, prev - 1))}
                        >
                          <Text className="text-sm font-extrabold text-orange-700 dark:text-orange-300">
                            -
                          </Text>
                        </TouchableOpacity>
                        <Text className="text-base font-extrabold text-orange-900 dark:text-orange-100">
                          {servings} {servings === 1 ? "persona" : "personas"}
                        </Text>
                        <TouchableOpacity
                          className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 dark:border-orange-800 dark:bg-orange-950"
                          onPress={() => onServingsChange((prev) => Math.min(12, prev + 1))}
                        >
                          <Text className="text-sm font-extrabold text-orange-700 dark:text-orange-300">
                            +
                          </Text>
                        </TouchableOpacity>
                      </View>

                      <Text className="mt-4 text-xs font-bold text-orange-700 dark:text-orange-300">
                        Nivel de complejidad
                      </Text>
                      <View className="mt-2 flex-row gap-2">
                        {complexityOptions.map((option) => {
                          const selected = complexity === option.value;
                          return (
                            <TouchableOpacity
                              key={option.value}
                              className={`flex-1 rounded-xl border px-3 py-2 ${selected ? "border-orange-500 bg-orange-500" : "border-orange-200 bg-white dark:border-orange-800 dark:bg-surface"}`}
                              onPress={() => onComplexityChange(option.value)}
                            >
                              <Text
                                className={`text-center text-xs font-bold ${selected ? "text-white" : "text-orange-700 dark:text-orange-300"}`}
                              >
                                {option.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                    <TextInput
                      className="mt-4 min-h-24 rounded-2xl border-2 border-orange-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 dark:border-orange-800 dark:bg-surface dark:text-slate-200"
                      placeholder="Quiero hacer..."
                      placeholderTextColor={tc("#fdba74")}
                      value={prompt}
                      onChangeText={onPromptChange}
                      multiline
                      textAlignVertical="top"
                    />
                    <View className="mt-5 flex-row gap-3">
                      <TouchableOpacity
                        className="flex-1 rounded-2xl border-2 border-orange-200 py-3 dark:border-orange-800"
                        onPress={onCancel}
                      >
                        <Text className="text-center font-bold text-orange-700 dark:text-orange-300">
                          Cancelar
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        className={`flex-1 rounded-2xl py-3 ${prompt.trim() ? "bg-orange-500" : "bg-orange-200 dark:bg-orange-800"}`}
                        onPress={onGenerate}
                        disabled={!prompt.trim()}
                      >
                        <Text className="text-center font-extrabold text-white">Generar</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
