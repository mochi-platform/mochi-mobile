import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useAchievement } from "@/src/core/providers/AchievementContext";
import { useSession } from "@/src/core/providers/SessionContext";
import { MochiCharacter } from "@/src/shared/components/MochiCharacter";
import {
  askStudyCompanion,
  detectStudyDiscipline,
  generateFlashcards,
  generateStudySessionPlan,
} from "@/src/shared/lib/ai";
import {
  addPoints,
  checkStreakAchievements,
  checkStudyAchievements,
  trackEngagementEvent,
  updateStreak,
} from "@/src/shared/lib/gamification";
import { supabase } from "@/src/shared/lib/supabase";
import type { StudyBlock } from "@/src/shared/types/database";

type StudyPhase = "setup" | "studying" | "complete";

type StudyMessage = {
  role: "user" | "assistant";
  content: string;
};

type StudyAttachment = {
  name: string;
  mimeType: string;
  base64: string;
  previewUri?: string;
};

function parseTimeToSeconds(timeStr: string): number {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return (hours * 60 + minutes) * 60;
}

function calcDurationSeconds(startTime: string, endTime: string): number {
  return parseTimeToSeconds(endTime) - parseTimeToSeconds(startTime);
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatDurationMinutes(seconds: number): number {
  return Math.max(1, Math.round(seconds / 60));
}

function summarizeSession(topic: string): string {
  const clean = topic.trim();
  if (!clean) {
    return "Consolidaste una sesión de enfoque con objetivos claros.\nTu constancia de hoy fortalece tu progreso.";
  }

  return `Estudiaste: ${clean.slice(0, 90)}${clean.length > 90 ? "..." : ""}.\nOrdenaste ideas clave y diste un paso firme en tu avance.`;
}

function getAttachmentLabel(mimeType: string): string {
  return mimeType === "application/pdf" ? "PDF adjunto" : "Imagen adjunta";
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
    reader.onloadend = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const base64 = result.includes(",") ? result.split(",")[1] : "";
      resolve(base64);
    };
    reader.readAsDataURL(blob);
  });
}

async function uriToBase64(uri: string): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();
  return blobToBase64(blob);
}

const colorMap: Record<string, string> = {
  pink: "bg-pink-100",
  blue: "bg-blue-100",
  yellow: "bg-yellow-100",
  teal: "bg-teal-100",
  purple: "bg-purple-100",
  green: "bg-green-100",
};

const colorBorderMap: Record<string, string> = {
  pink: "border-pink-300",
  blue: "border-blue-300",
  yellow: "border-yellow-300",
  teal: "border-teal-300",
  purple: "border-purple-300",
  green: "border-green-300",
};

