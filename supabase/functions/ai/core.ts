import { TASKS } from "./tasks.ts";
import { isLikelyTruncated, parseModelJson } from "./json.ts";
import type { Message } from "./prompts/types.ts";

export const TEXT_CHAIN = [
  "nvidia/nemotron-3-super-120b-a12b:free",
  "meta-llama/llama-3.3-70b-instruct:free",
];
export const VISION_CHAIN = ["google/gemma-3-27b-it:free"];

/** Ningún dato de ciclo menstrual sale hacia el proveedor (defensa en profundidad). */
const SENSITIVE = /menstrua\w*|ovulaci\w*|ovulatori\w*|f[oó]licular\w*|l[uú]tea\w*|\bperiodo menstrual\b/gi;

export const VOICE =
  "Eres Mochi, compañera de estudio y bienestar. Español de Ecuador, tuteo, tono cálido, breve y concreto, sin emojis. " +
  "No des consejos médicos ni diagnósticos. Si la tarea exige un formato (por ejemplo JSON), responde SOLO en ese formato.";

export type Deps = {
  getUser: (token: string) => Promise<{ id: string } | null>;
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string; code?: string } | null }>;
  cacheGet: (key: string) => Promise<unknown | null>;
  cacheSet: (key: string, value: unknown, ttlSeconds: number) => Promise<void>;
  /** Llama al proveedor. Devuelve null si falla la red. */
  upstream: (model: string, messages: Message[], maxTokens: number, temperature?: number) => Promise<{ ok: boolean; status: number; text: string }>;
  apiKeyConfigured: boolean;
  newId: () => string;
};

const JSON_HEADERS = { "Content-Type": "application/json" };

function respond(cors: Record<string, string>, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, ...JSON_HEADERS } });
}

function redact(messages: Message[]): Message[] {
  return messages.map((m) => ({
    ...m,
    content:
      typeof m.content === "string"
        ? m.content.replace(SENSITIVE, "[omitido]")
        : m.content.map((p) => (p.type === "text" ? { ...p, text: p.text.replace(SENSITIVE, "[omitido]") } : p)),
  }));
}

async function callChain(deps: Deps, chain: string[], messages: Message[], maxTokens: number, temperature?: number) {
  let last = { ok: false, status: 502, text: "" };
  for (const model of chain) {
    const res = await deps.upstream(model, messages, maxTokens, temperature).catch(() => null);
    if (res?.ok) return res;
    last = res ?? last;
    if (last.status === 400 || last.status === 401) break; // otro modelo no ayudará
  }
  return last;
}

export async function handleTask(req: Request, deps: Deps, cors: Record<string, string>): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST" || !new URL(req.url).pathname.endsWith("/task")) {
    return respond(cors, { error: { message: "Not found" } }, 404);
  }

  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return respond(cors, { error: { message: "No autenticado" } }, 401);
  const user = await deps.getUser(token);
  if (!user) return respond(cors, { error: { message: "No autenticado" } }, 401);

  const raw = await req.text();
  if (raw.length > 6_000_000) return respond(cors, { error: { message: "Solicitud demasiado grande" } }, 413);
  let body: { task?: string; input?: unknown };
  try {
    body = JSON.parse(raw);
  } catch {
    return respond(cors, { error: { message: "JSON inválido" } }, 400);
  }

  const def = body.task ? TASKS[body.task] : undefined;
  if (!def) return respond(cors, { error: { message: "Tarea desconocida", code: "unknown_task" } }, 400);

  const parsedInput = def.input.safeParse(body.input);
  if (!parsedInput.success) {
    return respond(cors, { error: { message: "Entrada no válida", code: "invalid_input" } }, 400);
  }
  const input = parsedInput.data;

  if (def.premiumOnly) {
    const premium = await deps.rpc("user_is_premium", { p_uid: user.id });
    if (premium.error) return respond(cors, { error: { message: "Error interno" } }, 500);
    if (!premium.data) {
      return respond(cors, { error: { message: "Esta función es parte de Premium", code: "premium_required" } }, 403);
    }
  }

  // Caché determinista: no cobra crédito ni consume cuota del proveedor.
  const cacheKey = def.cache ? def.cache.key(input, user.id) : null;
  if (cacheKey) {
    const hit = await deps.cacheGet(cacheKey);
    if (hit !== null) return respond(cors, { result: hit, cached: true });
  }

  const gate = await deps.rpc("server_ai_gateway_check", { p_user_id: user.id, p_model: body.task });
  if (gate.error) return respond(cors, { error: { message: "Error interno" } }, 500);
  if (!gate.data) return respond(cors, { error: { message: "Límite de uso alcanzado", code: "rate_limit" } }, 429);

  if (!deps.apiKeyConfigured) return respond(cors, { error: { message: "IA no configurada" } }, 503);

  const sourceRef = deps.newId();
  const usage = await deps.rpc("server_apply_plan_limits", { p_user_id: user.id, p_source_ref: sourceRef });
  if (usage.error) return respond(cors, { error: { message: "Error interno" } }, 500);
  const usageData = usage.data as { allowed?: boolean; reason?: string } | null;
  if (!usageData?.allowed) {
    return respond(cors, { error: { message: "Sin créditos de IA disponibles", code: usageData?.reason ?? "no_credits" } }, 402);
  }

  const refund = () => deps.rpc("server_refund_ai_credit", { p_user_id: user.id, p_source_ref: sourceRef });

  try {
    const built = def.build(input);
    const memory = await deps.rpc("server_get_mochi_memory", { p_user_id: user.id });
    const memoryText = typeof memory.data === "string" && memory.data ? ` Contexto de la usuaria (úsalo solo si ayuda): ${memory.data}.` : "";
    const messages = redact([{ role: "system", content: `${VOICE}${memoryText}\n${built.system}` }, ...built.messages]);
    const chain = built.vision ? VISION_CHAIN : TEXT_CHAIN;
    const temperature = def.temperature;

    let res = await callChain(deps, chain, messages, def.maxTokens, temperature);
    if (!res.ok) {
      await refund();
      return respond(cors, { error: { message: "Servicio de IA no disponible", code: "upstream_failed" } }, res.status === 429 ? 429 : 502);
    }

    let result: unknown;
    if (def.output === "text") {
      result = def.post ? def.post(res.text) : res.text.trim();
    } else {
      const isArray = def.schema?._def?.typeName === "ZodArray";
      const kind = isArray ? "array" : "object";
      const attempt = (text: string) => def.schema!.parse(parseModelJson(text, kind));
      try {
        result = attempt(res.text);
      } catch {
        // Un solo intento de reparación (sin cobro extra).
        const fix = isLikelyTruncated(res.text)
          ? "Completa este JSON truncado y devuelve SOLO un JSON válido, sin markdown ni texto adicional:"
          : "Corrige y devuelve SOLO un JSON válido con la estructura solicitada, sin texto adicional:";
        res = await callChain(deps, chain, [...messages, { role: "user", content: `${fix}\n\n${res.text}` }], def.maxTokens, temperature);
        if (!res.ok) throw new Error("repair_failed");
        result = attempt(res.text);
      }
      if (body.task === "flashcards" || body.task === "flashcards_from_image") result = (result as unknown[]).slice(0, (input as { count: number }).count);
    }

    if (cacheKey && def.cache) await deps.cacheSet(cacheKey, result, def.cache.ttlSeconds);
    return respond(cors, { result });
  } catch (_error) {
    await refund();
    return respond(cors, { error: { message: "La IA devolvió una respuesta inválida", code: "invalid_output" } }, 502);
  }
}
