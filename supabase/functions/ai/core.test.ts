import { assert, assertEquals } from "jsr:@std/assert@1";
import { handleTask, type Deps } from "./core.ts";
import type { Message } from "./prompts/types.ts";

const cors = { "Access-Control-Allow-Origin": "*" };

function makeDeps(overrides: Partial<Deps> = {}) {
  const calls: { rpc: string[]; upstream: Message[][]; cacheSet: string[] } = { rpc: [], upstream: [], cacheSet: [] };
  const deps: Deps = {
    getUser: async (t) => (t === "good" ? { id: "u1" } : null),
    rpc: async (fn) => {
      calls.rpc.push(fn);
      if (fn === "server_ai_gateway_check") return { data: true, error: null };
      if (fn === "server_apply_plan_limits") return { data: { allowed: true }, error: null };
      if (fn === "server_get_mochi_memory") return { data: "Metas activas: Aprobar cálculo", error: null };
      return { data: null, error: null };
    },
    cacheGet: async () => null,
    cacheSet: async (k) => {
      calls.cacheSet.push(k);
    },
    upstream: async (_m, messages) => {
      calls.upstream.push(messages);
      return { ok: true, status: 200, text: "Respuesta de prueba" };
    },
    apiKeyConfigured: true,
    newId: () => "ref-1",
    ...overrides,
  };
  return { deps, calls };
}

