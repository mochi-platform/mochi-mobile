import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { supabase } from "@/src/shared/lib/supabase";
import { useSession } from "@/src/core/providers/SessionContext";
import { useAchievement } from "@/src/core/providers/AchievementContext";
import { MochiCharacter } from "@/src/shared/components/MochiCharacter";
import {
  addPoints,
  trackEngagementEvent,
  unlockAchievement,
} from "@/src/shared/lib/gamification";
import {
  cancelExamReminder,
  loadExamReminderDays,
  scheduleExamReminder,
} from "@/src/shared/lib/notifications";
import {
  createDeviceCalendarEvent,
  getDateFromISOAndTime,
} from "@/src/shared/lib/deviceCalendar";

type TabId = "results" | "upcoming";

type ExamResultItem = {
  id: string;
  subject: string;
  grade: number | null;
  max_grade: number | null;
  exam_date: string;
  notes: string | null;
};

type UpcomingExamItem = {
  id: string;
  subject: string;
  exam_date: string;
  preparation_notes: string | null;
};

type MissionStepKey =
  | "diagnosis"
  | "guidedPractice"
  | "mockExam"
  | "finalReview";

type CalmChecklistState = {
  pendingClosure: boolean;
  miniReview: boolean;
  rest: boolean;
};

type MissionState = Record<MissionStepKey, boolean>;

type ExamPreparationState = {
  calm: CalmChecklistState;
  mission: MissionState;
};

const DEFAULT_CALM_CHECKLIST: CalmChecklistState = {
  pendingClosure: false,
  miniReview: false,
  rest: false,
};

const DEFAULT_MISSION: MissionState = {
  diagnosis: false,
  guidedPractice: false,
  mockExam: false,
  finalReview: false,
};

const MISSION_ORDER: Array<{ key: MissionStepKey; label: string }> = [
  { key: "diagnosis", label: "Diagnóstico" },
  { key: "guidedPractice", label: "Práctica guiada" },
  { key: "mockExam", label: "Simulacro" },
  { key: "finalReview", label: "Repaso final" },
];

const CALM_ORDER: Array<{ key: keyof CalmChecklistState; label: string }> = [
  { key: "pendingClosure", label: "Cierre de pendientes" },
  { key: "miniReview", label: "Mini repaso" },
  { key: "rest", label: "Descanso" },
];

const EXAM_REMINDER_OPTIONS = [7, 3, 1] as const;

function createDefaultPreparationState(): ExamPreparationState {
  return {
    calm: { ...DEFAULT_CALM_CHECKLIST },
    mission: { ...DEFAULT_MISSION },
  };
}

function buildExamPreparationKey(userId: string, examId: string): string {
  return `exam:preparation:${userId}:${examId}`;
}

