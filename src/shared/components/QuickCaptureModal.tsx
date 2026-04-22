import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  View,
  Text,
  TextInput,
  Pressable,
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
  onActionCreated?: (action: ActionConversionResult) => void;
}

type ModalStep = "input" | "preview" | "typeSelect";

export function QuickCaptureModal({
  visible,
  onClose,
  onActionCreated,
}: QuickCaptureModalProps) {
  const { convertNoteToAction, convertingNote, error } = useActionConversion();

  const [step, setStep] = useState<ModalStep>("input");
  const [noteText, setNoteText] = useState("");
  const [conversionResult, setConversionResult] =
    useState<ActionConversionResult | null>(null);
  const [selectedType, setSelectedType] =
    useState<ActionConversionResult["type"]>("study_block");

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
      onActionCreated?.({
        ...conversionResult,
        type: selectedType,
      });
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
      <View className="flex-1 bg-black/40 justify-end">
        <View className="bg-white rounded-t-3xl p-4 max-h-96">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-4">
            <Text className="font-bold text-lg text-gray-800">
              Captura rápida
            </Text>
            <Pressable
              onPress={handleCancel}
              className="rounded-full p-2 active:bg-gray-100"
            >
              <Ionicons name="close" size={24} color="#4b5563" />
            </Pressable>
          </View>

          <ScrollView>
            {error && (
              <View className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3">
                <Text className="text-xs font-semibold text-red-700">
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
                  className="mb-4 min-h-24 rounded-xl border-2 border-violet-200 bg-violet-50 p-3 text-violet-900"
                  placeholderTextColor="#8b5cf6"
                />

                <View className="flex-row gap-2">
                  <Pressable
                    onPress={handleCancel}
                    className="flex-1 bg-gray-200 rounded-lg py-3 active:opacity-70"
                  >
                    <Text className="text-center font-semibold text-gray-800">
                      Cancelar
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      void (async () => {
                        await handleAnalyze();
                      })();
                    }}
                    disabled={convertingNote || !noteText.trim()}
                    className="flex-1 bg-purple-500 rounded-lg py-3 active:opacity-70 disabled:opacity-50"
                  >
                    {convertingNote ? (
                      <ActivityIndicator color="white" size="small" />
                    ) : (
                      <Text className="text-center font-semibold text-white">
                        Analizar
                      </Text>
                    )}
                  </Pressable>
                </View>
              </View>
            )}

            {step === "preview" && conversionResult && (
              <View>
                <View className="bg-purple-50 rounded-xl p-3 mb-4 border border-purple-200">
                  <Text className="text-xs text-purple-700 mb-1">
                    Sugerencia:
                  </Text>
                  <Text className="text-sm font-semibold text-gray-800 mb-2">
                    {conversionResult.data.title || "Sin título sugerido"}
                  </Text>
                  <Text className="text-xs text-purple-600">
                    Tipo: {getTipoLabel(conversionResult.type)}
                  </Text>
                  {conversionResult.reasoning && (
                    <Text className="text-xs text-gray-600 mt-2">
                      {conversionResult.reasoning}
                    </Text>
                  )}
                </View>

                <View className="flex-row gap-2">
                  <Pressable
                    onPress={() => resetModal()}
                    className="flex-1 bg-gray-200 rounded-lg py-3 active:opacity-70"
                  >
                    <Text className="text-center font-semibold text-gray-800">
                      No, gracias
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={handleCreateAction}
                    className="flex-1 bg-green-500 rounded-lg py-3 active:opacity-70"
                  >
                    <Text className="text-center font-semibold text-white">
                      Crear
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}

            {step === "typeSelect" && conversionResult && (
              <View>
                <Text className="text-sm text-gray-600 mb-3">
                  ¿Qué tipo de tarea es esto?
                </Text>

                {(["study_block", "exercise", "goal", "habit"] as const).map(
                  (type) => (
                    <Pressable
                      key={type}
                      onPress={() => setSelectedType(type)}
                      className={`p-3 rounded-lg mb-2 border-2 ${
                        selectedType === type
                          ? "bg-purple-100 border-purple-400"
                          : "bg-gray-50 border-gray-200"
                      }`}
                    >
                      <Text
                        className={`font-semibold ${
                          selectedType === type
                            ? "text-purple-800"
                            : "text-gray-800"
                        }`}
                      >
                        {getTipoLabel(type)}
                      </Text>
                    </Pressable>
                  ),
                )}

                <View className="flex-row gap-2 mt-4">
                  <Pressable
                    onPress={() => resetModal()}
                    className="flex-1 bg-gray-200 rounded-lg py-3 active:opacity-70"
                  >
                    <Text className="text-center font-semibold text-gray-800">
                      Cancelar
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={handleCreateAction}
                    className="flex-1 bg-green-500 rounded-lg py-3 active:opacity-70"
                  >
                    <Text className="text-center font-semibold text-white">
                      Crear
                    </Text>
                  </Pressable>
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
