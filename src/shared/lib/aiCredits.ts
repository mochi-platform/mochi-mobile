import { supabase } from "@/src/shared/lib/supabase";

export type AiCreditBalance = {
  balance: number;
  dailyLimit: number;
  claimedToday: number;
  remainingToday: number;
};

export type AiUsageResult = {
  allowed: boolean;
  planKey: "free" | "premium" | string;
  balance: number;
  reason?: string | null;
  limits?: Record<string, unknown> | null;
};

export async function getAiCreditBalance(): Promise<AiCreditBalance | null> {
  const { data, error } = await supabase.rpc("get_ai_credit_balance");
  if (error) throw error;
  if (!data || typeof data !== "object") return null;

  const payload = data as {
    balance?: number;
    daily_limit?: number;
    claimed_today?: number;
    remaining_today?: number;
  };

  return {
    balance: payload.balance ?? 0,
    dailyLimit: payload.daily_limit ?? 0,
    claimedToday: payload.claimed_today ?? 0,
    remainingToday: payload.remaining_today ?? 0,
  };
}

/**
 * Comprobación previa, sin consumo: el crédito lo cobra el gateway de IA al
 * procesar cada petición. Los parámetros se conservan por compatibilidad.
 */
export async function requestAiUsage(_params?: {
  reason?: string;
  sourceRef?: string | null;
  metadata?: Record<string, unknown> | null;
}): Promise<AiUsageResult> {
  const { data, error } = await supabase.rpc("check_ai_allowance");

  if (error) throw error;

  const payload = (data ?? {}) as {
    allowed?: boolean;
    plan_key?: string;
    balance?: number;
    reason?: string;
    limits?: Record<string, unknown> | null;
  };

  return {
    allowed: Boolean(payload.allowed),
    planKey: payload.plan_key ?? "free",
    balance: payload.balance ?? 0,
    reason: payload.reason ?? null,
    limits: payload.limits ?? null,
  };
}

/** El crédito lo otorga el servidor al verificar el anuncio (admob-ssv); aquí solo se espera y se relee el saldo. */
export async function waitForAdCredit(previousBalance: number): Promise<AiCreditBalance | null> {
  let latest: AiCreditBalance | null = null;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    latest = await getAiCreditBalance();
    if (latest && latest.balance > previousBalance) return latest;
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  return latest;
}

export function buildAiLimitMessage(reason?: string | null): string {
  if (reason === "daily_limit") {
    return "Ya alcanzaste el limite diario de IA. Vuelve manana.";
  }

  if (reason === "no_credits") {
    return "No tienes creditos de IA. Mira un anuncio para continuar.";
  }

  return "No pudimos validar tus creditos de IA en este momento.";
}
