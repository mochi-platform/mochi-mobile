import { tc } from "@/src/shared/theme/colors";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import {
  useActionConversion,
  type ActionConversionResult,
} from "@/src/shared/hooks/useActionConversion";

interface QuickCaptureModalProps {
  visible: boolean;
  onClose: () => void;
  onActionCreated?: (action: ActionConversionResult, originalNote: string) => void;
  /** Guarda el texto tal cual como nota rápida, sin convertirlo en acción. */
  onNoteSaved?: (note: string) => void;
}

type ModalStep = "input" | "preview" | "typeSelect";

export function QuickCaptureModal({
  visible,
  onClose,
  onActionCreated,
  onNoteSaved,
}: QuickCaptureModalProps) {
  const { convertNoteToAction, convertingNote, error } = useActionConversion();

  const [step, setStep] = useState<ModalStep>("input");
  const [noteText, setNoteText] = useState("");
  const [conversionResult, setConversionResult] = useState<ActionConversionResult | null>(null);
  const [selectedType, setSelectedType] = useState<ActionConversionResult["type"]>("study_block");

  const handleAnalyze = async () => {
    if (!noteText.trim()) return;

    const result = await convertNoteToAction(noteText);
    if (result) {
      setConversionResult(result);
      setSelectedType(result.type);
      setStep(result.confidence > 0.6 ? "preview" : "typeSelect");
    }
  };

  const handleCreateAction = () => {
    if (conversionResult) {
      onActionCreated?.(
        {
          ...conversionResult,
          type: selectedType,
        },
        noteText.trim(),
      );
      resetModal();
    }
  };

  const handleCancel = () => {
    if (step === "input") {
      onClose();
    } else {
      resetModal();
    }
  };

  const resetModal = () => {
    setStep("input");
    setNoteText("");
    setConversionResult(null);
    setSelectedType("study_block");
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View className="flex-1 justify-end bg-black/40">
        <View className="max-h-96 rounded-t-3xl bg-white p-4 dark:bg-surface">
          {/* Header */}
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-lg font-bold text-gray-800 dark:text-gray-200">
              Captura rápida
            </Text>
            <TouchableOpacity
              onPress={handleCancel}
              activeOpacity={0.85}
              className="rounded-full p-2"
            >
              <Ionicons name="close" size={24} color={tc("#4b5563")} />
            </TouchableOpacity>
          </View>

          <ScrollView>
            {error && (
              <View className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950">
                <Text className="text-xs font-semibold text-red-700 dark:text-red-300">
                  {error.message}
                </Text>
              </View>
            )}
            {step === "input" && (
              <View>
                <TextInput
                  placeholder="¿Qué está en tu mente?"
                  value={noteText}
                  onChangeText={setNoteText}
                  multiline
                  maxLength={500}
                  className="mb-4 min-h-24 rounded-xl border-2 border-violet-200 bg-violet-50 p-3 text-violet-900 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-100"
                  placeholderTextColor={tc("#8b5cf6")}
                />

                <TouchableOpacity
                  accessibilityRole="button"
                  disabled={!noteText.trim()}
                  onPress={() => {
                    onNoteSaved?.(noteText.trim());
                    resetModal();
                  }}
                  className="mb-2 min-h-[44px] items-center justify-center rounded-lg border border-purple-300 dark:border-purple-700"
                >
                  <Text className="font-semibold text-purple-700 dark:text-purple-300">
                    Guardar solo como nota
                  </Text>
                </TouchableOpacity>

                <View className="flex-row gap-2">
                  <TouchableOpacity
                    onPress={handleCancel}
                    activeOpacity={0.85}
                    className="flex-1 rounded-lg bg-slate-200 py-3 dark:bg-slate-800"
                  >
                    <Text className="text-center font-semibold text-slate-800 dark:text-slate-200">
                      Cancelar
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      void (async () => {
                        await handleAnalyze();
                      })();
                    }}
                    disabled={convertingNote || !noteText.trim()}
                    activeOpacity={0.85}
                    className="flex-1 rounded-lg bg-purple-500 py-3 opacity-50 disabled:opacity-100"
                  >
                    {convertingNote ? (
                      <ActivityIndicator color="white" size="small" />
                    ) : (
                      <Text className="text-center font-semibold text-white">Analizar</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {step === "preview" && conversionResult && (
              <View>
                <View className="mb-4 rounded-xl border border-purple-200 bg-purple-50 p-3 dark:border-purple-800 dark:bg-purple-950">
                  <Text className="mb-1 text-xs text-purple-700 dark:text-purple-300">
                    Sugerencia:
                  </Text>
                  <Text className="mb-2 text-sm font-semibold text-gray-800 dark:text-gray-200">
                    {conversionResult.data.title || "Sin título sugerido"}
                  </Text>
                  <Text className="text-xs text-purple-600 dark:text-purple-400">
                    Tipo: {getTipoLabel(conversionResult.type)}
                  </Text>
                  {conversionResult.reasoning && (
                    <Text className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                      {conversionResult.reasoning}
                    </Text>
                  )}
                </View>

                <View className="flex-row gap-2">
                  <TouchableOpacity
                    onPress={() => resetModal()}
                    activeOpacity={0.85}
                    className="flex-1 rounded-lg bg-slate-200 py-3 dark:bg-slate-800"
                  >
                    <Text className="text-center font-semibold text-slate-800 dark:text-slate-200">
                      No, gracias
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleCreateAction}
                    activeOpacity={0.85}
                    className="flex-1 rounded-lg bg-green-500 py-3"
                  >
                    <Text className="text-center font-semibold text-white">Crear</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {step === "typeSelect" && conversionResult && (
              <View>
                <Text className="mb-3 text-sm text-gray-600 dark:text-gray-400">
                  ¿Qué tipo de tarea es esto?
                </Text>

                {(["study_block", "exercise", "goal", "habit"] as const).map((type) => (
                  <TouchableOpacity
                    key={type}
                    onPress={() => setSelectedType(type)}
                    activeOpacity={0.85}
                    className={`mb-2 rounded-lg border-2 p-3 ${
                      selectedType === type
                        ? "border-purple-400 bg-purple-100 dark:bg-purple-900"
                        : "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950"
                    }`}
                  >
                    <Text
                      className={`font-semibold ${
                        selectedType === type
                          ? "text-purple-800 dark:text-purple-200"
                          : "text-slate-800 dark:text-slate-200"
                      }`}
                    >
                      {getTipoLabel(type)}
                    </Text>
                  </TouchableOpacity>
                ))}

                <View className="mt-4 flex-row gap-2">
                  <TouchableOpacity
                    onPress={() => resetModal()}
                    activeOpacity={0.85}
                    className="flex-1 rounded-lg bg-slate-200 py-3 dark:bg-slate-800"
                  >
                    <Text className="text-center font-semibold text-slate-800 dark:text-slate-200">
                      Cancelar
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleCreateAction}
                    activeOpacity={0.85}
                    className="flex-1 rounded-lg bg-green-500 py-3"
                  >
                    <Text className="text-center font-semibold text-white">Crear</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function getTipoLabel(type: ActionConversionResult["type"]): string {
  const labels: Record<ActionConversionResult["type"], string> = {
    study_block: "Sesión de estudio",
    exercise: "Rutina de ejercicio",
    goal: "Meta",
    habit: "Hábito",
  };
  return labels[type];
}