const req = (body: unknown, token = "good", path = "/ai/task") =>
  new Request(`https://x.test/functions/v1${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });

Deno.test("sin token válido: 401 y no toca el proveedor", async () => {
  const { deps, calls } = makeDeps();
  const res = await handleTask(req({ task: "cooking_help", input: {} }, "bad"), deps, cors);
  assertEquals(res.status, 401);
  assertEquals(calls.upstream.length, 0);
});

Deno.test("tarea desconocida: 400", async () => {
  const { deps } = makeDeps();
  const res = await handleTask(req({ task: "hackear", input: {} }), deps, cors);
  assertEquals(res.status, 400);
});

Deno.test("entrada inválida: 400 sin cobrar", async () => {
  const { deps, calls } = makeDeps();
  const res = await handleTask(req({ task: "cooking_help", input: { recipeTitle: "" } }), deps, cors);
  assertEquals(res.status, 400);
  assert(!calls.rpc.includes("server_apply_plan_limits"));
});

Deno.test("adjunto PDF rechazado por esquema", async () => {
  const { deps } = makeDeps();
  const res = await handleTask(
    req({
      task: "study_plan",
      input: { subject: "Mate", topic: "Límites", durationMinutes: 30, discipline: "matemáticas", attachment: { base64: "AAAA", mimeType: "application/pdf" } },
    }),
    deps,
    cors,
  );
  assertEquals(res.status, 400);
});

Deno.test("sin créditos: 402 y no llama al proveedor", async () => {
  const { deps, calls } = makeDeps({
    rpc: async (fn) =>
      fn === "server_apply_plan_limits"
        ? { data: { allowed: false, reason: "no_credits" }, error: null }
        : { data: true, error: null },
  });
  const res = await handleTask(req({ task: "cooking_help", input: { recipeTitle: "Arroz", currentStepTitle: "Hervir", question: "¿Cuánto?" } }), deps, cors);
  assertEquals(res.status, 402);
  assertEquals(calls.upstream.length, 0);
});

Deno.test("éxito de texto: inyecta voz y memoria, redacta ciclo y cobra una vez", async () => {
  const { deps, calls } = makeDeps();
  const res = await handleTask(
    req({ task: "cooking_help", input: { recipeTitle: "Arroz", currentStepTitle: "Hervir", question: "Estoy en fase lútea y menstrual, ¿qué hago?" } }),
    deps,
    cors,
  );
  assertEquals(res.status, 200);
  assertEquals((await res.json()).result, "Respuesta de prueba");
  const sent = JSON.stringify(calls.upstream[0]);
  assert(sent.includes("Eres Mochi"));
  assert(sent.includes("Aprobar cálculo"));
  assert(!/menstrual|lútea/i.test(sent), "no debe viajar nada del ciclo");
  assertEquals(calls.rpc.filter((f) => f === "server_apply_plan_limits").length, 1);
});

Deno.test("JSON inválido se repara una vez sin reembolso", async () => {
  let n = 0;
  const good = JSON.stringify([{ front: "A", back: "B" }, { front: "C", back: "D" }, { front: "E", back: "F" }]);
  const { deps, calls } = makeDeps({
    upstream: async () => ({ ok: true, status: 200, text: n++ === 0 ? "esto no es json" : "```json\n" + good + "\n```" }),
  });
  const res = await handleTask(req({ task: "flashcards", input: { subject: "Mate", topic: "Límites", count: 2 } }), deps, cors);
  assertEquals(res.status, 200);
  assertEquals((await res.json()).result.length, 2);
  assert(!calls.rpc.includes("server_refund_ai_credit"));
});

Deno.test("fallo del proveedor: reembolsa y devuelve 502", async () => {
  const { deps, calls } = makeDeps({ upstream: async () => ({ ok: false, status: 500, text: "" }) });
  const res = await handleTask(req({ task: "cooking_help", input: { recipeTitle: "A", currentStepTitle: "B", question: "C" } }), deps, cors);
  assertEquals(res.status, 502);
  assert(calls.rpc.includes("server_refund_ai_credit"));
});

Deno.test("salida inválida tras reparar: reembolsa", async () => {
  const { deps, calls } = makeDeps({ upstream: async () => ({ ok: true, status: 200, text: "nada útil" }) });
  const res = await handleTask(req({ task: "flashcards", input: { subject: "Mate", topic: "Límites" } }), deps, cors);
  assertEquals(res.status, 502);
  assert(calls.rpc.includes("server_refund_ai_credit"));
});

Deno.test("caché: un acierto no cobra ni llama al proveedor", async () => {
  const { deps, calls } = makeDeps({ cacheGet: async () => 120 });
  const res = await handleTask(req({ task: "study_duration", input: { subject: "Cálculo" } }), deps, cors);
  const body = await res.json();
  assertEquals(body.cached, true);
  assertEquals(calls.upstream.length, 0);
  assert(!calls.rpc.includes("server_apply_plan_limits"));
});

Deno.test("la ruta genérica de chat ya no existe", async () => {
  const { deps } = makeDeps();
  const res = await handleTask(req({ model: "x", messages: [] }, "good", "/ai/chat/completions"), deps, cors);
  assertEquals(res.status, 404);
});

Deno.test("tarea Premium: un plan gratuito recibe 403 sin cobrar ni llamar al proveedor", async () => {
  const { deps, calls } = makeDeps({
    rpc: async (fn) => {
      calls.rpc.push(fn);
      return fn === "user_is_premium" ? { data: false, error: null } : { data: true, error: null };
    },
  });
  const res = await handleTask(
    req({ task: "flashcards_from_image", input: { subject: "Mate", attachment: { base64: "AAAA", mimeType: "image/png" } } }),
    deps,
    cors,
  );
  assertEquals(res.status, 403);
  assertEquals((await res.json()).error.code, "premium_required");
  assertEquals(calls.upstream.length, 0);
  assert(!calls.rpc.includes("server_apply_plan_limits"));
});

Deno.test("tarea Premium: con Premium usa visión y limita las tarjetas", async () => {
  const cards = JSON.stringify(Array.from({ length: 5 }, (_, i) => ({ front: `P${i}`, back: `R${i}` })));
  const { deps, calls } = makeDeps({
    rpc: async (fn) => {
      calls.rpc.push(fn);
      if (fn === "user_is_premium") return { data: true, error: null };
      if (fn === "server_apply_plan_limits") return { data: { allowed: true }, error: null };
      return { data: true, error: null };
    },
    upstream: async (model, messages) => {
      calls.upstream.push(messages);
      assert(model.includes("gemma"), "debe usar el modelo de visión");
      return { ok: true, status: 200, text: cards };
    },
  });
  const res = await handleTask(
    req({ task: "flashcards_from_image", input: { subject: "Mate", count: 3, attachment: { base64: "AAAA", mimeType: "image/png" } } }),
    deps,
    cors,
  );
  assertEquals(res.status, 200);
  assertEquals((await res.json()).result.length, 3);
});
