import { tc } from "@/src/shared/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { MochiCharacter } from "@/src/shared/components/MochiCharacter";
import type { StudyAttachment, StudyMessage } from "@/src/features/study/timer/types";

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
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => onClose()}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="max-h-[90%] rounded-t-3xl bg-surface px-5 pb-10 pt-5">
          <View className="mb-2 h-1.5 w-16 self-center rounded-full bg-surface-muted" />

          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-base font-extrabold text-ink">Compañera de estudio</Text>
              <Text className="text-xs font-semibold text-ink" numberOfLines={1}>
                {specificTopic}
              </Text>
            </View>
            <TouchableOpacity onPress={() => onClose()}>
              <Ionicons name="close" size={22} color={tc("#64748b")} />
            </TouchableOpacity>
          </View>

          <ScrollView className="mt-3 max-h-[45%]" showsVerticalScrollIndicator={false}>
            {messages.length === 0 ? (
              <View className="items-center rounded-2xl bg-surface-muted p-4">
                <MochiCharacter mood="happy" size={56} />
                <Text className="mt-2 text-center text-xs font-semibold text-ink">
                  Estoy lista para ayudarte con teoría, ejercicios, dudas o resúmenes.
                </Text>
              </View>
            ) : (
              messages.map((message, index) => (
                <View
                  key={`${message.role}-${index}`}
                  className={`mb-2 rounded-2xl p-3 ${message.role === "assistant" ? "bg-tint-study" : "bg-surface-muted"}`}
                >
                  <Text className="text-sm font-semibold text-ink">{message.content}</Text>
                </View>
              ))
            )}
            {asking ? (
              <View className="mb-2 flex-row items-center rounded-2xl bg-tint-study p-3">
                <ActivityIndicator color={tc("#7c3aed")} />
                <Text className="ml-2 text-xs font-semibold text-ink">Mochi está pensando...</Text>
              </View>
            ) : null}
          </ScrollView>

          <View className="mt-3 flex-row flex-wrap gap-2">
            <TouchableOpacity
              className="rounded-xl bg-tint-study px-3 py-2"
              onPress={() => onPickCamera()}
            >
              <Text className="text-xs font-bold text-ink">Cámara</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="rounded-xl bg-tint-study px-3 py-2"
              onPress={() => onPickGallery()}
            >
              <Text className="text-xs font-bold text-ink">Galería</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="rounded-xl bg-tint-study px-3 py-2"
              onPress={() => onPickDocument()}
            >
              <Text className="text-xs font-bold text-ink">Archivo</Text>
            </TouchableOpacity>
            {chatAttachment ? (
              <TouchableOpacity
                className="rounded-xl bg-tint-me px-3 py-2"
                onPress={() => onRemoveAttachment()}
              >
                <Text className="text-xs font-bold text-danger">Quitar</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {chatAttachment ? (
            <View className="mt-2 rounded-xl bg-surface-muted px-3 py-2">
              <Text className="text-xs font-semibold text-ink" numberOfLines={1}>
                {chatAttachment.name}
              </Text>
            </View>
          ) : null}

          <TextInput
            className="mt-3 rounded-2xl bg-surface-muted px-4 py-3 text-sm font-semibold text-ink"
            placeholder="Escribe tu duda o pide un resumen..."
            placeholderTextColor={tc("#a78bfa")}
            value={question}
            onChangeText={onQuestionChange}
            multiline
          />

          {chatError ? (
            <Text className="mt-2 text-xs font-semibold text-danger">{chatError}</Text>
          ) : null}

          <TouchableOpacity
            className={`mt-3 items-center rounded-2xl py-3 ${(question.trim() || chatAttachment) && !asking ? "bg-accent" : "bg-tint-study"}`}
            onPress={() => onSend()}
            disabled={!(question.trim() || chatAttachment) || asking}
          >
            <Text className="font-bold text-white">Enviar a Mochi</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
