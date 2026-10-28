import { useState } from "react";
import { View } from "react-native";
import { Button, Caption, Chip, Input, MochiBubble, Sheet, Surface } from "@/src/shared/ui";
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
    <Sheet visible={visible} onClose={handleCancel} title="Captura rápida">
      {error ? (
        <Surface tone="sunken" className="mb-3 p-3">
          <Caption className="text-danger">{error.message}</Caption>
        </Surface>
      ) : null}

      {step === "input" ? (
        <>
          <Input
            label="¿Qué tienes en mente?"
            placeholder="Estudiar química el jueves en la tarde…"
            value={noteText}
            onChangeText={setNoteText}
            multiline
            maxLength={500}
            autoFocus
          />
          <View className="gap-2">
            <Button
              title={convertingNote ? "Mochi está pensando…" : "Que Mochi lo organice"}
              loading={convertingNote}
              disabled={!noteText.trim()}
              onPress={() => void handleAnalyze()}
            />
            <Button
              title="Guardar solo como nota"
              variant="soft"
              disabled={!noteText.trim()}
              onPress={() => {
                onNoteSaved?.(noteText.trim());
                resetModal();
              }}
            />
          </View>
        </>
      ) : null}

      {step === "preview" && conversionResult ? (
        <>
          <MochiBubble
            tail="none"
            text={`Lo guardaría como ${getTipoLabel(conversionResult.type).toLowerCase()}: «${conversionResult.data.title || "Sin título"}».`}
          >
            {conversionResult.reasoning ? (
              <Caption className="mt-2">{conversionResult.reasoning}</Caption>
            ) : null}
          </MochiBubble>
          <View className="mt-4 flex-row gap-2">
            <View className="flex-1">
              <Button title="No, gracias" variant="outline" onPress={() => resetModal()} />
            </View>
            <View className="flex-1">
              <Button title="Crear" onPress={handleCreateAction} />
            </View>
          </View>
        </>
      ) : null}

      {step === "typeSelect" && conversionResult ? (
        <>
          <Caption className="mb-3">¿Qué tipo de tarea es esto?</Caption>
          <View className="mb-4 flex-row flex-wrap gap-2">
            {(["study_block", "exercise", "goal", "habit"] as const).map((type) => (
              <Chip
                key={type}
                label={getTipoLabel(type)}
                selected={selectedType === type}
                onPress={() => setSelectedType(type)}
              />
            ))}
          </View>
          <View className="flex-row gap-2">
            <View className="flex-1">
              <Button title="Cancelar" variant="outline" onPress={() => resetModal()} />
            </View>
            <View className="flex-1">
              <Button title="Crear" onPress={handleCreateAction} />
            </View>
          </View>
        </>
      ) : null}
    </Sheet>
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
