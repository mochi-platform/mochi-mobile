import { COLORS } from "@/src/shared/theme/tokens";
import { ActivityIndicator, View } from "react-native";
import type { StudyAttachment, StudyMessage } from "@/src/features/study/timer/types";
import { Body, Button, Caption, Chip, Input, MochiBubble, Sheet } from "@/src/shared/ui";

type StudyCompanionModalProps = {
  visible: boolean;
  onClose: () => void;
  specificTopic: string;
  messages: StudyMessage[];
  asking: boolean;
  question: string;
  onQuestionChange: (value: string) => void;
  chatAttachment: StudyAttachment | null;
  chatError: string | null;
  onPickCamera: () => void;
  onPickGallery: () => void;
  onPickDocument: () => void;
  onRemoveAttachment: () => void;
  onSend: () => void;
};

export function StudyCompanionModal({
  visible,
  onClose,
  specificTopic,
  messages,
  asking,
  question,
  onQuestionChange,
  chatAttachment,
  chatError,
  onPickCamera,
  onPickGallery,
  onPickDocument,
  onRemoveAttachment,
  onSend,
}: StudyCompanionModalProps) {
  const canSend = Boolean(question.trim() || chatAttachment) && !asking;
  return (
    <Sheet visible={visible} onClose={() => onClose()} title="Pregúntale a Mochi">
      <Caption className="-mt-2 mb-3" numberOfLines={1}>
        {specificTopic}
      </Caption>

      {messages.length === 0 ? (
        <MochiBubble text="Estoy lista para ayudarte con teoría, ejercicios, dudas o resúmenes." />
      ) : (
        <View className="gap-2">
          {messages.map((message, index) => (
            <View
              key={`${message.role}-${index}`}
              className={`max-w-[88%] rounded-[18px] px-3.5 py-2.5 ${message.role === "assistant" ? "self-start bg-accent-soft" : "self-end bg-surface-muted"}`}
            >
              <Body>{message.content}</Body>
            </View>
          ))}
        </View>
      )}
      {asking ? (
        <View className="mt-2 flex-row items-center gap-2 self-start rounded-[18px] bg-accent-soft px-3.5 py-2.5">
          <ActivityIndicator color={COLORS.accent} size="small" />
          <Caption>Mochi está pensando…</Caption>
        </View>
      ) : null}

      <View className="mt-4 flex-row flex-wrap gap-2">
        <Chip icon="camera-outline" label="Cámara" onSurface onPress={() => onPickCamera()} />
        <Chip icon="image-outline" label="Galería" onSurface onPress={() => onPickGallery()} />
        <Chip icon="document-outline" label="Archivo" onSurface onPress={() => onPickDocument()} />
        {chatAttachment ? (
          <Chip icon="close" label="Quitar" onSurface onPress={() => onRemoveAttachment()} />
        ) : null}
      </View>
      {chatAttachment ? (
        <Caption className="ml-1 mt-2" numberOfLines={1}>
          Adjunto: {chatAttachment.name}
        </Caption>
      ) : null}

      <View className="mt-3">
        <Input
          label="Tu pregunta"
          placeholder="Escribe tu duda o pide un resumen…"
          value={question}
          onChangeText={onQuestionChange}
          multiline
          style={{ textAlignVertical: "top", minHeight: 72, paddingTop: 14 }}
        />
      </View>
      {chatError ? <Caption className="mb-2 ml-1 text-danger">{chatError}</Caption> : null}
      <Button
        title="Enviar"
        icon="send"
        disabled={!canSend}
        loading={asking}
        onPress={() => onSend()}
      />
    </Sheet>
  );
}
