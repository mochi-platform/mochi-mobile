import { assertEquals } from "jsr:@std/assert@1";
import { handlePush, isQuietNow, type PushDeps, type PushTarget } from "./core.ts";

const V = "eeeeeeee-0000-0000-0000-000000000001";
const target = (over: Partial<PushTarget> = {}): PushTarget => ({
  token: "ExponentPushToken[abc-123456]", title: "Cena", quiet_enabled: true, quiet_start: 22, quiet_end: 7, tz_offset_min: 0, ...over,
});

function make(targets: PushTarget[], user: { id: string } | null = { id: "u" }, hourUtc = 15) {
  const sent: unknown[][] = [];
  const deps: PushDeps = {
    getUser: async () => user,
    targets: async () => targets,
    send: async (m) => { sent.push(m); },
    now: () => new Date(Date.UTC(2026, 9, 28, hourUtc, 0)),
  };
  const call = (body: unknown, auth = "Bearer t") =>
    handlePush(new Request("http://x", { method: "POST", headers: { Authorization: auth }, body: JSON.stringify(body) }), deps, {});
  return { sent, call };
}

Deno.test("isQuietNow cruza medianoche y respeta zona horaria", () => {
  const t = target();
  assertEquals(isQuietNow(t, new Date(Date.UTC(2026, 9, 28, 23))), true);
  assertEquals(isQuietNow(t, new Date(Date.UTC(2026, 9, 28, 6))), true);
  assertEquals(isQuietNow(t, new Date(Date.UTC(2026, 9, 28, 12))), false);
  // 03:00 UTC con UTC-5 son las 22:00 locales
  assertEquals(isQuietNow(target({ tz_offset_min: -300 }), new Date(Date.UTC(2026, 9, 28, 3))), true);
  assertEquals(isQuietNow(target({ quiet_enabled: false }), new Date(Date.UTC(2026, 9, 28, 23))), false);
});

Deno.test("sin sesión devuelve 401", async () => {
  const { call } = make([target()], null);
  assertEquals((await call({ voucherId: V })).status, 401);
});

Deno.test("vale inválido devuelve 400", async () => {
  const { call } = make([target()]);
  assertEquals((await call({ voucherId: "x" })).status, 400);
});

Deno.test("envía fuera de horas de silencio", async () => {
  const { call, sent } = make([target()]);
  const res = await call({ voucherId: V });
  assertEquals(await res.json(), { sent: 1, silenced: 0 });
  assertEquals(sent.length, 1);
});

Deno.test("no envía en horas de silencio", async () => {
  const { call, sent } = make([target()], { id: "u" }, 23);
  assertEquals(await (await call({ voucherId: V })).json(), { sent: 0, silenced: 1 });
  assertEquals(sent.length, 0);
});

Deno.test("sin destinatarios no envía", async () => {
  const { call, sent } = make([]);
  assertEquals(await (await call({ voucherId: V })).json(), { sent: 0, silenced: 0 });
  assertEquals(sent.length, 0);
});
