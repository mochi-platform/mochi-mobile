import { Ionicons } from "@expo/vector-icons";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSession } from "@/src/core/providers/SessionContext";
import { useCycle } from "@/src/core/providers/CycleContext";
import { MochiCharacter } from "@/src/shared/components/MochiCharacter";
import { IconCtaButton } from "@/src/shared/components/IconCtaButton";
import {
  generateStudyBlockSuggestions,
  predictWellnessRisk,
  type PredictWellnessRiskOutput,
  type StudyBlockSuggestion,
} from "@/src/shared/lib/ai";
import { buildAiLimitMessage, requestAiUsage } from "@/src/shared/lib/aiCredits";
import { supabase } from "@/src/shared/lib/supabase";

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
  return date.toISOString().slice(0, 10);
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

function normalizeSuggestion(
  suggestion: StudyBlockSuggestion,
): PlannerSuggestionItem | null {
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
    input.energyLevels.length > 0
      ? input.energyLevels.join(", ")
      : "Sin registros recientes";

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

function getRiskTone(risk: number): {
  cardClass: string;
  textClass: string;
  badgeClass: string;
} {
  if (risk >= 70) {
    return {
      cardClass: "border-rose-200 bg-rose-50",
      textClass: "text-rose-700",
      badgeClass: "bg-rose-500",
    };
  }

  if (risk >= 40) {
    return {
      cardClass: "border-amber-200 bg-amber-50",
      textClass: "text-amber-700",
      badgeClass: "bg-amber-500",
    };
  }

  return {
    cardClass: "border-emerald-200 bg-emerald-50",
    textClass: "text-emerald-700",
    badgeClass: "bg-emerald-500",
  };
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

  const riskTone = useMemo(() => getRiskTone(wellness?.riskPercentage ?? 0), [wellness?.riskPercentage]);

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

      const currentBlocks =
        (studyBlocksRes.data as PlannerStudyBlock[] | null) ?? [];
      const upcomingExams =
        (upcomingExamsRes.data as PlannerExamItem[] | null) ?? [];

      const energyLevels =
        ((energyRes.data as Array<{ overall_rating: number }> | null) ?? [])
          .map((item) => item.overall_rating)
          .filter((value) => Number.isFinite(value));

      const moodLevels =
        ((moodRes.data as Array<{ mood: number }> | null) ?? [])
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
          .filter(
            (
              suggestion,
            ): suggestion is PlannerSuggestionItem => suggestion !== null,
          );

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

      if (
        suggestionsResult.status === "rejected" &&
        wellnessResult.status === "rejected"
      ) {
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
        ((existingRows as Array<{
          subject: string;
          day_of_week: number;
          start_time: string;
        }> | null) ?? [])
          .map((row) => `${row.subject.trim().toLowerCase()}:${row.day_of_week}:${row.start_time}`),
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

      const { error: insertError } = await supabase
        .from("study_blocks")
        .insert(toInsert);

      if (insertError) {
        throw insertError;
      }

      setSaveMessage(
        `${toInsert.length} bloque${toInsert.length > 1 ? "s" : ""} agregado${toInsert.length > 1 ? "s" : ""} a tu planner semanal.`,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudieron guardar los bloques sugeridos.",
      );
    } finally {
      setSaving(false);
    }
  }, [session?.user.id, suggestions]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-indigo-50">
        <ActivityIndicator size="small" color="#4f46e5" />
        <Text className="mt-3 text-sm font-semibold text-indigo-700">
          Preparando tu planner semanal...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-indigo-50">
      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
        <TouchableOpacity
          className="mt-4 flex-row items-center"
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Ionicons name="chevron-back" size={22} color="#3730a3" />
          <Text className="ml-1 text-sm font-bold text-indigo-800">Volver</Text>
        </TouchableOpacity>

        <View className="mt-5 rounded-3xl border-2 border-indigo-200 bg-white p-5">
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-2xl font-extrabold text-indigo-900">
                Mochi Weekly Planner
              </Text>
              <Text className="mt-1 text-sm font-semibold text-indigo-700">
                Sugerencias proactivas segun examenes, ciclo y habitos recientes.
              </Text>
            </View>
            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100">
              <Ionicons name="sparkles" size={20} color="#4338ca" />
            </View>
          </View>

          <View className="mt-4 flex-row gap-2">
            <IconCtaButton
              label="Regenerar plan"
              onPress={() => {
                void generatePlanner();
              }}
              iconName="refresh"
              iconColor="#ffffff"
              iconSize={14}
              loading={generating}
              loadingColor="#ffffff"
              containerClassName="flex-1 rounded-2xl bg-indigo-600 px-3 py-3"
              textClassName="text-xs text-white"
            />

            <IconCtaButton
              label="Guardar bloques"
              onPress={() => {
                void handleSaveSuggestions();
              }}
              iconName="save"
              iconColor="#ffffff"
              iconSize={14}
              loading={saving}
              loadingColor="#ffffff"
              disabled={suggestions.length === 0}
              containerClassName={`flex-1 rounded-2xl px-3 py-3 ${saving ? "bg-emerald-300" : "bg-emerald-500"}`}
              textClassName="text-xs text-white"
            />
          </View>

          {saveMessage ? (
            <View className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2">
              <Text className="text-xs font-bold text-emerald-700">{saveMessage}</Text>
            </View>
          ) : null}

          {error ? (
            <View className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2">
              <Text className="text-xs font-bold text-rose-700">{error}</Text>
            </View>
          ) : null}
        </View>

        {wellness ? (
          <View className={`mt-4 rounded-3xl border-2 p-4 ${riskTone.cardClass}`}>
            <View className="flex-row items-center justify-between">
              <Text className={`text-base font-extrabold ${riskTone.textClass}`}>
                Riesgo de sobrecarga
              </Text>
              <View className={`rounded-full px-3 py-1 ${riskTone.badgeClass}`}>
                <Text className="text-xs font-extrabold text-white">
                  {Math.round(wellness.riskPercentage)}%
                </Text>
              </View>
            </View>

            <Text className={`mt-1 text-xs font-semibold ${riskTone.textClass}`}>
              Confianza del modelo: {Math.round(wellness.confidence * 100)}%
            </Text>

            <View className="mt-3 gap-2">
              {wellness.recommendations.slice(0, 3).map((recommendation, index) => (
                <View
                  key={`${recommendation.type}-${index}`}
                  className="rounded-2xl border border-white/60 bg-white/80 p-3"
                >
                  <Text className="text-xs font-bold uppercase text-slate-500">
                    {recommendation.urgency === "high"
                      ? "Prioridad alta"
                      : recommendation.urgency === "medium"
                        ? "Prioridad media"
                        : "Prioridad baja"}
                  </Text>
                  <Text className="mt-1 text-sm font-semibold text-slate-700">
                    {recommendation.text}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <View className="mb-8 mt-4 rounded-3xl border-2 border-violet-200 bg-white p-4">
          <Text className="text-base font-extrabold text-violet-900">
            Bloques sugeridos para esta semana
          </Text>

          {suggestions.length === 0 ? (
            <View className="mt-4 items-center rounded-2xl border border-violet-200 bg-violet-50 p-5">
              <MochiCharacter mood="thinking" size={84} />
              <Text className="mt-3 text-center text-sm font-bold text-violet-800">
                Aun no hay sugerencias disponibles
              </Text>
              <Text className="mt-1 text-center text-xs font-semibold text-violet-600">
                Regenera el plan y Mochi te propondra bloques concretos.
              </Text>
            </View>
          ) : (
            <View className="mt-3 gap-2">
              {suggestions.map((suggestion) => (
                <View
                  key={suggestion.key}
                  className="rounded-2xl border border-violet-200 bg-violet-50 p-3"
                >
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm font-extrabold text-violet-900">
                      {suggestion.subject}
                    </Text>
                    <Text className="text-xs font-bold text-violet-700">
                      {DAY_LABELS[suggestion.day_of_week]}
                    </Text>
                  </View>

                  <Text className="mt-1 text-xs font-semibold text-violet-700">
                    {suggestion.start_time} - {suggestion.end_time}
                  </Text>

                  <Text className="mt-2 text-xs font-semibold text-slate-600">
                    {suggestion.reason}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default WeeklyPlannerScreen;
