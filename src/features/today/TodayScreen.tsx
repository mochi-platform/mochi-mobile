import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Text, View } from "react-native";
import { useCycle } from "@/src/core/providers/CycleContext";
import { useAccent } from "@/src/core/providers/ThemeContext";
import { useSession } from "@/src/core/providers/SessionContext";
import type { ModuleVisibility } from "@/src/core/providers/ModuleVisibilityContext";
import {
  CHECKIN_REPLY,
  GREETING_QUESTION,
  pickLine,
  timeOfDay,
  type Mood,
} from "@/src/features/companion/lines";
import { formatTimeHHMM } from "@/src/features/home/dashboard/helpers";
import { useDashboardData } from "@/src/features/home/dashboard/useDashboardData";
import { MochiCharacter } from "@/src/shared/components/MochiCharacter";
import { getDailyMotivation } from "@/src/shared/lib/ai";
import { toLocalISODate } from "@/src/shared/lib/dates";
import { reportError } from "@/src/shared/lib/observability/reportError";
import type { MochiHandle } from "@/src/shared/mochi/MochiCanvas";
import type { MochiExpression } from "@/src/shared/mochi/manifest";
import { COLORS } from "@/src/shared/theme/tokens";
import {
  Eyebrow,
  Display,
  IconTile,
  ListGroup,
  ListRow,
  MochiBubble,
  ELEVATION,
  PressableScale,
  ProgressRing,
  Screen,
  SectionHeader,
  haptic,
} from "@/src/shared/ui";
import { fetchTodayMood, saveTodayMood } from "./api";
import { CycleCard } from "./CycleCard";
import { MoodFace } from "./MoodFace";

const MOODS: Mood[] = [1, 2, 3, 4, 5];
const MOOD_LABEL: Record<Mood, string> = {
  1: "Muy mal",
  2: "Mal",
  3: "Normal",
  4: "Bien",
  5: "Muy bien",
};
const MOOD_EXPRESSION: Record<Mood, MochiExpression> = {
  1: "soft_sad",
  2: "worried",
  3: "happy",
  4: "proud",
  5: "celebrating",
};

type TodayScreenProps = {
  userName: string;
  moduleVisibility: ModuleVisibility;
  onOpenQuickCapture: () => void;
};

function daysUntil(isoDate: string): number {
  const today = new Date(toLocalISODate(new Date()));
  return Math.round((new Date(isoDate).getTime() - today.getTime()) / 86_400_000);
}

