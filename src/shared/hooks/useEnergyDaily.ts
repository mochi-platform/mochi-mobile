import { useEffect, useState } from "react";
import { supabase } from "@/src/shared/lib/supabase";
import type { EnergyLevel } from "@mochi/supabase/types";

type EnergyTrend = "up" | "down" | "stable";

export function useEnergyDaily() {
  const [todayEnergy, setTodayEnergy] = useState<number | null>(null);
  const [trend, setTrend] = useState<EnergyTrend>("stable");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setIsLoading(true);

        // Get today's date
        const today = new Date().toISOString().split("T")[0];

        // Fetch today's energy level
        const { data: todayData, error: todayError } = await supabase
          .from("energy_levels")
          .select("*")
          .eq("logged_date", today)
          .maybeSingle();

        if (todayError && todayError.code !== "PGRST116") {
          throw todayError;
        }

        const currentEnergy =
          (todayData as EnergyLevel)?.overall_rating ?? null;
        setTodayEnergy(currentEnergy);

        // Calculate trend from last 3 days
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 3);
        const pastDateStr = pastDate.toISOString().split("T")[0];

        const { data: pastData, error: pastError } = await supabase
          .from("energy_levels")
          .select("overall_rating")
          .eq("user_id", (await supabase.auth.getUser()).data?.user?.id ?? "")
          .gte("logged_date", pastDateStr)
          .lt("logged_date", today)
          .order("logged_date", { ascending: true });

        if (pastError && pastError.code !== "PGRST116") {
          throw pastError;
        }

        // Calculate trend
        const calculatedTrend = calculateTrend(
          currentEnergy,
          (pastData as EnergyLevel[])?.map((e) => e.overall_rating) ?? [],
        );
        setTrend(calculatedTrend);

        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Error fetching energy"),
        );
        console.error("useEnergyDaily error:", err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  return { todayEnergy, trend, isLoading, error };
}

function calculateTrend(current: number | null, past: number[]): EnergyTrend {
  if (current === null || past.length === 0) return "stable";

  const avg = past.reduce((a, b) => a + b, 0) / past.length;
  const diff = current - avg;

  if (diff > 0.5) return "up";
  if (diff < -0.5) return "down";
  return "stable";
}
