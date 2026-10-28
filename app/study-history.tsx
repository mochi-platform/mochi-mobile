import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  formatDayLabel,
  formatHours,
  groupByDay,
  type SessionRow,
} from "@/src/features/study/history/group";
import { toLocalISODate } from "@/src/shared/lib/dates";
import { reportError } from "@/src/shared/lib/observability/reportError";
import { supabase } from "@/src/shared/lib/supabase";
import { Card, Chip, EmptyState, ErrorState, Skeleton } from "@/src/shared/ui";

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
    <SafeAreaView className="flex-1 bg-canvas">
      <View className="flex-row items-center px-4 pb-2 pt-2">
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Volver"
          className="h-11 w-11 items-center justify-center"
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={24} color="#8b6fd6" />
        </TouchableOpacity>
        <Text className="ml-1 text-xl font-extrabold text-ink">Historial de estudio</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <View className="mb-4 flex-row gap-2">
          {RANGES.map((r) => (
            <Chip
              key={r.days}
              label={r.label}
              selected={rangeDays === r.days}
              onPress={() => setRangeDays(r.days)}
            />
          ))}
        </View>

        {loading ? (
          <View className="gap-3">
            <Skeleton height={72} />
            <Skeleton height={72} />
            <Skeleton height={72} />
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
            <Card className="mb-4 bg-accent-soft">
              <Text className="text-xs font-extrabold uppercase text-ink-muted">
                Total en el periodo
              </Text>
              <Text className="text-2xl font-extrabold text-ink">{formatHours(totalSeconds)}</Text>
              <Text className="text-xs font-semibold text-ink-muted">{rows.length} sesiones</Text>
            </Card>

            {groups.map((group) => (
              <View key={group.day} className="mb-4">
                <View className="mb-2 flex-row items-center justify-between">
                  <Text className="text-sm font-extrabold capitalize text-ink">
                    {formatDayLabel(group.day, today)}
                  </Text>
                  <Text className="text-xs font-bold text-ink-muted">
                    {formatHours(group.totalSeconds)}
                  </Text>
                </View>
                {group.sessions.map((s) => (
                  <Card key={s.id} className="mb-2 flex-row items-center justify-between">
                    <Text className="flex-1 pr-2 text-sm font-bold text-ink">{s.subject}</Text>
                    <Text className="text-xs font-extrabold text-accent">
                      {formatHours(s.duration_seconds)}
                    </Text>
                  </Card>
                ))}
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

export default StudyHistoryScreen;