export function ExamLogScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useSession();
  const { showAchievement } = useAchievement();

  const [activeTab, setActiveTab] = useState<TabId>("results");

  const [subject, setSubject] = useState("");
  const [grade, setGrade] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedUpcomingId, setSelectedUpcomingId] = useState<string | null>(
    null,
  );

  const [upcomingSubject, setUpcomingSubject] = useState("");
  const [upcomingDate, setUpcomingDate] = useState("");
  const [upcomingNotes, setUpcomingNotes] = useState("");
  const [selectedReminderDays, setSelectedReminderDays] = useState<number[]>([
    7,
    3,
    1,
  ]);
  const [addUpcomingToCalendar, setAddUpcomingToCalendar] = useState(true);

  const [examHistory, setExamHistory] = useState<ExamResultItem[]>([]);
  const [upcomingExams, setUpcomingExams] = useState<UpcomingExamItem[]>([]);
  const [upcomingReminderMap, setUpcomingReminderMap] = useState<
    Record<string, number[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingUpcoming, setSavingUpcoming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gamificationWarning, setGamificationWarning] = useState<string | null>(
    null,
  );
  const [prepStates, setPrepStates] = useState<
    Record<string, ExamPreparationState>
  >({});
  const [prepLoading, setPrepLoading] = useState(false);
  const [prepError, setPrepError] = useState<string | null>(null);
  const saveResultMutexRef = useRef(false);

  const today = new Date().toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const todayISO = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const loadExams = useCallback(async () => {
    if (!session?.user.id) {
      setExamHistory([]);
      setUpcomingExams([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [historyRes, upcomingRes] = await Promise.all([
        supabase
          .from("exam_logs")
          .select("id, subject, grade, max_grade, exam_date, notes")
          .eq("user_id", session.user.id)
          .or("is_upcoming.is.false,is_upcoming.is.null")
          .order("exam_date", { ascending: false }),
        supabase
          .from("exam_logs")
          .select("id, subject, exam_date, preparation_notes")
          .eq("user_id", session.user.id)
          .gte("exam_date", todayISO)
          .eq("is_upcoming", true)
          .order("exam_date", { ascending: true }),
      ]);

      if (historyRes.error) throw historyRes.error;
      if (upcomingRes.error) throw upcomingRes.error;

      setExamHistory((historyRes.data as ExamResultItem[] | null) ?? []);
      setUpcomingExams((upcomingRes.data as UpcomingExamItem[] | null) ?? []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo cargar la información de exámenes",
      );
      setExamHistory([]);
      setUpcomingExams([]);
    } finally {
      setLoading(false);
    }
  }, [session?.user.id, todayISO]);

  useFocusEffect(
    useCallback(() => {
      void loadExams();
    }, [loadExams]),
  );

  function formatExamDate(value: string): string {
    return new Intl.DateTimeFormat("es-ES", {
      day: "numeric",
      month: "short",
    })
      .format(new Date(`${value}T00:00:00`))
      .replace(".", "")
      .toLowerCase();
  }

  function getResultBadge(
    gradeValue: number,
    maxGrade: number,
  ): { label: string; className: string } {
    const percentage = gradeValue / maxGrade;

    if (percentage >= 0.9) {
      return { label: "Excelente", className: "bg-green-200 text-green-900" };
    }

    if (percentage >= 0.7) {
      return { label: "Aprobado", className: "bg-yellow-200 text-yellow-900" };
    }

    return { label: "Reprobado", className: "bg-red-100 text-red-700" };
  }

  function getDaysUntil(value: string): number {
    const start = new Date(`${todayISO}T00:00:00`).getTime();
    const end = new Date(`${value}T00:00:00`).getTime();
    return Math.round((end - start) / (1000 * 60 * 60 * 24));
  }

  function getUpcomingLabel(value: string): string {
    const days = getDaysUntil(value);
    if (days <= 0) return "¡Hoy!";
    if (days === 1) return "Mañana";
    return `En ${days} días`;
  }

  function formatReminderDays(days: number[]): string {
    if (days.length === 0) return "Sin recordatorios";

    if (days.length === 1) {
      return days[0] === 1 ? "1 día antes" : `${days[0]} días antes`;
    }

    const sorted = [...days].sort((left, right) => right - left);
    const allButLast = sorted.slice(0, -1).join(", ");
    const last = sorted[sorted.length - 1];
    return `${allButLast} y ${last} días antes`;
  }

  useEffect(() => {
    if (upcomingExams.length === 0) {
      setUpcomingReminderMap({});
      return;
    }

    let mounted = true;

    void (async () => {
      const entries = await Promise.all(
        upcomingExams.map(async (exam) => {
          const days = await loadExamReminderDays(exam.id);
          return [exam.id, days] as const;
        }),
      );

      if (!mounted) return;

      const nextReminderMap: Record<string, number[]> = {};
      entries.forEach(([examId, days]) => {
        nextReminderMap[examId] = days;
      });
      setUpcomingReminderMap(nextReminderMap);
    })();

    return () => {
      mounted = false;
    };
  }, [upcomingExams]);

  useEffect(() => {
    if (!session?.user.id || upcomingExams.length === 0) {
      setPrepStates({});
      setPrepLoading(false);
      setPrepError(null);
      return;
    }

    void (async () => {
      try {
        setPrepLoading(true);
        setPrepError(null);

        const keys = upcomingExams.map((exam) =>
          buildExamPreparationKey(session.user.id, exam.id),
        );
        const stored = await AsyncStorage.multiGet(keys);

        const nextState: Record<string, ExamPreparationState> = {};

        upcomingExams.forEach((exam, index) => {
          const value = stored[index]?.[1];

          if (!value) {
            nextState[exam.id] = createDefaultPreparationState();
            return;
          }

          try {
            const parsed = JSON.parse(value) as Partial<ExamPreparationState>;
            nextState[exam.id] = {
              calm: {
                pendingClosure: Boolean(parsed.calm?.pendingClosure),
                miniReview: Boolean(parsed.calm?.miniReview),
                rest: Boolean(parsed.calm?.rest),
              },
              mission: {
                diagnosis: Boolean(parsed.mission?.diagnosis),
                guidedPractice: Boolean(parsed.mission?.guidedPractice),
                mockExam: Boolean(parsed.mission?.mockExam),
                finalReview: Boolean(parsed.mission?.finalReview),
              },
            };
          } catch {
            nextState[exam.id] = createDefaultPreparationState();
          }
        });

        setPrepStates(nextState);
      } catch {
        setPrepError("No se pudo cargar el progreso del cofre y la misión");
      } finally {
        setPrepLoading(false);
      }
    })();
  }, [session?.user.id, upcomingExams]);

  const persistExamPreparation = useCallback(
    async (examId: string, data: ExamPreparationState) => {
      if (!session?.user.id) return;

      try {
        await AsyncStorage.setItem(
          buildExamPreparationKey(session.user.id, examId),
          JSON.stringify(data),
        );
        setPrepError(null);
      } catch {
        setPrepError("No se pudo guardar el progreso del cofre y la misión");
      }
    },
    [session?.user.id],
  );

  const getPrepState = useCallback(
    (examId: string): ExamPreparationState =>
      prepStates[examId] ?? createDefaultPreparationState(),
    [prepStates],
  );

  const toggleCalmStep = useCallback(
    (examId: string, step: keyof CalmChecklistState) => {
      const current = getPrepState(examId);
      const updated: ExamPreparationState = {
        calm: {
          ...current.calm,
          [step]: !current.calm[step],
        },
        mission: {
          ...current.mission,
        },
      };

      setPrepStates((prev) => ({
        ...prev,
        [examId]: updated,
      }));

      void persistExamPreparation(examId, updated);
    },
    [getPrepState, persistExamPreparation],
  );

  const toggleMissionStep = useCallback(
    (examId: string, step: MissionStepKey) => {
      const current = getPrepState(examId);
      const updated: ExamPreparationState = {
        calm: {
          ...current.calm,
        },
        mission: {
          ...current.mission,
          [step]: !current.mission[step],
        },
      };

      setPrepStates((prev) => ({
        ...prev,
        [examId]: updated,
      }));

      void persistExamPreparation(examId, updated);
    },
    [getPrepState, persistExamPreparation],
  );

  function getMissionProgress(mission: MissionState): number {
    const completed = MISSION_ORDER.reduce(
      (count, step) => count + (mission[step.key] ? 1 : 0),
      0,
    );
    return Math.round((completed / MISSION_ORDER.length) * 100);
  }

  function getNextMissionStep(mission: MissionState): string {
    const pendingStep = MISSION_ORDER.find((step) => !mission[step.key]);
    return pendingStep ? pendingStep.label : "Misión completada";
  }

  async function handleSaveResult() {
    if (saving || saveResultMutexRef.current) return;

    saveResultMutexRef.current = true;

    if (!subject.trim()) {
      setError("Por favor ingresa la materia");
      saveResultMutexRef.current = false;
      return;
    }

    const gradeNum = parseFloat(grade);
    if (Number.isNaN(gradeNum) || gradeNum < 0 || gradeNum > 10) {
      setError("La nota debe ser un número entre 0 y 10");
      saveResultMutexRef.current = false;
      return;
    }

    if (!session?.user.id) {
      setError("No hay sesión activa");
      saveResultMutexRef.current = false;
      return;
    }

    setSaving(true);
    setError(null);
    setGamificationWarning(null);

    try {
      const occurredAt = new Date().toISOString();
      let examLogId = selectedUpcomingId;

      if (selectedUpcomingId) {
        const { error: updateError } = await supabase
          .from("exam_logs")
          .update({
            subject: subject.trim(),
            grade: gradeNum,
            max_grade: 10,
            notes: notes.trim() || null,
            is_upcoming: false,
          })
          .eq("id", selectedUpcomingId)
          .eq("user_id", session.user.id);

        if (updateError) throw updateError;

        try {
          await cancelExamReminder(selectedUpcomingId);
        } catch {
          // No bloqueamos el guardado del resultado por fallas de notificación.
        }
      } else {
        const { data: insertedExam, error: insertError } = await supabase
          .from("exam_logs")
          .insert({
            user_id: session.user.id,
            subject: subject.trim(),
            grade: gradeNum,
            max_grade: 10,
            notes: notes.trim() || null,
            exam_date: todayISO,
            is_upcoming: false,
          })
          .select("id")
          .single<{ id: string }>();

        if (insertError || !insertedExam) {
          throw (
            insertError ??
            new Error("No se pudo confirmar el resultado registrado")
          );
        }

        examLogId = insertedExam.id;
      }

      let engagementResult: "created" | "duplicate" | null = null;

      if (examLogId) {
        try {
          engagementResult = await trackEngagementEvent({
            userId: session.user.id,
            eventName: "exam_result_logged",
            eventKey: `exam_result_logged:${examLogId}`,
            sourceTable: "exam_logs",
            sourceId: examLogId,
            occurredAt,
            payload: {
              exam_log_id: examLogId,
              subject: subject.trim(),
              grade: gradeNum,
              max_grade: 10,
              is_upcoming_source: Boolean(selectedUpcomingId),
            },
          });
        } catch (trackingError) {
          setGamificationWarning(
            "El resultado se guardó, pero no pudimos registrar el evento de gamificación. Intenta de nuevo más tarde.",
          );
          console.warn(
            "No se pudo registrar el evento de engagement de examen:",
            trackingError,
          );
        }
      }

      const percentage = gradeNum / 10;
      if (percentage >= 0.7 && engagementResult === "created") {
        await addPoints(session.user.id, 20, showAchievement);
        const unlockedExam = await unlockAchievement(
          session.user.id,
          "exam_ace",
        );
        if (unlockedExam) showAchievement(unlockedExam);
      }

      if (percentage >= 0.7 && engagementResult === "duplicate") {
        setGamificationWarning(
          "Este resultado ya estaba registrado en gamificación. No se volvieron a sumar puntos para evitar duplicados.",
        );
        console.warn(
          "Evento de engagement duplicado para resultado de examen. Se omite suma de puntos/logros.",
        );
      }

      setSubject("");
      setGrade("");
      setNotes("");
      setSelectedUpcomingId(null);
      await loadExams();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al guardar el resultado",
      );
    } finally {
      setSaving(false);
      saveResultMutexRef.current = false;
    }
  }

  async function handleSaveUpcoming() {
    if (!upcomingSubject.trim()) {
      setError("Por favor ingresa la materia del próximo examen");
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(upcomingDate)) {
      setError("Usa fecha en formato AAAA-MM-DD");
      return;
    }

    if (upcomingDate < todayISO) {
      setError("La fecha debe ser hoy o futura");
      return;
    }

    if (!session?.user.id) {
      setError("No hay sesión activa");
      return;
    }

    if (selectedReminderDays.length === 0) {
      setError("Selecciona al menos un recordatorio (7, 3 o 1 días)");
      return;
    }

    setSavingUpcoming(true);
    setError(null);
    setGamificationWarning(null);

    let createdExam: { id: string; subject: string; exam_date: string } | null =
      null;

    try {
      const { data, error: insertError } = await supabase
        .from("exam_logs")
        .insert({
          user_id: session.user.id,
          subject: upcomingSubject.trim(),
          exam_date: upcomingDate,
          grade: null,
          max_grade: null,
          notes: null,
          preparation_notes: upcomingNotes.trim() || null,
          is_upcoming: true,
        })
        .select("id, subject, exam_date")
        .single();

      if (insertError) throw insertError;

      createdExam = data as { id: string; subject: string; exam_date: string };
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo guardar el examen próximo",
      );
      setSavingUpcoming(false);
      return;
    }

    if (createdExam) {
      const warnings: string[] = [];

      try {
        await scheduleExamReminder(
          createdExam.id,
          createdExam.subject,
          createdExam.exam_date,
          { daysBefore: selectedReminderDays },
        );
      } catch {
        warnings.push("No pudimos programar todos los recordatorios.");
      }

      if (addUpcomingToCalendar) {
        try {
          const startDate = getDateFromISOAndTime(createdExam.exam_date, "08:00");
          const endDate = getDateFromISOAndTime(createdExam.exam_date, "10:00");

          await createDeviceCalendarEvent({
            title: `Examen: ${createdExam.subject}`,
            startDate,
            endDate,
            notes: upcomingNotes.trim() || "Evento creado desde Mochi",
            alarmsMinutesBefore: selectedReminderDays.map(
              (days) => days * 24 * 60,
            ),
          });
        } catch {
          warnings.push("No pudimos agregar el examen al calendario.");
        }
      }

      if (warnings.length > 0) {
        setGamificationWarning(`El examen se guardó. ${warnings.join(" ")}`);
      }
    }

    setUpcomingSubject("");
    setUpcomingDate("");
    setUpcomingNotes("");
    setSelectedReminderDays([7, 3, 1]);
    setAddUpcomingToCalendar(true);
    await loadExams();
    setSavingUpcoming(false);
  }

  return (
    <SafeAreaView className="flex-1 bg-pink-50">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          className="flex-1 px-6"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        >
          <TouchableOpacity
            className="mt-4 flex-row items-center"
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={22} color="#9d174d" />
            <Text className="ml-1 font-bold text-pink-800">Volver</Text>
          </TouchableOpacity>

          <View className="mt-6">
            <Text className="text-2xl font-extrabold text-pink-900">
              Exámenes
            </Text>
            <Text className="mt-1 text-sm font-semibold capitalize text-pink-500">
              {today}
            </Text>
          </View>

          <View className="mt-4 flex-row rounded-2xl border border-pink-200 bg-white p-1">
            <TouchableOpacity
              className={`flex-1 items-center rounded-xl py-2 ${activeTab === "results" ? "bg-pink-500" : ""}`}
              onPress={() => setActiveTab("results")}
            >
              <Text
                className={`text-sm font-bold ${activeTab === "results" ? "text-white" : "text-pink-700"}`}
              >
                Registrar resultado
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`flex-1 items-center rounded-xl py-2 ${activeTab === "upcoming" ? "bg-pink-500" : ""}`}
              onPress={() => setActiveTab("upcoming")}
            >
              <Text
                className={`text-sm font-bold ${activeTab === "upcoming" ? "text-white" : "text-pink-700"}`}
              >
                Próximos exámenes
              </Text>
            </TouchableOpacity>
          </View>

          {error ? (
            <View className="mt-4 rounded-2xl border-2 border-red-200 bg-red-50 p-3">
              <Text className="text-sm font-semibold text-red-700">
                {error}
              </Text>
            </View>
          ) : null}

          {gamificationWarning ? (
            <View className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3">
              <Text className="text-sm font-semibold text-amber-700">
                {gamificationWarning}
              </Text>
            </View>
          ) : null}

          {prepError ? (
            <View className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3">
              <Text className="text-sm font-semibold text-red-700">
                {prepError}
              </Text>
            </View>
          ) : null}

          {activeTab === "results" ? (
            <>
              {selectedUpcomingId ? (
                <View className="mt-4 rounded-2xl border border-indigo-200 bg-indigo-50 p-3">
                  <Text className="text-xs font-bold text-indigo-700">
                    Resultado de examen próximo
                  </Text>
                  <Text className="mt-1 text-sm font-semibold text-indigo-900">
                    Completa la nota para cerrar este examen pendiente.
                  </Text>
                </View>
              ) : null}

              <View className="mt-6 rounded-3xl border-2 border-pink-200 bg-white p-4">
                <Text className="text-lg font-extrabold text-pink-900">
                  Historial de resultados
                </Text>

                {loading ? (
                  <View className="items-center py-6">
                    <ActivityIndicator size="small" color="#ec4899" />
                    <Text className="mt-3 text-sm font-semibold text-pink-700">
                      Cargando historial...
                    </Text>
                  </View>
                ) : examHistory.length === 0 ? (
                  <View className="items-center py-6">
                    <MochiCharacter mood="happy" size={70} />
                    <Text className="mt-3 text-sm font-semibold text-pink-700">
                      Aún no tienes resultados registrados
                    </Text>
                  </View>
                ) : (
                  <View className="mt-4">
                    {examHistory.map((exam) => {
                      const gradeValue = exam.grade ?? 0;
                      const maxValue = exam.max_grade ?? 10;
                      const badge = getResultBadge(gradeValue, maxValue);

                      return (
                        <View
                          key={exam.id}
                          className="mb-3 rounded-2xl border border-pink-200 bg-pink-50 p-3"
                        >
                          <View className="flex-row items-start justify-between">
                            <View className="flex-1 pr-3">
                              <Text className="text-base font-extrabold text-pink-900">
                                {exam.subject}
                              </Text>
                              <Text className="mt-1 text-sm font-semibold text-pink-700">
                                {gradeValue}/{maxValue}
                              </Text>
                              <Text className="mt-1 text-xs font-semibold uppercase text-pink-500">
                                {formatExamDate(exam.exam_date)}
                              </Text>
                            </View>
                            <View
                              className={`rounded-full px-3 py-1 ${badge.className}`}
                            >
                              <Text className="text-xs font-bold">
                                {badge.label}
                              </Text>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>

              <View className="mt-6">
                <Text className="mb-2 text-sm font-bold text-pink-800">
                  Materia
                </Text>
                <TextInput
                  className="rounded-2xl border-2 border-pink-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800"
                  placeholder="Ej. Cálculo, Historia, Inglés..."
                  placeholderTextColor="#f9a8d4"
                  value={subject}
                  onChangeText={setSubject}
                />
              </View>

              <View className="mt-4">
                <Text className="mb-2 text-sm font-bold text-pink-800">
                  Nota obtenida
                </Text>
                <View className="flex-row items-center">
                  <TextInput
                    className="flex-1 rounded-2xl border-2 border-pink-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800"
                    placeholder="0 - 10"
                    placeholderTextColor="#f9a8d4"
                    value={grade}
                    onChangeText={setGrade}
                    keyboardType="decimal-pad"
                  />
                  <View className="ml-3 items-center justify-center rounded-2xl bg-pink-100 px-4 py-3">
                    <Text className="font-bold text-pink-700">/ 10</Text>
                  </View>
                </View>
              </View>

              <View className="mt-4">
                <Text className="mb-2 text-sm font-bold text-pink-800">
                  Notas (opcional)
                </Text>
                <TextInput
                  className="rounded-2xl border-2 border-pink-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800"
                  placeholder="¿Qué temas entraron? ¿Cómo te fue?"
                  placeholderTextColor="#f9a8d4"
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={3}
                  style={{ textAlignVertical: "top", minHeight: 80 }}
                />
              </View>

              <TouchableOpacity
                className={`mt-6 items-center rounded-2xl py-4 ${saving ? "bg-pink-300" : "bg-pink-500"}`}
                onPress={() => {
                  void handleSaveResult();
                }}
                disabled={saving}
              >
                <Text className="font-extrabold text-white">
                  {saving ? "Guardando..." : "Guardar resultado"}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View className="mt-6 rounded-3xl border-2 border-pink-200 bg-white p-4">
                <Text className="text-lg font-extrabold text-pink-900">
                  Próximos exámenes
                </Text>

                {loading ? (
                  <View className="items-center py-6">
                    <ActivityIndicator size="small" color="#ec4899" />
                  </View>
                ) : upcomingExams.length === 0 ? (
                  <View className="items-center py-6">
                    <MochiCharacter mood="thinking" size={70} />
                    <Text className="mt-3 text-sm font-semibold text-pink-700">
                      No hay exámenes próximos registrados
                    </Text>
                  </View>
                ) : (
                  <View className="mt-4">
                    {prepLoading ? (
                      <View className="items-center py-4">
                        <ActivityIndicator size="small" color="#ec4899" />
                        <Text className="mt-2 text-xs font-semibold text-pink-700">
                          Cargando progreso de misión...
                        </Text>
                      </View>
                    ) : null}

                    {upcomingExams.map((exam) => {
                      const preparation = getPrepState(exam.id);
                      const missionProgress = getMissionProgress(
                        preparation.mission,
                      );
                      const nextMissionStep = getNextMissionStep(
                        preparation.mission,
                      );
                      const calmActive = getDaysUntil(exam.exam_date) <= 1;

                      return (
                        <View
                          key={exam.id}
                          className="mb-3 rounded-2xl border border-pink-200 bg-pink-50 p-3"
                        >
                          <View className="flex-row items-center justify-between">
                            <Text className="text-sm font-extrabold text-pink-900">
                              {exam.subject}
                            </Text>
                            <View className="rounded-full bg-amber-100 px-2 py-1">
                              <Text className="text-xs font-bold text-amber-700">
                                {getUpcomingLabel(exam.exam_date)}
                              </Text>
                            </View>
                          </View>
                          <Text className="mt-1 text-xs font-semibold uppercase text-pink-500">
                            {formatExamDate(exam.exam_date)}
                          </Text>
                          <Text className="mt-1 text-[11px] font-bold text-indigo-700">
                            Recordatorios: {formatReminderDays(upcomingReminderMap[exam.id] ?? [1])}
                          </Text>
                          {exam.preparation_notes ? (
                            <Text className="mt-1 text-xs font-semibold text-pink-700">
                              {exam.preparation_notes}
                            </Text>
                          ) : null}

                          {calmActive ? (
                            <View className="mt-3 rounded-2xl border border-teal-200 bg-teal-50 p-3">
                              <Text className="text-xs font-bold text-teal-700">
                                Cofre de Calma activo
                              </Text>
                              {CALM_ORDER.map((item) => {
                                const checked = preparation.calm[item.key];

                                return (
                                  <TouchableOpacity
                                    key={`${exam.id}-${item.key}`}
                                    className="mt-2 flex-row items-center"
                                    onPress={() => {
                                      toggleCalmStep(exam.id, item.key);
                                    }}
                                  >
                                    <Ionicons
                                      name={
                                        checked
                                          ? "checkmark-circle"
                                          : "ellipse"
                                      }
                                      size={18}
                                      color={checked ? "#0f766e" : "#475569"}
                                    />
                                    <Text className="ml-2 text-xs font-semibold text-slate-700">
                                      {item.label}
                                    </Text>
                                  </TouchableOpacity>
                                );
                              })}
                            </View>
                          ) : null}

                          <View className="mt-3 rounded-2xl border border-indigo-200 bg-indigo-50 p-3">
                            <Text className="text-xs font-bold text-indigo-700">
                              Misión Parcial Perfecto
                            </Text>
                            <Text className="mt-1 text-xs font-semibold text-indigo-800">
                              Progreso: {missionProgress}%
                            </Text>
                            <View className="mt-2 h-2 w-full overflow-hidden rounded-full bg-indigo-100">
                              <View
                                className="h-2 rounded-full bg-indigo-500"
                                style={{ width: `${missionProgress}%` }}
                              />
                            </View>
                            <Text className="mt-2 text-xs font-semibold text-indigo-800">
                              Siguiente paso recomendado: {nextMissionStep}
                            </Text>

                            {MISSION_ORDER.map((step) => {
                              const completed = preparation.mission[step.key];

                              return (
                                <TouchableOpacity
                                  key={`${exam.id}-${step.key}`}
                                  className="mt-2 flex-row items-center"
                                  onPress={() => {
                                    toggleMissionStep(exam.id, step.key);
                                  }}
                                >
                                  <Ionicons
                                    name={
                                      completed
                                        ? "checkmark-circle"
                                        : "ellipse"
                                    }
                                    size={18}
                                    color={completed ? "#4338ca" : "#475569"}
                                  />
                                  <Text className="ml-2 text-xs font-semibold text-slate-700">
                                    {step.label}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>

                          <TouchableOpacity
                            className="mt-2 self-start rounded-xl bg-white px-3 py-1"
                            onPress={() => {
                              setSubject(exam.subject);
                              setGrade("");
                              setNotes("");
                              setSelectedUpcomingId(exam.id);
                              setActiveTab("results");
                            }}
                          >
                            <Text className="text-xs font-bold text-pink-700">
                              Registrar resultado
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            className="mt-2 self-start rounded-xl bg-green-100 px-3 py-1"
                            onPress={() => {
                              router.push({
                                pathname: "/exam-sprint-progress",
                                params: {
                                  examId: exam.id,
                                  subject: exam.subject,
                                },
                              });
                            }}
                          >
                            <Text className="text-xs font-bold text-green-700">
                              Crear Sprint
                            </Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>

              <View className="mt-6">
                <Text className="mb-2 text-sm font-bold text-pink-800">
                  Materia
                </Text>
                <TextInput
                  className="rounded-2xl border-2 border-pink-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800"
                  placeholder="Ej. Biología"
                  placeholderTextColor="#f9a8d4"
                  value={upcomingSubject}
                  onChangeText={setUpcomingSubject}
                />
              </View>

              <View className="mt-4">
                <Text className="mb-2 text-sm font-bold text-pink-800">
                  Fecha futura (AAAA-MM-DD)
                </Text>
                <TextInput
                  className="rounded-2xl border-2 border-pink-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800"
                  placeholder="2026-04-10"
                  placeholderTextColor="#f9a8d4"
                  value={upcomingDate}
                  onChangeText={setUpcomingDate}
                />
              </View>

              <View className="mt-4">
                <Text className="mb-2 text-sm font-bold text-pink-800">
                  Notas de preparación
                </Text>
                <TextInput
                  className="rounded-2xl border-2 border-pink-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800"
                  placeholder="Temas a repasar, fórmulas, prioridades..."
                  placeholderTextColor="#f9a8d4"
                  value={upcomingNotes}
                  onChangeText={setUpcomingNotes}
                  multiline
                  numberOfLines={3}
                  style={{ textAlignVertical: "top", minHeight: 80 }}
                />
              </View>

              <View className="mt-4 rounded-2xl border border-pink-200 bg-white p-3">
                <Text className="text-xs font-bold uppercase tracking-wide text-pink-700">
                  Recordatorios personalizados
                </Text>
                <Text className="mt-1 text-xs font-semibold text-pink-600">
                  Elige cuándo quieres recibir aviso antes del examen.
                </Text>

                <View className="mt-3 flex-row gap-2">
                  {EXAM_REMINDER_OPTIONS.map((day) => {
                    const active = selectedReminderDays.includes(day);

                    return (
                      <TouchableOpacity
                        key={day}
                        className={`rounded-full border px-3 py-1.5 ${
                          active
                            ? "border-pink-500 bg-pink-500"
                            : "border-pink-200 bg-pink-50"
                        }`}
                        onPress={() => {
                          setSelectedReminderDays((prev) => {
                            if (prev.includes(day)) {
                              return prev.filter((value) => value !== day);
                            }

                            return [...prev, day].sort(
                              (left, right) => right - left,
                            );
                          });
                        }}
                      >
                        <Text
                          className={`text-xs font-bold ${
                            active ? "text-white" : "text-pink-700"
                          }`}
                        >
                          {day} días
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <TouchableOpacity
                  className="mt-3 flex-row items-center justify-between rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2"
                  onPress={() => setAddUpcomingToCalendar((prev) => !prev)}
                >
                  <Text className="text-xs font-bold text-indigo-700">
                    Agregar también al calendario
                  </Text>
                  <Ionicons
                    name={
                      addUpcomingToCalendar
                        ? "checkmark-circle"
                        : "ellipse-outline"
                    }
                    size={18}
                    color={addUpcomingToCalendar ? "#4f46e5" : "#94a3b8"}
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                className={`mt-6 items-center rounded-2xl py-4 ${savingUpcoming ? "bg-pink-300" : "bg-pink-500"}`}
                onPress={() => {
                  void handleSaveUpcoming();
                }}
                disabled={savingUpcoming}
              >
                <Text className="font-extrabold text-white">
                  {savingUpcoming ? "Guardando..." : "Guardar examen próximo"}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default ExamLogScreen;
