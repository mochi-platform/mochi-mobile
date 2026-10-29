import { toLocalISODate } from "@/src/shared/lib/dates";
import { useCallback, useState } from "react";
import { View } from "react-native";
import { useFocusEffect } from "expo-router";
import { useSession } from "@/src/core/providers/SessionContext";
import { useCycle } from "@/src/core/providers/CycleContext";
import { MochiCharacter } from "@/src/shared/components/MochiCharacter";
import {
  generateStudyBlockSuggestions,
  predictWellnessRisk,
  type PredictWellnessRiskOutput,
  type StudyBlockSuggestion,
} from "@/src/shared/lib/ai";
import { buildAiLimitMessage, requestAiUsage } from "@/src/shared/lib/aiCredits";
import { supabase } from "@/src/shared/lib/supabase";
import {
  Body,
  Button,
  Caption,
  Eyebrow,
  IconTile,
  ListGroup,
  ListRow,
  Screen,
  SectionHeader,
  Skeleton,
  Surface,
} from "@/src/shared/ui";

type PlannerExamItem = {
  subject: string;
  exam_date: string;
};

type PlannerStudyBlock = {
  subject: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
};

type PlannerSuggestionItem = StudyBlockSuggestion & {
  key: string;
};

const DAY_LABELS: Record<number, string> = {
  0: "Domingo",
  1: "Lunes",
  2: "Martes",
  3: "Miercoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sabado",
};

const BLOCK_COLORS = ["purple", "blue", "pink", "teal", "yellow", "green"] as const;

function toISODate(date: Date): string {
  return toLocalISODate(date);
}

