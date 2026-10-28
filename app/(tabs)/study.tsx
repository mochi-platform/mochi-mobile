import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { useSession } from "@/src/core/providers/SessionContext";
import {
  currentWeek,
  daysUntil,
  fetchStudy,
  hhmm,
  minutesBetween,
  type StudyData,
} from "@/src/features/study/api";
import { MochiCharacter } from "@/src/shared/components/MochiCharacter";
import { toLocalISODate } from "@/src/shared/lib/dates";
import { reportError } from "@/src/shared/lib/observability/reportError";
import { COLORS } from "@/src/shared/theme/tokens";
import {
  ACCENT_GLOW,
  Button,
  Caption,
  ELEVATION,
  ErrorState,
  Eyebrow,
  IconTile,
  ListGroup,
  ListRow,
  PressableScale,
  Screen,
  SectionHeader,
  Sheet,
  Stat,
  Surface,
  Title,
} from "@/src/shared/ui";

const ADD_OPTIONS = [
  { label: "Bloque de estudio", hint: "Un horario fijo en tu semana", icon: "time", route: "/study-create" },
  { label: "Examen", hint: "Anota uno próximo o una nota", icon: "school", route: "/exam-log" },
  { label: "Mazo de tarjetas", hint: "Repasa con tarjetas", icon: "layers", route: "/flashcard-decks" },
  { label: "Planificar con IA", hint: "Mochi arma tu semana", icon: "sparkles", route: "/weekly-planner" },
] as const;

function nowHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function StudyScreen() {
  const { session } = useSession();
  const userId = session?.user.id;
  const [data, setData] = useState<StudyData | null>(null);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      setData(await fetchStudy(userId));
      setError(false);
    } catch (e) {
      reportError(e, { scope: "study/load" });
      setError(true);
    } finally {
      setRefreshing(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const week = useMemo(() => currentWeek(), []);
  const today = new Date().getDay();
  const todayBlocks = data?.blocks.filter((b) => b.dayOfWeek === today) ?? [];
  const now = nowHHMM();
  const focus = todayBlocks.find((b) => hhmm(b.end) > now) ?? null;
  const laterToday = todayBlocks.filter((b) => b.id !== focus?.id && hhmm(b.start) > now);
  const upcomingExams = (data?.exams ?? [])
    .filter((e) => e.upcoming && daysUntil(e.date) >= 0)
    .sort((a, b) => a.date.localeCompare(b.date));
  const examDays = new Set(upcomingExams.map((e) => e.date.slice(0, 10)));
  const weekStart = week[0].iso;
  const weekSessions = (data?.sessions ?? []).filter((s) => toLocalISODate(new Date(s.completedAt)) >= weekStart);
  const weekMinutes = Math.round(weekSessions.reduce((sum, s) => sum + s.seconds, 0) / 60);

  return (
    <Screen
      title="Estudio"
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        void load();
      }}
      headerRight={
        <PressableScale
          onPress={() => setAddOpen(true)}
          accessibilityLabel="Agregar"
          className="h-11 w-11 items-center justify-center rounded-2xl bg-accent"
          style={ACCENT_GLOW}
        >
          <Ionicons name="add" size={26} color={COLORS.accentInk} />
        </PressableScale>
      }
    >
      {error && !data ? <ErrorState message="No pudimos cargar tu estudio." onRetry={() => void load()} /> : null}

      <View className="mt-3 flex-row justify-between" accessibilityLabel="Esta semana">
        {week.map((d) => (
          <View
            key={d.iso}
            className={`w-11 items-center rounded-2xl py-2 ${d.isToday ? "bg-ink" : ""}`}
            accessibilityLabel={`${d.letter} ${d.day}${examDays.has(d.iso) ? ", examen" : ""}`}
          >
            <Text className={`font-body-extrabold text-[11px] ${d.isToday ? "text-canvas/70" : "text-ink-muted"}`}>
              {d.letter}
            </Text>
            <Text className={`font-display text-lg ${d.isToday ? "text-canvas" : "text-ink"}`}>{d.day}</Text>
            <View className={`mt-0.5 h-[5px] w-[5px] rounded-full ${examDays.has(d.iso) ? "bg-tint-me-ink" : "bg-transparent"}`} />
          </View>
        ))}
      </View>

      {focus ? (
        <View className="mt-4 rounded-[28px] bg-surface p-5" style={ELEVATION[2]}>
          <View className="flex-row items-center gap-3">
            <View className="min-w-0 flex-1">
              <Eyebrow>{hhmm(focus.start) <= now ? "Ahora" : "Siguiente"} · {hhmm(focus.start)}</Eyebrow>
              <Title className="mt-1.5 text-[25px] leading-[29px]">{focus.subject}</Title>
              <Caption className="mt-1">{minutesBetween(focus.start, focus.end)} min</Caption>
            </View>
            <MochiCharacter expression="focused" size={92} animated={false} shadow={false} />
          </View>
          <View className="mt-4 self-start">
            <Button title="Empezar" onPress={() => router.push(`/study-timer?blockId=${focus.id}`)} />
          </View>
        </View>
      ) : data ? (
        <Surface className="mt-4 flex-row items-center gap-3 p-5">
          <View className="min-w-0 flex-1">
            <Title>{todayBlocks.length > 0 ? "Terminaste por hoy" : "Hoy no tienes bloques"}</Title>
            <Caption className="mt-1">
              {todayBlocks.length > 0
                ? "Buen trabajo. Descansar también es parte de estudiar."
                : "Arma tu semana en un minuto y Mochi te avisa a tiempo."}
            </Caption>
            {todayBlocks.length === 0 ? (
              <View className="mt-3 self-start">
                <Button title="Planificar mi semana" variant="soft" onPress={() => router.push("/weekly-planner")} />
              </View>
            ) : null}
          </View>
          <MochiCharacter expression={todayBlocks.length > 0 ? "proud" : "thinking"} size={84} animated={false} shadow={false} />
        </Surface>
      ) : null}

      {laterToday.length > 0 ? (
        <>
          <SectionHeader title="Más tarde" />
          <ListGroup>
            {laterToday.map((b) => (
              <ListRow
                key={b.id}
                title={b.subject}
                subtitle={`${hhmm(b.start)} – ${hhmm(b.end)}`}
                leading={<IconTile icon="book" tint="study" />}
                onPress={() => router.push(`/study-timer?blockId=${b.id}`)}
              />
            ))}
          </ListGroup>
        </>
      ) : null}

      {upcomingExams.length > 0 ? (
        <>
          <SectionHeader title="Exámenes" actionLabel="Registrar" onAction={() => router.push("/exam-log")} />
          <ListGroup>
            {upcomingExams.slice(0, 4).map((e) => {
              const days = daysUntil(e.date);
              return (
                <ListRow
                  key={e.id}
                  title={e.subject}
                  subtitle={days === 0 ? "Es hoy. Tú puedes." : days === 1 ? "Mañana" : `En ${days} días`}
                  leading={
                    <View className="w-10 items-center">
                      <Text className="font-display text-[22px] leading-6 text-tint-me-ink">{days}</Text>
                      <Text className="font-body-extrabold text-[11px] text-ink-muted">{days === 1 ? "día" : "días"}</Text>
                    </View>
                  }
                />
              );
            })}
          </ListGroup>
        </>
      ) : null}

      <SectionHeader title="Tarjetas" actionLabel="Mazos" onAction={() => router.push("/flashcard-decks")} />
      <ListGroup>
        <ListRow
          title="Repasar mis tarjetas"
          subtitle="Mochi te muestra cada tarjeta cuando toca"
          leading={<IconTile icon="layers" tint="me" />}
          onPress={() => router.push("/flashcard-decks")}
        />
      </ListGroup>

      {data ? (
        <>
          <SectionHeader title="Esta semana" actionLabel="Historial" onAction={() => router.push("/study-history")} />
          <Surface className="flex-row justify-between px-5 py-4">
            <Stat value={String(weekSessions.length)} label={weekSessions.length === 1 ? "sesión" : "sesiones"} />
            <Stat
              value={weekMinutes >= 60 ? `${Math.floor(weekMinutes / 60)} h ${weekMinutes % 60}` : `${weekMinutes} min`}
              label="estudiando"
            />
            <Stat value={String(upcomingExams.length)} label={upcomingExams.length === 1 ? "examen" : "exámenes"} />
          </Surface>
        </>
      ) : null}

      <Sheet visible={addOpen} onClose={() => setAddOpen(false)} title="¿Qué quieres agregar?">
        <ListGroup>
          {ADD_OPTIONS.map((o) => (
            <ListRow
              key={o.route}
              title={o.label}
              subtitle={o.hint}
              leading={<IconTile icon={o.icon} tint="study" />}
              onPress={() => {
                setAddOpen(false);
                router.push(o.route);
              }}
            />
          ))}
        </ListGroup>
      </Sheet>
    </Screen>
  );
}

export default StudyScreen;
