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

export async function requestAiUsage(params: {
  reason: string;
  sourceRef?: string | null;
  metadata?: Record<string, unknown> | null;
}): Promise<AiUsageResult> {
  const { data, error } = await supabase.rpc("apply_plan_limits_for_ai", {
    p_reason: params.reason,
    p_source_ref: params.sourceRef ?? null,
    p_metadata: params.metadata ?? null,
  });

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

export async function claimAiCreditFromAd(params: {
  rewardEventId: string;
  adNetwork?: string | null;
  adUnitId?: string | null;
}): Promise<AiCreditBalance | null> {
  const { data, error } = await supabase.rpc("claim_ai_credit_from_ad", {
    p_reward_event_id: params.rewardEventId,
    p_ad_network: params.adNetwork ?? null,
    p_ad_unit_id: params.adUnitId ?? null,
  });

  if (error) throw error;

  const payload = (data ?? {}) as {
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

export function buildAiLimitMessage(reason?: string | null): string {
  if (reason === "daily_limit") {
    return "Ya alcanzaste el limite diario de IA. Vuelve manana.";
  }

  if (reason === "no_credits") {
    return "No tienes creditos de IA. Mira un anuncio para continuar.";
  }

  return "No pudimos validar tus creditos de IA en este momento.";
}
