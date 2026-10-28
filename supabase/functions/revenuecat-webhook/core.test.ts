import { assert, assertEquals } from "jsr:@std/assert@1";
import { handleWebhook, type WebhookDeps } from "./core.ts";

const UID = "11111111-1111-1111-1111-111111111111";
const OTHER = "22222222-2222-2222-2222-222222222222";

function make(over: Partial<WebhookDeps> = {}) {
  const synced: Record<string, unknown>[] = [];
  const deps: WebhookDeps = {
    expectedAuth: "Bearer secreto",
    lastEventTs: async () => 0,
    sync: async (a) => {
      synced.push(a);
      return null;
    },
    newId: () => "gen",
    ...over,
  };
  return { deps, synced };
}

const post = (event: unknown, auth = "Bearer secreto") =>
  new Request("https://x.test/hook", { method: "POST", headers: { Authorization: auth }, body: JSON.stringify({ event }) });

Deno.test("sin header correcto: 401", async () => {
  const { deps, synced } = make();
  assertEquals((await handleWebhook(post({ type: "INITIAL_PURCHASE", app_user_id: UID }, "Bearer malo"), deps)).status, 401);
  assertEquals(synced.length, 0);
});

Deno.test("sin secreto configurado: 401", async () => {
  const { deps } = make({ expectedAuth: undefined });
  assertEquals((await handleWebhook(post({ type: "INITIAL_PURCHASE", app_user_id: UID }), deps)).status, 401);
});

Deno.test("compra: activa premium con vigencia", async () => {
  const { deps, synced } = make();
  const res = await handleWebhook(
    post({ type: "INITIAL_PURCHASE", id: "e1", app_user_id: UID, product_id: "mochi_premium_monthly", purchased_at_ms: 1000, expiration_at_ms: 2000, event_timestamp_ms: 5 }),
    deps,
  );
  assertEquals(res.status, 200);
  assertEquals(synced[0].p_status, "active");
  assertEquals(synced[0].p_user_id, UID);
  assert(!JSON.stringify(synced[0].p_payload).includes("subscriber_attributes"));
});

Deno.test("expiración: marca expired", async () => {
  const { deps, synced } = make();
  await handleWebhook(post({ type: "EXPIRATION", app_user_id: UID, event_timestamp_ms: 9 }), deps);
  assertEquals(synced[0].p_status, "expired");
});

Deno.test("evento fuera de orden se ignora", async () => {
  const { deps, synced } = make({ lastEventTs: async () => 100 });
  await handleWebhook(post({ type: "RENEWAL", app_user_id: UID, event_timestamp_ms: 50 }), deps);
  assertEquals(synced.length, 0);
});

Deno.test("TRANSFER expira al origen y activa al destino", async () => {
  const { deps, synced } = make();
  await handleWebhook(post({ type: "TRANSFER", transferred_from: [UID], transferred_to: [OTHER], event_timestamp_ms: 7 }), deps);
  assertEquals(synced.map((s) => [s.p_user_id, s.p_status]), [[UID, "expired"], [OTHER, "active"]]);
});

Deno.test("app_user_id anónimo no escribe nada", async () => {
  const { deps, synced } = make();
  const res = await handleWebhook(post({ type: "INITIAL_PURCHASE", app_user_id: "$RCAnonymousID:abc" }), deps);
  assertEquals(res.status, 200);
  assertEquals(synced.length, 0);
});

Deno.test("entitlement distinto de premium se ignora", async () => {
  const { deps, synced } = make();
  await handleWebhook(post({ type: "INITIAL_PURCHASE", app_user_id: UID, entitlement_ids: ["otro"] }), deps);
  assertEquals(synced.length, 0);
});

Deno.test("usuario inexistente (FK) responde 200 para no reintentar", async () => {
  const { deps } = make({ sync: async () => ({ code: "23503", message: "fk" }) });
  assertEquals((await handleWebhook(post({ type: "RENEWAL", app_user_id: UID }), deps)).status, 200);
});

Deno.test("error transitorio responde 500 para que RevenueCat reintente", async () => {
  const { deps } = make({ sync: async () => ({ code: "XX000", message: "db" }) });
  assertEquals((await handleWebhook(post({ type: "RENEWAL", app_user_id: UID }), deps)).status, 500);
});
