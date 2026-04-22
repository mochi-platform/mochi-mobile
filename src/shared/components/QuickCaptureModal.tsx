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
            <TouchableOpacity
              onPress={handleCancel}
              activeOpacity={0.85}
              className="rounded-full p-2"
            >
              <Ionicons name="close" size={24} color="#4b5563" />
            </TouchableOpacity>
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
                  // DESPUÉS
                  <TouchableOpacity
                    onPress={handleCancel}
                    activeOpacity={0.85}
                    className="flex-1 bg-slate-200 rounded-lg py-3"
                  >
                    <Text className="text-center font-semibold text-slate-800">
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
                    className="flex-1 bg-purple-500 rounded-lg py-3 opacity-50 disabled:opacity-100"
                  >
                    {convertingNote ? (
                      <ActivityIndicator color="white" size="small" />
                    ) : (
                      <Text className="text-center font-semibold text-white">
                        Analizar
                      </Text>
                    )}
                  </TouchableOpacity>
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
                  <TouchableOpacity
                    onPress={() => resetModal()}
                    activeOpacity={0.85}
                    className="flex-1 bg-slate-200 rounded-lg py-3"
                  >
                    <Text className="text-center font-semibold text-slate-800">
                      No, gracias
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleCreateAction}
                    activeOpacity={0.85}
                    className="flex-1 bg-green-500 rounded-lg py-3"
                  >
                    <Text className="text-center font-semibold text-white">
                      Crear
                    </Text>
                  </TouchableOpacity>
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
                    <TouchableOpacity
                      key={type}
                      onPress={() => setSelectedType(type)}
                      activeOpacity={0.85}
                      className={`p-3 rounded-lg mb-2 border-2 ${
                        selectedType === type
                          ? "bg-purple-100 border-purple-400"
                          : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      <Text
                        className={`font-semibold ${
                          selectedType === type
                            ? "text-purple-800"
                            : "text-slate-800"
                        }`}
                      >
                        {getTipoLabel(type)}
                      </Text>
                    </TouchableOpacity>
                  ),
                )}

                <View className="flex-row gap-2 mt-4">
                  <TouchableOpacity
                    onPress={() => resetModal()}
                    activeOpacity={0.85}
                    className="flex-1 bg-slate-200 rounded-lg py-3"
                  >
                    <Text className="text-center font-semibold text-slate-800">
                      Cancelar
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleCreateAction}
                    activeOpacity={0.85}
                    className="flex-1 bg-green-500 rounded-lg py-3"
                  >
                    <Text className="text-center font-semibold text-white">
                      Crear
                    </Text>
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
