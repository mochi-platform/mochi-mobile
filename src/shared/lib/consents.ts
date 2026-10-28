import { supabase } from "@/src/shared/lib/supabase";

export type ConsentKind = "cycle_server" | "ai_usage" | "analytics" | "mochi_memory";

export async function getConsent(kind: ConsentKind): Promise<boolean> {
  const { data } = await supabase
    .from("user_consents")
    .select("granted")
    .eq("kind", kind)
    .maybeSingle<{ granted: boolean }>();
  return Boolean(data?.granted);
}

export async function setConsent(kind: ConsentKind, granted: boolean): Promise<void> {
  const { error } = await supabase.rpc("set_consent", {
    p_kind: kind,
    p_granted: granted,
  });
  if (error) throw error;
}

/** Sube el resumen mínimo del ciclo (inicio y duración) solo si hay consentimiento explícito. */
export async function syncCycleSummary(params: {
  lastPeriodStart?: string;
  cycleLength: number;
  source: "manual" | "health_connect";
}): Promise<void> {
  if (!params.lastPeriodStart) return;
  if (!(await getConsent("cycle_server"))) return;
  await supabase.rpc("log_cycle_summary", {
    p_period_start: params.lastPeriodStart,
    p_period_end: null,
    p_cycle_length: params.cycleLength,
    p_source: params.source,
  });
}
