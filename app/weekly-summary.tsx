import { useCallback, useMemo, useRef, useState, type ComponentRef } from "react";
import { Text, View } from "react-native";
import * as Sharing from "expo-sharing";
import { captureRef } from "react-native-view-shot";
import { MochiCharacter } from "@/src/shared/components/MochiCharacter";
import { useSession } from "@/src/core/providers/SessionContext";
import { supabase } from "@/src/shared/lib/supabase";
import { generateWeeklySummaryMessage } from "@/src/shared/lib/ai";
import { requestAiUsage } from "@/src/shared/lib/aiCredits";
import { toLocalISODate } from "@/src/shared/lib/dates";
import { useFocusEffect } from "expo-router";
import { MoodFace } from "@/src/features/today/MoodFace";
import type { Mood } from "@/src/features/companion/lines";
import {
  Button,
  Caption,
  ErrorState,
  ListGroup,
  ListRow,
  MochiBubble,
  Screen,
  SectionHeader,
  Skeleton,
  Stat,
  Strong,
  Surface,
  Title,
} from "@/src/shared/ui";

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
  moods: (number | null)[];
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
  return toLocalISODate(date);
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
  const captureViewRef = useRef<ComponentRef<typeof View>>(null);

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
      startISO: toLocalISODate(monday),
      endISO: toLocalISODate(sunday),
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
          supabase.from("streaks").select("longest_streak").eq("user_id", userId).maybeSingle(),
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
          setSummaryError(baseError.message ?? "No se pudo cargar el resumen semanal");
          setStats(createEmptyStats());
          setMessage("");
          setAtlasWeeks([]);
          setAtlasLoading(false);
          setLoading(false);
          return;
        }

        const studyHours =
          ((studyRes.data as { duration_seconds: number }[] | null) ?? []).reduce(
            (sum, row) => sum + row.duration_seconds,
            0,
          ) / 3600;
        const sessions = sessionsRes.count ?? 0;
        const routines = routineRes.count ?? 0;
        const habitsCompleted = habitsRes.count ?? 0;
        const habitsTotal = (habitsCountRes.count ?? 0) * 7;
        const points = sessions * 5 + routines * 10 + (gratitudeRes.count ?? 0) * 3;

        const moodMap = new Map<string, number>();
        (
          (moodRes.data as
            | {
                mood: number;
                logged_date: string;
              }[]
            | null) ?? []
        ).forEach((row) => {
          moodMap.set(row.logged_date, row.mood);
        });

        const moodDots = Array.from({ length: 7 }, (_, i) => {
          const date = new Date(range.start);
          date.setDate(range.start.getDate() + i);
          return moodMap.get(toLocalISODate(date)) ?? null;
        });

        setStats({
          studyHours: Number(studyHours.toFixed(1)),
          sessions,
          routines,
          habitsCompleted,
          habitsTotal,
          points,
          streak: (streakRes.data as { longest_streak: number } | null)?.longest_streak ?? 0,
          moods: moodDots,
        });

        try {
          if (atlasSessionsRes.error) throw atlasSessionsRes.error;
          if (atlasExamsRes.error) throw atlasExamsRes.error;

          const sessionsByWeek = new Map<string, number>();
          ((atlasSessionsRes.data as { completed_at: string }[] | null) ?? []).forEach((row) => {
            const sessionDate = row.completed_at.slice(0, 10);
            const weekKey = getWeekKeyByDate(sessionDate);
            sessionsByWeek.set(weekKey, (sessionsByWeek.get(weekKey) ?? 0) + 1);
          });

          const examsByWeek = new Map<string, number>();
          ((atlasExamsRes.data as { exam_date: string }[] | null) ?? []).forEach((row) => {
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

        try {
          const usage = await requestAiUsage({
            reason: "ai_summary",
            sourceRef: "weekly_summary",
          });

          if (!usage.allowed) {
            // Sin créditos de IA, Mochi igual habla: nada de mandar a ver anuncios aquí.
            setMessage(localWeekMessage(points, sessions));
          } else {
            const aiMessage = await generateWeeklySummaryMessage({
              studyHours: Number(studyHours.toFixed(1)),
              sessions,
              routines,
              habitsCompleted,
              habitsTotal,
              points,
              streak: (streakRes.data as { longest_streak: number } | null)?.longest_streak ?? 0,
            });
            setMessage(aiMessage.trim());
          }
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
      setShareError("No se pudo preparar la imagen para compartir. Intenta de nuevo.");
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
        setShareError("Este dispositivo no permite compartir desde esta pantalla.");
        return;
      }

      await Sharing.shareAsync(uri);
    } catch {
      setShareError("No se pudo compartir el resumen. Intenta nuevamente.");
    }
  };

  if (loading) {
    return (
      <Screen title="Tu semana" withTabBar={false} closable>
        <View className="mt-4 gap-3">
          <Skeleton height={150} className="rounded-card" />
          <Skeleton height={180} className="rounded-card" />
        </View>
      </Screen>
    );
  }

  if (summaryError) {
    return (
      <Screen title="Tu semana" withTabBar={false} closable>
        <ErrorState message="No pudimos cargar tu resumen. Intenta en unos segundos." />
      </Screen>
    );
  }

  const moodCharacter = stats.points >= 60 ? "excited" : stats.points >= 25 ? "happy" : "thinking";
  const rangeLabel = formatRange(range.startISO, range.endISO);
  const moodValues = stats.moods.filter((m): m is number => m !== null);

  return (
    <Screen title="Tu semana" subtitle={rangeLabel} withTabBar={false} closable>
      <View className="mt-3 items-center">
        <MochiCharacter mood={moodCharacter} size={120} />
      </View>
      {message ? <MochiBubble className="mt-1" text={message} /> : null}

      <SectionHeader title="En números" />
      <Surface className="p-4">
        <View className="flex-row">
          <Stat className="flex-1" value={`${stats.studyHours}h`} label="estudiando" />
          <Stat className="flex-1" value={String(stats.sessions)} label="sesiones" />
          <Stat className="flex-1" value={String(stats.routines)} label="rutinas" />
        </View>
        <View className="my-4 h-px bg-line" />
        <View className="flex-row">
          <Stat
            className="flex-1"
            value={`${stats.habitsCompleted}/${stats.habitsTotal}`}
            label="hábitos"
          />
          <Stat className="flex-1" value={String(stats.points)} label="puntos" />
          <Stat className="flex-1" value={String(stats.streak)} label="mejor racha" />
        </View>
      </Surface>

      <SectionHeader title="Cómo te sentiste" />
      <Surface className="flex-row justify-between px-4 py-3.5">
        {stats.moods.map((mood, index) => (
          <View key={`${index}-${mood ?? "none"}`} className="items-center gap-1.5">
            {mood ? (
              <MoodFace mood={Math.min(5, Math.max(1, Math.round(mood))) as Mood} size={30} />
            ) : (
              <View className="h-[30px] w-[30px] rounded-full bg-surface-muted" />
            )}
            <Caption className="text-[11px]">{WEEK_LETTERS[index] ?? ""}</Caption>
          </View>
        ))}
      </Surface>
      {moodValues.length === 0 ? (
        <Caption className="ml-1 mt-2">Haz el check-in de Hoy y aquí verás tu semana.</Caption>
      ) : null}

      <SectionHeader title="Tu semestre" />
      {atlasLoading ? (
        <Skeleton height={120} className="rounded-card" />
      ) : atlasError ? (
        <Surface tone="sunken" className="p-4">
          <Caption className="text-danger">{atlasError}</Caption>
        </Surface>
      ) : (
        <ListGroup>
          {atlasWeeks
            .slice(
              Math.max(
                0,
                atlasWeeks.findIndex((w) => w.isCurrentWeek),
              ),
            )
            .slice(0, 6)
            .map((week) => (
              <ListRow
                key={week.key}
                title={`${week.isCurrentWeek ? "Esta semana · " : ""}${formatRange(week.startISO, week.endISO)}`}
                subtitle={`${week.sessions} sesiones · ${week.exams} exámenes · ${week.recommendation}`}
                multiline
                trailing={
                  <View
                    className={`rounded-full px-2.5 py-1 ${week.intensity === "Alta" ? "bg-tint-me" : week.intensity === "Media" ? "bg-tint-kitchen" : "bg-tint-ok"}`}
                  >
                    <Text className="font-body-extrabold text-[11px] text-ink">
                      {week.intensity}
                    </Text>
                  </View>
                }
              />
            ))}
        </ListGroup>
      )}

      {/* Tarjeta que se captura como imagen para compartir. */}
      <View
        ref={(node) => {
          captureViewRef.current = node;
        }}
        collapsable={false}
        className="mt-6 items-center rounded-card bg-surface p-5"
      >
        <MochiCharacter expression="proud" size={84} animated={false} shadow={false} />
        <Title className="mt-1 text-center">Mi semana en Mochi</Title>
        <Caption className="mt-0.5 text-center">{rangeLabel}</Caption>
        <Strong className="mt-2 text-center">
          {stats.studyHours}h de estudio · {stats.sessions} sesiones · {stats.points} puntos
        </Strong>
        <Caption className="mt-2 text-center">mochi.siramong.tech</Caption>
      </View>

      <View className="mt-4">
        <Button
          title="Compartir mi semana"
          icon="share-outline"
          onPress={() => void shareSummary()}
        />
      </View>
      {shareError ? <Caption className="mt-2 text-center text-danger">{shareError}</Caption> : null}
    </Screen>
  );
}

const WEEK_LETTERS = ["L", "M", "X", "J", "V", "S", "D"];

/** «19 – 25 oct» (o «28 sep – 4 oct» si cambia de mes). */
function formatRange(startISO: string, endISO: string): string {
  const parse = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d);
  };
  const start = parse(startISO);
  const end = parse(endISO);
  const month = (date: Date) =>
    new Intl.DateTimeFormat("es-EC", { month: "short" }).format(date).replace(".", "");
  return start.getMonth() === end.getMonth()
    ? `${start.getDate()} – ${end.getDate()} ${month(end)}`
    : `${start.getDate()} ${month(start)} – ${end.getDate()} ${month(end)}`;
}

function localWeekMessage(points: number, sessions: number): string {
  if (points >= 60) return "¡Qué semana! Se nota todo lo que te cuidaste. Estoy orgullosa de ti.";
  if (sessions > 0) return "Avanzaste a tu ritmo y eso cuenta. La próxima semana seguimos juntas.";
  return "Esta semana fue tranquila, y está bien. Empecemos con algo pequeño.";
}

export default WeeklySummaryScreen;
