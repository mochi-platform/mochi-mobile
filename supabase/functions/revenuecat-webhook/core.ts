const STATUS_BY_EVENT: Record<string, string> = {
  INITIAL_PURCHASE: "active",
  RENEWAL: "active",
  PRODUCT_CHANGE: "active",
  UNCANCELLATION: "active",
  NON_RENEWING_PURCHASE: "active",
  CANCELLATION: "active", // sigue activo hasta el fin del periodo
  BILLING_ISSUE: "grace_period",
  EXPIRATION: "expired",
  SUBSCRIPTION_EXTENDED: "active",
  TRANSFER: "transfer",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type WebhookDeps = {
  expectedAuth: string | undefined;
  /** Marca de tiempo (ms) del último evento registrado para la usuaria, o 0. */
  lastEventTs: (userId: string) => Promise<number>;
  sync: (args: Record<string, unknown>) => Promise<{ code?: string; message: string } | null>;
  newId: () => string;
};

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function handleWebhook(req: Request, deps: WebhookDeps): Promise<Response> {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (!deps.expectedAuth || !safeEqual(req.headers.get("Authorization") ?? "", deps.expectedAuth)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const event = body?.event;
  if (!event || typeof event.type !== "string") return new Response("Bad request", { status: 400 });

  const status = STATUS_BY_EVENT[event.type];
  if (!status) return Response.json({ ignored: true });

  const entitlement = Array.isArray(event.entitlement_ids)
    ? event.entitlement_ids.includes("premium")
      ? "premium"
      : null
    : "premium";
  if (!entitlement) return Response.json({ ignored: true });

  const iso = (ms: unknown) => (typeof ms === "number" ? new Date(ms).toISOString() : null);

  const apply = async (userId: string, st: string) => {
    if (!UUID_RE.test(userId)) return null;
    // Eventos fuera de orden: se ignora uno más antiguo que el último registrado.
    const lastTs = await deps.lastEventTs(userId);
    if (lastTs && Number(event.event_timestamp_ms ?? 0) < lastTs) return null;

    return deps.sync({
      p_user_id: userId,
      p_entitlement_id: entitlement,
      p_product_id: event.product_id ?? null,
      p_status: st,
      p_period_start: iso(event.purchased_at_ms),
      p_period_end: st === "expired" ? new Date().toISOString() : iso(event.expiration_at_ms),
      p_auto_renew: st === "active" && event.type !== "CANCELLATION",
      p_store: String(event.store ?? "PLAY_STORE").toLowerCase(),
      p_external_customer_id: event.original_app_user_id ?? null,
      p_event_id: `${event.id ?? deps.newId()}:${userId}`,
      p_event_type: event.type,
      // Solo lo necesario: sin atributos de suscriptor (datos personales).
      p_payload: {
        event: {
          type: event.type,
          event_timestamp_ms: event.event_timestamp_ms,
          product_id: event.product_id,
          environment: event.environment,
        },
      },
    });
  };

  let failure: { code?: string; message: string } | null = null;
  if (event.type === "TRANSFER") {
    for (const from of event.transferred_from ?? []) await apply(String(from), "expired");
    for (const to of event.transferred_to ?? []) failure = (await apply(String(to), "active")) ?? failure;
  } else {
    failure = await apply(String(event.app_user_id ?? ""), status);
  }

  if (failure) {
    console.error("sync failed", failure.message);
    // Usuario inexistente (FK): reintentar no ayuda.
    if (failure.code === "23503") return Response.json({ ignored: true });
    return new Response("Error", { status: 500 });
  }
  return Response.json({ ok: true });
}
