import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Text, View } from "react-native";
import {
  formatDayLabel,
  formatHours,
  groupByDay,
  type SessionRow,
} from "@/src/features/study/history/group";
import { toLocalISODate } from "@/src/shared/lib/dates";
import { reportError } from "@/src/shared/lib/observability/reportError";
import { supabase } from "@/src/shared/lib/supabase";
import {
  EmptyState,
  ErrorState,
  IconTile,
  ListGroup,
  ListRow,
  Screen,
  SectionHeader,
  Segmented,
  Skeleton,
  Stat,
  Surface,
} from "@/src/shared/ui";

const RANGES = [
  { days: 7, label: "7 días" },
  { days: 30, label: "30 días" },
  { days: 90, label: "90 días" },
] as const;

/** Historial real de sesiones de estudio, por día. */
export function StudyHistoryScreen() {
  const [rangeDays, setRangeDays] = useState<number>(30);
  const [rows, setRows] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const since = new Date(Date.now() - rangeDays * 86400000).toISOString();
      const { data, error } = await supabase
        .from("study_sessions")
        .select("id, subject, duration_seconds, completed_at")
        .gte("completed_at", since)
        .order("completed_at", { ascending: false })
        .limit(500)
        .returns<SessionRow[]>();
      if (error) throw error;
      setRows(data ?? []);
    } catch (error) {
      reportError(error, { scope: "study-history/load" });
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [rangeDays]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const groups = useMemo(() => groupByDay(rows), [rows]);
  const totalSeconds = rows.reduce((sum, r) => sum + r.duration_seconds, 0);
  const today = toLocalISODate(new Date());

  return (
    <Screen title="Historial" withTabBar={false} closable>
      <Segmented
        className="mt-2"
        options={RANGES.map((r) => ({ value: String(r.days), label: r.label }))}
        value={String(rangeDays)}
        onChange={(value) => setRangeDays(Number(value))}
      />

      {loading ? (
        <View className="mt-4 gap-3">
          <Skeleton height={90} className="rounded-card" />
          <Skeleton height={140} className="rounded-card" />
        </View>
      ) : failed ? (
        <ErrorState onRetry={() => void load()} />
      ) : groups.length === 0 ? (
        <EmptyState
          title="Aún no hay sesiones"
          message="Cuando termines una sesión de estudio, aparecerá aquí."
          actionLabel="Ir a estudiar"
          onAction={() => router.replace("/study")}
        />
      ) : (
        <>
          <Surface elevation={2} className="mt-4 flex-row items-center gap-6 p-4">
            <Stat value={formatHours(totalSeconds)} label="en total" />
            <Stat value={String(rows.length)} label={rows.length === 1 ? "sesión" : "sesiones"} />
          </Surface>

          {groups.map((group) => (
            <View key={group.day}>
              <SectionHeader
                title={(() => {
                  const label = formatDayLabel(group.day, today);
                  return label.charAt(0).toUpperCase() + label.slice(1);
                })()}
                actionLabel={formatHours(group.totalSeconds)}
              />
              <ListGroup>
                {group.sessions.map((s) => (
                  <ListRow
                    key={s.id}
                    title={s.subject}
                    leading={<IconTile icon="book" tint="study" />}
                    trailing={
                      <Text className="font-body-extrabold text-sm text-accent-strong">
                        {formatHours(s.duration_seconds)}
                      </Text>
                    }
                  />
                ))}
              </ListGroup>
            </View>
          ))}
        </>
      )}
    </Screen>
  );
}

export default StudyHistoryScreen;
