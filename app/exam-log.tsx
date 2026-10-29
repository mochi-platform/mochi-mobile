import { reportError } from "@/src/shared/lib/observability/reportError";
import { useCallback, useMemo, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { supabase } from "@/src/shared/lib/supabase";
import { useSession } from "@/src/core/providers/SessionContext";
import { useAchievement } from "@/src/core/providers/AchievementContext";
import { addPoints, trackEngagementEvent, unlockAchievement } from "@/src/shared/lib/gamification";
import { cancelExamReminder, scheduleExamReminder } from "@/src/shared/lib/notifications";
import { createDeviceCalendarEvent, getDateFromISOAndTime } from "@/src/shared/lib/deviceCalendar";
import { toLocalISODate } from "@/src/shared/lib/dates";
import type { ExamResultItem, TabId, UpcomingExamItem } from "@/src/features/exams/types";
import { useExamPreparation } from "@/src/features/exams/hooks/useExamPreparation";
import { useUpcomingReminderMap } from "@/src/features/exams/hooks/useUpcomingReminderMap";
import { ExamResultsTab } from "@/src/features/exams/components/ExamResultsTab";
import { UpcomingExamsList } from "@/src/features/exams/components/UpcomingExamsList";
import { UpcomingExamForm } from "@/src/features/exams/components/UpcomingExamForm";
import { Caption, Screen, Segmented, Surface } from "@/src/shared/ui";

export function ExamLogScreen() {
  const { session } = useSession();
  const { showAchievement } = useAchievement();

  const [activeTab, setActiveTab] = useState<TabId>("upcoming");

  const [subject, setSubject] = useState("");
  const [grade, setGrade] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedUpcomingId, setSelectedUpcomingId] = useState<string | null>(null);

  const [upcomingSubject, setUpcomingSubject] = useState("");
  const [upcomingDate, setUpcomingDate] = useState("");
  const [upcomingNotes, setUpcomingNotes] = useState("");
  const [selectedReminderDays, setSelectedReminderDays] = useState<number[]>([7, 3, 1]);
  const [addUpcomingToCalendar, setAddUpcomingToCalendar] = useState(true);

  const [examHistory, setExamHistory] = useState<ExamResultItem[]>([]);
  const [upcomingExams, setUpcomingExams] = useState<UpcomingExamItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingUpcoming, setSavingUpcoming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gamificationWarning, setGamificationWarning] = useState<string | null>(null);
  const saveResultMutexRef = useRef(false);

  const today = new Date().toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const todayISO = useMemo(() => toLocalISODate(new Date()), []);

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
      setError(err instanceof Error ? err.message : "No se pudo cargar la información de exámenes");
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

  const upcomingReminderMap = useUpcomingReminderMap(upcomingExams);
  const { prepLoading, prepError, getPrepState, toggleCalmStep, toggleMissionStep } =
    useExamPreparation(session?.user.id, upcomingExams);

  function toggleReminderDay(day: number) {
    setSelectedReminderDays((prev) => {
      if (prev.includes(day)) {
        return prev.filter((value) => value !== day);
      }

      return [...prev, day].sort((left, right) => right - left);
    });
  }

  function openResultFromUpcoming(exam: UpcomingExamItem) {
    setSubject(exam.subject);
    setGrade("");
    setNotes("");
    setSelectedUpcomingId(exam.id);
    setActiveTab("results");
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
        } catch (error) {
          // No bloqueamos el guardado del resultado por fallas de notificación.
          reportError(error, { scope: "app/exam-log.tsx" });
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
          throw insertError ?? new Error("No se pudo confirmar el resultado registrado");
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
          reportError(trackingError, { scope: "exam-log/engagement" });
        }
      }

      const percentage = gradeNum / 10;
      if (percentage >= 0.7 && engagementResult === "created") {
        await addPoints(session.user.id, "exam_logged", showAchievement);
        const unlockedExam = await unlockAchievement(session.user.id, "exam_ace");
        if (unlockedExam) showAchievement(unlockedExam);
      }

      if (percentage >= 0.7 && engagementResult === "duplicate") {
        setGamificationWarning(
          "Este resultado ya estaba registrado en gamificación. No se volvieron a sumar puntos para evitar duplicados.",
        );
        // Evento duplicado: se omite la suma de puntos y logros.
      }

      setSubject("");
      setGrade("");
      setNotes("");
      setSelectedUpcomingId(null);
      await loadExams();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar el resultado");
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

    let createdExam: { id: string; subject: string; exam_date: string } | null = null;

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
      setError(err instanceof Error ? err.message : "No se pudo guardar el examen próximo");
      setSavingUpcoming(false);
      return;
    }

    if (createdExam) {
      const warnings: string[] = [];

      try {
        await scheduleExamReminder(createdExam.id, createdExam.subject, createdExam.exam_date, {
          daysBefore: selectedReminderDays,
        });
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
            alarmsMinutesBefore: selectedReminderDays.map((days) => days * 24 * 60),
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
    <Screen title="Exámenes" subtitle={today} withTabBar={false} closable keyboard>
      <Segmented
        className="mt-2"
        options={[
          { value: "upcoming", label: "Próximos" },
          { value: "results", label: "Resultados" },
        ]}
        value={activeTab}
        onChange={setActiveTab}
      />

      {[error, prepError].filter(Boolean).map((message) => (
        <Surface key={message} tone="sunken" className="mt-4 p-3.5">
          <Caption className="text-danger">{message}</Caption>
        </Surface>
      ))}
      {gamificationWarning ? (
        <Surface tone="sunken" className="mt-4 p-3.5">
          <Caption>{gamificationWarning}</Caption>
        </Surface>
      ) : null}

      {activeTab === "results" ? (
        <ExamResultsTab
          loading={loading}
          examHistory={examHistory}
          selectedUpcomingId={selectedUpcomingId}
          subject={subject}
          onSubjectChange={setSubject}
          grade={grade}
          onGradeChange={setGrade}
          notes={notes}
          onNotesChange={setNotes}
          saving={saving}
          onSave={() => void handleSaveResult()}
        />
      ) : (
        <>
          <UpcomingExamsList
            loading={loading}
            todayISO={todayISO}
            upcomingExams={upcomingExams}
            upcomingReminderMap={upcomingReminderMap}
            prepLoading={prepLoading}
            getPrepState={getPrepState}
            onToggleCalmStep={toggleCalmStep}
            onToggleMissionStep={toggleMissionStep}
            onRegisterResult={openResultFromUpcoming}
          />
          <UpcomingExamForm
            subject={upcomingSubject}
            onSubjectChange={setUpcomingSubject}
            date={upcomingDate}
            onDateChange={setUpcomingDate}
            notes={upcomingNotes}
            onNotesChange={setUpcomingNotes}
            selectedReminderDays={selectedReminderDays}
            onToggleReminderDay={toggleReminderDay}
            addToCalendar={addUpcomingToCalendar}
            onToggleCalendar={() => setAddUpcomingToCalendar((prev) => !prev)}
            saving={savingUpcoming}
            onSave={() => void handleSaveUpcoming()}
          />
        </>
      )}
    </Screen>
  );
}

export default ExamLogScreen;
