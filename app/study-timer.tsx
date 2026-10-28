import { reportError } from "@/src/shared/lib/observability/reportError";
import { track } from "@/src/shared/lib/observability/analytics";
import { tc } from "@/src/shared/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppState, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useAchievement } from "@/src/core/providers/AchievementContext";
import { useSession } from "@/src/core/providers/SessionContext";
import { IconCtaButton } from "@/src/shared/components/IconCtaButton";
import { MochiCharacter } from "@/src/shared/components/MochiCharacter";
import {
  askStudyCompanion,
  detectStudyDiscipline,
  generateFlashcards,
  generateStudySessionPlan,
} from "@/src/shared/lib/ai";
import { buildAiLimitMessage, requestAiUsage } from "@/src/shared/lib/aiCredits";
import {
  addPoints,
  checkStreakAchievements,
  checkStudyAchievements,
  trackEngagementEvent,
  updateStreak,
} from "@/src/shared/lib/gamification";
import { supabase } from "@/src/shared/lib/supabase";
import { sendPomodoroPhaseNotification } from "@/src/shared/lib/notifications";
import type { StudyBlock } from "@/src/shared/types/database";
import {
  pickDocument,
  pickImageFromCamera,
  pickImageFromGallery,
} from "@/src/features/study/timer/attachments";
import { StudyCompanionModal } from "@/src/features/study/timer/components/StudyCompanionModal";
import { StudyCompleteView } from "@/src/features/study/timer/components/StudyCompleteView";
import { StudySetupView } from "@/src/features/study/timer/components/StudySetupView";
import { StudyTimerView } from "@/src/features/study/timer/components/StudyTimerView";
import {
  POMODORO_BREAK_SECONDS,
  POMODORO_FOCUS_SECONDS,
  calcDurationSeconds,
  formatDurationMinutes,
  summarizeSession,
} from "@/src/features/study/timer/helpers";
import type {
  PomodoroPhase,
  StudyAttachment,
  StudyMessage,
  StudyPhase,
  TimerMode,
} from "@/src/features/study/timer/types";

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
  const [gamificationWarning, setGamificationWarning] = useState<string | null>(null);
  const [didAwardGamification, setDidAwardGamification] = useState(false);
  const [timerMode, setTimerMode] = useState<TimerMode>("regular");
  const [pomodoroPhase, setPomodoroPhase] = useState<PomodoroPhase>("focus");
  const [pomodoroCycle, setPomodoroCycle] = useState(1);

  const [phase, setPhase] = useState<StudyPhase>("setup");
  const [specificTopic, setSpecificTopic] = useState("");
  const [discipline, setDiscipline] = useState("estudio general");
  const [setupAttachment, setSetupAttachment] = useState<StudyAttachment | null>(null);
  const [studyPlan, setStudyPlan] = useState("");
  const [planning, setPlanning] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);

  const [showCompanion, setShowCompanion] = useState(false);
  const [messages, setMessages] = useState<StudyMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [chatAttachment, setChatAttachment] = useState<StudyAttachment | null>(null);
  const [asking, setAsking] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeLeftRef = useRef(0);
  timeLeftRef.current = timeLeft;
  const completionMutexRef = useRef(false);
  const sessionPersistedRef = useRef(false);
  const progress = useSharedValue(1);

  const activeTimerDuration = useMemo(() => {
    if (timerMode !== "pomodoro") {
      return totalSeconds;
    }

    return pomodoroPhase === "focus" ? POMODORO_FOCUS_SECONDS : POMODORO_BREAK_SECONDS;
  }, [pomodoroPhase, timerMode, totalSeconds]);

  const blockColor = block?.color ?? "purple";
  const summaryText = useMemo(() => summarizeSession(specificTopic), [specificTopic]);

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

    // Tiempo absoluto: el temporizador sigue correcto aunque la app pase a segundo plano.
    const endAt = Date.now() + timeLeftRef.current * 1000;

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining > 0) return;
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timerMode === "pomodoro") {
        void handlePomodoroPhaseEnd();
        return;
      }
      void handleComplete();
    };

    intervalRef.current = setInterval(tick, 500);
    const appStateSub = AppState.addEventListener("change", (next) => {
      if (next === "active") tick();
    });

    return () => {
      appStateSub.remove();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- las dependencias omitidas son estables o se excluyen a propósito para no reiniciar el efecto
  }, [isRunning, phase, timerMode]);

  useEffect(() => {
    if (activeTimerDuration > 0) {
      progress.value = withTiming(timeLeft / activeTimerDuration, {
        duration: 900,
        easing: Easing.linear,
      });
    }
  }, [activeTimerDuration, progress, timeLeft]);

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
        throw insertError ?? new Error("No se pudo confirmar la sesión registrada");
      }

      sessionPersistedRef.current = true;
      track("study_session_completed", { minutes: formatDurationMinutes(totalSeconds) });

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
        reportError(trackingError, { scope: "study-timer/engagement" });
      }

      if (engagementResult === "created") {
        await addPoints(session.user.id, "study_session", showAchievement);
        await updateStreak(session.user.id);
        await checkStudyAchievements(session.user.id, showAchievement);
        await checkStreakAchievements(session.user.id, showAchievement);
        setDidAwardGamification(true);
      }

      if (engagementResult === "duplicate") {
        setGamificationWarning(
          "Esta sesión ya estaba registrada en gamificación. No se volvieron a sumar puntos ni logros.",
        );
        // Evento duplicado: se omite la suma de puntos y logros.
      }

      setPhase("complete");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo completar la sesión");
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

  async function handlePomodoroPhaseEnd() {
    setIsRunning(false);

    const isFocusPhase = pomodoroPhase === "focus";
    const nextPhase: PomodoroPhase = isFocusPhase ? "break" : "focus";
    const nextCycle = isFocusPhase ? pomodoroCycle : pomodoroCycle + 1;

    setPomodoroPhase(nextPhase);
    if (!isFocusPhase) {
      setPomodoroCycle((current) => current + 1);
    }

    setTimeLeft(nextPhase === "focus" ? POMODORO_FOCUS_SECONDS : POMODORO_BREAK_SECONDS);

    try {
      await sendPomodoroPhaseNotification(nextPhase, nextCycle);
    } catch (error) {
      // Si falla la notificación no detenemos la sesión.
      reportError(error, { scope: "app/study-timer.tsx" });
    }
  }

  async function handleGenerateFlashcards() {
    if (!session?.user.id || !block || !specificTopic.trim()) {
      setError("Necesitas un tema específico para generar flashcards");
      return;
    }

    try {
      const usage = await requestAiUsage({
        reason: "ai_flashcards",
        sourceRef: "study_flashcards",
      });

      if (!usage.allowed) {
        setError(buildAiLimitMessage(usage.reason));
        return;
      }

      setGeneratingFlashcards(true);
      setError(null);

      const generated = await generateFlashcards(block.subject, specificTopic.trim(), 8);

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

      if (deckError || !deckData) throw deckError ?? new Error("No se pudo crear el mazo");

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
      setError(err instanceof Error ? err.message : "No se pudieron generar flashcards");
    } finally {
      setGeneratingFlashcards(false);
    }
  }

  async function handleGeneratePlan() {
    if (!block || !specificTopic.trim()) return;

    try {
      const usage = await requestAiUsage({
        reason: "ai_study_plan",
        sourceRef: "study_plan",
      });

      if (!usage.allowed) {
        setPlanError(buildAiLimitMessage(usage.reason));
        return;
      }

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
      setPlanError(err instanceof Error ? err.message : "No se pudo generar el plan");
    } finally {
      setPlanning(false);
    }
  }

  async function handleStartSession() {
    if (!specificTopic.trim()) return;

    setPhase("studying");
    if (timerMode === "pomodoro") {
      setPomodoroPhase("focus");
      setPomodoroCycle(1);
      setTimeLeft(POMODORO_FOCUS_SECONDS);
    } else {
      setTimeLeft(totalSeconds);
    }
    setIsRunning(true);

    if (!discipline || discipline === "estudio general") {
      try {
        await ensureDiscipline();
      } catch (error) {
        // Se mantiene el valor por defecto para no bloquear inicio de sesión.
        reportError(error, { scope: "app/study-timer.tsx" });
      }
    }
  }

  function handleTimerModeChange(mode: TimerMode) {
    if (mode === timerMode) return;

    setTimerMode(mode);
    setIsRunning(false);

    if (mode === "pomodoro") {
      setPomodoroPhase("focus");
      setPomodoroCycle(1);
      setTimeLeft(POMODORO_FOCUS_SECONDS);
      return;
    }

    setTimeLeft(totalSeconds);
  }

  async function handleAskCompanion() {
    const userText =
      question.trim() || (chatAttachment ? "Ayúdame con este material adjunto." : "");
    if (!userText || !block) return;

    const usage = await requestAiUsage({
      reason: "ai_chat",
      sourceRef: "study_companion",
    });

    if (!usage.allowed) {
      setChatError(buildAiLimitMessage(usage.reason));
      return;
    }

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
      setChatError(err instanceof Error ? err.message : "No se pudo consultar a Mochi");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setAsking(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-purple-50 dark:bg-purple-950">
        <MochiCharacter mood="thinking" size={96} />
        <Text className="mt-4 text-sm font-semibold text-purple-700 dark:text-purple-300">
          Cargando bloque...
        </Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-purple-50 px-6 dark:bg-purple-950">
        <MochiCharacter mood="sleepy" size={80} />
        <Text className="mt-4 text-center text-sm font-semibold text-red-600 dark:text-red-400">
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
      <StudyCompleteView
        summaryText={summaryText}
        gamificationWarning={gamificationWarning}
        didAwardGamification={didAwardGamification}
        generatingFlashcards={generatingFlashcards}
        onGenerateFlashcards={() => void handleGenerateFlashcards()}
      />
    );
  }

  return (
    <>
      <SafeAreaView className="flex-1 bg-canvas px-6 dark:bg-purple-950">
        <TouchableOpacity className="mt-2 flex-row items-center" onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={tc("#7c3aed")} />
          <Text className="ml-1 font-bold text-purple-700 dark:text-purple-300">Volver</Text>
        </TouchableOpacity>

        {gamificationWarning ? (
          <View className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950">
            <Text className="text-sm font-semibold text-amber-700 dark:text-amber-300">
              {gamificationWarning}
            </Text>
          </View>
        ) : null}

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="mt-4 rounded-3xl border-2 border-purple-200 bg-white p-4 dark:border-purple-800 dark:bg-surface">
            <Text className="text-xl font-extrabold text-purple-900 dark:text-purple-100">
              {block?.subject}
            </Text>
            <Text className="mt-1 text-xs font-semibold text-purple-600 dark:text-purple-400">
              {block?.start_time} - {block?.end_time} · {formatDurationMinutes(totalSeconds)} min
            </Text>
            {discipline ? (
              <View className="mt-3 self-start rounded-full bg-purple-100 px-3 py-1 dark:bg-purple-900">
                <Text className="text-xs font-bold text-purple-700 dark:text-purple-300">
                  Disciplina: {discipline}
                </Text>
              </View>
            ) : null}
          </View>

          {phase === "setup" ? (
            <StudySetupView
              timerMode={timerMode}
              onTimerModeChange={handleTimerModeChange}
              specificTopic={specificTopic}
              onSpecificTopicChange={setSpecificTopic}
              setupAttachment={setupAttachment}
              onPickCamera={() => void pickImageFromCamera(setSetupAttachment, setError)}
              onPickGallery={() => void pickImageFromGallery(setSetupAttachment, setError)}
              onPickDocument={() => void pickDocument(setSetupAttachment)}
              onRemoveAttachment={() => setSetupAttachment(null)}
              planning={planning}
              planError={planError}
              studyPlan={studyPlan}
              onGeneratePlan={() => void handleGeneratePlan()}
              onStartSession={() => void handleStartSession()}
            />
          ) : (
            <StudyTimerView
              specificTopic={specificTopic}
              timerMode={timerMode}
              pomodoroCycle={pomodoroCycle}
              pomodoroPhase={pomodoroPhase}
              blockColor={blockColor}
              timeLeft={timeLeft}
              activeTimerDuration={activeTimerDuration}
              progressStyle={progressStyle}
              isRunning={isRunning}
              isCompleting={isCompleting}
              onToggleRunning={() => setIsRunning((r) => !r)}
              onComplete={() => void handleComplete()}
            />
          )}
        </ScrollView>

        {phase === "studying" ? (
          <View className="absolute bottom-8 right-6">
            <IconCtaButton
              label="Preguntarle a Mochi"
              onPress={() => setShowCompanion(true)}
              iconName="sparkles"
              iconColor={tc("#ffffff")}
              iconSize={16}
              containerClassName="w-auto rounded-full bg-purple-600 px-4 py-3"
              textClassName="text-white"
            />
          </View>
        ) : null}
      </SafeAreaView>

      <StudyCompanionModal
        visible={showCompanion}
        onClose={() => setShowCompanion(false)}
        specificTopic={specificTopic}
        messages={messages}
        asking={asking}
        question={question}
        onQuestionChange={setQuestion}
        chatAttachment={chatAttachment}
        chatError={chatError}
        onPickCamera={() => void pickImageFromCamera(setChatAttachment, setError)}
        onPickGallery={() => void pickImageFromGallery(setChatAttachment, setError)}
        onPickDocument={() => void pickDocument(setChatAttachment)}
        onRemoveAttachment={() => setChatAttachment(null)}
        onSend={() => void handleAskCompanion()}
      />
    </>
  );
}

export default StudyTimerScreen;