function getDaysUntil(dateISO: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const exam = new Date(`${dateISO}T00:00:00`);
  exam.setHours(0, 0, 0, 0);

  return Math.round((exam.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function parseTimeToMinutes(value: string): number | null {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;

  const hours = Number.parseInt(match[1], 10);
  const minutes = Number.parseInt(match[2], 10);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  return hours * 60 + minutes;
}

function minutesToTime(value: number): string {
  const safe = Math.max(0, Math.min(23 * 60 + 59, value));
  const hours = Math.floor(safe / 60);
  const minutes = safe % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function normalizeSuggestion(suggestion: StudyBlockSuggestion): PlannerSuggestionItem | null {
  const subject = suggestion.subject.trim();
  const reason = suggestion.reason.trim();
  const day = Number(suggestion.day_of_week);

  if (!subject || !reason) {
    return null;
  }

  if (!Number.isInteger(day) || day < 0 || day > 6) {
    return null;
  }

  const startMinutes = parseTimeToMinutes(suggestion.start_time);
  if (startMinutes === null) {
    return null;
  }

  let endMinutes = parseTimeToMinutes(suggestion.end_time);
  if (endMinutes === null || endMinutes <= startMinutes) {
    endMinutes = Math.min(startMinutes + 90, 23 * 60 + 59);
  }

  const normalized: StudyBlockSuggestion = {
    subject,
    day_of_week: day,
    start_time: minutesToTime(startMinutes),
    end_time: minutesToTime(endMinutes),
    reason,
  };

  return {
    ...normalized,
    key: `${normalized.subject}:${normalized.day_of_week}:${normalized.start_time}`,
  };
}

function buildPlannerContext(input: {
  currentBlocks: PlannerStudyBlock[];
  upcomingExams: PlannerExamItem[];
  cyclePhase: string;
  energyLevels: number[];
  moodLevels: number[];
  currentStreak: number;
  activeGoals: number;
  activeRoutines: number;
}): string {
  const scheduleSummary =
    input.currentBlocks.length > 0
      ? input.currentBlocks
          .map(
            (block) =>
              `${DAY_LABELS[block.day_of_week]} ${block.start_time}-${block.end_time}: ${block.subject}`,
          )
          .join("; ")
      : "Sin bloques programados actualmente.";

  const examsSummary =
    input.upcomingExams.length > 0
      ? input.upcomingExams
          .map((exam) => `${exam.subject} (${getDaysUntil(exam.exam_date)} dias)`)
          .join("; ")
      : "No hay examenes proximos.";

  const energySummary =
    input.energyLevels.length > 0 ? input.energyLevels.join(", ") : "Sin registros recientes";

  const moodSummary =
    input.moodLevels.length > 0 ? input.moodLevels.join(", ") : "Sin registros recientes";

  return [
    "Perfil para plan semanal de estudio (espanol):",
    `- Fase del ciclo: ${input.cyclePhase}`,
    `- Racha actual: ${input.currentStreak} dias`,
    `- Metas activas: ${input.activeGoals}`,
    `- Rutinas activas: ${input.activeRoutines}`,
    `- Energia reciente (1-5): ${energySummary}`,
    `- Estado de animo reciente (1-5): ${moodSummary}`,
    `- Examenes proximos: ${examsSummary}`,
    `- Horario actual: ${scheduleSummary}`,
    "",
    "Genera entre 4 y 6 bloques semanales equilibrados.",
    "Evita choques con el horario actual y prioriza examenes cercanos.",
    "Usa formato horario 24h HH:MM y dias 0-6 (domingo a sabado).",
  ].join("\n");
}


export function WeeklyPlannerScreen() {
  const { session } = useSession();
  const { cycleData } = useCycle();

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<PlannerSuggestionItem[]>([]);
  const [wellness, setWellness] = useState<PredictWellnessRiskOutput | null>(null);


  const generatePlanner = useCallback(async () => {
    const userId = session?.user.id;
    if (!userId) {
      setLoading(false);
      setSuggestions([]);
      setWellness(null);
      return;
    }

    try {
      setLoading(true);
      setGenerating(true);
      setError(null);
      setSaveMessage(null);

      const todayISO = toISODate(new Date());

      const [
        studyBlocksRes,
        upcomingExamsRes,
        energyRes,
        moodRes,
        streakRes,
        activeGoalsRes,
        activeRoutinesRes,
      ] = await Promise.all([
        supabase
          .from("study_blocks")
          .select("subject, day_of_week, start_time, end_time")
          .eq("user_id", userId)
          .order("day_of_week", { ascending: true })
          .order("start_time", { ascending: true }),
        supabase
          .from("exam_logs")
          .select("subject, exam_date")
          .eq("user_id", userId)
          .gte("exam_date", todayISO)
          .order("exam_date", { ascending: true })
          .limit(6),
        supabase
          .from("energy_levels")
          .select("overall_rating")
          .eq("user_id", userId)
          .order("logged_date", { ascending: false })
          .limit(7),
        supabase
          .from("mood_logs")
          .select("mood")
          .eq("user_id", userId)
          .order("logged_date", { ascending: false })
          .limit(7),
        supabase
          .from("streaks")
          .select("current_streak")
          .eq("user_id", userId)
          .maybeSingle<{ current_streak: number }>(),
        supabase
          .from("goals")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("is_completed", false),
        supabase
          .from("routines")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId),
      ]);

      const baseError =
        studyBlocksRes.error ??
        upcomingExamsRes.error ??
        energyRes.error ??
        moodRes.error ??
        streakRes.error ??
        activeGoalsRes.error ??
        activeRoutinesRes.error;

      if (baseError) {
        throw baseError;
      }

      const currentBlocks = (studyBlocksRes.data as PlannerStudyBlock[] | null) ?? [];
      const upcomingExams = (upcomingExamsRes.data as PlannerExamItem[] | null) ?? [];

      const energyLevels = ((energyRes.data as { overall_rating: number }[] | null) ?? [])
        .map((item) => item.overall_rating)
        .filter((value) => Number.isFinite(value));

      const moodLevels = ((moodRes.data as { mood: number }[] | null) ?? [])
        .map((item) => item.mood)
        .filter((value) => Number.isFinite(value));

      const currentStreak = streakRes.data?.current_streak ?? 0;
      const activeGoals = activeGoalsRes.count ?? 0;
      const activeRoutines = activeRoutinesRes.count ?? 0;

      const plannerContext = buildPlannerContext({
        currentBlocks,
        upcomingExams,
        cyclePhase: cycleData?.phase ?? "unknown",
        energyLevels,
        moodLevels,
        currentStreak,
        activeGoals,
        activeRoutines,
      });

      const [plannerUsage, wellnessUsage] = await Promise.all([
        requestAiUsage({
          reason: "ai_planner",
          sourceRef: "weekly_planner",
        }),
        requestAiUsage({
          reason: "ai_wellness_risk",
          sourceRef: "weekly_planner",
        }),
      ]);

      const suggestionPromise = plannerUsage.allowed
        ? generateStudyBlockSuggestions({ context: plannerContext })
        : Promise.resolve([] as StudyBlockSuggestion[]);

      const wellnessPromise = wellnessUsage.allowed
        ? predictWellnessRisk({
            userId,
            recentEnergyLevels: energyLevels,
            cyclePhase: cycleData?.phase ?? null,
            recentMoodRatings: moodLevels,
            currentStreak,
            recentExamSprints: upcomingExams.map((exam) => ({
              exam: exam.subject,
              daysLeft: Math.max(0, getDaysUntil(exam.exam_date)),
            })),
            totalGoalsActive: activeGoals,
            totalRoutinesActive: activeRoutines,
          })
        : Promise.resolve(null);

      const [suggestionsResult, wellnessResult] = await Promise.allSettled([
        suggestionPromise,
        wellnessPromise,
      ]);

      if (suggestionsResult.status === "fulfilled") {
        const nextSuggestions = suggestionsResult.value
          .map((suggestion) => normalizeSuggestion(suggestion))
          .filter((suggestion): suggestion is PlannerSuggestionItem => suggestion !== null);

        const deduped = Array.from(
          new Map(nextSuggestions.map((suggestion) => [suggestion.key, suggestion])).values(),
        ).slice(0, 6);

        setSuggestions(deduped);
      } else {
        setSuggestions([]);
      }

      if (wellnessResult.status === "fulfilled") {
        setWellness(wellnessResult.value as PredictWellnessRiskOutput | null);
      } else {
        setWellness(null);
      }

      if (suggestionsResult.status === "rejected" && wellnessResult.status === "rejected") {
        setError("No pudimos generar tu planner esta vez. Intenta nuevamente.");
      }

      if (!plannerUsage.allowed && !wellnessUsage.allowed) {
        setError(buildAiLimitMessage(plannerUsage.reason));
      }
    } catch (err) {
      setSuggestions([]);
      setWellness(null);
      setError(
        err instanceof Error
          ? err.message
          : "No pudimos generar tu planner esta vez. Intenta nuevamente.",
      );
    } finally {
      setGenerating(false);
      setLoading(false);
    }
  }, [cycleData?.phase, session?.user.id]);

  useFocusEffect(
    useCallback(() => {
      void generatePlanner();
    }, [generatePlanner]),
  );

  const handleSaveSuggestions = useCallback(async () => {
    const userId = session?.user.id;
    if (!userId || suggestions.length === 0) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSaveMessage(null);

      const { data: existingRows, error: existingError } = await supabase
        .from("study_blocks")
        .select("subject, day_of_week, start_time")
        .eq("user_id", userId);

      if (existingError) {
        throw existingError;
      }

      const existingKeys = new Set(
        (
          (existingRows as
            | {
                subject: string;
                day_of_week: number;
                start_time: string;
              }[]
            | null) ?? []
        ).map((row) => `${row.subject.trim().toLowerCase()}:${row.day_of_week}:${row.start_time}`),
      );

      const toInsert = suggestions
        .filter((suggestion) => {
          const key = `${suggestion.subject.trim().toLowerCase()}:${suggestion.day_of_week}:${suggestion.start_time}`;
          return !existingKeys.has(key);
        })
        .map((suggestion, index) => ({
          user_id: userId,
          subject: suggestion.subject,
          day_of_week: suggestion.day_of_week,
          start_time: suggestion.start_time,
          end_time: suggestion.end_time,
          color: BLOCK_COLORS[index % BLOCK_COLORS.length],
        }));

      if (toInsert.length === 0) {
        setSaveMessage("Tus sugerencias ya estaban en tu horario actual.");
        return;
      }

      const { error: insertError } = await supabase.from("study_blocks").insert(toInsert);

      if (insertError) {
        throw insertError;
      }

      setSaveMessage(
        `${toInsert.length} bloque${toInsert.length > 1 ? "s" : ""} agregado${toInsert.length > 1 ? "s" : ""} a tu planner semanal.`,
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudieron guardar los bloques sugeridos.",
      );
    } finally {
      setSaving(false);
    }
  }, [session?.user.id, suggestions]);

  if (loading) {
    return (
      <Screen title="Planear mi semana" withTabBar={false} closable>
        <View className="mt-4 gap-3">
          <Skeleton height={120} className="rounded-card" />
          <Skeleton height={200} className="rounded-card" />
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      title="Planear mi semana"
      subtitle="Mochi propone bloques según tus exámenes, tu ciclo y tus hábitos."
      withTabBar={false}
      closable
    >
      <View className="mt-3 flex-row gap-2">
        <View className="flex-1">
          <Button
            title="Proponer"
            variant="soft"
            icon="sparkles"
            loading={generating}
            onPress={() => void generatePlanner()}
          />
        </View>
        <View className="flex-1">
          <Button
            title="Guardar"
            icon="checkmark"
            loading={saving}
            disabled={suggestions.length === 0}
            onPress={() => void handleSaveSuggestions()}
          />
        </View>
      </View>
      {saveMessage ? <Caption className="ml-1 mt-2 text-positive">{saveMessage}</Caption> : null}
      {error ? <Caption className="ml-1 mt-2 text-danger">{error}</Caption> : null}

      {wellness ? (
        <>
          <SectionHeader
            title="Riesgo de sobrecarga"
            actionLabel={`${Math.round(wellness.riskPercentage)}%`}
          />
          <Surface className="p-4">
            <Caption>Confianza: {Math.round(wellness.confidence * 100)}%</Caption>
            <View className="mt-2 gap-2">
              {wellness.recommendations.slice(0, 3).map((recommendation, index) => (
                <View
                  key={`${recommendation.type}-${index}`}
                  className="rounded-[16px] bg-surface-muted p-3"
                >
                  <Eyebrow>
                    {recommendation.urgency === "high"
                      ? "Prioridad alta"
                      : recommendation.urgency === "medium"
                        ? "Prioridad media"
                        : "Prioridad baja"}
                  </Eyebrow>
                  <Body className="mt-1">{recommendation.text}</Body>
                </View>
              ))}
            </View>
          </Surface>
        </>
      ) : null}

      <SectionHeader title="Bloques sugeridos" />
      {suggestions.length === 0 ? (
        <Surface tone="sunken" className="flex-row items-center gap-3 p-4">
          <MochiCharacter expression="thinking" size={64} animated={false} shadow={false} />
          <Caption className="flex-1">
            Toca «Proponer» y te armo bloques concretos para esta semana.
          </Caption>
        </Surface>
      ) : (
        <ListGroup>
          {suggestions.map((suggestion) => (
            <ListRow
              key={suggestion.key}
              title={suggestion.subject}
              subtitle={`${DAY_LABELS[suggestion.day_of_week]} · ${suggestion.start_time} – ${suggestion.end_time}\n${suggestion.reason}`}
              multiline
              leading={<IconTile icon="time" tint="study" />}
            />
          ))}
        </ListGroup>
      )}
    </Screen>
  );
}

export default WeeklyPlannerScreen;
