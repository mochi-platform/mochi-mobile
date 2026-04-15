import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Sharing from "expo-sharing";
import { captureRef } from "react-native-view-shot";
import { MochiCharacter } from "@/src/shared/components/MochiCharacter";
import { useSession } from "@/src/core/providers/SessionContext";
import { supabase } from "@/src/shared/lib/supabase";
import { callAI } from "@/src/shared/lib/ai";

type AtlasIntensity = "Baja" | "Media" | "Alta";

type AtlasWeek = {
  key: string;
  startISO: string;
  endISO: string;
  sessions: number;
  exams: number;
  intensity: AtlasIntensity;
  recommendation: string;
  isCurrentWeek: boolean;
};

type WeeklySummaryStats = {
  studyHours: number;
  sessions: number;
  routines: number;
  habitsCompleted: number;
  habitsTotal: number;
  points: number;
  streak: number;
  moods: Array<number | null>;
};

function createEmptyStats(): WeeklySummaryStats {
  return {
    studyHours: 0,
    sessions: 0,
    routines: 0,
    habitsCompleted: 0,
    habitsTotal: 0,
    points: 0,
    streak: 0,
    moods: [],
  };
}

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getMonday(date: Date): Date {
  const monday = new Date(date);
  const day = monday.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  monday.setDate(monday.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function getWeekKeyByDate(dateISO: string): string {
  const date = new Date(`${dateISO}T00:00:00`);
  return toISODate(getMonday(date));
}

function getAtlasIntensity(sessions: number, exams: number): AtlasIntensity {
  const score = sessions + exams * 2;
  if (score >= 10 || exams >= 2) return "Alta";
  if (score >= 5) return "Media";
  return "Baja";
}

function getAtlasRecommendation(intensity: AtlasIntensity): string {
  if (intensity === "Alta") {
    return "Reduce sobrecarga con bloques más cortos y descansos programados.";
  }

  if (intensity === "Media") {
    return "Mantén el ritmo y reserva un repaso profundo al final de la semana.";
  }

  return "Aprovecha para adelantar materias clave con sesiones ligeras y constantes.";
}

export function WeeklySummaryScreen() {
  const { session } = useSession();
  const userId = session?.user.id;
  const captureViewRef = useRef<View | null>(null);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [stats, setStats] = useState<WeeklySummaryStats>(createEmptyStats);
  const [atlasWeeks, setAtlasWeeks] = useState<AtlasWeek[]>([]);
  const [atlasLoading, setAtlasLoading] = useState(true);
  const [atlasError, setAtlasError] = useState<string | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);

  const range = useMemo(() => {
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - now.getDay() + 1 - 7);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    return {
      start: monday,
      end: sunday,
      startISO: monday.toISOString().slice(0, 10),
      endISO: sunday.toISOString().slice(0, 10),
    };
  }, []);

  const atlasRange = useMemo(() => {
    const currentMonday = getMonday(new Date());
    const atlasStart = new Date(currentMonday);
    atlasStart.setDate(currentMonday.getDate() - 15 * 7);

    const atlasEnd = new Date(currentMonday);
    atlasEnd.setDate(currentMonday.getDate() + 6);

    return {
      start: atlasStart,
      end: atlasEnd,
      startISO: toISODate(atlasStart),
      endISO: toISODate(atlasEnd),
      currentWeekKey: toISODate(currentMonday),
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!userId) {
        setLoading(false);
        return;
      }

      async function loadSummary() {
        setLoading(true);
        setAtlasLoading(true);
        setAtlasError(null);
        setSummaryError(null);

        const nextDay = new Date(range.end);
        nextDay.setDate(nextDay.getDate() + 1);

        const atlasNextDay = new Date(atlasRange.end);
        atlasNextDay.setDate(atlasRange.end.getDate() + 1);

        const [
          studyRes,
          sessionsRes,
          routineRes,
          habitsRes,
          habitsCountRes,
          gratitudeRes,
          streakRes,
          moodRes,
          atlasSessionsRes,
          atlasExamsRes,
        ] = await Promise.all([
          supabase
            .from("study_sessions")
            .select("duration_seconds")
            .eq("user_id", userId)
            .gte("completed_at", range.start.toISOString())
            .lt("completed_at", nextDay.toISOString()),
          supabase
            .from("study_sessions")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId)
            .gte("completed_at", range.start.toISOString())
            .lt("completed_at", nextDay.toISOString()),
          supabase
            .from("routine_logs")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId)
            .gte("completed_at", range.start.toISOString())
            .lt("completed_at", nextDay.toISOString()),
          supabase
            .from("habit_logs")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId)
            .gte("log_date", range.startISO)
            .lte("log_date", range.endISO),
          supabase
            .from("habits")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId),
          supabase
            .from("gratitude_logs")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId)
            .gte("logged_date", range.startISO)
            .lte("logged_date", range.endISO),
          supabase
            .from("streaks")
            .select("longest_streak")
            .eq("user_id", userId)
            .maybeSingle(),
          supabase
            .from("mood_logs")
            .select("mood, logged_date")
            .eq("user_id", userId)
            .gte("logged_date", range.startISO)
            .lte("logged_date", range.endISO),
          supabase
            .from("study_sessions")
            .select("completed_at")
            .eq("user_id", userId)
            .gte("completed_at", atlasRange.start.toISOString())
            .lt("completed_at", atlasNextDay.toISOString()),
          supabase
            .from("exam_logs")
            .select("exam_date")
            .eq("user_id", userId)
            .gte("exam_date", atlasRange.startISO)
            .lte("exam_date", atlasRange.endISO),
        ]);

        const baseError =
          studyRes.error ??
          sessionsRes.error ??
          routineRes.error ??
          habitsRes.error ??
          habitsCountRes.error ??
          gratitudeRes.error ??
          streakRes.error ??
          moodRes.error;

        if (baseError) {
          setSummaryError(
            baseError.message ?? "No se pudo cargar el resumen semanal",
          );
          setStats(createEmptyStats());
          setMessage("");
          setAtlasWeeks([]);
          setAtlasLoading(false);
          setLoading(false);
          return;
        }

        const studyHours =
          (
            (studyRes.data as Array<{ duration_seconds: number }> | null) ?? []
          ).reduce((sum, row) => sum + row.duration_seconds, 0) / 3600;
        const sessions = sessionsRes.count ?? 0;
        const routines = routineRes.count ?? 0;
        const habitsCompleted = habitsRes.count ?? 0;
        const habitsTotal = (habitsCountRes.count ?? 0) * 7;
        const points =
          sessions * 5 + routines * 10 + (gratitudeRes.count ?? 0) * 3;

        const moodMap = new Map<string, number>();
        (
          (moodRes.data as Array<{
            mood: number;
            logged_date: string;
          }> | null) ?? []
        ).forEach((row) => {
          moodMap.set(row.logged_date, row.mood);
        });

        const moodDots = Array.from({ length: 7 }, (_, i) => {
          const date = new Date(range.start);
          date.setDate(range.start.getDate() + i);
          return moodMap.get(date.toISOString().slice(0, 10)) ?? null;
        });

        setStats({
          studyHours: Number(studyHours.toFixed(1)),
          sessions,
          routines,
          habitsCompleted,
          habitsTotal,
          points,
          streak:
            (streakRes.data as { longest_streak: number } | null)
              ?.longest_streak ?? 0,
          moods: moodDots,
        });

        try {
          if (atlasSessionsRes.error) throw atlasSessionsRes.error;
          if (atlasExamsRes.error) throw atlasExamsRes.error;

          const sessionsByWeek = new Map<string, number>();
          (
            (atlasSessionsRes.data as Array<{ completed_at: string }> | null) ??
            []
          ).forEach((row) => {
            const sessionDate = row.completed_at.slice(0, 10);
            const weekKey = getWeekKeyByDate(sessionDate);
            sessionsByWeek.set(weekKey, (sessionsByWeek.get(weekKey) ?? 0) + 1);
          });

          const examsByWeek = new Map<string, number>();
          (
            (atlasExamsRes.data as Array<{ exam_date: string }> | null) ?? []
          ).forEach((row) => {
            const weekKey = getWeekKeyByDate(row.exam_date);
            examsByWeek.set(weekKey, (examsByWeek.get(weekKey) ?? 0) + 1);
          });

          const weeks: AtlasWeek[] = [];
          for (let index = 0; index < 16; index += 1) {
            const weekStart = new Date(atlasRange.start);
            weekStart.setDate(atlasRange.start.getDate() + index * 7);

            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);

            const weekKey = toISODate(weekStart);
            const sessions = sessionsByWeek.get(weekKey) ?? 0;
            const exams = examsByWeek.get(weekKey) ?? 0;
            const intensity = getAtlasIntensity(sessions, exams);

            weeks.push({
              key: weekKey,
              startISO: weekKey,
              endISO: toISODate(weekEnd),
              sessions,
              exams,
              intensity,
              recommendation: getAtlasRecommendation(intensity),
              isCurrentWeek: weekKey === atlasRange.currentWeekKey,
            });
          }

          setAtlasWeeks(weeks);
        } catch {
          setAtlasWeeks([]);
          setAtlasError("No se pudo construir el atlas del semestre");
        } finally {
          setAtlasLoading(false);
        }

        const aiPrompt = `Resumen semanal de estudiante:\nHoras estudio: ${Number(studyHours.toFixed(1))}\nSesiones: ${sessions}\nRutinas: ${routines}\nHábitos: ${habitsCompleted}/${habitsTotal}\nPuntos: ${points}\nRacha: ${(streakRes.data as { longest_streak: number } | null)?.longest_streak ?? 0}\n\nEscribe un mensaje motivador de 2 a 3 líneas, cálido y en español.`;

        try {
          const aiMessage = await callAI(aiPrompt);
          setMessage(aiMessage.trim());
        } catch {
          setMessage(
            "Esta semana avanzaste con constancia. Cada paso cuenta y tu progreso se nota.",
          );
        }

        setLoading(false);
      }

      void loadSummary();
    }, [
      atlasRange.currentWeekKey,
      atlasRange.end,
      atlasRange.endISO,
      atlasRange.start,
      atlasRange.startISO,
      range.end,
      range.endISO,
      range.start,
      range.startISO,
      userId,
    ]),
  );

  const shareSummary = async () => {
    if (!captureViewRef.current) {
      setShareError(
        "No se pudo preparar la imagen para compartir. Intenta de nuevo.",
      );
      return;
    }

    try {
      setShareError(null);
      const uri = await captureRef(captureViewRef, {
        format: "png",
        quality: 1,
      });
      const canShare = await Sharing.isAvailableAsync();

      if (!canShare) {
        setShareError(
          "Este dispositivo no permite compartir desde esta pantalla.",
        );
        return;
      }

      await Sharing.shareAsync(uri);
    } catch {
      setShareError("No se pudo compartir el resumen. Intenta nuevamente.");
    }
  };

  const moodClass = (mood: number | null): string => {
    if (mood === null) return "bg-slate-200";
    if (mood <= 2) return "bg-orange-300";
    if (mood === 3) return "bg-yellow-300";
    return "bg-emerald-300";
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-indigo-50">
        <ActivityIndicator size="large" color="#6366f1" />
        <Text className="mt-3 text-sm font-semibold text-indigo-700">
          Preparando tu resumen semanal...
        </Text>
      </SafeAreaView>
    );
  }

  if (summaryError) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-indigo-50 px-6">
        <View className="w-full rounded-2xl border border-red-200 bg-red-50 p-4">
          <Text className="text-base font-extrabold text-red-700">
            No pudimos cargar tu resumen semanal
          </Text>
          <Text className="mt-2 text-sm font-semibold text-red-700">
            {summaryError}
          </Text>
          <Text className="mt-2 text-xs font-semibold text-red-600">
            Intenta abrir esta pantalla nuevamente en unos segundos.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const moodCharacter =
    stats.points >= 60 ? "excited" : stats.points >= 25 ? "happy" : "thinking";

  return (
    <SafeAreaView className="flex-1 bg-indigo-50">
      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
        <View className="mt-4 rounded-3xl border border-indigo-200 bg-white p-4">
          <Text className="text-lg font-extrabold text-indigo-900">
            Tu semana del {range.startISO} al {range.endISO}
          </Text>
          <View className="mt-3 items-center">
            <MochiCharacter mood={moodCharacter} size={84} />
            <Text className="mt-3 text-center text-sm font-semibold text-indigo-700">
              {message}
            </Text>
          </View>
        </View>

        <View className="mt-4 grid gap-3">
          <View className="rounded-2xl border border-indigo-200 bg-indigo-100 p-3">
            <Text className="text-xs font-bold text-indigo-700">
              Horas de estudio
            </Text>
            <Text className="text-2xl font-black text-indigo-900">
              {stats.studyHours}
            </Text>
          </View>
          <View className="rounded-2xl border border-blue-200 bg-blue-100 p-3">
            <Text className="text-xs font-bold text-blue-700">Sesiones</Text>
            <Text className="text-2xl font-black text-blue-900">
              {stats.sessions}
            </Text>
          </View>
          <View className="rounded-2xl border border-teal-200 bg-teal-100 p-3">
            <Text className="text-xs font-bold text-teal-700">Rutinas</Text>
            <Text className="text-2xl font-black text-teal-900">
              {stats.routines}
            </Text>
          </View>
          <View className="rounded-2xl border border-green-200 bg-green-100 p-3">
            <Text className="text-xs font-bold text-green-700">Hábitos</Text>
            <Text className="text-2xl font-black text-green-900">
              {stats.habitsCompleted}/{stats.habitsTotal}
            </Text>
          </View>
          <View className="rounded-2xl border border-yellow-200 bg-yellow-100 p-3">
            <Text className="text-xs font-bold text-yellow-700">
              Puntos ganados
            </Text>
            <Text className="text-2xl font-black text-yellow-900">
              {stats.points}
            </Text>
          </View>
          <View className="rounded-2xl border border-orange-200 bg-orange-100 p-3">
            <Text className="text-xs font-bold text-orange-700">
              Racha más larga
            </Text>
            <Text className="text-2xl font-black text-orange-900">
              {stats.streak}
            </Text>
          </View>
        </View>

        <View className="mt-4 rounded-2xl border border-pink-200 bg-white p-3">
          <Text className="text-sm font-bold text-pink-800">Ánimo semanal</Text>
          <View className="mt-2 flex-row">
            {stats.moods.map((mood, index) => (
              <View
                key={`${index}-${mood ?? "none"}`}
                className={`mr-2 h-3 w-3 rounded-full ${moodClass(mood)}`}
              />
            ))}
          </View>
        </View>

        <View className="mt-4 rounded-2xl border border-violet-200 bg-white p-3">
          <Text className="text-base font-extrabold text-violet-900">
            Atlas de semestre
          </Text>
          <Text className="mt-1 text-xs font-semibold text-violet-700">
            16 semanas de carga y presión académica
          </Text>

          {atlasLoading ? (
            <View className="items-center py-4">
              <ActivityIndicator size="small" color="#7c3aed" />
              <Text className="mt-2 text-xs font-semibold text-violet-700">
                Cargando atlas...
              </Text>
            </View>
          ) : null}

          {atlasError ? (
            <View className="mt-3 rounded-xl border border-red-200 bg-red-50 p-2">
              <Text className="text-xs font-semibold text-red-700">
                {atlasError}
              </Text>
            </View>
          ) : null}

          {!atlasLoading && !atlasError ? (
            <View className="mt-3">
              {atlasWeeks.map((week) => (
                <View
                  key={week.key}
                  className={`mb-2 rounded-xl border p-2 ${week.isCurrentWeek ? "border-violet-400 bg-violet-50" : "border-violet-100 bg-violet-50"}`}
                >
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs font-bold text-violet-900">
                      Semana {week.startISO} - {week.endISO}
                    </Text>
                    <View
                      className={`rounded-full px-2 py-1 ${week.intensity === "Alta" ? "bg-rose-100" : week.intensity === "Media" ? "bg-amber-100" : "bg-emerald-100"}`}
                    >
                      <Text className="text-[10px] font-bold text-slate-800">
                        {week.intensity}
                      </Text>
                    </View>
                  </View>

                  <Text className="mt-1 text-[11px] font-semibold text-violet-800">
                    Sesiones: {week.sessions} · Exámenes: {week.exams}
                  </Text>
                  <Text className="mt-1 text-[11px] font-semibold text-violet-700">
                    {week.recommendation}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        <View
          ref={(node) => {
            captureViewRef.current = node;
          }}
          collapsable={false}
          className="mt-4 rounded-2xl border border-indigo-200 bg-white p-4"
        >
          <Text className="text-center text-base font-extrabold text-indigo-900">
            Mi semana en Mochi
          </Text>
          <Text className="mt-1 text-center text-xs font-semibold text-indigo-700">
            Semana: {range.startISO} - {range.endISO}
          </Text>
          <Text className="mt-2 text-center text-sm font-semibold text-indigo-900">
            {stats.studyHours}h estudio · {stats.sessions} sesiones ·{" "}
            {stats.points} puntos
          </Text>
          <Text className="mt-2 text-center text-xs font-semibold text-indigo-600">
            Descarga Mochi en mochi.siramong.tech
          </Text>
        </View>

        <TouchableOpacity
          className="mb-10 mt-4 items-center rounded-2xl bg-indigo-600 py-3"
          onPress={() => {
            void shareSummary();
          }}
        >
          <Text className="font-bold text-white">Compartir resumen</Text>
        </TouchableOpacity>

        {shareError ? (
          <View className="mb-10 rounded-2xl border border-red-200 bg-red-50 p-3">
            <Text className="text-center text-sm font-semibold text-red-700">
              {shareError}
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

export default WeeklySummaryScreen;
