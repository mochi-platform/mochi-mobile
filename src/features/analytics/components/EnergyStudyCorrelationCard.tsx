import { useEffect, useMemo, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { buildPairs, describeCorrelation, pearson } from "../correlation";
import { reportError } from "@/src/shared/lib/observability/reportError";
import { supabase } from "@/src/shared/lib/supabase";
import { Card } from "@/src/shared/ui";

type Props = { allowed: boolean };

/** Correlación energía ↔ estudio (últimas 8 semanas). Premium. */
export function EnergyStudyCorrelationCard({ allowed }: Props) {
  const [energy, setEnergy] = useState<{ logged_date: string; overall_rating: number }[]>([]);
  const [sessions, setSessions] = useState<{ completed_at: string; duration_seconds: number }[]>(
    [],
  );

  useEffect(() => {
    if (!allowed) return;
    void (async () => {
      try {
        const since = new Date(Date.now() - 56 * 86400000);
        const sinceISO = since.toISOString();
        const sinceDay = sinceISO.slice(0, 10);
        const [e, s] = await Promise.all([
          supabase
            .from("energy_levels")
            .select("logged_date, overall_rating")
            .gte("logged_date", sinceDay),
          supabase
            .from("study_sessions")
            .select("completed_at, duration_seconds")
            .gte("completed_at", sinceISO),
        ]);
        setEnergy((e.data as typeof energy | null) ?? []);
        setSessions((s.data as typeof sessions | null) ?? []);
      } catch (error) {
        reportError(error, { scope: "analytics/correlation" });
      }
    })();
  }, [allowed]);

  const pairs = useMemo(() => buildPairs(energy, sessions), [energy, sessions]);
  const r = useMemo(
    () =>
      pearson(
        pairs.map((p) => p.energy),
        pairs.map((p) => p.studyMinutes),
      ),
    [pairs],
  );

  if (!allowed) {
    return (
      <TouchableOpacity
        accessibilityRole="button"
        className="mt-4"
        onPress={() => router.push("/premium")}
      >
        <Card>
          <Text className="text-base font-extrabold text-ink">Energía y estudio</Text>
          <Text className="mt-1 text-xs font-semibold text-ink-muted">
            Con Premium ves cómo se relacionan tu energía y tus horas de estudio. Conoce Premium.
          </Text>
        </Card>
      </TouchableOpacity>
    );
  }

  return (
    <View className="mt-4">
      <Card>
        <Text className="text-base font-extrabold text-ink">Energía y estudio</Text>
        <Text className="mt-1 text-sm font-semibold text-ink-muted">
          {describeCorrelation(r, pairs.length)}
        </Text>
        <Text className="mt-2 text-xs font-semibold text-ink-muted">
          Basado en {pairs.length} días con energía registrada.
        </Text>
      </Card>
    </View>
  );
}

export default EnergyStudyCorrelationCard;
