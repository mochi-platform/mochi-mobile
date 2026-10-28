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
        <View className="max-h-[90%] rounded-t-3xl bg-white px-5 pb-10 pt-5 dark:bg-surface">
          <View className="mb-2 h-1.5 w-16 self-center rounded-full bg-slate-200 dark:bg-slate-800" />

          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-base font-extrabold text-purple-900 dark:text-purple-100">
                Compañera de estudio
              </Text>
              <Text
                className="text-xs font-semibold text-purple-600 dark:text-purple-400"
                numberOfLines={1}
              >
                {specificTopic}
              </Text>
            </View>
            <TouchableOpacity onPress={() => onClose()}>
              <Ionicons name="close" size={22} color={tc("#64748b")} />
            </TouchableOpacity>
          </View>

          <ScrollView className="mt-3 max-h-[45%]" showsVerticalScrollIndicator={false}>
            {messages.length === 0 ? (
              <View className="items-center rounded-2xl border border-purple-200 bg-purple-50 p-4 dark:border-purple-800 dark:bg-purple-950">
                <MochiCharacter mood="happy" size={56} />
                <Text className="mt-2 text-center text-xs font-semibold text-purple-700 dark:text-purple-300">
                  Estoy lista para ayudarte con teoría, ejercicios, dudas o resúmenes.
                </Text>
              </View>
            ) : (
              messages.map((message, index) => (
                <View
                  key={`${message.role}-${index}`}
                  className={`mb-2 rounded-2xl p-3 ${message.role === "assistant" ? "bg-purple-100 dark:bg-purple-900" : "bg-slate-100 dark:bg-slate-900"}`}
                >
                  <Text className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {message.content}
                  </Text>
                </View>
              ))
            )}
            {asking ? (
              <View className="mb-2 flex-row items-center rounded-2xl bg-purple-100 p-3 dark:bg-purple-900">
                <ActivityIndicator color={tc("#7c3aed")} />
                <Text className="ml-2 text-xs font-semibold text-purple-700 dark:text-purple-300">
                  Mochi está pensando...
                </Text>
              </View>
            ) : null}
          </ScrollView>

          <View className="mt-3 flex-row flex-wrap gap-2">
            <TouchableOpacity
              className="rounded-xl bg-purple-100 px-3 py-2 dark:bg-purple-900"
              onPress={() => onPickCamera()}
            >
              <Text className="text-xs font-bold text-purple-800 dark:text-purple-200">Cámara</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="rounded-xl bg-purple-100 px-3 py-2 dark:bg-purple-900"
              onPress={() => onPickGallery()}
            >
              <Text className="text-xs font-bold text-purple-800 dark:text-purple-200">
                Galería
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="rounded-xl bg-purple-100 px-3 py-2 dark:bg-purple-900"
              onPress={() => onPickDocument()}
            >
              <Text className="text-xs font-bold text-purple-800 dark:text-purple-200">
                Archivo
              </Text>
            </TouchableOpacity>
            {chatAttachment ? (
              <TouchableOpacity
                className="rounded-xl bg-red-100 px-3 py-2 dark:bg-red-900"
                onPress={() => onRemoveAttachment()}
              >
                <Text className="text-xs font-bold text-red-700 dark:text-red-300">Quitar</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {chatAttachment ? (
            <View className="mt-2 rounded-xl border border-purple-200 bg-purple-50 px-3 py-2 dark:border-purple-800 dark:bg-purple-950">
              <Text
                className="text-xs font-semibold text-purple-700 dark:text-purple-300"
                numberOfLines={1}
              >
                {chatAttachment.name}
              </Text>
            </View>
          ) : null}

          <TextInput
            className="mt-3 rounded-2xl border-2 border-purple-200 bg-purple-50 px-4 py-3 text-sm font-semibold text-slate-800 dark:border-purple-800 dark:bg-purple-950 dark:text-slate-200"
            placeholder="Escribe tu duda o pide un resumen..."
            placeholderTextColor={tc("#a78bfa")}
            value={question}
            onChangeText={onQuestionChange}
            multiline
          />

          {chatError ? (
            <Text className="mt-2 text-xs font-semibold text-red-600 dark:text-red-400">
              {chatError}
            </Text>
          ) : null}

          <TouchableOpacity
            className={`mt-3 items-center rounded-2xl py-3 ${(question.trim() || chatAttachment) && !asking ? "bg-purple-500" : "bg-purple-200 dark:bg-purple-800"}`}
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