export function StudyTimerScreen() {
  const { blockId } = useLocalSearchParams<{ blockId: string }>();
  const { session } = useSession();
  const { showAchievement } = useAchievement();

  const [block, setBlock] = useState<StudyBlock | null>(null);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [generatingFlashcards, setGeneratingFlashcards] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gamificationWarning, setGamificationWarning] = useState<string | null>(
    null,
  );
  const [didAwardGamification, setDidAwardGamification] = useState(false);

  const [phase, setPhase] = useState<StudyPhase>("setup");
  const [specificTopic, setSpecificTopic] = useState("");
  const [discipline, setDiscipline] = useState("estudio general");
  const [setupAttachment, setSetupAttachment] =
    useState<StudyAttachment | null>(null);
  const [studyPlan, setStudyPlan] = useState("");
  const [planning, setPlanning] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);

  const [showCompanion, setShowCompanion] = useState(false);
  const [messages, setMessages] = useState<StudyMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [chatAttachment, setChatAttachment] = useState<StudyAttachment | null>(
    null,
  );
  const [asking, setAsking] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completionMutexRef = useRef(false);
  const sessionPersistedRef = useRef(false);
  const progress = useSharedValue(1);

  const blockColor = block?.color ?? "purple";
  const summaryText = useMemo(
    () => summarizeSession(specificTopic),
    [specificTopic],
  );

  useEffect(() => {
    async function loadBlock() {
      if (!blockId) {
        setError("No se encontró el bloque");
        setLoading(false);
        return;
      }

      try {
        const { data, error: sbError } = await supabase
          .from("study_blocks")
          .select("*")
          .eq("id", blockId)
          .single();

        if (sbError) throw sbError;

        const duration = calcDurationSeconds(data.start_time, data.end_time);
        const safeDuration = duration > 0 ? duration : 5400;

        setBlock(data);
        setTotalSeconds(safeDuration);
        setTimeLeft(safeDuration);
        progress.value = 1;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error cargando bloque");
      } finally {
        setLoading(false);
      }
    }

    void loadBlock();
  }, [blockId, progress]);

  useEffect(() => {
    if (!isRunning || phase !== "studying") {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          void handleComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, phase]);

  useEffect(() => {
    if (totalSeconds > 0) {
      progress.value = withTiming(timeLeft / totalSeconds, {
        duration: 900,
        easing: Easing.linear,
      });
    }
  }, [timeLeft, totalSeconds, progress]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%` as `${number}%`,
  }));

  async function ensureDiscipline(): Promise<string> {
    const subject = block?.subject ?? "Estudio";
    const topic = specificTopic.trim();

    if (!topic) return discipline;
    if (discipline && discipline !== "estudio general") return discipline;

    const detected = await detectStudyDiscipline(subject, topic);
    setDiscipline(detected);
    return detected;
  }

  async function handleComplete() {
    if (
      completionMutexRef.current ||
      sessionPersistedRef.current ||
      isCompleting ||
      phase === "complete"
    )
      return;

    completionMutexRef.current = true;

    setIsCompleting(true);
    setIsRunning(false);
    setGamificationWarning(null);
    setDidAwardGamification(false);

    if (!session?.user.id || !block) {
      completionMutexRef.current = false;
      setIsCompleting(false);
      return;
    }

    try {
      const completedAt = new Date().toISOString();
      const { data: insertedSession, error: insertError } = await supabase
        .from("study_sessions")
        .insert({
          user_id: session.user.id,
          study_block_id: block.id,
          subject: block.subject,
          duration_seconds: totalSeconds,
          completed_at: completedAt,
        })
        .select("id")
        .single<{ id: string }>();

      if (insertError || !insertedSession) {
        throw (
          insertError ?? new Error("No se pudo confirmar la sesión registrada")
        );
      }

      sessionPersistedRef.current = true;

      let engagementResult: "created" | "duplicate" | null = null;

      try {
        engagementResult = await trackEngagementEvent({
          userId: session.user.id,
          eventName: "study_session_completed",
          eventKey: `study_session_completed:${insertedSession.id}`,
          sourceTable: "study_sessions",
          sourceId: insertedSession.id,
          occurredAt: completedAt,
          payload: {
            study_session_id: insertedSession.id,
            study_block_id: block.id,
            subject: block.subject,
            duration_seconds: totalSeconds,
          },
        });
      } catch (trackingError) {
        setGamificationWarning(
          "La sesión se guardó, pero no pudimos registrar el evento de gamificación. Intenta de nuevo más tarde.",
        );
        console.warn(
          "No se pudo registrar el evento de engagement de estudio:",
          trackingError,
        );
      }

      if (engagementResult === "created") {
        await addPoints(session.user.id, 5, showAchievement);
        await updateStreak(session.user.id);
        await checkStudyAchievements(session.user.id, showAchievement);
        await checkStreakAchievements(session.user.id, showAchievement);
        setDidAwardGamification(true);
      }

      if (engagementResult === "duplicate") {
        setGamificationWarning(
          "Esta sesión ya estaba registrada en gamificación. No se volvieron a sumar puntos ni logros.",
        );
        console.warn(
          "Evento de engagement duplicado para sesión de estudio. Se omite suma de puntos/logros.",
        );
      }

      setPhase("complete");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo completar la sesión",
      );
      if (!sessionPersistedRef.current) {
        completionMutexRef.current = false;
      }
    } finally {
      setIsCompleting(false);
      if (!sessionPersistedRef.current) {
        completionMutexRef.current = false;
      }
    }
  }

  async function handleGenerateFlashcards() {
    if (!session?.user.id || !block || !specificTopic.trim()) {
      setError("Necesitas un tema específico para generar flashcards");
      return;
    }

    try {
      setGeneratingFlashcards(true);
      setError(null);

      const generated = await generateFlashcards(
        block.subject,
        specificTopic.trim(),
        8,
      );

      const { data: deckData, error: deckError } = await supabase
        .from("flashcard_decks")
        .insert({
          user_id: session.user.id,
          study_session_id: null,
          subject: block.subject,
          topic: specificTopic.trim(),
        })
        .select("id")
        .single<{ id: string }>();

      if (deckError || !deckData)
        throw deckError ?? new Error("No se pudo crear el mazo");

      const { error: cardsError } = await supabase.from("flashcards").insert(
        generated.map((card) => ({
          deck_id: deckData.id,
          front: card.front,
          back: card.back,
          difficulty_rating: null,
          review_count: 0,
        })),
      );

      if (cardsError) throw cardsError;

      router.push(`/flashcards?deckId=${deckData.id}`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudieron generar flashcards",
      );
    } finally {
      setGeneratingFlashcards(false);
    }
  }

  async function pickImageFromCamera(
    onSelect: (value: StudyAttachment) => void,
  ) {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError("Permiso de cámara denegado");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.7,
      base64: true,
    });

    if (result.canceled || result.assets.length === 0) return;

    const asset = result.assets[0];
    const mimeType = asset.mimeType || "image/jpeg";
    const base64 = asset.base64 || (await uriToBase64(asset.uri));

    onSelect({
      name: asset.fileName || "foto.jpg",
      mimeType,
      base64,
      previewUri: asset.uri,
    });
  }

  async function pickImageFromGallery(
    onSelect: (value: StudyAttachment) => void,
  ) {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("Permiso de galería denegado");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      base64: true,
    });

    if (result.canceled || result.assets.length === 0) return;

    const asset = result.assets[0];
    const mimeType = asset.mimeType || "image/jpeg";
    const base64 = asset.base64 || (await uriToBase64(asset.uri));

    onSelect({
      name: asset.fileName || "imagen.jpg",
      mimeType,
      base64,
      previewUri: asset.uri,
    });
  }

  async function pickDocument(onSelect: (value: StudyAttachment) => void) {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "image/*"],
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled || result.assets.length === 0) return;

    const asset = result.assets[0];
    const mimeType = asset.mimeType || "application/pdf";
    const base64 = await uriToBase64(asset.uri);

    onSelect({
      name: asset.name,
      mimeType,
      base64,
      previewUri: mimeType.startsWith("image/") ? asset.uri : undefined,
    });
  }

  async function handleGeneratePlan() {
    if (!block || !specificTopic.trim()) return;

    try {
      setPlanning(true);
      setPlanError(null);
      const detectedDiscipline = await ensureDiscipline();
      const plan = await generateStudySessionPlan(
        block.subject,
        specificTopic.trim(),
        formatDurationMinutes(totalSeconds),
        detectedDiscipline,
        setupAttachment?.base64,
        setupAttachment?.mimeType,
      );
      setStudyPlan(plan);
    } catch (err) {
      setPlanError(
        err instanceof Error ? err.message : "No se pudo generar el plan",
      );
    } finally {
      setPlanning(false);
    }
  }

  async function handleStartSession() {
    if (!specificTopic.trim()) return;

    setPhase("studying");
    setIsRunning(true);

    if (!discipline || discipline === "estudio general") {
      try {
        await ensureDiscipline();
      } catch {
        // Se mantiene el valor por defecto para no bloquear inicio de sesión.
      }
    }
  }

  async function handleAskCompanion() {
    const userText =
      question.trim() ||
      (chatAttachment ? "Ayúdame con este material adjunto." : "");
    if (!userText || !block) return;

    setAsking(true);
    setChatError(null);

    const history = [...messages];
    setMessages((prev) => [...prev, { role: "user", content: userText }]);

    try {
      const detectedDiscipline = await ensureDiscipline();
      const answer = await askStudyCompanion(
        block.subject,
        specificTopic.trim(),
        detectedDiscipline,
        history,
        userText,
        chatAttachment?.base64,
        chatAttachment?.mimeType,
      );

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: answer || "No pude responder por ahora.",
        },
      ]);
      setQuestion("");
      setChatAttachment(null);
    } catch (err) {
      setChatError(
        err instanceof Error ? err.message : "No se pudo consultar a Mochi",
      );
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setAsking(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-purple-50">
        <MochiCharacter mood="thinking" size={96} />
        <Text className="mt-4 text-sm font-semibold text-purple-700">
          Cargando bloque...
        </Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-purple-50 px-6">
        <MochiCharacter mood="sleepy" size={80} />
        <Text className="mt-4 text-center text-sm font-semibold text-red-600">
          {error}
        </Text>
        <TouchableOpacity
          className="mt-6 rounded-2xl bg-purple-500 px-6 py-3"
          onPress={() => router.back()}
        >
          <Text className="font-bold text-white">Volver</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (phase === "complete") {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-purple-50 px-6">
        <MochiCharacter mood="excited" size={120} />
        <Text className="mt-6 text-2xl font-extrabold text-purple-900">
          ¡Bloque completado!
        </Text>
        <Text className="mt-2 text-center text-sm font-semibold text-purple-600">
          {summaryText}
        </Text>
        {gamificationWarning ? (
          <View className="mt-4 w-full rounded-2xl border border-amber-200 bg-amber-50 p-3">
            <Text className="text-center text-sm font-semibold text-amber-700">
              {gamificationWarning}
            </Text>
          </View>
        ) : null}
        {didAwardGamification ? (
          <View className="mt-4 rounded-full bg-yellow-200 px-5 py-2">
            <Text className="font-extrabold text-yellow-900">+5 puntos</Text>
          </View>
        ) : null}
        <TouchableOpacity
          className={`mt-4 rounded-2xl px-6 py-3 ${generatingFlashcards ? "bg-indigo-300" : "bg-indigo-500"}`}
          onPress={() => {
            void handleGenerateFlashcards();
          }}
          disabled={generatingFlashcards}
        >
          <Text className="font-extrabold text-white">
            {generatingFlashcards
              ? "Generando..."
              : "Generar flashcards del tema"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="mt-8 rounded-2xl bg-purple-500 px-8 py-4"
          onPress={() => router.back()}
        >
          <Text className="font-extrabold text-white">Volver al inicio</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <>
      <SafeAreaView className="flex-1 bg-purple-50 px-6">
        <TouchableOpacity
          className="mt-2 flex-row items-center"
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={22} color="#7c3aed" />
          <Text className="ml-1 font-bold text-purple-700">Volver</Text>
        </TouchableOpacity>

        {gamificationWarning ? (
          <View className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3">
            <Text className="text-sm font-semibold text-amber-700">
              {gamificationWarning}
            </Text>
          </View>
        ) : null}

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="mt-4 rounded-3xl border-2 border-purple-200 bg-white p-4">
            <Text className="text-xl font-extrabold text-purple-900">
              {block?.subject}
            </Text>
            <Text className="mt-1 text-xs font-semibold text-purple-600">
              {block?.start_time} - {block?.end_time} ·{" "}
              {formatDurationMinutes(totalSeconds)} min
            </Text>
            {discipline ? (
              <View className="mt-3 self-start rounded-full bg-purple-100 px-3 py-1">
                <Text className="text-xs font-bold text-purple-700">
                  Disciplina: {discipline}
                </Text>
              </View>
            ) : null}
          </View>

          {phase === "setup" ? (
            <View className="mt-4 rounded-3xl border-2 border-purple-200 bg-white p-4">
              <Text className="text-sm font-bold text-purple-800">
                ¿Qué vas a estudiar específicamente hoy?
              </Text>
              <TextInput
                className="mt-2 rounded-2xl border-2 border-purple-200 bg-purple-50 px-4 py-3 text-sm font-semibold text-slate-800"
                placeholder="Ej: Integrales por sustitución y ejercicios tipo examen"
                placeholderTextColor="#a78bfa"
                value={specificTopic}
                onChangeText={setSpecificTopic}
                multiline
              />

              <Text className="mt-4 text-xs font-bold uppercase text-purple-700">
                Adjunto opcional
              </Text>
              <View className="mt-2 flex-row flex-wrap gap-2">
                <TouchableOpacity
                  className="rounded-xl bg-purple-100 px-3 py-2"
                  onPress={() => void pickImageFromCamera(setSetupAttachment)}
                >
                  <Text className="text-xs font-bold text-purple-800">
                    Cámara
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="rounded-xl bg-purple-100 px-3 py-2"
                  onPress={() => void pickImageFromGallery(setSetupAttachment)}
                >
                  <Text className="text-xs font-bold text-purple-800">
                    Galería
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="rounded-xl bg-purple-100 px-3 py-2"
                  onPress={() => void pickDocument(setSetupAttachment)}
                >
                  <Text className="text-xs font-bold text-purple-800">
                    Archivo
                  </Text>
                </TouchableOpacity>
                {setupAttachment ? (
                  <TouchableOpacity
                    className="rounded-xl bg-red-100 px-3 py-2"
                    onPress={() => setSetupAttachment(null)}
                  >
                    <Text className="text-xs font-bold text-red-700">
                      Quitar
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              {setupAttachment ? (
                <View className="mt-3 rounded-2xl border border-purple-200 bg-purple-50 p-3">
                  {setupAttachment.previewUri ? (
                    <Image
                      source={{ uri: setupAttachment.previewUri }}
                      className="h-24 w-full rounded-xl"
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="h-16 items-center justify-center rounded-xl bg-purple-100">
                      <Text className="text-xs font-bold text-purple-700">
                        {getAttachmentLabel(setupAttachment.mimeType)}
                      </Text>
                    </View>
                  )}
                  <Text
                    className="mt-2 text-xs font-semibold text-purple-700"
                    numberOfLines={1}
                  >
                    {setupAttachment.name}
                  </Text>
                </View>
              ) : null}

              <TouchableOpacity
                className={`mt-4 items-center rounded-2xl py-3 ${planning ? "bg-purple-200" : "bg-purple-500"}`}
                onPress={() => void handleGeneratePlan()}
                disabled={planning || !specificTopic.trim()}
              >
                {planning ? (
                  <View className="flex-row items-center">
                    <ActivityIndicator color="white" />
                    <Text className="ml-2 font-bold text-white">
                      Creando plan...
                    </Text>
                  </View>
                ) : (
                  <Text className="font-bold text-white">
                    Pedir plan a Mochi
                  </Text>
                )}
              </TouchableOpacity>

              {planError ? (
                <Text className="mt-2 text-xs font-semibold text-red-600">
                  {planError}
                </Text>
              ) : null}

              {studyPlan ? (
                <View className="mt-4 rounded-2xl border border-purple-200 bg-purple-50 p-3">
                  <Text className="text-sm font-semibold leading-5 text-purple-900">
                    {studyPlan}
                  </Text>
                </View>
              ) : null}

              <TouchableOpacity
                className={`mt-4 items-center rounded-2xl py-3 ${specificTopic.trim() ? "bg-emerald-500" : "bg-emerald-200"}`}
                disabled={!specificTopic.trim()}
                onPress={() => void handleStartSession()}
              >
                <Text className="font-bold text-white">Empezar sesión</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View className="mt-4 rounded-3xl border-2 border-purple-200 bg-white p-4">
                <Text className="text-xs font-bold uppercase text-purple-700">
                  Tema actual
                </Text>
                <Text className="mt-1 text-base font-extrabold text-purple-900">
                  {specificTopic}
                </Text>
              </View>

              <View className="mt-5 items-center">
                <View
                  className={`h-52 w-52 items-center justify-center rounded-full border-8 ${colorBorderMap[blockColor] ?? "border-purple-300"} ${colorMap[blockColor] ?? "bg-purple-100"}`}
                >
                  <Text className="text-5xl font-extrabold text-purple-900">
                    {formatTime(timeLeft)}
                  </Text>
                  <Text className="mt-1 text-sm font-semibold text-purple-500">
                    restante
                  </Text>
                </View>
              </View>

              <View className="mt-6">
                <View className="h-3 w-full overflow-hidden rounded-full bg-purple-100">
                  <Animated.View
                    style={progressStyle}
                    className="h-3 rounded-full bg-purple-500"
                  />
                </View>
                <View className="mt-2 flex-row justify-between">
                  <Text className="text-xs font-semibold text-purple-400">
                    0:00
                  </Text>
                  <Text className="text-xs font-semibold text-purple-400">
                    {formatTime(totalSeconds)}
                  </Text>
                </View>
              </View>

              <View className="mt-8 items-center">
                <TouchableOpacity
                  className="h-16 w-16 items-center justify-center rounded-full bg-purple-500"
                  onPress={() => setIsRunning((r) => !r)}
                >
                  <Ionicons
                    name={isRunning ? "pause" : "play"}
                    size={28}
                    color="white"
                  />
                </TouchableOpacity>
                <Text className="mt-3 text-sm font-semibold text-purple-500">
                  {isRunning ? "Pausar" : "Iniciar"}
                </Text>
              </View>

              <TouchableOpacity
                className={`mb-24 mt-8 items-center rounded-2xl border-2 border-purple-200 py-3 ${isCompleting ? "bg-purple-100" : "bg-white"}`}
                onPress={() => void handleComplete()}
                disabled={isCompleting}
              >
                <Text className="font-bold text-purple-700">
                  {isCompleting ? "Guardando..." : "Marcar como completado"}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>

        {phase === "studying" ? (
          <TouchableOpacity
            className="absolute bottom-8 right-6 flex-row items-center rounded-full bg-purple-600 px-4 py-3"
            onPress={() => setShowCompanion(true)}
          >
            <Ionicons name="sparkles" size={16} color="white" />
            <Text className="ml-2 text-sm font-bold text-white">
              Preguntarle a Mochi
            </Text>
          </TouchableOpacity>
        ) : null}
      </SafeAreaView>

      <Modal
        visible={showCompanion}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCompanion(false)}
      >
        <View className="flex-1 justify-end bg-black/40">
          <View className="max-h-[90%] rounded-t-3xl bg-white px-5 pb-10 pt-5">
            <View className="mb-2 h-1.5 w-16 self-center rounded-full bg-slate-200" />

            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-base font-extrabold text-purple-900">
                  Compañera de estudio
                </Text>
                <Text
                  className="text-xs font-semibold text-purple-600"
                  numberOfLines={1}
                >
                  {specificTopic}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowCompanion(false)}>
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView
              className="mt-3 max-h-[45%]"
              showsVerticalScrollIndicator={false}
            >
              {messages.length === 0 ? (
                <View className="items-center rounded-2xl border border-purple-200 bg-purple-50 p-4">
                  <MochiCharacter mood="happy" size={56} />
                  <Text className="mt-2 text-center text-xs font-semibold text-purple-700">
                    Estoy lista para ayudarte con teoría, ejercicios, dudas o
                    resúmenes.
                  </Text>
                </View>
              ) : (
                messages.map((message, index) => (
                  <View
                    key={`${message.role}-${index}`}
                    className={`mb-2 rounded-2xl p-3 ${message.role === "assistant" ? "bg-purple-100" : "bg-slate-100"}`}
                  >
                    <Text className="text-sm font-semibold text-slate-800">
                      {message.content}
                    </Text>
                  </View>
                ))
              )}
              {asking ? (
                <View className="mb-2 flex-row items-center rounded-2xl bg-purple-100 p-3">
                  <ActivityIndicator color="#7c3aed" />
                  <Text className="ml-2 text-xs font-semibold text-purple-700">
                    Mochi está pensando...
                  </Text>
                </View>
              ) : null}
            </ScrollView>

            <View className="mt-3 flex-row flex-wrap gap-2">
              <TouchableOpacity
                className="rounded-xl bg-purple-100 px-3 py-2"
                onPress={() => void pickImageFromCamera(setChatAttachment)}
              >
                <Text className="text-xs font-bold text-purple-800">
                  Cámara
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="rounded-xl bg-purple-100 px-3 py-2"
                onPress={() => void pickImageFromGallery(setChatAttachment)}
              >
                <Text className="text-xs font-bold text-purple-800">
                  Galería
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="rounded-xl bg-purple-100 px-3 py-2"
                onPress={() => void pickDocument(setChatAttachment)}
              >
                <Text className="text-xs font-bold text-purple-800">
                  Archivo
                </Text>
              </TouchableOpacity>
              {chatAttachment ? (
                <TouchableOpacity
                  className="rounded-xl bg-red-100 px-3 py-2"
                  onPress={() => setChatAttachment(null)}
                >
                  <Text className="text-xs font-bold text-red-700">Quitar</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {chatAttachment ? (
              <View className="mt-2 rounded-xl border border-purple-200 bg-purple-50 px-3 py-2">
                <Text
                  className="text-xs font-semibold text-purple-700"
                  numberOfLines={1}
                >
                  {chatAttachment.name}
                </Text>
              </View>
            ) : null}

            <TextInput
              className="mt-3 rounded-2xl border-2 border-purple-200 bg-purple-50 px-4 py-3 text-sm font-semibold text-slate-800"
              placeholder="Escribe tu duda o pide un resumen..."
              placeholderTextColor="#a78bfa"
              value={question}
              onChangeText={setQuestion}
              multiline
            />

            {chatError ? (
              <Text className="mt-2 text-xs font-semibold text-red-600">
                {chatError}
              </Text>
            ) : null}

            <TouchableOpacity
              className={`mt-3 items-center rounded-2xl py-3 ${(question.trim() || chatAttachment) && !asking ? "bg-purple-500" : "bg-purple-200"}`}
              onPress={() => void handleAskCompanion()}
              disabled={!(question.trim() || chatAttachment) || asking}
            >
              <Text className="font-bold text-white">Enviar a Mochi</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

export default StudyTimerScreen;