/** Hoy: Mochi habla primero, check-in de ánimo y solo lo que de verdad toca hoy. */
export function TodayScreen({
  userName,
  moduleVisibility: m,
  onOpenQuickCapture,
}: TodayScreenProps) {
  const { session } = useSession();
  const userId = session?.user.id;
  const { cycleData } = useCycle();
  const data = useDashboardData(userId);
  const mochi = useRef<MochiHandle>(null);
  const accent = useAccent();
  const [mood, setMood] = useState<Mood | null>(null);

  const now = new Date();
  const dayKey = toLocalISODate(now);
  const period = timeOfDay(now);
  const dateLabel = now.toLocaleDateString("es-EC", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const greeting = { manana: "Buenos días", tarde: "Buenas tardes", noche: "Buenas noches" }[
    period
  ];

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    fetchTodayMood(userId)
      .then((value) => {
        if (alive) setMood(value);
      })
      .catch((error) => reportError(error, { scope: "today/mood-load" }));
    return () => {
      alive = false;
    };
  }, [userId]);

  // Frase de IA del día (en caché diaria, con respaldo local). Solo complementa la respuesta al
  // check-in; antes del check-in Mochi pregunta. Nunca bloquea: la frase local se ve al instante.
  const [aiLine, setAiLine] = useState<string | null>(null);
  const blockCount = m.study_enabled ? data.todayBlocks.length : 0;
  const hasRoutine = m.exercise_enabled && data.todayRoutines.length > 0;
  useEffect(() => {
    if (!mood || data.loading) return;
    let alive = true;
    getDailyMotivation(blockCount, hasRoutine, period, cycleData?.phase)
      .then((text) => {
        if (alive && text.trim()) setAiLine(text.trim());
      })
      .catch((error) => reportError(error, { scope: "today/ai-line" }));
    return () => {
      alive = false;
    };
  }, [mood, data.loading, blockCount, hasRoutine, period, cycleData?.phase]);

  const line = useMemo(() => {
    if (!mood) return pickLine(GREETING_QUESTION[period], dayKey);
    const reply = pickLine(CHECKIN_REPLY[mood], `${dayKey}-${mood}`);
    return aiLine ? `${reply} ${aiLine}` : reply;
  }, [mood, dayKey, period, aiLine]);

  const checkIn = (value: Mood) => {
    if (!userId) return;
    const previous = mood;
    setMood(value);
    haptic("success");
    mochi.current?.react(value >= 4 ? "celebrate" : "nod");
    saveTodayMood(userId, value).catch((error) => {
      setMood(previous);
      reportError(error, { scope: "today/mood-save" });
    });
  };

  const nextBlock = m.study_enabled ? data.todayBlocks[0] : undefined;
  const exam = m.study_enabled ? data.upcomingExams[0] : undefined;
  const habitsDone = data.habitCount > 0 ? data.habitLogsCount / data.habitCount : 0;
  const recipe = m.cooking_enabled ? data.latestRecipe : null;
  const routine = m.exercise_enabled ? data.todayRoutines[0] : undefined;
  const hasDay =
    Boolean(nextBlock) ||
    (m.habits_enabled && data.habitCount > 0) ||
    Boolean(exam) ||
    Boolean(routine) ||
    Boolean(recipe);

  return (
    <Screen refreshing={data.refreshing} onRefresh={data.refresh}>
      <View className="mt-2.5 flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1">
          <Eyebrow className="mb-1.5">{dateLabel}</Eyebrow>
          <Display>
            {greeting},{"\n"}
            {userName}
          </Display>
        </View>
        <View className="flex-row gap-2">
          {m.quick_capture_enabled ? (
            <PressableScale
              onPress={onOpenQuickCapture}
              accessibilityLabel="Captura rápida"
              className="h-10 w-10 items-center justify-center rounded-full bg-accent-soft"
            >
              <Ionicons name="flash" size={18} color={COLORS.accentStrong} />
            </PressableScale>
          ) : null}
          <PressableScale
            onPress={() => router.push("/profile")}
            accessibilityLabel="Ir al perfil"
            className="h-10 w-10 items-center justify-center rounded-full bg-tint-me"
          >
            <Text className="font-display text-base text-tint-me-ink">
              {userName.charAt(0).toUpperCase()}
            </Text>
          </PressableScale>
        </View>
      </View>

      <View className="mt-4 items-center">
        <MochiCharacter
          ref={mochi}
          expression={mood ? MOOD_EXPRESSION[mood] : period === "noche" ? "sleepy" : "happy"}
          size={180}
          interactive
        />
      </View>

      <MochiBubble className="mt-1" text={line}>
        <View className="mt-3.5 flex-row justify-between" accessibilityRole="radiogroup">
          {MOODS.map((value) => {
            const on = mood === value;
            return (
              <PressableScale
                key={value}
                haptics={false}
                onPress={() => checkIn(value)}
                accessibilityRole="radio"
                accessibilityLabel={MOOD_LABEL[value]}
                accessibilityState={{ selected: on }}
                className="h-[50px] w-[50px] items-center justify-center rounded-[18px]"
                style={[ELEVATION[1], { backgroundColor: on ? accent.accent : COLORS.surface }]}
              >
                <MoodFace mood={value} />
              </PressableScale>
            );
          })}
        </View>
      </MochiBubble>

      <CycleCard />

      {hasDay ? (
        <>
          <SectionHeader title="Tu día" />
          <ListGroup>
            {nextBlock ? (
              <ListRow
                title={nextBlock.subject}
                subtitle={`${formatTimeHHMM(nextBlock.start_time)} – ${formatTimeHHMM(nextBlock.end_time)}`}
                leading={<IconTile icon="book" tint="study" />}
                onPress={() => router.replace("/(tabs)/study")}
              />
            ) : null}
            {m.habits_enabled && data.habitCount > 0 ? (
              <ListRow
                title="Hábitos"
                subtitle={`${data.habitLogsCount} de ${data.habitCount} hechos hoy`}
                leading={<IconTile icon="leaf" tint="ok" />}
                trailing={
                  <ProgressRing progress={habitsDone} accessibilityLabel="Hábitos de hoy" />
                }
                onPress={() => router.push("/(tabs)/habits")}
              />
            ) : null}
            {exam ? (
              <ListRow
                title={`Examen de ${exam.subject}`}
                subtitle={
                  daysUntil(exam.exam_date) <= 0
                    ? "Es hoy. Tú puedes."
                    : `En ${daysUntil(exam.exam_date)} ${daysUntil(exam.exam_date) === 1 ? "día" : "días"}`
                }
                leading={<IconTile icon="school" tint="me" />}
                onPress={() => router.push("/exam-log")}
              />
            ) : null}
            {routine ? (
              <ListRow
                title={routine.name}
                subtitle={`Tu rutina de hoy · ${routine.routine_exercises.length} ejercicios`}
                leading={<IconTile icon="barbell" tint="study" />}
                onPress={() => router.push(`/routine-player?routineId=${routine.id}`)}
              />
            ) : null}
            {recipe ? (
              <ListRow
                title={recipe.title}
                subtitle="Una idea para cocinar"
                leading={<IconTile icon="restaurant" tint="kitchen" />}
                onPress={() => router.replace("/(tabs)/cooking")}
              />
            ) : null}
          </ListGroup>
        </>
      ) : !data.loading ? (
        <MochiBubble
          className="mt-6"
          tail="none"
          text="Hoy no tienes nada agendado. Un buen día para descansar o empezar algo nuevo."
        />
      ) : null}
    </Screen>
  );
}
