import { reportError } from "@/src/shared/lib/observability/reportError";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/src/shared/lib/supabase";

export type PlanFeatures = {
  analytics_history: boolean;
  analytics_correlation: boolean;
  themes: boolean;
  duo_plus: boolean;
  ads: boolean;
};

export type UserPlan = {
  isPremium: boolean;
  status: string | null;
  periodEndsAt: string | null;
  features: PlanFeatures;
};

const FREE_FEATURES: PlanFeatures = {
  analytics_history: false,
  analytics_correlation: false,
  themes: false,
  duo_plus: false,
  ads: true,
};

/** El plan lo decide el servidor (`get_user_plan`); la UI solo lo refleja. */
export function usePlan() {
  const [plan, setPlan] = useState<UserPlan>({
    isPremium: false,
    status: null,
    periodEndsAt: null,
    features: FREE_FEATURES,
  });
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_user_plan");
      if (error) throw error;
      const payload = (data ?? {}) as {
        is_premium?: boolean;
        status?: string | null;
        current_period_ends_at?: string | null;
        features?: Partial<PlanFeatures>;
      };
      setPlan({
        isPremium: Boolean(payload.is_premium),
        status: payload.status ?? null,
        periodEndsAt: payload.current_period_ends_at ?? null,
        features: { ...FREE_FEATURES, ...(payload.features ?? {}) },
      });
    } catch (error) {
      // Sin red o sin sesión: se mantiene el plan gratuito.
      reportError(error, { scope: "src/shared/hooks/usePlan.ts" });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { plan, isLoading, refresh };
}
